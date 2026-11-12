"use client";
/**
 * @name input-group
 * @category ui
 * @description An input with a leading or trailing icon, text or button inside one shared border.
 * @when A search box with an icon, a URL with a fixed prefix, a field with a unit or an inline action. For a plain input use input. Inside a field, wrap InputGroupInput (not the group) in FieldControl.
 * @example
 * <InputGroup>
 *   <InputGroupAddon><Search strokeWidth={1.5} /></InputGroupAddon>
 *   <InputGroupInput type="search" placeholder="Search" aria-label="Search" />
 * </InputGroup>
 * <InputGroup size="sm">
 *   <InputGroupAddon>https://</InputGroupAddon>
 *   <InputGroupInput placeholder="example.com" aria-label="Website" />
 *   <InputGroupAddon><InputGroupButton>Check</InputGroupButton></InputGroupAddon>
 * </InputGroup>
 */
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export const inputGroupVariants = cva(
  "flex w-full min-w-0 items-center rounded-control border border-input bg-background text-sm text-foreground outline-offset-2 outline-ring transition-[border-color,opacity] duration-instant ease-out has-[[data-slot=input-group-control]:focus-visible]:outline-2 has-[[data-slot=input-group-control]:disabled]:pointer-events-none has-[[data-slot=input-group-control]:disabled]:opacity-50 has-[[data-slot=input-group-control][aria-invalid=true]]:border-destructive motion-reduce:transition-none",
  {
    variants: {
      size: {
        sm: "h-control-sm",
        md: "h-control",
        lg: "h-control-lg text-base",
      },
    },
    defaultVariants: { size: "md" },
  },
);

export type InputGroupProps = ComponentProps<"div"> & VariantProps<typeof inputGroupVariants>;

/** The shared border. Children in order: addons before and/or after one InputGroupInput. */
export function InputGroup({ className, size, ...props }: InputGroupProps) {
  return <div data-slot="input-group" role="group" className={cn(inputGroupVariants({ size }), className)} {...props} />;
}

/** The input itself. It has no border of its own: the group draws the edge and the focus ring. */
export function InputGroupInput({ className, type = "text", ...props }: ComponentProps<"input">) {
  return (
    <input
      data-slot="input-group-control"
      type={type}
      className={cn(
        "h-full min-w-0 flex-1 rounded-control bg-transparent px-3 text-inherit placeholder:text-muted-foreground focus-visible:outline-none disabled:pointer-events-none",
        className,
      )}
      {...props}
    />
  );
}

/** An icon, short text or a button at either end. Place it before the input to lead, after it to trail. */
export function InputGroupAddon({ className, onClick, ...props }: ComponentProps<"div">) {
  function focusControl(event: MouseEvent<HTMLDivElement>) {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (event.target instanceof Element && event.target.closest("button, a, input, select, textarea")) return;
    event.currentTarget.parentElement?.querySelector<HTMLElement>("[data-slot=input-group-control]")?.focus();
  }
  return (
    <div
      data-slot="input-group-addon"
      onClick={focusControl}
      className={cn(
        "flex h-full shrink-0 items-center gap-2 whitespace-nowrap text-muted-foreground select-none first:ps-3 first:-me-1 last:pe-3 last:-ms-1 first:has-[button]:ps-1 last:has-[button]:pe-1 [&_svg]:size-4 [&_svg]:shrink-0",
        className,
      )}
      {...props}
    />
  );
}

/**
 * A button that fits inside the group's edge: its height follows the group, so it takes no `size`. Ghost by
 * default; an invisible margin keeps its touch target 40px tall. Icon-only needs an `aria-label`.
 */
export function InputGroupButton({ className, variant = "ghost", type = "button", ...props }: Omit<ComponentProps<typeof Button>, "size">) {
  return (
    <Button
      data-slot="input-group-button"
      type={type}
      variant={variant}
      size={null}
      className={cn("relative h-[calc(100%-0.375rem)] min-w-7 px-2.5 after:absolute after:inset-x-0 after:-inset-y-2", className)}
      {...props}
    />
  );
}
