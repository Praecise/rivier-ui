"use client";
/**
 * @name dot-plot
 * @category viz
 * @description Values as dots along a shared axis, one row per category: plain dots for one or more series, a lollipop (a stick to the dot), a dumbbell (two values joined, for a before and after), or a beeswarm (every single value as its own dot, packed so none overlap).
 * @when Comparing values across categories with less ink than bars, especially when zero is not meaningful (dot, dumbbell), showing a change between two moments per category (dumbbell), or showing every observation in a few groups (beeswarm). For totals from zero use bar-chart; for a summary of spread use box-plot.
 * @example
 * <DotPlot
 *   label="Satisfaction before and after"
 *   data={[
 *     { team: "Support", before: 62, after: 78 },
 *     { team: "Sales", before: 70, after: 74 },
 *     { team: "Product", before: 55, after: 71 },
 *   ]}
 *   y="team"
 *   series={[{ key: "before", label: "Before" }, { key: "after", label: "After" }]}
 *   variant="dumbbell"
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
  ChartLegend,
  ChartMark,
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
  type ChartSeries,
} from "@/components/viz/chart";

export type DotPlotProps<T extends object> = ChartBaseProps & {
  data: readonly T[];
  /** The field naming each row: a category, or a group in a beeswarm. */
  y: keyof T & string;
  /** The values. A lollipop and a beeswarm use the first; a dumbbell joins the first two. */
  series: readonly ChartSeries<T>[];
  variant?: "dot" | "lollipop" | "dumbbell" | "beeswarm";
  /** Start the axis at zero. Default: true for a lollipop, false otherwise. */
  zero?: boolean;
  /** A field naming each dot in a beeswarm, for the tooltip and the table. */
  name?: keyof T & string;
  showGrid?: boolean;
  showLegend?: boolean;
};

type Row = { name: string; values: (number | null)[] };
type Swarm = { group: number; value: number; name: string; offset: number };

/** Packs dots of radius r along x so none overlap, each as close to its row's centre line as it can be. */
function dodge(values: { value: number; px: number; index: number }[], r: number): Map<number, number> {
  const placed: { px: number; offset: number }[] = [];
  const offsets = new Map<number, number>();
  for (const item of [...values].sort((a, b) => a.px - b.px)) {
    let offset = 0;
    for (let step = 0; step < 400; step++) {
      const candidate = step === 0 ? 0 : Math.ceil(step / 2) * (step % 2 ? 1 : -1) * r * 0.5;
      if (placed.every((p) => Math.hypot(p.px - item.px, p.offset - candidate) >= r * 2)) {
        offset = candidate;
        break;
      }
    }
    placed.push({ px: item.px, offset });
    offsets.set(item.index, offset);
  }
  return offsets;
}

