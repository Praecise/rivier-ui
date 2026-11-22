"use client";
/**
 * @name box-plot
 * @category viz
 * @description The spread of a measure in each of several groups side by side: a box from the first to the third quartile, the median across it, whiskers to the furthest values within 1.5 boxes, and the values beyond them as points; or, as a violin, the shape of each spread.
 * @when Comparing distributions across groups: which is higher, which is wider, which has outliers. For one group's full shape use histogram; for a few exact numbers per group use bar-chart or dot-plot.
 * @example
 * <BoxPlot
 *   label="Response time by region"
 *   data={[
 *     { region: "North", ms: 120 }, { region: "North", ms: 140 }, { region: "North", ms: 135 }, { region: "North", ms: 310 },
 *     { region: "South", ms: 90 }, { region: "South", ms: 110 }, { region: "South", ms: 105 }, { region: "South", ms: 98 },
 *   ]}
 *   group="region"
 *   value="ms"
 *   valueLabel="Milliseconds"
 * />
 */
import { deviation, quantileSorted } from "d3-array";
import { area, curveBasis } from "d3-shape";
import { useMemo } from "react";
import { cn } from "@/lib/cn";
import {
  axisNumberFormatter,
  ChartAxis,
  ChartContainer,
  ChartEmpty,
  ChartGrid,
  chartLinear,
  chartSeries,
  ChartSvg,
  ChartTooltip,
  fitText,
  formatNumber,
  readNumber,
  useChartCursor,
  widestText,
  type ChartBaseProps,
} from "@/components/viz/chart";

export type BoxPlotProps<T extends object> = ChartBaseProps & {
  /** One object per observation. */
  data: readonly T[];
  /** The field naming each observation's group. */
  group: keyof T & string;
  /** The field holding the measured number. */
  value: keyof T & string;
  /** The groups in order. Default: in order of first appearance. */
  groups?: readonly string[];
  /** "box" (quartiles and whiskers) or "violin" (the shape of the spread, with the quartiles inside). */
  variant?: "box" | "violin";
  /** Draw every group in the first series colour (default) or each in its own. */
  colorBy?: "none" | "group";
  /** The measure's name, in the tooltip and the table. Default: the field name. */
  valueLabel?: string;
  /** Words for the statistics, in the tooltip and the table. */
  labels?: Partial<BoxPlotLabels>;
  showGrid?: boolean;
};

export type BoxPlotLabels = {
  count: string;
  low: string;
  q1: string;
  median: string;
  q3: string;
  high: string;
  outliers: string;
};

const LABELS: BoxPlotLabels = {
  count: "Count",
  low: "Lowest",
  q1: "First quartile",
  median: "Median",
  q3: "Third quartile",
  high: "Highest",
  outliers: "Outliers",
};
const ROUND = "[rx:min(var(--radius),4px)] [ry:min(var(--radius),4px)]";

type Summary = {
  name: string;
  count: number;
  low: number;
  q1: number;
  median: number;
  q3: number;
  high: number;
  outliers: number[];
  sorted: number[];
};

function summarise(name: string, values: number[]): Summary {
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = quantileSorted(sorted, 0.25) ?? 0;
  const median = quantileSorted(sorted, 0.5) ?? 0;
  const q3 = quantileSorted(sorted, 0.75) ?? 0;
  const reach = 1.5 * (q3 - q1);
  const inside = sorted.filter((v) => v >= q1 - reach && v <= q3 + reach);
  return {
    name,
    count: sorted.length,
    low: inside[0] ?? q1,
    high: inside[inside.length - 1] ?? q3,
    q1,
    median,
    q3,
    outliers: sorted.filter((v) => v < q1 - reach || v > q3 + reach),
    sorted,
  };
}

/** A Gaussian kernel density estimate over `points`, with Silverman's bandwidth. */
function density(sorted: number[], points: number[]): number[] {
  const n = sorted.length;
  const sd = deviation(sorted) ?? 0;
  const bandwidth = Math.max(1e-9, 1.06 * (sd || Math.abs(sorted[0] ?? 1) * 0.1 || 1) * Math.pow(n, -0.2));
  return points.map((p) => sorted.reduce((sum, v) => sum + Math.exp(-0.5 * ((p - v) / bandwidth) ** 2), 0) / (n * bandwidth * Math.sqrt(2 * Math.PI)));
}

