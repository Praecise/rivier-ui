"use client";
/**
 * @name calendar-heatmap
 * @category viz
 * @description A value per day laid out as a calendar, a column for each week and a row for each weekday, coloured on one hue from faint to strong, with month and weekday names and arrow keys that move by day and by week.
 * @when Showing a daily measure over months: activity, sales per day, rainfall, where the pattern by weekday and season matters. For a few weeks with exact values use bar-chart; for a trend use line-chart; to pick a day use calendar.
 * @example
 * <CalendarHeatmap
 *   label="Workouts per day"
 *   data={[{ day: "2026-01-05", count: 1 }, { day: "2026-01-06", count: 2 }, { day: "2026-01-09", count: 1 }]}
 *   day="day"
 *   value="count"
 *   from="2026-01-01"
 *   to="2026-03-31"
 * />
 */
import { scaleLinear } from "d3-scale";
import { useMemo, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import { ChartContainer, ChartEmpty, chartSequential, ChartSvg, ChartTooltip, formatNumber, readNumber, useChartCursor, type ChartBaseProps } from "@/components/viz/chart";

export type CalendarHeatmapProps<T extends object> = ChartBaseProps & {
  /** One object per day that has a value. Days without one are drawn empty. */
  data: readonly T[];
  /** The field holding the day as "YYYY-MM-DD". */
  day: keyof T & string;
  /** The field holding the day's number. */
  value: keyof T & string;
  /** The first and last day shown, "YYYY-MM-DD". Default: the first and last day in the data. */
  from?: string;
  to?: string;
  /** The day a week starts on: 0 Sunday … 6 Saturday. Default 1 (Monday). */
  weekStart?: number;
  /** The name of the value in the tooltip and the table. Default: the field name. */
  valueLabel?: string;
  /** Said for a day without a value. Default "No value". */
  noValue?: string;
  /** The scale under the chart. Default true. */
  showLegend?: boolean;
};

const DAY = 86400000;
const ROUND = "[rx:min(calc(var(--radius)*0.5),3px)] [ry:min(calc(var(--radius)*0.5),3px)]";
const STEPS = [0, 0.25, 0.5, 0.75, 1];

const parse = (text: string): number | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  return match ? Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
};
const iso = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

