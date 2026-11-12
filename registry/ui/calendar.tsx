"use client";
/**
 * @name calendar
 * @category ui
 * @description A month grid for choosing a day, several days or a range of days, with days that can be unavailable for a stated reason and days that carry a mark. Days are plain "YYYY-MM-DD" strings, so no time zone can move them.
 * @when Choosing dates where seeing the month matters: a booking, a stay, a deadline. It stays on the page; to open it from a field use date-picker. Never use the browser's native date input beside it. For a date far in the past that the person knows by heart (a birthday) three plain fields are quicker. Pass `locale` (the page's language) so that names, numerals and the first day of the week are right; without it the calendar is in English.
 * @example
 * // One day (uncontrolled), with days that cannot be chosen and days that carry a word
 * <Calendar
 *   locale="en-GB"
 *   defaultValue="2026-11-14"
 *   min="2026-11-01"
 *   disabled={(day) => (closed.has(day) ? "nothing open" : false)}
 *   marks={(day) => (busy.has(day) ? "busy" : undefined)}
 * />
 *
 * // A range (controlled), two months where there is room
 * const [stay, setStay] = useState<CalendarRange>({ start: null, end: null });
 * <Calendar mode="range" value={stay} onValueChange={setStay} numberOfMonths={2} locale="en-GB" />
 *
 * // Several days, and its own layout with a footer
 * <Calendar mode="multiple" defaultValue={["2026-11-03", "2026-11-05"]}>
 *   <CalendarPrevious />
 *   <CalendarNext />
 *   <CalendarMonths />
 *   <p className="px-1 pt-2 text-sm text-muted-foreground">A dot marks a busy day.</p>
 * </Calendar>
 */
import { ChevronLeft, ChevronRight } from "lucide-react";
import { createContext, use, useEffect, useId, useMemo, useState, useSyncExternalStore, type ComponentProps, type KeyboardEvent, type ReactNode } from "react";
import { announce } from "@/lib/announce";
import { cn } from "@/lib/cn";
import { inlineStep } from "@/lib/direction";
import { useControllableState } from "@/lib/use-controllable-state";

/* Days as text. All arithmetic is done in UTC, where every day has 24 hours, and never touches local time. */

const DAY_MS = 86_400_000;
const pad = (value: number, length = 2): string => String(value).padStart(length, "0");

function toUtc(day: string): number {
  const [year = 1970, month = 1, date = 1] = day.split("-").map(Number);
  return Date.UTC(year, month - 1, date);
}

