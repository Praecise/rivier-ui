"use client";
/**
 * @name line-chart
 * @category viz
 * @description A line chart of one or more series over a numeric or time x, with a crosshair tooltip, arrow-key reading and labels at the line ends.
 * @when Change over time or along a number, for up to about five series on one shared scale. For a single series whose volume matters use area-chart; for separate categories use bar-chart; never plot two different units against two y axes, use two charts.
 * @example
 * <LineChart
 *   label="Requests and errors per day"
 *   data={[
 *     { day: new Date("2026-03-01"), requests: 120, errors: 4 },
 *     { day: new Date("2026-03-02"), requests: 180, errors: 9 },
 *     { day: new Date("2026-03-03"), requests: 150, errors: 3 },
 *   ]}
 *   x="day"
 *   series={[
 *     { key: "requests", label: "Requests" },
 *     { key: "errors", label: "Errors" },
 *   ]}
 * />
 */
import { scaleLinear, scaleUtc } from "d3-scale";
import { area as areaShape, curveLinear, curveMonotoneX, curveStep, line as lineShape } from "d3-shape";
import { useMemo, useState, type ComponentProps, type KeyboardEvent, type PointerEvent } from "react";
import { cn } from "@/lib/cn";
import {
  axisNumberFormatter,
  ChartAxis,
  ChartContainer,
  ChartGrid,
  ChartLegend,
  ChartMark,
  chartSeries,
  ChartSvg,
  ChartTooltip,
  dateFormatter,
  estimateTextWidth,
  formatNumber,
  readNumber,
  type ChartFormat,
  type ChartSeries,
} from "@/components/viz/chart";

export type LineChartProps<T extends object> = Omit<ComponentProps<"div">, "children"> &
  ChartFormat & {
    /** One object per x position. */
    data: readonly T[];
    /** The field that holds x: a number or a Date. */
    x: keyof T & string;
    /** The lines, in a fixed order: the first takes the highlight colour. */
    series: readonly ChartSeries<T>[];
    /** What the chart shows, for assistive technology. */
    label: string;
    /** How points are joined. "monotone" smooths without overshooting the data. */
    curve?: "linear" | "monotone" | "step";
    showGrid?: boolean;
    /** A marker on every point, when there is room for them. */
    showDots?: boolean;
    /** Default: shown for two or more series. One series is named by the chart's title. */
    showLegend?: boolean;
    /** Name each line at its end when there are at most four and there is room. */
    endLabels?: boolean;
    /** Start the y axis at zero. Default false for lines, always true for areas. */
    zero?: boolean;
    /** The name of the x column in the table alternative. Default: the `x` field name. */
    xLabel?: string;
    /** Replaces the x format on the axis, in the tooltip and in the table. */
    formatX?: (value: number | Date) => string;
    /** Width / height of the plot. */
    aspect?: number;
    /** A fixed plot height in pixels instead of a ratio. */
    height?: number;
  };

export type SeriesChartProps<T extends object> = LineChartProps<T> & {
  /** Fill under each line with the series colour at low opacity. */
  area?: boolean;
  /** Stack the series on top of each other (areas only). */
  stacked?: boolean;
  /** The root's data-slot. */
  slot?: string;
};

const CURVES = { linear: curveLinear, monotone: curveMonotoneX, step: curveStep };
const TOP = 10;
const BOTTOM = 26;

