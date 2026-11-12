/**
 * @name table
 * @category ui
 * @description A semantic table with styled parts, inside a wrapper that scrolls sideways so it never overflows a narrow screen.
 * @when Rows of the same kind of thing compared across columns. For sorting, filtering and paging build on these parts. For two or three facts per item use cards; for one number use stat.
 * @example
 * <Table>
 *   <TableCaption>Invoices this quarter</TableCaption>
 *   <TableHeader>
 *     <TableRow>
 *       <TableHead>Invoice</TableHead>
 *       <TableHead>Status</TableHead>
 *       <TableHead numeric>Amount</TableHead>
 *     </TableRow>
 *   </TableHeader>
 *   <TableBody>
 *     <TableRow>
 *       <TableCell>INV-001</TableCell>
 *       <TableCell>Paid</TableCell>
 *       <TableCell numeric>€250.00</TableCell>
 *     </TableRow>
 *   </TableBody>
 *   <TableFooter>
 *     <TableRow>
 *       <TableCell colSpan={2}>Total</TableCell>
 *       <TableCell numeric>€250.00</TableCell>
 *     </TableRow>
 *   </TableFooter>
 * </Table>
 */
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/** The helper for number columns: digits line up and the text sits at the end of the cell. */
export const tableNumeric = "tabular-nums text-end";

export type TableProps = ComponentProps<"table"> & {
  /** Classes for the scrolling wrapper (a border and radius, a max height). `className` goes to the table. */
  containerClassName?: string;
};

export function Table({ className, containerClassName, ...props }: TableProps) {
  return (
    <div data-slot="table-container" className={cn("relative w-full overflow-x-auto", containerClassName)}>
      <table data-slot="table" className={cn("w-full caption-bottom border-collapse text-sm", className)} {...props} />
    </div>
  );
}

export function TableHeader({ className, ...props }: ComponentProps<"thead">) {
  return <thead data-slot="table-header" className={cn("[&_tr]:border-b", className)} {...props} />;
}

export function TableBody({ className, ...props }: ComponentProps<"tbody">) {
  return <tbody data-slot="table-body" className={cn("[&_tr:last-child]:border-b-0", className)} {...props} />;
}

export function TableFooter({ className, ...props }: ComponentProps<"tfoot">) {
  return <tfoot data-slot="table-footer" className={cn("border-t bg-muted font-medium text-foreground [&_tr:last-child]:border-b-0", className)} {...props} />;
}

/** Set `data-state="selected"` on a selected row. */
export function TableRow({ className, ...props }: ComponentProps<"tr">) {
  return <tr data-slot="table-row" className={cn("border-b hover:bg-accent data-[state=selected]:bg-highlight-soft", className)} {...props} />;
}

export type TableHeadProps = ComponentProps<"th"> & {
  /** A column of numbers: tabular digits, aligned to the end. */
  numeric?: boolean;
};

export function TableHead({ className, numeric = false, scope = "col", ...props }: TableHeadProps) {
  return (
    <th
      data-slot="table-head"
      scope={scope}
      className={cn("h-10 px-3 text-start align-middle font-medium whitespace-nowrap text-muted-foreground", numeric && tableNumeric, className)}
      {...props}
    />
  );
}

export type TableCellProps = ComponentProps<"td"> & {
  /** A number: tabular digits, aligned to the end. */
  numeric?: boolean;
};

export function TableCell({ className, numeric = false, ...props }: TableCellProps) {
  return <td data-slot="table-cell" className={cn("px-3 py-2.5 align-middle", numeric && tableNumeric, className)} {...props} />;
}

export function TableCaption({ className, ...props }: ComponentProps<"caption">) {
  return <caption data-slot="table-caption" className={cn("mt-3 text-start text-sm text-muted-foreground", className)} {...props} />;
}