export function DotPlot<T extends object>({
  data,
  y,
  series,
  variant = "dot",
  zero,
  name,
  showGrid = true,
  showLegend,
  label,
  aspect,
  height,
  emptyLabel,
  locale,
  formatValue,
  className,
  ...props
}: DotPlotProps<T>) {
  const swarm = variant === "beeswarm";
  const used = variant === "lollipop" || swarm ? series.slice(0, 1) : variant === "dumbbell" ? series.slice(0, 2) : series;
  const model = useMemo(() => {
    const read = (row: T, key: string): string => String((row as Record<string, unknown>)[key] ?? "");
    if (swarm) {
      const groups = [...new Set(data.map((row) => read(row, y)))];
      const first = used[0];
      const dots: Swarm[] = first
        ? data.flatMap((row, index) => {
            const value = readNumber(row, first.key);
            return value === null ? [] : [{ group: groups.indexOf(read(row, y)), value, name: name ? read(row, name) : String(index + 1), offset: 0 }];
          })
        : [];
      dots.sort((a, b) => a.group - b.group || a.value - b.value);
      return { rows: groups.map((g): Row => ({ name: g, values: [] })), dots };
    }
    return { rows: data.map((row): Row => ({ name: read(row, y), values: used.map((s) => readNumber(row, s.key)) })), dots: [] as Swarm[] };
  }, [data, y, used, swarm, name]);
  const { rows, dots } = model;
  const cursor = useChartCursor(swarm ? dots.length : rows.length);
  const number = formatValue ?? ((value: number) => formatNumber(value, locale));
  const table = swarm
    ? { caption: label, columns: [name ?? "#", y, used[0]?.label ?? ""], rows: dots.map((d) => [d.name, rows[d.group]?.name ?? "", number(d.value)]) }
    : { caption: label, columns: [y, ...used.map((s) => s.label)], rows: rows.map((row) => [row.name, ...row.values.map((v) => (v === null ? "" : number(v)))]) };
  const rowReading = (row: Row): { label: string; value: string; index: number }[] =>
    used.flatMap((s, i) => (row.values[i] === null || row.values[i] === undefined ? [] : [{ label: s.label, value: number(row.values[i] as number), index: i }]));
  const currentRow = !swarm && cursor.active !== null ? rows[cursor.active] : undefined;
  const currentDot = swarm && cursor.active !== null ? dots[cursor.active] : undefined;
  const announcement = !cursor.keyboard
    ? ""
    : currentRow
      ? `${currentRow.name}: ${rowReading(currentRow)
          .map((r) => `${r.label} ${r.value}`)
          .join(", ")}`
      : currentDot
        ? `${currentDot.name}, ${rows[currentDot.group]?.name ?? ""}: ${number(currentDot.value)}`
        : "";
  const legend = showLegend ?? (!swarm && used.length > 1);
  const fromZero = zero ?? variant === "lollipop";

  return (
    <div data-slot="dot-plot" className={cn("flex w-full min-w-0 flex-col gap-3", className)} {...props}>
      {legend ? <ChartLegend items={used.map((s, i) => ({ label: s.label, index: i }))} mark="rect" /> : null}
      <ChartContainer aspect={aspect} height={height ?? Math.max(120, rows.length * (swarm ? 72 : 36) + 36)} table={table} announcement={announcement}>
        {({ width, height: plotHeight }) => {
          const values = swarm ? dots.map((d) => d.value) : rows.flatMap((row) => row.values.filter((v): v is number => v !== null));
          if (values.length === 0) return <ChartEmpty>{emptyLabel}</ChartEmpty>;
          const bottom = 26;
          const nameRoom = Math.min(Math.round(width * 0.3), widestText(rows.map((r) => r.name)) + 12);
          const sx = chartLinear(Math.min(...values, ...(fromZero ? [0] : [])), Math.max(...values, ...(fromZero ? [0] : [])), [nameRoom, width - 12], 80);
          const axis = formatValue ?? axisNumberFormatter(Math.max(...values.map(Math.abs)), locale);
          const band = scaleBand<number>()
            .domain(rows.map((_, i) => i))
            .range([4, plotHeight - bottom])
            .paddingInner(0.1);
          const mid = (i: number): number => (band(i) ?? 0) + band.bandwidth() / 2;
          const r = swarm ? Math.max(2.5, Math.min(5, band.bandwidth() / 10)) : 5;
          // Each row is packed on its own, so dots of one group never push those of another.
          const offsets = new Map<number, number>();
          if (swarm) {
            rows.forEach((_, g) => {
              const mine = dots.flatMap((d, index) => (d.group === g ? [{ value: d.value, px: sx.scale(d.value), index }] : []));
              for (const [index, offset] of dodge(mine, r)) offsets.set(index, offset);
            });
          }
          const offsetOf = (index: number): number => Math.max(-band.bandwidth() / 2 + r, Math.min(band.bandwidth() / 2 - r, offsets.get(index) ?? 0));
          const tip =
            currentRow && cursor.active !== null
              ? { x: sx.scale(Math.max(...currentRow.values.filter((v): v is number => v !== null))), y: mid(cursor.active) }
              : currentDot && cursor.active !== null
                ? { x: sx.scale(currentDot.value), y: mid(currentDot.group) + offsetOf(cursor.active) }
                : undefined;
          return (
            <>
              <ChartSvg label={label} width={width} height={plotHeight} interactive {...cursor.svgProps}>
                {showGrid ? <ChartGrid offsets={sx.ticks.map((t) => sx.scale(t))} from={4} to={plotHeight - bottom} vertical /> : null}
                <ChartAxis side="bottom" at={plotHeight - bottom + 6} ticks={sx.ticks.map((t) => ({ offset: sx.scale(t), label: axis(t) }))} />
                <ChartAxis side="left" at={nameRoom - 8} ticks={rows.map((row, i) => ({ offset: mid(i), label: fitText(row.name, nameRoom - 12) }))} />
                <g aria-hidden="true">
                  {!swarm
                    ? rows.map((row, i) => {
                        const present = row.values.map((v, s) => ({ v, s })).filter((item): item is { v: number; s: number } => item.v !== null);
                        const dim = cursor.active !== null && cursor.active !== i;
                        return (
                          <g key={i} onPointerEnter={() => cursor.point(i)} className={cn("transition-opacity duration-instant motion-reduce:transition-none", dim && "opacity-40")}>
                            <rect x={0} y={band(i) ?? 0} width={width} height={band.bandwidth()} fill="transparent" />
                            <line x1={nameRoom} x2={width - 12} y1={mid(i)} y2={mid(i)} className="stroke-border" strokeDasharray="1 3" />
                            {variant === "lollipop" && present[0] ? (
                              <line x1={sx.scale(0)} x2={sx.scale(present[0].v)} y1={mid(i)} y2={mid(i)} className={chartSeries(0).stroke} strokeWidth={2} />
                            ) : null}
                            {variant === "dumbbell" && present.length === 2 ? (
                              <line x1={sx.scale(present[0]?.v ?? 0)} x2={sx.scale(present[1]?.v ?? 0)} y1={mid(i)} y2={mid(i)} className="stroke-muted-foreground" strokeWidth={2.5} />
                            ) : null}
                            {present.map((item) => (
                              <ChartMark key={item.s} index={item.s} x={sx.scale(item.v)} y={mid(i)} radius={r} />
                            ))}
                          </g>
                        );
                      })
                    : dots.map((d, i) => (
                        <circle
                          key={i}
                          cx={sx.scale(d.value)}
                          cy={mid(d.group) + offsetOf(i)}
                          r={r}
                          className={cn(
                            chartSeries(0).fill,
                            "stroke-background transition-opacity duration-instant motion-reduce:transition-none",
                            cursor.active !== null && cursor.active !== i && "opacity-50",
                          )}
                          strokeWidth={1}
                          onPointerEnter={() => cursor.point(i)}
                        />
                      ))}
                  {tip ? <circle cx={tip.x} cy={tip.y} r={r + 3} fill="none" className="stroke-foreground" strokeWidth={2} /> : null}
                </g>
              </ChartSvg>
              {tip && currentRow ? (
                <ChartTooltip x={tip.x} y={tip.y} side={tip.x > width / 2 ? "left" : "right"} title={currentRow.name} rows={rowReading(currentRow).map((row) => ({ ...row, mark: "rect" as const }))} />
              ) : null}
              {tip && currentDot ? (
                <ChartTooltip
                  x={tip.x}
                  y={tip.y}
                  side={tip.x > width / 2 ? "left" : "right"}
                  title={currentDot.name}
                  rows={[{ label: rows[currentDot.group]?.name ?? "", value: number(currentDot.value) }]}
                />
              ) : null}
            </>
          );
        }}
      </ChartContainer>
    </div>
  );
}
