"use client";
/**
 * @name radio-group
 * @category ui
 * @description A set of radio buttons where exactly one is chosen, with arrow-key movement between them.
 * @when Picking one of two to five options that should all be visible. For a longer list use select; for a compact row of icons or short words use toggle-group; for on or off use switch.
 * @example
 * <RadioGroup defaultValue="monthly" aria-label="Billing period">
 *   <Label><RadioGroupItem value="monthly" /> Monthly</Label>
 *   <Label><RadioGroupItem value="yearly" /> Yearly</Label>
 * </RadioGroup>
 */
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function RadioGroup({ className, ...props }: ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn("grid gap-3 data-[orientation=horizontal]:flex data-[orientation=horizontal]:flex-wrap data-[orientation=horizontal]:gap-x-5", className)}
      {...props}
    />
  );
}

/** The circle is 20px; an invisible margin makes the touch target 40px. Wrap it in a Label to name it. */
export function RadioGroupItem({ className, ...props }: ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        "peer relative inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-input bg-background transition-[background-color,border-color,opacity] duration-instant ease-out after:absolute after:-inset-2.5 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive data-[state=checked]:border-primary data-[state=checked]:bg-primary motion-reduce:transition-none",
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator data-slot="radio-group-indicator" className="size-2 rounded-full bg-primary-foreground" />
    </RadioGroupPrimitive.Item>
  );
}
