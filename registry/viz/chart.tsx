"use client";
/**
 * @name chart
 * @category viz
 * @description The shared parts every chart is built from: a container that measures itself and carries the text alternative, an SVG root, a tooltip, a legend, series styles, and axis and format helpers.
 * @when Building a chart of your own that should match the others. For the common forms use line-chart, area-chart, bar-chart, donut-chart, sparkline, heatmap or radial-progress directly.
 * @example
 * <ChartContainer aspect={2} table={{ caption: "Signups", columns: ["Day", "Signups"], rows: [["Mon", 4], ["Tue", 9]] }}>
 *   {({ width, height }) => (
 *     <ChartSvg label="Signups by day" width={width} height={height}>
 *       <rect x={0} y={height - 40} width={width / 3} height={40} className={chartSeries(0).fill} />
 *       <rect x={width / 2} y={height - 90} width={width / 3} height={90} className={chartSeries(0).fill} />
 *     </ChartSvg>
 *   )}
 * </ChartContainer>
 * <ChartLegend items={[{ label: "Signups", index: 0 }]} mark="rect" />
 */
import { symbol, symbolCircle, symbolCross, symbolDiamond, symbolSquare, symbolStar, symbolTriangle, type SymbolType } from "d3-shape";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useSize, type Size } from "@/lib/use-size";

/* Series: colour, plus a shape and (past five) a dash, so identity never rests on colour alone. */

export type ChartSeries<T> = {
  /** The field of a data row that holds this series' number. */
  key: keyof T & string;
  /** Its name in the legend, the tooltip and the table. */
  label: string;
};

export type ChartSeriesStyle = {
  /** Tailwind classes for the series colour. Literal strings, so Tailwind finds them. */
  fill: string;
  stroke: string;
  background: string;
  /** A stroke-dasharray for lines, set only past the fifth series. */
  dash: string | undefined;
  symbol: SymbolType;
};

const PALETTE = [
  { fill: "fill-chart-1", stroke: "stroke-chart-1", background: "bg-chart-1", symbol: symbolCircle },
  { fill: "fill-chart-2", stroke: "stroke-chart-2", background: "bg-chart-2", symbol: symbolSquare },
  { fill: "fill-chart-3", stroke: "stroke-chart-3", background: "bg-chart-3", symbol: symbolDiamond },
  { fill: "fill-chart-4", stroke: "stroke-chart-4", background: "bg-chart-4", symbol: symbolTriangle },
  { fill: "fill-chart-5", stroke: "stroke-chart-5", background: "bg-chart-5", symbol: symbolCross },
] as const;
const NEUTRAL: ChartSeriesStyle = { fill: "fill-muted-foreground", stroke: "stroke-muted-foreground", background: "bg-muted-foreground", dash: undefined, symbol: symbolStar };
const DASHES = [undefined, "6 4", "2 4"] as const;

/**
 * The style of series `index` (0-based), in fixed order: the colour follows the series, never its rank.
 * There are five colours. A sixth to fifteenth series reuses them with a dash; prefer folding a long tail
 * into "Other" or splitting the chart. A negative index is the neutral "Other".
 */
export function chartSeries(index: number): ChartSeriesStyle {
  if (index < 0) return NEUTRAL;
  const slot = PALETTE[index % PALETTE.length] ?? PALETTE[0];
  return { ...slot, dash: DASHES[Math.floor(index / PALETTE.length) % DASHES.length] };
}

/** The path of a series' marker, centred on 0,0, about `radius` in reach. */
export function chartMarkPath(index: number, radius: number): string {
  return symbol(chartSeries(index).symbol, radius * radius * 3.2)() ?? "";
}

export type ChartMarkProps = Omit<ComponentProps<"path">, "d" | "transform"> & {
  index: number;
  x: number;
  y: number;
  radius?: number;
  /** A 2px ring in the surface colour, so the mark stays legible where it crosses a line or another mark. */
  ring?: boolean;
};

