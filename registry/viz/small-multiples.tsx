"use client";
/**
 * @name small-multiples
 * @category viz
 * @description The same small chart repeated for each group (a region, a product) in a grid that fits its width, every panel on one shared scale so they can be compared at a glance, each read by arrow keys.
 * @when Comparing the shape of one measure across many groups, where one chart with many lines would tangle: more than five series, or groups of very different sizes. For up to five series on one chart use line-chart; for one value per group use bar-chart.
 * @example
 * <SmallMultiples
 *   label="Monthly visits by region"
 *   data={[
 *     { region: "North", month: 1, visits: 40 }, { region: "North", month: 2, visits: 52 }, { region: "North", month: 3, visits: 61 },
 *     { region: "South", month: 1, visits: 30 }, { region: "South", month: 2, visits: 28 }, { region: "South", month: 3, visits: 35 },
 *   ]}
 *   facet="region"
 *   x="month"
 *   y="visits"
 *   kind="area"
 * />
 */
import { scaleBand, scaleLinear, scaleUtc } from "d3-scale";
import { area, line } from "d3-shape";
import { useId, useMemo, type ComponentProps, type PointerEvent } from "react";
import { cn } from "@/lib/cn";
import {
  axisNumberFormatter,
  ChartContainer,
  ChartDataTable,
  ChartEmpty,
  chartSeries,
  ChartSvg,
  ChartTooltip,
  dateFormatter,
  formatNumber,
  readNumber,
  useChartCursor,
  type ChartBaseProps,
} from "@/components/viz/chart";

export type SmallMultiplesProps<T extends object> = ChartBaseProps & {
  /** One object per point, every group's rows together. */
  data: readonly T[];
  /** The field naming each row's panel. */
  facet: keyof T & string;
  /** The field holding x: a number or Date (lines, areas) or a category name (bars). */
  x: keyof T & string;
  /** The field holding the value. */
  y: keyof T & string;
  /** The panels in order. Default: in order of first appearance. */
  facets?: readonly string[];
  /** The form of each panel. */
  kind?: "line" | "area" | "bar";
  /** Each panel on its own y scale. Default false: shared, so the panels can be compared. Say so in the label when it is true. */
  independent?: boolean;
  /** The narrowest a panel may be, in pixels, before the grid has fewer columns. Default 180. */
  minPanelWidth?: number;
  /** The names of x and y in the tooltip and the table. Default: the field names. */
  xLabel?: string;
  yLabel?: string;
  /** Replaces the x format. */
  formatX?: (value: number | Date | string) => string;
  timeZone?: string;
};

type Point = { x: number | string; y: number };
type Panel = { name: string; points: Point[] };

