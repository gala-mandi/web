import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { httpError } from "@/test/fake-api";
import { TestProviders, testQueryClient } from "@/test/render-panel";
import { createInvitation } from "../api";
import { invitation, inviteUrl } from "../test-data";
import type { InviteResult } from "../types";
import { InviteDialog } from "./invite-dialog";

vi.mock("../api", () => ({ createInvitation: vi.fn() }));

const linkResult: InviteResult = {
  method: "link",
  invitation: invitation(),
  inviteUrl,
};

const passwordResult: InviteResult = {
  method: "password",
  user: { id: "u9", name: "Bilal", phone: "03011234567", role: "operator" },
  temporaryPassword: "Temp-9x7Q-2kLm",
};

function setup() {
  const client = testQueryClient();
  render(
    <TestProviders client={client}>
      <InviteDialog />
    </TestProviders>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Invite staff" }));
  return { client, dialog: () => screen.getByRole("dialog") };
}

function typePhone(value: string) {
  fireEvent.change(screen.getByLabelText("Phone number"), {
    target: { value },
  });
}

const submitButton = () =>
  screen.getByRole("button", { name: /^(Send invite|Create account)$/ });

describe("InviteDialog", () => {
  beforeEach(() => {
    vi.mocked(createInvitation).mockReset();
  });

  it("validates the phone and sends nothing", async () => {
    setup();

    fireEvent.click(submitButton());
    expect(await screen.findByText("Enter a phone number")).toBeVisible();

    typePhone("12345");
    fireEvent.click(submitButton());
    expect(
      await screen.findByText("Enter a mobile number like 0300 1234567"),
    ).toBeVisible();
    expect(screen.getByLabelText("Phone number")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(createInvitation).not.toHaveBeenCalled();
  });

  it("asks for a name only for a temporary password", async () => {
    setup();
    expect(screen.queryByLabelText("Full name")).toBeNull();

    fireEvent.click(screen.getByLabelText(/Set a temporary password/));
    typePhone("0301 1234567");
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("Enter their name")).toBeVisible();
    expect(createInvitation).not.toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText(/Send invite link/));
    expect(screen.queryByLabelText("Full name")).toBeNull();
  });

  it("sends a link invite with the normalised phone and shows the link once", async () => {
    vi.mocked(createInvitation).mockResolvedValue(linkResult);
    const { client } = setup();
    typePhone("+92 301 1234567");

    fireEvent.click(submitButton());

    const result = await screen.findByRole("alertdialog", {
      name: "Invite link ready",
    });
    expect(createInvitation).toHaveBeenCalledWith({
      phone: "03011234567",
      role: "operator",
      method: "link",
    });
    expect(within(result).getByLabelText("Invite link")).toHaveValue(inviteUrl);
    const share = within(result).getByRole("link", {
      name: "Share on WhatsApp",
    });
    expect(share.getAttribute("href")).toMatch(/^https:\/\/wa\.me\/\?text=/);
    expect(decodeURIComponent(share.getAttribute("href")!)).toContain(
      inviteUrl,
    );
    // The form dialog closed behind it.
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(within(result).getByRole("button", { name: "Done" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(screen.queryByDisplayValue(inviteUrl)).toBeNull();
    // Never kept: not in the query cache, the mutation cache or storage.
    expect(JSON.stringify(client.getQueryCache().getAll())).not.toContain(
      "tok-123",
    );
    await waitFor(() =>
      expect(client.getMutationCache().getAll()).toHaveLength(0),
    );
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
    expect(window.location.href).not.toContain("tok-123");

    // Opening the dialog again starts empty.
    fireEvent.click(screen.getByRole("button", { name: "Invite staff" }));
    expect(screen.getByLabelText("Phone number")).toHaveValue("");
  });

  it("creates an account with a temporary password and shows it once", async () => {
    vi.mocked(createInvitation).mockResolvedValue(passwordResult);
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    setup();
    typePhone("03011234567");
    fireEvent.click(screen.getByLabelText(/Set a temporary password/));
    fireEvent.change(screen.getByLabelText("Full name"), {
      target: { value: "  Bilal " },
    });
    fireEvent.keyDown(screen.getByRole("combobox", { name: "Role" }), {
      key: "Enter",
    });
    fireEvent.click(await screen.findByRole("option", { name: "Manager" }));

    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    const result = await screen.findByRole("alertdialog", {
      name: "Account created",
    });
    expect(createInvitation).toHaveBeenCalledWith({
      phone: "03011234567",
      role: "manager",
      method: "password",
      name: "Bilal",
    });
    expect(within(result).getByLabelText("Temporary password")).toHaveValue(
      "Temp-9x7Q-2kLm",
    );
    expect(within(result).queryByRole("link")).toBeNull();

    fireEvent.click(within(result).getByRole("button", { name: "Copy" }));
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith("Temp-9x7Q-2kLm"),
    );

    fireEvent.keyDown(result, { key: "Escape" });
    await waitFor(() =>
      expect(screen.queryByDisplayValue("Temp-9x7Q-2kLm")).toBeNull(),
    );
  });

  it("shows PHONE_TAKEN under the phone field", async () => {
    vi.mocked(createInvitation).mockRejectedValue(
      httpError(undefined, 409, {
        message: "Phone already registered",
        code: "PHONE_TAKEN",
        errors: [{ field: "phone", message: "" }],
      }),
    );
    setup();
    typePhone("03000000002");

    fireEvent.click(submitButton());

    expect(
      await screen.findByText("This phone already has an account"),
    ).toBeVisible();
    expect(screen.getByLabelText("Phone number")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByRole("dialog")).toBeVisible();
  });

  it("shows other server field errors under their field", async () => {
    vi.mocked(createInvitation).mockRejectedValue(
      httpError(undefined, 400, {
        errors: [{ field: "name", message: "Name is too short" }],
      }),
    );
    setup();
    typePhone("03011234567");
    fireEvent.click(screen.getByLabelText(/Set a temporary password/));
    fireEvent.change(screen.getByLabelText("Full name"), {
      target: { value: "B" },
    });

    fireEvent.click(submitButton());

    expect(await screen.findByText("Name is too short")).toBeVisible();
  });

  it("shows a general error when the server is unreachable", async () => {
    vi.mocked(createInvitation).mockRejectedValue(new Error("Network Error"));
    setup();
    typePhone("03011234567");

    fireEvent.click(submitButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Can’t reach the server",
    );
  });

  it("sends only one request on a double submit", async () => {
    let resolve: (value: InviteResult) => void = () => undefined;
    vi.mocked(createInvitation).mockReturnValue(
      new Promise((r) => (resolve = r)),
    );
    setup();
    typePhone("03011234567");

    const button = submitButton();
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.submit(button.closest("form")!);

    await waitFor(() => expect(button).toBeDisabled());
    await act(async () => resolve(linkResult));
    expect(createInvitation).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByRole("alertdialog", { name: "Invite link ready" }),
    ).toBeVisible();
  });
});
