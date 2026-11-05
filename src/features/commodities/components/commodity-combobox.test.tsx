import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSettings } from "@/features/settings/api";
import { shopSettings } from "@/features/settings/test-data";
import { useSessionStore } from "@/stores/session";
import { owner } from "@/test/fake-api";
import { TestProviders } from "@/test/render-panel";
import { createCommodity, lookupCommodities, updateCommodity } from "../api";
import { commodity, kapas, lookupItem } from "../test-data";
import type { Commodity, CommodityLookupItem } from "../types";
import { CommodityCombobox } from "./commodity-combobox";
import { CommodityStatusDialog } from "./commodity-dialogs";
import { CommodityFormSheet } from "./commodity-form-sheet";

vi.mock("../api", () => ({
  lookupCommodities: vi.fn(),
  createCommodity: vi.fn(),
  updateCommodity: vi.fn(),
}));
vi.mock("@/features/settings/api", () => ({ getSettings: vi.fn() }));

const gandum = lookupItem();
const chana = lookupItem(
  commodity({
    id: "33333333-3333-4333-8333-333333333333",
    name: "Chana",
    nameUr: "چنا",
    defaultUnit: "maund",
    bagWeightKg: null,
    marketFeePct: "1.00",
  }),
);

const onChange = vi.fn();

function Harness() {
  const [value, setValue] = useState<CommodityLookupItem | null>(null);
  return (
    <>
      <label htmlFor="commodity">Commodity</label>
      <CommodityCombobox
        id="commodity"
        value={value}
        onChange={(next) => {
          onChange(next);
          setValue(next);
        }}
      />
    </>
  );
}

function setup() {
  useSessionStore.getState().setSession({ accessToken: "t", user: owner });
  render(
    <TestProviders>
      <Harness />
    </TestProviders>,
  );
  const trigger = screen.getByRole("combobox", { name: "Commodity" });
  fireEvent.click(trigger);
  return {
    trigger,
    input: () => screen.getByRole("combobox", { name: "Search commodities" }),
  };
}

const queries = () => vi.mocked(lookupCommodities).mock.calls.map(([q]) => q);

