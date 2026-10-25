import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSessionStore } from "@/stores/session";
import { httpError, owner, sessionFor } from "@/test/fake-api";
import { login } from "../api";
import { LoginForm } from "./login-form";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
}));
vi.mock("../api", () => ({ login: vi.fn() }));

function fill(identifier: string, password: string) {
  fireEvent.change(screen.getByLabelText("Phone number or email"), {
    target: { value: identifier },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: password },
  });
}

const submit = () =>
  fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

describe("LoginForm", () => {
  beforeEach(() => {
    replace.mockReset();
    vi.mocked(login).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    useSessionStore.getState().clear();
  });

  it("shows field errors for empty fields and sends nothing", async () => {
    render(<LoginForm />);

    submit();

    expect(
      await screen.findByText("Enter your phone number or email"),
    ).toBeInTheDocument();
    expect(screen.getByText("Enter your password")).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it("rejects values that are too long", async () => {
    render(<LoginForm />);
    fill("a".repeat(161), "p".repeat(129));

    submit();

    expect(
      await screen.findByText("Use 160 characters or fewer"),
    ).toBeInTheDocument();
    expect(screen.getByText("Use 128 characters or fewer")).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it("signs in, keeps the token in memory and goes to the dashboard", async () => {
    vi.mocked(login).mockResolvedValue(sessionFor(owner, "abc"));
    render(<LoginForm />);
    fill("0300 0000002", "secret");

    submit();

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
    expect(login).toHaveBeenCalledWith({
      identifier: "03000000002",
      password: "secret",
      rememberMe: true,
    });
    expect(useSessionStore.getState().accessToken).toBe("abc");
    expect(localStorage.length).toBe(0);
  });

  it("sends a user who must change the password to /change-password", async () => {
    vi.mocked(login).mockResolvedValue(
      sessionFor({ ...owner, mustChangePassword: true }),
    );
    render(<LoginForm next="/dashboard" />);
    fill("owner@shop.pk", "temp1234");

    submit();

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/change-password"),
    );
  });

  it("returns to a safe ?next= path only", async () => {
    vi.mocked(login).mockResolvedValue(sessionFor(owner));
    const { unmount } = render(<LoginForm next="//evil.example" />);
    fill("owner@shop.pk", "secret");
    submit();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
    unmount();

    replace.mockReset();
    render(<LoginForm next="/dashboard?x=1" />);
    fill("owner@shop.pk", "secret");
    submit();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard?x=1"));
  });

  it("sends only one request on a double click", async () => {
    let resolve: (value: ReturnType<typeof sessionFor>) => void = () =>
      undefined;
    vi.mocked(login).mockReturnValue(new Promise((r) => (resolve = r)));
    render(<LoginForm />);
    fill("owner@shop.pk", "secret");

    const button = screen.getByRole("button", { name: /sign in/i });
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.submit(button.closest("form")!);

    await waitFor(() => expect(button).toBeDisabled());
    await act(async () => resolve(sessionFor(owner)));
    expect(login).toHaveBeenCalledTimes(1);
  });

  it("shows the generic message on 401, with attempts left when the header is there", async () => {
    vi.mocked(login).mockRejectedValue(
      httpError(
        undefined,
        401,
        { message: "Invalid credentials" },
        {
          "x-ratelimit-remaining": "2",
        },
      ),
    );
    render(<LoginForm />);
    fill("0300 1234567", "wrongpass");

    submit();

    const message = await screen.findByText(
      "Phone number or password is incorrect",
    );
    const alert = message.closest('[role="alert"]');
    expect(alert).not.toBeNull();
    expect(alert).toHaveTextContent(
      "2 attempts left before sign-in is paused for 1 minute.",
    );
    expect(
      screen.getByText("Check Caps Lock and try again."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByRole("button", { name: /try again/i })).toBeEnabled();
  });

  it("skips the attempts line when the header is missing", async () => {
    vi.mocked(login).mockRejectedValue(httpError(undefined, 401));
    render(<LoginForm />);
    fill("0300 1234567", "wrongpass");

    submit();

    await screen.findByText("Phone number or password is incorrect");
    expect(screen.queryByText(/attempts? left/)).not.toBeInTheDocument();
  });

  it.each([
    ["ACCOUNT_DISABLED", "/account-disabled"],
    ["TENANT_SUSPENDED", "/shop-suspended"],
  ])("goes to the explanation page on 403 %s", async (code, page) => {
    vi.mocked(login).mockRejectedValue(httpError(undefined, 403, { code }));
    render(<LoginForm />);
    fill("0300 1234567", "secret");

    submit();

    await waitFor(() => expect(replace).toHaveBeenCalledWith(page));
    expect(useSessionStore.getState().accessToken).toBeNull();
  });

  it("shows the locked state with a countdown from Retry-After on 429", async () => {
    vi.mocked(login).mockRejectedValue(
      httpError(
        undefined,
        429,
        { message: "Too many attempts. Try again in a minute." },
        {
          "retry-after": "58",
        },
      ),
    );
    render(<LoginForm />);
    fill("03001234567", "wrongpass");

    submit();

    expect(
      await screen.findByRole("heading", { name: "Sign-in paused" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Too many wrong passwords for 0300 •••• 567/),
    ).toBeInTheDocument();
    expect(screen.getByRole("timer")).toHaveTextContent("00:58");
    expect(
      screen.getByRole("button", { name: "Try again in 0:58" }),
    ).toBeDisabled();
  });

  it("returns to the form when the lock ends", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(login).mockRejectedValue(
      httpError(undefined, 429, {}, { "retry-after": "2" }),
    );
    render(<LoginForm />);
    fill("03001234567", "wrongpass");

    submit();
    await screen.findByRole("heading", { name: "Sign-in paused" });
    await act(async () => {
      vi.advanceTimersByTime(2500);
    });

    expect(
      await screen.findByRole("heading", { name: "Welcome back" }),
    ).toBeInTheDocument();
  });

  it("shows field errors sent by the server on 400", async () => {
    vi.mocked(login).mockRejectedValue(
      httpError(undefined, 400, {
        errors: [{ field: "identifier", message: "Invalid phone or email" }],
      }),
    );
    render(<LoginForm />);
    fill("???", "secret");

    submit();

    expect(
      await screen.findByText("Invalid phone or email"),
    ).toBeInTheDocument();
  });

  it("shows the session-expired message from ?reason=session-expired", () => {
    render(<LoginForm reason="session-expired" />);

    expect(screen.getByText("Your session has ended")).toBeInTheDocument();
  });
});
