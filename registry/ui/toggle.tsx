"use client";
/**
 * @name toggle
 * @category ui
 * @description A button that stays pressed: on or off.
 * @when A toolbar state such as bold, mute or pin. For a setting use switch; for several toggles that belong together, or a pick-one row, use toggle-group.
 * @example
 * <Toggle aria-label="Italic"><Italic strokeWidth={1.5} /></Toggle>
 * <Toggle variant="outline" size="sm" defaultPressed>Pinned</Toggle>
 */
import { Toggle as TogglePrimitive } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export const toggleVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-control text-sm font-medium text-foreground transition-[background-color,border-color,color,opacity] duration-instant ease-out select-none disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive data-[state=off]:hover:bg-accent data-[state=on]:bg-primary data-[state=on]:text-primary-foreground motion-reduce:transition-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        ghost: "border border-transparent",
        outline: "border border-input bg-background data-[state=on]:border-primary",
      },
      size: {
        sm: "h-control-sm min-w-(--control-h-sm) px-2",
        md: "h-control min-w-(--control-h) px-2.5",
        lg: "h-control-lg min-w-(--control-h-lg) px-3 text-base",
      },
    },
    defaultVariants: { variant: "ghost", size: "md" },
  },
);

export type ToggleProps = ComponentProps<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants>;

export function Toggle({ className, variant, size, ...props }: ToggleProps) {
  return <TogglePrimitive.Root data-slot="toggle" className={cn(toggleVariants({ variant, size }), className)} {...props} />;
}