function fromUtc(time: number): string {
  const date = new Date(time);
  return `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

const daysInMonth = (year: number, month: number): number => new Date(Date.UTC(year, month, 0)).getUTCDate();

/** The day `count` days after (or, negative, before) a "YYYY-MM-DD" day. */
export function addDays(day: string, count: number): string {
  return fromUtc(toUtc(day) + count * DAY_MS);
}

/** The same day of the month `count` months later (or earlier), or that month's last day when it is shorter. */
export function addMonths(day: string, count: number): string {
  const [year = 1970, month = 1, date = 1] = day.split("-").map(Number);
  const total = year * 12 + (month - 1) + count;
  const nextYear = Math.floor(total / 12);
  const nextMonth = (((total % 12) + 12) % 12) + 1;
  return `${pad(nextYear, 4)}-${pad(nextMonth)}-${pad(Math.min(date, daysInMonth(nextYear, nextMonth)))}`;
}

/** Today in the device's own time zone, as "YYYY-MM-DD". Only meaningful in the browser. */
export function todayISO(): string {
  const now = new Date();
  return `${pad(now.getFullYear(), 4)}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** A day written out for people ("14 Nov 2026"). `options` are Intl.DateTimeFormat's; the default is the medium date style. */
export function formatDay(day: string, locale = "en", options: Intl.DateTimeFormatOptions = { dateStyle: "medium" }): string {
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" }).format(toUtc(day));
}

const monthOf = (day: string): string => day.slice(0, 7);
const shiftMonth = (month: string, count: number): string => monthOf(addMonths(`${month}-01`, count));
const weekdayOf = (day: string): number => new Date(toUtc(day)).getUTCDay();

/*
 * The first day of the week by region (CLDR). A table, not Intl's week info, because the server and the
 * browser must agree and not every runtime has that API. Everywhere not listed starts on Monday.
 */
const WEEK_STARTS: Record<number, string> = {
  0: "AG AS BD BR BS BT BW BZ CA CO DM DO ET GT GU HK HN ID IL IN JM JP KE KH KR LA MH MM MO MT MX MZ NI NP PA PE PH PK PR PT PY SA SG SV TH TT TW UM US VE VI WS YE ZA ZW",
  5: "MV",
  6: "AE AF BH DJ DZ EG IQ IR JO KW LY OM QA SD SY",
};

/** The first day of the week for a language tag: 0 is Sunday, 1 Monday, … 6 Saturday. */
export function weekStartOf(locale: string): number {
  try {
    const region = new Intl.Locale(locale).maximize().region ?? "";
    for (const [day, regions] of Object.entries(WEEK_STARTS)) {
      if (regions.split(" ").includes(region)) return Number(day);
    }
  } catch {
    // An unknown tag: Monday.
  }
  return 1;
}

export type CalendarRange = { start: string | null; end: string | null };
export type CalendarMode = "single" | "multiple" | "range";
type CalendarValue = string | null | string[] | CalendarRange;

export type CalendarLabels = {
  previousMonth: string;
  nextMonth: string;
  /** Said after today's date. */
  today: string;
  /** Said after a chosen day. */
  selected: string;
  rangeStart: string;
  rangeEnd: string;
  /** Said after a day between the start and the end of a range. */
  inRange: string;
};

const LABELS: CalendarLabels = {
  previousMonth: "Previous month",
  nextMonth: "Next month",
  today: "today",
  selected: "selected",
  rangeStart: "start of the range",
  rangeEnd: "end of the range",
  inRange: "in the range",
};

type CalendarSelection =
  | { mode?: "single"; value?: string | null; defaultValue?: string | null; onValueChange?: (value: string | null) => void }
  | { mode: "multiple"; value?: string[]; defaultValue?: string[]; onValueChange?: (value: string[]) => void }
  | { mode: "range"; value?: CalendarRange; defaultValue?: CalendarRange; onValueChange?: (value: CalendarRange) => void };

export type CalendarOptions = {
  /** The month shown (the first one, when two are shown), as "YYYY-MM". Controlled. */
  month?: string;
  /** The month shown at first. Default: the month of the chosen day, else of today. */
  defaultMonth?: string;
  onMonthChange?: (month: string) => void;
  /** The first and the last day that can be chosen or reached. */
  min?: string;
  max?: string;
  /**
   * Days that cannot be chosen. Return true, or the reason as a few words ("nothing open"): the reason is
   * part of the day's accessible name, and the day can still be focused so that it can be read.
   */
  disabled?: (day: string) => boolean | string;
  /** A word for a day that carries a mark ("busy"). It is drawn as a dot and said in the day's name. */
  marks?: (day: string) => string | undefined;
  /** The language tag for names, numerals and the first day of the week. Default "en". */
  locale?: string;
  /** The first day of the week, when the locale's is not wanted: 0 is Sunday, 1 Monday. */
  weekStartsOn?: number;
  /** 2 shows a second month beside the first where the calendar is wide enough for both. */
  numberOfMonths?: 1 | 2;
  /** Today as "YYYY-MM-DD", when the product's "today" is not the device's (another time zone). Default: the device's, known after mounting. */
  today?: string;
  /** The words the calendar says itself. Translate them with the interface. */
  labels?: Partial<CalendarLabels>;
};

export type CalendarProps = Omit<ComponentProps<"div">, "defaultValue" | "onChange"> & CalendarOptions & CalendarSelection & { children?: ReactNode };

type DayState = {
  selected: boolean;
  /** Its place in a range, also while the end is being chosen (`preview`). */
  range: "start" | "end" | "middle" | "only" | null;
  preview: boolean;
  today: boolean;
  /** false, true, or the reason. */
  disabled: boolean | string;
  mark: string | undefined;
  tabStop: boolean;
  label: string;
  text: string;
};

type CalendarContextValue = {
  /** The first month shown; null on the server when nothing says which month it is. */
  month: string | null;
  numberOfMonths: 1 | 2;
  weekStart: number;
  labels: CalendarLabels;
  monthTitle: (month: string) => string;
  weekdays: { short: string; long: string }[];
  dayState: (day: string) => DayState;
  choose: (day: string) => void;
  focusDay: (day: string) => void;
  hoverDay: (day: string | null) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  go: (count: number, from: Element) => void;
  canGo: (count: number) => boolean;
};

const CalendarContext = createContext<CalendarContextValue | null>(null);

/** The calendar's state, for a part of your own inside <Calendar> (a "Today" button, a legend). */
export function useCalendar(): CalendarContextValue {
  const context = use(CalendarContext);
  if (!context) throw new Error("Calendar parts must be used inside <Calendar>.");
  return context;
}

const noSubscription = (): (() => void) => () => {};
const noToday = (): null => null;

/** The months that are on screen now inside this calendar (the second one is hidden where there is no room). */
function visibleMonths(from: Element): number {
  const root = from.closest("[data-slot=calendar]");
  if (!root) return 1;
  return Math.max(1, [...root.querySelectorAll("[data-slot=calendar-month]")].filter((month) => month.getClientRects().length > 0).length);
}

/**
 * The date grid pattern. One day is in the Tab order; from it, arrow keys move by a day (Left and Right the
 * other way round in right-to-left pages) or a week, Home and End go to the ends of the week, Page Up and
 * Page Down move by a month and, with Shift, by a year; Enter or Space chooses. Focus carries on into the
 * next or the previous month. In "range" mode the first press sets the start and the second the end; while
 * the end is being chosen the days in between are shown as a preview.
 */
export function Calendar(allProps: CalendarProps) {
  const {
    className,
    mode = "single",
    value,
    defaultValue,
    onValueChange,
    month: monthProp,
    defaultMonth,
    onMonthChange,
    min,
    max,
    disabled,
    marks,
    locale = "en",
    weekStartsOn,
    numberOfMonths = 1,
    today: todayProp,
    labels: labelsProp,
    children,
    ...props
  } = allProps;
  const id = useId();
  const labels = useMemo(() => ({ ...LABELS, ...labelsProp }), [labelsProp]);

  const [current, setCurrent] = useControllableState<CalendarValue>({
    value,
    defaultValue: defaultValue ?? (mode === "multiple" ? [] : mode === "range" ? { start: null, end: null } : null),
    onChange: onValueChange as ((value: CalendarValue) => void) | undefined,
  });
  const single = mode === "single" ? (current as string | null) : null;
  const several = mode === "multiple" ? (current as string[]) : null;
  const range = mode === "range" ? (current as CalendarRange) : null;

  // The device's day is only known in the browser: null on the server and while hydrating.
  const deviceToday = useSyncExternalStore(noSubscription, todayISO, noToday);
  const today = todayProp ?? deviceToday;

  const [ownMonth, setOwnMonth] = useControllableState<string | null>({
    value: monthProp,
    defaultValue: defaultMonth ?? null,
    onChange: (next) => {
      if (next) onMonthChange?.(next);
    },
  });
  const anchor = single ?? several?.toSorted()[0] ?? range?.start ?? range?.end ?? today;
  const month = ownMonth ?? (anchor ? monthOf(anchor) : null);

  /** The day the keyboard is on, and a counter that asks for it to be focused once it is on screen. */
  const [focused, setFocused] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState(0);
  /** The day under the pointer or the keyboard while a range is waiting for its end. */
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    if (focusRequest === 0 || !focused) return;
    document.querySelector<HTMLElement>(`[data-calendar="${id}"] [data-day="${focused}"]`)?.focus();
  }, [focusRequest, focused, id]);

  const formats = useMemo(
    () => ({
      month: new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }),
      full: new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }),
      day: new Intl.DateTimeFormat(locale, { day: "numeric", timeZone: "UTC" }),
      short: new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }),
      long: new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" }),
    }),
    [locale],
  );
  const weekStart = (((weekStartsOn ?? weekStartOf(locale)) % 7) + 7) % 7;
  const weekdays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        // 4 January 1970 was a Sunday.
        const time = Date.UTC(1970, 0, 4 + weekStart + index);
        return { short: formats.short.format(time), long: formats.long.format(time) };
      }),
    [formats, weekStart],
  );
  const monthTitle = (which: string): string => formats.month.format(toUtc(`${which}-01`));

  const outOfRange = (day: string): boolean => (min !== undefined && day < min) || (max !== undefined && day > max);
  const disabledOf = (day: string): boolean | string => (outOfRange(day) ? true : (disabled?.(day) ?? false));
  const clamp = (day: string): string => (min !== undefined && day < min ? min : max !== undefined && day > max ? max : day);

  // The range as it is drawn: the chosen one, or the start with the day under the pointer while the end is open.
  const previewing = range !== null && range.start !== null && range.end === null && hovered !== null && hovered !== range.start;
  const drawn: { start: string; end: string } | null =
    range?.start && range.end
      ? { start: range.start, end: range.end }
      : range?.start && previewing && hovered
        ? { start: range.start < hovered ? range.start : hovered, end: range.start < hovered ? hovered : range.start }
        : null;

  const isSelected = (day: string): boolean => (range ? day === range.start || day === range.end : several ? several.includes(day) : day === single);

  // The one day in the Tab order: the day the keyboard was last on, else a chosen day, else today, else the first of the month.
  const shown = month ? Array.from({ length: numberOfMonths }, (_, index) => shiftMonth(month, index)) : [];
  const candidates = [focused, single, ...(several?.toSorted() ?? []), range?.start, range?.end, today].filter((day): day is string => typeof day === "string");
  const tabStop =
    (focused && shown.includes(monthOf(focused)) ? focused : undefined) ??
    candidates.find((day) => monthOf(day) === month) ??
    candidates.find((day) => shown.includes(monthOf(day))) ??
    (month ? clamp(`${month}-01`).slice(0, 7) === month ? clamp(`${month}-01`) : `${month}-01` : null);

  const dayState = (day: string): DayState => {
    const selected = isSelected(day);
    const place: DayState["range"] = !range
      ? null
      : drawn
        ? drawn.start === drawn.end && day === drawn.start
          ? "only"
          : day === drawn.start
            ? "start"
            : day === drawn.end
              ? "end"
              : day > drawn.start && day < drawn.end
                ? "middle"
                : null
        : selected
          ? "only"
          : null;
    const isToday = day === today;
    const reason = disabledOf(day);
    const mark = marks?.(day);
    const said = [
      formats.full.format(toUtc(day)),
      isToday ? labels.today : null,
      range
        ? day === range.start && day === range.end
          ? labels.selected
          : day === range.start
            ? labels.rangeStart
            : day === range.end
              ? labels.rangeEnd
              : place === "middle" && !previewing
                ? labels.inRange
                : null
        : selected
          ? labels.selected
          : null,
      mark ?? null,
      typeof reason === "string" ? reason : null,
    ].filter((part): part is string => Boolean(part));
    return { selected, range: place, preview: previewing && place !== null, today: isToday, disabled: reason, mark, tabStop: day === tabStop, label: said.join(", "), text: formats.day.format(toUtc(day)) };
  };

  const choose = (day: string): void => {
    setFocused(day);
    if (disabledOf(day) !== false) return;
    if (range) {
      if (!range.start || range.end) setCurrent({ start: day, end: null });
      else setCurrent(day < range.start ? { start: day, end: range.start } : { start: range.start, end: day });
      setHovered(null);
    } else if (several) {
      setCurrent(several.includes(day) ? several.filter((other) => other !== day) : [...several, day].sort());
    } else {
      setCurrent(day);
    }
  };

  const moveTo = (target: string, from: Element): void => {
    if (!month) return;
    const day = clamp(target);
    const count = Math.min(numberOfMonths, visibleMonths(from));
    const last = shiftMonth(month, count - 1);
    if (monthOf(day) < month) setOwnMonth(monthOf(day));
    else if (monthOf(day) > last) setOwnMonth(shiftMonth(monthOf(day), -(count - 1)));
    setFocused(day);
    setFocusRequest((request) => request + 1);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
    const day = (event.target as HTMLElement).closest<HTMLElement>("[data-day]")?.dataset["day"];
    if (!day || event.altKey || event.ctrlKey || event.metaKey) return;
    const sideways = inlineStep(event.key, event.currentTarget);
    const fromWeekStart = (weekdayOf(day) - weekStart + 7) % 7;
    const target =
      sideways !== 0
        ? addDays(day, sideways)
        : event.key === "ArrowUp"
          ? addDays(day, -7)
          : event.key === "ArrowDown"
            ? addDays(day, 7)
            : event.key === "Home"
              ? addDays(day, -fromWeekStart)
              : event.key === "End"
                ? addDays(day, 6 - fromWeekStart)
                : event.key === "PageUp"
                  ? addMonths(day, event.shiftKey ? -12 : -1)
                  : event.key === "PageDown"
                    ? addMonths(day, event.shiftKey ? 12 : 1)
                    : null;
    if (!target) return;
    event.preventDefault();
    moveTo(target, event.currentTarget);
  };

  const canGo = (count: number): boolean => {
    if (!month) return false;
    if (count < 0) return min === undefined || addDays(`${month}-01`, -1) >= min;
    return max === undefined || `${shiftMonth(month, 1)}-01` <= max;
  };

  const go = (count: number, from: Element): void => {
    if (!month || !canGo(count)) return;
    const next = shiftMonth(month, count);
    setOwnMonth(next);
    // No focus moves, so the new month is said. Two months are named when two are on screen.
    const visible = Math.min(numberOfMonths, visibleMonths(from));
    announce(Array.from({ length: visible }, (_, index) => monthTitle(shiftMonth(next, index))).join(" – "));
  };

  return (
    <CalendarContext
      value={{
        month,
        numberOfMonths,
        weekStart,
        labels,
        monthTitle,
        weekdays,
        dayState,
        choose,
        focusDay: setFocused,
        hoverDay: (day) => {
          if (range?.start && !range.end) setHovered(day);
        },
        onKeyDown,
        go,
        canGo,
      }}
    >
      <div
        data-slot="calendar"
        data-calendar={id}
        data-mode={mode}
        aria-busy={month === null || undefined}
        className={cn("relative p-3 text-sm text-foreground", numberOfMonths === 2 ? "@container w-full" : "w-fit max-w-full", className)}
        {...props}
      >
        {children ?? (
          <>
            <CalendarPrevious />
            <CalendarNext />
            <CalendarMonths />
          </>
        )}
      </div>
    </CalendarContext>
  );
}

