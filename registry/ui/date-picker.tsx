"use client";
/**
 * @name date-picker
 * @category ui
 * @description A button that shows a date, or a range of dates, and opens a calendar in a popover to choose it. Values are "YYYY-MM-DD" strings.
 * @when A date or a stay inside a form or a toolbar, where a calendar that is always open would take too much room. When the calendar is the main thing on the screen use calendar itself. Never the browser's native date input. Name the button by passing `aria-labelledby` with the id of its visible label: the chosen date is added to the name.
 * @example
 * // One day, uncontrolled, submitted with a form as "date"
 * <p id="date-label">Date</p>
 * <DatePicker defaultValue="2026-11-14" name="date" locale="en-GB">
 *   <DatePickerTrigger aria-labelledby="date-label" placeholder="Choose a date" />
 *   <DatePickerCalendar min="2026-11-01" disabled={(day) => (closed.has(day) ? "nothing open" : false)} />
 * </DatePicker>
 *
 * // A range, controlled, two months where there is room
 * const [stay, setStay] = useState<CalendarRange>({ start: null, end: null });
 * <DateRangePicker value={stay} onValueChange={setStay} startName="from" endName="to" locale="en-GB">
 *   <DatePickerTrigger aria-label="Stay" placeholder="Arrival – departure" />
 *   <DatePickerCalendar numberOfMonths={2} />
 * </DateRangePicker>
 */
import { CalendarDays } from "lucide-react";
import { createContext, use, useId, type ComponentProps, type ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Calendar, formatDay, type CalendarOptions, type CalendarRange } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/cn";
import { useControllableState } from "@/lib/use-controllable-state";

type PickerValue = string | null | CalendarRange;

type PickerContextValue = {
  mode: "single" | "range";
  value: PickerValue;
  setValue: (value: PickerValue) => void;
  setOpen: (open: boolean) => void;
  locale: string;
  format: Intl.DateTimeFormatOptions;
  disabled: boolean;
  valueId: string;
};

const PickerContext = createContext<PickerContextValue | null>(null);

function usePicker(part: string): PickerContextValue {
  const context = use(PickerContext);
  if (!context) throw new Error(`<${part}> must be used inside <DatePicker> or <DateRangePicker>.`);
  return context;
}

type PickerCommon = {
  /** Whether the calendar is open. Controlled. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The language tag for the date on the button and, by default, for the calendar. Default "en". */
  locale?: string;
  /** How the date is written on the button: Intl.DateTimeFormat options. Default: the medium date style. */
  format?: Intl.DateTimeFormatOptions;
  disabled?: boolean;
  /** The trigger and the calendar. Default: a DatePickerTrigger and a DatePickerCalendar. */
  children?: ReactNode;
};

function PickerRoot({
  mode,
  value,
  setValue,
  open,
  defaultOpen = false,
  onOpenChange,
  locale = "en",
  format = { dateStyle: "medium" },
  disabled = false,
  children,
  fields,
}: PickerCommon & { mode: "single" | "range"; value: PickerValue; setValue: (value: PickerValue) => void; fields: ReactNode }) {
  const valueId = useId();
  const [isOpen, setOpen] = useControllableState({ value: open, defaultValue: defaultOpen, onChange: onOpenChange });
  return (
    <PickerContext value={{ mode, value, setValue, setOpen, locale, format, disabled, valueId }}>
      <Popover open={isOpen} onOpenChange={setOpen}>
        {children ?? (
          <>
            <DatePickerTrigger />
            <DatePickerCalendar />
          </>
        )}
      </Popover>
      {fields}
    </PickerContext>
  );
}

export type DatePickerProps = PickerCommon & {
  /** The chosen day as "YYYY-MM-DD", or null. Controlled. */
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
  /** The field's name in a form: the day is submitted with it ("" when none is chosen). */
  name?: string;
};

/** One day. The calendar closes when a day is chosen, and focus goes back to the button. */
export function DatePicker({ value, defaultValue = null, onValueChange, name, ...props }: DatePickerProps) {
  const [current, setCurrent] = useControllableState<string | null>({ value, defaultValue, onChange: onValueChange });
  return (
    <PickerRoot
      mode="single"
      value={current}
      setValue={(next) => setCurrent(next as string | null)}
      fields={name ? <input type="hidden" name={name} value={current ?? ""} disabled={props.disabled} /> : null}
      {...props}
    />
  );
}

export type DateRangePickerProps = PickerCommon & {
  /** The chosen range. Either end is null until it is chosen. Controlled. */
  value?: CalendarRange;
  defaultValue?: CalendarRange;
  onValueChange?: (value: CalendarRange) => void;
  /** The names the start and the end are submitted with in a form. */
  startName?: string;
  endName?: string;
};

const EMPTY_RANGE: CalendarRange = { start: null, end: null };

