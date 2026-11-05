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
import { getSettings } from "@/features/settings/api";
import { shopSettings } from "@/features/settings/test-data";
import { useSessionStore } from "@/stores/session";
import { httpError, manager, operator, owner } from "@/test/fake-api";
import { TestProviders } from "@/test/render-panel";
import { deleteCommodity, listCommodities, updateCommodity } from "../api";
import { commodity, commodityList, kapas } from "../test-data";
import { CommoditiesPage } from "./commodities-page";

vi.mock("../api", () => ({
  listCommodities: vi.fn(),
  deleteCommodity: vi.fn(),
  updateCommodity: vi.fn(),
  createCommodity: vi.fn(),
}));
vi.mock("@/features/settings/api", () => ({ getSettings: vi.fn() }));

const gandum = commodity();

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
  render(<CommoditiesPage />, { wrapper: Wrapper });
  return { onUrlUpdate };
}

const lastUrl = (spy: ReturnType<typeof vi.fn<OnUrlUpdateFunction>>) =>
  spy.mock.calls.at(-1)?.[0].queryString;

/** Query of the last `GET /commodities`. */
const lastQuery = () => vi.mocked(listCommodities).mock.calls.at(-1)?.[0];

async function openActions(name: string) {
  const trigger = await screen.findByRole("button", {
    name: `Actions for ${name}`,
  });
  fireEvent.keyDown(trigger, { key: "Enter" });
  return screen.findByRole("menu");
}

async function chooseFilter(label: string, option: string) {
  fireEvent.keyDown(screen.getByRole("combobox", { name: label }), {
    key: "Enter",
  });
  fireEvent.click(await screen.findByRole("option", { name: option }));
}

