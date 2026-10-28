import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@/features/auth/types";
import { useSessionStore } from "@/stores/session";
import { manager, operator, owner } from "@/test/fake-api";
import { TestProviders } from "@/test/render-panel";
import { listInvitations, listStaff } from "../api";
import { invitation, youOwner } from "../test-data";
import { StaffPage } from "./staff-page";

vi.mock("../api", () => ({
  listStaff: vi.fn(),
  listInvitations: vi.fn(),
}));

function renderAs(user: User) {
  useSessionStore.getState().setSession({ accessToken: "t", user });
  render(
    <TestProviders>
      <StaffPage />
    </TestProviders>,
  );
}

describe("StaffPage", () => {
  beforeEach(() => {
    vi.mocked(listStaff).mockReset().mockResolvedValue([youOwner]);
    vi.mocked(listInvitations).mockReset().mockResolvedValue([invitation()]);
  });

  afterEach(() => useSessionStore.getState().clear());

  it("shows the staff list and loads invitations only on their tab", async () => {
    renderAs(owner);

    expect(
      screen.getByRole("heading", { level: 1, name: "Staff" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Invite staff" })).toBeVisible();
    expect(await screen.findByText("Haji Aslam")).toBeVisible();
    expect(listInvitations).not.toHaveBeenCalled();

    fireEvent.mouseDown(
      screen.getByRole("tab", { name: "Pending invitations" }),
    );

    expect(await screen.findByText("03011234567")).toBeVisible();
    expect(
      screen.getByRole("tab", { name: "Pending invitations" }),
    ).toHaveAttribute("aria-selected", "true");
  });

  it.each([
    ["manager", manager],
    ["operator", operator],
  ])("shows 403 to a %s and asks the server for nothing", (_, user) => {
    renderAs(user);

    expect(
      screen.getByRole("heading", { name: "You don’t have access" }),
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: "Invite staff" })).toBeNull();
    expect(listStaff).not.toHaveBeenCalled();
  });
});
