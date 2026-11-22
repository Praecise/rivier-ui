"use client";
/**
 * @name scatter-chart
 * @category viz
 * @description Points placed by two numbers, optionally sized by a third (a bubble chart) and grouped by a category, with the nearest point read under the pointer and every point reachable by arrow keys.
 * @when Showing how two measures relate across many things: does one rise with the other, which stand apart. Give `size` for a third measure as bubble area. For change over time use line-chart; for one measure across categories use bar-chart or dot-plot; for thousands of overlapping points use density-chart.
 * @example
 * <ScatterChart
 *   label="Price against rating"
 *   data={[
 *     { name: "Alder", price: 12, rating: 4.1, sold: 320, kind: "Tea" },
 *     { name: "Birch", price: 18, rating: 4.6, sold: 120, kind: "Tea" },
 *     { name: "Cedar", price: 9, rating: 3.8, sold: 540, kind: "Coffee" },
 *   ]}
 *   x="price"
 *   y="rating"
 *   size="sold"
 *   group="kind"
 *   name="name"
 *   xLabel="Price"
 *   yLabel="Rating"
 * />
 */
import { Delaunay } from "d3-delaunay";
import { scaleSqrt } from "d3-scale";
import { useMemo, type PointerEvent } from "react";
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
  formatNumber,
  readNumber,
  useChartCursor,
  widestText,
  type ChartBaseProps,
} from "@/components/viz/chart";

export type ScatterChartProps<T extends object> = ChartBaseProps & {
  /** One object per point. Rows without a number for x or y are left out. */
  data: readonly T[];
  /** The field for the horizontal position. */
  x: keyof T & string;
  /** The field for the vertical position. */
  y: keyof T & string;
  /** A field whose number sets each point's area: a bubble chart. */
  size?: keyof T & string;
  /** A field naming each point's group: one colour and shape per group, in order of first appearance. */
  group?: keyof T & string;
  /** The groups in a fixed order, so a group keeps its colour when another is filtered out. */
  groups?: readonly string[];
  /** A field naming each point, for the tooltip and the table. */
  name?: keyof T & string;
  /** The names of the measures, on the axes, in the tooltip and in the table. Default: the field names. */
  xLabel?: string;
  yLabel?: string;
  sizeLabel?: string;
  /** Start an axis at zero. Default false: a scatter is read by position, not length. */
  zeroX?: boolean;
  zeroY?: boolean;
  showGrid?: boolean;
  /** Default: shown when there are two or more groups. */
  showLegend?: boolean;
  /** The largest bubble's radius in pixels. Default: a twelfth of the shorter side, at most 28. */
  maxRadius?: number;
};

type Point = {
  row: number;
  x: number;
  y: number;
  size: number | null;
  group: number;
  name: string;
};