/** A series marker inside an SVG: the series' colour and its own shape. */
export function ChartMark({ index, x, y, radius = 4, ring = true, className, ...props }: ChartMarkProps) {
  return (
    <path
      data-slot="chart-mark"
      d={chartMarkPath(index, radius)}
      transform={`translate(${x},${y})`}
      className={cn(chartSeries(index).fill, ring && "stroke-background", className)}
      strokeWidth={ring ? 2 : undefined}
      paintOrder="stroke"
      strokeLinejoin="round"
      {...props}
    />
  );
}

/* Formatting. The locale defaults to a fixed one so the server and the browser print the same text. */

export type ChartFormat = {
  /** A BCP 47 locale for numbers and dates. Default "en-US". */
  locale?: string;
  /** The time zone dates are printed in. Default "UTC", so the server and the browser agree. */
  timeZone?: string;
  /** Replaces the number format everywhere: axis, labels, tooltip, table. */
  formatValue?: (value: number) => string;
};

const DEFAULT_LOCALE = "en-US";
const numberFormats = new Map<string, Intl.NumberFormat>();
const dateFormats = new Map<string, Intl.DateTimeFormat>();

function numberFormat(locale: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${locale}:${JSON.stringify(options)}`;
  let format = numberFormats.get(key);
  if (!format) {
    format = new Intl.NumberFormat(locale, options);
    numberFormats.set(key, format);
  }
  return format;
}

/** A number in full, for tooltips, labels and tables. */
export function formatNumber(value: number, locale: string = DEFAULT_LOCALE, options: Intl.NumberFormatOptions = { maximumFractionDigits: 2 }): string {
  return numberFormat(locale, options).format(value);
}

/** The format for an axis: in full below 10,000, compact (10K, 1.2M) on an axis that reaches it. One style per axis. */
export function axisNumberFormatter(extent: number, locale: string = DEFAULT_LOCALE): (value: number) => string {
  const format = numberFormat(locale, Math.abs(extent) >= 10000 ? { notation: "compact", maximumFractionDigits: 1 } : { maximumFractionDigits: 2 });
  return (value) => format.format(value);
}

/** The format for dates on an axis ("axis") or in a tooltip and table ("full"), chosen by how much time the data spans. */
export function dateFormatter(spanMs: number, detail: "axis" | "full" = "axis", locale: string = DEFAULT_LOCALE, timeZone: string = "UTC"): (value: number | Date) => string {
  const day = 86400000;
  let options: Intl.DateTimeFormatOptions;
  if (spanMs <= 2 * day) options = detail === "axis" ? { hour: "numeric", minute: "2-digit" } : { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" };
  else if (spanMs <= 366 * day) options = detail === "axis" ? { month: "short", day: "numeric" } : { year: "numeric", month: "short", day: "numeric" };
  else if (spanMs <= 4 * 366 * day) options = detail === "axis" ? { month: "short", year: "2-digit" } : { year: "numeric", month: "short", day: "numeric" };
  else options = detail === "axis" ? { year: "numeric" } : { year: "numeric", month: "short" };
  const key = `${locale}:${timeZone}:${JSON.stringify(options)}`;
  let format = dateFormats.get(key);
  if (!format) {
    format = new Intl.DateTimeFormat(locale, { ...options, timeZone });
    dateFormats.set(key, format);
  }
  const resolved = format;
  return (value) => resolved.format(value);
}

/** A close enough width for a short label at the axis text size, used to make room before drawing. */
export function estimateTextWidth(text: string, fontSize = 12): number {
  return text.length * fontSize * 0.58;
}

/** A number from a data row, or null when the field is missing or not a finite number: a gap, not a zero. */
export function readNumber(row: object, key: string): number | null {
  const value = (row as Record<string, unknown>)[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/* Container, SVG root and the text alternative. */

export type ChartTable = {
  caption?: string;
  columns: readonly string[];
  rows: readonly (readonly (string | number)[])[];
};

/** The data as a table for assistive technology. It is in the server markup, so it is there before the chart draws. */
export function ChartDataTable({ caption, columns, rows }: ChartTable) {
  return (
    <table data-slot="chart-table" className="sr-only">
      {caption ? <caption>{caption}</caption> : null}
      <thead>
        <tr>
          {columns.map((column, index) => (
            <th key={index} scope="col">
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={rowIndex}>
            {row.map((cell, index) =>
              index === 0 ? (
                <th key={index} scope="row">
                  {cell}
                </th>
              ) : (
                <td key={index}>{cell}</td>
              ),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export type ChartContainerProps = Omit<ComponentProps<"div">, "children"> & {
  /** Width / height of the plot. The box keeps this ratio before the chart draws, so the layout never shifts. */
  aspect?: number;
  /** A fixed height in pixels instead of a ratio. */
  height?: number;
  /** The data as a visually hidden table: the chart's text alternative. */
  table?: ChartTable;
  /** Read out politely when it changes: the values under keyboard focus. */
  announcement?: string;
  /** Draws the chart at the measured size. Not called on the server or before the first measurement. */
  children: (size: Size) => ReactNode;
};

export function ChartContainer({ aspect = 16 / 9, height, table, announcement, className, style, children, ...props }: ChartContainerProps) {
  const size = useSize<HTMLDivElement>();
  return (
    <div
      ref={size.ref}
      data-slot="chart"
      className={cn("relative w-full min-w-0", className)}
      style={{ ...(height === undefined ? { aspectRatio: String(aspect) } : { height }), ...style }}
      {...props}
    >
      {/*
        The drawing sits in a layer that takes no part in layout. If it were in the flow, a drawing one pixel
        taller than the box (rounding) would stretch the box, which would be measured again and drawn taller:
        a loop that grows the page without end.
      */}
      {size.width > 0 && size.height > 0 ? (
        <div data-slot="chart-layer" className="absolute inset-0">
          {children({ width: size.width, height: size.height })}
        </div>
      ) : null}
      {table ? <ChartDataTable {...table} /> : null}
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </div>
  );
}

export type ChartSvgProps = ComponentProps<"svg"> & {
  /** What the chart shows, for assistive technology. */
  label: string;
  width: number;
  height: number;
  /** Focusable and driven by arrow keys. The chart supplies `onKeyDown`. */
  interactive?: boolean;
};

/** The SVG root. It fades in once when it first draws, and not at all under reduced motion. */
export function ChartSvg({ label, width, height, interactive = false, className, children, ...props }: ChartSvgProps) {
  return (
    <svg
      data-slot="chart-svg"
      role={interactive ? "application" : "img"}
      aria-roledescription={interactive ? "chart" : undefined}
      aria-label={label}
      tabIndex={interactive ? 0 : undefined}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("block overflow-visible text-xs animate-in fade-in-0 motion-reduce:animate-none", interactive && "touch-pan-y select-none", className)}
      {...props}
    >
      {children}
    </svg>
  );
}

/* Axes and grid. Recessive: hairlines one step off the surface, muted text. */

export type ChartTick = { offset: number; label: string };

/** Hairlines across the plot at each offset: horizontal by default, vertical with `vertical`. */
export function ChartGrid({ offsets, from, to, vertical = false }: { offsets: readonly number[]; from: number; to: number; vertical?: boolean }) {
  return (
    <g data-slot="chart-grid" aria-hidden="true" className="stroke-border" strokeWidth={1} shapeRendering="crispEdges">
      {offsets.map((offset, index) => (vertical ? <line key={index} x1={offset} x2={offset} y1={from} y2={to} /> : <line key={index} x1={from} x2={to} y1={offset} y2={offset} />))}
    </g>
  );
}

/** Tick labels under the plot (`side="bottom"`, at height `at`) or to its left (`side="left"`, ending at x `at`). */
export function ChartAxis({ side, ticks, at }: { side: "bottom" | "left"; ticks: readonly ChartTick[]; at: number }) {
  return (
    <g data-slot="chart-axis" aria-hidden="true" className="fill-muted-foreground tabular-nums">
      {ticks.map((tick, index) =>
        side === "bottom" ? (
          <text key={index} x={tick.offset} y={at} dy="1em" textAnchor="middle">
            {tick.label}
          </text>
        ) : (
          <text key={index} x={at} y={tick.offset} dy="0.32em" textAnchor="end">
            {tick.label}
          </text>
        ),
      )}
    </g>
  );
}

/* Tooltip and legend. */

export type ChartTooltipRow = { label: string; value: string; index?: number; mark?: "line" | "rect" };

export type ChartTooltipProps = Omit<ComponentProps<"div">, "title"> & {
  /** The point it describes, in pixels from the container's top left. */
  x: number;
  y: number;
  /** Which side of the point it sits on. Flip it past the middle so it stays inside the chart. */
  side?: "left" | "right";
  /** Where it sits against the point vertically. */
  align?: "top" | "center";
  title?: ReactNode;
  rows?: readonly ChartTooltipRow[];
};

/** A small flat box that follows the active point. It repeats what the table says, so it is hidden from assistive technology. */
export function ChartTooltip({ x, y, side = "right", align = "center", title, rows, className, style, children, ...props }: ChartTooltipProps) {
  const shift = `translate(${side === "left" ? "calc(-100% - 12px)" : "12px"}, ${align === "center" ? "-50%" : "0px"})`;
  return (
    <div
      data-slot="chart-tooltip"
      aria-hidden="true"
      className={cn("pointer-events-none absolute left-0 top-0 z-10 w-max max-w-60 rounded-surface border bg-popover px-2.5 py-2 text-xs text-popover-foreground", className)}
      style={{ transform: `translate(${Math.round(x)}px, ${Math.round(y)}px) ${shift}`, ...style }}
      {...props}
    >
      {title ? <div className="mb-1 text-muted-foreground">{title}</div> : null}
      {rows?.map((row, index) => (
        <div key={index} className="flex items-center gap-2">
          {row.index === undefined ? null : <ChartKey index={row.index} mark={row.mark ?? "line"} />}
          <span className="font-medium tabular-nums text-foreground">{row.value}</span>
          <span className="text-muted-foreground">{row.label}</span>
        </div>
      ))}
      {children}
    </div>
  );
}

/** The key of one series: its colour and its shape, on a short stroke for lines. */
export function ChartKey({ index, mark = "line" }: { index: number; mark?: "line" | "rect" }) {
  const style = chartSeries(index);
  return (
    <svg data-slot="chart-key" aria-hidden="true" width={mark === "line" ? 20 : 12} height={12} className="shrink-0 overflow-visible">
      {mark === "line" ? (
        <>
          <line x1={1} x2={19} y1={6} y2={6} className={style.stroke} strokeWidth={2} strokeLinecap="round" strokeDasharray={style.dash} />
          <ChartMark index={index} x={10} y={6} radius={3.5} />
        </>
      ) : (
        <ChartMark index={index} x={6} y={6} radius={5} ring={false} />
      )}
    </svg>
  );
}

export type ChartLegendItem = { label: string; index: number; value?: string };

export type ChartLegendProps = ComponentProps<"ul"> & {
  items: readonly ChartLegendItem[];
  /** "line" for lines; "rect" for bars, areas and slices. */
  mark?: "line" | "rect";
  /** A wrapping row, or one item per line with values at the end. */
  orientation?: "horizontal" | "vertical";
};

/** Names every series beside its colour and its shape. Labels wear text colours, never the series colour. */
export function ChartLegend({ items, mark = "line", orientation = "horizontal", className, ...props }: ChartLegendProps) {
  return (
    <ul data-slot="chart-legend" className={cn("flex text-xs text-muted-foreground", orientation === "horizontal" ? "flex-wrap gap-x-4 gap-y-1" : "flex-col gap-1.5", className)} {...props}>
      {items.map((item, index) => (
        <li key={index} className="flex min-w-0 items-center gap-1.5">
          <ChartKey index={item.index} mark={mark} />
          <span className="truncate">{item.label}</span>
          {item.value === undefined ? null : <span className="ms-auto ps-3 font-medium tabular-nums text-foreground">{item.value}</span>}
        </li>
      ))}
    </ul>
  );
}
