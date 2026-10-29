import type { PaginationState, RowSelectionState } from "@tanstack/react-table";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { type DataTableColumn, dataTableColumnHelper } from "./columns";
import { DataTable, type DataTableProps } from "./data-table";
import { DataTableRowActions } from "./row-actions";

interface Fruit {
  id: string;
  name: string;
  count: number;
}

const col = dataTableColumnHelper<Fruit>();
const columns: DataTableColumn<Fruit>[] = col.columns([
  col.accessor("name", { header: "Name", meta: { label: "Name" } }),
  col.accessor("count", {
    header: "Count",
    enableSorting: false,
    meta: { align: "end", label: "Count" },
  }),
]);

const fruits: Fruit[] = [
  { id: "a", name: "Apple", count: 3 },
  { id: "b", name: "Banana", count: 5 },
];

function renderTable(props: Partial<DataTableProps<Fruit>> = {}) {
  const onPaginationChange = vi.fn();
  const onSortingChange = vi.fn();
  render(
    <DataTable<Fruit>
      caption="Fruits"
      columns={columns}
      data={fruits}
      getRowId={(row) => row.id}
      rowCount={45}
      pagination={{ pageIndex: 1, pageSize: 20 }}
      onPaginationChange={onPaginationChange}
      sorting={[{ id: "name", desc: false }]}
      onSortingChange={onSortingChange}
      isLoading={false}
      isError={false}
      {...props}
    />,
  );
  return { onPaginationChange, onSortingChange };
}

