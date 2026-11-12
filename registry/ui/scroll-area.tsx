"use client";
/**
 * @name scroll-area
 * @category ui
 * @description A scrolling region with thin, themed scrollbars that look the same on every platform. Native scrolling underneath.
 * @when A bounded list or panel inside a surface: a menu, a sidebar, a log. Give it a height (or a max height). The page itself, and anything that can simply grow, should scroll natively.
 * @example
 * <ScrollArea className="h-64 rounded-surface border" aria-label="Changelog">
 *   <div className="p-4 text-sm">Long content…</div>
 * </ScrollArea>
 * <ScrollArea orientation="horizontal" className="w-full">
 *   <div className="flex w-max gap-3 pb-3">…</div>
 * </ScrollArea>
 */
import { ScrollArea as ScrollAreaPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export type ScrollAreaProps = ComponentProps<typeof ScrollAreaPrimitive.Root> & {
  /** Which scrollbars to draw. Defaults to "vertical". */
  orientation?: "vertical" | "horizontal" | "both";
  /** Classes for the scrolling viewport (padding, snap). */
  viewportClassName?: string;
};

/** The viewport can be focused, so the region scrolls from the keyboard. */
export function ScrollArea({ className, viewportClassName, orientation = "vertical", children, ...props }: ScrollAreaProps) {
  return (
    <ScrollAreaPrimitive.Root data-slot="scroll-area" className={cn("relative overflow-hidden", className)} {...props}>
      <ScrollAreaPrimitive.Viewport data-slot="scroll-area-viewport" tabIndex={0} className={cn("size-full rounded-[inherit]", viewportClassName)}>
        {children}
      </ScrollAreaPrimitive.Viewport>
      {orientation !== "horizontal" ? <ScrollBar orientation="vertical" /> : null}
      {orientation !== "vertical" ? <ScrollBar orientation="horizontal" /> : null}
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
}

export function ScrollBar({ className, orientation = "vertical", ...props }: ComponentProps<typeof ScrollAreaPrimitive.Scrollbar>) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        "flex touch-none p-0.5 select-none data-[orientation=horizontal]:h-2.5 data-[orientation=horizontal]:flex-col data-[orientation=vertical]:h-full data-[orientation=vertical]:w-2.5",
        className,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb data-slot="scroll-area-thumb" className="relative flex-1 rounded-full bg-border-strong" />
    </ScrollAreaPrimitive.Scrollbar>
  );
}