export function CalendarHeatmap<T extends object>({
  data,
  day,
  value,
  from,
  to,
  weekStart = 1,
  valueLabel,
  noValue = "No value",
  showLegend = true,
  label,
  aspect,
  height,
  emptyLabel,
  locale = "en-US",
  formatValue,
  className,
  ...props
}: CalendarHeatmapProps<T>) {
  const model = useMemo(() => {
    const values = new Map<number, number>();
    for (const row of data) {
      const at = parse(String((row as Record<string, unknown>)[day] ?? ""));
      const amount = readNumber(row, value);
      if (at === null || amount === null) continue;
      values.set(at, (values.get(at) ?? 0) + amount);
    }
    const keys = [...values.keys()];
    const start = (from ? parse(from) : null) ?? (keys.length > 0 ? Math.min(...keys) : null);
    const end = (to ? parse(to) : null) ?? (keys.length > 0 ? Math.max(...keys) : null);
    if (start === null || end === null || end < start) return { days: [] as number[], values, offset: 0, low: 0, high: 0 };
    const days: number[] = [];
    for (let at = start; at <= end; at += DAY) days.push(at);
    // Where the first day falls in its week, counted from the week's first day.
    const offset = (new Date(start).getUTCDay() - weekStart + 7) % 7;
    const amounts = days.flatMap((at) => (values.has(at) ? [values.get(at) ?? 0] : []));
    return { days, values, offset, low: Math.min(0, ...amounts), high: Math.max(0, ...amounts) };
  }, [data, day, value, from, to, weekStart]);

  const { days, values, offset, low, high } = model;
  const cursor = useChartCursor(days.length);
  const number = formatValue ?? ((amount: number) => formatNumber(amount, locale));
  const full = new Intl.DateTimeFormat(locale, { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
  const monthName = new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" });
  const weekdayName = new Intl.DateTimeFormat(locale, { weekday: "narrow", timeZone: "UTC" });
  const level = scaleLinear()
    .domain(low === high ? [low, low + 1] : [low, high])
    .range([0, 1])
    .clamp(true);
  const weeks = Math.ceil((days.length + offset) / 7);
  const textOf = (at: number): string => (values.has(at) ? number(values.get(at) ?? 0) : noValue);
  const table = {
    caption: label,
    columns: [day, valueLabel ?? value],
    rows: days.filter((at) => values.has(at)).map((at) => [iso(at), number(values.get(at) ?? 0)]),
  };
  const current = cursor.active === null ? undefined : days[cursor.active];
  const onKeyDown = (event: KeyboardEvent<SVGSVGElement>): void => {
    // Down is the next day, Right the same weekday a week on: the calendar's own geometry.
    const steps: Record<string, number> = { ArrowDown: 1, ArrowUp: -1, ArrowRight: 7, ArrowLeft: -7, PageDown: 28, PageUp: -28 };
    const step = steps[event.key];
    if (step !== undefined) {
      event.preventDefault();
      cursor.select(cursor.active === null ? 0 : cursor.active + step);
      return;
    }
    cursor.svgProps.onKeyDown(event);
  };
  const shape = aspect ?? Math.max(2.4, (weeks + 2.5) / 9);

  return (
    <div data-slot="calendar-heatmap" className={cn("flex w-full min-w-0 flex-col gap-3", className)} {...props}>
      <ChartContainer aspect={shape} height={height} table={table} announcement={cursor.keyboard && current !== undefined ? `${full.format(current)}: ${textOf(current)}` : ""}>
        {({ width, height: plotHeight }) => {
          if (days.length === 0) return <ChartEmpty>{emptyLabel}</ChartEmpty>;
          const left = 20;
          const top = 18;
          const cell = Math.max(3, Math.min((width - left) / weeks, (plotHeight - top) / 7));
          const gap = cell > 8 ? 2 : 1;
          const place = (index: number): { x: number; y: number } => {
            const slot = index + offset;
            return { x: left + Math.floor(slot / 7) * cell, y: top + (slot % 7) * cell };
          };
          const months = days.flatMap((at, index) => (new Date(at).getUTCDate() === 1 || index === 0 ? [{ at, x: place(index).x }] : []));
          const shown = cursor.active === null ? undefined : place(cursor.active);
          return (
            <>
              <ChartSvg label={label} width={width} height={plotHeight} interactive {...cursor.svgProps} onKeyDown={onKeyDown}>
                <g aria-hidden="true" className="fill-muted-foreground text-xs">
                  {months.map((month, index) => {
                    const next = months[index + 1];
                    return next && next.x - month.x < 28 ? null : (
                      <text key={month.at} x={month.x} y={top - 6}>
                        {monthName.format(month.at)}
                      </text>
                    );
                  })}
                  {[0, 2, 4, 6].map((row) => {
                    // A day known to fall on the weekday of this row.
                    const sample = Date.UTC(2026, 0, 4 + ((weekStart + row) % 7));
                    return cell >= 8 ? (
                      <text key={row} x={left - 6} y={top + row * cell + cell / 2} dy="0.32em" textAnchor="end">
                        {weekdayName.format(sample)}
                      </text>
                    ) : null;
                  })}
                </g>
                <g aria-hidden="true">
                  {days.map((at, index) => {
                    const { x, y } = place(index);
                    const has = values.has(at);
                    return (
                      <g key={at} onPointerEnter={() => cursor.point(index)}>
                        <rect x={x} y={y} width={cell} height={cell} fill="transparent" />
                        {has ? (
                          <rect x={x + gap / 2} y={y + gap / 2} width={cell - gap} height={cell - gap} className={ROUND} style={{ fill: chartSequential(level(values.get(at) ?? 0)) }} />
                        ) : (
                          <rect
                            x={x + gap / 2 + 0.5}
                            y={y + gap / 2 + 0.5}
                            width={Math.max(0, cell - gap - 1)}
                            height={Math.max(0, cell - gap - 1)}
                            fill="none"
                            className={cn("stroke-border", ROUND)}
                          />
                        )}
                      </g>
                    );
                  })}
                  {shown ? (
                    <rect
                      x={shown.x + gap / 2}
                      y={shown.y + gap / 2}
                      width={cell - gap}
                      height={cell - gap}
                      fill="none"
                      className={cn("pointer-events-none stroke-foreground", ROUND)}
                      strokeWidth={2}
                    />
                  ) : null}
                </g>
              </ChartSvg>
              {shown && current !== undefined ? (
                <ChartTooltip
                  x={shown.x + cell / 2}
                  y={shown.y + cell / 2}
                  side={shown.x > width / 2 ? "left" : "right"}
                  title={full.format(current)}
                  rows={[{ label: valueLabel ?? value, value: textOf(current) }]}
                />
              ) : null}
            </>
          );
        }}
      </ChartContainer>
      {showLegend && days.length > 0 ? (
        <div data-slot="calendar-heatmap-legend" aria-hidden="true" className="flex items-center gap-2 self-end text-xs tabular-nums text-muted-foreground">
          <span>{number(low)}</span>
          <span className="flex gap-0.5">
            {STEPS.map((step) => (
              <span key={step} className="size-3 rounded-[min(calc(var(--radius)*0.5),3px)]" style={{ backgroundColor: chartSequential(step) }} />
            ))}
          </span>
          <span>{number(high)}</span>
        </div>
      ) : null}
    </div>
  );
}
