"use client";
/**
 * @name select
 * @category ui
 * @description A themed dropdown for choosing one value from a list, with groups, labels and separators. Never a native select.
 * @when Picking one of more than about five options, or when space is tight. For two to five visible options use radio-group; for a short row of icons use toggle-group.
 * @example
 * <Select defaultValue="eur">
 *   <SelectTrigger aria-label="Currency" className="w-48">
 *     <SelectValue placeholder="Currency" />
 *   </SelectTrigger>
 *   <SelectContent>
 *     <SelectGroup>
 *       <SelectLabel>Europe</SelectLabel>
 *       <SelectItem value="eur">Euro</SelectItem>
 *       <SelectItem value="sek">Swedish krona</SelectItem>
 *     </SelectGroup>
 *     <SelectSeparator />
 *     <SelectGroup>
 *       <SelectLabel>Americas</SelectLabel>
 *       <SelectItem value="usd">US dollar</SelectItem>
 *       <SelectItem value="cad" disabled>Canadian dollar</SelectItem>
 *     </SelectGroup>
 *   </SelectContent>
 * </Select>
 */
import { Select as SelectPrimitive } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/** Holds the value. Takes `value`/`defaultValue`/`onValueChange`, `name` for forms, `disabled`, `required`. */
export function Select(props: ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root {...props} />;
}

export function SelectGroup({ className, ...props }: ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" className={cn("flex flex-col", className)} {...props} />;
}

/** Shows the chosen item's text, or `placeholder` when nothing is chosen. */
export function SelectValue({ className, ...props }: ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" className={cn("min-w-0 truncate", className)} {...props} />;
}

export const selectTriggerVariants = cva(
  "flex w-full min-w-0 items-center justify-between gap-2 rounded-control border border-input bg-background text-start text-sm whitespace-nowrap text-foreground transition-[border-color,opacity] duration-instant ease-out select-none disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive data-[placeholder]:text-muted-foreground motion-reduce:transition-none",
  {
    variants: {
      size: {
        sm: "h-control-sm px-2.5",
        md: "h-control px-3",
        lg: "h-control-lg px-4 text-base",
      },
    },
    defaultVariants: { size: "md" },
  },
);

export type SelectTriggerProps = ComponentProps<typeof SelectPrimitive.Trigger> & VariantProps<typeof selectTriggerVariants>;

export function SelectTrigger({ className, size, children, ...props }: SelectTriggerProps) {
  return (
    <SelectPrimitive.Trigger data-slot="select-trigger" className={cn(selectTriggerVariants({ size }), className)} {...props}>
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown aria-hidden="true" strokeWidth={1.5} className="size-4 shrink-0 text-muted-foreground" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

const scrollButton = "flex h-6 cursor-default items-center justify-center text-muted-foreground";

/** The list. `position="popper"` (default) opens below the trigger at its width; "item-aligned" covers the trigger. */
export function SelectContent({ className, children, position = "popper", sideOffset = 4, ...props }: ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        position={position}
        sideOffset={sideOffset}
        className={cn(
          "relative z-50 max-h-(--radix-select-content-available-height) min-w-32 origin-(--radix-select-content-transform-origin) overflow-hidden rounded-surface border bg-popover text-popover-foreground animation-duration-[var(--duration-base)] ease-out data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 motion-reduce:animate-none",
          className,
        )}
        {...props}
      >
        <SelectPrimitive.ScrollUpButton data-slot="select-scroll-up" className={scrollButton}>
          <ChevronUp aria-hidden="true" strokeWidth={1.5} className="size-4" />
        </SelectPrimitive.ScrollUpButton>
        <SelectPrimitive.Viewport
          className={cn("p-1", position === "popper" && "w-full min-w-(--radix-select-trigger-width) scroll-my-1")}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectPrimitive.ScrollDownButton data-slot="select-scroll-down" className={scrollButton}>
          <ChevronDown aria-hidden="true" strokeWidth={1.5} className="size-4" />
        </SelectPrimitive.ScrollDownButton>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

/** A heading inside a SelectGroup. */
export function SelectLabel({ className, ...props }: ComponentProps<typeof SelectPrimitive.Label>) {
  return <SelectPrimitive.Label data-slot="select-label" className={cn("px-2 py-1.5 text-xs font-medium text-muted-foreground", className)} {...props} />;
}

/** One option. The highlighted option is shown by its ground, which is its focus indicator. */
export function SelectItem({ className, children, ...props }: ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex min-h-9 w-full cursor-default items-center rounded-control py-1.5 ps-2 pe-8 text-sm outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground pointer-coarse:min-h-10",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <span className="absolute end-2 flex size-4 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check aria-hidden="true" strokeWidth={1.5} className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
    </SelectPrimitive.Item>
  );
}

export function SelectSeparator({ className, ...props }: ComponentProps<typeof SelectPrimitive.Separator>) {
  return <SelectPrimitive.Separator data-slot="select-separator" className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />;
}
