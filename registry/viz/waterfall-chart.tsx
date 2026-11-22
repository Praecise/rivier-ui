"use client";
/**
 * @name waterfall-chart
 * @category viz
 * @description How a starting amount becomes an ending one, step by step: each rise or fall a bar floating from the running total, totals standing on the baseline, signs printed on every step so rises and falls never rest on colour.
 * @when Explaining a change between two totals: a budget's start to its end, revenue to profit, last year to this year by cause. For parts of one total use bar-chart stacked or treemap; for change over time use line-chart.
 * @example
 * <WaterfallChart
 *   label="From revenue to profit"
 *   data={[
 *     { step: "Revenue", amount: 500, total: true },
 *     { step: "Costs", amount: -220 },
 *     { step: "Marketing", amount: -80 },
 *     { step: "Other income", amount: 30 },
 *     { step: "Profit", amount: 230, total: true },
 *   ]}
 *   x="step"
 *   value="amount"
 *   total="total"
 * />
 */
import { scaleBand } from "d3-scale";
import { useMemo } from "react";
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
  fitText,
  formatNumber,
  readNumber,
  useChartCursor,
  widestText,
  type ChartBaseProps,
} from "@/components/viz/chart";

export type WaterfallChartLabels = { step: string; change: string; runningTotal: string; rise: string; fall: string; total: string };

export type WaterfallChartProps<T extends object> = ChartBaseProps & {
  /** One object per step, in order. */
  data: readonly T[];
  /** The field naming each step. */
  x: keyof T & string;
  /** The field holding the step's change (or, on a total row, the total). */
  value: keyof T & string;
  /** A field that is true on rows that are totals: drawn from zero, and the running total is set to them. */
  total?: keyof T & string;
  /** Print each step's change above or below its bar where it fits. Default true. */
  showValues?: boolean;
  labels?: Partial<WaterfallChartLabels>;
};

const LABELS: WaterfallChartLabels = { step: "Step", change: "Change", runningTotal: "Running total", rise: "Rise", fall: "Fall", total: "Total" };
const ROUND = "[rx:min(var(--radius),3px)] [ry:min(var(--radius),3px)]";

type Step = { name: string; change: number; from: number; to: number; kind: "rise" | "fall" | "total" };