describe("CommodityCombobox", () => {
  beforeEach(() => {
    onChange.mockReset();
    vi.mocked(lookupCommodities)
      .mockReset()
      .mockImplementation(async ({ q }) =>
        [chana, gandum].filter(
          (c) =>
            c.name.toLowerCase().includes(q.toLowerCase()) ||
            c.nameUr?.includes(q),
        ),
      );
  });

  afterEach(() => useSessionStore.getState().clear());

  it("shows active commodities with the Urdu name, unit and bag weight", async () => {
    setup();

    const list = await screen.findByRole("listbox");
    const option = await within(list).findByRole("option", {
      name: /Gandum/,
    });
    expect(option).toHaveTextContent("Bag · 100 kg bag");
    expect(
      within(list).getByRole("option", { name: /Chana/ }),
    ).toHaveTextContent("Maund");
    const urdu = within(option).getByText("گندم");
    expect(urdu.tagName).toBe("BDI");
    expect(urdu).toHaveAttribute("dir", "auto");
    expect(urdu).toHaveAttribute("lang", "ur");
    expect(urdu).toHaveClass("font-urdu");
    expect(queries()).toEqual([{ q: "", limit: 10 }]);
  });

  it("asks the server once after typing stops", async () => {
    const { input } = setup();
    await screen.findByRole("option", { name: /Gandum/ });

    for (const value of ["c", "ch", "cha"]) {
      fireEvent.change(input(), { target: { value } });
    }

    await waitFor(() => expect(lookupCommodities).toHaveBeenCalledTimes(2));
    expect(queries()).toEqual([
      { q: "", limit: 10 },
      { q: "cha", limit: 10 },
    ]);
    await waitFor(() =>
      expect(screen.queryByRole("option", { name: /Gandum/ })).toBeNull(),
    );
    expect(screen.getByRole("option", { name: /Chana/ })).toBeVisible();
    // Nothing more after the pause.
    await new Promise((r) => setTimeout(r, 400));
    expect(lookupCommodities).toHaveBeenCalledTimes(2);
  });

  it("searches by the Urdu name", async () => {
    const { input } = setup();
    await screen.findByRole("option", { name: /Gandum/ });

    fireEvent.change(input(), { target: { value: "گندم" } });

    await waitFor(() =>
      expect(screen.queryByRole("option", { name: /Chana/ })).toBeNull(),
    );
    expect(queries().at(-1)).toEqual({ q: "گندم", limit: 10 });
  });

  it("picks a commodity with the keyboard and hands back its charges", async () => {
    const { trigger, input } = setup();
    await screen.findByRole("option", { name: /Gandum/ });

    fireEvent.keyDown(input(), { key: "ArrowDown" });
    fireEvent.keyDown(input(), { key: "Enter" });

    expect(onChange).toHaveBeenCalledWith(gandum);
    expect(onChange.mock.calls[0][0].charges).toEqual({
      commissionPct: "2.50",
      marketFeePct: "0.00",
      labourPerBag: "15.00",
    });
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
    expect(trigger).toHaveTextContent("Gandumگندم");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("says when nothing matches", async () => {
    const { input } = setup();
    await screen.findByRole("option", { name: /Gandum/ });

    fireEvent.change(input(), { target: { value: "zzz" } });

    expect(
      await screen.findByText("No active commodity matches “zzz”."),
    ).toBeVisible();
  });

  it("shows an error with retry", async () => {
    // One automatic retry, then the error shows.
    vi.mocked(lookupCommodities)
      .mockRejectedValueOnce(new Error("Network Error"))
      .mockRejectedValueOnce(new Error("Network Error"));
    setup();

    expect(await screen.findByText("Couldn’t load commodities.")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("option", { name: /Gandum/ })).toBeVisible();
  });
});

/**
 * "Add Gandum / گندم with 100 kg bag → available in rates and purchase
 * forms": those forms don't exist yet, so the picker they will use stands in
 * for them, on a fake API that keeps its commodities across requests.
 */
describe("commodity added in the sheet → picked in a form", () => {
  let store: Commodity[];

  function Page() {
    const [adding, setAdding] = useState(false);
    const [deactivate, setDeactivate] = useState<Commodity | null>(null);
    const [value, setValue] = useState<CommodityLookupItem | null>(null);
    return (
      <>
        <button type="button" onClick={() => setAdding(true)}>
          Open add
        </button>
        <button
          type="button"
          onClick={() => setDeactivate(store.find((c) => c.name === "Gandum")!)}
        >
          Open deactivate
        </button>
        <CommodityFormSheet open={adding} onOpenChange={setAdding} />
        {deactivate ? (
          <CommodityStatusDialog
            commodity={deactivate}
            action="deactivate"
            onClose={() => setDeactivate(null)}
          />
        ) : null}
        <label htmlFor="purchase-commodity">Commodity</label>
        <CommodityCombobox
          id="purchase-commodity"
          value={value}
          onChange={(next) => {
            onChange(next);
            setValue(next);
          }}
        />
      </>
    );
  }

  beforeEach(() => {
    store = [{ ...kapas, isActive: true }];
    onChange.mockReset();
    vi.mocked(getSettings).mockReset().mockResolvedValue(shopSettings());
    vi.mocked(lookupCommodities)
      .mockReset()
      .mockImplementation(async ({ q }) =>
        store
          .filter((c) => c.isActive && c.name.toLowerCase().includes(q))
          .map((c) => lookupItem(c)),
      );
    vi.mocked(createCommodity)
      .mockReset()
      .mockImplementation(async (input) => {
        const created = commodity({
          ...input,
          id: "44444444-4444-4444-8444-444444444444",
          bagWeightKg: "100.000",
        } as Partial<Commodity>);
        store.push(created);
        return created;
      });
    vi.mocked(updateCommodity)
      .mockReset()
      .mockImplementation(async (id, input) => {
        const index = store.findIndex((c) => c.id === id);
        store[index] = { ...store[index], ...input } as Commodity;
        return store[index];
      });
    Element.prototype.hasPointerCapture ??= () => false;
    Element.prototype.releasePointerCapture ??= () => {};
  });

  afterEach(() => useSessionStore.getState().clear());

  it("adds Gandum / گندم with a 100 kg bag, picks it, and hides it once deactivated", async () => {
    useSessionStore.getState().setSession({ accessToken: "t", user: owner });
    render(
      <TestProviders>
        <Page />
      </TestProviders>,
    );
    const picker = screen.getByRole("combobox", { name: "Commodity" });

    // Before: only Kapas.
    fireEvent.click(picker);
    await screen.findByRole("option", { name: /Kapas/ });
    expect(screen.queryByRole("option", { name: /Gandum/ })).toBeNull();
    fireEvent.keyDown(
      screen.getByRole("combobox", { name: "Search commodities" }),
      { key: "Escape" },
    );
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());

    // Add in the sheet.
    fireEvent.click(screen.getByRole("button", { name: "Open add" }));
    const sheet = await screen.findByRole("dialog", { name: "Add commodity" });
    fireEvent.change(within(sheet).getByLabelText(/^Name/), {
      target: { value: "Gandum" },
    });
    fireEvent.change(within(sheet).getByLabelText(/^Urdu name/), {
      target: { value: "گندم" },
    });
    fireEvent.keyDown(
      within(sheet).getByRole("combobox", { name: "Default unit" }),
      { key: "Enter" },
    );
    fireEvent.click(await screen.findByRole("option", { name: "Bag (bori)" }));
    fireEvent.change(within(sheet).getByLabelText(/^Bag weight/), {
      target: { value: "100" },
    });
    fireEvent.click(
      within(sheet).getByRole("button", { name: "Add commodity" }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    // Pick it in the form.
    fireEvent.click(picker);
    const option = await screen.findByRole("option", { name: /Gandum/ });
    expect(option).toHaveTextContent("گندم");
    expect(option).toHaveTextContent("Bag · 100 kg bag");
    fireEvent.click(option);
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        name: "Gandum",
        nameUr: "گندم",
        defaultUnit: "bag",
        bagWeightKg: "100.000",
        charges: {
          commissionPct: "2.50",
          marketFeePct: "0.00",
          labourPerBag: "15.00",
        },
      }),
    );
    await waitFor(() => expect(picker).toHaveTextContent("Gandum"));

    // Deactivated: gone from the picker.
    fireEvent.click(screen.getByRole("button", { name: "Open deactivate" }));
    const dialog = await screen.findByRole("alertdialog", {
      name: "Deactivate Gandum?",
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Deactivate" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());

    fireEvent.click(picker);
    await screen.findByRole("option", { name: /Kapas/ });
    await waitFor(() =>
      expect(screen.queryByRole("option", { name: /Gandum/ })).toBeNull(),
    );
  });
});
