"use client";
/**
 * @name chip
 * @category ui
 * @description A small pill for one short value: a filter that is on and can be removed, a suggestion to press, or one of a set of choices that can be switched on and off.
 * @when Filters in effect above a list (Chip with ChipRemove), suggested replies or refinements under a message or a search (ChipButton), and choosing one or several short options such as moods, tags or times of day (ChipGroup). For a status that cannot be pressed use badge; for two to five views of the same thing use segmented-control; for long labels use checkboxes or radio-group.
 * @example
 * // Filters in effect
 * <Chip>Under 50 <ChipRemove aria-label="Remove the filter: under 50" onClick={clearPrice} /></Chip>
 *
 * // Suggestions
 * <ChipButton onClick={() => ask("Only this weekend")}>Only this weekend</ChipButton>
 *
 * // A set of choices: several can be on (type="multiple") or one (type="single")
 * <ChipGroup type="multiple" defaultValue={["calm"]} aria-label="Mood">
 *   <ChipGroupItem value="calm">Calm</ChipGroupItem>
 *   <ChipGroupItem value="lively">Lively</ChipGroupItem>
 * </ChipGroup>
 */
import { Slot, ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { Check, X } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export const chipVariants = cva(
  "inline-flex h-control-sm max-w-full shrink-0 items-center gap-1.5 rounded-control border px-3 text-sm font-medium whitespace-nowrap text-foreground select-none [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        outline: "border-border-strong bg-background",
        soft: "border-transparent bg-highlight-soft",
        muted: "border-transparent bg-muted",
      },
      /** A chip that can be pressed: a hover ground, a press, and a taller target on touch screens. */
      interactive: {
        true: "cursor-pointer transition-[background-color,border-color,color,opacity,scale] duration-instant ease-out hover:bg-accent active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100 pointer-coarse:h-control",
        false: "",
      },
    },
    defaultVariants: { variant: "outline", interactive: false },
  },
);

export type ChipProps = ComponentProps<"span"> &
  Pick<VariantProps<typeof chipVariants>, "variant"> & {
    /** Render the child element (a link, for example) with the chip's look. */
    asChild?: boolean;
  };

/** A chip that only shows a value. Put a ChipRemove inside to make it removable. */
export function Chip({ className, variant, asChild = false, ...props }: ChipProps) {
  const Comp = asChild ? Slot.Root : "span";
  return <Comp data-slot="chip" className={cn(chipVariants({ variant }), "has-data-[slot=chip-remove]:pe-1", className)} {...props} />;
}

export type ChipRemoveProps = Omit<ComponentProps<"button">, "type">;

/**
 * The cross that removes a chip. Give it an `aria-label` that says what it removes ("Remove the filter:
 * under 50"): the default is only "Remove". After removing, move focus to the next chip's cross or to the
 * control that added it, so that keyboard focus is not lost with the chip.
 */
export function ChipRemove({ className, children, "aria-label": ariaLabel = "Remove", ...props }: ChipRemoveProps) {
  return (
    <button
      type="button"
      data-slot="chip-remove"
      aria-label={ariaLabel}
      className={cn(
        "relative inline-flex size-6 shrink-0 items-center justify-center rounded-control text-muted-foreground transition-[background-color,color] duration-instant ease-out after:absolute after:-inset-2 hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none",
        className,
      )}
      {...props}
    >
      {children ?? <X aria-hidden="true" strokeWidth={1.5} />}
    </button>
  );
}

export type ChipButtonProps = ComponentProps<"button"> & Pick<VariantProps<typeof chipVariants>, "variant">;

/** A chip that does something when pressed: a suggestion, a quick reply, "show more". */
export function ChipButton({ className, variant, type = "button", ...props }: ChipButtonProps) {
  return <button type={type} data-slot="chip-button" className={cn(chipVariants({ variant, interactive: true }), className)} {...props} />;
}

export type ChipGroupProps = ComponentProps<typeof ToggleGroupPrimitive.Root>;

/**
 * A set of chips to choose from. `type="multiple"` lets several be on (each is a toggle button);
 * `type="single"` lets one be on (each is a radio). Arrow keys move between chips, Space or Enter switches
 * one. The chips wrap onto more lines; name the group with `aria-label` or `aria-labelledby`. `value`,
 * `defaultValue` and `onValueChange` control it: a string for "single", an array for "multiple".
 */
export function ChipGroup({ className, ...props }: ChipGroupProps) {
  // Radix calls a set of toggles a toolbar; a set of choices is a plain group.
  const role = props.role ?? (props.type === "multiple" ? "group" : "radiogroup");
  return <ToggleGroupPrimitive.Root data-slot="chip-group" className={cn("flex max-w-full flex-wrap gap-2", className)} {...props} role={role} />;
}

export type ChipGroupItemProps = ComponentProps<typeof ToggleGroupPrimitive.Item>;

/** One choice. When on it takes the soft highlight and shows a tick, so that the state is not carried by colour alone. */
export function ChipGroupItem({ className, children, ...props }: ChipGroupItemProps) {
  return (
    <ToggleGroupPrimitive.Item
      data-slot="chip-group-item"
      className={cn(
        chipVariants({ variant: "outline", interactive: true }),
        "group/chip data-[state=on]:border-primary data-[state=on]:bg-highlight-soft data-[state=on]:hover:bg-highlight-soft",
        className,
      )}
      {...props}
    >
      <Check aria-hidden="true" strokeWidth={2} className="hidden group-data-[state=on]/chip:block" />
      {children}
    </ToggleGroupPrimitive.Item>
  );
}
