import { useEffect, useMemo, useState, type ReactNode } from "react";
import { cn } from "../../../shared/lib/utils";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  headerClassName?: string;
  cellClassName?: string;
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  rowClassName?: (row: T, index: number) => string | undefined;
  containerClassName?: string;
  tableClassName?: string;
  emptyClassName?: string;
  pageSize?: number;
  pageSizeOptions?: number[];
}

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  onRowClick,
  emptyMessage = "No data available.",
  rowClassName,
  containerClassName,
  tableClassName,
  emptyClassName,
  pageSize = 10,
  pageSizeOptions = [10, 25, 50]
}: DataTableProps<T>) {
  const initialPageSize = Math.max(1, pageSize);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageSize, setCurrentPageSize] = useState(initialPageSize);

  const totalPages = Math.max(1, Math.ceil(rows.length / currentPageSize));

  useEffect(() => {
    setCurrentPage(1);
  }, [currentPageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * currentPageSize;
    return rows.slice(start, start + currentPageSize);
  }, [rows, currentPage, currentPageSize]);

  const pageStart = rows.length === 0 ? 0 : (currentPage - 1) * currentPageSize + 1;
  const pageEnd = Math.min(currentPage * currentPageSize, rows.length);
  const showPagination = rows.length > 0;

  const safePageSizeOptions = useMemo(
    () =>
      Array.from(new Set([initialPageSize, ...pageSizeOptions.filter((value) => value > 0)])).sort(
        (left, right) => left - right
      ),
    [initialPageSize, pageSizeOptions]
  );

  return (
    <>
      <div className={cn("overflow-x-auto", containerClassName)}>
        <table className={cn("min-w-full border-separate border-spacing-0 text-sm", tableClassName)}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    "border-b border-slate-200 px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500",
                    column.headerClassName
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((row, index) => {
              const globalIndex = (currentPage - 1) * currentPageSize + index;
              return (
                <tr
                  key={getRowKey(row)}
                  className={cn(
                    globalIndex % 2 === 0 ? "bg-white" : "bg-slate-50/50",
                    rowClassName?.(row, globalIndex)
                  )}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((column) => (
                    <td
                      key={`${getRowKey(row)}-${column.key}`}
                      className={cn("border-b border-slate-100 px-3 py-2.5", column.cellClassName)}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {rows.length === 0 ? (
        <p className={cn("mt-3 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-500", emptyClassName)}>
          {emptyMessage}
        </p>
      ) : null}

      {showPagination ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500">
            Showing {pageStart}-{pageEnd} of {rows.length}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1 text-xs text-slate-600">
              Rows
              <select
                value={currentPageSize}
                onChange={(event) => setCurrentPageSize(Number(event.target.value))}
                className="rounded border border-slate-300 bg-white px-1.5 py-1 text-xs text-slate-700"
              >
                {safePageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(1)}
              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              First
            </button>
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((previous) => Math.max(1, previous - 1))}
              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Prev
            </button>
            <span className="text-xs text-slate-600">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((previous) => Math.min(totalPages, previous + 1))}
              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(totalPages)}
              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Last
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
