"use client";
/**
 * @name number-ticker
 * @category motion
 * @description A number that counts up to its value when it scrolls into view, formatted with Intl.NumberFormat.
 * @when A headline statistic: customers, revenue, a percentage. Not for values that update live (render those directly), and not for more than a few on one screen.
 * @example
 * <NumberTicker value={12480} />
 * <NumberTicker value={0.9997} options={{ style: "percent", maximumFractionDigits: 2 }} />
 * <NumberTicker value={48000} locale="de-DE" options={{ style: "currency", currency: "EUR", maximumFractionDigits: 0 }} />
 */
import { animate, useInView } from "motion/react";
import { useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, type ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { DURATION, EASE, isOffscreen, useMotionSafe } from "@/lib/motion";

export type NumberTickerProps = Omit<ComponentProps<"span">, "children"> & {
  /** The number to arrive at. This is what the server renders. */
  value: number;
  /** Where the count starts. Default 0. */
  from?: number;
  /** A BCP 47 locale. Default "en-US"; set it explicitly so the server and the browser format alike. */
  locale?: string;
  /** Intl.NumberFormat options: style, currency, notation, fraction digits. */
  options?: Intl.NumberFormatOptions;
  /** Seconds the count takes. Default: the scene duration (0.7). */
  duration?: number;
  /** Seconds to wait once it is in view. Default 0. */
  delay?: number;
  /** Also count when it is already in view as the page loads. Default false: the value is left as it is. */
  playOnLoad?: boolean;
};

export function NumberTicker({
  className,
  value,
  from = 0,
  locale = "en-US",
  options,
  duration = DURATION.scene,
  delay = 0,
  playOnLoad = false,
  ref,
  ...props
}: NumberTickerProps) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const valueRef = useRef<HTMLSpanElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  useImperativeHandle(ref, () => rootRef.current as HTMLSpanElement, []);

  // The options object is compared by content, not identity, so an inline object does not rebuild the formatter.
  const optionsKey = JSON.stringify(options ?? null);
  const formatter = useMemo(() => new Intl.NumberFormat(locale, options), [locale, optionsKey]);

  const safe = useMotionSafe();
  const inView = useInView(rootRef, { once: true });
  const latest = useRef({ value, from, formatter, duration, delay });
  const phase = useRef<"idle" | "armed" | "done">("idle");
  useLayoutEffect(() => {
    latest.current = { value, from, formatter, duration, delay };
  });

  // Before paint, and only if the visitor cannot see it yet (or playOnLoad): swap the value for the start of
  // the count. The real value stays in the markup (it keeps the width and is what assistive technology
  // reads); the count is drawn over it in an aria-hidden span, so nothing shifts as digits are added.
  useLayoutEffect(() => {
    const root = rootRef.current;
    const final = valueRef.current;
    const count = countRef.current;
    if (!safe || !root || !final || !count) return;
    if (playOnLoad || isOffscreen(root)) {
      final.style.opacity = "0";
      count.textContent = latest.current.formatter.format(latest.current.from);
      phase.current = "armed";
    }
    return () => {
      final.style.removeProperty("opacity");
      count.textContent = "";
      phase.current = "idle";
    };
  }, [safe, playOnLoad]);

  useEffect(() => {
    const final = valueRef.current;
    const count = countRef.current;
    if (!safe || !inView || !final || !count || phase.current !== "armed") return;
    phase.current = "done";
    const current = latest.current;
    let finished = false;
    const animation = animate(current.from, current.value, {
      duration: current.duration,
      delay: current.delay,
      ease: EASE,
      onUpdate: (number) => {
        count.textContent = latest.current.formatter.format(number);
      },
      onComplete: () => {
        finished = true;
        final.style.removeProperty("opacity");
        count.textContent = "";
      },
    });
    return () => {
      animation.stop();
      // Interrupted (an effect re-run): leave it ready to count again rather than stuck part-way.
      if (!finished && phase.current === "done") phase.current = "armed";
    };
  }, [safe, inView]);

  return (
    <span ref={rootRef} data-slot="number-ticker" className={cn("relative inline-block whitespace-nowrap tabular-nums", className)} {...props}>
      <span ref={valueRef} data-slot="number-ticker-value">
        {formatter.format(value)}
      </span>
      <span ref={countRef} aria-hidden="true" data-slot="number-ticker-count" className="pointer-events-none absolute inset-y-0 start-0" />
    </span>
  );
}
