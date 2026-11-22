"use client";
/**
 * @name date-picker
 * @category ui
 * @description A button that shows a date, or a range of dates, and opens a calendar in a popover to choose it; or a field the date is typed into, with the calendar beside it. Values are "YYYY-MM-DD" strings.
 * @when A date or a stay inside a form or a toolbar, where a calendar that is always open would take too much room. When the calendar is the main thing on the screen use calendar itself. Never the browser's native date input. Name the button by passing `aria-labelledby` with the id of its visible label: the chosen date is added to the name. Where the date is known before the calendar is opened (a birthday, a date read off a document, one years away) use the typed field: DatePickerField with DatePickerInput and DatePickerOpen.
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
 *
 * // One day, typed in the locale's order of digits or chosen from the calendar
 * <p id="due-label">Due</p>
 * <DatePicker name="due" locale="en-GB">
 *   <DatePickerField>
 *     <DatePickerInput aria-labelledby="due-label" min="2026-11-01" onReject={(typed) => setError(`${typed} is not a date that can be chosen.`)} />
 *     <DatePickerOpen />
 *   </DatePickerField>
 *   <DatePickerCalendar min="2026-11-01" />
 * </DatePicker>
 */
import { CalendarDays } from "lucide-react";
import { createContext, use, useId, useState, type ComponentProps, type ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import { addDays, Calendar, formatDay, type CalendarOptions, type CalendarRange } from "@/components/ui/calendar";
import { Input, type InputProps } from "@/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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

/*
 * A day as digits, for the typed field: the locale's own order, separators and numerals ("14/11/2026" in
 * en-GB, "11/14/2026" in en-US, "2026-11-14" in sv), always in the Gregorian calendar, which is the one the
 * values and the calendar grid are in.
 */

const NUMERIC: Intl.DateTimeFormatOptions = { year: "numeric", month: "2-digit", day: "2-digit", calendar: "gregory" };
type DayPart = "day" | "month" | "year";
const WIDTH: Record<DayPart, number> = { day: 2, month: 2, year: 4 };
const LETTERS: Record<DayPart, string> = { day: "DD", month: "MM", year: "YYYY" };

function numericShape(locale: string): { order: DayPart[]; pattern: string; digits: string[] } {
  const parts = new Intl.DateTimeFormat(locale, { ...NUMERIC, timeZone: "UTC" }).formatToParts(Date.UTC(2026, 10, 14));
  const isPart = (type: string): type is DayPart => type === "day" || type === "month" || type === "year";
  const order = parts.map((part) => part.type).filter(isPart);
  const pattern = parts.map((part) => (isPart(part.type) ? LETTERS[part.type] : part.value)).join("");
  const numerals = new Intl.NumberFormat(locale, { useGrouping: false });
  const digits = Array.from({ length: 10 }, (_, value) => numerals.format(value));
  return { order, pattern, digits };
}

/**
 * Reads what was typed as a day, or null when it is not one. Accepted: the locale's order with any
 * separators ("3/12/2026", "3.12.2026", "3 12 2026"), eight digits with none ("03122026"), and the year
 * first ("2026-12-03") in every locale. The locale's own numerals and Latin digits both count. The year
 * has four digits, and a day that does not exist (31 February) is not a day.
 */
function parseDay(typed: string, locale: string): string | null {
  const { order, digits } = numericShape(locale);
  let latin = "";
  for (const char of typed) {
    const value = digits.indexOf(char);
    latin += value === -1 ? char : String(value);
  }
  const groups = latin.match(/\d+/g) ?? [];
  const found: Partial<Record<DayPart, string>> = {};
  const [first, second, third] = groups;
  if (groups.length === 1 && first?.length === 8) {
    let at = 0;
    for (const part of order) {
      found[part] = first.slice(at, at + WIDTH[part]);
      at += WIDTH[part];
    }
  } else if (groups.length === 3 && first && second && third) {
    const yearFirst: DayPart[] = ["year", "month", "day"];
    (first.length === 4 ? yearFirst : order).forEach((part, index) => {
      found[part] = groups[index];
    });
  } else {
    return null;
  }
  const { year, month, day: date } = found;
  if (!year || !month || !date || year.length !== 4 || month.length > 2 || date.length > 2 || Number(year) < 100) return null;
  const day = `${year}-${month.padStart(2, "0")}-${date.padStart(2, "0")}`;
  // Day arithmetic turns 31 February into 3 March: a day that survives it unchanged exists.
  return addDays(day, 0) === day ? day : null;
}

/** The typed field and the button that opens the calendar, side by side. The calendar opens under the whole of it. */
export function DatePickerField({ className, ...props }: ComponentProps<"div">) {
  return (
    <PopoverAnchor asChild>
      <div data-slot="date-picker-field" className={cn("flex max-w-full min-w-0 items-center gap-1.5", className)} {...props} />
    </PopoverAnchor>
  );
}

/** What is being typed, and the value it stood for when it was typed: a value set from elsewhere (the calendar, the project) ends it. */
type Draft = { text: string; base: string | null; rejected: boolean };

export type DatePickerInputProps = Omit<InputProps, "value" | "defaultValue" | "type" | "min" | "max" | "onChange"> & {
  /** The first and the last day that can be entered. Give the calendar the same ones. */
  min?: string;
  max?: string;
  /** Days that cannot be entered: the function the calendar takes as `disabled`. */
  unavailable?: (day: string) => boolean | string;
  /**
   * Called with the text when the field is left, or Enter is pressed, holding something that is not a day
   * that can be chosen. The field is then `aria-invalid`; say why beside it (field's error).
   */
  onReject?: (typed: string) => void;
};

/**
 * The date as text that can be typed, inside DatePicker (one day). It shows the day in the locale's order
 * of digits and reads the same back, and the year first as well. The picker's value follows the typing:
 * a whole day that can be chosen is the value at once, and anything else is no value, so a form never
 * submits a day other than the one in the field. Alt+ArrowDown opens the calendar. The placeholder is the
 * order to type in ("DD/MM/YYYY"); pass your own to translate it. Name the field with a label or
 * `aria-labelledby`.
 */
export function DatePickerInput({ className, min, max, unavailable, onReject, placeholder, disabled, onBlur, onKeyDown, "aria-invalid": ariaInvalid, ...props }: DatePickerInputProps) {
  const picker = usePicker("DatePickerInput");
  if (picker.mode !== "single") throw new Error("<DatePickerInput> is for <DatePicker>, one day. A range is chosen from the calendar.");
  const value = picker.value as string | null;
  const [draft, setDraft] = useState<Draft | null>(null);
  const typing = draft !== null && draft.base === value ? draft : null;
  const text = typing ? typing.text : value ? formatDay(value, picker.locale, NUMERIC) : "";

  const read = (typed: string): string | null => {
    const day = parseDay(typed, picker.locale);
    if (!day || (min && day < min) || (max && day > max) || unavailable?.(day)) return null;
    return day;
  };
  /** Marks text that is not a day as refused. True when it was. */
  const refuse = (): boolean => {
    if (!typing || typing.base !== null || typing.text.trim() === "") return false;
    if (!typing.rejected) setDraft({ ...typing, rejected: true });
    onReject?.(typing.text);
    return true;
  };

  return (
    <Input
      data-slot="date-picker-input"
      // dir="auto": a date keeps its own order inside a page of the other direction.
      dir="auto"
      autoComplete="off"
      placeholder={placeholder ?? numericShape(picker.locale).pattern}
      disabled={disabled ?? picker.disabled}
      aria-invalid={ariaInvalid ?? (typing?.rejected ? true : undefined)}
      className={cn("tabular-nums", className)}
      {...props}
      value={text}
      onChange={(event) => {
        const typed = event.target.value;
        const day = read(typed);
        setDraft({ text: typed, base: day, rejected: false });
        if (day !== value) picker.setValue(day);
      }}
      onBlur={(event) => {
        onBlur?.(event);
        // A day, or nothing: show it as the locale writes it. Anything else stays as typed, marked.
        if (typing && !refuse()) setDraft(null);
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented) return;
        if (event.key === "ArrowDown" && event.altKey) {
          event.preventDefault();
          picker.setOpen(true);
        } else if (event.key === "Enter" && refuse()) {
          // Enter would submit the form without the day the person believes they entered.
          event.preventDefault();
        }
      }}
    />
  );
}

export type DatePickerOpenProps = Omit<ComponentProps<"button">, "value">;

/** The button beside the typed field that opens the calendar. Its name is `aria-label` ("Open calendar"): translate it with the interface. */
export function DatePickerOpen({ className, "aria-label": ariaLabel = "Open calendar", children, ...props }: DatePickerOpenProps) {
  const picker = usePicker("DatePickerOpen");
  return (
    <PopoverTrigger asChild>
      <button
        type="button"
        data-slot="date-picker-open"
        disabled={picker.disabled}
        aria-label={ariaLabel}
        className={cn(buttonVariants({ variant: "outline", size: "icon" }), "border-input", className)}
        {...props}
      >
        {children ?? <CalendarDays aria-hidden="true" strokeWidth={1.5} className="text-muted-foreground" />}
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
