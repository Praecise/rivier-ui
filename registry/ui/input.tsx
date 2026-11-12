/**
 * @name input
 * @category ui
 * @description A single-line text input in three sizes, with an invalid state.
 * @when Short free text: a name, an email, a number. Wrap it in field for a label and an error; use textarea for several lines, select for a fixed list, input-group to add an icon or a button inside the edge.
 * @example
 * <Input type="email" placeholder="you@example.com" />
 * <Input size="sm" defaultValue="Rivier" />
 * <Input aria-invalid="true" aria-label="Email" defaultValue="not-an-email" />
 */
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export const inputVariants = cva(
  "w-full min-w-0 rounded-control border border-input bg-background text-sm text-foreground transition-[border-color,opacity] duration-instant ease-out placeholder:text-muted-foreground disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive motion-reduce:transition-none",
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

/** `size` is the control's height (sm, md, lg), not the native character-width attribute. */
export type InputProps = Omit<ComponentProps<"input">, "size"> & VariantProps<typeof inputVariants>;

export function Input({ className, size, type = "text", ...props }: InputProps) {
  return (
    <input
      data-slot="input"
      type={type}
      className={cn(
        inputVariants({ size }),
        "file:me-3 file:h-full file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        className,
      )}
      {...props}
    />
  );
}
