"use client";
/**
 * @name label
 * @category ui
 * @description The text name of a control. Clicking it focuses or toggles the control it points to.
 * @when Every control needs one. Point it at a control with htmlFor, or wrap a checkbox, radio or switch in it so the whole row is the hit area. Inside field, use FieldLabel, which wires htmlFor for you.
 * @example
 * <Label htmlFor="email">Email</Label>
 * <Input id="email" type="email" />
 * <Label><Checkbox /> Remember me</Label>
 */
import { Label as LabelPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function Label({ className, ...props }: ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm font-medium leading-tight text-foreground select-none peer-disabled:pointer-events-none peer-disabled:opacity-50 has-disabled:pointer-events-none has-disabled:opacity-50 has-data-disabled:pointer-events-none has-data-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
