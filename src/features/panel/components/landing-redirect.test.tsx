import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSessionStore } from "@/stores/session";
import { operator, owner, sessionFor } from "@/test/fake-api";
import { LandingRedirect } from "./landing-redirect";

const replace = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

describe("LandingRedirect (/home)", () => {
  beforeEach(() => replace.mockReset());
  afterEach(() => useSessionStore.getState().clear());

  it("sends the owner to the dashboard", () => {
    useSessionStore.getState().setSession(sessionFor(owner));
    render(<LandingRedirect next={null} />);

    expect(replace).toHaveBeenCalledWith("/dashboard");
  });

  it("sends an operator to Daily rates", () => {
    useSessionStore.getState().setSession(sessionFor(operator));
    render(<LandingRedirect next={null} />);

    expect(replace).toHaveBeenCalledWith("/rates");
  });

  it("follows ?next= only to a page the user may open", () => {
    useSessionStore.getState().setSession(sessionFor(operator));
    const { unmount } = render(<LandingRedirect next="/sales" />);
    expect(replace).toHaveBeenLastCalledWith("/sales");
    unmount();

    render(<LandingRedirect next="/staff" />);
    expect(replace).toHaveBeenLastCalledWith("/rates");
  });
});
