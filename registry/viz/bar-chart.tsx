"use client";
/**
 * @name bar-chart
 * @category viz
 * @description A bar chart, vertical or horizontal, grouped or stacked, always measured from zero, with a tooltip on hover and arrow-key reading.
 * @when Comparing amounts across categories. Use `orientation="horizontal"` for long names or a ranking, `stacked` when the series add up to a total, `normalize` to compare each category's split as shares of 100 %. For change over many points in time use line-chart; for a single number use a stat, not one bar.
 * @example
 * <BarChart
 *   label="Orders by channel per quarter"
 *   data={[
 *     { quarter: "Q1", web: 320, app: 210 },
 *     { quarter: "Q2", web: 410, app: 290 },
 *     { quarter: "Q3", web: 380, app: 350 },
 *   ]}
 *   x="quarter"
 *   series={[
 *     { key: "web", label: "Web" },
 *     { key: "app", label: "App" },
 *   ]}
 *   showValues
 * />
 */
import { scaleBand, scaleLinear } from "d3-scale";
import { useMemo, useState, type ComponentProps, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import {
  axisNumberFormatter,
  ChartAxis,
  ChartContainer,
  ChartGrid,
  ChartLegend,
  chartSeries,
  ChartSvg,
  ChartTooltip,
  estimateTextWidth,
  formatNumber,
  readNumber,
  type ChartFormat,
  type ChartSeries,
} from "@/components/viz/chart";

export type BarChartProps<T extends object> = Omit<ComponentProps<"div">, "children"> &
  Omit<ChartFormat, "timeZone"> & {
    /** One object per category. */
    data: readonly T[];
    /** The field that names the category. */
    x: keyof T & string;
    /** The bars per category, in a fixed order: the first takes the highlight colour. */
    series: readonly ChartSeries<T>[];
    /** What the chart shows, for assistive technology. */
    label: string;
    /** Bars standing up ("vertical") or lying along the row ("horizontal"). */
    orientation?: "vertical" | "horizontal";
    /** Stack the series in one bar per category instead of side by side. */
    stacked?: boolean;
    /** Stack each category to 100 %: every bar the same length, split by each series' share. Implies `stacked`; the tooltip and the table keep the amounts and add the share. */
    normalize?: boolean;
    /** Print each bar's value at its end (the total, when stacked), where it fits. */
    showValues?: boolean;
    showGrid?: boolean;
    /** Default: shown for two or more series. */
    showLegend?: boolean;
    /** The name of the category column in the table alternative. Default: the `x` field name. */
    xLabel?: string;
    /** Width / height of the plot. */
    aspect?: number;
    /** A fixed plot height in pixels instead of a ratio. */
    height?: number;
  };

type Bar = { category: number; series: number; value: number; from: number; to: number; outer: boolean; share?: number };

/** Bars are thin; what the band has left over is air. */
const MAX_THICKNESS = 24;
/** The space in the surface colour between touching bars and between stacked segments. */
const GAP = 2;
/** Rounded bar ends follow the theme's roundness up to 4px, and are square when it is "none". */
const ROUND = "[rx:min(var(--radius),4px)] [ry:min(var(--radius),4px)]";

export function BarChart<T extends object>({
  data,
  x,
  series,
  label,
  orientation = "vertical",
  stacked: stackedProp = false,
  normalize = false,
  showValues = false,
  showGrid = true,
  showLegend,
  xLabel,
  aspect,
  height,
  locale,
  formatValue,
  className,
  ...props
}: BarChartProps<T>) {
  const [active, setActive] = useState<number | null>(null);
  const [keyboard, setKeyboard] = useState(false);
  const vertical = orientation === "vertical";
  const stacked = stackedProp || normalize;

  const model = useMemo(() => {
    const categories = data.map((row) => String((row as Record<string, unknown>)[x] ?? ""));
    const bars: Bar[] = [];
    const totals: { high: number; low: number }[] = [];
    data.forEach((row, category) => {
      let high = 0;
      let low = 0;
      const start = bars.length;
      // A 100 % stack measures each part against the sum of the parts' sizes.
      const whole = normalize ? series.reduce((sum, item) => sum + Math.abs(readNumber(row, item.key) ?? 0), 0) : 1;
      series.forEach((item, index) => {
        const amount = readNumber(row, item.key);
        if (amount === null) return;
        const value = normalize ? (whole > 0 ? amount / whole : 0) : amount;
        if (normalize) {
          bars.push({ category, series: index, value: amount, share: value, from: value >= 0 ? high : low, to: value >= 0 ? high + value : low + value, outer: false });
          if (value >= 0) high += value;
          else low += value;
          return;
        }
        if (!stacked) {
          bars.push({ category, series: index, value, from: 0, to: value, outer: true });
          high = Math.max(high, value);
          low = Math.min(low, value);
        } else if (value >= 0) {
          bars.push({ category, series: index, value, from: high, to: high + value, outer: false });
          high += value;
        } else {
          bars.push({ category, series: index, value, from: low, to: low + value, outer: false });
          low += value;
        }
      });
      if (stacked) {
        // Only the segment at the far end of a stack gets the rounded end.
        const mine = bars.slice(start);
        const top = mine.findLast((bar) => bar.value > 0);
        const bottom = mine.findLast((bar) => bar.value < 0);
        if (top) top.outer = true;
        if (bottom) bottom.outer = true;
      }
      totals.push({ high, low });
    });
    // The baseline is zero, always: a bar is read by its length.
    const high = Math.max(0, ...totals.map((total) => total.high));
    const low = Math.min(0, ...totals.map((total) => total.low));
    return { categories, bars, totals, high, low };
  }, [data, x, series, stacked, normalize]);

  const { categories, bars, totals } = model;
  const value = formatValue ?? ((number: number) => formatNumber(number, locale));
  const percent = (share: number): string => formatNumber(share, locale, { style: "percent", maximumFractionDigits: 1 });
  const withShare = (bar: Bar): string => (bar.share === undefined ? value(bar.value) : `${value(bar.value)} (${percent(bar.share)})`);
  const table = {
    caption: label,
    columns: [xLabel ?? x, ...series.map((item) => item.label)],
    rows: data.map((row, index) => [
      categories[index] ?? "",
      ...series.map((item) => {
        const number = readNumber(row, item.key);
        if (number === null) return "";
        const bar = normalize ? bars.find((candidate) => candidate.category === index && series[candidate.series] === item) : undefined;
        return bar ? withShare(bar) : value(number);
      }),
    ]),
  };

  const current = active === null ? undefined : bars[active];
  const currentLabel = current ? (series[current.series]?.label ?? "") : "";
  const announcement = keyboard && current ? `${categories[current.category] ?? ""}, ${currentLabel}: ${withShare(current)}` : "";

  const move = (step: number | "first" | "last"): void => {
    if (bars.length === 0) return;
    setKeyboard(true);
    setActive((index) => {
      if (step === "first") return 0;
      if (step === "last") return bars.length - 1;
      if (index === null) return step > 0 ? 0 : bars.length - 1;
      return Math.max(0, Math.min(bars.length - 1, index + step));
    });
  };
  const onKeyDown = (event: KeyboardEvent<SVGSVGElement>): void => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") move(1);
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") move(-1);
    else if (event.key === "Home") move("first");
    else if (event.key === "End") move("last");
    else if (event.key === "Escape") setActive(null);
    else return;
    event.preventDefault();
  };

  const legend = showLegend ?? series.length > 1;

  return (
    <div data-slot="bar-chart" className={cn("flex w-full min-w-0 flex-col gap-3", className)} {...props}>
      {legend ? <ChartLegend items={series.map((item, index) => ({ label: item.label, index }))} mark="rect" /> : null}
      <ChartContainer aspect={aspect} height={height} table={table} announcement={announcement}>
        {(size) => {
          if (bars.length === 0) {
            return <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">No data</p>;
          }
          const ticksWanted = Math.max(2, Math.floor((vertical ? size.height : size.width) / (vertical ? 56 : 90)));
          const scale = scaleLinear()
            .domain(model.low === model.high ? [0, 1] : [model.low, model.high])
            .nice(ticksWanted);
          const ticks = scale.ticks(ticksWanted);
          const axisValue = normalize ? percent : formatValue ?? axisNumberFormatter(Math.max(Math.abs(scale.domain()[0] ?? 0), Math.abs(scale.domain()[1] ?? 0)), locale);
          const widest = (texts: readonly string[]): number => Math.ceil(Math.max(0, ...texts.map((text) => estimateTextWidth(text))));
          const valueRoom = showValues ? widest(bars.map((bar) => value(bar.value))) + 8 : 0;
          const hasNegative = model.low < 0;

          const left = vertical ? widest(ticks.map(axisValue)) + 10 : Math.min(Math.round(size.width * 0.35), widest(categories) + 10) + (showValues && hasNegative ? valueRoom : 0);
          const right = vertical ? 4 : Math.max(12, valueRoom);
          const top = vertical ? (showValues ? 22 : 10) : 4;
          const bottom = 26;
          const nameRoom = vertical ? 0 : Math.min(Math.round(size.width * 0.35), widest(categories) + 10) - 10;
          scale.range(vertical ? [size.height - bottom, top] : [left, size.width - right]);

          const band = scaleBand<number>()
            .domain(categories.map((_, index) => index))
            .range(vertical ? [left, size.width - right] : [top, size.height - bottom])
            .paddingInner(0.3)
            .paddingOuter(0.15);
          const slots = stacked ? 1 : series.length;
          const thickness = Math.max(1, Math.min(MAX_THICKNESS, (band.bandwidth() - GAP * (slots - 1)) / slots));
          const groupStart = (category: number): number => (band(category) ?? 0) + (band.bandwidth() - (slots * thickness + (slots - 1) * GAP)) / 2;
          const zero = scale(0);

          const shapes = bars.map((bar) => {
            const across = groupStart(bar.category) + (stacked ? 0 : bar.series * (thickness + GAP));
            let a = scale(bar.from);
            const b = scale(bar.to);
            // Stacked segments keep a gap in the surface colour between them, taken from the end nearer the baseline.
            if (bar.from !== 0 && Math.abs(b - a) > GAP + 1) a += Math.sign(b - a) * GAP;
            return { bar, across, a, b, tip: b, middle: across + thickness / 2 };
          });
          const rect = (across: number, a: number, b: number): { x: number; y: number; width: number; height: number } =>
            vertical ? { x: across, y: Math.min(a, b), width: thickness, height: Math.abs(b - a) } : { x: Math.min(a, b), y: across, width: Math.abs(b - a), height: thickness };
          const plotFrom = vertical ? top : left;
          const plotTo = vertical ? size.height - bottom : size.width - right;

          const names = categories.map((name) => {
            if (vertical) return name;
            const fits = Math.max(3, Math.floor(nameRoom / (12 * 0.58)));
            return name.length > fits ? `${name.slice(0, fits - 1)}…` : name;
          });
          // Category names that would run into each other are thinned out; every name stays in the table.
          const every = vertical ? Math.max(1, Math.ceil((widest(categories) + 8) / band.step())) : 1;

          const labels = !showValues || normalize
            ? []
            : stacked
              ? totals.flatMap((total, category) => {
                  const middle = groupStart(category) + thickness / 2;
                  const out: { key: string; text: string; at: number; middle: number; positive: boolean }[] = [];
                  if (total.high > 0 || total.low === 0) out.push({ key: `${category}:high`, text: value(total.high), at: scale(total.high), middle, positive: true });
                  if (total.low < 0) out.push({ key: `${category}:low`, text: value(total.low), at: scale(total.low), middle, positive: false });
                  return out;
                })
              : shapes.map((shape) => ({ key: `${shape.bar.category}:${shape.bar.series}`, text: value(shape.bar.value), at: shape.tip, middle: shape.middle, positive: shape.bar.value >= 0 }));
          // A value that does not fit over its bar is not printed: the tooltip and the table carry it.
          const labelFits = (text: string): boolean => !vertical || estimateTextWidth(text) <= (stacked ? band.bandwidth() : thickness + GAP) + 6;

          const shape = active === null ? undefined : shapes[active];
          const tooltipX = shape ? (vertical ? shape.middle : shape.tip) : 0;
          const tooltipY = shape ? (vertical ? Math.min(shape.tip, zero) : shape.middle) : 0;

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
                  if (event.currentTarget.matches(":focus-visible")) move("first");
                }}
                onBlur={() => setActive(null)}
              >
                {showGrid ? <ChartGrid offsets={ticks.map((tick) => scale(tick))} from={vertical ? left : top} to={vertical ? size.width - right : size.height - bottom} vertical={!vertical} /> : null}
                {vertical ? (
                  <>
                    <ChartAxis side="left" at={left - 8} ticks={ticks.map((tick) => ({ offset: scale(tick), label: axisValue(tick) }))} />
                    <ChartAxis side="bottom" at={size.height - bottom + 8} ticks={names.flatMap((name, index) => (index % every === 0 ? [{ offset: (band(index) ?? 0) + band.bandwidth() / 2, label: name }] : []))} />
                  </>
                ) : (
                  <>
                    <ChartAxis side="bottom" at={size.height - bottom + 8} ticks={ticks.map((tick) => ({ offset: scale(tick), label: axisValue(tick) }))} />
                    <ChartAxis side="left" at={left - 8 - (showValues && hasNegative ? valueRoom : 0)} ticks={names.map((name, index) => ({ offset: (band(index) ?? 0) + band.bandwidth() / 2, label: name }))} />
                  </>
                )}
                <g aria-hidden="true">
                  {shapes.map((item, index) => {
                    const full = rect(item.across, item.a, item.b);
                    if (full.width <= 0 || full.height <= 0) return null;
                    const fill = chartSeries(item.bar.series).fill;
                    return (
                      <g key={index} className={cn("transition-opacity duration-instant motion-reduce:transition-none", active !== null && active !== index && "opacity-45")}>
                        {item.bar.outer ? (
                          <>
                            {/* Rounded at the data end, square at the baseline: a rounded bar, with its baseline half squared off. */}
                            <rect {...full} className={cn(fill, ROUND)} />
                            <rect {...rect(item.across, item.a, (item.a + item.b) / 2)} className={fill} />
                          </>
                        ) : (
                          <rect {...full} className={fill} />
                        )}
                      </g>
                    );
                  })}
                  <line
                    x1={vertical ? left : zero}
                    x2={vertical ? size.width - right : zero}
                    y1={vertical ? zero : top}
                    y2={vertical ? zero : size.height - bottom}
                    className="stroke-border-strong"
                    strokeWidth={1}
                    shapeRendering="crispEdges"
                  />
                  {labels.map((item) =>
                    labelFits(item.text) ? (
                      vertical ? (
                        <text key={item.key} x={item.middle} y={item.at + (item.positive ? -6 : 6)} dy={item.positive ? 0 : "0.7em"} textAnchor="middle" className="fill-foreground tabular-nums">
                          {item.text}
                        </text>
                      ) : (
                        <text key={item.key} x={item.at + (item.positive ? 6 : -6)} y={item.middle} dy="0.32em" textAnchor={item.positive ? "start" : "end"} className="fill-foreground tabular-nums">
                          {item.text}
                        </text>
                      )
                    ) : null,
                  )}
                  {/* Hit areas are larger than the bars: the whole column of a grouped bar, the whole band of a stacked segment. */}
                  {shapes.map((item, index) => {
                    const along = stacked ? { a: item.a, b: item.b } : { a: plotFrom, b: plotTo };
                    const start = stacked ? (band(item.bar.category) ?? 0) : item.across - GAP / 2;
                    const breadth = stacked ? band.bandwidth() : thickness + GAP;
                    const area = vertical
                      ? { x: start, y: Math.min(along.a, along.b), width: breadth, height: Math.abs(along.b - along.a) }
                      : { x: Math.min(along.a, along.b), y: start, width: Math.abs(along.b - along.a), height: breadth };
                    return (
                      <rect
                        key={index}
                        {...area}
                        fill="transparent"
                        onPointerEnter={() => {
                          setKeyboard(false);
                          setActive(index);
                        }}
                      />
                    );
                  })}
                </g>
              </ChartSvg>
              {shape && current ? (
                <ChartTooltip
                  x={tooltipX}
                  y={tooltipY}
                  side={tooltipX > size.width / 2 ? "left" : "right"}
                  title={categories[current.category]}
                  rows={[{ label: currentLabel, value: withShare(current), index: current.series, mark: "rect" }]}
                />
              ) : null}
            </>
          );
        }}
      </ChartContainer>
    </div>
  );
}
