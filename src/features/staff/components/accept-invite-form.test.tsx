import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { httpError } from "@/test/fake-api";
import { TestProviders, testQueryClient } from "@/test/render-panel";
import { acceptInvite } from "../api";
import type { AcceptInviteResult } from "../types";
import { AcceptInviteForm } from "./accept-invite-form";

vi.mock("../api", () => ({ acceptInvite: vi.fn() }));

function renderForm(token: string | null = "tok-123") {
  const client = testQueryClient();
  render(
    <TestProviders client={client}>
      <AcceptInviteForm token={token} />
    </TestProviders>,
  );
  return client;
}

function fill(name: string, password: string, confirm = password) {
  fireEvent.change(screen.getByLabelText("Your full name"), {
    target: { value: name },
  });
  fireEvent.change(screen.getByLabelText("New password"), {
    target: { value: password },
  });
  fireEvent.change(screen.getByLabelText("Confirm new password"), {
    target: { value: confirm },
  });
}

const join = () =>
  fireEvent.click(screen.getByRole("button", { name: /Join shop/ }));

describe("AcceptInviteForm", () => {
  beforeEach(() => {
    vi.mocked(acceptInvite).mockReset();
    window.history.replaceState(null, "", "/accept-invite?token=tok-123");
  });

  afterEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("removes the token from the address bar and never stores it", async () => {
    const client = renderForm();

    await waitFor(() => expect(window.location.search).toBe(""));
    expect(window.location.pathname).toBe("/accept-invite");
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
    expect(JSON.stringify(client.getQueryCache().getAll())).not.toContain(
      "tok-123",
    );
  });

  it("validates name, password length and the confirmation", async () => {
    renderForm();

    join();
    expect(await screen.findByText("Enter your name")).toBeVisible();
    expect(screen.getByText("Use at least 8 characters")).toBeVisible();

    fill("Bilal", "secret-123", "secret-124");
    join();
    expect(await screen.findByText("Passwords don’t match")).toBeVisible();
    expect(acceptInvite).not.toHaveBeenCalled();
  });

  it("joins and sends the person to sign in with the phone filled in", async () => {
    vi.mocked(acceptInvite).mockResolvedValue({
      phone: "03011234567",
      shopName: "Demo Mandi",
    });
    renderForm();
    fill("  Muhammad Bilal ", "secret-123");

    join();

    expect(
      await screen.findByRole("heading", { name: "You’re in, Demo Mandi" }),
    ).toBeVisible();
    expect(acceptInvite).toHaveBeenCalledWith({
      token: "tok-123",
      name: "Muhammad Bilal",
      password: "secret-123",
    });
    expect(
      screen.getByRole("link", { name: /Continue to sign in/ }),
    ).toHaveAttribute("href", "/login?phone=03011234567");
  });

  it.each([
    ["INVITE_INVALID", "This invite link isn’t valid."],
    ["INVITE_USED", "This invite has already been used."],
    ["INVITE_CANCELLED", "This invite was cancelled by the shop owner."],
    ["INVITE_EXPIRED", "This invite has expired."],
  ])("explains %s and asks to contact the owner", async (code, message) => {
    vi.mocked(acceptInvite).mockRejectedValue(
      httpError(undefined, 400, {
        message,
        code,
        errors: [{ field: "token", message }],
      }),
    );
    renderForm();
    fill("Bilal", "secret-123");

    join();

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(
      screen.getByRole("heading", { name: "This invite can’t be used" }),
    ).toBeVisible();
    expect(screen.getByText(/Ask your shop owner/)).toBeVisible();
    expect(screen.queryByRole("button", { name: /Join shop/ })).toBeNull();
  });

  it("uses its own message when the server sends none", async () => {
    vi.mocked(acceptInvite).mockRejectedValue(
      httpError(undefined, 400, { message: undefined, code: "INVITE_EXPIRED" }),
    );
    renderForm();
    fill("Bilal", "secret-123");

    join();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This invite has expired.",
    );
  });

  it("sends a phone that already has an account to sign in", async () => {
    vi.mocked(acceptInvite).mockRejectedValue(
      httpError(undefined, 409, { code: "PHONE_TAKEN" }),
    );
    renderForm();
    fill("Bilal", "secret-123");

    join();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This phone already has an account — sign in instead.",
    );
    expect(screen.getByRole("link", { name: "Go to sign in" })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("puts server field errors on the fields", async () => {
    vi.mocked(acceptInvite).mockRejectedValue(
      httpError(undefined, 400, {
        errors: [{ field: "password", message: "Password is too common" }],
      }),
    );
    renderForm();
    fill("Bilal", "password1");

    join();

    expect(await screen.findByText("Password is too common")).toBeVisible();
    expect(screen.getByLabelText("New password")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("shows a missing-token message when the link is incomplete", () => {
    renderForm(null);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "This invite link is incomplete",
    );
    expect(screen.queryByLabelText("Your full name")).toBeNull();
  });

  it("sends only one request on a double submit", async () => {
    let resolve: (value: AcceptInviteResult) => void = () => undefined;
    vi.mocked(acceptInvite).mockReturnValue(new Promise((r) => (resolve = r)));
    renderForm();
    fill("Bilal", "secret-123");

    const button = screen.getByRole("button", { name: /Join shop/ });
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.submit(button.closest("form")!);

    await waitFor(() => expect(button).toBeDisabled());
    await act(async () =>
      resolve({ phone: "03011234567", shopName: "Demo Mandi" }),
    );
    expect(acceptInvite).toHaveBeenCalledTimes(1);
  });
});