/** A range of days. The first press sets the start, the second the end; then the calendar closes. */
export function DateRangePicker({ value, defaultValue = EMPTY_RANGE, onValueChange, startName, endName, ...props }: DateRangePickerProps) {
  const [current, setCurrent] = useControllableState<CalendarRange>({ value, defaultValue, onChange: onValueChange });
  return (
    <PickerRoot
      mode="range"
      value={current}
      setValue={(next) => setCurrent(next as CalendarRange)}
      fields={
        <>
          {startName ? <input type="hidden" name={startName} value={current.start ?? ""} disabled={props.disabled} /> : null}
          {endName ? <input type="hidden" name={endName} value={current.end ?? ""} disabled={props.disabled} /> : null}
        </>
      }
      {...props}
    />
  );
}

export type DatePickerTriggerProps = Omit<ComponentProps<"button">, "children" | "value"> & {
  /** Shown while nothing is chosen. */
  placeholder?: string;
  /** Shown in place of the end of a range that has only its start. */
  openEnd?: string;
};

/**
 * The button. It shows the chosen date written for the locale, or the placeholder. With `aria-labelledby`
 * (the id of a visible label) its accessible name is the label followed by the date, so that a screen
 * reader says both; with neither that nor `aria-label`, its name is the date or the placeholder alone.
 */
export function DatePickerTrigger({ className, placeholder = "Choose a date", openEnd = "…", "aria-labelledby": labelledBy, "aria-label": ariaLabel, ...props }: DatePickerTriggerProps) {
  const picker = usePicker("DatePickerTrigger");
  let text: string | null = null;
  if (picker.mode === "single") {
    const day = picker.value as string | null;
    text = day ? formatDay(day, picker.locale, picker.format) : null;
  } else {
    const { start, end } = picker.value as CalendarRange;
    if (start && end) {
      const formatter = new Intl.DateTimeFormat(picker.locale, { ...picker.format, timeZone: "UTC" });
      text = formatter.formatRange(Date.parse(`${start}T00:00:00Z`), Date.parse(`${end}T00:00:00Z`));
    } else if (start) {
      text = `${formatDay(start, picker.locale, picker.format)} – ${openEnd}`;
    }
  }
  return (
    <PopoverTrigger asChild>
      <button
        type="button"
        data-slot="date-picker-trigger"
        data-placeholder={text === null ? "" : undefined}
        disabled={picker.disabled}
        aria-labelledby={labelledBy ? `${labelledBy} ${picker.valueId}` : undefined}
        aria-label={ariaLabel && !labelledBy ? `${ariaLabel}: ${text ?? placeholder}` : undefined}
        className={cn(buttonVariants({ variant: "outline" }), "max-w-full min-w-0 justify-start border-input font-normal data-placeholder:text-muted-foreground", className)}
        {...props}
      >
        <CalendarDays aria-hidden="true" strokeWidth={1.5} className="text-muted-foreground" />
        {/* dir="auto": a date keeps its own order inside a page of the other direction. */}
        <span id={picker.valueId} dir="auto" className="truncate">
          {text ?? placeholder}
        </span>
      </button>
    </PopoverTrigger>
  );
}

export type DatePickerCalendarProps = CalendarOptions &
  Pick<ComponentProps<typeof PopoverContent>, "align" | "side" | "sideOffset"> & {
    className?: string;
    /** The popover's accessible name. Translate it with the interface. */
    label?: string;
    /** Parts of your own inside the calendar, in place of its default layout (see calendar). */
    children?: ReactNode;
  };

/**
 * The popover with the calendar in it. It takes the calendar's own options (`min`, `max`, `disabled`,
 * `marks`, `numberOfMonths`, `labels`, `weekStartsOn`, `today`). On opening, focus goes to the chosen day
 * (or today); Escape or a press outside closes it. Two months are shown only where the screen has room.
 */
export function DatePickerCalendar({ className, label = "Calendar", align = "start", side, sideOffset, children, locale, numberOfMonths = 1, ...options }: DatePickerCalendarProps) {
  const picker = usePicker("DatePickerCalendar");
  const shared = { ...options, locale: locale ?? picker.locale, numberOfMonths };
  return (
    <PopoverContent
      data-slot="date-picker-content"
      aria-label={label}
      align={align}
      side={side}
      sideOffset={sideOffset}
      className={cn("p-0", numberOfMonths === 2 ? "w-[min(40rem,calc(100vw-1rem))]" : "w-auto", className)}
      onOpenAutoFocus={(event) => {
        const day = (event.currentTarget as HTMLElement).querySelector<HTMLElement>('[data-day][tabindex="0"]');
        if (!day) return;
        event.preventDefault();
        day.focus();
      }}
      onClick={(event) => {
        // One day: pressing a day closes the calendar, also when it is the day already chosen.
        const day = (event.target as HTMLElement).closest("[data-day]");
        if (picker.mode === "single" && day && day.getAttribute("aria-disabled") !== "true") picker.setOpen(false);
      }}
    >
      {picker.mode === "single" ? (
        <Calendar
          {...shared}
          mode="single"
          value={picker.value as string | null}
          onValueChange={picker.setValue}
        >
          {children}
        </Calendar>
      ) : (
        <Calendar
          {...shared}
          mode="range"
          value={picker.value as CalendarRange}
          onValueChange={(range) => {
            picker.setValue(range);
            if (range.start && range.end) picker.setOpen(false);
          }}
        >
          {children}
        </Calendar>
      )}
    </PopoverContent>
  );
}
