"use client";
/**
 * @name popover
 * @category ui
 * @description A small floating surface attached to the control that opens it.
 * @when Extra controls or details that belong to one control: a date picker, a share box, quick settings. For a hint of a few words use tooltip; for a list of actions use dropdown-menu; for a task that must block the page use dialog.
 * @example
 * <Popover>
 *   <PopoverTrigger asChild><Button variant="outline">Share</Button></PopoverTrigger>
 *   <PopoverContent align="start">
 *     <p className="text-sm font-medium">Share this page</p>
 *     <p className="text-sm text-muted-foreground">Anyone with the link can view it.</p>
 *   </PopoverContent>
 * </Popover>
 */
import { Popover as PopoverPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function Popover(props: ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root {...props} />;
}

export function PopoverTrigger(props: ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

/** Position the popover against this element instead of the trigger. */
export function PopoverAnchor(props: ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />;
}

export function PopoverClose(props: ComponentProps<typeof PopoverPrimitive.Close>) {
  return <PopoverPrimitive.Close data-slot="popover-close" {...props} />;
}

export function PopoverContent({ className, align = "center", sideOffset = 6, collisionPadding = 8, ...props }: ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cn(
          "z-50 max-h-(--radix-popover-content-available-height) w-72 max-w-(--radix-popover-content-available-width) origin-(--radix-popover-content-transform-origin) overflow-y-auto rounded-surface border bg-popover p-4 text-sm text-popover-foreground ease-out animation-duration-(--duration-base) fade-in-0 fade-out-0 zoom-in-95 zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=open]:animate-in motion-reduce:animate-none!",
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}
