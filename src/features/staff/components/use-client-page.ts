import type { PaginationState } from "@tanstack/react-table";
import { useState } from "react";

/**
 * The staff endpoints return the whole (small) list, so the DataTable pages
 * through it in the browser.
 */
export function useClientPage<T>(rows: T[] | undefined, pageSize = 20) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });
  const total = rows?.length ?? 0;
  const lastPage = Math.max(0, Math.ceil(total / pagination.pageSize) - 1);
  const pageIndex = Math.min(pagination.pageIndex, lastPage);
  const start = pageIndex * pagination.pageSize;
  return {
    page: rows?.slice(start, start + pagination.pageSize),
    rowCount: total,
    pagination: { ...pagination, pageIndex },
    onPaginationChange: setPagination,
  };
}
