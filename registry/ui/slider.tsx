"use client";
/**
 * @name slider
 * @category ui
 * @description A slider for one value, or a range with two thumbs.
 * @when Choosing a number where the rough position matters more than the exact figure: volume, a price range. When the exact number matters use an input with type="number".
 * @example
 * <Slider defaultValue={[40]} max={100} step={5} aria-label="Volume" />
 * <Slider defaultValue={[200, 800]} min={0} max={1000} step={50} thumbLabels={["Lowest price", "Highest price"]} />
 */
import { Slider as SliderPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export type SliderProps = ComponentProps<typeof SliderPrimitive.Root> & {
  /**
   * The accessible name of each thumb, in order. One thumb can be named by `aria-label` or `aria-labelledby`
   * on the slider instead; two thumbs are called "Minimum" and "Maximum" when this is left out.
   */
  thumbLabels?: string[];
};

/** `value` and `defaultValue` are arrays: one number draws one thumb, two draw a range. */
export function Slider({ className, value, defaultValue, thumbLabels, "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy, ...props }: SliderProps) {
  const count = Math.max(1, (value ?? defaultValue ?? [0]).length);
  const single = count === 1;
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      value={value}
      defaultValue={defaultValue}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      className={cn(
        "relative flex touch-none items-center select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[orientation=horizontal]:h-10 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-40 data-[orientation=vertical]:w-10 data-[orientation=vertical]:flex-col",
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className="relative grow overflow-hidden rounded-full bg-border-strong data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5"
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className="absolute bg-primary data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full"
        />
      </SliderPrimitive.Track>
      {Array.from({ length: count }, (_, index) => (
        <SliderPrimitive.Thumb
          key={index}
          data-slot="slider-thumb"
          aria-label={thumbLabels?.[index] ?? (single ? ariaLabel : undefined)}
          aria-labelledby={single && !thumbLabels?.[index] ? ariaLabelledBy : undefined}
          className="relative block size-5 shrink-0 rounded-full border border-primary bg-background transition-transform duration-instant ease-out after:absolute after:-inset-2.5 active:scale-110 motion-reduce:transition-none motion-reduce:active:scale-100"
        />
      ))}
    </SliderPrimitive.Root>
  );
}
