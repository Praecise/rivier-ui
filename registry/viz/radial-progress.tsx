"use client";
/**
 * @name radial-progress
 * @category viz
 * @description A ring gauge for one value against a limit, with the value and a label in the centre.
 * @when One ratio: a quota used, a score, a goal reached. Size it with a width class (`w-32` by default). For several ratios side by side use a list of bars (bar-chart horizontal), not a ring each; for parts of a whole use donut-chart.
 * @example
 * <RadialProgress value={72} label="Storage used" />
 * <RadialProgress value={3} max={5} label="Steps done" formatValue={(value) => `${value} of 5`} className="w-40" />
 */
import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { chartSeries, formatNumber } from "@/components/viz/chart";

export type RadialProgressProps = Omit<ComponentProps<"div">, "children"> & {
  value: number;
  min?: number;
  max?: number;
  /** What is measured. Shown under the value, and the gauge's accessible name. */
  label: string;
  /** The text in the centre. Default: the share of the range as a percentage. */
  formatValue?: (value: number) => string;
  /** A BCP 47 locale for the default percentage. Default "en-US". */
  locale?: string;
  /** Ring thickness, as a percentage of the gauge's width. */
  thickness?: number;
  /** The ends of the filled arc. */
  cap?: "round" | "butt";
  /** Which series colour, 0-based. Default 0, the highlight. */
  series?: number;
  /** Replaces the centre (the value and the label) with your own content. */
  children?: ReactNode;
};

/**
 * A client component although it holds no state: it calls helpers from chart, which is a client module, and a
 * server component cannot call a client module's functions.
 */
export function RadialProgress({ value, min = 0, max = 100, label, formatValue, locale, thickness = 8, cap = "round", series = 0, children, className, ...props }: RadialProgressProps) {
  const span = max - min;
  const share = span > 0 && Number.isFinite(value) ? Math.max(0, Math.min(1, (value - min) / span)) : 0;
  const text = formatValue ? formatValue(value) : formatNumber(share, locale, { style: "percent", maximumFractionDigits: 0 });
  const stroke = Math.max(1, Math.min(30, thickness));
  const radius = 50 - stroke / 2;
  const length = 2 * Math.PI * radius;
  const style = chartSeries(series);

  return (
    <div
      data-slot="radial-progress"
      role="meter"
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : min}
      aria-valuetext={text}
      className={cn("relative aspect-square w-32", className)}
      {...props}
    >
      <svg aria-hidden="true" viewBox="0 0 100 100" className="block size-full -rotate-90">
        {/* The track is the same colour, fainter, so the ring reads as one thing. */}
        <circle cx={50} cy={50} r={radius} fill="none" className={style.stroke} strokeOpacity={0.16} strokeWidth={stroke} />
        {share > 0 ? (
          <circle
            cx={50}
            cy={50}
            r={radius}
            fill="none"
            // The arc is one dash as long as the circle, shifted back by what is not filled. It fills once on
            // mount by animating stroke-dashoffset, from the whole length (set as --rui-ring-length for the
            // rui-ring-in keyframes in the theme) to its place. stroke-dashoffset is a paint-only property: it
            // moves no layout, so it is the one exception here to "only transform and opacity". Under reduced
            // motion, and until those keyframes are in the stylesheet, the ring is simply drawn filled.
            className={cn(style.stroke, "motion-safe:animate-[rui-ring-in_var(--duration-scene)_var(--ease)_both]")}
            style={{ "--rui-ring-length": length } as CSSProperties}
            strokeWidth={stroke}
            strokeLinecap={cap}
            strokeDasharray={`${length} ${length}`}
            strokeDashoffset={length * (1 - share)}
          />
        ) : null}
      </svg>
      <div data-slot="radial-progress-center" className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
        {children ?? (
          <>
            <span className="text-xl font-semibold text-foreground">{text}</span>
            <span className="text-xs text-muted-foreground">{label}</span>
          </>
        )}
      </div>
    </div>
  );
}
