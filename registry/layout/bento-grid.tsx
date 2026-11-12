/**
 * @name bento-grid
 * @category layout
 * @description A grid of flat cards of unequal sizes. One column on a phone, two on a tablet, then 2, 3, 4 or 6: decided by the grid's own width, so it works inside any container.
 * @when Showing several features, figures or pieces of media as one composed block. Cells take `span` and `rowSpan`; spans are clamped to the columns there are. For equal cards use grid; for a single surface use card.
 * @example
 * // Feature block: one wide lead cell, two small ones, a full-width strip.
 * <BentoGrid columns={3}>
 *   <BentoCell span={2} rowSpan={2}>
 *     <BentoCellHeader>
 *       <BentoCellTitle>Themable from one place</BentoCellTitle>
 *       <BentoCellDescription>Light or dark, square to round, any highlight colour.</BentoCellDescription>
 *     </BentoCellHeader>
 *     <BentoCellMedia><img src="/shots/theme.png" alt="" /></BentoCellMedia>
 *   </BentoCell>
 *   <BentoCell><BentoCellHeader><BentoCellTitle>Accessible</BentoCellTitle></BentoCellHeader></BentoCell>
 *   <BentoCell><BentoCellHeader><BentoCellTitle>Fast</BentoCellTitle></BentoCellHeader></BentoCell>
 *   <BentoCell span="full"><BentoCellHeader><BentoCellTitle>Yours to edit</BentoCellTitle></BentoCellHeader></BentoCell>
 * </BentoGrid>
 *
 * // Dashboard: four figures on top, a wide chart beside a tall list.
 * <BentoGrid columns={4} rowHeight="8rem">
 *   <BentoCell><Stat label="Revenue" value="€48k" className="border-0" /></BentoCell>
 *   <BentoCell><Stat label="Orders" value="1,204" className="border-0" /></BentoCell>
 *   <BentoCell><Stat label="Visitors" value="18.2k" className="border-0" /></BentoCell>
 *   <BentoCell><Stat label="Refunds" value="12" className="border-0" /></BentoCell>
 *   <BentoCell span={3} rowSpan={3}>…chart…</BentoCell>
 *   <BentoCell rowSpan={3}>…recent activity…</BentoCell>
 * </BentoGrid>
 *
 * // Link mosaic: six columns, mixed sizes, gaps back-filled, every cell a link.
 * <BentoGrid columns={6} dense>
 *   <BentoCell span={4} rowSpan={2} interactive asChild><a href="/work/atlas">…</a></BentoCell>
 *   <BentoCell span={2} interactive asChild><a href="/work/north">…</a></BentoCell>
 *   <BentoCell span={2} interactive asChild><a href="/work/field">…</a></BentoCell>
 *   <BentoCell span={3} interactive asChild><a href="/work/tide">…</a></BentoCell>
 *   <BentoCell span={3} interactive asChild><a href="/work/loom">…</a></BentoCell>
 * </BentoGrid>
 */
import { Slot } from "radix-ui";
import type { ComponentProps, CSSProperties } from "react";
import { cn } from "@/lib/cn";

/*
 * How the widths work. The root is a size container; the track inside it is the grid. Container widths, not
 * the viewport: under 36rem one column, from 36rem two, from 56rem the `columns` asked for. Class names are
 * written out in full below so Tailwind finds them.
 */
const COLUMNS = {
  2: "",
  3: "@4xl:grid-cols-3",
  4: "@4xl:grid-cols-4",
  6: "@4xl:grid-cols-6",
} as const;

const GAP = {
  none: "gap-0",
  sm: "gap-2",
  md: "gap-4",
  lg: "gap-6",
} as const;

/*
 * A span never exceeds the columns there are: one column → every cell spans 1; two columns → at most 2; at
 * full width a span larger than the grid's `columns` becomes the whole row (the track carries data-columns,
 * and the more specific group rule wins over the plain span).
 */
const OVER_2 = "@4xl:group-data-[columns=2]/bento:col-span-full";
const OVER_3 = "@4xl:group-data-[columns=3]/bento:col-span-full";
const OVER_4 = "@4xl:group-data-[columns=4]/bento:col-span-full";

