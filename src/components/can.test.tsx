import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { User } from "@/features/auth/types";
import { useSessionStore } from "@/stores/session";
import { owner } from "@/test/fake-api";
import { rolePermissions } from "@/test/permissions";
import { Can } from "./can";

function signIn(user: User) {
  useSessionStore.getState().setSession({ accessToken: "t", user });
}

function deleteButton() {
  return (
    <Can permission="purchase.delete" fallback={<span>No access</span>}>
      <button type="button">Delete purchase</button>
    </Can>
  );
}

describe("Can", () => {
  afterEach(() => act(() => useSessionStore.getState().clear()));

  it("shows the button to an owner", () => {
    signIn(owner);
    render(deleteButton());

    expect(
      screen.getByRole("button", { name: "Delete purchase" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("No access")).not.toBeInTheDocument();
  });

  it.each(["manager", "operator"] as const)(
    "hides the button from a %s and shows the fallback",
    (role) => {
      signIn({ ...owner, role, permissions: [...rolePermissions[role]] });
      render(deleteButton());

      expect(
        screen.queryByRole("button", { name: "Delete purchase" }),
      ).not.toBeInTheDocument();
      expect(screen.getByText("No access")).toBeInTheDocument();
    },
  );

  it("renders nothing by default when not allowed", () => {
    signIn({
      ...owner,
      role: "operator",
      permissions: rolePermissions.operator,
    });
    const { container } = render(
      <Can permission="report.view">
        <button type="button">Reports</button>
      </Can>,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("hides everything when nobody is signed in", () => {
    render(
      <Can permission="dashboard.view">
        <span>Dashboard</span>
      </Can>,
    );

    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
  });

  it("updates when the session's permissions change", () => {
    signIn({
      ...owner,
      role: "operator",
      permissions: rolePermissions.operator,
    });
    render(deleteButton());
    expect(screen.queryByRole("button")).not.toBeInTheDocument();

    act(() => signIn(owner));

    expect(
      screen.getByRole("button", { name: "Delete purchase" }),
    ).toBeInTheDocument();
  });
});
