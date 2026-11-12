/**
 * @name compare-table
 * @category ui
 * @description Two to four things side by side, attribute by attribute: a table whose first column (the attribute names) stays in view while the things scroll sideways inside it on narrow screens.
 * @when Helping someone choose between a few similar things: plans, products, places, quotes. Give every thing the same rows, in the same order. For plain rows of data use table; for more than four things let people pick which to compare first; for one thing's details use a description list or card.
 * @example
 * <CompareTable label="Compare the two plans" columns={2} onlyDifferences={onlyDifferences}>
 *   <CompareHeader corner="Plan">
 *     <CompareColumn><CompareColumnTitle>Starter</CompareColumnTitle><Button size="sm">Choose</Button></CompareColumn>
 *     <CompareColumn><CompareColumnTitle>Team</CompareColumnTitle><Button size="sm">Choose</Button></CompareColumn>
 *   </CompareHeader>
 *   <CompareGroup title="Basics">
 *     <CompareRow label="Price a month">
 *       <CompareCell value={12} best>€12</CompareCell>
 *       <CompareCell value={29}>€29</CompareCell>
 *     </CompareRow>
 *     <CompareRow label="Support">
 *       <CompareCell value="email">By email</CompareCell>
 *       <CompareCell value="email">By email</CompareCell>
 *     </CompareRow>
 *   </CompareGroup>
 * </CompareTable>
 */
