"use client";
/**
 * @name time-picker
 * @category ui
 * @description A time field made of an hour and a minute that are each stepped with the arrow keys or typed, with an AM/PM part where the locale uses a 12-hour clock. The value is a 24-hour "HH:mm" string.
 * @when Any time of the person's own choosing: an opening hour, a reminder, an arrival. When the times on offer are a fixed list use slot-picker. Never the browser's native time input. Name it with `aria-label` or `aria-labelledby`.
 * @example
 * <p id="opens-label">Opens at</p>
 * <TimePicker aria-labelledby="opens-label" defaultValue="09:30" minuteStep={5} name="opens" locale="en-GB" />
 *
 * // Controlled, limited, 12-hour whatever the locale, with translated names
 * <TimePicker
 *   value={time}
 *   onValueChange={setTime}
 *   min="08:00"
 *   max="18:00"
 *   hourCycle={12}
 *   aria-label="Pick-up time"
 *   labels={{ hour: "Hour", minute: "Minute", period: "Morning or afternoon", empty: "Not set" }}
 * />
 */
import { createContext, use, useMemo, useRef, useState, type ChangeEvent, type ComponentProps, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { inlineStep } from "@/lib/direction";
import { useControllableState } from "@/lib/use-controllable-state";

export type TimePickerLabels = {
  hour: string;
  minute: string;
  /** The name of the AM/PM part. */
  period: string;
  /** What a part says while no time is set. */
  empty: string;
};

const LABELS: TimePickerLabels = { hour: "Hour", minute: "Minute", period: "AM or PM", empty: "Empty" };

const pad = (value: number): string => String(value).padStart(2, "0");

type TimeContextValue = {
  hour: number | null;
  minute: number | null;
  cycle: 12 | 24;
  /** The locale's words for before and after noon. */
  periods: readonly [string, string];
  minuteStep: number;
  disabled: boolean;
  labels: TimePickerLabels;
  /** Sets the time, kept within `min` and `max`. */
  set: (hour: number, minute: number) => void;
  clear: () => void;
  /** Where the arrows start from while nothing is set. */
  start: { hour: number; minute: number };
};

const TimeContext = createContext<TimeContextValue | null>(null);

function useTime(part: string): TimeContextValue {
  const context = use(TimeContext);
  if (!context) throw new Error(`<${part}> must be used inside <TimePicker>.`);
  return context;
}

export type TimePickerProps = Omit<ComponentProps<"div">, "defaultValue" | "onChange"> & {
  /** The time as "HH:mm" on the 24-hour clock, or null for none. Controlled. */
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
  /** What one arrow key adds to or takes from the minutes. Default 1. Typed minutes are kept as typed. */
  minuteStep?: number;
  /** The earliest and the latest time, as "HH:mm". A time outside them becomes the nearest one inside. */
  min?: string;
  max?: string;
  /** The language tag: it decides between the 12-hour and the 24-hour clock and names AM and PM. Default "en". */
  locale?: string;
  /** 12 or 24, when the locale's own clock is not wanted. */
  hourCycle?: 12 | 24;
  /** The field's name in a form: the "HH:mm" value is submitted with it ("" when none). */
  name?: string;
  disabled?: boolean;
  /** The names of the parts. Translate them with the interface. */
  labels?: Partial<TimePickerLabels>;
  /** The parts, when the default (hour, separator, minute, and AM/PM on a 12-hour clock) is not what is wanted. */
  children?: ReactNode;
};

function parse(value: string | null | undefined): { hour: number; minute: number } | null {
  const match = value ? /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value) : null;
  return match ? { hour: Number(match[1]), minute: Number(match[2]) } : null;
}

/**
 * Each part is a spin button: Up and Down change it (the minutes by `minuteStep`), Home and End go to its
 * limits, typing digits sets it and moves on to the next part, Left and Right move between parts, and
 * Backspace or Delete empties the field. The first change to an empty field sets the other part too, so the
 * value is always a whole time or nothing.
 *
 * The parts sit in a `dir="ltr"` wrapper: a time of day is written hour first, left to right, in
 * right-to-left languages as well (as a telephone number is), so Left and Right keep their plain meaning here.
 */
