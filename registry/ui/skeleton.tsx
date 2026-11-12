/**
 * @name skeleton
 * @category ui
 * @description A pulsing block that stands in for content that is loading: a bare block sized by hand, lines of text, or a wrapper that takes the exact size of the real content. It is still under reduced motion.
 * @when Content whose shape is known is on its way. Nothing may jump when it arrives: either size the block like the thing it replaces, or wrap the real component (rendered with placeholder data) in `<Skeleton loading>` so the box is exactly its final size. Mark the region that is loading with `aria-busy="true"`: the placeholders themselves are hidden from assistive technology. For an unknown wait use spinner; for a measurable one use progress.
 * @example
 * <div className="flex items-center gap-3" aria-busy="true">
 *   <Skeleton className="size-10 rounded-full" />
 *   <SkeletonText lines={2} className="flex-1" />
 * </div>
 *
 * // Holds the final size: the card is laid out, invisible and inert, under the placeholder
 * <section aria-busy={isLoading}>
 *   <Skeleton loading={isLoading}>
 *     <PriceCard price={price ?? PLACEHOLDER_PRICE} />
 *   </Skeleton>
 * </section>
 */
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

const PLACEHOLDER = "animate-pulse rounded-control bg-muted motion-reduce:animate-none";

export type SkeletonProps = ComponentProps<"div"> & {
  /**
   * With children: true shows the placeholder over the children, which are laid out but invisible and
   * inert (no focus, no clicks, not read); false shows the children. Without children it has no effect.
   */
  loading?: boolean;
};

/**
 * Without children: a block, `h-4 w-full` unless sized with classes. With children: a box of exactly the
 * children's size. The children stay mounted when loading ends, so nothing is built twice and nothing
 * shifts. Hidden from assistive technology while it is a placeholder.
 */
export function Skeleton({ className, loading = true, children, ...props }: SkeletonProps) {
  if (children === undefined || children === null) {
    return <div data-slot="skeleton" aria-hidden="true" className={cn("h-4 w-full", PLACEHOLDER, className)} {...props} />;
  }
  return (
    <div data-slot="skeleton" data-loading={loading ? "" : undefined} aria-hidden={loading ? "true" : undefined} className={loading ? cn(PLACEHOLDER, className) : "contents"} {...props}>
      <div data-slot="skeleton-content" inert={loading} className={loading ? "invisible" : "contents"}>
        {children}
      </div>
    </div>
  );
}

export type SkeletonTextProps = ComponentProps<"div"> & {
  /** How many lines. Default 3. The last is shorter, as the last line of a paragraph is. */
  lines?: number;
};

/** Lines of text to come. Each line is the height of a line of `text-sm`; set `gap-*` and line classes to match other sizes. */
export function SkeletonText({ className, lines = 3, ...props }: SkeletonTextProps) {
  return (
    <div data-slot="skeleton-text" aria-hidden="true" className={cn("flex w-full flex-col gap-2", className)} {...props}>
      {Array.from({ length: Math.max(1, lines) }, (_, index) => (
        <div key={index} data-slot="skeleton-line" className={cn("h-4", PLACEHOLDER, index === lines - 1 && lines > 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}
