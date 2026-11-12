"use client";
/**
 * @name sparkline
 * @category viz
 * @description A tiny line, area or bar chart with no axes, for a stat tile or a table cell, described in words for assistive technology.
 * @when The shape of a trend beside a number that carries the value. Size it with classes (`h-8 w-24` by default). When the reader needs to read values off it, use line-chart or bar-chart.
 * @example
 * <Sparkline data={[4, 6, 5, 9, 12, 10, 14]} label="Signups, last 7 days" />
 * <Sparkline data={[3, 8, 2, 7, 5]} type="bar" className="h-6 w-16" />
 */
import { scaleLinear } from "d3-scale";
import { area as areaShape, line as lineShape } from "d3-shape";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { useSize } from "@/lib/use-size";
import { chartSeries, formatNumber, type ChartFormat } from "@/components/viz/chart";

export type SparklineProps = Omit<ComponentProps<"span">, "children"> &
  Omit<ChartFormat, "timeZone"> & {
    /** The values, oldest first. */
    data: readonly number[];
    type?: "line" | "area" | "bar";
    /** What the numbers are ("Signups, last 7 days"). The first, last, lowest and highest values are added to it. */
    label?: string;
    /** Which series colour, 0-based. Default 0, the highlight. */
    series?: number;
  };

/** Room for the end marker and the line's own width. */
const PAD = 4;

export function Sparkline({ data, type = "line", label, series = 0, locale, formatValue, className, ...props }: SparklineProps) {
  const { ref, width, height } = useSize<HTMLSpanElement>();
  const values = data.filter((value) => Number.isFinite(value));
  const number = formatValue ?? ((value: number) => formatNumber(value, locale));
  const first = values[0];
  const last = values[values.length - 1];
  const summary =
    first === undefined || last === undefined
      ? "no data"
      : `${values.length} values, from ${number(first)} to ${number(last)}, lowest ${number(Math.min(...values))}, highest ${number(Math.max(...values))}`;
  const style = chartSeries(series);

  let drawing = null;
  if (width > 0 && height > 0 && values.length > 0) {
    const low = Math.min(...values);
    const high = Math.max(...values);
    // A line may zoom in on its own range; a fill or a bar is read by its height, so it starts at zero.
    const from = type === "line" ? low : Math.min(0, low);
    const to = type === "line" ? high : Math.max(0, high);
    const y = scaleLinear()
      .domain(from === to ? [from - 1, to + 1] : [from, to])
      .range([height - PAD, PAD]);
    const x = scaleLinear()
      .domain([0, Math.max(1, values.length - 1)])
      .range([PAD, width - PAD]);
    if (type === "bar") {
      const step = (width - PAD * 2) / values.length;
      const thickness = Math.max(1, Math.min(8, step - 1));
      drawing = values.map((value, index) => {
        const a = y(0);
        const b = y(value);
        return <rect key={index} x={PAD + index * step + (step - thickness) / 2} y={Math.min(a, b)} width={thickness} height={Math.max(1, Math.abs(b - a))} className={style.fill} />;
      });
    } else {
      const indices = values.map((_, index) => index);
      const at = (index: number): number => y(values[index] ?? 0);
      drawing = (
        <>
          {type === "area" ? <path d={areaShape<number>().x(x).y0(y(0)).y1(at)(indices) ?? undefined} className={style.fill} fillOpacity={0.12} /> : null}
          <path d={lineShape<number>().x(x).y(at)(indices) ?? undefined} fill="none" className={style.stroke} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
          {/* The latest value, marked. */}
          <circle cx={x(values.length - 1)} cy={at(values.length - 1)} r={2.5} className={cn(style.fill, "stroke-background")} strokeWidth={1.5} paintOrder="stroke" />
        </>
      );
    }
  }

  return (
    <span ref={ref} data-slot="sparkline" role="img" aria-label={label ? `${label}: ${summary}` : summary} className={cn("inline-block h-8 w-24 align-middle", className)} {...props}>
      {drawing ? (
        <svg aria-hidden="true" width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block overflow-visible animate-in fade-in-0 motion-reduce:animate-none">
          {drawing}
        </svg>
      ) : null}
    </span>
  );
}
