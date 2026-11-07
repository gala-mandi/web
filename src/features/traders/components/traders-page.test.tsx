import { bidi } from "@/i18n/bidi";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import {
  NuqsTestingAdapter,
  type OnUrlUpdateFunction,
} from "nuqs/adapters/testing";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@/features/auth/types";
import { useSessionStore } from "@/stores/session";
import { httpError, manager, operator, owner } from "@/test/fake-api";
import { TestProviders } from "@/test/render-panel";
import { deleteTrader, listTraders, updateTrader } from "../api";
import { trader, traderDetail, traderList, urduTrader } from "../test-data";
import { TradersPage } from "./traders-page";

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
}));

vi.mock("../api", () => ({
  listTraders: vi.fn(),
  deleteTrader: vi.fn(),
  updateTrader: vi.fn(),
  createTrader: vi.fn(),
}));

const aslam = trader();

function renderPage(user: User = owner, searchParams = "") {
  useSessionStore.getState().setSession({ accessToken: "t", user });
  const onUrlUpdate = vi.fn<OnUrlUpdateFunction>();
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <NuqsTestingAdapter
        searchParams={searchParams}
        onUrlUpdate={onUrlUpdate}
        hasMemory
      >
        <TestProviders>{children}</TestProviders>
      </NuqsTestingAdapter>
    );
  }
  render(<TradersPage />, { wrapper: Wrapper });
  return { onUrlUpdate };
}

const lastUrl = (spy: ReturnType<typeof vi.fn<OnUrlUpdateFunction>>) =>
  spy.mock.calls.at(-1)?.[0].queryString;

/** Query of the last `GET /traders`. */
const lastQuery = () => vi.mocked(listTraders).mock.calls.at(-1)?.[0];

async function openActions(name: string) {
  const trigger = await screen.findByRole("button", {
    // An Urdu name is isolated inside the English label (FSI…PDI).
    name: `Actions for ${bidi(name)}`,
  });
  fireEvent.keyDown(trigger, { key: "Enter" });
  return screen.findByRole("menu");
}

