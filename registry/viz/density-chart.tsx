"use client";
/**
 * @name density-chart
 * @category viz
 * @description Where many points crowd together, drawn as filled contour bands of one hue from faint to strong (like the lines of a height map), with the points optionally on top and each point reachable by arrow keys.
 * @when Two measures over hundreds or thousands of points, where a scatter-chart would be a blot: where the bulk lies, whether there are two clusters. For under a few hundred points use scatter-chart; for one measure's spread use histogram.
 * @example
 * <DensityChart
 *   label="Trip length against fare"
 *   data={[{ km: 2, fare: 8 }, { km: 3, fare: 10 }, { km: 2.5, fare: 9 }, { km: 12, fare: 31 }, { km: 11, fare: 29 }]}
 *   x="km"
 *   y="fare"
 *   xLabel="Distance (km)"
 *   yLabel="Fare"
 *   showPoints
 * />
 */
import { contourDensity } from "d3-contour";
import { Delaunay } from "d3-delaunay";
import { useId, useMemo, type PointerEvent } from "react";
import { cn } from "@/lib/cn";
import {
  axisNumberFormatter,
  ChartAxis,
  ChartContainer,
  ChartEmpty,
  ChartGrid,
  chartLinear,
  chartSequential,
  ChartSvg,
  ChartTooltip,
  formatNumber,
  readNumber,
  useChartCursor,
  widestText,
  type ChartBaseProps,
} from "@/components/viz/chart";

export type DensityChartProps<T extends object> = ChartBaseProps & {
  /** One object per point. */
  data: readonly T[];
  x: keyof T & string;
  y: keyof T & string;
  /** A field whose number weights each point. Default: every point counts once. */
  weight?: keyof T & string;
  /** The names of the measures. Default: the field names. */
  xLabel?: string;
  yLabel?: string;
  /** How smooth the bands are, in pixels. Default 20. */
  bandwidth?: number;
  /** About how many bands. Default 8. */
  levels?: number;
  /** Draw the points over the bands. Default: when there are 300 or fewer. */
  showPoints?: boolean;
  showGrid?: boolean;
};


/** A contour's rings as an SVG path: its coordinates are already in pixels. */
function ringsPath(polygons: number[][][][]): string {
  return polygons.map((polygon) => polygon.map((ring) => `M${ring.map((p) => `${p[0] ?? 0},${p[1] ?? 0}`).join("L")}Z`).join("")).join("");
}

