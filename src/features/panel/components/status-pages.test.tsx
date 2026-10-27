import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useSessionStore } from "@/stores/session";
import { manager, operator, owner, sessionFor } from "@/test/fake-api";
import { TestProviders } from "@/test/render-panel";
import { DashboardHome } from "./dashboard-home";
import { RequirePermission } from "./require-permission";
import { SectionPlaceholder } from "./section-placeholder";
import { ErrorState, ForbiddenState, NotFoundState } from "./status-pages";

describe("status pages", () => {
  afterEach(() => useSessionStore.getState().clear());

  it("404 explains the page doesn't exist and links to the landing page", () => {
    useSessionStore.getState().setSession(sessionFor(owner));
    render(<NotFoundState />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Page not found" }),
    ).toBeInTheDocument();
    expect(screen.getByText("404")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to Dashboard" }),
    ).toHaveAttribute("href", "/dashboard");
  });

  it("403 says the user has no access and links to their landing page", () => {
    useSessionStore.getState().setSession(sessionFor(operator));
    render(<ForbiddenState />);

    expect(
      screen.getByRole("heading", { level: 1, name: "You don’t have access" }),
    ).toBeInTheDocument();
    expect(screen.getByText("403")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to Daily rates" }),
    ).toHaveAttribute("href", "/rates");
  });

  it("error state retries", () => {
    const retry = vi.fn();
    render(<ErrorState retry={retry} digest="abc123" />);

    expect(screen.getByRole("alert")).toHaveTextContent("Reference: abc123");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledOnce();
  });
});

describe("RequirePermission", () => {
  afterEach(() => useSessionStore.getState().clear());

  it("shows the page to a user with the permission", () => {
    useSessionStore.getState().setSession(sessionFor(owner));
    render(
      <RequirePermission permission="settings.manage">
        settings
      </RequirePermission>,
    );

    expect(screen.getByText("settings")).toBeInTheDocument();
  });

  it("shows 403 to a user without it", () => {
    useSessionStore.getState().setSession(sessionFor(manager));
    render(
      <RequirePermission permission="settings.manage">
        settings
      </RequirePermission>,
    );

    expect(screen.queryByText("settings")).toBeNull();
    expect(screen.getByText("403")).toBeInTheDocument();
  });

  it("an operator opening Settings gets the 403 page", () => {
    useSessionStore.getState().setSession(sessionFor(operator));
    render(<SectionPlaceholder section="settings" />);

    expect(
      screen.getByRole("heading", { level: 1, name: "You don’t have access" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Settings" })).toBeNull();
  });

  it("an operator opening the dashboard gets the 403 page", () => {
    useSessionStore.getState().setSession(sessionFor(operator));
    render(
      <TestProviders>
        <DashboardHome />
      </TestProviders>,
    );

    expect(screen.getByText("403")).toBeInTheDocument();
  });

  it("a placeholder page shows its title and the coming-soon state", () => {
    useSessionStore.getState().setSession(sessionFor(operator));
    render(<SectionPlaceholder section="rates" />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Daily rates" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Nothing here yet")).toBeInTheDocument();
  });
});
