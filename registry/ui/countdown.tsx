"use client";
/**
 * @name countdown
 * @category ui
 * @description The time left until a moment, as text that counts down ("4 min 12 s"), announced to screen-reader users only at the moments the project lists.
 * @when Something the person holds for a limited time: a reserved seat, a price that is kept, a code that expires, a session about to end. Say what happens at the end and offer a way to get more time beside it. Not for decoration or pressure: a countdown that restarts or means nothing is a dark pattern. For progress through a known amount of work use progress.
 * @example
 * <p>
 *   Your seats are held for{" "}
 *   <Countdown
 *     to={hold.expiresAt}
 *     locale="en"
 *     thresholds={[300, 60]}
 *     announceAt={(_, left) => `${left} left to finish booking`}
 *     onExpire={release}
 *     expiredLabel="no longer: the hold has ended"
 *   />
 * </p>
 */
import { useEffect, useMemo, useRef, useSyncExternalStore, type ComponentProps, type ReactNode } from "react";
import { announce } from "@/lib/announce";
import { cn } from "@/lib/cn";

/* One clock for every countdown on the page: it ticks once a second while anything listens and the tab is visible. */
const listeners = new Set<() => void>();
let nowSeconds = 0;
let timer: number | undefined;

const read = (): number => Math.floor(Date.now() / 1000);

function tick(): void {
  const next = read();
  if (next === nowSeconds) return;
  nowSeconds = next;
  for (const listener of listeners) listener();
}

function run(): void {
  window.clearInterval(timer);
  timer = undefined;
  if (listeners.size === 0 || document.visibilityState === "hidden") return;
  tick();
  // Four checks a second, so that the shown second never lags the real one by more than a quarter.
  timer = window.setInterval(tick, 250);
}

function subscribe(listener: () => void): () => void {
  if (listeners.size === 0) document.addEventListener("visibilitychange", run);
  listeners.add(listener);
  run();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) document.removeEventListener("visibilitychange", run);
    run();
  };
}

function snapshot(): number {
  if (nowSeconds === 0) nowSeconds = read();
  return nowSeconds;
}

/** The server does not know when the page will be looked at. */
const serverSnapshot = (): null => null;

export type CountdownParts = { hours: number; minutes: number; seconds: number; total: number };

export type CountdownProps = Omit<ComponentProps<"span">, "children"> & {
  /** The moment it counts down to: a Date, a timestamp in milliseconds, or an ISO string. */
  to: Date | number | string;
  /** The locale the units are written in ("4 min 12 s", "4 Min. 12 Sek."). Default: the runtime's. */
  locale?: string;
  /** Seconds left at which to speak, for example [300, 60]. Nothing is announced between them. */
  thresholds?: number[];
  /** The sentence said at a threshold, from the seconds left and the time as text. Default: the time as text. */
  announceAt?: (secondsLeft: number, text: string) => string;
  /** Called once when the time runs out (also when it had already run out as the page loaded). */
  onExpire?: () => void;
  /** Shown, and said, once the time has run out. */
  expiredLabel?: string;
  /** Writes the time yourself ("04:12"). */
  format?: (parts: CountdownParts) => string;
  /** Shown on the server and until the page is live, in place of a time nobody can know yet. Keep it about as wide as a time. */
  fallback?: ReactNode;
};

/**
 * A timer (`role="timer"`): screen readers can read it on demand but are not interrupted every second.
 * Figures are tabular and the seconds keep two digits while there are minutes, so the text around it does
 * not move as it counts. It stops ticking while the tab is hidden and is right again the moment it returns,
 * because it is worked out from the clock, not counted.
 */
export function Countdown({ to, locale, thresholds, announceAt, onExpire, expiredLabel = "Time is up", format, fallback = "–", className, ...props }: CountdownProps) {
  const now = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const target = Math.floor(new Date(to).getTime() / 1000);
  const left = now === null || Number.isNaN(target) ? null : Math.max(0, target - now);

  const units = useMemo(() => {
    const unit = (name: "hour" | "minute" | "second", pad: boolean): Intl.NumberFormat =>
      new Intl.NumberFormat(locale, { style: "unit", unit: name, unitDisplay: "short", minimumIntegerDigits: pad ? 2 : 1 });
    return { hour: unit("hour", false), minute: unit("minute", false), minutePadded: unit("minute", true), second: unit("second", false), secondPadded: unit("second", true) };
  }, [locale]);

  let text: string | null = null;
  if (left !== null && left > 0) {
    const parts: CountdownParts = { hours: Math.floor(left / 3600), minutes: Math.floor((left % 3600) / 60), seconds: left % 60, total: left };
    if (format) text = format(parts);
    else if (parts.hours > 0) text = `${units.hour.format(parts.hours)} ${units.minutePadded.format(parts.minutes)} ${units.secondPadded.format(parts.seconds)}`;
    else if (parts.minutes > 0) text = `${units.minute.format(parts.minutes)} ${units.secondPadded.format(parts.seconds)}`;
    else text = units.second.format(parts.seconds);
  }

  // What the effects below need at the moment they run, without running again when it changes.
  const latest = useRef({ thresholds, announceAt, onExpire, expiredLabel, text });
  useEffect(() => {
    latest.current = { thresholds, announceAt, onExpire, expiredLabel, text };
  });
  const previous = useRef<number | null>(null);
  const expired = useRef(false);
  useEffect(() => {
    if (left === null) return;
    const before = previous.current;
    previous.current = left;
    const current = latest.current;
    if (left === 0) {
      if (expired.current) return;
      expired.current = true;
      // Said only when the person saw it run out, not for a page that loads after the end.
      if (before !== null) announce(current.expiredLabel);
      current.onExpire?.();
      return;
    }
    expired.current = false;
    if (before === null || current.text === null) return;
    // A threshold is crossed when the last tick was above it and this one is at or below it (a hidden tab can skip seconds).
    const crossed = (current.thresholds ?? []).filter((threshold) => before > threshold && left <= threshold);
    if (crossed.length > 0) announce(current.announceAt ? current.announceAt(left, current.text) : current.text);
  }, [left]);

  return (
    <span
      role="timer"
      data-slot="countdown"
      data-state={left === null ? "pending" : left === 0 ? "expired" : "running"}
      className={cn("inline-block whitespace-nowrap tabular-nums", className)}
      {...props}
    >
      {left === null ? fallback : left === 0 ? expiredLabel : text}
    </span>
  );
}