export function SmallMultiples<T extends object>({
  data,
  facet,
  x,
  y,
  facets,
  kind = "line",
  independent = false,
  minPanelWidth = 180,
  xLabel,
  yLabel,
  formatX,
  timeZone,
  label,
  aspect = 1.6,
  height,
  emptyLabel,
  locale,
  formatValue,
  className,
  style,
  ...props
}: SmallMultiplesProps<T>) {
  const model = useMemo(() => {
    const isTime = data.some((row) => (row as Record<string, unknown>)[x] instanceof Date);
    const map = new Map<string, Point[]>();
    for (const name of facets ?? []) map.set(name, []);
    const categories: string[] = [];
    for (const row of data) {
      const value = readNumber(row, y);
      if (value === null) continue;
      const name = String((row as Record<string, unknown>)[facet] ?? "");
      if (facets && !map.has(name)) continue;
      const raw = (row as Record<string, unknown>)[x];
      const at = kind === "bar" ? String(raw ?? "") : raw instanceof Date ? raw.getTime() : typeof raw === "number" ? raw : NaN;
      if (typeof at === "number" && !Number.isFinite(at)) continue;
      if (typeof at === "string" && !categories.includes(at)) categories.push(at);
      const list = map.get(name) ?? [];
      list.push({ x: at, y: value });
      map.set(name, list);
    }
    const panels: Panel[] = [...map].map(([name, points]) => ({ name, points: kind === "bar" ? points : [...points].sort((a, b) => Number(a.x) - Number(b.x)) }));
    const all = panels.flatMap((panel) => panel.points);
    const ys = all.map((point) => point.y);
    const xs = all.map((point) => Number(point.x)).filter(Number.isFinite);
    return { panels, isTime, categories, yLow: Math.min(0, ...ys), yHigh: Math.max(0, ...ys), xLow: Math.min(...xs), xHigh: Math.max(...xs) };
  }, [data, facet, x, y, facets, kind]);

  const { panels, isTime } = model;
  const number = formatValue ?? ((amount: number) => formatNumber(amount, locale));
  const span = model.xHigh - model.xLow;
  const fullX = (value: number | string): string =>
    formatX
      ? formatX(isTime && typeof value === "number" ? new Date(value) : value)
      : typeof value === "string"
        ? value
        : isTime
          ? dateFormatter(span, "full", locale, timeZone)(value)
          : formatNumber(value, locale);
  const table = {
    caption: label,
    columns: [facet, xLabel ?? x, yLabel ?? y],
    rows: panels.flatMap((panel) => panel.points.map((point) => [panel.name, fullX(point.x), number(point.y)])),
  };

  return (
    <figure data-slot="small-multiples" aria-label={label} className={cn("m-0 w-full min-w-0", className)} style={style} {...props}>
      {panels.length === 0 ? (
        <div className="relative h-32">
          <ChartEmpty>{emptyLabel}</ChartEmpty>
        </div>
      ) : (
        <ul className="grid gap-4" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${minPanelWidth}px), 1fr))` }}>
          {panels.map((panel) => (
            <SmallMultiplesPanel
              key={panel.name}
              panel={panel}
              kind={kind}
              isTime={isTime}
              categories={model.categories}
              xDomain={[model.xLow, model.xHigh]}
              yDomain={independent ? [Math.min(0, ...panel.points.map((p) => p.y)), Math.max(0, ...panel.points.map((p) => p.y))] : [model.yLow, model.yHigh]}
              aspect={aspect}
              height={height}
              number={number}
              fullX={fullX}
              yName={yLabel ?? y}
              locale={locale}
              formatValue={formatValue}
            />
          ))}
        </ul>
      )}
      <ChartDataTable {...table} />
    </figure>
  );
}

type PanelProps = {
  panel: Panel;
  kind: "line" | "area" | "bar";
  isTime: boolean;
  categories: string[];
  xDomain: [number, number];
  yDomain: [number, number];
  aspect: number;
  height: number | undefined;
  number: (value: number) => string;
  fullX: (value: number | string) => string;
  yName: string;
  locale: string | undefined;
  formatValue: ((value: number) => string) | undefined;
};

/** One panel. Exported for a project that lays panels out itself; most use SmallMultiples. */
export function SmallMultiplesPanel({
  panel,
  kind,
  isTime,
  categories,
  xDomain,
  yDomain,
  aspect,
  height,
  number,
  fullX,
  yName,
  locale,
  formatValue,
  className,
  ...props
}: PanelProps & Omit<ComponentProps<"li">, "children">) {
  const id = useId();
  const cursor = useChartCursor(panel.points.length);
  const current = cursor.active === null ? undefined : panel.points[cursor.active];
  const axisY = formatValue ?? axisNumberFormatter(Math.max(Math.abs(yDomain[0]), Math.abs(yDomain[1])), locale);
  return (
    <li data-slot="small-multiples-panel" className={cn("flex min-w-0 flex-col gap-1", className)} {...props}>
      <span id={id} className="truncate text-sm font-medium">
        {panel.name}
      </span>
      <ChartContainer aspect={aspect} height={height} announcement={cursor.keyboard && current ? `${panel.name}, ${fullX(current.x)}: ${number(current.y)}` : ""}>
        {({ width, height: plotHeight }) => {
          const top = 14;
          const bottom = 4;
          const sy = scaleLinear()
            .domain(yDomain[0] === yDomain[1] ? [0, 1] : yDomain)
            .nice(3)
            .range([plotHeight - bottom, top]);
          const [, highTick = 0] = sy.domain();
          const bars = scaleBand<string>().domain(categories).range([0, width]).paddingInner(0.2);
          const domain: [number, number] = xDomain[0] === xDomain[1] ? [xDomain[0], xDomain[0] + 1] : xDomain;
          const timeScale = scaleUtc().domain(domain).range([2, width - 2]);
          const numberScale = scaleLinear().domain(domain).range([2, width - 2]);
          const linear = (value: number): number => (isTime ? timeScale(value) : numberScale(value));
          const sx = (value: number | string): number => (kind === "bar" ? (bars(String(value)) ?? 0) + bars.bandwidth() / 2 : linear(Number(value)));
          const linePath = line<Point>()
            .x((p) => sx(p.x))
            .y((p) => sy(p.y))(panel.points);
          const areaPath =
            kind === "area"
              ? area<Point>()
                  .x((p) => sx(p.x))
                  .y0(sy(0))
                  .y1((p) => sy(p.y))(panel.points)
              : null;
          const onPointerMove = (event: PointerEvent<SVGSVGElement>): void => {
            const px = event.clientX - event.currentTarget.getBoundingClientRect().left;
            let best = 0;
            panel.points.forEach((point, index) => {
              if (Math.abs(sx(point.x) - px) < Math.abs(sx(panel.points[best]?.x ?? 0) - px)) best = index;
            });
            cursor.point(best);
          };
          const style = chartSeries(0);
          const shown = current ? { x: sx(current.x), y: sy(current.y) } : undefined;
          return (
            <>
              <ChartSvg label={panel.name} aria-labelledby={id} width={width} height={plotHeight} interactive {...cursor.svgProps} onPointerMove={onPointerMove}>
                <g aria-hidden="true">
                  <line x1={0} x2={width} y1={sy(highTick)} y2={sy(highTick)} className="stroke-border" shapeRendering="crispEdges" />
                  <text x={0} y={sy(highTick) - 3} className="fill-muted-foreground tabular-nums">
                    {axisY(highTick)}
                  </text>
                  <line x1={0} x2={width} y1={sy(0)} y2={sy(0)} className="stroke-border-strong" shapeRendering="crispEdges" />
                  {areaPath ? <path d={areaPath} className={style.fill} fillOpacity={0.25} /> : null}
                  {kind !== "bar" && linePath ? <path d={linePath} fill="none" className={style.stroke} strokeWidth={2} strokeLinejoin="round" /> : null}
                  {kind === "bar"
                    ? panel.points.map((point, index) => {
                        const w = Math.max(1, Math.min(16, bars.bandwidth()));
                        const y0 = sy(0);
                        const y1 = sy(point.y);
                        return (
                          <rect
                            key={index}
                            x={sx(point.x) - w / 2}
                            y={Math.min(y0, y1)}
                            width={w}
                            height={Math.abs(y0 - y1)}
                            className={cn(style.fill, cursor.active !== null && cursor.active !== index && "opacity-45")}
                          />
                        );
                      })
                    : null}
                  {shown ? <circle cx={shown.x} cy={shown.y} r={4} className={cn(style.fill, "stroke-background")} strokeWidth={2} /> : null}
                </g>
              </ChartSvg>
              {shown && current ? (
                <ChartTooltip x={shown.x} y={shown.y} side={shown.x > width / 2 ? "left" : "right"} title={fullX(current.x)} rows={[{ label: yName, value: number(current.y) }]} />
              ) : null}
            </>
          );
        }}
      </ChartContainer>
    </li>
  );
}
