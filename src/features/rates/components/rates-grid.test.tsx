import { testTranslator } from "@/test/intl";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { httpError } from "@/test/fake-api";
import { TestProviders } from "@/test/render-panel";
import { saveRates } from "../api";
import {
  dayRates,
  gandum,
  kapas,
  makai,
  rate,
  TODAY,
  YESTERDAY,
} from "../test-data";
import type { Rate } from "../types";
import { RatesGrid, type RatesGridProps } from "./rates-grid";

const tr = testTranslator("rates");

vi.mock("../api", () => ({
  saveRates: vi.fn(),
  getTodayRates: vi.fn(),
  getDayRates: vi.fn(),
  listAllRates: vi.fn(),
}));

function renderGrid(props: Partial<RatesGridProps> = {}) {
  const onDirtyChange = vi.fn();
  render(
    <TestProviders>
      <RatesGrid
        date={TODAY}
        commodities={[gandum, kapas, makai]}
        rates={[]}
        yesterday={dayRates(YESTERDAY)}
        canManage
        onDirtyChange={onDirtyChange}
        {...props}
      />
    </TestProviders>,
  );
  return { onDirtyChange };
}

const cell = (column: "Min" | "Max" | "Avg", name: string) =>
  screen.getByLabelText(`${column} rate for ${name}`) as HTMLInputElement;

/** Types into the focused cell, then presses Enter there. */
function typeAndEnter(value: string, shiftKey = false) {
  const input = document.activeElement as HTMLInputElement;
  fireEvent.change(input, { target: { value } });
  fireEvent.keyDown(input, { key: "Enter", shiftKey });
}

