import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { api } from "@/lib/api";
import { useSessionStore } from "@/stores/session";
import { fakeAdapter, manager, ok, owner, sessionFor } from "@/test/fake-api";
import { TestProviders } from "@/test/render-panel";
import { shopStates } from "../test-data";
import type { ShopSubscription } from "../types";
import { SubscriptionBanner } from "./subscription-banner";

const defaultAdapter = api.defaults.adapter;

function renderBanner(shop: ShopSubscription, user = owner) {
  useSessionStore.getState().setSession(sessionFor(user));
  api.defaults.adapter = fakeAdapter(async (config) =>
    ok(config, shop),
  ).adapter;
  return render(
    <TestProviders>
      <SubscriptionBanner />
    </TestProviders>,
  );
}

describe("SubscriptionBanner", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    api.defaults.adapter = defaultAdapter;
    useSessionStore.getState().clear();
  });

  it("trial: days left and the end date (Karachi), can be hidden for today", async () => {
    renderBanner(shopStates.trial);
    const banner = await screen.findByTestId("subscription-banner");
    expect(banner).toHaveAttribute("data-kind", "trial");
    expect(banner).toHaveTextContent(
      "Free trial: 8 days left, until 15 Nov 2026.",
    );
    expect(banner).toHaveAttribute("role", "status");

    fireEvent.click(screen.getByRole("button", { name: "Hide for today" }));
    expect(screen.queryByTestId("subscription-banner")).not.toBeInTheDocument();
    expect(localStorage.getItem("gm.plan-banner.hidden-on")).toBe("2026-11-07");
  });

  it("stays hidden the same day, shows again on another day", async () => {
    localStorage.setItem("gm.plan-banner.hidden-on", "2026-11-07");
    const { unmount } = renderBanner(shopStates.expiring);
    await act(() => Promise.resolve());
    expect(screen.queryByTestId("subscription-banner")).not.toBeInTheDocument();
    unmount();

    localStorage.setItem("gm.plan-banner.hidden-on", "2026-11-06");
    renderBanner(shopStates.expiring);
    expect(await screen.findByTestId("subscription-banner")).toHaveTextContent(
      "Your Basic plan ends in 3 days, on 10 Nov 2026.",
    );
  });

  it("grace: an alert that can't be hidden", async () => {
    localStorage.setItem("gm.plan-banner.hidden-on", "2026-11-07");
    renderBanner(shopStates.grace);
    const banner = await screen.findByTestId("subscription-banner");
    expect(banner).toHaveAttribute("role", "alert");
    expect(banner).toHaveTextContent(
      "Full access for 4 more days, then read-only after 11 Nov 2026.",
    );
    expect(
      screen.queryByRole("button", { name: "Hide for today" }),
    ).not.toBeInTheDocument();
  });

  it("read-only: owner is told to contact support, staff to ask the owner", async () => {
    const { unmount } = renderBanner(shopStates.readOnly);
    expect(await screen.findByTestId("subscription-banner")).toHaveTextContent(
      /read-only.*Contact Galla Mandi support to renew/,
    );
    unmount();
    renderBanner(shopStates.readOnly, manager);
    expect(await screen.findByTestId("subscription-banner")).toHaveTextContent(
      "Ask your shop owner to renew.",
    );
  });

  it("a paid plan far from its end shows nothing", async () => {
    renderBanner(shopStates.quiet);
    await act(() => Promise.resolve());
    expect(screen.queryByTestId("subscription-banner")).not.toBeInTheDocument();
  });
});
