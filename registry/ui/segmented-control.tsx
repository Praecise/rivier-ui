"use client";
/**
 * @name segmented-control
 * @category ui
 * @description A row of two to five segments where exactly one is chosen, with a marker that slides to the choice.
 * @when Switching one setting between a few short, equal options that take effect at once: a view (list or map), a unit, a period (day, week, month). It is a radio group, so one option is always chosen. For switching panels of content use tabs; for options that can each be on or off use toggle-group or chip; for more than five options use select.
 * @example
 * <SegmentedControl defaultValue="list" aria-label="View">
 *   <SegmentedControlItem value="list">List</SegmentedControlItem>
 *   <SegmentedControlItem value="map">Map</SegmentedControlItem>
 * </SegmentedControl>
 *
 * // Controlled, full width, with icons
 * <SegmentedControl value={period} onValueChange={setPeriod} aria-label="Period" className="w-full">
 *   <SegmentedControlItem value="day"><Sun /> Day</SegmentedControlItem>
 *   <SegmentedControlItem value="week"><Calendar /> Week</SegmentedControlItem>
 * </SegmentedControl>
 */
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { createContext, use, useId, type ComponentProps } from "react";
import { Morph, MorphGroup } from "@/components/motion/layout-transition";
import { cn } from "@/lib/cn";
import { DURATION, EASE } from "@/lib/motion";

type SegmentedSize = "sm" | "md";

const SegmentedContext = createContext<{ size: SegmentedSize }>({ size: "md" });

export type SegmentedControlProps = Omit<ComponentProps<typeof RadioGroupPrimitive.Root>, "orientation"> & {
  /** "md" (default) is the height of a control; "sm" is for toolbars and dense rows. */
  size?: SegmentedSize;
};

/**
 * A radio group laid out as one control: Left and Right arrows (the other way round in right-to-left pages)
 * move the choice, Tab enters and leaves it. Segments share the width equally, so the control can be set to
 * `w-full`. Name it with `aria-label` or `aria-labelledby`. `value`, `defaultValue` and `onValueChange`
 * control it; give a `defaultValue`, because a segmented control with nothing chosen reads as broken.
 */
export function SegmentedControl({ className, size = "md", children, ...props }: SegmentedControlProps) {
  const id = useId();
  return (
    <RadioGroupPrimitive.Root
      data-slot="segmented-control"
      orientation="horizontal"
      className={cn(
        "inline-grid w-fit max-w-full auto-cols-fr grid-flow-col gap-1 rounded-control border border-input bg-muted p-1 data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <SegmentedContext value={{ size }}>
        <MorphGroup id={id}>{children}</MorphGroup>
      </SegmentedContext>
    </RadioGroupPrimitive.Root>
  );
}

export type SegmentedControlItemProps = ComponentProps<typeof RadioGroupPrimitive.Item>;

/**
 * One segment. The marker behind the chosen one is a shared element that slides from the previous choice
 * (transform only; it simply appears in place under reduced motion). The chosen segment is told apart by
 * its ground and edge as well as its weight, not by colour alone.
 */
export function SegmentedControlItem({ className, children, ...props }: SegmentedControlItemProps) {
  const { size } = use(SegmentedContext);
  return (
    <RadioGroupPrimitive.Item
      data-slot="segmented-control-item"
      className={cn(
        "group/segment relative inline-flex min-w-0 items-center justify-center rounded-[calc(var(--radius-control)-0.125rem)] px-3 text-sm text-muted-foreground transition-colors duration-instant ease-out select-none hover:text-foreground disabled:pointer-events-none disabled:opacity-50 data-[state=checked]:font-medium data-[state=checked]:text-foreground motion-reduce:transition-none",
        size === "sm" ? "h-[calc(var(--control-h-sm)-0.625rem)] pointer-coarse:h-[calc(var(--control-h)-0.625rem)]" : "h-[calc(var(--control-h)-0.625rem)]",
        className,
      )}
      {...props}
    >
      {/* Rendered only in the chosen segment: the same layoutId appearing in another segment is what slides. */}
      <RadioGroupPrimitive.Indicator asChild>
        <Morph
          layoutId="marker"
          aria-hidden="true"
          data-slot="segmented-control-marker"
          transition={{ duration: DURATION.base, ease: EASE }}
          className="absolute inset-0 rounded-[inherit] border border-border-strong bg-background"
        />
      </RadioGroupPrimitive.Indicator>
      <span className="relative inline-flex min-w-0 items-center gap-2 truncate [&_svg]:size-4 [&_svg]:shrink-0">{children}</span>
    </RadioGroupPrimitive.Item>
  );
}