export function WaterfallChart<T extends object>({
  data,
  x,
  value,
  total,
  showValues = true,
  labels: given,
  label,
  aspect,
  height,
  emptyLabel,
  locale,
  formatValue,
  className,
  ...props
}: WaterfallChartProps<T>) {
  const labels = { ...LABELS, ...given };
  const steps = useMemo(() => {
    let running = 0;
    const out: Step[] = [];
    for (const row of data) {
      const amount = readNumber(row, value);
      if (amount === null) continue;
      const name = String((row as Record<string, unknown>)[x] ?? "");
      if (total && (row as Record<string, unknown>)[total] === true) {
        running = amount;
        out.push({ name, change: amount, from: 0, to: amount, kind: "total" });
      } else {
        out.push({ name, change: amount, from: running, to: running + amount, kind: amount >= 0 ? "rise" : "fall" });
        running += amount;
      }
    }
    return out;
  }, [data, x, value, total]);
  const cursor = useChartCursor(steps.length);
  const number = formatValue ?? ((amount: number) => formatNumber(amount, locale));
  const signed = (amount: number, kind: Step["kind"]): string =>
    kind === "total" ? number(amount) : formatValue ? formatValue(amount) : formatNumber(amount, locale, { signDisplay: "exceptZero", maximumFractionDigits: 2 });
  const kindWord = (kind: Step["kind"]): string => labels[kind];
  const table = {
    caption: label,
    columns: [labels.step, labels.change, labels.runningTotal],
    rows: steps.map((step) => [step.name, `${signed(step.change, step.kind)} (${kindWord(step.kind)})`, number(step.to)]),
  };
  const current = cursor.active === null ? undefined : steps[cursor.active];

  return (
    <div data-slot="waterfall-chart" className={cn("flex w-full min-w-0 flex-col gap-3", className)} {...props}>
      <ChartContainer
        aspect={aspect}
        height={height}
        table={table}
        announcement={cursor.keyboard && current ? `${current.name}: ${kindWord(current.kind)} ${signed(current.change, current.kind)}, ${labels.runningTotal} ${number(current.to)}` : ""}
      >
        {({ width, height: plotHeight }) => {
          if (steps.length === 0) return <ChartEmpty>{emptyLabel}</ChartEmpty>;
          const top = showValues ? 22 : 10;
          const bottom = 28;
          const ends = steps.flatMap((step) => [step.from, step.to]);
          const sy = chartLinear(Math.min(0, ...ends), Math.max(0, ...ends), [plotHeight - bottom, top]);
          const axisY = formatValue ?? axisNumberFormatter(Math.max(...ends.map(Math.abs)), locale);
          const left = widestText(sy.ticks.map(axisY)) + 12;
          const band = scaleBand<number>()
            .domain(steps.map((_, i) => i))
            .range([left, width - 4])
            .paddingInner(0.25)
            .paddingOuter(0.1);
          const w = Math.min(48, band.bandwidth());
          const xOf = (index: number): number => (band(index) ?? 0) + (band.bandwidth() - w) / 2;
          const every = Math.max(1, Math.ceil((widestText(steps.map((s) => s.name)) + 8) / band.step()));
          return (
            <>
              <ChartSvg label={label} width={width} height={plotHeight} interactive {...cursor.svgProps}>
                <ChartGrid offsets={sy.ticks.map((tick) => sy.scale(tick))} from={left} to={width - 4} />
                <ChartAxis side="left" at={left - 8} ticks={sy.ticks.map((tick) => ({ offset: sy.scale(tick), label: axisY(tick) }))} />
                <ChartAxis
                  side="bottom"
                  at={plotHeight - bottom + 6}
                  ticks={steps.flatMap((step, i) => (i % every === 0 ? [{ offset: (band(i) ?? 0) + band.bandwidth() / 2, label: fitText(step.name, band.step() * every - 4) }] : []))}
                />
                <g aria-hidden="true">
                  {steps.map((step, i) => {
                    const y0 = sy.scale(step.from);
                    const y1 = sy.scale(step.to);
                    const next = steps[i + 1];
                    const fill = step.kind === "total" ? "fill-foreground" : step.kind === "rise" ? "fill-chart-3" : "fill-chart-2";
                    const labelY = step.change >= 0 ? Math.min(y0, y1) - 6 : Math.max(y0, y1) + 14;
                    return (
                      <g
                        key={i}
                        onPointerEnter={() => cursor.point(i)}
                        className={cn("transition-opacity duration-instant motion-reduce:transition-none", cursor.active !== null && cursor.active !== i && "opacity-45")}
                      >
                        <rect x={band(i) ?? 0} y={top} width={band.bandwidth()} height={plotHeight - bottom - top} fill="transparent" />
                        <rect x={xOf(i)} y={Math.min(y0, y1)} width={w} height={Math.max(1, Math.abs(y1 - y0))} className={cn(fill, ROUND)} fillOpacity={step.kind === "total" ? 0.8 : 1} />
                        {next && next.kind !== "total" ? <line x1={xOf(i) + w} x2={xOf(i + 1)} y1={y1} y2={y1} className="stroke-muted-foreground" strokeDasharray="2 2" /> : null}
                        {showValues && w >= 24 ? (
                          <text x={xOf(i) + w / 2} y={labelY} textAnchor="middle" className="fill-foreground text-xs tabular-nums">
                            {signed(step.change, step.kind)}
                          </text>
                        ) : null}
                      </g>
                    );
                  })}
                  <line x1={left} x2={width - 4} y1={sy.scale(0)} y2={sy.scale(0)} className="stroke-border-strong" shapeRendering="crispEdges" />
                </g>
              </ChartSvg>
              {current && cursor.active !== null ? (
                <ChartTooltip
                  x={xOf(cursor.active) + w / 2}
                  y={sy.scale(Math.max(current.from, current.to))}
                  side={xOf(cursor.active) > width / 2 ? "left" : "right"}
                  title={current.name}
                  rows={[
                    { label: kindWord(current.kind), value: signed(current.change, current.kind) },
                    { label: labels.runningTotal, value: number(current.to) },
                  ]}
                />
              ) : null}
            </>
          );
        }}
      </ChartContainer>
    </div>
  );
}