describe("DataTable", () => {
  it("renders the rows under accessible column headers", () => {
    renderTable();

    const table = screen.getByRole("table", { name: "Fruits" });
    expect(
      within(table).getByRole("columnheader", { name: /Name/ }),
    ).toHaveAttribute("aria-sort", "ascending");
    expect(
      within(table).getByRole("columnheader", { name: "Count" }),
    ).not.toHaveAttribute("aria-sort");
    const rows = within(table).getAllByRole("row");
    expect(rows).toHaveLength(3);
    expect(rows[1]).toHaveTextContent("Apple3");
    expect(rows[2]).toHaveTextContent("Banana5");
  });

  it("asks the server for the next sort order when a header is clicked", () => {
    const { onSortingChange } = renderTable();

    fireEvent.click(screen.getByRole("button", { name: /^Name/ }));

    expect(onSortingChange).toHaveBeenCalledWith([{ id: "name", desc: true }]);
  });

  it("only sortable columns get a sort button", () => {
    renderTable();

    expect(screen.queryByRole("button", { name: /^Count/ })).toBeNull();
  });

  it("pages through the server results", () => {
    const { onPaginationChange } = renderTable();

    expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
    expect(screen.getByText("Showing 21–22 of 45")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(onPaginationChange).toHaveBeenLastCalledWith({
      pageIndex: 2,
      pageSize: 20,
    });

    fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
    expect(onPaginationChange).toHaveBeenLastCalledWith({
      pageIndex: 0,
      pageSize: 20,
    });
  });

  it("disables Previous on the first page and Next on the last", () => {
    renderTable({ rowCount: 2, pagination: { pageIndex: 0, pageSize: 20 } });

    expect(
      screen.getByRole("button", { name: "Previous page" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });

  it("calls onRowClick for a row click but not for a link inside it", () => {
    const onRowClick = vi.fn();
    const linked = col.columns([
      col.accessor("name", {
        header: "Name",
        cell: ({ getValue }) => <a href="#x">{getValue()}</a>,
      }),
      col.accessor("count", { header: "Count" }),
    ]);
    renderTable({ columns: linked, onRowClick });

    fireEvent.click(screen.getByText("5"));
    expect(onRowClick).toHaveBeenCalledWith(fruits[1]);

    fireEvent.click(screen.getByRole("link", { name: "Apple" }));
    expect(onRowClick).toHaveBeenCalledTimes(1);
  });

  it("shows skeleton rows while loading", () => {
    renderTable({ isLoading: true, data: undefined });

    expect(screen.getByRole("table")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
    expect(
      screen.getAllByTestId("data-table-skeleton-row").length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText("Apple")).toBeNull();
    expect(screen.queryByRole("navigation", { name: "Pages" })).toBeNull();
  });

  it("shows the empty state when there are no rows", () => {
    renderTable({
      data: [],
      rowCount: 0,
      empty: <p>No fruit yet</p>,
    });

    expect(screen.getByText("No fruit yet")).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Pages" })).toBeNull();
  });

  it("shows an error with a retry button", () => {
    const onRetry = vi.fn();
    renderTable({ isError: true, data: undefined, onRetry });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Couldn’t load this list",
    );
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("announces the result count in a live region", () => {
    renderTable();

    const live = screen.getByText("45 results");
    expect(live).toHaveAttribute("aria-live", "polite");
  });

  it("hides the columns turned off in columnVisibility", () => {
    renderTable({ columnVisibility: { count: false } });

    expect(screen.queryByRole("columnheader", { name: "Count" })).toBeNull();
    expect(screen.getAllByRole("row")[1]).toHaveTextContent(/^Apple$/);
  });
});

function SelectableTable({
  bulkActions,
}: {
  bulkActions?: DataTableProps<Fruit>["bulkActions"];
}) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  return (
    <DataTable<Fruit>
      caption="Fruits"
      columns={columns}
      data={fruits}
      getRowId={(row) => row.id}
      getRowLabel={(row) => row.name}
      rowCount={2}
      pagination={{ pageIndex: 0, pageSize: 20 }}
      onPaginationChange={() => {}}
      isLoading={false}
      isError={false}
      rowSelection={rowSelection}
      onRowSelectionChange={setRowSelection}
      bulkActions={bulkActions}
    />
  );
}

describe("DataTable bulk select", () => {
  it("selects the whole page from the header checkbox", () => {
    const bulkActions = vi.fn((rows: Fruit[]) => (
      <button type="button">Delete {rows.length}</button>
    ));
    render(<SelectableTable bulkActions={bulkActions} />);

    expect(screen.queryByRole("region", { name: "Selected rows" })).toBeNull();
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Select all rows on this page" }),
    );

    const bar = screen.getByRole("region", { name: "Selected rows" });
    expect(bar).toHaveTextContent("2 selected");
    expect(
      within(bar).getByRole("button", { name: "Delete 2" }),
    ).toBeInTheDocument();
    expect(bulkActions).toHaveBeenLastCalledWith(fruits, ["a", "b"]);
    expect(
      screen.getByRole("checkbox", { name: "Select Apple" }),
    ).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Select Apple" }).closest("tr"),
    ).toHaveAttribute("data-state", "selected");

    fireEvent.click(
      within(bar).getByRole("button", { name: "Clear selection" }),
    );
    expect(screen.queryByRole("region", { name: "Selected rows" })).toBeNull();
    expect(
      screen.getByRole("checkbox", { name: "Select Banana" }),
    ).not.toBeChecked();
  });

  it("selects single rows and marks the header as partly selected", () => {
    render(<SelectableTable />);

    fireEvent.click(screen.getByRole("checkbox", { name: "Select Banana" }));

    expect(
      screen.getByRole("region", { name: "Selected rows" }),
    ).toHaveTextContent("1 selected");
    expect(
      screen.getByRole("checkbox", { name: "Select all rows on this page" }),
    ).toHaveAttribute("aria-checked", "mixed");

    fireEvent.click(screen.getByRole("checkbox", { name: "Select Banana" }));
    expect(screen.queryByRole("region", { name: "Selected rows" })).toBeNull();
  });

  it("a checkbox click doesn't open the row", () => {
    const onRowClick = vi.fn();
    render(
      <DataTable<Fruit>
        caption="Fruits"
        columns={columns}
        data={fruits}
        getRowId={(row) => row.id}
        getRowLabel={(row) => row.name}
        rowCount={2}
        pagination={{ pageIndex: 0, pageSize: 20 }}
        onPaginationChange={() => {}}
        isLoading={false}
        isError={false}
        rowSelection={{}}
        onRowSelectionChange={() => {}}
        onRowClick={onRowClick}
      />,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Select Apple" }));
    expect(onRowClick).not.toHaveBeenCalled();
  });
});

describe("DataTableRowActions", () => {
  it("opens a labelled menu per row without opening the row", async () => {
    const onEdit = vi.fn();
    const onRowClick = vi.fn();
    const withActions = col.columns([
      ...columns,
      col.display({
        id: "actions",
        cell: ({ row }) => (
          <DataTableRowActions rowName={row.original.name}>
            <DropdownMenuItem onSelect={() => onEdit(row.original)}>
              Edit
            </DropdownMenuItem>
          </DataTableRowActions>
        ),
      }),
    ]);
    renderTable({ columns: withActions, onRowClick });

    const trigger = screen.getByRole("button", { name: "Actions for Banana" });
    fireEvent.keyDown(trigger, { key: "Enter" });
    fireEvent.click(await screen.findByRole("menuitem", { name: "Edit" }));

    expect(onEdit).toHaveBeenCalledWith(fruits[1]);
    expect(onRowClick).not.toHaveBeenCalled();
  });
});

describe("DataTable with a large server-side list", () => {
  const TOTAL = 10_000;
  const PAGE_SIZE = 50;
  const all: Fruit[] = Array.from({ length: TOTAL }, (_, i) => ({
    id: `f${i + 1}`,
    name: `Fruit ${i + 1}`,
    count: i + 1,
  }));

  /** Stands in for the server: only the requested page is sent. */
  function ServerPaged({ initialPage = 0 }: { initialPage?: number }) {
    const [pagination, setPagination] = useState<PaginationState>({
      pageIndex: initialPage,
      pageSize: PAGE_SIZE,
    });
    const start = pagination.pageIndex * pagination.pageSize;
    return (
      <DataTable<Fruit>
        caption="Fruits"
        columns={columns}
        data={all.slice(start, start + pagination.pageSize)}
        getRowId={(row) => row.id}
        rowCount={TOTAL}
        pagination={pagination}
        onPaginationChange={setPagination}
        isLoading={false}
        isError={false}
      />
    );
  }

  it("renders only one page of rows", () => {
    render(<ServerPaged />);

    const body = screen.getAllByRole("rowgroup")[1];
    expect(within(body).getAllByRole("row")).toHaveLength(PAGE_SIZE);
    expect(screen.getByText("Page 1 of 200")).toBeInTheDocument();
    expect(screen.getByText("Showing 1–50 of 10000")).toBeInTheDocument();
  });

  it("pages to the last page (200)", () => {
    render(<ServerPaged initialPage={198} />);

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));

    expect(screen.getByText("Page 200 of 200")).toBeInTheDocument();
    expect(screen.getByText("Showing 9951–10000 of 10000")).toBeInTheDocument();
    const body = screen.getAllByRole("rowgroup")[1];
    expect(within(body).getAllByRole("row")).toHaveLength(PAGE_SIZE);
    expect(within(body).getAllByRole("row").at(-1)).toHaveTextContent(
      "Fruit 10000",
    );
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });
});
