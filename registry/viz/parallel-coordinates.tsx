"use client";
/**
 * @name parallel-coordinates
 * @category viz
 * @description Many measures of many things at once: one upright axis per measure, each thing a line that crosses every axis at its value, so trade-offs and clusters show as patterns of crossing or parallel lines; each line lit and read by arrow keys.
 * @when Comparing things across four to ten measures with different units: cars by price, power and weight; plans by cost and limits. For two measures use scatter-chart; for a few things on one scale use radar-chart; for exact values use table or data-grid.
 * @example
 * <ParallelCoordinates
 *   label="Laptops compared"
 *   data={[
 *     { name: "Alder", price: 900, weight: 1.3, battery: 12, kind: "Light" },
 *     { name: "Birch", price: 1400, weight: 2.1, battery: 8, kind: "Power" },
 *     { name: "Cedar", price: 700, weight: 1.6, battery: 10, kind: "Light" },
 *   ]}
 *   dimensions={[{ key: "price", label: "Price" }, { key: "weight", label: "Weight (kg)" }, { key: "battery", label: "Battery (h)" }]}
 *   name="name"
 *   group="kind"
 * />
 */
import { scaleLinear, scalePoint } from "d3-scale";
import { useMemo } from "react";
import { cn } from "@/lib/cn";
import {
  axisNumberFormatter,
  ChartContainer,
  ChartEmpty,
  ChartLegend,
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

export type ParallelCoordinatesProps<T extends object> = ChartBaseProps & {
  data: readonly T[];
  /** The measures, one axis each, left to right. */
  dimensions: readonly ChartSeries<T>[];
  /** A field naming each thing. */
  name?: keyof T & string;
  /** A field naming each thing's group: one colour per group, in order of first appearance. */
  group?: keyof T & string;
  showLegend?: boolean;
};

export function ParallelCoordinates<T extends object>({
  data,
  dimensions,
  name,
  group,
  showLegend,
  label,
  aspect = 16 / 9,
  height,
  emptyLabel,
  locale,
  formatValue,
  className,
  ...props
}: ParallelCoordinatesProps<T>) {
  const model = useMemo(() => {
    const read = (row: T, key: string | undefined): string => (key ? String((row as Record<string, unknown>)[key] ?? "") : "");
    const groups = group ? [...new Set(data.map((row) => read(row, group)))] : [];
    const lines = data.map((row, index) => ({
      name: name ? read(row, name) : String(index + 1),
      group: group ? groups.indexOf(read(row, group)) : 0,
      values: dimensions.map((d) => readNumber(row, d.key)),
    }));
    const extents = dimensions.map((_, d) => {
      const values = lines.flatMap((line) => (line.values[d] === null || line.values[d] === undefined ? [] : [line.values[d] as number]));
      return [Math.min(...values), Math.max(...values)] as const;
    });
    return { lines, groups, extents };
  }, [data, dimensions, name, group]);
  const { lines, groups, extents } = model;
  const cursor = useChartCursor(lines.length);
  const number = formatValue ?? ((value: number) => formatNumber(value, locale));
  const table = {
    caption: label,
    columns: [name ?? "#", ...(group ? [group] : []), ...dimensions.map((d) => d.label)],
    rows: lines.map((line) => [line.name, ...(group ? [groups[line.group] ?? ""] : []), ...line.values.map((v) => (v === null || v === undefined ? "" : number(v)))]),
  };
  const current = cursor.active === null ? undefined : lines[cursor.active];
  const rowsOf = (line: (typeof lines)[number]): { label: string; value: string }[] =>
    dimensions.map((d, i) => ({ label: d.label, value: line.values[i] === null || line.values[i] === undefined ? "" : number(line.values[i] as number) }));
  const legend = showLegend ?? groups.length > 1;

  return (
    <div data-slot="parallel-coordinates" className={cn("flex w-full min-w-0 flex-col gap-3", className)} {...props}>
      {legend ? <ChartLegend items={groups.map((g, i) => ({ label: g, index: i < 5 ? i : -1 }))} /> : null}
      <ChartContainer
        aspect={aspect}
        height={height}
        table={table}
        announcement={
          cursor.keyboard && current
            ? `${current.name}: ${rowsOf(current)
                .map((row) => `${row.label} ${row.value}`)
                .join(", ")}`
            : ""
        }
      >
        {({ width, height: plotHeight }) => {
          if (lines.length === 0 || dimensions.length < 2) return <ChartEmpty>{emptyLabel}</ChartEmpty>;
          const top = 30;
          const bottom = 20;
          const sx = scalePoint<number>()
            .domain(dimensions.map((_, i) => i))
            .range([28, width - 28]);
          const scales = extents.map(([low, high]) =>
            scaleLinear()
              .domain(low === high || !Number.isFinite(low) ? [(Number.isFinite(low) ? low : 0) - 1, (Number.isFinite(high) ? high : 0) + 1] : [low, high])
              .nice(4)
              .range([plotHeight - bottom, top]),
          );
          const path = (line: (typeof lines)[number]): string =>
            line.values
              .map((v, i) => (v === null || v === undefined ? null : `${sx(i) ?? 0},${scales[i]?.(v) ?? 0}`))
              .filter((p): p is string => p !== null)
              .map((p, i) => `${i === 0 ? "M" : "L"}${p}`)
              .join("");
          const step = sx.step();
          const shown = current ? { x: sx(dimensions.length - 1) ?? 0, y: scales[dimensions.length - 1]?.(current.values[dimensions.length - 1] ?? 0) ?? 0 } : undefined;
          return (
            <>
              <ChartSvg label={label} width={width} height={plotHeight} interactive {...cursor.svgProps}>
                <g aria-hidden="true" fill="none">
                  {lines.map((line, i) => (
                    <path
                      key={i}
                      d={path(line)}
                      className={cn(chartSeries(group ? (line.group < 5 ? line.group : -1) : 0).stroke, "transition-opacity duration-instant motion-reduce:transition-none")}
                      strokeOpacity={cursor.active === null ? 0.55 : cursor.active === i ? 1 : 0.12}
                      strokeWidth={cursor.active === i ? 2.5 : 1.5}
                      strokeLinejoin="round"
                    />
                  ))}
                  {/* Wide invisible strokes take the pointer, so a thin line is easy to hit. */}
                  {lines.map((line, i) => (
                    <path key={`hit${i}`} d={path(line)} stroke="transparent" strokeWidth={10} onPointerEnter={() => cursor.point(i)} />
                  ))}
                </g>
                <g aria-hidden="true">
                  {dimensions.map((d, i) => {
                    const scale = scales[i];
                    if (!scale) return null;
                    const ticks = scale.ticks(4);
                    const format = formatValue ?? axisNumberFormatter(Math.max(...ticks.map(Math.abs)), locale);
                    const x = sx(i) ?? 0;
                    return (
                      <g key={d.key}>
                        <line x1={x} x2={x} y1={top} y2={plotHeight - bottom} className="stroke-border-strong" />
                        <text x={x} y={top - 14} textAnchor="middle" className="fill-foreground text-xs font-medium">
                          {fitText(d.label, Math.max(40, step - 8))}
                        </text>
                        {ticks.map((tick) => (
                          <text key={tick} x={x + 4} y={scale(tick)} dy="0.32em" className="fill-muted-foreground stroke-background text-xs tabular-nums" paintOrder="stroke" strokeWidth={3}>
                            {format(tick)}
                          </text>
                        ))}
                      </g>
                    );
                  })}
                </g>
              </ChartSvg>
              {current && shown ? <ChartTooltip x={shown.x} y={shown.y} side="left" title={current.name} rows={rowsOf(current)} /> : null}
            </>
          );
        }}
      </ChartContainer>
    </div>
  );
}
