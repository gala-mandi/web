import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getMe } from "@/features/auth/api";
import type { User } from "@/features/auth/types";
import { getSettings } from "@/features/settings/api";
import { shopSettings } from "@/features/settings/test-data";
import { useSessionStore } from "@/stores/session";
import { httpError, manager, operator, owner } from "@/test/fake-api";
import { TestProviders } from "@/test/render-panel";
import { cancelPayment, getPayment } from "../api";
import { savedPayment } from "../test-data";
import { PaymentDetailPage } from "./payment-view";

const print = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
vi.mock("react-to-print", () => ({ useReactToPrint: () => print }));
vi.mock("@/features/auth/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/auth/api")>()),
  getMe: vi.fn(),
}));
vi.mock("@/features/settings/api", () => ({ getSettings: vi.fn() }));
vi.mock("../api", () => ({ getPayment: vi.fn(), cancelPayment: vi.fn() }));

const payment = savedPayment();

function renderView(user: User, searchParams = "") {
  useSessionStore.getState().setSession({ accessToken: "t", user });
  render(
    <NuqsTestingAdapter searchParams={searchParams} hasMemory>
      <TestProviders>
        <PaymentDetailPage id={payment.id} />
      </TestProviders>
    </NuqsTestingAdapter>,
  );
}

describe("PaymentDetailPage", () => {
  beforeEach(() => {
    print.mockReset();
    vi.mocked(getPayment).mockResolvedValue(payment);
    vi.mocked(cancelPayment).mockReset();
    vi.mocked(getSettings).mockResolvedValue(shopSettings());
    vi.mocked(getMe).mockResolvedValue(owner);
  });

  afterEach(() => useSessionStore.getState().clear());

  it("shows the voucher as it prints, with Print, Cancel and the khata for the owner", async () => {
    renderView(owner);
    expect(
      await screen.findByRole("article", {
        name: "Payment voucher PAY-2026-27-000001",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Payment PAY-2026-27-000001" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open khata" })).toHaveAttribute(
      "href",
      `/ledger?trader=${payment.trader.id}`,
    );
    fireEvent.click(screen.getByRole("button", { name: "Print voucher" }));
    await waitFor(() => expect(print).toHaveBeenCalledTimes(1));
    expect(
      screen.getByRole("button", { name: "Cancel voucher" }),
    ).toBeInTheDocument();
  });

  it("prints once when opened with ?print=1 (Save & Print)", async () => {
    renderView(owner, "?print=1");
    await screen.findByRole("article");
    await waitFor(() => expect(print).toHaveBeenCalledTimes(1));
  });

  it("cancel is for the owner only; the khata link for those who see it", async () => {
    renderView(manager);
    await screen.findByRole("article");
    expect(screen.queryByRole("button", { name: "Cancel voucher" })).toBeNull();
    expect(screen.getByRole("link", { name: "Open khata" })).toBeVisible();
  });

  it("operators see and print the voucher, without the khata link", async () => {
    renderView(operator);
    await screen.findByRole("article");
    expect(screen.queryByRole("link", { name: "Open khata" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Cancel voucher" })).toBeNull();
  });

  it("the owner cancels it: reversed, the bills open again", async () => {
    vi.mocked(cancelPayment).mockResolvedValue({
      ...payment,
      status: "cancelled",
    });
    renderView(owner);
    fireEvent.click(
      await screen.findByRole("button", { name: "Cancel voucher" }),
    );
    expect(
      await screen.findByRole("alertdialog", {
        name: "Cancel PAY-2026-27-000001?",
      }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getAllByRole("button", { name: "Cancel voucher" }).at(-1)!,
    );
    expect(
      await screen.findByText("PAY-2026-27-000001 cancelled"),
    ).toBeInTheDocument();
    expect(cancelPayment).toHaveBeenCalledWith(payment.id);
    expect(
      await screen.findByText(/This voucher is cancelled/),
    ).toBeInTheDocument();
    expect(screen.getByTestId("parchi-watermark")).toBeInTheDocument();
  });

  it("says so when it was already cancelled", async () => {
    vi.mocked(cancelPayment).mockRejectedValue(
      httpError(undefined, 409, { code: "PAYMENT_CANCELLED" }),
    );
    renderView(owner);
    fireEvent.click(
      await screen.findByRole("button", { name: "Cancel voucher" }),
    );
    fireEvent.click(
      (await screen.findAllByRole("button", { name: "Cancel voucher" })).at(
        -1,
      )!,
    );
    expect(
      await screen.findByText("This voucher was already cancelled."),
    ).toBeInTheDocument();
  });

  it("404 for an unknown voucher", async () => {
    vi.mocked(getPayment).mockRejectedValue(httpError(undefined, 404));
    renderView(owner);
    expect(
      await screen.findByRole("heading", { level: 1, name: /not found/i }),
    ).toBeInTheDocument();
  });
});
