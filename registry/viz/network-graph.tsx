"use client";
/**
 * @name network-graph
 * @category viz
 * @description Things and the links between them, placed by a force layout that is run to rest before it is drawn (so it is the same every time and never moves on its own), with each node's links lit on hover or focus and every node reachable by arrow keys.
 * @when Showing who or what is connected to what: clusters, bridges between groups, the most linked items. Keep it to a few hundred nodes. For amounts flowing in one direction use sankey-chart; for a hierarchy use treemap or tree-view; for a process the person edits use flow-diagram.
 * @example
 * <NetworkGraph
 *   label="Libraries and what they use"
 *   nodes={[{ id: "app", group: "Apps" }, { id: "ui", group: "Libraries" }, { id: "charts", group: "Libraries" }, { id: "maths", group: "Libraries" }]}
 *   links={[{ source: "app", target: "ui" }, { source: "app", target: "charts" }, { source: "charts", target: "maths" }]}
 * />
 */
import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, type SimulationLinkDatum, type SimulationNodeDatum } from "d3-force";
import { useMemo } from "react";
import { cn } from "@/lib/cn";
import { ChartContainer, ChartEmpty, ChartLegend, ChartMark, ChartSvg, ChartTooltip, fitText, formatNumber, useChartCursor, type ChartBaseProps } from "@/components/viz/chart";

export type NetworkNode = {
  id: string;
  /** Its name. Default: the id. */
  label?: string;
  /** Its group: one colour and shape per group, in order of first appearance (or `groups`). */
  group?: string;
  /** A number that sets the node's size, such as its weight. Default: its number of links. */
  size?: number;
};

export type NetworkLink = { source: string; target: string /** The strength of the link; thicker when larger. */; value?: number };

export type NetworkGraphLabels = { node: string; group: string; links: string; linkCount: (count: number, formatted: string) => string };

export type NetworkGraphProps = ChartBaseProps & {
  nodes: readonly NetworkNode[];
  links: readonly NetworkLink[];
  /** The groups in a fixed order, so a group keeps its colour. */
  groups?: readonly string[];
  /** Write each node's name beside it. Default: when there are 40 nodes or fewer. */
  showLabels?: boolean;
  /** Default: shown when there are two or more groups. */
  showLegend?: boolean;
  labels?: Partial<NetworkGraphLabels>;
};

const LABELS: NetworkGraphLabels = { node: "Node", group: "Group", links: "Linked to", linkCount: (count, formatted) => `${formatted} ${count === 1 ? "link" : "links"}` };

type SimNode = SimulationNodeDatum & { id: string; name: string; group: number; groupName: string; weight: number };
type SimLink = SimulationLinkDatum<SimNode> & { value: number };

