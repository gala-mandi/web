import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { parseAsString, parseAsStringLiteral } from "nuqs";
import {
  NuqsTestingAdapter,
  type OnUrlUpdateFunction,
} from "nuqs/adapters/testing";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toListSearchParams } from "@/lib/list-query";
import { type DataTableColumn, dataTableColumnHelper } from "./columns";
import { DataTable } from "./data-table";
import { DataTableToolbar } from "./data-table-toolbar";
import {
  DataTableDateRangeFilter,
  DataTableSelectFilter,
  DataTableStatusFilter,
} from "./filters";
import { parseAsDay, useDataTableState } from "./use-data-table-state";

interface Fruit {
  id: string;
  name: string;
  count: number;
}

const col = dataTableColumnHelper<Fruit>();
const columns: DataTableColumn<Fruit>[] = col.columns([
  col.accessor("name", { header: "Name", meta: { label: "Name" } }),
  col.accessor("count", { header: "Count", meta: { label: "Count" } }),
]);
const fruits: Fruit[] = [
  { id: "a", name: "Apple", count: 3 },
  { id: "b", name: "Banana", count: 5 },
];

const statuses = ["fresh", "old"] as const;
const filters = {
  status: parseAsStringLiteral(statuses),
  kind: parseAsString,
  from: parseAsDay,
  to: parseAsDay,
};

/** What the hook returned on the last render (rendered as JSON). */
function current(): {
  listParams: ReturnType<typeof useHarnessState>["listParams"];
  isFiltered: boolean;
} {
  return JSON.parse(screen.getByTestId("state").textContent ?? "{}");
}

function useHarnessState() {
  return useDataTableState({
    filters,
    sortFields: ["name", "count"] as const,
    defaultSort: "name",
    pageSize: 20,
  });
}

function Harness() {
  const list = useHarnessState();
  return (
    <>
      <output data-testid="state">
        {JSON.stringify({
          listParams: list.listParams,
          isFiltered: list.isFiltered,
        })}
      </output>
      <DataTableToolbar
        search={{
          value: list.search,
          onChange: list.setSearch,
          label: "Search fruit",
        }}
        filters={
          <>
            <DataTableStatusFilter
              label="Status"
              value={list.filters.status}
              options={[
                { value: "fresh", label: "Fresh", dotClassName: "bg-success" },
                { value: "old", label: "Old", dotClassName: "bg-destructive" },
              ]}
              onChange={(value) => list.setFilter("status", value)}
            />
            <DataTableSelectFilter
              label="Kind"
              allLabel="All kinds"
              value={list.filters.kind}
              options={[
                { value: "citrus", label: "Citrus" },
                { value: "berry", label: "Berry" },
              ]}
              onChange={(value) => list.setFilter("kind", value)}
            />
            <DataTableDateRangeFilter
              label="Added"
              value={{ from: list.filters.from, to: list.filters.to }}
              onChange={(range) => list.setFilters(range)}
            />
          </>
        }
        isFiltered={list.isFiltered}
        onClearFilters={list.clearAll}
      />
      <DataTable<Fruit>
        caption="Fruits"
        columns={columns}
        data={fruits}
        getRowId={(row) => row.id}
        rowCount={100}
        pagination={list.pagination}
        onPaginationChange={list.onPaginationChange}
        sorting={list.sorting}
        onSortingChange={list.onSortingChange}
        isLoading={false}
        isError={false}
      />
    </>
  );
}

function renderHarness(searchParams = "") {
  const onUrlUpdate = vi.fn<OnUrlUpdateFunction>();
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <NuqsTestingAdapter
        searchParams={searchParams}
        onUrlUpdate={onUrlUpdate}
        hasMemory
      >
        {children}
      </NuqsTestingAdapter>
    );
  }
  render(<Harness />, { wrapper: Wrapper });
  return { onUrlUpdate };
}

const lastUrl = (spy: ReturnType<typeof vi.fn<OnUrlUpdateFunction>>) =>
  spy.mock.calls.at(-1)?.[0].queryString;

async function choose(combobox: string, option: string) {
  fireEvent.keyDown(screen.getByRole("combobox", { name: combobox }), {
    key: "Enter",
  });
  fireEvent.click(await screen.findByRole("option", { name: option }));
}