describe("CommoditiesPage", () => {
  beforeEach(() => {
    vi.mocked(listCommodities)
      .mockReset()
      .mockResolvedValue(commodityList([gandum, kapas]));
    vi.mocked(deleteCommodity).mockReset();
    vi.mocked(updateCommodity).mockReset();
    vi.mocked(getSettings).mockReset().mockResolvedValue(shopSettings());
    Element.prototype.hasPointerCapture ??= () => false;
    Element.prototype.releasePointerCapture ??= () => {};
  });

  afterEach(() => {
    useSessionStore.getState().clear();
    localStorage.clear();
  });

  it("lists commodities with Urdu name, category, unit, bag weight, charges and status", async () => {
    renderPage();

    expect(
      screen.getByRole("heading", { level: 1, name: "Commodities" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Add commodity" })).toBeVisible();
    const name = await screen.findByRole("button", { name: "Edit Gandum" });
    const row = name.closest("tr")!;
    expect(row).toHaveTextContent("Grain");
    expect(row).toHaveTextContent("Bag");
    expect(row).toHaveTextContent("100 kg");
    expect(row).toHaveTextContent("Shop default");
    expect(row).toHaveTextContent("Active");
    expect(lastQuery()).toEqual({ page: 1, limit: 20, sort: "name" });

    // Urdu names keep their own direction and get the Nastaliq font.
    const urdu = within(row).getByText("گندم");
    expect(urdu).toHaveAttribute("dir", "auto");
    expect(urdu).toHaveAttribute("lang", "ur");
    expect(urdu).toHaveClass("font-urdu");

    const kapasRow = screen
      .getByRole("button", { name: "Edit Kapas" })
      .closest("tr")!;
    expect(kapasRow).toHaveTextContent("Commission 3.00%");
    expect(kapasRow).toHaveTextContent("Labour per bag Rs 20.00");
    expect(kapasRow).not.toHaveTextContent("Market fee");
    expect(kapasRow).toHaveTextContent("Maund");
    expect(kapasRow).toHaveTextContent("Inactive");
  });

  it("opens the edit sheet from the name or a row click", async () => {
    renderPage();

    fireEvent.click(await screen.findByText("100 kg"));
    const sheet = await screen.findByRole("dialog", { name: "Edit Gandum" });
    expect(within(sheet).getByLabelText(/^Name/)).toHaveValue("Gandum");
    expect(within(sheet).getByLabelText(/^Active/)).toBeChecked();
  });

  it("searches English or Urdu names once typing stops", async () => {
    const { onUrlUpdate } = renderPage();
    await screen.findByText("Gandum");
    const input = screen.getByLabelText("Search commodities");

    for (const value of ["g", "gan", "گندم"]) {
      fireEvent.change(input, { target: { value } });
    }

    await waitFor(() => expect(lastUrl(onUrlUpdate)).toBe("?q=گندم"));
    await waitFor(() => expect(lastQuery()).toMatchObject({ search: "گندم" }));
    const searches = vi
      .mocked(listCommodities)
      .mock.calls.map(([query]) => query.search);
    expect(searches).toEqual([undefined, "گندم"]);
  });

  it("filters active or inactive commodities", async () => {
    const { onUrlUpdate } = renderPage(owner, "?page=2");
    await screen.findByText("Gandum");

    await chooseFilter("Status", "Inactive");

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

  it("filters by category", async () => {
    const { onUrlUpdate } = renderPage();
    await screen.findByText("Gandum");

    await chooseFilter("Category", "Pulse");

    await waitFor(() => expect(lastUrl(onUrlUpdate)).toBe("?category=pulse"));
    await waitFor(() =>
      expect(lastQuery()).toMatchObject({ category: "pulse" }),
    );
  });

  it("keeps a shop's own category from the URL in the filter", async () => {
    renderPage(owner, "?category=Masala");
    await screen.findByText("Gandum");

    expect(lastQuery()).toMatchObject({ category: "Masala" });
    expect(
      screen.getByRole("combobox", { name: "Category" }),
    ).toHaveTextContent("Masala");
  });

  it("gives the owner every row action", async () => {
    renderPage(owner);

    const menu = await openActions("Gandum");
    expect(
      within(menu)
        .getAllByRole("menuitem")
        .map((item) => item.textContent),
    ).toEqual(["Edit", "Deactivate", "Delete"]);
  });

  it("gives a manager no Delete, and Activate for an inactive commodity", async () => {
    renderPage(manager);

    const menu = await openActions("Kapas");
    expect(
      within(menu)
        .getAllByRole("menuitem")
        .map((item) => item.textContent),
    ).toEqual(["Edit", "Activate"]);
  });

  it("deactivates a commodity after confirming", async () => {
    vi.mocked(updateCommodity).mockResolvedValue({
      ...gandum,
      isActive: false,
    });
    renderPage(owner);

    const menu = await openActions("Gandum");
    fireEvent.click(within(menu).getByRole("menuitem", { name: "Deactivate" }));
    const dialog = await screen.findByRole("alertdialog", {
      name: "Deactivate Gandum?",
    });
    expect(dialog).toHaveTextContent(/won’t show up when picking/);
    fireEvent.click(within(dialog).getByRole("button", { name: "Deactivate" }));

    await waitFor(() =>
      expect(updateCommodity).toHaveBeenCalledWith(gandum.id, {
        isActive: false,
      }),
    );
    expect(await screen.findByText("Gandum is deactivated.")).toBeVisible();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    // The list is asked again.
    await waitFor(() => expect(listCommodities).toHaveBeenCalledTimes(2));
  });

  it("explains why a commodity in use can't be deleted and offers Deactivate", async () => {
    const message =
      "This commodity is used in rates, purchases or sales and cannot be deleted. Deactivate it instead.";
    vi.mocked(deleteCommodity).mockRejectedValue(
      httpError(undefined, 409, { message, code: "COMMODITY_IN_USE" }),
    );
    vi.mocked(updateCommodity).mockResolvedValue({
      ...gandum,
      isActive: false,
    });
    renderPage(owner);

    const menu = await openActions("Gandum");
    fireEvent.click(within(menu).getByRole("menuitem", { name: "Delete" }));
    const dialog = await screen.findByRole("alertdialog", {
      name: "Delete Gandum?",
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(message);
    expect(deleteCommodity).toHaveBeenCalledWith(gandum.id);

    fireEvent.click(
      within(dialog).getByRole("button", { name: "Deactivate instead" }),
    );
    const confirm = await screen.findByRole("alertdialog", {
      name: "Deactivate Gandum?",
    });
    fireEvent.click(
      within(confirm).getByRole("button", { name: "Deactivate" }),
    );
    await waitFor(() =>
      expect(updateCommodity).toHaveBeenCalledWith(gandum.id, {
        isActive: false,
      }),
    );
  });

  it("deletes a commodity that isn't used", async () => {
    vi.mocked(deleteCommodity).mockResolvedValue(undefined);
    renderPage(owner);

    const menu = await openActions("Gandum");
    fireEvent.click(within(menu).getByRole("menuitem", { name: "Delete" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    expect(await screen.findByText("Gandum is deleted.")).toBeVisible();
    await waitFor(() => expect(listCommodities).toHaveBeenCalledTimes(2));
  });

  it("shows the empty state", async () => {
    vi.mocked(listCommodities).mockResolvedValue(commodityList([]));
    renderPage(owner);

    expect(
      await screen.findByRole("heading", { name: "No commodities yet" }),
    ).toBeVisible();
    expect(
      screen.getAllByRole("button", { name: "Add commodity" }),
    ).toHaveLength(2);
  });

  it("says nothing matches when a filter is on", async () => {
    vi.mocked(listCommodities).mockResolvedValue(commodityList([]));
    renderPage(owner, "?status=inactive");

    expect(
      await screen.findByRole("heading", { name: "No commodities match" }),
    ).toBeVisible();
  });

  it("shows an error with retry when the list fails", async () => {
    vi.mocked(listCommodities).mockRejectedValue(new Error("Network Error"));
    renderPage(owner);

    expect(await screen.findByText("Couldn’t load this list")).toBeVisible();
    vi.mocked(listCommodities).mockResolvedValue(commodityList([gandum]));
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Gandum")).toBeVisible();
  });

  it("shows 403 to an operator and asks the server for nothing", () => {
    renderPage(operator);

    expect(
      screen.getByRole("heading", { name: "You don’t have access" }),
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: "Add commodity" })).toBeNull();
    expect(listCommodities).not.toHaveBeenCalled();
  });

  it("shows 403 when the server refuses the list", async () => {
    vi.mocked(listCommodities).mockRejectedValue(httpError(undefined, 403));
    renderPage(manager);

    expect(
      await screen.findByRole("heading", { name: "You don’t have access" }),
    ).toBeVisible();
  });
});