import { Children, createContext, isValidElement, use, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type CompareContextValue = { columns: number; bestLabel: string };

const CompareContext = createContext<CompareContextValue>({ columns: 2, bestLabel: "Best" });

export type CompareTableProps = Omit<ComponentProps<"table">, "aria-label"> & {
  /** The table's name, read out for the table and for its scroll area ("Compare the three plans"). */
  label: string;
  /** How many things are compared (the number of CompareColumn). */
  columns: number;
  /** Hide the rows in which every thing has the same value (rows that carry `data-same`). The project owns the switch. */
  onlyDifferences?: boolean;
  /** The word shown in a cell marked `best`. Translate it with the interface. */
  bestLabel?: string;
  /** Classes for the outer frame (the table itself takes `className`). */
  frameClassName?: string;
};

/**
 * A real table: screen readers announce each cell with its thing (column header) and its attribute (row
 * header). The frame is a container: when it is too narrow for every thing, the things scroll sideways
 * inside it, one or two to a view and snapping, with the attribute names held at the start; the page itself
 * never scrolls sideways. The scroll area can be focused and then scrolled with the arrow keys.
 */
export function CompareTable({ label, columns, onlyDifferences = false, bestLabel = "Best", className, frameClassName, children, ...props }: CompareTableProps) {
  return (
    <div
      data-slot="compare-table"
      data-only-differences={onlyDifferences ? "" : undefined}
      className={cn("group/compare @container w-full min-w-0 rounded-surface border bg-card text-card-foreground", frameClassName)}
    >
      <div
        data-slot="compare-table-scroll"
        role="region"
        aria-label={label}
        tabIndex={0}
        className="w-full snap-x snap-mandatory scroll-ps-(--compare-label) overflow-x-auto overscroll-x-contain rounded-surface [--compare-label:7rem] [--compare-per-view:1.2] focus-visible:-outline-offset-2 motion-reduce:snap-none @sm:[--compare-per-view:2.2] @xl:[--compare-label:11rem]"
      >
        <table aria-label={label} className={cn("w-max min-w-full border-separate border-spacing-0 text-start text-sm", className)} {...props}>
          <CompareContext value={{ columns, bestLabel }}>{children}</CompareContext>
        </table>
      </div>
    </div>
  );
}

/** What the first column of every row shares: held at the inline start, on an opaque ground, with a hairline. */
const sticky = "sticky start-0 z-10 w-(--compare-label) max-w-(--compare-label) min-w-(--compare-label) border-e bg-card";

export type CompareHeaderProps = Omit<ComponentProps<"thead">, "children"> & {
  /** What the first column holds, as its heading ("Feature"). Shown small; pass a visually hidden span to hide it. */
  corner?: ReactNode;
  /** One CompareColumn for each thing. */
  children: ReactNode;
};

export function CompareHeader({ corner, className, children, ...props }: CompareHeaderProps) {
  return (
    <thead data-slot="compare-header" className={className} {...props}>
      <tr>
        {corner === undefined ? (
          <td className={cn(sticky, "border-b")} />
        ) : (
          <th scope="col" className={cn(sticky, "border-b px-4 py-3 text-start align-bottom text-xs font-medium text-muted-foreground")}>
            {corner}
          </th>
        )}
        {children}
      </tr>
    </thead>
  );
}

/**
 * One thing: a column header. It can hold a picture, a name (CompareColumnTitle) and an action. Its width is
 * what sets how many things fit in view: a little over one on a narrow frame, a little over two on a medium
 * one (the part of the next thing that shows is the hint that there is more), and all of them once there is room.
 */
export function CompareColumn({ className, ...props }: ComponentProps<"th">) {
  return (
    <th
      scope="col"
      data-slot="compare-column"
      className={cn(
        "w-[calc((100cqw-var(--compare-label))/var(--compare-per-view))] min-w-[calc((100cqw-var(--compare-label))/var(--compare-per-view))] snap-start border-b px-4 py-3 text-start align-bottom font-normal @2xl:w-auto @2xl:min-w-40",
        className,
      )}
      {...props}
    />
  );
}

/** The thing's name inside its column header. */
export function CompareColumnTitle({ className, ...props }: ComponentProps<"span">) {
  return <span data-slot="compare-column-title" className={cn("mb-2 block text-base leading-tight font-medium", className)} {...props} />;
}

export type CompareGroupProps = Omit<ComponentProps<"tbody">, "title"> & {
  /** The band's heading ("Basics", "Support"). Leave it out for rows without a band. */
  title?: ReactNode;
};

/** A band of rows under a heading. With `onlyDifferences`, a band whose rows are all the same is hidden with them. */
export function CompareGroup({ title, className, children, ...props }: CompareGroupProps) {
  const { columns } = use(CompareContext);
  return (
    <tbody
      data-slot="compare-group"
      className={cn("group-data-[only-differences]/compare:[&:not(:has(tr[data-slot=compare-row]:not([data-same])))]:hidden", className)}
      {...props}
    >
      {title === undefined ? null : (
        <tr data-slot="compare-group-title">
          <th scope="rowgroup" colSpan={columns + 1} className="border-b bg-muted p-0 text-start text-xs font-medium tracking-wide text-foreground uppercase">
            {/* The heading spans the table, so its words are held at the start as the things scroll. */}
            <span className="sticky start-0 inline-block px-4 py-2">{title}</span>
          </th>
        </tr>
      )}
      {children}
    </tbody>
  );
}

/** Whether every cell of a row carries the same comparable `value`. Cells without one make the row "not the same". */
function allSame(children: ReactNode): boolean {
  const values: unknown[] = [];
  for (const child of Children.toArray(children)) {
    if (!isValidElement<{ value?: unknown }>(child)) continue;
    if (child.props.value === undefined) return false;
    values.push(child.props.value);
  }
  return values.length > 1 && values.every((value) => Object.is(value, values[0]));
}

export type CompareRowProps = ComponentProps<"tr"> & {
  /** The attribute's name: the row header, held in view. */
  label: ReactNode;
  /** A line under the name: a unit, a short explanation. */
  hint?: ReactNode;
  /** Whether every thing has the same value. Worked out from the cells' `value` when left out. */
  same?: boolean;
};

/** One attribute. Its CompareCell children are in the same order as the columns. */
export function CompareRow({ label, hint, same, className, children, ...props }: CompareRowProps) {
  const isSame = same ?? allSame(children);
  return (
    <tr
      data-slot="compare-row"
      data-same={isSame ? "" : undefined}
      className={cn("group/row group-data-[only-differences]/compare:data-[same]:hidden", className)}
      {...props}
    >
      <th scope="row" className={cn(sticky, "border-b px-4 py-3 text-start align-top font-medium group-last/row:border-b-0 [tbody:not(:last-child)_&]:border-b")}>
        <span className="block hyphens-auto break-words">{label}</span>
        {hint ? <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{hint}</span> : null}
      </th>
      {children}
    </tr>
  );
}

export type CompareCellProps = ComponentProps<"td"> & {
  /** What this cell is compared by (a number, a string, a boolean), so the row can tell whether all things are the same. */
  value?: string | number | boolean | null;
  /** Marks this as the best in its row: a stronger look and the table's `bestLabel` word. */
  best?: boolean;
};

export function CompareCell({ value, best = false, className, children, ...props }: CompareCellProps) {
  const { bestLabel } = use(CompareContext);
  void value;
  return (
    <td
      data-slot="compare-cell"
      data-best={best ? "" : undefined}
      className={cn("border-b px-4 py-3 align-top group-last/row:border-b-0 data-[best]:font-medium [tbody:not(:last-child)_&]:border-b", className)}
      {...props}
    >
      {children}
      {best ? (
        <span data-slot="compare-best" className="ms-2 inline-flex h-5 items-center rounded-control border border-primary bg-highlight-soft px-1.5 align-middle text-xs font-medium whitespace-nowrap text-foreground">
          {bestLabel}
        </span>
      ) : null}
    </td>
  );
}