describe("TradersPage", () => {
  beforeEach(() => {
    push.mockReset();
    vi.mocked(listTraders)
      .mockReset()
      .mockResolvedValue(traderList([aslam, urduTrader]));
    vi.mocked(deleteTrader).mockReset();
    vi.mocked(updateTrader).mockReset();
    Element.prototype.hasPointerCapture ??= () => false;
    Element.prototype.releasePointerCapture ??= () => {};
  });

  afterEach(() => {
    useSessionStore.getState().clear();
    localStorage.clear();
  });

  it("lists traders with type, phone, village, opening balance and status", async () => {
    renderPage();

    expect(
      screen.getByRole("heading", { level: 1, name: "Traders" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Add trader" })).toBeVisible();
    const link = await screen.findByRole("link", { name: "Muhammad Aslam" });
    expect(link).toHaveAttribute("href", `/traders/${aslam.id}`);
    const row = link.closest("tr")!;
    expect(row).toHaveTextContent("s/o Muhammad Akram");
    expect(row).toHaveTextContent("Kissan");
    expect(row).toHaveTextContent("03001234567");
    expect(row).toHaveTextContent("Chak 45");
    expect(row).toHaveTextContent("Rs 50,000.00");
    expect(row).toHaveTextContent("Debit");
    expect(row).toHaveTextContent("Active");
    expect(lastQuery()).toEqual({ page: 1, limit: 20, sort: "name" });

    // Urdu names keep their own direction and get the Nastaliq font.
    const urdu = screen.getByText("محمد اسلم");
    expect(urdu).toHaveAttribute("dir", "auto");
    expect(urdu).toHaveAttribute("lang", "ur");
    expect(urdu).toHaveClass("font-urdu");
    expect(urdu.closest("tr")).toHaveTextContent("Inactive");
  });

  it("opens the profile on a row click", async () => {
    renderPage();

    fireEvent.click(await screen.findByText("Chak 45"));
    expect(push).toHaveBeenCalledWith(`/traders/${aslam.id}`);
  });

  it("type tabs set `type` and go back to page 1", async () => {
    const { onUrlUpdate } = renderPage(owner, "?page=3&q=asl");
    await screen.findByText("Muhammad Aslam");
    expect(lastQuery()).toMatchObject({ page: 3, search: "asl" });
    expect(screen.getByRole("tab", { name: "All" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    fireEvent.mouseDown(screen.getByRole("tab", { name: "Beopari" }));

    await waitFor(() =>
      expect(lastUrl(onUrlUpdate)).toBe("?q=asl&type=beopari"),
    );
    await waitFor(() =>
      expect(lastQuery()).toEqual({
        page: 1,
        limit: 20,
        sort: "name",
        search: "asl",
        type: "beopari",
      }),
    );
    expect(screen.getByRole("tab", { name: "Beopari" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    fireEvent.mouseDown(screen.getByRole("tab", { name: "All" }));
    await waitFor(() => expect(lastUrl(onUrlUpdate)).toBe("?q=asl"));
  });

  it("searches name or phone once typing stops", async () => {
    const { onUrlUpdate } = renderPage();
    await screen.findByText("Muhammad Aslam");
    const input = screen.getByLabelText("Search traders");

    for (const value of ["0", "03", "030", "0300"]) {
      fireEvent.change(input, { target: { value } });
    }

    await waitFor(() => expect(lastUrl(onUrlUpdate)).toBe("?q=0300"));
    expect(onUrlUpdate).toHaveBeenCalledOnce();
    await waitFor(() => expect(lastQuery()).toMatchObject({ search: "0300" }));
    const searches = vi
      .mocked(listTraders)
      .mock.calls.map(([query]) => query.search);
    expect(searches).toEqual([undefined, "0300"]);
  });

  it("filters active or inactive traders", async () => {
    const { onUrlUpdate } = renderPage(owner, "?page=2");
    await screen.findByText("Muhammad Aslam");

    fireEvent.keyDown(screen.getByRole("combobox", { name: "Status" }), {
      key: "Enter",
    });
    fireEvent.click(await screen.findByRole("option", { name: "Inactive" }));

    await waitFor(() => expect(lastUrl(onUrlUpdate)).toBe("?status=inactive"));
    await waitFor(() =>
      expect(lastQuery()).toEqual({
        page: 1,
        limit: 20,
        sort: "name",
        active: false,
      }),
    );
  });

  it("gives the owner every row action", async () => {
    renderPage(owner);

    const menu = await openActions("Muhammad Aslam");
    expect(
      within(menu)
        .getAllByRole("menuitem")
        .map((item) => item.textContent),
    ).toEqual(["View profile", "Edit", "Deactivate", "Delete"]);
    expect(
      within(menu).getByRole("menuitem", { name: "View profile" }),
    ).toHaveAttribute("href", `/traders/${aslam.id}`);
  });

  it("gives a manager no Delete, and Activate for an inactive trader", async () => {
    renderPage(manager);

    const menu = await openActions("محمد اسلم");
    expect(
      within(menu)
        .getAllByRole("menuitem")
        .map((item) => item.textContent),
    ).toEqual(["View profile", "Edit", "Activate"]);
  });

  it("opens the edit sheet with the trader's values", async () => {
    renderPage(owner);

    const menu = await openActions("Muhammad Aslam");
    fireEvent.click(within(menu).getByRole("menuitem", { name: "Edit" }));

    const sheet = await screen.findByRole("dialog", {
      name: "Edit Muhammad Aslam",
    });
    expect(within(sheet).getByLabelText(/^Name/)).toHaveValue("Muhammad Aslam");
    expect(within(sheet).getByLabelText(/^Active/)).toBeChecked();
  });

  it("deactivates a trader after confirming", async () => {
    vi.mocked(updateTrader).mockResolvedValue(
      traderDetail({ isActive: false }),
    );
    renderPage(owner);

    const menu = await openActions("Muhammad Aslam");
    fireEvent.click(within(menu).getByRole("menuitem", { name: "Deactivate" }));
    const dialog = await screen.findByRole("alertdialog", {
      name: "Deactivate Muhammad Aslam?",
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Deactivate" }));

    await waitFor(() =>
      expect(updateTrader).toHaveBeenCalledWith(aslam.id, { isActive: false }),
    );
    expect(
      await screen.findByText("Muhammad Aslam is deactivated."),
    ).toBeVisible();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });

  it("shows why a trader with transactions can't be deleted and offers Deactivate", async () => {
    const message =
      "This trader has transactions and cannot be deleted. Deactivate the trader instead.";
    vi.mocked(deleteTrader).mockRejectedValue(
      httpError(undefined, 409, { message, code: "TRADER_HAS_TRANSACTIONS" }),
    );
    vi.mocked(updateTrader).mockResolvedValue(
      traderDetail({ isActive: false }),
    );
    renderPage(owner);

    const menu = await openActions("Muhammad Aslam");
    fireEvent.click(within(menu).getByRole("menuitem", { name: "Delete" }));
    const dialog = await screen.findByRole("alertdialog", {
      name: "Delete Muhammad Aslam?",
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(message);
    expect(deleteTrader).toHaveBeenCalledWith(aslam.id);

    fireEvent.click(
      within(dialog).getByRole("button", { name: "Deactivate instead" }),
    );
    const confirm = await screen.findByRole("alertdialog", {
      name: "Deactivate Muhammad Aslam?",
    });
    fireEvent.click(
      within(confirm).getByRole("button", { name: "Deactivate" }),
    );
    await waitFor(() =>
      expect(updateTrader).toHaveBeenCalledWith(aslam.id, { isActive: false }),
    );
  });

  it("deletes a trader without transactions", async () => {
    vi.mocked(deleteTrader).mockResolvedValue(undefined);
    renderPage(owner);

    const menu = await openActions("Muhammad Aslam");
    fireEvent.click(within(menu).getByRole("menuitem", { name: "Delete" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    expect(await screen.findByText("Muhammad Aslam is deleted.")).toBeVisible();
    // The list is asked again.
    await waitFor(() => expect(listTraders).toHaveBeenCalledTimes(2));
  });

  it("shows the empty state, and a no-match state when filtered", async () => {
    vi.mocked(listTraders).mockResolvedValue(traderList([]));
    renderPage(owner);
    expect(
      await screen.findByRole("heading", { name: "No traders yet" }),
    ).toBeVisible();
    expect(screen.getAllByRole("button", { name: "Add trader" })).toHaveLength(
      2,
    );
  });

  it("says nothing matches when a filter is on", async () => {
    vi.mocked(listTraders).mockResolvedValue(traderList([]));
    renderPage(owner, "?type=arhti");
    expect(
      await screen.findByRole("heading", { name: "No traders match" }),
    ).toBeVisible();
  });

  it("shows an error with retry when the list fails", async () => {
    vi.mocked(listTraders).mockRejectedValue(new Error("Network Error"));
    renderPage(owner);

    expect(await screen.findByText("Couldn’t load this list")).toBeVisible();
    vi.mocked(listTraders).mockResolvedValue(traderList([aslam]));
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Muhammad Aslam")).toBeVisible();
  });

  it("shows 403 to an operator and asks the server for nothing", () => {
    renderPage(operator);

    expect(
      screen.getByRole("heading", { name: "You don’t have access" }),
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: "Add trader" })).toBeNull();
    expect(listTraders).not.toHaveBeenCalled();
  });

  it("shows 403 when the server refuses the list", async () => {
    vi.mocked(listTraders).mockRejectedValue(httpError(undefined, 403));
    renderPage(manager);

    expect(
      await screen.findByRole("heading", { name: "You don’t have access" }),
    ).toBeVisible();
  });
});
