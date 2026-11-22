"use client";
/**
 * @name chart-brush
 * @category viz
 * @description A small overview of a whole series with a window over it whose two handles are dragged or moved by arrow keys to choose the stretch another chart shows: the range is two row indexes, so it fits any chart.
 * @when Letting people zoom a long time series to a part of it: a year of daily values shown a month at a time. Give the chart above only the rows between the two indexes. For a fixed set of periods use segmented-control or tabs; for choosing dates use date-picker.
 * @example
 * const [range, setRange] = useState<[number, number]>([0, 29]);
 * <LineChart label="Visits" data={days.slice(range[0], range[1] + 1)} x="day" series={[{ key: "visits", label: "Visits" }]} />
 * <ChartBrush data={days} x="day" y="visits" value={range} onValueChange={setRange} labels={{ start: "From", end: "To" }} />
 */
import { scaleLinear } from "d3-scale";
import { area } from "d3-shape";
import { Slider } from "radix-ui";
import { useMemo, type ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { useControllableState } from "@/lib/use-controllable-state";
import { dateFormatter, formatNumber, readNumber } from "@/components/viz/chart";
import { useSize } from "@/lib/use-size";

export type ChartBrushLabels = { start: string; end: string; group: string };

export type ChartBrushProps<T extends object> = Omit<ComponentProps<"div">, "defaultValue" | "onChange"> & {
  /** Every row, in order along x. */
  data: readonly T[];
  /** The field holding x, for the words of the handles: a Date, a number or a text. */
  x: keyof T & string;
  /** The field drawn in the overview. */
  y: keyof T & string;
  /** The first and last row index in the window. Controlled with `onValueChange`. */
  value?: [number, number];
  defaultValue?: [number, number];
  onValueChange?: (value: [number, number]) => void;
  /** The fewest rows the window can hold. Default 2. */
  minRows?: number;
  /** The overview's height in pixels. Default 48. */
  height?: number;
  labels?: Partial<ChartBrushLabels>;
  locale?: string;
  timeZone?: string;
  /** Replaces the format of x in what the handles say. */
  formatX?: (value: unknown) => string;
};

const LABELS: ChartBrushLabels = { start: "Start", end: "End", group: "Range shown" };

export function ChartBrush<T extends object>({
  data,
  x,
  y,
  value,
  defaultValue,
  onValueChange,
  minRows = 2,
  height = 48,
  labels: given,
  locale = "en-US",
  timeZone = "UTC",
  formatX,
  className,
  ...props
}: ChartBrushProps<T>) {
  const labels = { ...LABELS, ...given };
  const last = Math.max(0, data.length - 1);
  const [range, setRange] = useControllableState<[number, number]>({ value, defaultValue: defaultValue ?? [0, last], onChange: onValueChange });
  const { ref, width } = useSize<HTMLDivElement>();
  const xText = useMemo(() => {
    const values = data.map((row) => (row as Record<string, unknown>)[x]);
    const dates = values.filter((v): v is Date => v instanceof Date);
    const span = dates.length > 1 ? Math.abs((dates[dates.length - 1]?.getTime() ?? 0) - (dates[0]?.getTime() ?? 0)) : 0;
    const date = dateFormatter(Math.min(span, 300 * 86400000), "full", locale, timeZone);
    return values.map((v) => (formatX ? formatX(v) : v instanceof Date ? date(v) : typeof v === "number" ? formatNumber(v, locale) : String(v ?? "")));
  }, [data, x, formatX, locale, timeZone]);
  const path = useMemo(() => {
    if (width <= 0 || data.length < 2) return "";
    const ys = data.map((row) => readNumber(row, y) ?? 0);
    const sy = scaleLinear()
      .domain([Math.min(0, ...ys), Math.max(...ys) || 1])
      .range([height - 2, 2]);
    const sx = scaleLinear().domain([0, last]).range([0, width]);
    return (
      area<number>()
        .x((_, i) => sx(i))
        .y0(sy(0))
        .y1((v) => sy(v))(ys) ?? ""
    );
  }, [data, y, width, height, last]);
  const start = Math.max(0, Math.min(last, range[0]));
  const end = Math.max(start, Math.min(last, range[1]));

  return (
    <div data-slot="chart-brush" className={cn("flex w-full min-w-0 flex-col gap-1", className)} {...props}>
      <div ref={ref} className="relative w-full" style={{ height }}>
        <svg aria-hidden="true" width={width} height={height} className="absolute inset-0 block">
          <path d={path} className="fill-chart-1" fillOpacity={0.25} />
        </svg>
        <Slider.Root
          value={[start, end]}
          min={0}
          max={last}
          step={1}
          minStepsBetweenThumbs={Math.max(0, minRows - 1)}
          onValueChange={(next) => setRange([next[0] ?? 0, next[1] ?? last])}
          aria-label={labels.group}
          dir="ltr"
          className="absolute inset-0 flex touch-none select-none items-center"
        >
          <Slider.Track className="relative h-full grow rounded-[min(var(--radius),4px)] border border-border">
            <Slider.Range className="absolute h-full border-x-2 border-foreground bg-highlight-soft opacity-60" />
          </Slider.Track>
          {[start, end].map((index, thumb) => (
            <Slider.Thumb
              key={thumb}
              aria-label={thumb === 0 ? labels.start : labels.end}
              aria-valuetext={xText[index] ?? ""}
              className="block h-[calc(100%+8px)] w-3 rounded-control border-2 border-foreground bg-background transition-transform duration-instant motion-reduce:transition-none focus-visible:scale-110 pointer-coarse:w-6"
            />
          ))}
        </Slider.Root>
      </div>
      <div aria-hidden="true" className="flex justify-between gap-2 text-xs tabular-nums text-muted-foreground">
        <span className="truncate">{xText[start]}</span>
        <span className="truncate">{xText[end]}</span>
      </div>
    </div>
  );
}