describe("useDataTableState", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView ??= () => {};
    Element.prototype.hasPointerCapture ??= () => false;
    Element.prototype.releasePointerCapture ??= () => {};
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reads page, sort, search and filters from the URL", () => {
    renderHarness(
      "?page=3&sort=-count&q=apple&status=fresh&from=2026-10-01&kind=berry",
    );

    expect(current().listParams).toEqual({
      page: 3,
      limit: 20,
      sort: "-count",
      q: "apple",
      status: "fresh",
      kind: "berry",
      from: "2026-10-01",
      to: null,
    });
    expect(toListSearchParams(current().listParams)).toEqual({
      page: 3,
      limit: 20,
      sort: "-count",
      search: "apple",
      status: "fresh",
      kind: "berry",
      from: "2026-10-01",
    });
    expect(current().isFiltered).toBe(true);
    expect(screen.getByLabelText("Search fruit")).toHaveValue("apple");
    expect(screen.getByRole("combobox", { name: "Status" })).toHaveTextContent(
      "Fresh",
    );
    expect(screen.getByRole("columnheader", { name: /Count/ })).toHaveAttribute(
      "aria-sort",
      "descending",
    );
    expect(screen.getByText("Page 3 of 5")).toBeInTheDocument();
  });

  it("ignores bad values and falls back to the defaults", () => {
    renderHarness(
      "?page=-4&sort=password&limit=5000&status=nope&from=2026-02-31",
    );

    expect(current().listParams).toMatchObject({
      page: 1,
      limit: 100,
      sort: "name",
      status: null,
      from: null,
    });
    expect(current().isFiltered).toBe(false);
  });

  it("sorting updates `sort` and goes back to page 1", async () => {
    const { onUrlUpdate } = renderHarness("?page=3");

    // Numbers sort high to low first.
    fireEvent.click(screen.getByRole("button", { name: /^Count/ }));
    await waitFor(() => expect(lastUrl(onUrlUpdate)).toBe("?sort=-count"));

    fireEvent.click(screen.getByRole("button", { name: /^Count/ }));
    await waitFor(() => expect(lastUrl(onUrlUpdate)).toBe("?sort=count"));

    // Back to the default sort: kept out of the URL.
    fireEvent.click(screen.getByRole("button", { name: /^Name/ }));
    await waitFor(() => expect(lastUrl(onUrlUpdate)).toBe(""));
    expect(current().listParams.sort).toBe("name");
  });

  it("paging updates `page`", async () => {
    const { onUrlUpdate } = renderHarness("?page=2&q=apple");

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    await waitFor(() => expect(lastUrl(onUrlUpdate)).toBe("?page=3&q=apple"));

    fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
    fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
    await waitFor(() => expect(lastUrl(onUrlUpdate)).toBe("?q=apple"));
  });

  it("search sends one update after typing stops", async () => {
    vi.useFakeTimers();
    const { onUrlUpdate } = renderHarness("?page=3");
    const input = screen.getByLabelText("Search fruit");

    for (const value of ["a", "ap", "app", "appl", "apple "]) {
      fireEvent.change(input, { target: { value } });
      await act(() => vi.advanceTimersByTimeAsync(100));
    }
    expect(onUrlUpdate).not.toHaveBeenCalled();
    expect(input).toHaveValue("apple ");

    await act(() => vi.advanceTimersByTimeAsync(400));
    expect(onUrlUpdate).toHaveBeenCalledOnce();
    expect(lastUrl(onUrlUpdate)).toBe("?q=apple");
    expect(input).toHaveValue("apple ");
    expect(current().listParams).toMatchObject({ page: 1, q: "apple" });
  });

  it("status and select filters update the URL and go back to page 1", async () => {
    const { onUrlUpdate } = renderHarness("?page=4");

    await choose("Status", "Old");
    await waitFor(() => expect(lastUrl(onUrlUpdate)).toBe("?status=old"));

    await choose("Kind", "Citrus");
    await waitFor(() =>
      expect(lastUrl(onUrlUpdate)).toBe("?status=old&kind=citrus"),
    );

    await choose("Status", "All");
    await waitFor(() => expect(lastUrl(onUrlUpdate)).toBe("?kind=citrus"));
  });

  it("date range filter keeps YYYY-MM-DD days in the URL", async () => {
    const { onUrlUpdate } = renderHarness("?page=2");

    const trigger = screen.getByRole("button", { name: /Added/ });
    expect(trigger).toHaveTextContent("Any date");
    fireEvent.click(trigger);

    const from = await screen.findByLabelText("From");
    const to = screen.getByLabelText("To");
    fireEvent.change(from, { target: { value: "2026-10-15" } });
    fireEvent.change(to, { target: { value: "2026-10-01" } });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "start date must be on or before",
    );
    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();

    fireEvent.change(from, { target: { value: "2026-10-01" } });
    fireEvent.change(to, { target: { value: "2026-10-15" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    await waitFor(() =>
      expect(lastUrl(onUrlUpdate)).toBe("?from=2026-10-01&to=2026-10-15"),
    );
    expect(screen.getByRole("button", { name: /Added/ })).toHaveTextContent(
      "1 Oct 2026 – 15 Oct 2026",
    );

    fireEvent.click(screen.getByRole("button", { name: /Added/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Clear" }));
    await waitFor(() => expect(lastUrl(onUrlUpdate)).toBe(""));
  });

  it("Clear filters removes search and filters but keeps the sort", async () => {
    const { onUrlUpdate } = renderHarness(
      "?q=apple&status=fresh&sort=-count&page=2&from=2026-10-01",
    );

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));

    await waitFor(() => expect(lastUrl(onUrlUpdate)).toBe("?sort=-count"));
    expect(screen.getByLabelText("Search fruit")).toHaveValue("");
    expect(screen.queryByRole("button", { name: "Clear filters" })).toBeNull();
  });
});
