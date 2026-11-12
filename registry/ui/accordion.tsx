"use client";
/**
 * @name accordion
 * @category ui
 * @description Stacked sections whose content opens and closes under its heading.
 * @when Questions and answers, or long settings where people need a few sections out of many. `type="single"` keeps one open (add `collapsible` so it can be closed again); `type="multiple"` lets several be open. For views that replace each other in one place use tabs. Do not hide content everyone needs.
 * @example
 * <Accordion type="single" collapsible defaultValue="shipping">
 *   <AccordionItem value="shipping">
 *     <AccordionTrigger>How long does delivery take?</AccordionTrigger>
 *     <AccordionContent>Two to four working days.</AccordionContent>
 *   </AccordionItem>
 *   <AccordionItem value="returns">
 *     <AccordionTrigger>Can I send it back?</AccordionTrigger>
 *     <AccordionContent>Yes, within thirty days.</AccordionContent>
 *   </AccordionItem>
 * </Accordion>
 */
import { Accordion as AccordionPrimitive } from "radix-ui";
import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function Accordion({ className, ...props }: ComponentProps<typeof AccordionPrimitive.Root>) {
  return <AccordionPrimitive.Root data-slot="accordion" className={cn("w-full", className)} {...props} />;
}

export function AccordionItem({ className, ...props }: ComponentProps<typeof AccordionPrimitive.Item>) {
  return <AccordionPrimitive.Item data-slot="accordion-item" className={cn("border-b", className)} {...props} />;
}

/** The heading and its button. Renders an h3; the chevron turns with a transform. */
export function AccordionTrigger({ className, children, ...props }: ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header data-slot="accordion-header" className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "group/accordion-trigger flex min-h-12 flex-1 items-center justify-between gap-4 py-3 text-start text-base font-medium disabled:pointer-events-none disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDown
          aria-hidden="true"
          strokeWidth={1.5}
          className="size-4 shrink-0 text-muted-foreground transition-transform duration-base ease-out group-data-[state=open]/accordion-trigger:rotate-180 motion-reduce:transition-none"
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

/*
 * No height animation. The motion rule allows only transform and opacity, and the usual accordion animation
 * (height to --radix-accordion-content-height, or a grid-rows transition) animates layout on every frame, so
 * it is not taken as an exception. The section takes its full height at once, as the direct result of the
 * click, and the content fades and settles into place with opacity and transform. Closing is immediate: an
 * exit animation would hold the open height while it runs and then jump.
 * Radix does not run this animation for sections that are open when the page loads.
 */
export function AccordionContent({ className, ...props }: ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      className={cn(
        "pb-4 text-base text-muted-foreground ease-out animation-duration-(--duration-base) fade-in-0 slide-in-from-top-1 data-[state=open]:animate-in motion-reduce:animate-none!",
        className,
      )}
      {...props}
    />
  );
}