export function TimePicker({
  className,
  value,
  defaultValue = null,
  onValueChange,
  minuteStep = 1,
  min,
  max,
  locale = "en",
  hourCycle,
  name,
  disabled = false,
  labels,
  children,
  ...props
}: TimePickerProps) {
  const [current, setCurrent] = useControllableState<string | null>({ value, defaultValue, onChange: onValueChange });
  const time = parse(current);

  const clock = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(locale, { hour: "numeric", hour12: true, timeZone: "UTC" });
    const period = (hour: number, fallback: string): string => formatter.formatToParts(Date.UTC(1970, 0, 1, hour)).find((part) => part.type === "dayPeriod")?.value ?? fallback;
    const resolved = new Intl.DateTimeFormat(locale, { hour: "numeric" }).resolvedOptions().hourCycle;
    return { cycle: resolved === "h11" || resolved === "h12" ? (12 as const) : (24 as const), periods: [period(9, "AM"), period(15, "PM")] as const };
  }, [locale]);
  const cycle = hourCycle ?? clock.cycle;

  const set = (hour: number, minute: number): void => {
    const next = `${pad(hour)}:${pad(minute)}`;
    setCurrent(min !== undefined && next < min ? min : max !== undefined && next > max ? max : next);
  };

  return (
    <TimeContext
      value={{
        hour: time?.hour ?? null,
        minute: time?.minute ?? null,
        cycle,
        periods: clock.periods,
        minuteStep: Math.max(1, Math.round(minuteStep)),
        disabled,
        labels: { ...LABELS, ...labels },
        set,
        clear: () => setCurrent(null),
        start: parse(min) ?? { hour: 0, minute: 0 },
      }}
    >
      <div
        role="group"
        data-slot="time-picker"
        data-disabled={disabled ? "" : undefined}
        className={cn("inline-flex h-control w-fit shrink-0 items-center rounded-control border border-input bg-background px-2.5 text-sm text-foreground data-[disabled]:opacity-50", className)}
        {...props}
      >
        <div dir="ltr" className="flex items-center gap-0.5 tabular-nums">
          {children ?? (
            <>
              <TimePickerHour />
              <TimePickerSeparator />
              <TimePickerMinute />
              {cycle === 12 ? <TimePickerPeriod /> : null}
            </>
          )}
        </div>
        {name ? <input type="hidden" name={name} value={current ?? ""} disabled={disabled} /> : null}
      </div>
    </TimeContext>
  );
}

const SEGMENT = "[data-slot=time-picker] input[role=spinbutton]";

/** Moves focus to the part before or after this one, if there is one. */
function focusSibling(from: HTMLElement, step: -1 | 1): void {
  const parts = [...(from.closest("[data-slot=time-picker]")?.querySelectorAll<HTMLElement>(SEGMENT) ?? [])];
  parts[parts.indexOf(from) + step]?.focus();
}

const segmentClass =
  "box-content h-7 w-[2ch] shrink-0 cursor-default rounded-sm bg-transparent px-1 text-center caret-transparent selection:bg-transparent focus:bg-highlight-soft disabled:pointer-events-none pointer-coarse:h-9";

type SegmentProps = Omit<ComponentProps<"input">, "value" | "defaultValue" | "type" | "onChange">;

type SegmentBehaviour = {
  slot: string;
  text: string;
  /** Up (+1) and Down (-1). */
  onStep: (direction: -1 | 1) => void;
  /** Home (-1) and End (+1). */
  onLimit: (end: -1 | 1) => void;
  /** For a part that takes digits: the smallest and the largest number it can hold, and what to do with a finished one. */
  range?: readonly [number, number];
  onNumber?: (value: number) => void;
  /** A typed letter (the AM/PM part). */
  onLetter?: (letter: string) => void;
};

