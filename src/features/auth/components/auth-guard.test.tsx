import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { hardRedirect } from "@/lib/navigation";
import { useSessionStore } from "@/stores/session";
import { fakeAdapter, httpError, ok, owner, sessionFor } from "@/test/fake-api";
import { AuthGuard } from "./auth-guard";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("@/lib/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/navigation")>()),
  hardRedirect: vi.fn(),
}));

const defaultAdapter = api.defaults.adapter;

describe("AuthGuard", () => {
  beforeEach(() => {
    replace.mockReset();
    vi.mocked(hardRedirect).mockReset();
  });

  afterEach(() => {
    api.defaults.adapter = defaultAdapter;
    useSessionStore.getState().clear();
  });

  it("restores the session from the refresh cookie, then shows the page", async () => {
    const fake = fakeAdapter(async (config) =>
      ok(config, sessionFor(owner, "restored")),
    );
    api.defaults.adapter = fake.adapter;

    render(<AuthGuard>secret page</AuthGuard>);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(await screen.findByText("secret page")).toBeInTheDocument();
    expect(fake.calls.map((c) => c.url)).toEqual(["/auth/refresh"]);
  });

  it("clears the session and goes to login when refresh fails", async () => {
    api.defaults.adapter = fakeAdapter(async (config) => {
      throw httpError(config, 401, { code: "SESSION_EXPIRED" });
    }).adapter;

    render(<AuthGuard>secret page</AuthGuard>);

    await waitFor(() =>
      expect(hardRedirect).toHaveBeenCalledWith(
        "/login?reason=session-expired",
      ),
    );
    expect(screen.queryByText("secret page")).not.toBeInTheDocument();
    expect(useSessionStore.getState().accessToken).toBeNull();
  });

  it("sends a user who must change the password to /change-password first", async () => {
    useSessionStore
      .getState()
      .setSession(sessionFor({ ...owner, mustChangePassword: true }));

    render(<AuthGuard>secret page</AuthGuard>);

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/change-password"),
    );
    expect(screen.queryByText("secret page")).not.toBeInTheDocument();
  });
});
