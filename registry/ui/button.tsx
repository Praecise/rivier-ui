/**
 * @name button
 * @category ui
 * @description A button, or a link that looks like one. Five variants, three sizes, a loading state.
 * @when Any action. One "solid" per view for the main action; "outline" or "ghost" for the rest; "destructive" only for deleting.
 * @example
 * <Button>Save</Button>
 * <Button variant="outline" size="sm">Cancel</Button>
 * <Button asChild><a href="/pricing">See pricing</a></Button>
 * <Button loading>Saving</Button>
 */
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-control text-sm font-medium transition-[background-color,border-color,color,opacity,scale] duration-instant ease-out select-none active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 aria-busy:pointer-events-none motion-reduce:transition-none motion-reduce:active:scale-100 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        solid: "bg-primary text-primary-foreground hover:opacity-90",
        outline: "border border-border-strong bg-background text-foreground hover:bg-accent",
        soft: "bg-highlight-soft text-foreground hover:opacity-85",
        ghost: "text-foreground hover:bg-accent",
        destructive: "bg-destructive text-destructive-foreground hover:opacity-90",
        link: "h-auto rounded-none px-0 text-foreground underline underline-offset-4 hover:opacity-70",
      },
      size: {
        sm: "h-control-sm px-3",
        md: "h-control px-4",
        lg: "h-control-lg px-6 text-base",
        icon: "size-(--control-h) px-0",
      },
    },
    compoundVariants: [{ variant: "link", class: "h-auto px-0" }],
    defaultVariants: { variant: "solid", size: "md" },
  },
);

export type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    /** Render the child element (a link, for example) with the button's look. */
    asChild?: boolean;
    /** Shows a spinner and blocks clicks. The label stays, so the width does not jump. */
    loading?: boolean;
  };

export function Button({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      aria-busy={loading || undefined}
      disabled={asChild ? undefined : disabled || loading}
      {...props}
    >
      {loading && !asChild ? (
        <>
          <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none" />
          {children}
        </>
      ) : (
        children
      )}
    </Comp>
  );
}
