"use client";
/**
 * @name fan-chart
 * @category viz
 * @description A forecast drawn honestly: what was observed as a solid line, then the median forecast with nested bands for its intervals (90 %, 50 % …) that widen as the forecast reaches further, with arrow-key reading of every point.
 * @when Showing a prediction or an estimate with its uncertainty: a forecast, a model's range, a confidence band around a trend. For a series with no uncertainty use line-chart; for the spread of measured values use box-plot.
 * @example
 * <FanChart
 *   label="Visitors, observed and forecast"
 *   data={[
 *     { week: 1, observed: 120 },
 *     { week: 2, observed: 132 },
 *     { week: 3, observed: 128, median: 128, low90: 128, high90: 128, low50: 128, high50: 128 },
 *     { week: 4, median: 136, low90: 118, high90: 152, low50: 128, high50: 143 },
 *     { week: 5, median: 141, low90: 110, high90: 170, low50: 126, high50: 155 },
 *   ]}
 *   x="week"
 *   observed="observed"
 *   median="median"
 *   intervals={[
 *     { low: "low90", high: "high90", label: "90% interval" },
 *     { low: "low50", high: "high50", label: "50% interval" },
 *   ]}
 *   forecastFrom={3}
 *   labels={{ observed: "Observed", median: "Forecast (median)", forecast: "Forecast" }}
 * />
 */
import { area, line } from "d3-shape";
import { scaleUtc } from "d3-scale";
import { useMemo, type PointerEvent } from "react";
import { cn } from "@/lib/cn";
import {
  axisNumberFormatter,
  ChartAxis,
  ChartContainer,
  ChartEmpty,
  ChartGrid,
  chartLinear,
  ChartSvg,
  ChartTooltip,
  dateFormatter,
  formatNumber,
  readNumber,
  useChartCursor,
  widestText,
  type ChartBaseProps,
} from "@/components/viz/chart";

export type FanInterval<T> = {
  /** The field holding the interval's lower edge. */
  low: keyof T & string;
  /** The field holding its upper edge. */
  high: keyof T & string;
  /** Its name: "90% interval". */
  label: string;
};

export type FanChartLabels = { observed: string; median: string; forecast: string };

export type FanChartProps<T extends object> = ChartBaseProps & {
  /** One object per x position, observed and forecast rows together. */
  data: readonly T[];
  /** The field holding x: a number or a Date. */
  x: keyof T & string;
  /** The field holding what was measured, where it was. */
  observed?: keyof T & string;
  /** The field holding the forecast's median (or central estimate). */
  median: keyof T & string;
  /** The intervals from widest to narrowest. Each is drawn a step stronger than the one around it. */
  intervals: readonly FanInterval<T>[];
  /** The x where the forecast starts: a rule and the word "Forecast" mark it. */
  forecastFrom?: number | Date;
  /** Words for the legend, the tooltip and the table. */
  labels?: Partial<FanChartLabels>;
  /** The name of the x column in the table. Default: the field name. */
  xLabel?: string;
  /** Replaces the x format on the axis, in the tooltip and in the table. */
  formatX?: (value: number | Date) => string;
  /** The time zone dates are printed in. Default "UTC". */
  timeZone?: string;
  /** Start the y axis at zero. */
  zero?: boolean;
  showGrid?: boolean;
  showLegend?: boolean;
};

const LABELS: FanChartLabels = { observed: "Observed", median: "Median", forecast: "Forecast" };
/** Band strengths from the outside in: each narrower band is a step stronger. */
const STRENGTHS = [0.16, 0.3, 0.44, 0.58];

type Row = { x: number; observed: number | null; median: number | null; bands: ({ low: number; high: number } | null)[] };

