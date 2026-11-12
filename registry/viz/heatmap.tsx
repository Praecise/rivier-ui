"use client";
/**
 * @name heatmap
 * @category viz
 * @description A matrix of cells (day by hour, for example) coloured on one-hue scale from faint to the highlight colour, with a tooltip, arrow-key reading and a scale legend.
 * @when Spotting patterns across two categories at once: when it is busy, which pairs stand out. To compare exact amounts use bar-chart; for one row of values over time use line-chart.
 * @example
 * <Heatmap
 *   label="Sessions by day and hour"
 *   data={[
 *     { day: "Mon", hour: "09", sessions: 12 },
 *     { day: "Mon", hour: "10", sessions: 30 },
 *     { day: "Tue", hour: "09", sessions: 8 },
 *     { day: "Tue", hour: "10", sessions: 21 },
 *   ]}
 *   x="hour"
 *   y="day"
 *   value="sessions"
 * />
 */
import { scaleBand, scaleLinear } from "d3-scale";
import { useMemo, useState, type ComponentProps, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import { ChartAxis, ChartContainer, ChartSvg, ChartTooltip, estimateTextWidth, formatNumber, readNumber, type ChartFormat } from "@/components/viz/chart";

export type HeatmapProps<T extends object> = Omit<ComponentProps<"div">, "children"> &
  Omit<ChartFormat, "timeZone"> & {
    /** One object per cell. Pairs that are missing are drawn as empty cells. */
    data: readonly T[];
    /** The field for the column. */
    x: keyof T & string;
    /** The field for the row. */
    y: keyof T & string;
    /** The field that holds the cell's number. */
    value: keyof T & string;
    /** What the chart shows, for assistive technology. */
    label: string;
    /** The columns, in order. Default: in order of first appearance. */
    xs?: readonly string[];
    /** The rows, in order. Default: in order of first appearance. */
    ys?: readonly string[];
    /** The scale under the chart, with its lowest and highest values. Default true. */
    showLegend?: boolean;
    /** Width / height of the plot. Default: from the number of columns and rows, so cells are near square. */
    aspect?: number;
    /** A fixed plot height in pixels instead of a ratio. */
    height?: number;
  };

/** The space in the surface colour between cells. */
const GAP = 2;
/** Cells take the theme's roundness, halved and capped, so "none" is square and "full" stays a cell. */
const ROUND = "[rx:min(calc(var(--radius)*0.5),4px)] [ry:min(calc(var(--radius)*0.5),4px)]";
const LEGEND_STEPS = [0, 0.25, 0.5, 0.75, 1];

/**
 * One hue, by amount: a straight line through OKLab (the rectangular form of oklch) from the muted surface to
 * the highlight colour, so the hue holds and only lightness and chroma move. In the light theme more is
 * darker, in the dark theme more is lighter: either way, more contrast with the ground means more. The
 * lowest step is not the surface itself, so a low value still reads as a cell.
 */
function heat(amount: number): string {
  return `color-mix(in oklab, var(--highlight) ${Math.round(14 + 86 * Math.max(0, Math.min(1, amount)))}%, var(--muted))`;
}

export function Heatmap<T extends object>({ data, x, y, value, label, xs, ys, showLegend = true, aspect, height, locale, formatValue, className, ...props }: HeatmapProps<T>) {
  const [active, setActive] = useState<{ column: number; row: number } | null>(null);
  const [keyboard, setKeyboard] = useState(false);

  const model = useMemo(() => {
    const read = (row: T, key: string): string => String((row as Record<string, unknown>)[key] ?? "");
    const columns = xs ?? [...new Set(data.map((row) => read(row, x)))];
    const rows = ys ?? [...new Set(data.map((row) => read(row, y)))];
    const cells = new Map<string, number>();
    let low = Infinity;
    let high = -Infinity;
    for (const row of data) {
      const amount = readNumber(row, value);
      if (amount === null) continue;
      cells.set(`${read(row, y)}\u0000${read(row, x)}`, amount);
      low = Math.min(low, amount);
      high = Math.max(high, amount);
    }
    if (low === Infinity) {
      low = 0;
      high = 0;
    }
    return { columns, rows, cells, low, high };
  }, [data, x, y, value, xs, ys]);

  const { columns, rows, cells, low, high } = model;
  const number = formatValue ?? ((amount: number) => formatNumber(amount, locale));
  const cell = (row: number, column: number): number | undefined => cells.get(`${rows[row] ?? ""}\u0000${columns[column] ?? ""}`);
  const level = scaleLinear().domain(low === high ? [low - 1, high] : [low, high]).range([0, 1]).clamp(true);
  const table = {
    caption: label,
    columns: [y, ...columns],
    rows: rows.map((name, row) => [
      name,
      ...columns.map((_, column) => {
        const amount = cell(row, column);
        return amount === undefined ? "" : number(amount);
      }),
    ]),
  };
  const activeValue = active ? cell(active.row, active.column) : undefined;
  const activeTitle = active ? `${rows[active.row] ?? ""} · ${columns[active.column] ?? ""}` : "";
  const activeText = activeValue === undefined ? "No value" : number(activeValue);
  const announcement = keyboard && active ? `${activeTitle}: ${activeText}` : "";

  const move = (columnStep: number, rowStep: number): void => {
    if (columns.length === 0 || rows.length === 0) return;
    setKeyboard(true);
    setActive((current) =>
      current === null
        ? { column: 0, row: 0 }
        : { column: Math.max(0, Math.min(columns.length - 1, current.column + columnStep)), row: Math.max(0, Math.min(rows.length - 1, current.row + rowStep)) },
    );
  };
  const onKeyDown = (event: KeyboardEvent<SVGSVGElement>): void => {
    if (event.key === "ArrowRight") move(1, 0);
    else if (event.key === "ArrowLeft") move(-1, 0);
    else if (event.key === "ArrowDown") move(0, 1);
    else if (event.key === "ArrowUp") move(0, -1);
    else if (event.key === "Home") move(-columns.length, 0);
    else if (event.key === "End") move(columns.length, 0);
    else if (event.key === "Escape") setActive(null);
    else return;
    event.preventDefault();
  };

  const widest = (texts: readonly string[]): number => Math.ceil(Math.max(0, ...texts.map((text) => estimateTextWidth(text))));
  const shape = aspect ?? Math.max(1, Math.min(6, (columns.length + 2) / (rows.length + 1.5)));

  return (
    <div data-slot="heatmap" className={cn("flex w-full min-w-0 flex-col gap-3", className)} {...props}>
      <ChartContainer aspect={shape} height={height} table={table} announcement={announcement}>
        {(size) => {
          if (columns.length === 0 || rows.length === 0) {
            return <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">No data</p>;
          }
          const left = Math.min(Math.round(size.width * 0.3), widest(rows) + 10);
          const bottom = 24;
          const bandX = scaleBand<number>().domain(columns.map((_, index) => index)).range([left, size.width]);
          const bandY = scaleBand<number>().domain(rows.map((_, index) => index)).range([0, size.height - bottom]);
          const cellWidth = Math.max(1, bandX.bandwidth() - GAP);
          const cellHeight = Math.max(1, bandY.bandwidth() - GAP);
          // Column names that would run into each other are thinned out; every name stays in the table.
          const every = Math.max(1, Math.ceil((widest(columns) + 8) / bandX.step()));
          const fits = Math.max(3, Math.floor((left - 10) / (12 * 0.58)));
          const activeX = active ? (bandX(active.column) ?? 0) + bandX.bandwidth() / 2 : 0;
          const activeY = active ? (bandY(active.row) ?? 0) + bandY.bandwidth() / 2 : 0;
          return (
            <>
              <ChartSvg
                label={label}
                width={size.width}
                height={size.height}
                interactive
                onKeyDown={onKeyDown}
                onPointerLeave={() => setActive(null)}
                onFocus={(event) => {
                  if (event.currentTarget.matches(":focus-visible")) move(0, 0);
                }}
                onBlur={() => setActive(null)}
              >
                <ChartAxis side="left" at={left - 8} ticks={rows.map((name, index) => ({ offset: (bandY(index) ?? 0) + bandY.bandwidth() / 2, label: name.length > fits ? `${name.slice(0, fits - 1)}…` : name }))} />
                <ChartAxis
                  side="bottom"
                  at={size.height - bottom + 6}
                  ticks={columns.flatMap((name, index) => (index % every === 0 ? [{ offset: (bandX(index) ?? 0) + bandX.bandwidth() / 2, label: name }] : []))}
                />
                <g aria-hidden="true">
                  {rows.map((_, row) =>
                    columns.map((__, column) => {
                      const amount = cell(row, column);
                      const box = { x: (bandX(column) ?? 0) + GAP / 2, y: (bandY(row) ?? 0) + GAP / 2, width: cellWidth, height: cellHeight };
                      return (
                        <g
                          key={`${row}:${column}`}
                          onPointerEnter={() => {
                            setKeyboard(false);
                            setActive({ column, row });
                          }}
                        >
                          {/* The hit area is the whole band, gap included. */}
                          <rect x={bandX(column) ?? 0} y={bandY(row) ?? 0} width={bandX.bandwidth()} height={bandY.bandwidth()} fill="transparent" />
                          {amount === undefined ? <rect {...box} fill="none" className={cn("stroke-border", ROUND)} strokeWidth={1} /> : <rect {...box} className={ROUND} style={{ fill: heat(level(amount)) }} />}
                        </g>
                      );
                    }),
                  )}
                  {active ? (
                    <rect
                      x={(bandX(active.column) ?? 0) + GAP / 2}
                      y={(bandY(active.row) ?? 0) + GAP / 2}
                      width={cellWidth}
                      height={cellHeight}
                      fill="none"
                      className={cn("pointer-events-none stroke-foreground", ROUND)}
                      strokeWidth={2}
                    />
                  ) : null}
                </g>
              </ChartSvg>
              {active ? <ChartTooltip x={activeX} y={activeY} side={activeX > size.width / 2 ? "left" : "right"} title={activeTitle} rows={[{ label: value, value: activeText }]} /> : null}
            </>
          );
        }}
      </ChartContainer>
      {showLegend && columns.length > 0 ? (
        <div data-slot="heatmap-legend" aria-hidden="true" className="flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
          <span>{number(low)}</span>
          <span className="flex gap-0.5">
            {LEGEND_STEPS.map((step) => (
              <span key={step} className="size-3 rounded-[min(calc(var(--radius)*0.5),4px)]" style={{ backgroundColor: heat(step) }} />
            ))}
          </span>
          <span>{number(high)}</span>
        </div>
      ) : null}
    </div>
  );
}
