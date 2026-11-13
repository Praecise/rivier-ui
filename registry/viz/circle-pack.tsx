"use client";
/**
 * @name circle-pack
 * @category viz
 * @description A hierarchy as circles inside circles: each group an outline holding its parts, each part a circle whose area is its size, with zooming into a group by click or Enter and back out by the trail or Backspace.
 * @when Showing groups and their members when the grouping matters more than precise sizes: topics and their articles, teams and their projects. To compare sizes closely use treemap or bar-chart; for levels as rings use sunburst.
 * @example
 * <CirclePack
 *   label="Articles by topic"
 *   data={{
 *     name: "All articles",
 *     children: [
 *       { name: "Science", children: [{ name: "Space", value: 40 }, { name: "Biology", value: 25 }] },
 *       { name: "Arts", children: [{ name: "Film", value: 30 }, { name: "Music", value: 18 }] },
 *     ],
 *   }}
 * />
 */
import { hierarchy, pack, type HierarchyNode } from "d3-hierarchy";
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

export type CirclePackLabels = { trail: string; part: string; value: string; share: string; canOpen: string };

export type CirclePackProps = Omit<ChartBaseProps, "defaultValue"> & {
  /** The tree. Leaves carry a `value`; a branch is the sum of its children. */
  data: ChartTreeNode;
  /** The names from the root to the group in view. Controlled with `onPathChange`. */
  path?: readonly string[];
  defaultPath?: readonly string[];
  onPathChange?: (path: readonly string[]) => void;
  labels?: Partial<CirclePackLabels>;
};

const LABELS: CirclePackLabels = { trail: "Level", part: "Part", value: "Value", share: "Share", canOpen: "press Enter to open" };
const EMPTY: readonly string[] = [];

type Node = HierarchyNode<ChartTreeNode>;

export function CirclePack({
  data,
  path: pathProp,
  defaultPath = EMPTY,
  onPathChange,
  labels: given,
  label,
  aspect = 1,
  height,
  emptyLabel,
  locale,
  formatValue,
  className,
  ...props
}: CirclePackProps) {
  const labels = { ...LABELS, ...given };
  const [path, setPath] = useControllableState<readonly string[]>({ value: pathProp, defaultValue: defaultPath, onChange: onPathChange });
  const focus = useMemo(() => chartTreeFind(data, path), [data, path]);
  const total = chartTreeTotal(focus.node);
  const whole = chartTreeTotal(data) || 1;
  const number = formatValue ?? ((value: number) => formatNumber(value, locale));
  const percent = (share: number): string => formatNumber(share, locale, { style: "percent", maximumFractionDigits: 1 });
  const topIndex = (name: string): number => data.children?.findIndex((child) => child.name === name) ?? 0;
  const root = useMemo(
    () =>
      hierarchy<ChartTreeNode>(focus.node, (node) => node.children as ChartTreeNode[] | undefined)
        .sum((node) => (node.children && node.children.length > 0 ? 0 : Math.max(0, node.value ?? 0)))
        .sort((a, b) => (b.value ?? 0) - (a.value ?? 0)),
    [focus.node],
  );
  const rootLeaves = useMemo(() => root.leaves(), [root]);
  const cursor = useChartCursor(rootLeaves.length);
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
  const groupOf = (node: Node): Node | undefined => node.ancestors().find((a) => a.depth === 1 && a !== node);
  const open = (node: Node): void => {
    const group = groupOf(node);
    if (!group) return;
    setPath([...focus.path, group.data.name]);
    cursor.select(null);
  };
  const describe = (node: Node): string => `${trailOf(node).join(" / ")}: ${number(node.value ?? 0)}, ${percent((node.value ?? 0) / whole)}${groupOf(node) ? `, ${labels.canOpen}` : ""}`;
  const reading = cursor.active === null ? undefined : rootLeaves[cursor.active];
  const table = { caption: label, columns: [labels.part, labels.value, labels.share], rows: chartTreeRows(data, number, percent) };

  return (
    <div data-slot="circle-pack" className={cn("flex w-full min-w-0 flex-col gap-2", className)} {...props}>
      <ChartTrail aria-label={labels.trail} trail={[data.name, ...focus.path]} onNavigate={(depth) => setPath(focus.path.slice(0, depth))} />
      <ChartContainer aspect={aspect} height={height} table={table} announcement={cursor.keyboard && reading ? describe(reading) : ""}>
        {({ width, height: plotHeight }) => {
          if (total <= 0) return <ChartEmpty>{emptyLabel}</ChartEmpty>;
          const laid = pack<ChartTreeNode>()
            .size([width, plotHeight])
            .padding((node) => (node.depth === 0 ? 4 : 3))(root.copy());
          const leaves = laid.leaves();
          const groups = laid.descendants().filter((node) => node.depth > 0 && node.children);
          const current = cursor.active === null ? undefined : leaves[cursor.active];
          const onKeyDown = (event: KeyboardEvent<SVGSVGElement>): void => {
            if ((event.key === "Enter" || event.key === " ") && current) {
              event.preventDefault();
              open(current);
            } else if (event.key === "Backspace" && focus.path.length > 0) {
              event.preventDefault();
              setPath(focus.path.slice(0, -1));
              cursor.select(null);
            } else cursor.svgProps.onKeyDown(event);
          };
          return (
            <>
              <ChartSvg label={label} width={width} height={plotHeight} interactive {...cursor.svgProps} onKeyDown={onKeyDown}>
                <g aria-hidden="true">
                  {groups.map((group, index) => (
                    <circle
                      key={`g${index}`}
                      cx={group.x}
                      cy={group.y}
                      r={group.r}
                      className={cn(chartSeries(colourOf(group)).stroke, "fill-none cursor-pointer")}
                      strokeOpacity={0.7}
                      strokeWidth={1.5}
                      onClick={() => open(group.leaves()[0] ?? group)}
                    />
                  ))}
                  {leaves.map((node, index) => (
                    <g
                      key={index}
                      className={cn("cursor-pointer transition-opacity duration-instant motion-reduce:transition-none", cursor.active !== null && cursor.active !== index && "opacity-50")}
                      onPointerEnter={() => cursor.point(index)}
                      onClick={() => open(node)}
                    >
                      <circle cx={node.x} cy={node.y} r={node.r} className={chartSeries(colourOf(node)).fill} fillOpacity={0.3} />
                      {node.r > 22 ? (
                        <text x={node.x} y={node.y} dy="0.32em" textAnchor="middle" className="pointer-events-none fill-foreground text-xs">
                          {fitText(node.data.name, node.r * 1.7)}
                        </text>
                      ) : null}
                    </g>
                  ))}
                  {groups.map((group, index) =>
                    group.r > 40 ? (
                      <text key={`t${index}`} x={group.x} y={group.y - group.r + 14} textAnchor="middle" className="pointer-events-none fill-muted-foreground text-xs font-medium">
                        {fitText(group.data.name, group.r * 1.4)}
                      </text>
                    ) : null,
                  )}
                  {current ? <circle cx={current.x} cy={current.y} r={current.r + 1} fill="none" className="pointer-events-none stroke-foreground" strokeWidth={2} /> : null}
                </g>
              </ChartSvg>
              {current ? (
                <ChartTooltip
                  x={current.x}
                  y={current.y}
                  side={current.x > width / 2 ? "left" : "right"}
                  title={trailOf(current).slice(0, -1).join(" / ") || undefined}
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
