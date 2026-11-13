"use client";
/**
 * @name sunburst
 * @category viz
 * @description A hierarchy as rings around a centre: each ring a level, each arc a part sized by its share of its parent, with zooming into any arc by click or Enter and back out by the centre, the trail or Backspace.
 * @when Showing how a total divides level by level when the depth matters as much as the sizes: a path through categories, a file system, a budget in three levels. For sizes that must be compared closely use treemap (areas in rectangles are easier to judge than arcs); for one level use donut-chart.
 * @example
 * <Sunburst
 *   label="Visits by source"
 *   data={{
 *     name: "All visits",
 *     children: [
 *       { name: "Search", children: [{ name: "Organic", value: 420 }, { name: "Paid", value: 160 }] },
 *       { name: "Social", children: [{ name: "Video", value: 120 }, { name: "Posts", value: 80 }] },
 *       { name: "Direct", value: 300 },
 *     ],
 *   }}
 * />
 */
import { hierarchy, partition, type HierarchyRectangularNode } from "d3-hierarchy";
import { arc } from "d3-shape";
import { useMemo, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import { useControllableState } from "@/lib/use-controllable-state";
import {
  ChartContainer,
  ChartEmpty,
  ChartLegend,
  chartSeries,
  ChartSvg,
  ChartTooltip,
  ChartTrail,
  chartTreeFind,
  chartTreeRows,
  chartTreeTotal,
  fitText,
  formatNumber,
  useChartCursor,
  type ChartBaseProps,
  type ChartTreeNode,
} from "@/components/viz/chart";

export type SunburstLabels = { trail: string; part: string; value: string; share: string; canOpen: string; up: string };

export type SunburstProps = Omit<ChartBaseProps, "defaultValue"> & {
  /** The tree. Leaves carry a `value`; a branch is the sum of its children. */
  data: ChartTreeNode;
  /** How many rings are drawn below the part in view. Default 3. */
  depth?: number;
  /** The names from the root to the part in view. Controlled with `onPathChange`. */
  path?: readonly string[];
  defaultPath?: readonly string[];
  onPathChange?: (path: readonly string[]) => void;
  /** The legend of the top-level groups. Default true. */
  showLegend?: boolean;
  labels?: Partial<SunburstLabels>;
};

const LABELS: SunburstLabels = { trail: "Level", part: "Part", value: "Value", share: "Share", canOpen: "press Enter to open", up: "Back one level" };
const EMPTY: readonly string[] = [];
/** Deeper rings step back so the levels read apart: the colour stays the group's. */
const RING_OPACITY = [1, 0.72, 0.5, 0.36];

type Node = HierarchyRectangularNode<ChartTreeNode>;

export function Sunburst({
  data,
  depth: rings = 3,
  path: pathProp,
  defaultPath = EMPTY,
  onPathChange,
  showLegend = true,
  labels: given,
  label,
  aspect = 1,
  height,
  emptyLabel,
  locale,
  formatValue,
  className,
  ...props
}: SunburstProps) {
  const labels = { ...LABELS, ...given };
  const [path, setPath] = useControllableState<readonly string[]>({ value: pathProp, defaultValue: defaultPath, onChange: onPathChange });
  const focus = useMemo(() => chartTreeFind(data, path), [data, path]);
  const total = chartTreeTotal(focus.node);
  const whole = chartTreeTotal(data) || 1;
  const number = formatValue ?? ((value: number) => formatNumber(value, locale));
  const percent = (share: number): string => formatNumber(share, locale, { style: "percent", maximumFractionDigits: 1 });
  const topIndex = (name: string): number => data.children?.findIndex((child) => child.name === name) ?? 0;

  const nodes = useMemo(() => {
    const root = hierarchy<ChartTreeNode>(focus.node, (node) => node.children as ChartTreeNode[] | undefined)
      .sum((node) => (node.children && node.children.length > 0 ? 0 : Math.max(0, node.value ?? 0)))
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
    const laid = partition<ChartTreeNode>().size([2 * Math.PI, rings + 1])(root);
    return laid.descendants().filter((node) => node.depth > 0 && node.depth <= rings && node.x1 - node.x0 > 0.001);
  }, [focus.node, rings]);
  const cursor = useChartCursor(nodes.length);
  const colourOf = (node: Node): number => {
    const top = focus.path[0] ?? node.ancestors().find((a) => a.depth === 1)?.data.name ?? node.data.name;
    const index = topIndex(top);
    return index >= 0 && index < 5 ? index : -1;
  };
  const trailOf = (node: Node): string[] =>
    node
      .ancestors()
      .reverse()
      .slice(1)
      .map((a) => a.data.name);
  const openable = (node: Node): boolean => Boolean(node.children && node.children.length > 0);
  const open = (node: Node): void => {
    if (!openable(node)) return;
    setPath([...focus.path, ...trailOf(node)]);
    cursor.select(null);
  };
  const up = (): void => {
    if (focus.path.length === 0) return;
    setPath(focus.path.slice(0, -1));
    cursor.select(null);
  };
  const current = cursor.active === null ? undefined : nodes[cursor.active];
  const describe = (node: Node): string => `${trailOf(node).join(" / ")}: ${number(node.value ?? 0)}, ${percent((node.value ?? 0) / whole)}${openable(node) ? `, ${labels.canOpen}` : ""}`;
  const onKeyDown = (event: KeyboardEvent<SVGSVGElement>): void => {
    if ((event.key === "Enter" || event.key === " ") && current) {
      event.preventDefault();
      open(current);
    } else if (event.key === "Backspace" && focus.path.length > 0) {
      event.preventDefault();
      up();
    } else cursor.svgProps.onKeyDown(event);
  };
  const table = { caption: label, columns: [labels.part, labels.value, labels.share], rows: chartTreeRows(data, number, percent) };

  return (
    <div data-slot="sunburst" className={cn("flex w-full min-w-0 flex-col gap-2", className)} {...props}>
      <ChartTrail aria-label={labels.trail} trail={[data.name, ...focus.path]} onNavigate={(depth) => setPath(focus.path.slice(0, depth))} />
      <ChartContainer aspect={aspect} height={height} table={table} announcement={cursor.keyboard && current ? describe(current) : ""}>
        {({ width, height: plotHeight }) => {
          if (total <= 0) return <ChartEmpty>{emptyLabel}</ChartEmpty>;
          const radius = Math.min(width, plotHeight) / 2 - 2;
          const ring = radius / (rings + 1);
          const shape = arc<Node>()
            .startAngle((node) => node.x0)
            .endAngle((node) => node.x1)
            .innerRadius((node) => node.y0 * ring)
            .outerRadius((node) => node.y1 * ring - 1)
            .padAngle(0.006)
            .padRadius(radius / 2)
            .cornerRadius(2);
          const cx = width / 2;
          const cy = plotHeight / 2;
          const at = (node: Node): [number, number] => {
            const angle = (node.x0 + node.x1) / 2 - Math.PI / 2;
            const r = ((node.y0 + node.y1) / 2) * ring;
            return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r];
          };
          const shownAt = current ? at(current) : undefined;
          return (
            <>
              <ChartSvg label={label} width={width} height={plotHeight} interactive {...cursor.svgProps} onKeyDown={onKeyDown}>
                <g transform={`translate(${cx},${cy})`} aria-hidden="true">
                  {nodes.map((node, index) => (
                    <path
                      key={index}
                      d={shape(node) ?? ""}
                      className={cn(chartSeries(colourOf(node)).fill, openable(node) && "cursor-pointer", "transition-opacity duration-instant motion-reduce:transition-none")}
                      fillOpacity={(RING_OPACITY[node.depth - 1] ?? 0.3) * (cursor.active !== null && cursor.active !== index ? 0.5 : 1)}
                      onPointerEnter={() => cursor.point(index)}
                      onClick={() => open(node)}
                    />
                  ))}
                  {current ? <path d={shape(current) ?? ""} fill="none" className="pointer-events-none stroke-foreground" strokeWidth={2} /> : null}
                  <circle r={Math.max(0, ring - 2)} className={cn("fill-background", focus.path.length > 0 && "cursor-pointer")} onClick={up} />
                  <text textAnchor="middle" dy="-0.2em" className="pointer-events-none fill-foreground text-sm font-medium">
                    {fitText(focus.node.name, ring * 1.7, 14)}
                  </text>
                  <text textAnchor="middle" dy="1.2em" className="pointer-events-none fill-muted-foreground text-xs tabular-nums">
                    {number(total)}
                  </text>
                </g>
              </ChartSvg>
              {focus.path.length > 0 ? (
                <button type="button" onClick={up} className="absolute start-0 top-0 min-h-10 rounded-control border bg-background px-3 text-sm hover:bg-accent">
                  {labels.up}
                </button>
              ) : null}
              {current && shownAt ? (
                <ChartTooltip
                  x={shownAt[0]}
                  y={shownAt[1]}
                  side={shownAt[0] > width / 2 ? "left" : "right"}
                  title={trailOf(current).slice(0, -1).join(" / ") || undefined}
                  rows={[{ label: current.data.name, value: `${number(current.value ?? 0)} · ${percent((current.value ?? 0) / whole)}`, index: colourOf(current), mark: "rect" }]}
                />
              ) : null}
            </>
          );
        }}
      </ChartContainer>
      {showLegend && focus.path.length === 0 && (data.children?.length ?? 0) > 1 ? (
        <ChartLegend items={(data.children ?? []).map((child, index) => ({ label: child.name, index: index < 5 ? index : -1, value: percent(chartTreeTotal(child) / whole) }))} mark="rect" />
      ) : null}
    </div>
  );
}