const navClass =
  "absolute top-3 z-10 inline-flex size-9 items-center justify-center rounded-control text-muted-foreground transition-[background-color,color,opacity] duration-instant ease-out hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none pointer-coarse:size-10 [&_svg]:size-4 rtl:[&_svg]:rotate-180";

export type CalendarNavProps = Omit<ComponentProps<"button">, "type">;

/** Goes back a month. It sits at the start of the heading row; the new month is announced. */
export function CalendarPrevious({ className, children, onClick, ...props }: CalendarNavProps) {
  const calendar = useCalendar();
  return (
    <button
      type="button"
      data-slot="calendar-previous"
      aria-label={calendar.labels.previousMonth}
      disabled={!calendar.canGo(-1)}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) calendar.go(-1, event.currentTarget);
      }}
      className={cn(navClass, "start-3", className)}
      {...props}
    >
      {children ?? <ChevronLeft aria-hidden="true" strokeWidth={1.5} />}
    </button>
  );
}

/** Goes on a month. It sits at the end of the heading row; the new month is announced. */
export function CalendarNext({ className, children, onClick, ...props }: CalendarNavProps) {
  const calendar = useCalendar();
  return (
    <button
      type="button"
      data-slot="calendar-next"
      aria-label={calendar.labels.nextMonth}
      disabled={!calendar.canGo(1)}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) calendar.go(1, event.currentTarget);
      }}
      className={cn(navClass, "end-3", className)}
      {...props}
    >
      {children ?? <ChevronRight aria-hidden="true" strokeWidth={1.5} />}
    </button>
  );
}

