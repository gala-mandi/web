import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { type DataTableColumn, dataTableColumnHelper } from "./columns";
import { DataTable, type DataTableProps } from "./data-table";

interface Fruit {
  id: string;
  name: string;
  count: number;
}

const col = dataTableColumnHelper<Fruit>();
const columns: DataTableColumn<Fruit>[] = col.columns([
  col.accessor("name", { header: "Name" }),
  col.accessor("count", {
    header: "Count",
    enableSorting: false,
    meta: { align: "end" },
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
});
