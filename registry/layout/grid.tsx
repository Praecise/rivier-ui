/**
 * @name grid
 * @category layout
 * @description A responsive grid of equal columns that fits as many as the width allows, from a minimum column width. No breakpoints.
 * @when A set of like items: cards, logos, stats, thumbnails. It reflows inside any width, including a sidebar. For tiles of different sizes use bento-grid; for two fixed columns use split.
 * @example
 * <Grid min="16rem" gap="md">
 *   <Card>…</Card>
 *   <Card>…</Card>
 *   <Card>…</Card>
 * </Grid>
 * <Grid min="9rem" gap="sm" fit="fill">{logos}</Grid>
 */
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, CSSProperties } from "react";
import { cn } from "@/lib/cn";

export const gridVariants = cva("grid min-w-0", {
  variants: {
    fit: {
      /** Columns stretch to fill the row, so two items share the full width. */
      fit: "grid-cols-[repeat(auto-fit,minmax(min(100%,var(--grid-min)),1fr))]",
      /** Empty columns are kept, so a few items stay at column width. */
      fill: "grid-cols-[repeat(auto-fill,minmax(min(100%,var(--grid-min)),1fr))]",
    },
    gap: {
      none: "gap-0",
      xs: "gap-1",
      sm: "gap-2",
      md: "gap-4",
      lg: "gap-6",
      xl: "gap-10",
    },
  },
  defaultVariants: { fit: "fit", gap: "md" },
});

export type GridProps = ComponentProps<"div"> &
  VariantProps<typeof gridVariants> & {
    /** The narrowest a column may be, as a CSS length. Never wider than the grid itself, so it cannot overflow. Defaults to "16rem". */
    min?: string;
    /** Render the child element (ul, for example) as the grid. */
    asChild?: boolean;
  };

export function Grid({ className, fit, gap, min = "16rem", asChild = false, style, ...props }: GridProps) {
  const Comp = asChild ? Slot.Root : "div";
  return (
    <Comp
      data-slot="grid"
      className={cn(gridVariants({ fit, gap }), className)}
      style={{ "--grid-min": min, ...style } as CSSProperties}
      {...props}
    />
  );
}
