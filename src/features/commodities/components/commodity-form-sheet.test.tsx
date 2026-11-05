import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@/features/auth/types";
import { getSettings } from "@/features/settings/api";
import { shopSettings } from "@/features/settings/test-data";
import { useSessionStore } from "@/stores/session";
import { httpError, manager, owner } from "@/test/fake-api";
import { TestProviders } from "@/test/render-panel";
import { createCommodity, updateCommodity } from "../api";
import { commodity, kapas } from "../test-data";
import type { Commodity } from "../types";
import {
  CommodityFormSheet,
  type CommodityFormSheetProps,
} from "./commodity-form-sheet";

vi.mock("../api", () => ({
  createCommodity: vi.fn(),
  updateCommodity: vi.fn(),
}));
vi.mock("@/features/settings/api", () => ({ getSettings: vi.fn() }));

function setup(
  props: Partial<CommodityFormSheetProps> = {},
  user: User = owner,
) {
  useSessionStore.getState().setSession({ accessToken: "t", user });
  const onOpenChange = vi.fn();
  const onSaved = vi.fn();
  render(
    <TestProviders>
      <CommodityFormSheet
        open
        onOpenChange={onOpenChange}
        onSaved={onSaved}
        {...props}
      />
    </TestProviders>,
  );
  const sheet = screen.getByRole("dialog");
  return { sheet, onOpenChange, onSaved };
}

function type(sheet: HTMLElement, label: RegExp, value: string) {
  fireEvent.change(within(sheet).getByLabelText(label), {
    target: { value },
  });
}

const submit = (sheet: HTMLElement, name = "Add commodity") =>
  fireEvent.click(within(sheet).getByRole("button", { name }));

async function chooseUnit(sheet: HTMLElement, name: string) {
  fireEvent.keyDown(
    within(sheet).getByRole("combobox", { name: "Default unit" }),
    { key: "Enter" },
  );
  fireEvent.click(await screen.findByRole("option", { name }));
}