export function ScatterChart<T extends object>({
  data,
  x,
  y,
  size,
  group,
  groups,
  name,
  xLabel,
  yLabel,
  sizeLabel,
  zeroX = false,
  zeroY = false,
  showGrid = true,
  showLegend,
  maxRadius,
  label,
  aspect,
  height,
  emptyLabel,
  locale,
  formatValue,
  className,
  ...props
}: ScatterChartProps<T>) {
  const model = useMemo(() => {
    const read = (row: T, key: string | undefined): string => (key ? String((row as Record<string, unknown>)[key] ?? "") : "");
    const order = groups ? [...groups] : [...new Set(data.map((row) => read(row, group)))];
    const points: Point[] = [];
    data.forEach((row, index) => {
      const px = readNumber(row, x);
      const py = readNumber(row, y);
      if (px === null || py === null) return;
      const g = group ? order.indexOf(read(row, group)) : 0;
      points.push({
        row: index,
        x: px,
        y: py,
        size: size ? readNumber(row, size) : null,
        group: g,
        name: read(row, name),
      });
    });
    // Reading order is left to right, so the arrow keys follow the x axis.
    points.sort((a, b) => a.x - b.x || a.y - b.y);
    return { points, order };
  }, [data, x, y, size, group, groups, name]);

  const { points, order } = model;
  const cursor = useChartCursor(points.length);
  const value = formatValue ?? ((number: number) => formatNumber(number, locale));
  const names = {
    x: xLabel ?? x,
    y: yLabel ?? y,
    size: sizeLabel ?? size ?? "",
  };
  const grouped = Boolean(group) && order.length > 0;
  const table = {
    caption: label,
    columns: [...(name ? [name] : ["#"]), names.x, names.y, ...(size ? [names.size] : []), ...(grouped ? [group ?? ""] : [])],
    rows: points.map((point, index) => [
      name ? point.name : String(index + 1),
      value(point.x),
      value(point.y),
      ...(size ? [point.size === null ? "" : value(point.size)] : []),
      ...(grouped ? [order[point.group] ?? ""] : []),
    ]),
  };
  const current = cursor.active === null ? undefined : points[cursor.active];
  const describe = (point: Point): string =>
    [point.name, grouped ? order[point.group] : "", `${names.x} ${value(point.x)}`, `${names.y} ${value(point.y)}`, size && point.size !== null ? `${names.size} ${value(point.size)}` : ""]
      .filter(Boolean)
      .join(", ");
  const legend = showLegend ?? (grouped && order.length > 1);

  return (
    <div data-slot="scatter-chart" className={cn("flex w-full min-w-0 flex-col gap-3", className)} {...props}>
      {legend ? <ChartLegend items={order.map((item, index) => ({ label: item, index }))} mark="rect" /> : null}
      <ChartContainer aspect={aspect ?? 4 / 3} height={height} table={table} announcement={cursor.keyboard && current ? describe(current) : ""}>
        {({ width, height: plotHeight }) => {
          if (points.length === 0) return <ChartEmpty>{emptyLabel}</ChartEmpty>;
          const xs = points.map((point) => point.x);
          const ys = points.map((point) => point.y);
          const lowX = Math.min(...xs, ...(zeroX ? [0] : []));
          const highX = Math.max(...xs, ...(zeroX ? [0] : []));
          const lowY = Math.min(...ys, ...(zeroY ? [0] : []));
          const highY = Math.max(...ys, ...(zeroY ? [0] : []));
          const top = 12;
          const bottom = 44;
          const probe = chartLinear(lowY, highY, [plotHeight - bottom, top]);
          const axisY = formatValue ?? axisNumberFormatter(Math.max(Math.abs(lowY), Math.abs(highY)), locale);
          const left = widestText(probe.ticks.map(axisY)) + 12;
          const right = 12;
          const sx = chartLinear(lowX, highX, [left, width - right], 80);
          const sy = probe;
          const axisX = formatValue ?? axisNumberFormatter(Math.max(Math.abs(lowX), Math.abs(highX)), locale);
          const sizes = points.flatMap((point) => (point.size === null ? [] : [Math.max(0, point.size)]));
          const reach = maxRadius ?? Math.min(28, Math.max(6, Math.min(width, plotHeight) / 12));
          const radius = scaleSqrt()
            .domain([0, Math.max(1e-9, ...sizes)])
            .range([size ? 2 : 4, size ? reach : 4]);
          const placed = points.map((point) => ({
            point,
            cx: sx.scale(point.x),
            cy: sy.scale(point.y),
            r: size ? radius(Math.max(0, point.size ?? 0)) : 4.5,
          }));
          const finder = Delaunay.from(
            placed,
            (item) => item.cx,
            (item) => item.cy,
          );
          const onPointerMove = (event: PointerEvent<SVGSVGElement>): void => {
            const box = event.currentTarget.getBoundingClientRect();
            const px = event.clientX - box.left;
            const py = event.clientY - box.top;
            const index = finder.find(px, py);
            const hit = placed[index];
            cursor.point(hit && Math.hypot(hit.cx - px, hit.cy - py) <= Math.max(24, hit.r + 8) ? index : null);
          };
          const shown = cursor.active === null ? undefined : placed[cursor.active];
          // Big bubbles behind small ones, so none is hidden.
          const drawOrder = size ? [...placed].sort((a, b) => b.r - a.r) : placed;
          return (
            <>
              <ChartSvg label={label} width={width} height={plotHeight} interactive {...cursor.svgProps} onPointerMove={onPointerMove}>
                {showGrid ? (
                  <>
                    <ChartGrid offsets={sy.ticks.map((tick) => sy.scale(tick))} from={left} to={width - right} />
                    <ChartGrid offsets={sx.ticks.map((tick) => sx.scale(tick))} from={top} to={plotHeight - bottom} vertical />
                  </>
                ) : null}
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
                  ticks={sx.ticks.map((tick) => ({
                    offset: sx.scale(tick),
                    label: axisX(tick),
                  }))}
                />
                <g aria-hidden="true" className="fill-muted-foreground">
                  <text x={(left + width - right) / 2} y={plotHeight - 4} textAnchor="middle">
                    {names.x}
                  </text>
                  <text x={left} y={top - 2} textAnchor="start" className="sr-only">
                    {names.y}
                  </text>
                </g>
                <g aria-hidden="true">
                  {drawOrder.map((item) =>
                    size ? (
                      <circle
                        key={item.point.row}
                        cx={item.cx}
                        cy={item.cy}
                        r={item.r}
                        className={cn(
                          chartSeries(item.point.group).fill,
                          "stroke-background opacity-75 transition-opacity duration-instant motion-reduce:transition-none",
                          shown && shown !== item && "opacity-35",
                        )}
                        strokeWidth={1.5}
                      />
                    ) : (
                      <ChartMark
                        key={item.point.row}
                        index={item.point.group}
                        x={item.cx}
                        y={item.cy}
                        radius={4.5}
                        className={cn("transition-opacity duration-instant motion-reduce:transition-none", shown && shown !== item && "opacity-45")}
                      />
                    ),
                  )}
                  {shown ? <circle cx={shown.cx} cy={shown.cy} r={shown.r + 3} fill="none" className="stroke-foreground" strokeWidth={2} /> : null}
                </g>
              </ChartSvg>
              {shown ? (
                <ChartTooltip
                  x={shown.cx}
                  y={shown.cy}
                  side={shown.cx > width / 2 ? "left" : "right"}
                  title={shown.point.name || (grouped ? order[shown.point.group] : undefined)}
                  rows={[
                    { label: names.x, value: value(shown.point.x) },
                    { label: names.y, value: value(shown.point.y) },
                    ...(size && shown.point.size !== null ? [{ label: names.size, value: value(shown.point.size) }] : []),
                    ...(grouped && shown.point.name
                      ? [
                          {
                            label: "",
                            value: order[shown.point.group] ?? "",
                            index: shown.point.group,
                            mark: "rect" as const,
                          },
                        ]
                      : []),
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
