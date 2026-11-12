"use client";
/**
 * @name progress
 * @category ui
 * @description A bar that fills as a task completes, or slides back and forth when the amount done is not known.
 * @when A wait that can be measured: an upload, a multi-step job. Leave `value` out (or pass null) for the indeterminate state. For a short unknown wait use spinner. Always label it.
 * @example
 * <Progress value={64} aria-label="Uploading" />
 * <Progress value={3} max={8} size="sm" aria-label="Step 3 of 8" />
 * <Progress aria-label="Connecting" />
 */
import { Progress as ProgressPrimitive } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export const progressVariants = cva("relative w-full overflow-hidden rounded-control bg-muted", {
  variants: {
    size: {
      sm: "h-1",
      md: "h-2",
      lg: "h-3",
    },
  },
  defaultVariants: { size: "md" },
});

export type ProgressProps = ComponentProps<typeof ProgressPrimitive.Root> & VariantProps<typeof progressVariants>;

/**
 * The bar is full width and scaled on the x axis, so filling never causes layout. Needs the `rui-progress`
 * keyframe from the theme for the indeterminate state.
 */
export function Progress({ className, size, value, max = 100, ...props }: ProgressProps) {
  const known = typeof value === "number" && max > 0;
  const ratio = known ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <ProgressPrimitive.Root data-slot="progress" value={known ? value : null} max={max} className={cn(progressVariants({ size }), className)} {...props}>
      {known ? (
        <ProgressPrimitive.Indicator
          data-slot="progress-indicator"
          className="block size-full origin-left bg-primary transition-transform duration-slow ease-out motion-reduce:transition-none rtl:origin-right"
          style={{ transform: `scaleX(${ratio})` }}
        />
      ) : (
        <ProgressPrimitive.Indicator
          data-slot="progress-indicator"
          className="absolute inset-y-0 left-0 block w-2/5 animate-[rui-progress_1.4s_ease-in-out_infinite] bg-primary motion-reduce:left-[30%] motion-reduce:animate-none"
        />
      )}
    </ProgressPrimitive.Root>
  );
}
