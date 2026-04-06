import { useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { ArrowUpDown, Search, ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import React from "react";

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  hideOnMobile?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchPlaceholder?: string;
  searchKey?: string;
  onRowClick?: (row: T) => void;
  className?: string;
  // Pagination props
  page?: number;
  pageSize?: number;
  totalCount?: number;
  onPageChange?: (page: number) => void;
  expandableRowRender?: (row: T) => React.ReactNode;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  searchPlaceholder = "Search...",
  searchKey,
  onRowClick,
  className,
  page,
  pageSize,
  totalCount,
  onPageChange,
  expandableRowRender,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const filtered = searchKey
    ? data.filter((row) => String(row[searchKey]).toLowerCase().includes(search.toLowerCase()))
    : data;

  const sorted = sortKey
    ? [...filtered].sort((a, b) => {
        const aVal = a[sortKey], bVal = b[sortKey];
        const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
        return sortDir === "asc" ? cmp : -cmp;
      })
    : filtered;

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});

  const toggleRow = (index: number) => {
    setExpandedRows((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  return (
    <div className={cn("space-y-4", className)}>
      {searchKey && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}
      <div className="rounded-xl border shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              {expandableRowRender && <TableHead className="w-[40px]" />}
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={cn(
                    col.sortable && "cursor-pointer select-none",
                    col.hideOnMobile && "hidden sm:table-cell"
                  )}
                  onClick={() => col.sortable && toggleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider">
                    {col.label}
                    {col.sortable && <ArrowUpDown className="h-3 w-3 text-muted-foreground/60" />}
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((row, i) => (
              <React.Fragment key={i}>
                <TableRow
                  className={cn(
                    (onRowClick || expandableRowRender) && "cursor-pointer",
                    "transition-colors hover:bg-accent/50",
                    expandedRows[i] && "bg-accent/30"
                  )}
                  onClick={() => {
                    if (expandableRowRender) toggleRow(i);
                    onRowClick?.(row);
                  }}
                >
                  {expandableRowRender && (
                    <TableCell>
                      {expandedRows[i] ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                  )}
                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      className={cn(col.hideOnMobile && "hidden sm:table-cell")}
                    >
                      {col.render ? col.render(row) : row[col.key]}
                    </TableCell>
                  ))}
                </TableRow>
                {expandableRowRender && expandedRows[i] && (
                  <TableRow className="bg-muted/20 hover:bg-muted/20 border-b-0">
                    <TableCell colSpan={columns.length + 1} className="p-0">
                      <div className="animate-in slide-in-from-top-1 duration-200">
                        {expandableRowRender(row)}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>

      {onPageChange && page !== undefined && pageSize !== undefined && totalCount !== undefined && (
        <div className="flex items-center justify-between px-2 pt-2">
          <div className="text-xs text-muted-foreground">
            Showing <span className="font-medium">{(page - 1) * pageSize + 1}</span> to{" "}
            <span className="font-medium text-foreground">
              {Math.min(page * pageSize, totalCount)}
            </span>{" "}
            of <span className="font-medium text-foreground">{totalCount}</span> results
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="h-8 px-3 text-xs"
            >
              Previous
            </Button>
            <div className="flex items-center justify-center text-xs font-medium px-2">
              Page {page} of {Math.ceil(totalCount / pageSize)}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page * pageSize >= totalCount}
              className="h-8 px-3 text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