/** The engine behind line-chart and area-chart. Use those; this is exported so they can share it. */
export function SeriesChart<T extends object>({
  data,
  x,
  series,
  label,
  curve = "linear",
  showGrid = true,
  showDots = false,
  showLegend,
  endLabels = true,
  zero,
  xLabel,
  formatX,
  aspect,
  height,
  locale,
  timeZone,
  formatValue,
  area = false,
  stacked = false,
  slot = "line-chart",
  className,
  ...props
}: SeriesChartProps<T>) {
  const [active, setActive] = useState<number | null>(null);
  const [keyboard, setKeyboard] = useState(false);
  const stack = area && stacked;
  const fromZero = area || zero === true;

  const model = useMemo(() => {
    const isTime = data.some((row) => (row as Record<string, unknown>)[x] instanceof Date);
    const rows = data
      .map((row) => {
        const raw = (row as Record<string, unknown>)[x];
        return { row, x: raw instanceof Date ? raw.getTime() : typeof raw === "number" ? raw : Number.NaN };
      })
      .filter((entry) => Number.isFinite(entry.x))
      .sort((a, b) => a.x - b.x);
    const xs = rows.map((entry) => entry.x);
    const values = series.map((item) => rows.map((entry) => readNumber(entry.row, item.key)));
    // Where each series is drawn: its own value, or its value on top of the series before it.
    const base = values.map((list) => list.map(() => 0));
    const tops = values.map((list) => list.map((value) => value ?? 0));
    if (stack) {
      for (let s = 1; s < values.length; s += 1) {
        for (let i = 0; i < xs.length; i += 1) {
          base[s]![i] = tops[s - 1]?.[i] ?? 0;
          tops[s]![i] = (base[s]?.[i] ?? 0) + (values[s]?.[i] ?? 0);
        }
      }
    }
    let low = Infinity;
    let high = -Infinity;
    values.forEach((list, s) =>
      list.forEach((value, i) => {
        if (value === null && !stack) return;
        const top = tops[s]?.[i] ?? 0;
        low = Math.min(low, top);
        high = Math.max(high, top);
      }),
    );
    if (low === Infinity) {
      low = 0;
      high = 1;
    }
    return { isTime, rows, xs, values, base, tops, low, high };
  }, [data, x, series, stack]);

  const { isTime, xs, values, base, tops } = model;
  const count = xs.length;
  const span = count > 0 ? (xs[count - 1] ?? 0) - (xs[0] ?? 0) : 0;
  const value = formatValue ?? ((number: number) => formatNumber(number, locale));
  const plainX = (number: number): string => formatNumber(number, locale, { useGrouping: false, maximumFractionDigits: 2 });
  const xText = (number: number, detail: "axis" | "full"): string =>
    formatX ? formatX(isTime ? new Date(number) : number) : isTime ? dateFormatter(span, detail, locale, timeZone)(number) : plainX(number);

  const table = {
    caption: label,
    columns: [xLabel ?? x, ...series.map((item) => item.label)],
    rows: xs.map((position, i) => [xText(position, "full"), ...values.map((list) => (list[i] === null || list[i] === undefined ? "" : value(list[i] as number)))]),
  };

  const tooltipRows =
    active === null
      ? []
      : series.flatMap((item, s) => {
          const number = values[s]?.[active];
          return number === null || number === undefined ? [] : [{ label: item.label, value: value(number), index: s, mark: area ? ("rect" as const) : ("line" as const) }];
        });
  const title = active === null ? "" : xText(xs[active] ?? 0, "full");
  const announcement = keyboard && active !== null ? `${title}: ${tooltipRows.map((row) => `${row.label} ${row.value}`).join(", ")}` : "";

  const move = (step: number | "first" | "last"): void => {
    if (count === 0) return;
    setKeyboard(true);
    setActive((current) => {
      if (step === "first") return 0;
      if (step === "last") return count - 1;
      if (current === null) return step > 0 ? 0 : count - 1;
      return Math.max(0, Math.min(count - 1, current + step));
    });
  };
  const onKeyDown = (event: KeyboardEvent<SVGSVGElement>): void => {
    if (event.key === "ArrowRight" || event.key === "ArrowUp") move(1);
    else if (event.key === "ArrowLeft" || event.key === "ArrowDown") move(-1);
    else if (event.key === "Home") move("first");
    else if (event.key === "End") move("last");
    else if (event.key === "Escape") setActive(null);
    else return;
    event.preventDefault();
  };

  const legend = showLegend ?? series.length > 1;

  return (
    <div data-slot={slot} className={cn("flex w-full min-w-0 flex-col gap-3", className)} {...props}>
      {legend ? <ChartLegend items={series.map((item, index) => ({ label: item.label, index }))} mark={area ? "rect" : "line"} /> : null}
      <ChartContainer aspect={aspect} height={height} table={table} announcement={announcement}>
        {(size) => {
          if (count === 0) {
            return <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">No data</p>;
          }
          const low = fromZero ? Math.min(0, model.low) : model.low;
          const high = fromZero ? Math.max(0, model.high) : model.high;
          const yScale = scaleLinear()
            .domain(low === high ? [low - 1, high + 1] : [low, high])
            .nice(Math.max(2, Math.floor(size.height / 56)))
            .range([size.height - BOTTOM, TOP]);
          const yTicks = yScale.ticks(Math.max(2, Math.floor(size.height / 56)));
          const axisValue = formatValue ?? axisNumberFormatter(Math.max(Math.abs(yScale.domain()[0] ?? 0), Math.abs(yScale.domain()[1] ?? 0)), locale);
          const left = Math.ceil(Math.max(...yTicks.map((tick) => estimateTextWidth(axisValue(tick))))) + 10;
          const labelled = endLabels && series.length <= 4 && size.width >= 420;
          const right = labelled ? Math.min(size.width * 0.3, Math.ceil(Math.max(...series.map((item) => estimateTextWidth(item.label)))) + 16) : 12;
          const first = xs[0] ?? 0;
          const last = xs[count - 1] ?? 0;
          const xScale = scaleLinear()
            .domain(first === last ? [first - 1, last + 1] : [first, last])
            .range([left, size.width - right]);
          const plotWidth = size.width - right - left;
          const tickCount = Math.max(2, Math.floor(plotWidth / 90));
          const xTicks = (
            isTime
              ? scaleUtc()
                  .domain([new Date(first), new Date(last)])
                  .ticks(tickCount)
                  .map((date) => date.getTime())
              : xScale.ticks(tickCount)
          ).filter((tick) => tick >= first && tick <= last);
          const px = (i: number): number => xScale(xs[i] ?? 0);
          const py = (s: number, i: number): number => yScale(tops[s]?.[i] ?? 0);
          const defined = (s: number) => (i: number): boolean => stack || (values[s]?.[i] ?? null) !== null;
          const indices = xs.map((_, i) => i);
          const factory = CURVES[curve];

          // The last drawn point of each line: where its marker and its name go.
          const ends = series.map((item, s) => {
            let i = count - 1;
            while (i >= 0 && !defined(s)(i)) i -= 1;
            return i < 0 ? null : { s, x: px(i), y: py(s, i), label: item.label };
          });
          const placed = ends.filter((end) => end !== null).sort((a, b) => a.y - b.y);
          // Names that would collide are not nudged apart (that detaches them from their lines): the legend carries them.
          const roomForNames = labelled && placed.every((end, index) => index === 0 || end.y - (placed[index - 1]?.y ?? 0) >= 14);
          const dots = showDots && plotWidth / count >= 12;
          const zeroLine = (yScale.domain()[0] ?? 0) <= 0 && (yScale.domain()[1] ?? 0) >= 0 ? yScale(0) : null;
          const activeX = active === null ? 0 : px(active);

          const onPointerMove = (event: PointerEvent<SVGSVGElement>): void => {
            const pointer = event.clientX - event.currentTarget.getBoundingClientRect().left;
            // The crosshair finds the x: the nearest position, wherever the pointer is vertically.
            let nearest = 0;
            for (let i = 1; i < count; i += 1) {
              if (Math.abs(px(i) - pointer) < Math.abs(px(nearest) - pointer)) nearest = i;
            }
            setKeyboard(false);
            setActive(nearest);
          };

          return (
            <>
              <ChartSvg
                label={label}
                width={size.width}
                height={size.height}
                interactive
                onKeyDown={onKeyDown}
                onPointerMove={onPointerMove}
                onPointerLeave={() => setActive(null)}
                onFocus={(event) => {
                  if (event.currentTarget.matches(":focus-visible")) move("last");
                }}
                onBlur={() => setActive(null)}
              >
                {showGrid ? <ChartGrid offsets={yTicks.map((tick) => yScale(tick))} from={left} to={size.width - right} /> : null}
                {zeroLine === null ? null : <line aria-hidden="true" x1={left} x2={size.width - right} y1={zeroLine} y2={zeroLine} className="stroke-border-strong" strokeWidth={1} shapeRendering="crispEdges" />}
                <ChartAxis side="left" at={left - 8} ticks={yTicks.map((tick) => ({ offset: yScale(tick), label: axisValue(tick) }))} />
                <ChartAxis side="bottom" at={size.height - BOTTOM + 8} ticks={xTicks.map((tick) => ({ offset: xScale(tick), label: xText(tick, "axis") }))} />
                <g aria-hidden="true">
                  {area
                    ? series.map((item, s) => (
                        <path
                          key={item.key}
                          d={
                            areaShape<number>()
                              .defined(defined(s))
                              .x(px)
                              .y0((i) => yScale(base[s]?.[i] ?? 0))
                              .y1((i) => py(s, i))
                              .curve(factory)(indices) ?? undefined
                          }
                          className={chartSeries(s).fill}
                          // Flat: the series colour as a light wash, no gradient.
                          fillOpacity={stack ? 0.28 : 0.12}
                        />
                      ))
                    : null}
                  {series.map((item, s) => (
                    <path
                      key={item.key}
                      d={lineShape<number>().defined(defined(s)).x(px).y((i) => py(s, i)).curve(factory)(indices) ?? undefined}
                      fill="none"
                      className={chartSeries(s).stroke}
                      strokeWidth={2}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      strokeDasharray={chartSeries(s).dash}
                    />
                  ))}
                  {dots ? series.map((item, s) => indices.filter(defined(s)).map((i) => <ChartMark key={`${item.key}:${i}`} index={s} x={px(i)} y={py(s, i)} radius={3} />)) : null}
                  {ends.map((end) => (end === null ? null : <ChartMark key={end.s} index={end.s} x={end.x} y={end.y} radius={4} />))}
                  {roomForNames
                    ? placed.map((end) => (
                        <text key={end.s} x={end.x + 10} y={end.y} dy="0.32em" className="fill-muted-foreground">
                          {end.label}
                        </text>
                      ))
                    : null}
                  {active === null ? null : (
                    <>
                      <line x1={activeX} x2={activeX} y1={TOP} y2={size.height - BOTTOM} className="stroke-border-strong" strokeWidth={1} shapeRendering="crispEdges" />
                      {series.map((item, s) => (defined(s)(active) ? <ChartMark key={item.key} index={s} x={activeX} y={py(s, active)} radius={5} /> : null))}
                    </>
                  )}
                </g>
              </ChartSvg>
              {active === null ? null : <ChartTooltip x={activeX} y={TOP} align="top" side={activeX > size.width / 2 ? "left" : "right"} title={title} rows={tooltipRows} />}
            </>
          );
        }}
      </ChartContainer>
    </div>
  );
}

export function LineChart<T extends object>(props: LineChartProps<T>) {
  return <SeriesChart {...props} slot="line-chart" />;
}
