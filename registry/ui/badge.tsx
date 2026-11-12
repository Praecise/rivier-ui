/**
 * @name badge
 * @category ui
 * @description A small label for a status, a count or a category. Six variants and an optional leading dot.
 * @when Marking a state or a tag next to other content. It is not clickable: for a removable or selectable chip use a button with size "sm".
 * @example
 * <Badge>New</Badge>
 * <Badge variant="soft">Beta</Badge>
 * <Badge variant="success" dot>Live</Badge>
 * <Badge variant="outline">Draft</Badge>
 */
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export const badgeVariants = cva(
  "inline-flex h-6 w-fit shrink-0 items-center gap-1.5 whitespace-nowrap rounded-control border border-transparent px-2 text-xs font-medium [&_svg]:size-3 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        solid: "bg-primary text-primary-foreground",
        soft: "bg-highlight-soft text-foreground",
        outline: "border-border-strong bg-background text-foreground",
        success: "bg-success text-success-foreground",
        warning: "bg-warning text-warning-foreground",
        destructive: "bg-destructive text-destructive-foreground",
      },
    },
    defaultVariants: { variant: "solid" },
  },
);

export type BadgeProps = ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    /** A small dot before the label. Decoration only: the label must still say the state. */
    dot?: boolean;
  };

export function Badge({ className, variant, dot = false, children, ...props }: BadgeProps) {
  return (
    <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot ? <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}
