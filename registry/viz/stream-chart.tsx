"use client";
/**
 * @name stream-chart
 * @category viz
 * @description Several series stacked as flowing layers around a centre line instead of a baseline (a streamgraph), so the rise and fall of each layer and of the whole read as a shape over time; arrow keys read every moment.
 * @when Showing how the mix of up to five categories shifts over a long time, where the overall shape matters more than exact values: listening by genre, topics over years. For exact totals use area-chart stacked (with a baseline); for exact values per series use line-chart.
 * @example
 * <StreamChart
 *   label="Plays by genre"
 *   data={[
 *     { year: 2020, jazz: 20, folk: 30, rock: 50 },
 *     { year: 2021, jazz: 28, folk: 34, rock: 44 },
 *     { year: 2022, jazz: 40, folk: 30, rock: 38 },
 *   ]}
 *   x="year"
 *   series={[{ key: "jazz", label: "Jazz" }, { key: "folk", label: "Folk" }, { key: "rock", label: "Rock" }]}
 * />
 */
import { scaleLinear, scaleUtc } from "d3-scale";
import { area, curveBasis, stack, type SeriesPoint, stackOffsetSilhouette, stackOffsetWiggle, stackOrderInsideOut } from "d3-shape";
import { useMemo, type PointerEvent } from "react";
import { cn } from "@/lib/cn";
import {
  ChartContainer,
  ChartEmpty,
  ChartLegend,
  chartSeries,
  ChartSvg,
  ChartTooltip,
  dateFormatter,
  formatNumber,
  readNumber,
  useChartCursor,
  type ChartBaseProps,
  type ChartSeries,
} from "@/components/viz/chart";

export type StreamChartProps<T extends object> = ChartBaseProps & {
  data: readonly T[];
  /** The field holding x: a number or a Date. */
  x: keyof T & string;
  series: readonly ChartSeries<T>[];
  /** "wiggle" keeps the layers as still as it can; "silhouette" centres the whole on the middle line. */
  offset?: "wiggle" | "silhouette";
  xLabel?: string;
  formatX?: (value: number | Date) => string;
  timeZone?: string;
  showLegend?: boolean;
};

type Row = Record<string, number>;

