"use client";
/**
 * @name aspect
 * @category layout
 * @description Holds its content at a fixed width-to-height ratio, so space is reserved before an image, video or canvas loads.
 * @when Media whose size is not known until it loads, or a tile that must keep its shape at any width. Make the child fill it (`size-full object-cover`). For plain CSS needs the `aspect-video` utility is enough.
 * @example
 * <Aspect ratio={16 / 9} className="rounded-surface border">
 *   <img src="/shots/hero.jpg" alt="The studio" className="size-full object-cover" />
 * </Aspect>
 * <Aspect ratio={1}><div className="size-full bg-muted" /></Aspect>
 */
import { AspectRatio } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export type AspectProps = ComponentProps<typeof AspectRatio.Root>;

/** `ratio` is width divided by height. Defaults to 1 (a square). */
export function Aspect({ className, ratio = 1, ...props }: AspectProps) {
  return <AspectRatio.Root data-slot="aspect" ratio={ratio} className={cn("overflow-hidden", className)} {...props} />;
}