/** The months side by side: one, or two where `numberOfMonths` is 2 and the calendar is wide enough. */
export function CalendarMonths({ className, ...props }: ComponentProps<"div">) {
  const { numberOfMonths } = useCalendar();
  return (
    <div data-slot="calendar-months" className={cn("flex justify-center gap-6", className)} {...props}>
      <CalendarMonth offset={0} />
      {numberOfMonths === 2 ? <CalendarMonth offset={1} className="hidden @[38rem]:block" /> : null}
    </div>
  );
}

const cellSize = "size-9 pointer-coarse:size-10";

export type CalendarMonthProps = ComponentProps<"div"> & {
  /** Which month, counted from the first one shown: 0 or 1. */
  offset?: number;
};

/** One month: its name and its grid. Always six rows tall, so the calendar keeps its height from month to month. */
export function CalendarMonth({ offset = 0, className, ...props }: CalendarMonthProps) {
  const calendar = useCalendar();
  const headingId = useId();
  const month = calendar.month ? shiftMonth(calendar.month, offset) : null;

  const cells: (string | null)[] = [];
  if (month) {
    const [year = 1970, number = 1] = month.split("-").map(Number);
    const lead = (weekdayOf(`${month}-01`) - calendar.weekStart + 7) % 7;
    const length = daysInMonth(year, number);
    for (let index = 0; index < 42; index++) {
      const date = index - lead + 1;
      cells.push(date >= 1 && date <= length ? `${month}-${pad(date)}` : null);
    }
  } else {
    for (let index = 0; index < 42; index++) cells.push(null);
  }
  const weeks = Array.from({ length: 6 }, (_, week) => cells.slice(week * 7, week * 7 + 7));

  return (
    <div data-slot="calendar-month" data-month={month ?? undefined} className={cn("min-w-0", className)} {...props}>
      <div id={headingId} data-slot="calendar-heading" className="flex h-9 items-center justify-center px-10 text-center font-medium pointer-coarse:h-10">
        {month ? calendar.monthTitle(month) : " "}
      </div>
      <table
        role="grid"
        aria-labelledby={headingId}
        data-slot="calendar-grid"
        className="mx-auto border-separate border-spacing-x-0 border-spacing-y-0.5"
        onKeyDown={calendar.onKeyDown}
        onPointerLeave={() => calendar.hoverDay(null)}
      >
        <thead>
          <tr>
            {calendar.weekdays.map((weekday) => (
              <th key={weekday.long} scope="col" abbr={weekday.long} className="h-8 w-9 p-0 text-center text-xs font-normal text-muted-foreground pointer-coarse:w-10">
                <span aria-hidden="true">{weekday.short}</span>
                <span className="sr-only">{weekday.long}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, index) => (
            <tr key={index}>{week.map((day, column) => (day ? <CalendarDay key={day} day={day} /> : <td key={column} className={cn("p-0", cellSize)} />))}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * One day. Its accessible name is the full date followed by what is true of it: today, chosen (or its place
 * in a range), its mark, and why it cannot be chosen. A day that cannot be chosen keeps its place in the
 * keyboard order (`aria-disabled`, not `disabled`) so that the reason can be reached and read.
 */
function CalendarDay({ day }: { day: string }) {
  const calendar = useCalendar();
  const state = calendar.dayState(day);
  const unavailable = state.disabled !== false;
  const filled = state.selected || state.range === "start" || state.range === "end" || state.range === "only";
  return (
    <td
      role="gridcell"
      aria-selected={state.selected || (state.range !== null && !state.preview)}
      data-range={state.range ?? undefined}
      data-preview={state.preview ? "" : undefined}
      className={cn(
        "p-0",
        // The band of a range: square in the middle, capped at its two ends. A preview is an outline, not a ground.
        "data-[range=end]:rounded-e-control data-[range=start]:rounded-s-control",
        "not-data-preview:data-[range=end]:bg-highlight-soft not-data-preview:data-[range=middle]:bg-highlight-soft not-data-preview:data-[range=start]:bg-highlight-soft",
        "data-preview:data-[range=end]:outline data-preview:data-[range=middle]:outline data-preview:data-[range=start]:outline data-preview:outline-dashed data-preview:-outline-offset-1 data-preview:outline-border-strong",
      )}
    >
      <button
        type="button"
        data-slot="calendar-day"
        data-day={day}
        data-today={state.today ? "" : undefined}
        data-selected={filled ? "" : undefined}
        data-unavailable={unavailable ? "" : undefined}
        tabIndex={state.tabStop ? 0 : -1}
        aria-label={state.label}
        aria-current={state.today ? "date" : undefined}
        aria-disabled={unavailable || undefined}
        onClick={() => calendar.choose(day)}
        onFocus={() => {
          calendar.focusDay(day);
          calendar.hoverDay(day);
        }}
        onPointerEnter={() => calendar.hoverDay(day)}
        className={cn(
          "relative inline-flex items-center justify-center rounded-control tabular-nums transition-[background-color,color] duration-instant ease-out select-none hover:bg-accent motion-reduce:transition-none",
          cellSize,
          "data-today:font-semibold data-today:underline data-today:decoration-2 data-today:underline-offset-4",
          "data-selected:bg-primary data-selected:font-semibold data-selected:text-primary-foreground data-selected:hover:bg-primary",
          "data-unavailable:cursor-not-allowed data-unavailable:text-muted-foreground data-unavailable:line-through data-unavailable:hover:bg-transparent",
        )}
      >
        <span aria-hidden="true">{state.text}</span>
        {state.mark ? <span aria-hidden="true" data-slot="calendar-mark" className="absolute bottom-1 size-1 rounded-full bg-current" /> : null}
      </button>
    </td>
  );
}
