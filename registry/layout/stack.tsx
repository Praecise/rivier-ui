/**
 * @name stack
 * @category layout
 * @description A flex row or column with a gap from a fixed scale, and props for alignment, distribution and wrapping.
 * @when Spacing a run of siblings evenly: form fields, a button row, a header with actions. For columns that reflow by width use grid; for unequal tiles use bento-grid.
 * @example
 * <Stack gap="lg">
 *   <h2>Title</h2>
 *   <p>Body</p>
 * </Stack>
 * <Stack direction="horizontal" gap="sm" align="center" justify="between" wrap>
 *   <span>Plan</span>
 *   <Button size="sm">Change</Button>
 * </Stack>
 * <Stack asChild gap="xs"><ul><li>One</li><li>Two</li></ul></Stack>
 */
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export const stackVariants = cva("flex min-w-0", {
  variants: {
    direction: {
      vertical: "flex-col",
      horizontal: "flex-row",
    },
    gap: {
      none: "gap-0",
      xs: "gap-1",
      sm: "gap-2",
      md: "gap-4",
      lg: "gap-6",
      xl: "gap-10",
    },
    align: {
      start: "items-start",
      center: "items-center",
      end: "items-end",
      stretch: "items-stretch",
      baseline: "items-baseline",
    },
    justify: {
      start: "justify-start",
      center: "justify-center",
      end: "justify-end",
      between: "justify-between",
    },
    wrap: {
      true: "flex-wrap",
      false: "",
    },
  },
  defaultVariants: { direction: "vertical", gap: "md", wrap: false },
});

export type StackProps = ComponentProps<"div"> &
  VariantProps<typeof stackVariants> & {
    /** Render the child element (ul, nav, form) as the stack. */
    asChild?: boolean;
  };

export function Stack({ className, direction, gap, align, justify, wrap, asChild = false, ...props }: StackProps) {
  const Comp = asChild ? Slot.Root : "div";
  return <Comp data-slot="stack" className={cn(stackVariants({ direction, gap, align, justify, wrap }), className)} {...props} />;
}
