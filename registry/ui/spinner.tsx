/**
 * @name spinner
 * @category ui
 * @description A turning ring that says something is in progress, announced to assistive technology by its label.
 * @when A short wait of unknown length. Inside a button use the button's `loading` prop; when the shape of the content is known use skeleton; when the amount done is known use progress.
 * @example
 * <Spinner />
 * <Spinner size="lg" label="Loading projects" />
 * <p className="flex items-center gap-2"><Spinner size="sm" label="Saving" /> Saving</p>
 */
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export const spinnerVariants = cva("inline-flex shrink-0 align-middle text-current", {
  variants: {
    size: {
      sm: "size-4 [--spinner-ring:2px]",
      md: "size-5 [--spinner-ring:2px]",
      lg: "size-8 [--spinner-ring:3px]",
    },
  },
  defaultVariants: { size: "md" },
});

export type SpinnerProps = Omit<ComponentProps<"span">, "children"> &
  VariantProps<typeof spinnerVariants> & {
    /** What is happening, for screen readers. Defaults to "Loading". */
    label?: string;
  };

/** The ring takes the text colour. Under reduced motion it stands still; the label still announces the wait. */
export function Spinner({ className, size, label = "Loading", ...props }: SpinnerProps) {
  return (
    <span data-slot="spinner" role="status" className={cn(spinnerVariants({ size }), className)} {...props}>
      <span
        aria-hidden="true"
        className="size-full animate-spin rounded-full border-(length:--spinner-ring) border-current border-e-transparent motion-reduce:animate-none"
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
