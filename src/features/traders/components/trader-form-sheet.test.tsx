import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { httpError } from "@/test/fake-api";
import { TestProviders } from "@/test/render-panel";
import { createTrader, updateTrader } from "../api";
import { trader, traderDetail } from "../test-data";
import type { Trader } from "../types";
import {
  TraderFormSheet,
  type TraderFormSheetProps,
} from "./trader-form-sheet";

vi.mock("../api", () => ({ createTrader: vi.fn(), updateTrader: vi.fn() }));

function setup(props: Partial<TraderFormSheetProps> = {}) {
  const onOpenChange = vi.fn();
  const onSaved = vi.fn();
  render(
    <TestProviders>
      <TraderFormSheet
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

const submit = (sheet: HTMLElement, name = "Add trader") =>
  fireEvent.click(within(sheet).getByRole("button", { name }));

describe("TraderFormSheet", () => {
  beforeEach(() => {
    vi.mocked(createTrader).mockReset();
    vi.mocked(updateTrader).mockReset();
  });

  it("has the sections and starts on the given type and name", () => {
    const { sheet } = setup({ prefill: { name: "Bashir", type: "beopari" } });

    expect(sheet).toHaveAccessibleName("Add trader");
    for (const legend of [
      "Basic details",
      "Address",
      "Opening balance and limit",
      "Notes",
    ]) {
      expect(within(sheet).getByRole("group", { name: legend })).toBeVisible();
    }
    expect(within(sheet).getByLabelText(/^Name/)).toHaveValue("Bashir");
    expect(within(sheet).getByRole("radio", { name: /Beopari/ })).toBeChecked();
    expect(within(sheet).getByRole("radio", { name: /^Debit/ })).toBeChecked();
    // Only an edit can deactivate.
    expect(within(sheet).queryByLabelText(/^Active/)).toBeNull();
  });

  it("shows validation messages and sends nothing", async () => {
    const { sheet } = setup();
    type(sheet, /^Phone/, "12345");
    type(sheet, /^CNIC/, "35202-12");
    type(sheet, /^Opening balance/, "100.555");

    submit(sheet);

    expect(
      await within(sheet).findByText("Enter the name (at least 2 characters)"),
    ).toBeVisible();
    expect(within(sheet).getByText("Enter a valid phone number")).toBeVisible();
    expect(
      within(sheet).getByText("Enter the CNIC as 12345-1234567-1"),
    ).toBeVisible();
    expect(
      within(sheet).getByText("Enter an amount in rupees (up to 2 decimals)"),
    ).toBeVisible();
    expect(within(sheet).getByLabelText(/^Phone/)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(createTrader).not.toHaveBeenCalled();
  });

  it("creates a trader with the right body, then toasts and hands it back", async () => {
    const created = trader({ name: "Bashir Ahmed", type: "beopari" });
    vi.mocked(createTrader).mockResolvedValue(created);
    const { sheet, onSaved, onOpenChange } = setup();

    fireEvent.click(within(sheet).getByRole("radio", { name: /Beopari/ }));
    type(sheet, /^Name/, "  Bashir Ahmed ");
    type(sheet, /^Father’s name/, "Ahmed Din");
    type(sheet, /^Phone/, "0300 1234567");
    type(sheet, /^CNIC/, "3520212345671");
    type(sheet, /^Village/, "Chak 12");
    type(sheet, /^Opening balance/, "2500.5");
    fireEvent.click(within(sheet).getByRole("radio", { name: /^Credit/ }));
    type(sheet, /^Credit limit/, "100000");
    type(sheet, /^Notes/, "Pays on Fridays");

    submit(sheet);

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(created));
    expect(createTrader).toHaveBeenCalledWith({
      type: "beopari",
      name: "Bashir Ahmed",
      fatherName: "Ahmed Din",
      phone: "0300 1234567",
      cnic: "3520212345671",
      village: "Chak 12",
      address: null,
      openingBalance: "2500.5",
      openingBalanceType: "credit",
      creditLimit: "100000",
      notes: "Pays on Fridays",
    });
    expect(await screen.findByText("Bashir Ahmed added.")).toBeVisible();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("shows PHONE_TAKEN under the phone field", async () => {
    vi.mocked(createTrader).mockRejectedValue(
      httpError(undefined, 409, {
        message: "Phone already used",
        code: "PHONE_TAKEN",
        errors: [
          {
            field: "phone",
            message: "Another trader in this shop has this phone number",
          },
        ],
      }),
    );
    const { sheet, onOpenChange } = setup();
    type(sheet, /^Name/, "Aslam");
    type(sheet, /^Phone/, "03001234567");

    submit(sheet);

    const error = await within(sheet).findByText(
      "Another trader in this shop has this phone number",
    );
    const phone = within(sheet).getByLabelText(/^Phone/);
    expect(phone).toHaveAttribute("aria-invalid", "true");
    expect(phone.getAttribute("aria-describedby")).toContain(error.id);
    expect(phone).toHaveFocus();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("puts PHONE_TAKEN under the phone even without a field list", async () => {
    vi.mocked(createTrader).mockRejectedValue(
      httpError(undefined, 409, { code: "PHONE_TAKEN" }),
    );
    const { sheet } = setup();
    type(sheet, /^Name/, "Aslam");
    type(sheet, /^Phone/, "03001234567");

    submit(sheet);

    expect(
      await within(sheet).findByText(
        "Another trader in this shop has this phone number",
      ),
    ).toBeVisible();
  });

  it("shows other server errors under their field or on top", async () => {
    vi.mocked(createTrader)
      .mockRejectedValueOnce(
        httpError(undefined, 400, {
          errors: [
            { field: "cnic", message: "Enter the CNIC as 12345-1234567-1" },
          ],
        }),
      )
      .mockRejectedValueOnce(new Error("Network Error"));
    const { sheet } = setup();
    type(sheet, /^Name/, "Aslam");
    type(sheet, /^CNIC/, "35202-1234567-1");

    submit(sheet);
    expect(
      await within(sheet).findByText("Enter the CNIC as 12345-1234567-1"),
    ).toBeVisible();

    submit(sheet);
    expect(
      await within(sheet).findByText(/Can’t reach the server/),
    ).toBeVisible();
  });

  it("edit sends only the changed fields", async () => {
    const aslam = trader();
    vi.mocked(updateTrader).mockResolvedValue(
      traderDetail({ village: "Chak 46", isActive: false }),
    );
    const { sheet, onSaved } = setup({ trader: aslam });

    expect(sheet).toHaveAccessibleName("Edit Muhammad Aslam");
    expect(within(sheet).getByLabelText(/^Opening balance/)).toHaveValue(
      "50000.00",
    );
    type(sheet, /^Village/, "Chak 46");
    type(sheet, /^Phone/, "");
    fireEvent.click(within(sheet).getByLabelText(/^Active/));

    submit(sheet, "Save changes");

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(updateTrader).toHaveBeenCalledWith(aslam.id, {
      phone: null,
      village: "Chak 46",
      isActive: false,
    });
    expect(await screen.findByText("Muhammad Aslam saved.")).toBeVisible();
  });

  it("sends nothing when nothing changed", async () => {
    const { sheet, onOpenChange } = setup({ trader: trader() });

    type(sheet, /^Village/, "Chak 46");
    type(sheet, /^Village/, "Chak 45");
    submit(sheet, "Save changes");

    expect(await screen.findByText("Nothing changed.")).toBeVisible();
    expect(updateTrader).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("sends only one request on a double submit", async () => {
    let resolve: (value: Trader) => void = () => undefined;
    vi.mocked(createTrader).mockReturnValue(new Promise((r) => (resolve = r)));
    const { sheet, onSaved } = setup();
    type(sheet, /^Name/, "Aslam");

    const button = within(sheet).getByRole("button", { name: "Add trader" });
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.submit(button.closest("form")!);

    await waitFor(() =>
      expect(
        within(sheet).getByRole("button", { name: "Saving…" }),
      ).toBeDisabled(),
    );
    await act(async () => resolve(trader({ name: "Aslam" })));
    expect(createTrader).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  });
});
