"use client";
/**
 * @name hover-card
 * @category ui
 * @description A small card of more about a link (a person's profile, a page's summary) that opens after a pause on hover or keyboard focus, and stays while the pointer moves onto it.
 * @when A preview that sighted pointer users can do without: the link itself must lead to the same content, because touch screens and screen readers do not get the card. For a few words use tooltip; for content people act on use popover.
 * @example
 * <HoverCard>
 *   <HoverCardTrigger asChild><a href="/team/ada">Ada</a></HoverCardTrigger>
 *   <HoverCardContent>Designer on the maps team since 2024.</HoverCardContent>
 * </HoverCard>
 */
import { HoverCard as HoverCardPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function HoverCard({ openDelay = 500, closeDelay = 200, ...props }: ComponentProps<typeof HoverCardPrimitive.Root>) {
  return <HoverCardPrimitive.Root openDelay={openDelay} closeDelay={closeDelay} {...props} />;
}

export function HoverCardTrigger(props: ComponentProps<typeof HoverCardPrimitive.Trigger>) {
  return <HoverCardPrimitive.Trigger data-slot="hover-card-trigger" {...props} />;
}

export function HoverCardContent({ className, sideOffset = 6, collisionPadding = 8, ...props }: ComponentProps<typeof HoverCardPrimitive.Content>) {
  return (
    <HoverCardPrimitive.Portal>
      <HoverCardPrimitive.Content
        data-slot="hover-card-content"
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cn(
          "z-50 w-72 max-w-[calc(100vw-1rem)] rounded-surface border bg-popover p-4 text-sm text-popover-foreground ease-out animation-duration-(--duration-instant) fade-in-0 fade-out-0 zoom-in-95 zoom-out-95 data-[state=closed]:animate-out data-[state=open]:animate-in motion-reduce:animate-none!",
          className,
        )}
        {...props}
      />
    </HoverCardPrimitive.Portal>
  );
}