export function BoxPlot<T extends object>({
  data,
  group,
  value,
  groups,
  variant = "box",
  colorBy = "none",
  valueLabel,
  labels: given,
  showGrid = true,
  label,
  aspect,
  height,
  emptyLabel,
  locale,
  formatValue,
  className,
  ...props
}: BoxPlotProps<T>) {
  const labels = { ...LABELS, ...given };
  const summaries = useMemo(() => {
    const byGroup = new Map<string, number[]>();
    for (const name of groups ?? []) byGroup.set(name, []);
    for (const row of data) {
      const number = readNumber(row, value);
      if (number === null) continue;
      const name = String((row as Record<string, unknown>)[group] ?? "");
      if (groups && !byGroup.has(name)) continue;
      const list = byGroup.get(name) ?? [];
      list.push(number);
      byGroup.set(name, list);
    }
    return [...byGroup].filter(([, values]) => values.length > 0).map(([name, values]) => summarise(name, values));
  }, [data, group, value, groups]);

  const cursor = useChartCursor(summaries.length);
  const number = formatValue ?? ((amount: number) => formatNumber(amount, locale));
  const table = {
    caption: label,
    columns: [`${group} (${valueLabel ?? value})`, labels.count, labels.low, labels.q1, labels.median, labels.q3, labels.high, labels.outliers],
    rows: summaries.map((s) => [s.name, formatNumber(s.count, locale), number(s.low), number(s.q1), number(s.median), number(s.q3), number(s.high), s.outliers.map(number).join(", ")]),
  };
  const current = cursor.active === null ? undefined : summaries[cursor.active];
  const rowsOf = (s: Summary): { label: string; value: string }[] => [
    { label: labels.high, value: number(s.high) },
    { label: labels.q3, value: number(s.q3) },
    { label: labels.median, value: number(s.median) },
    { label: labels.q1, value: number(s.q1) },
    { label: labels.low, value: number(s.low) },
    ...(s.outliers.length > 0 ? [{ label: labels.outliers, value: s.outliers.map(number).join(", ") }] : []),
  ];

  return (
    <div data-slot="box-plot" className={cn("flex w-full min-w-0 flex-col gap-3", className)} {...props}>
      <ChartContainer
        aspect={aspect}
        height={height}
        table={table}
        announcement={
          cursor.keyboard && current
            ? `${current.name}: ${labels.median} ${number(current.median)}, ${labels.q1} ${number(current.q1)}, ${labels.q3} ${number(current.q3)}, ${labels.low} ${number(current.low)}, ${labels.high} ${number(current.high)}`
            : ""
        }
      >
        {({ width, height: plotHeight }) => {
          if (summaries.length === 0) return <ChartEmpty>{emptyLabel}</ChartEmpty>;
          const top = 10;
          const bottom = 28;
          const all = summaries.flatMap((s) => [s.sorted[0] ?? 0, s.sorted[s.sorted.length - 1] ?? 0]);
          const sy = chartLinear(Math.min(...all), Math.max(...all), [plotHeight - bottom, top]);
          const axisY = formatValue ?? axisNumberFormatter(Math.max(...all.map(Math.abs)), locale);
          const left = widestText(sy.ticks.map(axisY)) + 12;
          const step = (width - left - 8) / summaries.length;
          const breadth = Math.max(6, Math.min(variant === "violin" ? 72 : 40, step * 0.6));
          const centre = (index: number): number => left + step * (index + 0.5);
          const [domainLow = 0, domainHigh = 1] = sy.scale.domain();
          const samples = Array.from({ length: 48 }, (_, i) => domainLow + ((domainHigh - domainLow) * i) / 47);
          const pad = (domainHigh - domainLow) * 0.05;
          const spans = summaries.map((s) => (variant === "violin" ? samples.filter((p) => p >= (s.sorted[0] ?? 0) - pad && p <= (s.sorted[s.sorted.length - 1] ?? 0) + pad) : []));
          const shapes = summaries.map((s, index) => (variant === "violin" ? density(s.sorted, spans[index] ?? []) : []));
          const widest = Math.max(1e-12, ...shapes.flat());
          return (
            <>
              <ChartSvg label={label} width={width} height={plotHeight} interactive {...cursor.svgProps}>
                {showGrid ? <ChartGrid offsets={sy.ticks.map((tick) => sy.scale(tick))} from={left} to={width - 8} /> : null}
                <ChartAxis
                  side="left"
                  at={left - 8}
                  ticks={sy.ticks.map((tick) => ({
                    offset: sy.scale(tick),
                    label: axisY(tick),
                  }))}
                />
                <ChartAxis
                  side="bottom"
                  at={plotHeight - bottom + 6}
                  ticks={summaries.map((s, index) => ({
                    offset: centre(index),
                    label: fitText(s.name, step - 4),
                  }))}
                />
                <g aria-hidden="true">
                  {summaries.map((s, index) => {
                    const style = chartSeries(colorBy === "group" ? index : 0);
                    const cx = centre(index);
                    const half = breadth / 2;
                    const dim = cursor.active !== null && cursor.active !== index;
                    const points = spans[index] ?? [];
                    const violin =
                      variant === "violin"
                        ? area<number>()
                            .curve(curveBasis)
                            .y((_, i) => sy.scale(points[i] ?? 0))
                            .x0((d) => cx - (d / widest) * half)
                            .x1((d) => cx + (d / widest) * half)(shapes[index] ?? [])
                        : null;
                    return (
                      <g key={s.name} className={cn("transition-opacity duration-instant motion-reduce:transition-none", dim && "opacity-45")}>
                        <rect x={cx - step / 2} y={top} width={step} height={plotHeight - bottom - top} fill="transparent" onPointerEnter={() => cursor.point(index)} />
                        {violin ? <path d={violin} className={cn(style.fill, "opacity-30")} /> : null}
                        <line x1={cx} x2={cx} y1={sy.scale(s.high)} y2={sy.scale(s.q3)} className={style.stroke} strokeWidth={1.5} />
                        <line x1={cx} x2={cx} y1={sy.scale(s.q1)} y2={sy.scale(s.low)} className={style.stroke} strokeWidth={1.5} />
                        {variant === "box" ? (
                          <>
                            <line x1={cx - half / 2} x2={cx + half / 2} y1={sy.scale(s.high)} y2={sy.scale(s.high)} className={style.stroke} strokeWidth={1.5} />
                            <line x1={cx - half / 2} x2={cx + half / 2} y1={sy.scale(s.low)} y2={sy.scale(s.low)} className={style.stroke} strokeWidth={1.5} />
                          </>
                        ) : null}
                        <rect
                          x={cx - (variant === "violin" ? 5 : half)}
                          y={sy.scale(s.q3)}
                          width={variant === "violin" ? 10 : breadth}
                          height={Math.max(1, sy.scale(s.q1) - sy.scale(s.q3))}
                          className={cn(style.fill, ROUND, style.stroke)}
                          fillOpacity={variant === "box" ? 0.25 : 1}
                          strokeWidth={1.5}
                        />
                        <line
                          x1={cx - (variant === "violin" ? 5 : half)}
                          x2={cx + (variant === "violin" ? 5 : half)}
                          y1={sy.scale(s.median)}
                          y2={sy.scale(s.median)}
                          className={variant === "violin" ? "stroke-background" : "stroke-foreground"}
                          strokeWidth={2.5}
                        />
                        {s.outliers.map((v, i) => (
                          <circle key={i} cx={cx} cy={sy.scale(v)} r={3} className={cn("fill-background", style.stroke)} strokeWidth={1.5} />
                        ))}
                      </g>
                    );
                  })}
                </g>
              </ChartSvg>
              {current && cursor.active !== null ? (
                <ChartTooltip
                  x={centre(cursor.active) + breadth / 2}
                  y={sy.scale(current.median)}
                  side={centre(cursor.active) > width / 2 ? "left" : "right"}
                  title={current.name}
                  rows={rowsOf(current)}
                />
              ) : null}
            </>
          );
        }}
      </ChartContainer>
    </div>
  );
}
