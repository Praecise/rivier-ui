"use client";
/**
 * @name collapsible
 * @category ui
 * @description One section of content that opens and closes under a button that says whether it is open: the disclosure pattern.
 * @when Hiding detail that only some people need: more options, the rest of a long answer, a transcript. For several such sections in a column use accordion; for a menu of actions use dropdown-menu.
 * @example
 * <Collapsible>
 *   <CollapsibleTrigger>More options</CollapsibleTrigger>
 *   <CollapsibleContent>…</CollapsibleContent>
 * </Collapsible>
 */
import { Collapsible as CollapsiblePrimitive } from "radix-ui";
import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function Collapsible({ className, ...props }: ComponentProps<typeof CollapsiblePrimitive.Root>) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" className={cn("flex flex-col gap-2", className)} {...props} />;
}

/** The button. It carries aria-expanded; its chevron turns as it opens (not under reduced motion). Use `asChild` for a button of your own. */
export function CollapsibleTrigger({ className, children, asChild, ...props }: ComponentProps<typeof CollapsiblePrimitive.Trigger>) {
  if (asChild) return <CollapsiblePrimitive.Trigger data-slot="collapsible-trigger" asChild {...props}>{children}</CollapsiblePrimitive.Trigger>;
  return (
    <CollapsiblePrimitive.Trigger
      data-slot="collapsible-trigger"
      className={cn("group/trigger inline-flex min-h-10 items-center gap-2 self-start rounded-control text-sm font-medium hover:underline", className)}
      {...props}
    >
      {children}
      <ChevronDown aria-hidden="true" className="size-4 transition-transform duration-base ease-out group-data-[state=open]/trigger:rotate-180 motion-reduce:transition-none" />
    </CollapsiblePrimitive.Trigger>
  );
}

/** The content. It appears at once: no height animation, so nothing below it moves in steps. */
export function CollapsibleContent({ className, ...props }: ComponentProps<typeof CollapsiblePrimitive.Content>) {
  return <CollapsiblePrimitive.Content data-slot="collapsible-content" className={cn("data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-reduce:animate-none!", className)} {...props} />;
}
