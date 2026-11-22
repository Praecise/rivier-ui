/**
 * @name pattern
 * @category layout
 * @description A quiet background of dots, a grid or diagonal lines drawn in the theme's hairline colour, filling the box it sits in, behind the content and hidden from screen readers.
 * @when A section or a card that needs a texture to set it apart without a colour or a gradient: a hero, an empty state, a canvas. Keep it faint; for a photograph or an illustration use an image.
 * @example
 * <section className="relative overflow-hidden">
 *   <Pattern variant="grid" />
 *   <h2 className="relative">Plans</h2>
 * </section>
 */
import { useId, type ComponentProps } from "react";
import { cn } from "@/lib/cn";

export type PatternProps = Omit<ComponentProps<"svg">, "children"> & {
  variant?: "dots" | "grid" | "lines";
  /** The distance between marks in pixels. Default 20. */
  size?: number;
};

export function Pattern({ variant = "dots", size = 20, className, ...props }: PatternProps) {
  const id = `pattern-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <svg data-slot="pattern" aria-hidden="true" className={cn("pointer-events-none absolute inset-0 -z-10 size-full", className)} {...props}>
      <defs>
        <pattern id={id} width={size} height={size} patternUnits="userSpaceOnUse">
          {variant === "dots" ? <circle cx={size / 2} cy={size / 2} r={1} className="fill-border-strong" /> : null}
          {variant === "grid" ? <path d={`M${size} 0V${size}H0`} fill="none" className="stroke-border" strokeWidth={1} /> : null}
          {variant === "lines" ? <path d={`M0 ${size}L${size} 0`} fill="none" className="stroke-border" strokeWidth={1} /> : null}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}