export function DensityChart<T extends object>({
  data,
  x,
  y,
  weight,
  xLabel,
  yLabel,
  bandwidth = 20,
  levels = 8,
  showPoints,
  showGrid = true,
  label,
  aspect = 4 / 3,
  height,
  emptyLabel,
  locale,
  formatValue,
  className,
  ...props
}: DensityChartProps<T>) {
  const points = useMemo(
    () =>
      data
        .flatMap((row, index) => {
          const px = readNumber(row, x);
          const py = readNumber(row, y);
          if (px === null || py === null) return [];
          return [{ x: px, y: py, w: weight ? Math.max(0, readNumber(row, weight) ?? 0) : 1, row: index }];
        })
        .sort((a, b) => a.x - b.x || a.y - b.y),
    [data, x, y, weight],
  );
  const cursor = useChartCursor(points.length);
  const clip = `density-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const number = formatValue ?? ((value: number) => formatNumber(value, locale));
  const names = { x: xLabel ?? x, y: yLabel ?? y };
  const table = {
    caption: label,
    columns: ["#", names.x, names.y, ...(weight ? [weight] : [])],
    rows: points.map((p, i) => [String(i + 1), number(p.x), number(p.y), ...(weight ? [number(p.w)] : [])]),
  };
  const current = cursor.active === null ? undefined : points[cursor.active];
  const dots = showPoints ?? points.length <= 300;

  return (
    <div data-slot="density-chart" className={cn("flex w-full min-w-0 flex-col gap-3", className)} {...props}>
      <ChartContainer aspect={aspect} height={height} table={table} announcement={cursor.keyboard && current ? `${names.x} ${number(current.x)}, ${names.y} ${number(current.y)}` : ""}>
        {({ width, height: plotHeight }) => {
          if (points.length === 0) return <ChartEmpty>{emptyLabel}</ChartEmpty>;
          const top = 22;
          const bottom = 44;
          const xs = points.map((p) => p.x);
          const ys = points.map((p) => p.y);
          const sy = chartLinear(Math.min(...ys), Math.max(...ys), [plotHeight - bottom, top]);
          const axisY = formatValue ?? axisNumberFormatter(Math.max(...ys.map(Math.abs)), locale);
          const left = widestText(sy.ticks.map(axisY)) + 12;
          const right = 12;
          const sx = chartLinear(Math.min(...xs), Math.max(...xs), [left, width - right], 80);
          const axisX = formatValue ?? axisNumberFormatter(Math.max(...xs.map(Math.abs)), locale);
          const placed = points.map((p) => ({ p, px: sx.scale(p.x), py: sy.scale(p.y) }));
          const contours = contourDensity<(typeof placed)[number]>()
            .x((d) => d.px)
            .y((d) => d.py)
            .weight((d) => d.p.w)
            .size([width, plotHeight])
            .bandwidth(bandwidth)
            .thresholds(levels)(placed);
          const highest = Math.max(1e-12, ...contours.map((c) => c.value));
          const finder = Delaunay.from(
            placed,
            (d) => d.px,
            (d) => d.py,
          );
          const onPointerMove = (event: PointerEvent<SVGSVGElement>): void => {
            const box = event.currentTarget.getBoundingClientRect();
            const mx = event.clientX - box.left;
            const my = event.clientY - box.top;
            const index = finder.find(mx, my);
            const hit = placed[index];
            cursor.point(hit && Math.hypot(hit.px - mx, hit.py - my) <= 24 ? index : null);
          };
          const shown = cursor.active === null ? undefined : placed[cursor.active];
          return (
            <>
              <ChartSvg label={label} width={width} height={plotHeight} interactive {...cursor.svgProps} onPointerMove={onPointerMove}>
                <defs>
                  <clipPath id={clip}>
                    <rect x={left} y={top} width={Math.max(0, width - left - right)} height={Math.max(0, plotHeight - top - bottom)} />
                  </clipPath>
                </defs>
                {showGrid ? (
                  <>
                    <ChartGrid offsets={sy.ticks.map((tick) => sy.scale(tick))} from={left} to={width - right} />
                    <ChartGrid offsets={sx.ticks.map((tick) => sx.scale(tick))} from={top} to={plotHeight - bottom} vertical />
                  </>
                ) : null}
                <ChartAxis side="left" at={left - 8} ticks={sy.ticks.map((tick) => ({ offset: sy.scale(tick), label: axisY(tick) }))} />
                <ChartAxis side="bottom" at={plotHeight - bottom + 6} ticks={sx.ticks.map((tick) => ({ offset: sx.scale(tick), label: axisX(tick) }))} />
                <g aria-hidden="true" className="fill-muted-foreground">
                  <text x={(left + width - right) / 2} y={plotHeight - 4} textAnchor="middle">
                    {names.x}
                  </text>
                  <text x={0} y={10}>
                    {names.y}
                  </text>
                </g>
                <g aria-hidden="true" clipPath={`url(#${clip})`}>
                  {contours.map((contour, index) => (
                    <path
                      key={index}
                      d={ringsPath(contour.coordinates)}
                      style={{ fill: chartSequential(0.15 + 0.85 * (contour.value / highest)) }}
                      className="stroke-background"
                      strokeWidth={0.75}
                      fillOpacity={0.85}
                    />
                  ))}
                  {dots ? placed.map((d) => <circle key={d.p.row} cx={d.px} cy={d.py} r={1.75} className="fill-foreground" fillOpacity={0.55} />) : null}
                  {shown ? <circle cx={shown.px} cy={shown.py} r={5} className={cn("fill-foreground stroke-background")} strokeWidth={2} /> : null}
                </g>
              </ChartSvg>
              {shown ? (
                <ChartTooltip
                  x={shown.px}
                  y={shown.py}
                  side={shown.px > width / 2 ? "left" : "right"}
                  rows={[
                    { label: names.x, value: number(shown.p.x) },
                    { label: names.y, value: number(shown.p.y) },
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
