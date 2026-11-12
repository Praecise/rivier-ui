/**
 * @name split
 * @category layout
 * @description Two columns, usually media beside text, that stack into one on a narrow width. A ratio between the columns and a reverse option.
 * @when A feature row, a hero with an image, a form beside its explanation. Give it exactly two children. Alternate `reverse` down a page for a zigzag. For more than two columns use grid.
 * @example
 * <Split ratio="3:2">
 *   <SplitMedia><img src="/shots/dashboard.png" alt="The dashboard" /></SplitMedia>
 *   <SplitContent>
 *     <h2 className="text-3xl font-medium">See everything at once</h2>
 *     <p className="text-muted-foreground">One screen for the whole week.</p>
 *   </SplitContent>
 * </Split>
 * <Split reverse align="start" gap="lg">
 *   <SplitMedia>…</SplitMedia>
 *   <SplitContent>…</SplitContent>
 * </Split>
 */
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/* Columns appear when the split itself is 48rem wide or more (a container query, not the viewport). */
const RATIO = {
  "1:1": "@3xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]",
  "1:2": "@3xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]",
  "2:1": "@3xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]",
  "2:3": "@3xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]",
  "3:2": "@3xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]",
} as const;

const GAP = {
  sm: "gap-6 @3xl:gap-8",
  md: "gap-8 @3xl:gap-12",
  lg: "gap-10 @3xl:gap-20",
} as const;

const ALIGN = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
} as const;

export type SplitProps = ComponentProps<"div"> & {
  /** First column to second column, in source order. Defaults to "1:1". */
  ratio?: keyof typeof RATIO;
  /** Side by side, show the first child second. Stacked, the source order is kept. The ratio follows the children: "3:2" with `reverse` puts the wide column last. */
  reverse?: boolean;
  /** How the two columns line up vertically. Defaults to "center". */
  align?: keyof typeof ALIGN;
  /** Space between the columns. Defaults to "md". */
  gap?: keyof typeof GAP;
};

const REVERSED = {
  "1:1": RATIO["1:1"],
  "1:2": RATIO["2:1"],
  "2:1": RATIO["1:2"],
  "2:3": RATIO["3:2"],
  "3:2": RATIO["2:3"],
} as const;

export function Split({ className, ratio = "1:1", reverse = false, align = "center", gap = "md", children, ...props }: SplitProps) {
  return (
    <div data-slot="split" className={cn("@container w-full", className)} {...props}>
      <div
        data-slot="split-track"
        className={cn("grid grid-cols-1", reverse ? REVERSED[ratio] : RATIO[ratio], GAP[gap], ALIGN[align], reverse && "@3xl:[&>*:first-child]:order-last")}
      >
        {children}
      </div>
    </div>
  );
}

/** The picture side. A direct img or video child fills it; the corners follow the theme's surface radius. */
export function SplitMedia({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="split-media"
      className={cn("min-w-0 overflow-hidden rounded-surface [&>img]:h-auto [&>img]:w-full [&>img]:object-cover [&>video]:h-auto [&>video]:w-full [&>video]:object-cover", className)}
      {...props}
    />
  );
}

/** The text side: a column with even spacing. */
export function SplitContent({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="split-content" className={cn("flex min-w-0 flex-col gap-4", className)} {...props} />;
}
