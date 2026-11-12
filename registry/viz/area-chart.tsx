/**
 * @name area-chart
 * @category viz
 * @description A line chart with the space under each line filled flat at low opacity, optionally stacked so the series add up to a total.
 * @when One series over time whose volume matters, or a few series that add up to a whole (`stacked`). To compare series that cross each other use line-chart: overlapping fills hide one another.
 * @example
 * <AreaChart
 *   label="Storage used per month, by kind"
 *   data={[
 *     { month: new Date("2026-01-01"), images: 12, video: 30 },
 *     { month: new Date("2026-02-01"), images: 18, video: 42 },
 *     { month: new Date("2026-03-01"), images: 22, video: 61 },
 *   ]}
 *   x="month"
 *   series={[
 *     { key: "images", label: "Images" },
 *     { key: "video", label: "Video" },
 *   ]}
 *   stacked
 * />
 */
import { SeriesChart, type LineChartProps } from "@/components/viz/line-chart";

export type AreaChartProps<T extends object> = Omit<LineChartProps<T>, "zero"> & {
  /** Stack the series so the top edge is their total. Missing values count as zero. */
  stacked?: boolean;
};

/** Same contract as LineChart. The y axis always starts at zero, because a fill is read by its height. */
export function AreaChart<T extends object>({ stacked = false, ...props }: AreaChartProps<T>) {
  return <SeriesChart {...props} area stacked={stacked} slot="area-chart" />;
}
