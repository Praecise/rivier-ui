"use client";
/**
 * @name radar-chart
 * @category viz
 * @description Several measures on spokes around a centre, one closed shape per series, so profiles can be compared at a glance: which is stronger where, with arrow keys reading each spoke.
 * @when Comparing two or three profiles across five to ten measures on the same scale: skills, product ratings, nutrition against a target. For exact comparison, or measures on different scales, use bar-chart or small-multiples; with more than three series the shapes tangle.
 * @example
 * <RadarChart
 *   label="Two plans compared"
 *   data={[
 *     { measure: "Speed", basic: 3, plus: 4 },
 *     { measure: "Storage", basic: 2, plus: 5 },
 *     { measure: "Support", basic: 3, plus: 4 },
 *     { measure: "Price", basic: 5, plus: 3 },
 *     { measure: "Security", basic: 4, plus: 4 },
 *   ]}
 *   axis="measure"
 *   series={[{ key: "basic", label: "Basic" }, { key: "plus", label: "Plus" }]}
 *   max={5}
 * />
 */
import { useMemo } from "react";
import { cn } from "@/lib/cn";
import {
  ChartContainer,
  ChartEmpty,
  ChartLegend,
  ChartMark,
  chartSeries,
  ChartSvg,
  ChartTooltip,
  fitText,
  formatNumber,
  readNumber,
  useChartCursor,
  type ChartBaseProps,
  type ChartSeries,
} from "@/components/viz/chart";

export type RadarChartProps<T extends object> = ChartBaseProps & {
  /** One object per spoke (measure). */
  data: readonly T[];
  /** The field naming each spoke. */
  axis: keyof T & string;
  /** The shapes, in a fixed order. */
  series: readonly ChartSeries<T>[];
  /** The value at the rim. Default: the largest value, made round. */
  max?: number;
  /** How many rings of the grid. Default 4. */
  rings?: number;
  /** Fill each shape lightly. Default true. */
  fill?: boolean;
  showLegend?: boolean;
};

export function RadarChart<T extends object>({
  data,
  axis,
  series,
  max,
  rings = 4,
  fill = true,
  showLegend,
  label,
  aspect = 1,
  height,
  emptyLabel,
  locale,
  formatValue,
  className,
  ...props
}: RadarChartProps<T>) {
  const spokes = useMemo(() => data.map((row) => String((row as Record<string, unknown>)[axis] ?? "")), [data, axis]);
  const cursor = useChartCursor(spokes.length);
  const number = formatValue ?? ((value: number) => formatNumber(value, locale));
  const highest = max ?? Math.max(1, ...data.flatMap((row) => series.map((item) => readNumber(row, item.key) ?? 0)));
  const table = {
    caption: label,
    columns: [axis, ...series.map((item) => item.label)],
    rows: data.map((row, index) => [
      spokes[index] ?? "",
      ...series.map((item) => {
        const v = readNumber(row, item.key);
        return v === null ? "" : number(v);
      }),
    ]),
  };
  const rowsAt = (index: number): { label: string; value: string; index: number }[] =>
    series.flatMap((item, s) => {
      const v = data[index] ? readNumber(data[index], item.key) : null;
      return v === null ? [] : [{ label: item.label, value: number(v), index: s }];
    });
  const legend = showLegend ?? series.length > 1;

  return (
    <div data-slot="radar-chart" className={cn("flex w-full min-w-0 flex-col gap-3", className)} {...props}>
      {legend ? <ChartLegend items={series.map((item, index) => ({ label: item.label, index }))} /> : null}
      <ChartContainer
        aspect={aspect}
        height={height}
        table={table}
        announcement={
          cursor.keyboard && cursor.active !== null
            ? `${spokes[cursor.active] ?? ""}: ${rowsAt(cursor.active)
                .map((row) => `${row.label} ${row.value}`)
                .join(", ")}`
            : ""
        }
      >
        {({ width, height: plotHeight }) => {
          if (spokes.length < 3) return <ChartEmpty>{emptyLabel}</ChartEmpty>;
          const cx = width / 2;
          const cy = plotHeight / 2;
          const room = Math.min(90, width * 0.22);
          const radius = Math.max(10, Math.min(cx - room, cy - 20));
          const angle = (index: number): number => (index / spokes.length) * Math.PI * 2 - Math.PI / 2;
          const at = (index: number, value: number): [number, number] => {
            const r = (Math.max(0, value) / highest) * radius;
            return [cx + Math.cos(angle(index)) * r, cy + Math.sin(angle(index)) * r];
          };
          const ring = (share: number): string => spokes.map((_, i) => at(i, share * highest).join(",")).join(" ");
          const tip = cursor.active === null ? undefined : at(cursor.active, highest);
          return (
            <>
              <ChartSvg label={label} width={width} height={plotHeight} interactive {...cursor.svgProps}>
                <g aria-hidden="true">
                  {Array.from({ length: rings }, (_, i) => (
                    <polygon key={i} points={ring((i + 1) / rings)} fill="none" className="stroke-border" />
                  ))}
                  {spokes.map((name, index) => {
                    const [x, y] = at(index, highest);
                    const cos = Math.cos(angle(index));
                    const anchor = Math.abs(cos) < 0.2 ? "middle" : cos > 0 ? "start" : "end";
                    const [lx, ly] = at(index, highest * 1.08);
                    return (
                      <g key={index} onPointerEnter={() => cursor.point(index)}>
                        <line x1={cx} y1={cy} x2={x} y2={y} className={cursor.active === index ? "stroke-foreground" : "stroke-border"} />
                        <circle cx={x} cy={y} r={16} fill="transparent" />
                        <text x={lx} y={ly} dy="0.32em" textAnchor={anchor} className={cn("text-xs", cursor.active === index ? "fill-foreground font-medium" : "fill-muted-foreground")}>
                          {fitText(name, room - 8)}
                        </text>
                      </g>
                    );
                  })}
                  <text x={cx + 4} y={cy - radius} dy="-0.2em" className="fill-muted-foreground text-xs tabular-nums">
                    {number(highest)}
                  </text>
                  {series.map((item, s) => {
                    const points = data.map((row, i) => at(i, readNumber(row, item.key) ?? 0));
                    const style = chartSeries(s);
                    return (
                      <g key={item.key} className="pointer-events-none">
                        <polygon
                          points={points.map((p) => p.join(",")).join(" ")}
                          className={cn(style.stroke, style.fill)}
                          fillOpacity={fill ? 0.14 : 0}
                          strokeWidth={2}
                          strokeDasharray={style.dash}
                          strokeLinejoin="round"
                        />
                        {points.map(([x, y], i) => (cursor.active === i ? <ChartMark key={i} index={s} x={x} y={y} radius={4} /> : null))}
                      </g>
                    );
                  })}
                </g>
              </ChartSvg>
              {tip && cursor.active !== null ? <ChartTooltip x={tip[0]} y={tip[1]} side={tip[0] > cx ? "left" : "right"} title={spokes[cursor.active]} rows={rowsAt(cursor.active)} /> : null}
            </>
          );
        }}
      </ChartContainer>
    </div>
  );
}