export function FanChart<T extends object>({
  data,
  x,
  observed,
  median,
  intervals,
  forecastFrom,
  labels: given,
  xLabel,
  formatX,
  timeZone,
  zero = false,
  showGrid = true,
  showLegend = true,
  label,
  aspect,
  height,
  emptyLabel,
  locale,
  formatValue,
  className,
  ...props
}: FanChartProps<T>) {
  const labels = { ...LABELS, ...given };
  const model = useMemo(() => {
    const isTime = data.some((row) => (row as Record<string, unknown>)[x] instanceof Date);
    const rows: Row[] = data
      .flatMap((row) => {
        const raw = (row as Record<string, unknown>)[x];
        const at = raw instanceof Date ? raw.getTime() : typeof raw === "number" ? raw : NaN;
        if (!Number.isFinite(at)) return [];
        return [
          {
            x: at,
            observed: observed ? readNumber(row, observed) : null,
            median: readNumber(row, median),
            bands: intervals.map((band) => {
              const low = readNumber(row, band.low);
              const high = readNumber(row, band.high);
              return low === null || high === null ? null : { low: Math.min(low, high), high: Math.max(low, high) };
            }),
          },
        ];
      })
      .sort((a, b) => a.x - b.x);
    return { rows, isTime };
  }, [data, x, observed, median, intervals]);

  const { rows, isTime } = model;
  const cursor = useChartCursor(rows.length);
  const number = formatValue ?? ((amount: number) => formatNumber(amount, locale));
  const span = rows.length > 1 ? (rows[rows.length - 1]?.x ?? 0) - (rows[0]?.x ?? 0) : 0;
  const fullX = formatX ?? (isTime ? dateFormatter(span, "full", locale, timeZone) : (value: number | Date) => formatNumber(Number(value), locale));
  const axisXFormat = formatX ?? (isTime ? dateFormatter(span, "axis", locale, timeZone) : (value: number | Date) => formatNumber(Number(value), locale));
  const xOf = (value: number): number | Date => (isTime ? new Date(value) : value);
  const range = (band: { low: number; high: number } | null): string => (band ? `${number(band.low)} – ${number(band.high)}` : "");
  const table = {
    caption: label,
    columns: [xLabel ?? x, ...(observed ? [labels.observed] : []), labels.median, ...intervals.map((band) => band.label)],
    rows: rows.map((row) => [fullX(xOf(row.x)), ...(observed ? [row.observed === null ? "" : number(row.observed)] : []), row.median === null ? "" : number(row.median), ...row.bands.map(range)]),
  };
  const current = cursor.active === null ? undefined : rows[cursor.active];
  const tooltipRows = (row: Row): { label: string; value: string }[] => [
    ...(row.observed !== null ? [{ label: labels.observed, value: number(row.observed) }] : []),
    ...(row.median !== null ? [{ label: labels.median, value: number(row.median) }] : []),
    ...row.bands.flatMap((band, index) => (band ? [{ label: intervals[index]?.label ?? "", value: range(band) }] : [])),
  ];
  const announcement =
    cursor.keyboard && current
      ? `${fullX(xOf(current.x))}: ${tooltipRows(current)
          .map((item) => `${item.label} ${item.value}`)
          .join(", ")}`
      : "";
  const forecastAt = forecastFrom instanceof Date ? forecastFrom.getTime() : forecastFrom;

  return (
    <div data-slot="fan-chart" className={cn("flex w-full min-w-0 flex-col gap-3", className)} {...props}>
      {showLegend ? (
        <ul data-slot="fan-chart-legend" className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {observed ? (
            <li className="flex items-center gap-1.5">
              <svg aria-hidden="true" width={20} height={12}>
                <line x1={1} x2={19} y1={6} y2={6} className="stroke-foreground" strokeWidth={2} strokeLinecap="round" />
              </svg>
              {labels.observed}
            </li>
          ) : null}
          <li className="flex items-center gap-1.5">
            <svg aria-hidden="true" width={20} height={12}>
              <line x1={1} x2={19} y1={6} y2={6} className="stroke-chart-1" strokeWidth={2} strokeDasharray="5 3" strokeLinecap="round" />
            </svg>
            {labels.median}
          </li>
          {intervals.map((band, index) => (
            <li key={band.label} className="flex items-center gap-1.5">
              <span aria-hidden="true" className="h-3 w-5 rounded-[min(var(--radius),3px)] bg-chart-1" style={{ opacity: STRENGTHS[Math.min(index, STRENGTHS.length - 1)] }} />
              {band.label}
            </li>
          ))}
        </ul>
      ) : null}
      <ChartContainer aspect={aspect} height={height} table={table} announcement={announcement}>
        {({ width, height: plotHeight }) => {
          if (rows.length === 0) return <ChartEmpty>{emptyLabel}</ChartEmpty>;
          const values = rows.flatMap((row) => [row.observed, row.median, ...row.bands.flatMap((band) => (band ? [band.low, band.high] : []))].filter((v): v is number => v !== null));
          const low = Math.min(...values, ...(zero ? [0] : []));
          const high = Math.max(...values, ...(zero ? [0] : []));
          const top = 18;
          const bottom = 26;
          const sy = chartLinear(low, high, [plotHeight - bottom, top]);
          const axisY = formatValue ?? axisNumberFormatter(Math.max(Math.abs(low), Math.abs(high)), locale);
          const left = widestText(sy.ticks.map(axisY)) + 12;
          const right = 12;
          const first = rows[0]?.x ?? 0;
          const last = rows[rows.length - 1]?.x ?? 1;
          const tickCount = Math.max(2, Math.floor((width - left) / 90));
          const timeScale = scaleUtc()
            .domain([first, last === first ? first + 1 : last])
            .range([left, width - right]);
          const numberScale = chartLinear(first, last, [left, width - right], 90).scale.domain([first, last === first ? first + 1 : last]);
          const sx = (value: number): number => (isTime ? timeScale(value) : numberScale(value));
          const xTicks = isTime ? timeScale.ticks(tickCount).map((d) => d.getTime()) : numberScale.ticks(tickCount);
          const bandPaths = intervals.map((_, index) =>
            area<Row>()
              .defined((row) => row.bands[index] != null)
              .x((row) => sx(row.x))
              .y0((row) => sy.scale(row.bands[index]?.low ?? 0))
              .y1((row) => sy.scale(row.bands[index]?.high ?? 0))(rows),
          );
          const observedPath = observed
            ? line<Row>()
                .defined((row) => row.observed !== null)
                .x((row) => sx(row.x))
                .y((row) => sy.scale(row.observed ?? 0))(rows)
            : null;
          const medianPath = line<Row>()
            .defined((row) => row.median !== null)
            .x((row) => sx(row.x))
            .y((row) => sy.scale(row.median ?? 0))(rows);
          const onPointerMove = (event: PointerEvent<SVGSVGElement>): void => {
            const box = event.currentTarget.getBoundingClientRect();
            const px = event.clientX - box.left;
            let best = 0;
            rows.forEach((row, index) => {
              if (Math.abs(sx(row.x) - px) < Math.abs(sx(rows[best]?.x ?? 0) - px)) best = index;
            });
            cursor.point(best);
          };
          const shownX = current ? sx(current.x) : 0;
          const shownY = current ? sy.scale(current.median ?? current.observed ?? 0) : 0;
          return (
            <>
              <ChartSvg label={label} width={width} height={plotHeight} interactive {...cursor.svgProps} onPointerMove={onPointerMove}>
                {showGrid ? <ChartGrid offsets={sy.ticks.map((tick) => sy.scale(tick))} from={left} to={width - right} /> : null}
                <ChartAxis side="left" at={left - 8} ticks={sy.ticks.map((tick) => ({ offset: sy.scale(tick), label: axisY(tick) }))} />
                <ChartAxis side="bottom" at={plotHeight - bottom + 6} ticks={xTicks.map((tick) => ({ offset: sx(tick), label: axisXFormat(xOf(tick)) }))} />
                <g aria-hidden="true">
                  {bandPaths.map((d, index) => (d ? <path key={index} d={d} className="fill-chart-1" fillOpacity={STRENGTHS[Math.min(index, STRENGTHS.length - 1)]} /> : null))}
                  {forecastAt !== undefined && forecastAt >= first && forecastAt <= last ? (
                    <g>
                      <line x1={sx(forecastAt)} x2={sx(forecastAt)} y1={top - 6} y2={plotHeight - bottom} className="stroke-border-strong" strokeDasharray="2 3" />
                      <text x={sx(forecastAt) + 4} y={top - 6} dy="0.32em" className="fill-muted-foreground">
                        {labels.forecast}
                      </text>
                    </g>
                  ) : null}
                  {medianPath ? <path d={medianPath} fill="none" className="stroke-chart-1" strokeWidth={2} strokeDasharray="5 3" strokeLinejoin="round" strokeLinecap="round" /> : null}
                  {observedPath ? <path d={observedPath} fill="none" className="stroke-foreground" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" /> : null}
                  {current ? (
                    <g>
                      <line x1={shownX} x2={shownX} y1={top} y2={plotHeight - bottom} className="stroke-border-strong" />
                      <circle cx={shownX} cy={shownY} r={4.5} className={cn(current.median === null ? "fill-foreground" : "fill-chart-1", "stroke-background")} strokeWidth={2} />
                    </g>
                  ) : null}
                </g>
              </ChartSvg>
              {current ? <ChartTooltip x={shownX} y={shownY} side={shownX > width / 2 ? "left" : "right"} title={fullX(xOf(current.x))} rows={tooltipRows(current)} /> : null}
            </>
          );
        }}
      </ChartContainer>
    </div>
  );
}
