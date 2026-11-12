"use client";
/**
 * @name slot-picker
 * @category ui
 * @description Offered times as a set of pills to choose one from, optionally under named groups, each able to carry a note and to be unavailable for a stated reason.
 * @when The times are a short list that someone else decides: appointment slots, sittings, departures. One is chosen, so it is a radio group. For any time of the person's own choosing use time-picker; for more than about twenty slots, narrow them first (by day, by part of the day) or use select.
 * @example
 * <SlotPicker defaultValue="10:00" aria-label="Time" locale="en-GB">
 *   <SlotPickerGroup label="Morning">
 *     <SlotPickerItem value="09:30" />
 *     <SlotPickerItem value="10:00" note="2 places left" />
 *     <SlotPickerItem value="11:30" unavailable="Full" />
 *   </SlotPickerGroup>
 *   <SlotPickerGroup label="Afternoon">
 *     <SlotPickerItem value="14:00" />
 *   </SlotPickerGroup>
 * </SlotPicker>
 *
 * // Controlled, with its own labels, and nothing on offer
 * <SlotPicker value={slot} onValueChange={setSlot} aria-label="Sitting">
 *   {sittings.length === 0 ? <SlotPickerEmpty>Nothing is open on this day.</SlotPickerEmpty> : null}
 *   {sittings.map((sitting) => <SlotPickerItem key={sitting.id} value={sitting.id}>{sitting.name}</SlotPickerItem>)}
 * </SlotPicker>
 */
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { Check } from "lucide-react";
import { createContext, use, useId, useMemo, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/cn";

const SlotPickerContext = createContext<{ format: (value: string) => string }>({ format: (value) => value });

export type SlotPickerProps = Omit<ComponentProps<typeof RadioGroupPrimitive.Root>, "orientation"> & {
  /** The language tag used to write a slot whose value is a time ("14:00" becomes "2:00 pm" where that is the custom). Default "en". */
  locale?: string;
};

/**
 * A radio group: Tab reaches the chosen slot (or the first), arrow keys move through the slots and choose
 * as they go (Left and Right the other way round in right-to-left pages), and an unavailable slot can be
 * reached, so that its reason is read, but not chosen. `value`, `defaultValue` and `onValueChange` control
 * it; `name` submits it with a form. Name the group with `aria-label` or `aria-labelledby`.
 */
export function SlotPicker({ className, locale = "en", ...props }: SlotPickerProps) {
  const format = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(locale, { timeStyle: "short", timeZone: "UTC" });
    return (value: string): string => {
      const time = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
      return time ? formatter.format(Date.UTC(1970, 0, 1, Number(time[1]), Number(time[2]))) : value;
    };
  }, [locale]);
  return (
    <SlotPickerContext value={{ format }}>
      <RadioGroupPrimitive.Root data-slot="slot-picker" className={cn("flex max-w-full flex-col gap-4", className)} {...props} />
    </SlotPickerContext>
  );
}

export type SlotPickerGroupProps = Omit<ComponentProps<"div">, "label"> & {
  /** The group's name ("Morning"). Leave it out for one unnamed set of slots. */
  label?: ReactNode;
};

/** A set of slots that wraps onto more lines, under a name when one is given. Slots outside any group need one too, for the layout. */
export function SlotPickerGroup({ className, label, children, ...props }: SlotPickerGroupProps) {
  const id = useId();
  return (
    <div data-slot="slot-picker-group" role={label ? "group" : undefined} aria-labelledby={label ? id : undefined} className={cn("flex flex-col gap-2", className)} {...props}>
      {label ? (
        <div id={id} data-slot="slot-picker-group-label" className="text-sm font-medium text-muted-foreground">
          {label}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export type SlotPickerItemProps = Omit<ComponentProps<typeof RadioGroupPrimitive.Item>, "disabled"> & {
  /** A few words under the time: places left, a price. */
  note?: ReactNode;
  /** Makes the slot impossible to choose. Pass the reason ("Full"): it is shown and read. */
  unavailable?: boolean | string;
};

/**
 * One slot. Its text is its children, or its value written as a time for the locale when the value is
 * "HH:mm". The chosen slot has a tick and a stronger edge as well as its ground; an unavailable one is
 * struck through and says why.
 */
export function SlotPickerItem({ className, value, children, note, unavailable = false, onClick, ...props }: SlotPickerItemProps) {
  const { format } = use(SlotPickerContext);
  const blocked = unavailable !== false;
  return (
    <RadioGroupPrimitive.Item
      data-slot="slot-picker-item"
      data-unavailable={blocked ? "" : undefined}
      value={value}
      aria-disabled={blocked || undefined}
      onClick={(event) => {
        onClick?.(event);
        // Stops the choice (also when an arrow key lands here) while leaving the slot focusable.
        if (blocked) event.preventDefault();
      }}
      className={cn(
        "group/slot relative inline-flex min-h-(--control-h) min-w-20 flex-col items-center justify-center rounded-control border border-input bg-background px-3 py-1 text-sm text-foreground transition-[background-color,border-color,color,scale] duration-instant ease-out select-none hover:bg-accent active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100",
        "data-[state=checked]:border-primary data-[state=checked]:bg-highlight-soft data-[state=checked]:hover:bg-highlight-soft",
        "data-unavailable:cursor-not-allowed data-unavailable:border-border data-unavailable:bg-muted data-unavailable:hover:bg-muted data-unavailable:active:scale-100",
        className,
      )}
      {...props}
    >
      <span className="inline-flex items-center gap-1.5 font-medium tabular-nums group-data-unavailable/slot:line-through">
        <Check aria-hidden="true" strokeWidth={2} className="hidden size-3.5 shrink-0 group-data-[state=checked]/slot:block" />
        {/* Isolated, so a time keeps its own order inside text of the other direction. */}
        {children ?? <bdi>{format(value)}</bdi>}
      </span>
      {note || typeof unavailable === "string" ? (
        <span data-slot="slot-picker-note" className="text-xs text-muted-foreground">
          {typeof unavailable === "string" ? unavailable : note}
        </span>
      ) : null}
    </RadioGroupPrimitive.Item>
  );
}

/** What to say when there is nothing to choose from. */
export function SlotPickerEmpty({ className, ...props }: ComponentProps<"p">) {
  return <p data-slot="slot-picker-empty" className={cn("text-sm text-muted-foreground", className)} {...props} />;
}