describe("RatesGrid", () => {
  beforeEach(() => {
    vi.mocked(saveRates).mockReset();
  });
  afterEach(() => vi.restoreAllMocks());

  it("Tab order goes row by row: min, max, avg, then the next commodity", () => {
    renderGrid();
    const cells = Array.from(
      document.querySelectorAll<HTMLInputElement>("input[data-rate-cell]"),
    ).map((input) => input.getAttribute("aria-label"));
    expect(cells).toEqual([
      "Min rate for Gandum",
      "Max rate for Gandum",
      "Avg rate for Gandum",
      "Min rate for Kapas",
      "Max rate for Kapas",
      "Avg rate for Kapas",
      "Min rate for Makai",
      "Max rate for Makai",
      "Avg rate for Makai",
    ]);
    // Nothing takes the cells out of the natural Tab order.
    for (const input of document.querySelectorAll("input[data-rate-cell]")) {
      expect(input.getAttribute("tabindex")).toBeNull();
    }
  });

  it("keyboard only: Enter walks every cell, then Save; Enter saves the day", async () => {
    vi.mocked(saveRates).mockImplementation(async (date, input) =>
      dayRates(
        date,
        input.rates.map((r, i) =>
          rate({
            id: `id-${i}`,
            commodityId: r.commodityId,
            minRate: r.minRate,
            maxRate: r.maxRate,
            avgRate: r.avgRate ?? null,
            rateUnit: r.rateUnit ?? "maund",
          }),
        ),
      ),
    );
    const { onDirtyChange } = renderGrid();

    act(() => cell("Min", "Gandum").focus());
    typeAndEnter("4000");
    expect(document.activeElement).toBe(cell("Max", "Gandum"));
    typeAndEnter("4200");
    expect(document.activeElement).toBe(cell("Avg", "Gandum"));
    typeAndEnter("4100");
    expect(document.activeElement).toBe(cell("Min", "Kapas"));
    // Shift+Enter goes back a cell.
    typeAndEnter("", true);
    expect(document.activeElement).toBe(cell("Avg", "Gandum"));
    fireEvent.keyDown(document.activeElement!, { key: "Enter" });
    typeAndEnter("9000");
    typeAndEnter("9500");
    typeAndEnter("");
    // Makai is skipped: three Enters over its empty cells.
    typeAndEnter("");
    typeAndEnter("");
    typeAndEnter("");
    const save = screen.getByRole("button", { name: tr("grid.save") });
    expect(document.activeElement).toBe(save);
    expect(saveRates).not.toHaveBeenCalled();
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);

    fireEvent.click(save);

    await waitFor(() => expect(saveRates).toHaveBeenCalledTimes(1));
    expect(saveRates).toHaveBeenCalledWith(TODAY, {
      rates: [
        {
          commodityId: gandum.id,
          minRate: "4000",
          maxRate: "4200",
          avgRate: "4100",
          rateUnit: "maund",
        },
        {
          commodityId: kapas.id,
          minRate: "9000",
          maxRate: "9500",
          avgRate: null,
          rateUnit: "maund",
        },
      ],
    });
    expect(await screen.findByText(tr("grid.saved"))).toBeInTheDocument();
    await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(false));
  });

  it("Enter in a cell never submits the form", () => {
    renderGrid();
    act(() => cell("Avg", "Makai").focus());
    typeAndEnter("");
    expect(saveRates).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: tr("grid.save") }),
    );
  });

  it("validation: max below min, half-filled rows and bad numbers stop the save", async () => {
    renderGrid();
    fireEvent.change(cell("Min", "Gandum"), { target: { value: "4200" } });
    fireEvent.change(cell("Max", "Gandum"), { target: { value: "4000" } });
    fireEvent.change(cell("Min", "Kapas"), { target: { value: "100" } });
    fireEvent.change(cell("Avg", "Makai"), { target: { value: "12.345" } });

    fireEvent.click(screen.getByRole("button", { name: tr("grid.save") }));

    expect(
      await screen.findByText(tr("errors.maxBelowMin")),
    ).toBeInTheDocument();
    // Kapas has no max; Makai has neither min nor max.
    expect(screen.getAllByText(tr("errors.maxRequired"))).toHaveLength(2);
    expect(screen.getAllByText(tr("errors.minRequired"))).toHaveLength(1);
    expect(screen.getByText(tr("errors.money"))).toBeInTheDocument();
    expect(cell("Max", "Gandum")).toHaveAttribute("aria-invalid", "true");
    expect(cell("Max", "Gandum")).toHaveAccessibleDescription(
      tr("errors.maxBelowMin"),
    );
    expect(cell("Max", "Kapas")).toHaveAttribute("aria-invalid", "true");
    // Makai: the bad avg plus the missing min and max.
    expect(cell("Avg", "Makai")).toHaveAccessibleDescription(
      tr("errors.money"),
    );
    expect(saveRates).not.toHaveBeenCalled();
    // The first wrong cell gets the focus.
    await waitFor(() =>
      expect(document.activeElement).toBe(cell("Max", "Gandum")),
    );
  });

  it("a cell is checked when it's left, not while typing", async () => {
    renderGrid();
    fireEvent.change(cell("Min", "Gandum"), { target: { value: "4,000" } });
    expect(screen.queryByText(tr("errors.money"))).toBeNull();
    fireEvent.blur(cell("Min", "Gandum"));
    expect(await screen.findByText(tr("errors.money"))).toBeInTheDocument();
  });

  it("the server's field errors land on the matching cell", async () => {
    vi.mocked(saveRates).mockRejectedValue(
      httpError(undefined, 400, {
        message: "Validation failed",
        errors: [{ field: "rates.0.maxRate", message: "Server says no" }],
      }),
    );
    renderGrid();
    // Only Kapas is filled, so it is rates[0] on the wire.
    fireEvent.change(cell("Min", "Kapas"), { target: { value: "100" } });
    fireEvent.change(cell("Max", "Kapas"), { target: { value: "120" } });
    fireEvent.click(screen.getByRole("button", { name: tr("grid.save") }));

    expect(await screen.findByText("Server says no")).toBeInTheDocument();
    expect(cell("Max", "Kapas")).toHaveAccessibleDescription("Server says no");
  });

  it("a 403 on a past day shows why", async () => {
    vi.mocked(saveRates).mockRejectedValue(
      httpError(undefined, 403, { message: "Forbidden" }),
    );
    renderGrid({ date: "2026-11-01" });
    fireEvent.change(cell("Min", "Kapas"), { target: { value: "100" } });
    fireEvent.change(cell("Max", "Kapas"), { target: { value: "120" } });
    fireEvent.click(screen.getByRole("button", { name: tr("grid.save") }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      tr("errors.pastDay"),
    );
  });

  it("Copy yesterday fills the empty rows only and marks the form unsaved", async () => {
    const previous: Rate[] = [
      rate({ rateDate: YESTERDAY, avgRate: "4100.00" }),
      rate({ rateDate: YESTERDAY, commodityId: kapas.id, minRate: "1.00" }),
    ];
    renderGrid({
      rates: [
        rate({ commodityId: kapas.id, minRate: "9000.00", maxRate: "9500.00" }),
      ],
      yesterday: dayRates(YESTERDAY, previous),
    });
    expect(cell("Min", "Kapas").value).toBe("9000.00");

    fireEvent.click(
      screen.getByRole("button", { name: tr("grid.copyYesterday") }),
    );

    expect(cell("Min", "Gandum").value).toBe("4000.00");
    expect(cell("Max", "Gandum").value).toBe("4200.00");
    expect(cell("Avg", "Gandum").value).toBe("4100.00");
    // Kapas was saved today: not overwritten. Makai had nothing yesterday.
    expect(cell("Min", "Kapas").value).toBe("9000.00");
    expect(cell("Min", "Makai").value).toBe("");
    expect(
      await screen.findByText(tr("grid.copied", { count: 1 })),
    ).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "" })).toHaveTextContent(
      tr("grid.unsaved"),
    );
  });

  it("Copy yesterday is off when nothing was saved the day before", () => {
    renderGrid();
    expect(
      screen.getByRole("button", { name: tr("grid.copyYesterday") }),
    ).toBeDisabled();
  });

  it("without rate.manage the grid is read-only: no inputs, no Save, no copy", () => {
    renderGrid({
      canManage: false,
      rates: [rate({ avgRate: "4100.50" })],
    });
    expect(document.querySelectorAll("input")).toHaveLength(0);
    expect(screen.queryByRole("button", { name: tr("grid.save") })).toBeNull();
    expect(
      screen.queryByRole("button", { name: tr("grid.copyYesterday") }),
    ).toBeNull();
    expect(screen.getByLabelText("Min rate for Gandum")).toHaveTextContent(
      "Rs 4,000.00",
    );
    expect(screen.getByLabelText("Avg rate for Gandum")).toHaveTextContent(
      "Rs 4,100.50",
    );
    expect(screen.getByLabelText("Min rate for Kapas")).toHaveTextContent("—");
    expect(screen.getByText(tr("grid.readOnly"))).toBeInTheDocument();
  });
});