const SPAN = {
  1: "",
  2: "@xl:col-span-2",
  3: cn("@xl:col-span-2 @4xl:col-span-3", OVER_2),
  4: cn("@xl:col-span-2 @4xl:col-span-4", OVER_2, OVER_3),
  5: cn("@xl:col-span-2 @4xl:col-span-5", OVER_2, OVER_3, OVER_4),
  6: cn("@xl:col-span-2 @4xl:col-span-6", OVER_2, OVER_3, OVER_4),
  full: "col-span-full",
} as const;

/** Row spans apply from two columns up: in a single column a cell is as tall as its content. */
const ROW_SPAN = {
  1: "",
  2: "@xl:row-span-2",
  3: "@xl:row-span-3",
  4: "@xl:row-span-4",
} as const;

export type BentoGridProps = ComponentProps<"div"> & {
  /** Columns at full width (56rem and up). Defaults to 3. */
  columns?: keyof typeof COLUMNS;
  /** Space between cells. Defaults to "md". */
  gap?: keyof typeof GAP;
  /** The least height of one row, as a CSS length; rows grow with their content. Defaults to "11rem". */
  rowHeight?: string;
  /** Back-fill holes left by larger cells. The visual order can then differ from the reading order, so use it for cells whose order does not matter. */
  dense?: boolean;
};

export function BentoGrid({ className, columns = 3, gap = "md", rowHeight = "11rem", dense = false, style, children, ...props }: BentoGridProps) {
  return (
    <div data-slot="bento-grid" className={cn("@container w-full", className)} style={{ "--bento-row": rowHeight, ...style } as CSSProperties} {...props}>
      <div
        data-slot="bento-grid-track"
        data-columns={columns}
        className={cn("group/bento grid auto-rows-[minmax(var(--bento-row),auto)] grid-cols-1 @xl:grid-cols-2", COLUMNS[columns], GAP[gap], dense && "grid-flow-dense")}
      >
        {children}
      </div>
    </div>
  );
}

export type BentoCellProps = ComponentProps<"div"> & {
  /** Columns the cell covers at full width, or "full" for the whole row at every width. Defaults to 1. */
  span?: keyof typeof SPAN;
  /** Rows the cell covers once there are two columns or more. Defaults to 1. */
  rowSpan?: keyof typeof ROW_SPAN;
  /** Adds a hover and focus state: a stronger edge and a 2px lift. Use it when the whole cell is a link or a button. */
  interactive?: boolean;
  /** Render the child element (a link, for example) as the cell. */
  asChild?: boolean;
};

export function BentoCell({ className, span = 1, rowSpan = 1, interactive = false, asChild = false, ...props }: BentoCellProps) {
  const Comp = asChild ? Slot.Root : "div";
  return (
    <Comp
      data-slot="bento-cell"
      className={cn(
        "relative flex min-w-0 flex-col overflow-hidden rounded-surface border bg-card text-card-foreground",
        SPAN[span],
        ROW_SPAN[rowSpan],
        interactive &&
          "transition-[translate,border-color] duration-base ease-out hover:-translate-y-0.5 hover:border-border-strong focus-visible:-translate-y-0.5 focus-visible:border-border-strong motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:focus-visible:translate-y-0",
        className,
      )}
      {...props}
    />
  );
}

export function BentoCellHeader({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="bento-cell-header" className={cn("flex flex-col gap-1 p-5", className)} {...props} />;
}

/** Renders an h3. */
export function BentoCellTitle({ className, ...props }: ComponentProps<"h3">) {
  return <h3 data-slot="bento-cell-title" className={cn("text-base leading-tight font-medium", className)} {...props} />;
}

export function BentoCellDescription({ className, ...props }: ComponentProps<"p">) {
  return <p data-slot="bento-cell-description" className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

/** Fills the rest of the cell, edge to edge. A direct img, video, svg or canvas child covers it. Put it before or after the header. */
export function BentoCellMedia({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="bento-cell-media"
      className={cn(
        "relative min-h-24 flex-1 overflow-hidden [&>canvas]:absolute [&>canvas]:inset-0 [&>canvas]:size-full [&>img]:absolute [&>img]:inset-0 [&>img]:size-full [&>img]:object-cover [&>svg]:absolute [&>svg]:inset-0 [&>svg]:size-full [&>video]:absolute [&>video]:inset-0 [&>video]:size-full [&>video]:object-cover",
        className,
      )}
      {...props}
    />
  );
}
