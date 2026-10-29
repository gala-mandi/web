import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSessionStore } from "@/stores/session";
import { type DataTableColumn, dataTableColumnHelper } from "./columns";
import { DataTable } from "./data-table";
import { DataTableExport, DataTableViewOptions } from "./data-table-toolbar";
import { exportFileName, exportToExcel } from "./export";
import {
  columnVisibilityKey,
  useColumnVisibility,
} from "./use-column-visibility";

const xlsx = vi.hoisted(() => ({
  utils: {
    aoa_to_sheet: vi.fn((rows: unknown[][]) => ({ rows })),
    book_new: vi.fn(() => ({ sheets: [] as unknown[] })),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));
vi.mock("xlsx", () => xlsx);

interface Fruit {
  id: string;
  name: string;
  count: number;
  origin: { city: string };
  addedAt: string;
}

const col = dataTableColumnHelper<Fruit>();
const columns: DataTableColumn<Fruit>[] = col.columns([
  col.display({ id: "select", cell: () => "x" }),
  col.accessor("name", { header: "Name", meta: { label: "Name" } }),
  col.accessor("count", { header: "Count", meta: { label: "Count" } }),
  col.accessor("origin.city", { header: "City", meta: { label: "City" } }),
  col.accessor((row) => row.addedAt.slice(0, 10), {
    id: "added",
    header: "Added",
    meta: {
      label: "Added",
      exportValue: (row: Fruit) => `on ${row.addedAt.slice(0, 10)}`,
    },
  }),
  col.display({ id: "actions", cell: () => "…" }),
]);

const fruits: Fruit[] = [
  {
    id: "a",
    name: "Apple",
    count: 3,
    origin: { city: "Okara" },
    addedAt: "2026-10-01T05:00:00Z",
  },
  {
    id: "b",
    name: "Banana",
    count: 5,
    origin: { city: "Sahiwal" },
    addedAt: "2026-10-02T05:00:00Z",
  },
];

function signIn(id: string) {
  useSessionStore.setState({ user: { id } as never });
}

function VisibilityHarness({ tableId = "fruits" }: { tableId?: string }) {
  const { columnVisibility, onColumnVisibilityChange } =
    useColumnVisibility(tableId);
  return (
    <>
      <DataTableViewOptions
        columns={columns}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={onColumnVisibilityChange}
      />
      <DataTable<Fruit>
        caption="Fruits"
        columns={columns}
        data={fruits}
        getRowId={(row) => row.id}
        rowCount={2}
        pagination={{ pageIndex: 0, pageSize: 20 }}
        onPaginationChange={() => {}}
        isLoading={false}
        isError={false}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={onColumnVisibilityChange}
      />
    </>
  );
}

async function openColumnsMenu() {
  fireEvent.keyDown(screen.getByRole("button", { name: "Columns" }), {
    key: "Enter",
  });
  return screen.findByRole("menu");
}

describe("column visibility", () => {
  beforeEach(() => {
    localStorage.clear();
    signIn("u1");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    useSessionStore.getState().clear();
  });

  it("lists only labelled columns and hides the one turned off", async () => {
    render(<VisibilityHarness />);

    const menu = await openColumnsMenu();
    const items = within(menu).getAllByRole("menuitemcheckbox");
    expect(items.map((item) => item.textContent)).toEqual([
      "Name",
      "Count",
      "City",
      "Added",
    ]);
    fireEvent.click(
      within(menu).getByRole("menuitemcheckbox", { name: "Count" }),
    );

    await waitFor(() =>
      expect(screen.queryByRole("columnheader", { name: "Count" })).toBeNull(),
    );
    expect(
      within(menu).getByRole("menuitemcheckbox", { name: "Count" }),
    ).toHaveAttribute("aria-checked", "false");
  });

  it("remembers the choice per user and table in localStorage", async () => {
    const { unmount } = render(<VisibilityHarness />);
    const menu = await openColumnsMenu();
    fireEvent.click(
      within(menu).getByRole("menuitemcheckbox", { name: "City" }),
    );

    expect(
      JSON.parse(localStorage.getItem(columnVisibilityKey("u1", "fruits"))!),
    ).toEqual({ origin_city: false });
    expect(localStorage.getItem("galla:dt-cols:u1:fruits")).not.toBeNull();
    unmount();

    // Same user, after a reload: still hidden.
    render(<VisibilityHarness />);
    expect(screen.queryByRole("columnheader", { name: "City" })).toBeNull();

    // Another user on this browser sees every column.
    act(() => signIn("u2"));
    expect(
      screen.getByRole("columnheader", { name: "City" }),
    ).toBeInTheDocument();
  });

  it("ignores bad stored values", () => {
    localStorage.setItem(columnVisibilityKey("u1", "fruits"), "{not json");
    render(<VisibilityHarness />);

    expect(
      screen.getByRole("columnheader", { name: "City" }),
    ).toBeInTheDocument();
  });

  it("keeps working when localStorage throws", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    render(<VisibilityHarness tableId="throwing" />);

    const menu = await openColumnsMenu();
    fireEvent.click(
      within(menu).getByRole("menuitemcheckbox", { name: "Name" }),
    );

    await waitFor(() =>
      expect(screen.queryByRole("columnheader", { name: "Name" })).toBeNull(),
    );
  });

  it("doesn't let the last column be hidden", async () => {
    localStorage.setItem(
      columnVisibilityKey("u1", "fruits"),
      JSON.stringify({ name: false, count: false, origin_city: false }),
    );
    render(<VisibilityHarness />);

    const menu = await openColumnsMenu();
    expect(
      within(menu).getByRole("menuitemcheckbox", { name: "Added" }),
    ).toHaveAttribute("aria-disabled", "true");
  });
});

describe("Excel export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("names the file with today's date in Karachi", () => {
    // 20:00 UTC on 29 Oct is already 30 Oct in Karachi.
    expect(exportFileName("shops", new Date("2026-10-29T20:00:00Z"))).toBe(
      "shops-2026-10-30.xlsx",
    );
    expect(exportFileName("shops", new Date("2026-10-29T06:00:00Z"))).toBe(
      "shops-2026-10-29.xlsx",
    );
  });

  it("writes the visible labelled columns of the rows on screen", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-29T06:00:00Z"));

    await exportToExcel({
      fileName: "fruits",
      columns,
      rows: fruits,
      columnVisibility: { count: false },
    });

    expect(xlsx.utils.aoa_to_sheet).toHaveBeenCalledWith([
      ["Name", "City", "Added"],
      ["Apple", "Okara", "on 2026-10-01"],
      ["Banana", "Sahiwal", "on 2026-10-02"],
    ]);
    expect(xlsx.utils.book_append_sheet).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "fruits",
    );
    expect(xlsx.writeFile).toHaveBeenCalledWith(
      expect.anything(),
      "fruits-2026-10-29.xlsx",
      { compression: true },
    );
  });

  it("the Export button exports the current view", async () => {
    render(
      <DataTableExport
        fileName="fruits"
        columns={columns}
        rows={fruits}
        columnVisibility={{ origin_city: false, added: false }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Export to Excel" }));

    await waitFor(() => expect(xlsx.writeFile).toHaveBeenCalledOnce());
    expect(xlsx.utils.aoa_to_sheet).toHaveBeenCalledWith([
      ["Name", "Count"],
      ["Apple", 3],
      ["Banana", 5],
    ]);
    expect(
      screen.getByRole("button", { name: "Export to Excel" }),
    ).toBeEnabled();
  });

  it("the Export button is off when there are no rows", () => {
    render(<DataTableExport fileName="fruits" columns={columns} rows={[]} />);

    expect(
      screen.getByRole("button", { name: "Export to Excel" }),
    ).toBeDisabled();
  });
});