function Segment({ slot, text, onStep, onLimit, range, onNumber, onLetter, className, onKeyDown, onBlur, ...props }: SegmentProps & SegmentBehaviour) {
  const time = useTime("TimePicker part");
  /**
   * A first digit that may be followed by a second ("1" before "14"). It is shown but is not yet the value,
   * so that a half-typed number is never pulled to the earliest or the latest time allowed.
   */
  const [typed, setTypedState] = useState("");
  // The same digit for the handlers: leaving the part (which a finished number does) must not read a stale one.
  const waiting = useRef("");
  const setTyped = (digit: string): void => {
    waiting.current = digit;
    setTypedState(digit);
  };

  const type = (character: string, target: HTMLElement): void => {
    if (/^\d$/.test(character) && range && onNumber) {
      const digit = Number(character);
      const [least, most] = range;
      const joined = waiting.current === "" ? Number.NaN : Number(waiting.current) * 10 + digit;
      if (joined >= least && joined <= most) {
        onNumber(joined);
      } else if (digit * 10 <= most) {
        // It can still become a two-digit number: wait for the next digit.
        setTyped(character);
        return;
      } else if (digit >= least) {
        onNumber(digit);
      }
      setTyped("");
      focusSibling(target, 1);
    } else if (onLetter) {
      onLetter(character.toLowerCase());
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    onKeyDown?.(event);
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const sideways = inlineStep(event.key, event.currentTarget);
    if (sideways !== 0) {
      event.preventDefault();
      focusSibling(event.currentTarget, sideways);
    } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      setTyped("");
      onStep(event.key === "ArrowUp" ? 1 : -1);
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setTyped("");
      onLimit(event.key === "Home" ? -1 : 1);
    } else if (event.key === "Backspace" || event.key === "Delete") {
      event.preventDefault();
      setTyped("");
      time.clear();
    } else if (event.key.length === 1 && event.key !== " ") {
      event.preventDefault();
      type(event.key, event.currentTarget);
    }
  };

  // On-screen keyboards do not always send key events: what they typed arrives here instead.
  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const shown = typed === "" ? text : typed;
    const character = event.target.value.replace(shown, "").slice(-1) || event.target.value.slice(-1);
    if (character) type(character, event.currentTarget);
  };

  return (
    <input
      data-slot={slot}
      role="spinbutton"
      type="text"
      autoComplete="off"
      disabled={time.disabled}
      value={typed === "" ? text : typed}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onBlur={(event) => {
        // A single digit left waiting is the number.
        if (waiting.current !== "" && range && Number(waiting.current) >= range[0]) onNumber?.(Number(waiting.current));
        setTyped("");
        onBlur?.(event);
      }}
      className={cn(segmentClass, className)}
      {...props}
    />
  );
}

const EMPTY = "––";

export type TimePickerPartProps = Omit<ComponentProps<"input">, "value" | "defaultValue" | "type" | "onChange">;

/** The hour: 0 to 23, or 1 to 12 beside an AM/PM part (stepping then stays within the morning or the afternoon). */
export function TimePickerHour(props: TimePickerPartProps) {
  const time = useTime("TimePickerHour");
  const { hour, cycle, periods } = time;
  const minute = time.minute ?? time.start.minute;
  const half = hour !== null && hour >= 12 ? 1 : 0;
  const shown = hour === null ? null : cycle === 24 ? hour : hour % 12 || 12;

  /** An hour as written on this clock, to the 24-hour value in the current half of the day. */
  const from = (written: number): number => (cycle === 24 ? written : (written % 12) + half * 12);

  return (
    <Segment
      slot="time-picker-hour"
      inputMode="numeric"
      aria-label={time.labels.hour}
      aria-valuenow={shown ?? undefined}
      aria-valuemin={cycle === 24 ? 0 : 1}
      aria-valuemax={cycle === 24 ? 23 : 12}
      aria-valuetext={shown === null ? time.labels.empty : cycle === 24 ? pad(shown) : `${shown} ${periods[half]}`}
      text={shown === null ? EMPTY : cycle === 24 ? pad(shown) : String(shown)}
      onStep={(direction) => {
        if (hour === null) time.set(time.start.hour, time.start.minute);
        else if (cycle === 24) time.set((hour + direction + 24) % 24, minute);
        else time.set(half * 12 + (((hour % 12) + direction + 12) % 12), minute);
      }}
      onLimit={(end) => time.set(cycle === 24 ? (end === -1 ? 0 : 23) : half * 12 + (end === -1 ? 0 : 11), minute)}
      range={cycle === 24 ? [0, 23] : [1, 12]}
      onNumber={(written) => time.set(from(written), minute)}
      {...props}
    />
  );
}

