import React, { useEffect, useState } from "react";

import { Button } from "@shadcn/button";
import { Input } from "@shadcn/input";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CirclePlusIcon,
  DownloadIcon,
} from "lucide-react";
import { Badge } from "@shadcn/badge";
import { Checkbox } from "@shadcn/checkbox";
import { Skeleton } from "@shadcn/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@shadcn/table";
import AccountsService from "@services/accounts.service";

const EXCLUDED_KEYS = new Set([
  "uid",
  "metadata",
  "passwordHash",
  "passwordSalt",
  "tokensValidAfterTime",
  "providerData",
]);

function SortableHeader({ label, column }: { label: string; column: any }) {
  return (
    <button
      className="flex items-center gap-1 font-medium hover:text-foreground"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      {label}
      {column.getIsSorted() === "asc" ? (
        <ChevronUpIcon className="size-3" />
      ) : column.getIsSorted() === "desc" ? (
        <ChevronDownIcon className="size-3" />
      ) : null}
    </button>
  );
}

function buildColumns(
  sample: Record<string, unknown>
): ColumnDef<Record<string, unknown>>[] {
  return Object.keys(sample)
    .filter((key) => !EXCLUDED_KEYS.has(key))
    .map((key) => {
      if (key === "emailVerified") {
        return {
          accessorKey: key,
          header: ({ column }) => (
            <SortableHeader label="Verified" column={column} />
          ),
          cell: ({ getValue }) =>
            getValue<boolean>() ? (
              <Badge className="bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">
                Verified
              </Badge>
            ) : (
              <Badge className="bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400">
                Unverified
              </Badge>
            ),
        };
      }

      return {
        accessorKey: key,
        header: ({ column }) => <SortableHeader label={key} column={column} />,
        cell: ({ getValue }) => (
          <span>{String(getValue<unknown>() ?? "—")}</span>
        ),
      };
    });
}

function Syllabus(): React.JSX.Element {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState({});

  useEffect(() => {
    AccountsService.getAllAccounts()
      .then((result) => setData(Array.isArray(result) ? result : [result]))
      .catch(() => setError("Failed to load data."))
      .finally(() => setLoading(false));
  }, []);

  const selectionColumn: ColumnDef<Record<string, unknown>> = {
    id: "select",
    header: ({ table }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      </div>
    ),
    enableSorting: false,
  };

  const columns =
    data.length > 0 ? [selectionColumn, ...buildColumns(data[0])] : [];

  const table = useReactTable({
    data,
    columns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="flex items-start justify-between gap-2 px-4 lg:px-6">
          {/* <h1 className="text-2xl font-semibold">Syllabus</h1> */}
          <Input placeholder="Search" />
          <Button>
            <CirclePlusIcon data-icon="inline-end" /> New Syllabus
          </Button>
          <Button variant="secondary">
            <DownloadIcon data-icon="inline-end" /> Export
          </Button>
        </div>

        <div className="px-4 lg:px-6">
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted">
                {loading ? (
                  <TableRow>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <TableHead key={i} className="h-12 px-4">
                        <Skeleton className="h-4 w-20" />
                      </TableHead>
                    ))}
                  </TableRow>
                ) : (
                  table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id} className="h-12 px-4">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <TableCell key={j} className="px-4 py-3.5">
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : error ? (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center text-destructive"
                    >
                      {error}
                    </TableCell>
                  </TableRow>
                ) : table.getRowModel().rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No results.
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="px-4 py-3.5">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Syllabus;
