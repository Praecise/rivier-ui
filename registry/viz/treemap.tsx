"use client";
/**
 * @name treemap
 * @category viz
 * @description A whole split into nested rectangles whose areas are the parts' sizes: groups in their own colours, the parts inside them labelled where they fit, with zooming into a group by click or Enter and back out by the trail or Backspace.
 * @when Showing how a large total divides across a hierarchy (a budget by department and team, storage by folder) when there are too many parts for a donut. For a few parts use donut-chart; to see the levels as rings use sunburst; to compare exact sizes use bar-chart.
 * @example
 * <Treemap
 *   label="Spending by area"
 *   data={{
 *     name: "All spending",
 *     children: [
 *       { name: "Housing", children: [{ name: "Rent", value: 1200 }, { name: "Power", value: 140 }] },
 *       { name: "Food", children: [{ name: "Groceries", value: 420 }, { name: "Cafés", value: 90 }] },
 *       { name: "Travel", value: 260 },
 *     ],
 *   }}
 * />
 */
import { hierarchy, treemap, treemapSquarify, type HierarchyRectangularNode } from "d3-hierarchy";
import { useMemo, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import { useControllableState } from "@/lib/use-controllable-state";
import {
  ChartContainer,
  ChartEmpty,
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

export type TreemapLabels = {
  /** The name of the trail of levels. */
  trail: string;
  /** The column names of the table alternative. */
  part: string;
  value: string;
  share: string;
  /** Said with a group that can be opened. */
  canOpen: string;
};

export type TreemapProps = Omit<ChartBaseProps, "defaultValue"> & {
  /** The tree. Leaves carry a `value`; a branch is the sum of its children. */
  data: ChartTreeNode;
  /** The names from the root to the group in view. Controlled with `onPathChange`. */
  path?: readonly string[];
  defaultPath?: readonly string[];
  onPathChange?: (path: readonly string[]) => void;
  /** Words, for translation. */
  labels?: Partial<TreemapLabels>;
};

const LABELS: TreemapLabels = { trail: "Level", part: "Part", value: "Value", share: "Share", canOpen: "press Enter to open" };
const EMPTY: readonly string[] = [];

export function Treemap({ data, path: pathProp, defaultPath = EMPTY, onPathChange, labels: given, label, aspect, height, emptyLabel, locale, formatValue, className, ...props }: TreemapProps) {
  const labels = { ...LABELS, ...given };
  const [path, setPath] = useControllableState<readonly string[]>({ value: pathProp, defaultValue: defaultPath, onChange: onPathChange });
  const focus = useMemo(() => chartTreeFind(data, path), [data, path]);
  const total = chartTreeTotal(focus.node);
  const whole = chartTreeTotal(data) || 1;
  const number = formatValue ?? ((value: number) => formatNumber(value, locale));
  const percent = (share: number): string => formatNumber(share, locale, { style: "percent", maximumFractionDigits: 1 });
  // A group keeps its colour while zoomed: the colour belongs to the top-level group it is in.
  const topIndex = (name: string): number => data.children?.findIndex((child) => child.name === name) ?? 0;

  const root = useMemo(
    () =>
      hierarchy<ChartTreeNode>(focus.node, (node) => node.children as ChartTreeNode[] | undefined)
        .sum((node) => (node.children && node.children.length > 0 ? 0 : Math.max(0, node.value ?? 0)))
        .sort((a, b) => (b.value ?? 0) - (a.value ?? 0)),
    [focus.node],
  );
  const leaves = useMemo(() => root.leaves(), [root]);
  const cursor = useChartCursor(leaves.length);
  const groupOf = (node: HierarchyRectangularNode<ChartTreeNode> | (typeof leaves)[number]): string => node.ancestors().find((a) => a.depth === 1)?.data.name ?? node.data.name;
  const colourOf = (node: (typeof leaves)[number]): number => {
    const top = focus.path.length > 0 ? (focus.path[0] ?? "") : groupOf(node);
    const index = topIndex(top);
    return index >= 0 && index < 5 ? index : -1;
  };
  const openable = (node: (typeof leaves)[number]): boolean => node.depth > 1;

  const table = { caption: label, columns: [labels.part, labels.value, labels.share], rows: chartTreeRows(data, number, percent) };
  const current = cursor.active === null ? undefined : leaves[cursor.active];
  const describe = (node: (typeof leaves)[number]): string =>
    `${node
      .ancestors()
      .reverse()
      .slice(1)
      .map((a) => a.data.name)
      .join(" / ")}: ${number(node.value ?? 0)}, ${percent((node.value ?? 0) / whole)}${openable(node) ? `, ${labels.canOpen}` : ""}`;

  const open = (node: (typeof leaves)[number]): void => {
    const group = node.ancestors().find((a) => a.depth === 1);
    if (!group || group === node) return;
    setPath([...focus.path, group.data.name]);
    cursor.select(null);
  };
  const onKeyDown = (event: KeyboardEvent<SVGSVGElement>): void => {
    if ((event.key === "Enter" || event.key === " ") && current) {
      event.preventDefault();
      open(current);
      return;
    }
    if (event.key === "Backspace" && focus.path.length > 0) {
      event.preventDefault();
      setPath(focus.path.slice(0, -1));
      cursor.select(null);
      return;
    }
    cursor.svgProps.onKeyDown(event);
  };

  return (
    <div data-slot="treemap" className={cn("flex w-full min-w-0 flex-col gap-2", className)} {...props}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <ChartTrail aria-label={labels.trail} trail={[data.name, ...focus.path]} onNavigate={(depth) => setPath(focus.path.slice(0, depth))} />
        <span className="text-sm tabular-nums text-muted-foreground">{number(total)}</span>
      </div>
      <ChartContainer aspect={aspect} height={height} table={table} announcement={cursor.keyboard && current ? describe(current) : ""}>
        {({ width, height: plotHeight }) => {
          if (total <= 0) return <ChartEmpty>{emptyLabel}</ChartEmpty>;
          const laid = treemap<ChartTreeNode>()
            .tile(treemapSquarify)
            .size([width, plotHeight])
            .paddingInner(2)
            .paddingTop((node) => (node.depth === 1 && node.children ? 18 : 0))
            .round(true)(root.copy());
          const placed = laid.leaves();
          const groups = laid.children?.filter((child) => child.children) ?? [];
          const shown = cursor.active === null ? undefined : placed[cursor.active];
          return (
            <>
              <ChartSvg label={label} width={width} height={plotHeight} interactive {...cursor.svgProps} onKeyDown={onKeyDown}>
                <g aria-hidden="true">
                  {groups.map((group) => {
                    const w = group.x1 - group.x0;
                    return w > 30 ? (
                      <text key={group.data.name} x={group.x0 + 4} y={group.y0 + 12} className="fill-muted-foreground text-xs">
                        {fitText(group.data.name, w - 8)}
                      </text>
                    ) : null;
                  })}
                  {placed.map((node, index) => {
                    const w = node.x1 - node.x0;
                    const h = node.y1 - node.y0;
                    if (w <= 0 || h <= 0) return null;
                    const style = chartSeries(colourOf(leaves[index] ?? node));
                    const dim = cursor.active !== null && cursor.active !== index;
                    return (
                      <g
                        key={index}
                        className={cn("cursor-pointer transition-opacity duration-instant motion-reduce:transition-none", dim && "opacity-55")}
                        onPointerEnter={() => cursor.point(index)}
                        onClick={() => {
                          const leaf = leaves[index];
                          if (leaf) open(leaf);
                        }}
                      >
                        <rect x={node.x0} y={node.y0} width={w} height={h} className={cn(style.fill, "[rx:min(var(--radius),4px)]")} fillOpacity={0.24} />
                        <rect x={node.x0} y={node.y0} width={w} height={Math.min(3, h)} className={style.fill} />
                        {w > 36 && h > 30 ? (
                          <>
                            <text x={node.x0 + 6} y={node.y0 + 18} className="fill-foreground text-xs font-medium">
                              {fitText(node.data.name, w - 12)}
                            </text>
                            {h > 46 ? (
                              <text x={node.x0 + 6} y={node.y0 + 34} className="fill-muted-foreground text-xs tabular-nums">
                                {fitText(number(node.value ?? 0), w - 12)}
                              </text>
                            ) : null}
                          </>
                        ) : null}
                      </g>
                    );
                  })}
                  {shown ? (
                    <rect
                      x={shown.x0 + 1}
                      y={shown.y0 + 1}
                      width={Math.max(0, shown.x1 - shown.x0 - 2)}
                      height={Math.max(0, shown.y1 - shown.y0 - 2)}
                      fill="none"
                      className="pointer-events-none stroke-foreground"
                      strokeWidth={2}
                    />
                  ) : null}
                </g>
              </ChartSvg>
              {shown && current ? (
                <ChartTooltip
                  x={(shown.x0 + shown.x1) / 2}
                  y={(shown.y0 + shown.y1) / 2}
                  side={(shown.x0 + shown.x1) / 2 > width / 2 ? "left" : "right"}
                  title={current
                    .ancestors()
                    .reverse()
                    .slice(1, -1)
                    .map((a) => a.data.name)
                    .join(" / ")}
                  rows={[{ label: current.data.name, value: `${number(current.value ?? 0)} · ${percent((current.value ?? 0) / whole)}`, index: colourOf(current), mark: "rect" }]}
                />
              ) : null}
            </>
          );
        }}
      </ChartContainer>
    </div>
  );
}