describe("CommodityFormSheet", () => {
  beforeEach(() => {
    vi.mocked(createCommodity).mockReset();
    vi.mocked(updateCommodity).mockReset();
    vi.mocked(getSettings).mockReset().mockResolvedValue(shopSettings());
    Element.prototype.hasPointerCapture ??= () => false;
    Element.prototype.releasePointerCapture ??= () => {};
  });

  afterEach(() => useSessionStore.getState().clear());

  it("has the sections, an RTL Urdu field and maund as the default unit", () => {
    const { sheet } = setup();

    expect(sheet).toHaveAccessibleName("Add commodity");
    for (const legend of ["Basic details", "Unit and bag", "Charges"]) {
      expect(within(sheet).getByRole("group", { name: legend })).toBeVisible();
    }
    const urdu = within(sheet).getByLabelText(/^Urdu name/);
    expect(urdu).toHaveAttribute("dir", "rtl");
    expect(urdu).toHaveAttribute("lang", "ur");
    expect(urdu).toHaveClass("font-urdu");
    expect(
      within(sheet).getByRole("combobox", { name: "Default unit" }),
    ).toHaveTextContent("Maund (mn)");
    // Only an edit can deactivate.
    expect(within(sheet).queryByLabelText(/^Active/)).toBeNull();
  });

  it("shows the shop default next to each charge", async () => {
    const { sheet } = setup();

    expect(
      await within(sheet).findByText(
        "Shop default: 2.50%. Leave empty to use it.",
      ),
    ).toBeVisible();
    expect(
      within(sheet).getByText("Shop default: 0.00%. Leave empty to use it."),
    ).toBeVisible();
    expect(
      within(sheet).getByText("Shop default: Rs 15.00. Leave empty to use it."),
    ).toBeVisible();
    const commission = within(sheet).getByLabelText(/^Commission/);
    expect(commission).toHaveAttribute("placeholder", "2.50");
    expect(commission).toHaveAccessibleDescription(
      "Shop default: 2.50%. Leave empty to use it.",
    );
  });

  it("asks a manager (no settings access) for nothing and says empty = default", () => {
    const { sheet } = setup({}, manager);

    expect(
      within(sheet).getAllByText("Leave empty to use the shop default."),
    ).toHaveLength(3);
    expect(getSettings).not.toHaveBeenCalled();
  });

  it("shows validation messages and sends nothing", async () => {
    const { sheet } = setup();
    type(sheet, /^Bag weight/, "0");
    type(sheet, /^Commission/, "100.5");
    type(sheet, /^Market fee/, "2.555");
    type(sheet, /^Labour per bag/, "15.555");

    submit(sheet);

    expect(
      await within(sheet).findByText("Enter the name (at least 2 characters)"),
    ).toBeVisible();
    expect(
      within(sheet).getByText("Bag weight must be more than 0"),
    ).toBeVisible();
    expect(
      within(sheet).getAllByText(
        "Enter a percentage from 0 to 100 (up to 2 decimals)",
      ),
    ).toHaveLength(2);
    expect(
      within(sheet).getByText("Enter an amount in rupees (up to 2 decimals)"),
    ).toBeVisible();
    expect(within(sheet).getByLabelText(/^Name/)).toHaveAttribute(
      "aria-invalid",
      "true",
    );

    type(sheet, /^Bag weight/, "100.1234");
    expect(
      await within(sheet).findByText(
        "Enter the bag weight in kg (up to 3 decimals)",
      ),
    ).toBeVisible();
    expect(createCommodity).not.toHaveBeenCalled();
  });

  it("adds Gandum / گندم with a 100 kg bag", async () => {
    const created = commodity();
    vi.mocked(createCommodity).mockResolvedValue(created);
    const { sheet, onSaved, onOpenChange } = setup();

    type(sheet, /^Name/, " Gandum ");
    type(sheet, /^Urdu name/, "گندم");
    type(sheet, /^Category/, "grain");
    await chooseUnit(sheet, "Bag (bori)");
    type(sheet, /^Bag weight/, "100");
    type(sheet, /^Commission/, "3");

    submit(sheet);

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(created));
    expect(createCommodity).toHaveBeenCalledWith({
      name: "Gandum",
      nameUr: "گندم",
      category: "grain",
      defaultUnit: "bag",
      bagWeightKg: "100",
      commissionPct: "3",
      marketFeePct: null,
      labourPerBag: null,
    });
    expect(await screen.findByText("Gandum added.")).toBeVisible();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("shows NAME_TAKEN under the name field", async () => {
    vi.mocked(createCommodity).mockRejectedValue(
      httpError(undefined, 409, {
        message: "Another commodity in this shop has this name",
        code: "NAME_TAKEN",
        errors: [
          {
            field: "name",
            message: "Another commodity in this shop has this name",
          },
        ],
      }),
    );
    const { sheet, onOpenChange } = setup();
    type(sheet, /^Name/, "Gandum");

    submit(sheet);

    const error = await within(sheet).findByText(
      "Another commodity in this shop has this name",
    );
    const name = within(sheet).getByLabelText(/^Name/);
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(name.getAttribute("aria-describedby")).toContain(error.id);
    expect(name).toHaveFocus();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("puts NAME_TAKEN under the name even without a field list", async () => {
    vi.mocked(createCommodity).mockRejectedValue(
      httpError(undefined, 409, { code: "NAME_TAKEN" }),
    );
    const { sheet } = setup();
    type(sheet, /^Name/, "Gandum");

    submit(sheet);

    expect(
      await within(sheet).findByText(
        "Another commodity in this shop has this name",
      ),
    ).toBeVisible();
  });

  it("shows a network error on top", async () => {
    vi.mocked(createCommodity).mockRejectedValue(new Error("Network Error"));
    const { sheet } = setup();
    type(sheet, /^Name/, "Gandum");

    submit(sheet);

    expect(await within(sheet).findByRole("alert")).toHaveTextContent(
      /Can’t reach the server/,
    );
  });

  it("edit clears an override back to the shop default (sends null)", async () => {
    vi.mocked(updateCommodity).mockResolvedValue({
      ...kapas,
      commissionPct: null,
      marketFeePct: "1.00",
    });
    const { sheet, onSaved } = setup({ commodity: kapas });

    expect(sheet).toHaveAccessibleName("Edit Kapas");
    const commission = within(sheet).getByRole("textbox", {
      name: /^Commission/,
    });
    expect(commission).toHaveValue("3.00");
    // Only a set override offers the button.
    expect(
      within(sheet).queryByRole("button", {
        name: "Market fee: use shop default",
      }),
    ).toBeNull();

    fireEvent.click(
      within(sheet).getByRole("button", {
        name: "Commission: use shop default",
      }),
    );
    expect(commission).toHaveValue("");
    await waitFor(() => expect(commission).toHaveFocus());
    type(sheet, /^Market fee/, "1");

    submit(sheet, "Save changes");

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(updateCommodity).toHaveBeenCalledWith(kapas.id, {
      commissionPct: null,
      marketFeePct: "1",
    });
    expect(await screen.findByText("Kapas saved.")).toBeVisible();
  });

  it("edit can activate an inactive commodity", async () => {
    vi.mocked(updateCommodity).mockResolvedValue({ ...kapas, isActive: true });
    const { sheet } = setup({ commodity: kapas });

    const active = within(sheet).getByLabelText(/^Active/);
    expect(active).not.toBeChecked();
    fireEvent.click(active);
    submit(sheet, "Save changes");

    await waitFor(() =>
      expect(updateCommodity).toHaveBeenCalledWith(kapas.id, {
        isActive: true,
      }),
    );
  });

  it("sends nothing when nothing changed", async () => {
    const { sheet, onOpenChange } = setup({ commodity: commodity() });

    type(sheet, /^Bag weight/, "50");
    type(sheet, /^Bag weight/, "100.000");
    submit(sheet, "Save changes");

    expect(await screen.findByText("Nothing changed.")).toBeVisible();
    expect(updateCommodity).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("sends only one request on a double submit", async () => {
    let resolve: (value: Commodity) => void = () => undefined;
    vi.mocked(createCommodity).mockReturnValue(
      new Promise((r) => (resolve = r)),
    );
    const { sheet, onSaved } = setup();
    type(sheet, /^Name/, "Gandum");

    const button = within(sheet).getByRole("button", { name: "Add commodity" });
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.submit(button.closest("form")!);

    await waitFor(() =>
      expect(
        within(sheet).getByRole("button", { name: "Saving…" }),
      ).toBeDisabled(),
    );
    await act(async () => resolve(commodity()));
    expect(createCommodity).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  });
});
