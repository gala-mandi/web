import { render, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { RequirePermission } from "@/features/panel/components/require-permission";
import { api } from "@/lib/api";
import { getQueryClient } from "@/lib/query-client";
import { useSessionStore } from "@/stores/session";
import { fakeAdapter, httpError, owner, sessionFor } from "@/test/fake-api";
import { TestProviders, testQueryClient } from "@/test/render-panel";
import { shopStates } from "../test-data";
import type { ShopSubscription } from "../types";

vi.mock("sonner", async (importOriginal) => ({
  ...(await importOriginal<typeof import("sonner")>()),
  toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }),
}));

const defaultAdapter = api.defaults.adapter;

function renderPage(shop: ShopSubscription, write: boolean) {
  useSessionStore.getState().setSession(sessionFor(owner));
  const client = testQueryClient();
  client.setQueryData(["subscription"], shop);
  render(
    <TestProviders client={client}>
      <RequirePermission permission="purchase.create" write={write}>
        <p>new purchase form</p>
      </RequirePermission>
    </TestProviders>,
  );
}

describe("read-only mode", () => {
  afterEach(() => {
    api.defaults.adapter = defaultAdapter;
    useSessionStore.getState().clear();
    vi.mocked(toast.error).mockReset();
  });

  it("a page that writes shows screen 4.1 instead", () => {
    renderPage(shopStates.readOnly, true);
    expect(screen.queryByText("new purchase form")).not.toBeInTheDocument();
    const notice = screen.getByTestId("read-only-notice");
    expect(notice).toHaveTextContent("Demo Mandi is read-only");
    expect(notice).toHaveTextContent("ended on 28 Oct 2026");
    expect(notice).toHaveTextContent("You can still view and print");
    expect(notice).toHaveTextContent("Contact Galla Mandi support to renew.");
  });

  it("in grace the page works; view pages never show the notice", () => {
    renderPage(shopStates.grace, true);
    expect(screen.getByText("new purchase form")).toBeInTheDocument();
  });

  it("a page that only views works in read-only", () => {
    renderPage(shopStates.readOnly, false);
    expect(screen.getByText("new purchase form")).toBeInTheDocument();
  });

  it("a write refused with SUBSCRIPTION_READ_ONLY shows one friendly toast and refreshes the plan", async () => {
    useSessionStore.getState().setSession(sessionFor(owner));
    const invalidate = vi.spyOn(getQueryClient(), "invalidateQueries");
    api.defaults.adapter = fakeAdapter(async (config) => {
      throw httpError(config, 403, {
        code: "SUBSCRIPTION_READ_ONLY",
        message: "This shop's plan has ended.",
      });
    }).adapter;

    await expect(api.post("/traders", {})).rejects.toMatchObject({
      response: { status: 403 },
    });
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        expect.objectContaining({
          props: { id: "subscription.toast.readOnly" },
        }),
        { id: "SUBSCRIPTION_READ_ONLY" },
      ),
    );
    // The toast text follows the interface language.
    render(vi.mocked(toast.error).mock.calls[0][0] as ReactElement);
    expect(screen.getByText(/the shop is read-only/)).toBeInTheDocument();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["subscription"] });
    // No redirect away from the page: viewing keeps working.
    expect(useSessionStore.getState().accessToken).toBe("token-1");
  });
});
