/**
 * @name textarea
 * @category ui
 * @description A multi-line text input that grows with its content, with an invalid state.
 * @when Free text of more than one line: a message, a note, a description. Wrap it in field for a label and an error; use input for a single line.
 * @example
 * <Textarea placeholder="Tell us about the project" rows={4} />
 * <Textarea aria-invalid="true" aria-label="Message" defaultValue="Too short" />
 */
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "field-sizing-content block min-h-20 w-full min-w-0 rounded-control border border-input bg-background px-3 py-2 text-sm text-foreground transition-[border-color,opacity] duration-instant ease-out placeholder:text-muted-foreground disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive motion-reduce:transition-none",
        className,
      )}
      {...props}
    />
  );
}
