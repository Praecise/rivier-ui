"use client";
/**
 * @name slope-chart
 * @category viz
 * @description Each thing's value at two moments joined by a line, so what rose, what fell and how the ranking changed read at once: names and values at both ends, rises solid and falls dashed so direction never rests on colour.
 * @when Comparing many things between exactly two moments or conditions: this year and last, before and after a change. For many moments use line-chart or small-multiples; for one thing's change use a stat with its delta; for a few categories use dot-plot dumbbell.
 * @example
 * <SlopeChart
 *   label="Share of trips by mode"
 *   data={[
 *     { mode: "Car", y2016: 52, y2026: 41 },
 *     { mode: "Bike", y2016: 9, y2026: 18 },
 *     { mode: "Transit", y2016: 24, y2026: 27 },
 *   ]}
 *   name="mode"
 *   from="y2016"
 *   to="y2026"
 *   fromLabel="2016"
 *   toLabel="2026"
 * />
 */
import { scaleLinear } from "d3-scale";
import { useMemo } from "react";
import { cn } from "@/lib/cn";
import { ChartContainer, ChartEmpty, ChartSvg, ChartTooltip, fitText, formatNumber, readNumber, useChartCursor, widestText, type ChartBaseProps } from "@/components/viz/chart";

export type SlopeChartLabels = { change: string; rose: string; fell: string; same: string };

export type SlopeChartProps<T extends object> = ChartBaseProps & {
  data: readonly T[];
  /** The field naming each thing. */
  name: keyof T & string;
  /** The fields holding the first and second values. */
  from: keyof T & string;
  to: keyof T & string;
  /** The names of the two moments, above the two columns. */
  fromLabel: string;
  toLabel: string;
  labels?: Partial<SlopeChartLabels>;
};

const LABELS: SlopeChartLabels = { change: "Change", rose: "Rose", fell: "Fell", same: "No change" };

type Line = { name: string; a: number; b: number };

/** Spreads label positions apart so none are nearer than `gap`, keeping their order. */
function spread(ys: number[], gap: number, low: number, high: number): number[] {
  const order = ys.map((y, i) => ({ y, i })).sort((p, q) => p.y - q.y);
  for (let k = 1; k < order.length; k++) {
    const prev = order[k - 1];
    const item = order[k];
    if (prev && item && item.y - prev.y < gap) item.y = prev.y + gap;
  }
  const last = order[order.length - 1];
  if (last && last.y > high) {
    const shift = last.y - high;
    for (const item of order) item.y -= shift;
  }
  for (const item of order) item.y = Math.max(low, item.y);
  const out = [...ys];
  for (const item of order) out[item.i] = item.y;
  return out;
}

