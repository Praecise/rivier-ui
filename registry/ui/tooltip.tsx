"use client";
/**
 * @name tooltip
 * @category ui
 * @description A few words that appear beside a control on hover or keyboard focus.
 * @when Naming an icon-only button or adding a short hint. It does not open on touch, so never put anything needed there: the control keeps its own `aria-label`. For content people interact with use popover. Put one TooltipProvider around the app (root layout); every Tooltip must be inside one.
 * @example
 * <TooltipProvider>
 *   <Tooltip>
 *     <TooltipTrigger asChild>
 *       <Button variant="ghost" size="icon" aria-label="Copy link"><Link2 /></Button>
 *     </TooltipTrigger>
 *     <TooltipContent>Copy link</TooltipContent>
 *   </Tooltip>
 * </TooltipProvider>
 */
import { Tooltip as TooltipPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/** Shares the open delay between tooltips, so moving from one to the next shows it at once. */
export function TooltipProvider({ delayDuration = 300, ...props }: ComponentProps<typeof TooltipPrimitive.Provider>) {
  return <TooltipPrimitive.Provider delayDuration={delayDuration} {...props} />;
}

export function Tooltip(props: ComponentProps<typeof TooltipPrimitive.Root>) {
  return <TooltipPrimitive.Root {...props} />;
}

export function TooltipTrigger(props: ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

/* Radix's open states here are "delayed-open" and "instant-open", so the enter animation runs on mount, not on data-[state=open]. */
export function TooltipContent({ className, sideOffset = 6, collisionPadding = 8, ...props }: ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cn(
          "z-50 w-fit max-w-[min(20rem,var(--radix-tooltip-content-available-width))] origin-(--radix-tooltip-content-transform-origin) animate-in rounded-surface border bg-popover px-3 py-1.5 text-xs text-balance text-popover-foreground ease-out animation-duration-(--duration-base) fade-in-0 fade-out-0 zoom-in-95 zoom-out-95 data-[side=bottom]:slide-in-from-top-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1 data-[state=closed]:animate-out motion-reduce:animate-none!",
          className,
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
}
