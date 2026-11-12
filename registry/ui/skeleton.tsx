/**
 * @name skeleton
 * @category ui
 * @description A pulsing block that stands in for content that is loading. It is still under reduced motion.
 * @when Content whose shape is known is on its way: size the block like the thing it replaces so nothing jumps. For an unknown wait use spinner; for a measurable one use progress.
 * @example
 * <div className="flex items-center gap-3" aria-busy="true">
 *   <Skeleton className="size-10 rounded-full" />
 *   <div className="flex flex-1 flex-col gap-2">
 *     <Skeleton className="h-4 w-1/2" />
 *     <Skeleton className="h-4 w-3/4" />
 *   </div>
 * </div>
 */
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/** Hidden from assistive technology: mark the region that is loading with `aria-busy` instead. */
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("h-4 w-full animate-pulse rounded-control bg-muted motion-reduce:animate-none", className)}
      {...props}
    />
  );
}
