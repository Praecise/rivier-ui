"use client";
/**
 * @name checkbox
 * @category ui
 * @description A checkbox with checked, unchecked and indeterminate states.
 * @when Choosing any number of options, or agreeing to something that is submitted with a form. For a setting that applies at once use switch; for exactly one of several use radio-group.
 * @example
 * <Label><Checkbox defaultChecked /> Email me product news</Label>
 * <Checkbox checked="indeterminate" aria-label="Select all rows" />
 */
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import { Check, Minus } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/** The box is 20px; an invisible margin makes the touch target 40px. */
export function Checkbox({ className, ...props }: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "group/checkbox peer relative inline-flex size-5 shrink-0 items-center justify-center rounded-[min(var(--radius-control),0.25rem)] border border-input bg-background text-primary-foreground transition-[background-color,border-color,opacity] duration-instant ease-out after:absolute after:-inset-2.5 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary motion-reduce:transition-none",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator data-slot="checkbox-indicator" className="flex items-center justify-center">
        <Check aria-hidden="true" strokeWidth={1.5} className="size-4 group-data-[state=indeterminate]/checkbox:hidden" />
        <Minus aria-hidden="true" strokeWidth={1.5} className="hidden size-4 group-data-[state=indeterminate]/checkbox:block" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