export function StreamChart<T extends object>({
  data,
  x,
  series,
  offset = "wiggle",
  xLabel,
  formatX,
  timeZone,
  showLegend = true,
  label,
  aspect,
  height,
  emptyLabel,
  locale,
  formatValue,
  className,
  ...props
}: StreamChartProps<T>) {
  const model = useMemo(() => {
    const isTime = data.some((row) => (row as Record<string, unknown>)[x] instanceof Date);
    const rows: Row[] = data
      .flatMap((row) => {
        const raw = (row as Record<string, unknown>)[x];
        const at = raw instanceof Date ? raw.getTime() : typeof raw === "number" ? raw : NaN;
        if (!Number.isFinite(at)) return [];
        const out: Row = { __x: at };
        for (const s of series) out[s.key] = Math.max(0, readNumber(row, s.key) ?? 0);
        return [out];
      })
      .sort((a, b) => (a["__x"] ?? 0) - (b["__x"] ?? 0));
    const layers = stack<Row>()
      .keys(series.map((s) => s.key))
      .order(stackOrderInsideOut)
      .offset(offset === "wiggle" ? stackOffsetWiggle : stackOffsetSilhouette)(rows);
    return { rows, layers, isTime };
  }, [data, x, series, offset]);
  const { rows, layers, isTime } = model;
  const cursor = useChartCursor(rows.length);
  const number = formatValue ?? ((value: number) => formatNumber(value, locale));
  const xs = rows.map((row) => row["__x"] ?? 0);
  const span = xs.length > 1 ? (xs[xs.length - 1] ?? 0) - (xs[0] ?? 0) : 0;
  const fullX = formatX ?? (isTime ? dateFormatter(span, "full", locale, timeZone) : (v: number | Date) => formatNumber(Number(v), locale));
  const axisX = formatX ?? (isTime ? dateFormatter(span, "axis", locale, timeZone) : (v: number | Date) => formatNumber(Number(v), locale));
  const xOf = (v: number): number | Date => (isTime ? new Date(v) : v);
  const table = { caption: label, columns: [xLabel ?? x, ...series.map((s) => s.label)], rows: rows.map((row) => [fullX(xOf(row["__x"] ?? 0)), ...series.map((s) => number(row[s.key] ?? 0))]) };
  const current = cursor.active === null ? undefined : rows[cursor.active];
  const rowsOf = (row: Row): { label: string; value: string; index: number; mark: "rect" }[] => series.map((s, i) => ({ label: s.label, value: number(row[s.key] ?? 0), index: i, mark: "rect" }));

  return (
    <div data-slot="stream-chart" className={cn("flex w-full min-w-0 flex-col gap-3", className)} {...props}>
      {showLegend ? <ChartLegend items={series.map((s, i) => ({ label: s.label, index: i }))} mark="rect" /> : null}
      <ChartContainer
        aspect={aspect}
        height={height}
        table={table}
        announcement={
          cursor.keyboard && current
            ? `${fullX(xOf(current["__x"] ?? 0))}: ${rowsOf(current)
                .map((r) => `${r.label} ${r.value}`)
                .join(", ")}`
            : ""
        }
      >
        {({ width, height: plotHeight }) => {
          if (rows.length < 2) return <ChartEmpty>{emptyLabel}</ChartEmpty>;
          const bottom = 26;
          const low = Math.min(...layers.flatMap((layer) => layer.map((p) => p[0])));
          const high = Math.max(...layers.flatMap((layer) => layer.map((p) => p[1])));
          const sy = scaleLinear()
            .domain([low, high === low ? low + 1 : high])
            .range([plotHeight - bottom, 6]);
          const domain: [number, number] = [xs[0] ?? 0, xs[xs.length - 1] ?? 1];
          const time = scaleUtc()
            .domain(domain)
            .range([4, width - 4]);
          const linear = scaleLinear()
            .domain(domain)
            .range([4, width - 4]);
          const sx = (v: number): number => (isTime ? time(v) : linear(v));
          const ticks = isTime ? time.ticks(Math.max(2, Math.floor(width / 100))).map((d) => d.getTime()) : linear.ticks(Math.max(2, Math.floor(width / 100)));
          const shape = area<SeriesPoint<Row>>()
            .curve(curveBasis)
            .x((p) => sx(p.data["__x"] ?? 0))
            .y0((p) => sy(p[0]))
            .y1((p) => sy(p[1]));
          const onPointerMove = (event: PointerEvent<SVGSVGElement>): void => {
            const px = event.clientX - event.currentTarget.getBoundingClientRect().left;
            let best = 0;
            xs.forEach((v, i) => {
              if (Math.abs(sx(v) - px) < Math.abs(sx(xs[best] ?? 0) - px)) best = i;
            });
            cursor.point(best);
          };
          const shownX = current ? sx(current["__x"] ?? 0) : 0;
          return (
            <>
              <ChartSvg label={label} width={width} height={plotHeight} interactive {...cursor.svgProps} onPointerMove={onPointerMove}>
                <g aria-hidden="true" className="fill-muted-foreground tabular-nums">
                  {ticks.map((t) => (
                    <text key={t} x={sx(t)} y={plotHeight - bottom + 6} dy="1em" textAnchor="middle">
                      {axisX(xOf(t))}
                    </text>
                  ))}
                </g>
                <g aria-hidden="true">
                  {layers.map((layer) => (
                    <path key={layer.key} d={shape(layer) ?? ""} className={cn(chartSeries(layer.index).fill, "stroke-background")} strokeWidth={1.5} fillOpacity={0.85} />
                  ))}
                  {current ? <line x1={shownX} x2={shownX} y1={6} y2={plotHeight - bottom} className="stroke-foreground" strokeWidth={1.5} /> : null}
                </g>
              </ChartSvg>
              {current ? <ChartTooltip x={shownX} y={plotHeight / 2} side={shownX > width / 2 ? "left" : "right"} title={fullX(xOf(current["__x"] ?? 0))} rows={rowsOf(current)} /> : null}
            </>
          );
        }}
      </ChartContainer>
    </div>
  );
}