export function NetworkGraph({ nodes, links, groups, showLabels, showLegend, labels: given, label, aspect = 4 / 3, height, emptyLabel, locale, className, ...props }: NetworkGraphProps) {
  const labels = { ...LABELS, ...given };
  const model = useMemo(() => {
    const order = groups ? [...groups] : [...new Set(nodes.map((node) => node.group ?? ""))];
    const ids = new Set(nodes.map((node) => node.id));
    const kept = links.filter((link) => ids.has(link.source) && ids.has(link.target) && link.source !== link.target);
    const degree = new Map<string, number>();
    for (const link of kept) {
      degree.set(link.source, (degree.get(link.source) ?? 0) + 1);
      degree.set(link.target, (degree.get(link.target) ?? 0) + 1);
    }
    const simNodes: SimNode[] = nodes.map((node) => ({
      id: node.id,
      name: node.label ?? node.id,
      group: Math.max(0, order.indexOf(node.group ?? "")),
      groupName: node.group ?? "",
      weight: node.size ?? degree.get(node.id) ?? 0,
    }));
    const simLinks: SimLink[] = kept.map((link) => ({ source: link.source, target: link.target, value: link.value ?? 1 }));
    // Run to rest here, once: the starting positions of d3-force are fixed, so the same data gives the same picture.
    const simulation = forceSimulation<SimNode>(simNodes)
      .force(
        "link",
        forceLink<SimNode, SimLink>(simLinks)
          .id((node) => node.id)
          .distance(40),
      )
      .force("charge", forceManyBody<SimNode>().strength(-120))
      .force("x", forceX<SimNode>(0).strength(0.06))
      .force("y", forceY<SimNode>(0).strength(0.06))
      .force("collide", forceCollide<SimNode>(14))
      .stop();
    simulation.tick(Math.ceil(Math.log(simulation.alphaMin()) / Math.log(1 - simulation.alphaDecay())));
    const neighbours = new Map<string, string[]>();
    for (const link of simLinks) {
      const a = (link.source as SimNode).id;
      const b = (link.target as SimNode).id;
      neighbours.set(a, [...(neighbours.get(a) ?? []), b]);
      neighbours.set(b, [...(neighbours.get(b) ?? []), a]);
    }
    return { simNodes, simLinks, order, neighbours };
  }, [nodes, links, groups]);

  const { simNodes, simLinks, order, neighbours } = model;
  const cursor = useChartCursor(simNodes.length);
  const nameOf = (id: string): string => simNodes.find((node) => node.id === id)?.name ?? id;
  const grouped = order.length > 1 || (order.length === 1 && order[0] !== "");
  const countText = (id: string): string => {
    const count = (neighbours.get(id) ?? []).length;
    return labels.linkCount(count, formatNumber(count, locale));
  };
  const linkedNames = (id: string): string[] => (neighbours.get(id) ?? []).map(nameOf);
  const table = {
    caption: label,
    columns: [labels.node, ...(grouped ? [labels.group] : []), labels.links],
    rows: simNodes.map((node) => [node.name, ...(grouped ? [node.groupName] : []), linkedNames(node.id).join(", ")]),
  };
  const current = cursor.active === null ? undefined : simNodes[cursor.active];
  const describe = (node: SimNode): string => `${node.name}${grouped ? `, ${node.groupName}` : ""}, ${countText(node.id)}: ${linkedNames(node.id).join(", ")}`;
  const labelled = showLabels ?? simNodes.length <= 40;
  const legend = showLegend ?? order.length > 1;
  const maxWeight = Math.max(1, ...simNodes.map((node) => node.weight));

  return (
    <div data-slot="network-graph" className={cn("flex w-full min-w-0 flex-col gap-3", className)} {...props}>
      {legend ? <ChartLegend items={order.map((name, index) => ({ label: name, index }))} mark="rect" /> : null}
      <ChartContainer aspect={aspect} height={height} table={table} announcement={cursor.keyboard && current ? describe(current) : ""}>
        {({ width, height: plotHeight }) => {
          if (simNodes.length === 0) return <ChartEmpty>{emptyLabel}</ChartEmpty>;
          const xs = simNodes.map((node) => node.x ?? 0);
          const ys = simNodes.map((node) => node.y ?? 0);
          const pad = labelled ? 48 : 16;
          const spanX = Math.max(1, Math.max(...xs) - Math.min(...xs));
          const spanY = Math.max(1, Math.max(...ys) - Math.min(...ys));
          const k = Math.min((width - pad * 2) / spanX, (plotHeight - 32) / spanY, 3);
          const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
          const cy = (Math.max(...ys) + Math.min(...ys)) / 2;
          const px = (node: SimNode): number => width / 2 + ((node.x ?? 0) - cx) * k;
          const py = (node: SimNode): number => plotHeight / 2 + ((node.y ?? 0) - cy) * k;
          const radius = (node: SimNode): number => 4 + 6 * Math.sqrt(node.weight / maxWeight);
          const near = current ? new Set([current.id, ...(neighbours.get(current.id) ?? [])]) : undefined;
          return (
            <>
              <ChartSvg label={label} width={width} height={plotHeight} interactive {...cursor.svgProps}>
                <g aria-hidden="true">
                  {simLinks.map((link, index) => {
                    const a = link.source as SimNode;
                    const b = link.target as SimNode;
                    const lit = current !== undefined && (a === current || b === current);
                    return (
                      <line
                        key={index}
                        x1={px(a)}
                        y1={py(a)}
                        x2={px(b)}
                        y2={py(b)}
                        className={lit ? "stroke-foreground" : "stroke-border-strong"}
                        strokeOpacity={current && !lit ? 0.35 : 1}
                        strokeWidth={Math.min(4, 1 + Math.log1p(link.value) * 0.6)}
                      />
                    );
                  })}
                  {simNodes.map((node, index) => {
                    const dim = near !== undefined && !near.has(node.id);
                    return (
                      <g key={node.id} className={cn("transition-opacity duration-instant motion-reduce:transition-none", dim && "opacity-35")} onPointerEnter={() => cursor.point(index)}>
                        <circle cx={px(node)} cy={py(node)} r={Math.max(12, radius(node) + 4)} fill="transparent" />
                        <ChartMark index={grouped ? node.group : 0} x={px(node)} y={py(node)} radius={radius(node)} />
                        {labelled ? (
                          <text
                            x={px(node)}
                            y={py(node) + radius(node) + 4}
                            dy="0.8em"
                            textAnchor="middle"
                            className={cn("pointer-events-none text-xs", current === node ? "fill-foreground font-medium" : "fill-muted-foreground")}
                          >
                            {fitText(node.name, 96)}
                          </text>
                        ) : null}
                      </g>
                    );
                  })}
                  {current ? <circle cx={px(current)} cy={py(current)} r={radius(current) + 4} fill="none" className="stroke-foreground" strokeWidth={2} /> : null}
                </g>
              </ChartSvg>
              {current ? (
                <ChartTooltip
                  x={px(current)}
                  y={py(current)}
                  side={px(current) > width / 2 ? "left" : "right"}
                  title={current.name}
                  rows={[
                    ...(grouped ? [{ label: "", value: current.groupName, index: current.group, mark: "rect" as const }] : []),
                    {
                      label: linkedNames(current.id).slice(0, 6).join(", ") + ((neighbours.get(current.id)?.length ?? 0) > 6 ? "…" : ""),
                      value: countText(current.id),
                    },
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