/** The minute: 00 to 59. Up and Down move to the next or the previous multiple of `minuteStep`. */
export function TimePickerMinute(props: TimePickerPartProps) {
  const time = useTime("TimePickerMinute");
  const { minute, minuteStep } = time;
  const hour = time.hour ?? time.start.hour;
  return (
    <Segment
      slot="time-picker-minute"
      inputMode="numeric"
      aria-label={time.labels.minute}
      aria-valuenow={minute ?? undefined}
      aria-valuemin={0}
      aria-valuemax={59}
      aria-valuetext={minute === null ? time.labels.empty : pad(minute)}
      text={minute === null ? EMPTY : pad(minute)}
      onStep={(direction) => {
        if (minute === null) return time.set(time.start.hour, time.start.minute);
        const next = direction === 1 ? Math.floor(minute / minuteStep) * minuteStep + minuteStep : Math.ceil(minute / minuteStep) * minuteStep - minuteStep;
        const last = Math.floor(59 / minuteStep) * minuteStep;
        time.set(hour, next > 59 ? 0 : next < 0 ? last : next);
      }}
      onLimit={(end) => time.set(hour, end === -1 ? 0 : Math.floor(59 / minuteStep) * minuteStep)}
      range={[0, 59]}
      onNumber={(typed) => time.set(hour, typed)}
      {...props}
    />
  );
}

/** Before or after noon, in the locale's words. Up, Down or a press switches it; typing the first letter of either sets it. */
export function TimePickerPeriod({ className, onClick, ...props }: TimePickerPartProps) {
  const time = useTime("TimePickerPeriod");
  const { hour, periods } = time;
  const minute = time.minute ?? time.start.minute;
  const half = hour !== null && hour >= 12 ? 1 : 0;
  const to = (next: number): void => time.set(((hour ?? time.start.hour) % 12) + next * 12, minute);
  const length = Math.max(periods[0].length, periods[1].length);
  return (
    <Segment
      slot="time-picker-period"
      inputMode="none"
      // As wide as the longer of the two words.
      style={{ width: `${length + 0.5}ch` }}
      aria-label={time.labels.period}
      aria-valuenow={hour === null ? undefined : half}
      aria-valuemin={0}
      aria-valuemax={1}
      aria-valuetext={hour === null ? time.labels.empty : periods[half]}
      text={hour === null ? EMPTY : periods[half]}
      onStep={() => to(hour === null ? half : 1 - half)}
      onLimit={(end) => to(end === -1 ? 0 : 1)}
      onLetter={(letter) => {
        const first = periods.findIndex((period) => period.toLowerCase().startsWith(letter));
        if (first !== -1) to(first);
      }}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) to(hour === null ? half : 1 - half);
      }}
      className={cn("ms-1 cursor-pointer", className)}
      {...props}
    />
  );
}

/** The mark between the hour and the minute. Decoration: screen readers hear the parts' own names. */
export function TimePickerSeparator({ className, children, ...props }: ComponentProps<"span">) {
  return (
    <span aria-hidden="true" data-slot="time-picker-separator" className={cn("text-muted-foreground", className)} {...props}>
      {children ?? ":"}
    </span>
  );
}