export function SlopeChart<T extends object>({
  data,
  name,
  from,
  to,
  fromLabel,
  toLabel,
  labels: given,
  label,
  aspect = 1,
  height,
  emptyLabel,
  locale,
  formatValue,
  className,
  ...props
}: SlopeChartProps<T>) {
  const labels = { ...LABELS, ...given };
  const lines = useMemo(
    () =>
      data.flatMap((row): Line[] => {
        const a = readNumber(row, from);
        const b = readNumber(row, to);
        return a === null || b === null ? [] : [{ name: String((row as Record<string, unknown>)[name] ?? ""), a, b }];
      }),
    [data, name, from, to],
  );
  const cursor = useChartCursor(lines.length);
  const number = formatValue ?? ((value: number) => formatNumber(value, locale));
  const change = (line: Line): string => (formatValue ? formatValue(line.b - line.a) : formatNumber(line.b - line.a, locale, { signDisplay: "exceptZero", maximumFractionDigits: 2 }));
  const direction = (line: Line): string => (line.b > line.a ? labels.rose : line.b < line.a ? labels.fell : labels.same);
  const table = { caption: label, columns: [name, fromLabel, toLabel, labels.change], rows: lines.map((line) => [line.name, number(line.a), number(line.b), `${change(line)} (${direction(line)})`]) };
  const current = cursor.active === null ? undefined : lines[cursor.active];

  return (
    <div data-slot="slope-chart" className={cn("flex w-full min-w-0 flex-col gap-3", className)} {...props}>
      <ChartContainer
        aspect={aspect}
        height={height}
        table={table}
        announcement={cursor.keyboard && current ? `${current.name}: ${fromLabel} ${number(current.a)}, ${toLabel} ${number(current.b)}, ${direction(current)} ${change(current)}` : ""}
      >
        {({ width, height: plotHeight }) => {
          if (lines.length === 0) return <ChartEmpty>{emptyLabel}</ChartEmpty>;
          const top = 28;
          const bottom = 10;
          const all = lines.flatMap((l) => [l.a, l.b]);
          const sy = scaleLinear()
            .domain([Math.min(...all), Math.max(...all) === Math.min(...all) ? Math.min(...all) + 1 : Math.max(...all)])
            .range([plotHeight - bottom, top]);
          const room = Math.min(width * 0.32, widestText(lines.map((l) => `${l.name} ${number(Math.max(l.a, l.b))}`)) + 12);
          const x1 = room;
          const x2 = width - room;
          const leftYs = spread(
            lines.map((l) => sy(l.a)),
            14,
            top,
            plotHeight - bottom,
          );
          const rightYs = spread(
            lines.map((l) => sy(l.b)),
            14,
            top,
            plotHeight - bottom,
          );
          return (
            <>
              <ChartSvg label={label} width={width} height={plotHeight} interactive {...cursor.svgProps}>
                <g aria-hidden="true">
                  <line x1={x1} x2={x1} y1={top - 6} y2={plotHeight - bottom} className="stroke-border-strong" />
                  <line x1={x2} x2={x2} y1={top - 6} y2={plotHeight - bottom} className="stroke-border-strong" />
                  <text x={x1} y={12} textAnchor="middle" className="fill-foreground text-xs font-medium">
                    {fromLabel}
                  </text>
                  <text x={x2} y={12} textAnchor="middle" className="fill-foreground text-xs font-medium">
                    {toLabel}
                  </text>
                  {lines.map((line, i) => {
                    const rose = line.b >= line.a;
                    const dim = cursor.active !== null && cursor.active !== i;
                    return (
                      <g key={i} onPointerEnter={() => cursor.point(i)} className={cn("transition-opacity duration-instant motion-reduce:transition-none", dim && "opacity-30")}>
                        <line x1={x1} x2={x2} y1={sy(line.a)} y2={sy(line.b)} stroke="transparent" strokeWidth={12} />
                        <line
                          x1={x1}
                          x2={x2}
                          y1={sy(line.a)}
                          y2={sy(line.b)}
                          className={rose ? "stroke-chart-1" : "stroke-chart-2"}
                          strokeWidth={cursor.active === i ? 3 : 2}
                          strokeDasharray={rose ? undefined : "6 4"}
                        />
                        <circle cx={x1} cy={sy(line.a)} r={3.5} className={cn(rose ? "fill-chart-1" : "fill-chart-2", "stroke-background")} strokeWidth={1.5} />
                        <circle cx={x2} cy={sy(line.b)} r={3.5} className={cn(rose ? "fill-chart-1" : "fill-chart-2", "stroke-background")} strokeWidth={1.5} />
                        <text x={x1 - 8} y={leftYs[i]} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-xs tabular-nums">
                          {fitText(line.name, room - 48)} <tspan className="fill-foreground">{number(line.a)}</tspan>
                        </text>
                        <text x={x2 + 8} y={rightYs[i]} dy="0.32em" className="fill-muted-foreground text-xs tabular-nums">
                          <tspan className="fill-foreground">{number(line.b)}</tspan> {fitText(line.name, room - 48)}
                        </text>
                      </g>
                    );
                  })}
                </g>
              </ChartSvg>
              {current ? (
                <ChartTooltip
                  x={(x1 + x2) / 2}
                  y={(sy(current.a) + sy(current.b)) / 2}
                  side="right"
                  title={current.name}
                  rows={[
                    { label: fromLabel, value: number(current.a) },
                    { label: toLabel, value: number(current.b) },
                    { label: direction(current), value: change(current) },
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
