"use client";
/**
 * @name funnel-chart
 * @category viz
 * @description The steps of a process that people (or things) drop out of, as centred bars that narrow with the count, each with its count, its share of the first step and its share of the step before.
 * @when Showing where a sequence loses the most: sign-up steps, a sales pipeline, a hiring process. For flows that split and join use sankey-chart; for amounts that are not a sequence use bar-chart horizontal.
 * @example
 * <FunnelChart
 *   label="Sign-up steps"
 *   data={[
 *     { step: "Visited", people: 1200 },
 *     { step: "Started", people: 640 },
 *     { step: "Confirmed email", people: 410 },
 *     { step: "Finished", people: 290 },
 *   ]}
 *   x="step"
 *   value="people"
 * />
 */
import { useMemo } from "react";
import { cn } from "@/lib/cn";
import { ChartContainer, ChartEmpty, chartSeries, ChartSvg, ChartTooltip, fitText, formatNumber, readNumber, useChartCursor, widestText, type ChartBaseProps } from "@/components/viz/chart";

export type FunnelChartLabels = { step: string; value: string; ofFirst: string; ofPrevious: string };

export type FunnelChartProps<T extends object> = Omit<ChartBaseProps, "aspect"> & {
  /** One object per step, in order. */
  data: readonly T[];
  x: keyof T & string;
  value: keyof T & string;
  /** Height of a step's row in pixels. Default 44. */
  rowHeight?: number;
  labels?: Partial<FunnelChartLabels>;
};

const LABELS: FunnelChartLabels = { step: "Step", value: "Count", ofFirst: "of the first step", ofPrevious: "of the step before" };

export function FunnelChart<T extends object>({ data, x, value, rowHeight = 44, labels: given, label, height, emptyLabel, locale, formatValue, className, ...props }: FunnelChartProps<T>) {
  const labels = { ...LABELS, ...given };
  const steps = useMemo(
    () =>
      data.flatMap((row) => {
        const amount = readNumber(row, value);
        return amount === null ? [] : [{ name: String((row as Record<string, unknown>)[x] ?? ""), amount: Math.max(0, amount) }];
      }),
    [data, x, value],
  );
  const cursor = useChartCursor(steps.length);
  const number = formatValue ?? ((amount: number) => formatNumber(amount, locale));
  const percent = (share: number): string => formatNumber(share, locale, { style: "percent", maximumFractionDigits: 1 });
  const first = steps[0]?.amount ?? 0;
  const shares = steps.map((step, i) => ({ ofFirst: first > 0 ? step.amount / first : 0, ofPrevious: i === 0 ? 1 : (steps[i - 1]?.amount ?? 0) > 0 ? step.amount / (steps[i - 1]?.amount ?? 1) : 0 }));
  const table = {
    caption: label,
    columns: [labels.step, labels.value, labels.ofFirst, labels.ofPrevious],
    rows: steps.map((step, i) => [step.name, number(step.amount), percent(shares[i]?.ofFirst ?? 0), i === 0 ? "" : percent(shares[i]?.ofPrevious ?? 0)]),
  };
  const current = cursor.active === null ? undefined : steps[cursor.active];
  const rowsOf = (i: number): { label: string; value: string }[] => [
    { label: labels.value, value: number(steps[i]?.amount ?? 0) },
    { label: labels.ofFirst, value: percent(shares[i]?.ofFirst ?? 0) },
    ...(i > 0 ? [{ label: labels.ofPrevious, value: percent(shares[i]?.ofPrevious ?? 0) }] : []),
  ];

  return (
    <div data-slot="funnel-chart" className={cn("flex w-full min-w-0 flex-col gap-3", className)} {...props}>
      <ChartContainer
        height={height ?? Math.max(80, steps.length * rowHeight)}
        table={table}
        announcement={
          cursor.keyboard && current && cursor.active !== null
            ? `${current.name}: ${rowsOf(cursor.active)
                .map((row) => `${row.value} ${row.label}`)
                .join(", ")}`
            : ""
        }
      >
        {({ width, height: plotHeight }) => {
          if (steps.length === 0 || first <= 0) return <ChartEmpty>{emptyLabel}</ChartEmpty>;
          const row = plotHeight / steps.length;
          const nameRoom = Math.min(width * 0.32, widestText(steps.map((s) => s.name)) + 12);
          const valueRoom = Math.min(width * 0.26, widestText(steps.map((s, i) => `${number(s.amount)} · ${percent(shares[i]?.ofFirst ?? 0)}`)) + 12);
          const barRoom = Math.max(20, width - nameRoom - valueRoom);
          const centre = nameRoom + barRoom / 2;
          const bar = Math.min(28, row - 10);
          return (
            <>
              <ChartSvg label={label} width={width} height={plotHeight} interactive {...cursor.svgProps}>
                <g aria-hidden="true">
                  {steps.map((step, i) => {
                    const w = Math.max(2, (step.amount / first) * barRoom);
                    const y = i * row + (row - bar) / 2;
                    const next = steps[i + 1];
                    return (
                      <g
                        key={i}
                        onPointerEnter={() => cursor.point(i)}
                        className={cn("transition-opacity duration-instant motion-reduce:transition-none", cursor.active !== null && cursor.active !== i && "opacity-45")}
                      >
                        <rect x={0} y={i * row} width={width} height={row} fill="transparent" />
                        {next ? (
                          <polygon
                            points={`${centre - w / 2},${y + bar} ${centre + w / 2},${y + bar} ${centre + Math.max(2, (next.amount / first) * barRoom) / 2},${y + row} ${centre - Math.max(2, (next.amount / first) * barRoom) / 2},${y + row}`}
                            className={chartSeries(0).fill}
                            fillOpacity={0.15}
                          />
                        ) : null}
                        <rect x={centre - w / 2} y={y} width={w} height={bar} className={cn(chartSeries(0).fill, "[rx:min(var(--radius),4px)]")} />
                        <text x={0} y={y + bar / 2} dy="0.32em" className="fill-foreground text-xs">
                          {fitText(step.name, nameRoom - 8)}
                        </text>
                        <text x={width} y={y + bar / 2} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-xs tabular-nums">
                          <tspan className="fill-foreground font-medium">{number(step.amount)}</tspan> · {percent(shares[i]?.ofFirst ?? 0)}
                        </text>
                      </g>
                    );
                  })}
                  {current && cursor.active !== null ? (
                    <rect x={1} y={cursor.active * row + 1} width={width - 2} height={row - 2} fill="none" className="stroke-foreground [rx:min(var(--radius),4px)]" strokeWidth={2} />
                  ) : null}
                </g>
              </ChartSvg>
              {current && cursor.active !== null ? <ChartTooltip x={centre} y={cursor.active * row + row / 2} side="right" title={current.name} rows={rowsOf(cursor.active)} /> : null}
            </>
          );
        }}
      </ChartContainer>
    </div>
  );
}
