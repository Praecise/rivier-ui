"use client";
/**
 * @name toggle-group
 * @category ui
 * @description A joined row of toggles where one (type="single") or several (type="multiple") are on.
 * @when A compact choice between a few short options or icons: alignment, a view switcher, text styles. For options with longer labels use radio-group (one) or checkboxes (several); for switching panels use tabs.
 * @example
 * <ToggleGroup type="single" defaultValue="grid" aria-label="View" variant="outline">
 *   <ToggleGroupItem value="grid">Grid</ToggleGroupItem>
 *   <ToggleGroupItem value="list">List</ToggleGroupItem>
 * </ToggleGroup>
 * <ToggleGroup type="multiple" aria-label="Text style" size="sm">
 *   <ToggleGroupItem value="italic" aria-label="Italic"><Italic strokeWidth={1.5} /></ToggleGroupItem>
 *   <ToggleGroupItem value="underline" aria-label="Underline"><Underline strokeWidth={1.5} /></ToggleGroupItem>
 * </ToggleGroup>
 */
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import type { VariantProps } from "class-variance-authority";
import { createContext, use, type ComponentProps } from "react";
import { toggleVariants } from "@/components/ui/toggle";
import { cn } from "@/lib/cn";

type ToggleGroupLook = VariantProps<typeof toggleVariants>;

const ToggleGroupContext = createContext<ToggleGroupLook>({});

export type ToggleGroupProps = ComponentProps<typeof ToggleGroupPrimitive.Root> & ToggleGroupLook;

/** `variant` and `size` set the look of every item. `type` ("single" or "multiple") is required. */
export function ToggleGroup({ className, variant, size, children, ...props }: ToggleGroupProps) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      data-layout={props.orientation === "vertical" ? "vertical" : "horizontal"}
      className={cn("group/toggle-group inline-flex w-fit max-w-full items-stretch rounded-control data-[layout=vertical]:flex-col", className)}
      {...props}
    >
      <ToggleGroupContext value={{ variant, size }}>{children}</ToggleGroupContext>
    </ToggleGroupPrimitive.Root>
  );
}

export type ToggleGroupItemProps = ComponentProps<typeof ToggleGroupPrimitive.Item> & ToggleGroupLook;

/** Takes the group's `variant` and `size`. Items share edges: only the group's outer corners are rounded. */
export function ToggleGroupItem({ className, variant, size, ...props }: ToggleGroupItemProps) {
  const group = use(ToggleGroupContext);
  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      className={cn(
        toggleVariants({ variant: group.variant ?? variant, size: group.size ?? size }),
        "relative focus-visible:z-10 data-[state=on]:z-[1]",
        "group-data-[layout=horizontal]/toggle-group:not-first:-ms-px group-data-[layout=horizontal]/toggle-group:not-first:rounded-s-none group-data-[layout=horizontal]/toggle-group:not-last:rounded-e-none",
        "group-data-[layout=vertical]/toggle-group:not-first:-mt-px group-data-[layout=vertical]/toggle-group:not-first:rounded-t-none group-data-[layout=vertical]/toggle-group:not-last:rounded-b-none",
        className,
      )}
      {...props}
    />
  );
}
