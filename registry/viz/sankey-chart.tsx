"use client";
/**
 * @name sankey-chart
 * @category viz
 * @description Flows between stages as bands whose widths are the amounts: where a total comes from, where it goes and what is lost on the way, with every node and band reachable by arrow keys.
 * @when Showing how amounts move through steps or between categories: a budget from sources to uses, visitors through a sign-up, energy from fuel to use. For a single funnel of shrinking steps use funnel-chart; for links without amounts use network-graph; for two-way flows between the same groups use chord-diagram.
 * @example
 * <SankeyChart
 *   label="Where the money goes"
 *   nodes={[{ id: "income", label: "Income" }, { id: "rent", label: "Rent" }, { id: "food", label: "Food" }, { id: "saved", label: "Saved" }]}
 *   links={[
 *     { source: "income", target: "rent", value: 1200 },
 *     { source: "income", target: "food", value: 500 },
 *     { source: "income", target: "saved", value: 300 },
 *   ]}
 * />
 */
import { sankey, sankeyJustify, sankeyLinkHorizontal, type SankeyLink, type SankeyNode } from "d3-sankey";
import { useMemo } from "react";
import { cn } from "@/lib/cn";
import { ChartContainer, ChartEmpty, chartSeries, ChartSvg, ChartTooltip, fitText, formatNumber, useChartCursor, widestText, type ChartBaseProps } from "@/components/viz/chart";

export type SankeyChartNode = {
  id: string;
  /** Its name. Default: the id. */
  label?: string;
  /** A group name: nodes of a group share a colour, in order of first appearance. Default: all one colour. */
  group?: string;
};

export type SankeyChartLink = { source: string; target: string; value: number };

export type SankeyChartLabels = { source: string; target: string; value: string; incoming: string; outgoing: string };

export type SankeyChartProps = ChartBaseProps & {
  nodes: readonly SankeyChartNode[];
  /** Amounts from one node to another. The graph must not loop back on itself. */
  links: readonly SankeyChartLink[];
  /** Words for the table and the tooltip. */
  labels?: Partial<SankeyChartLabels>;
  /** The width of a node bar in pixels. Default 12. */
  nodeWidth?: number;
};

const LABELS: SankeyChartLabels = { source: "From", target: "To", value: "Amount", incoming: "In", outgoing: "Out" };

type N = { id: string; name: string; colour: number };
type L = { value: number };
type LaidNode = SankeyNode<N, L>;
type LaidLink = SankeyLink<N, L>;

export function SankeyChart({ nodes, links, labels: given, nodeWidth = 12, label, aspect, height, emptyLabel, locale, formatValue, className, ...props }: SankeyChartProps) {
  const labels = { ...LABELS, ...given };
  const number = formatValue ?? ((value: number) => formatNumber(value, locale));
  const known = useMemo(() => {
    const groups = [...new Set(nodes.map((node) => node.group ?? ""))];
    const graphNodes: N[] = nodes.map((node) => {
      const index = groups.indexOf(node.group ?? "");
      return { id: node.id, name: node.label ?? node.id, colour: index < 5 ? index : -1 };
    });
    const ids = new Set(graphNodes.map((node) => node.id));
    const graphLinks = links.filter((link) => ids.has(link.source) && ids.has(link.target) && link.value > 0 && link.source !== link.target);
    return { graphNodes, graphLinks };
  }, [nodes, links]);
  const count = known.graphNodes.length + known.graphLinks.length;
  const cursor = useChartCursor(count);
  const nameOf = (id: string): string => known.graphNodes.find((node) => node.id === id)?.name ?? id;
  const totals = (id: string): { incoming: number; outgoing: number } => ({
    incoming: known.graphLinks.filter((link) => link.target === id).reduce((sum, link) => sum + link.value, 0),
    outgoing: known.graphLinks.filter((link) => link.source === id).reduce((sum, link) => sum + link.value, 0),
  });
  const describeAt = (index: number): { title: string; rows: { label: string; value: string }[] } => {
    const node = known.graphNodes[index];
    if (node) {
      const t = totals(node.id);
      return {
        title: node.name,
        rows: [...(t.incoming > 0 ? [{ label: labels.incoming, value: number(t.incoming) }] : []), ...(t.outgoing > 0 ? [{ label: labels.outgoing, value: number(t.outgoing) }] : [])],
      };
    }
    const link = known.graphLinks[index - known.graphNodes.length];
    return link ? { title: `${nameOf(link.source)} → ${nameOf(link.target)}`, rows: [{ label: labels.value, value: number(link.value) }] } : { title: "", rows: [] };
  };
  const reading = cursor.active === null ? undefined : describeAt(cursor.active);
  const table = { caption: label, columns: [labels.source, labels.target, labels.value], rows: known.graphLinks.map((link) => [nameOf(link.source), nameOf(link.target), number(link.value)]) };

  return (
    <div data-slot="sankey-chart" className={cn("flex w-full min-w-0 flex-col gap-3", className)} {...props}>
      <ChartContainer
        aspect={aspect}
        height={height}
        table={table}
        announcement={cursor.keyboard && reading ? `${reading.title}: ${reading.rows.map((row) => `${row.label} ${row.value}`).join(", ")}` : ""}
      >
        {({ width, height: plotHeight }) => {
          if (known.graphLinks.length === 0) return <ChartEmpty>{emptyLabel}</ChartEmpty>;
          const room = Math.min(width * 0.28, widestText(known.graphNodes.map((node) => node.name)) + 10);
          let laid: { nodes: LaidNode[]; links: LaidLink[] };
          try {
            laid = sankey<N, L>()
              .nodeId((node) => node.id)
              .nodeAlign(sankeyJustify)
              .nodeWidth(nodeWidth)
              .nodePadding(Math.max(8, Math.min(20, plotHeight / (known.graphNodes.length * 2))))
              .extent([
                [room, 6],
                [width - room, plotHeight - 6],
              ])({ nodes: known.graphNodes.map((node) => ({ ...node })), links: known.graphLinks.map((link) => ({ ...link })) });
          } catch {
            // A loop in the links cannot be laid out left to right.
            return <ChartEmpty>{emptyLabel}</ChartEmpty>;
          }
          const path = sankeyLinkHorizontal<N, L>();
          const activeNode = cursor.active !== null && cursor.active < laid.nodes.length ? laid.nodes[cursor.active] : undefined;
          const activeLink = cursor.active !== null && cursor.active >= laid.nodes.length ? laid.links[cursor.active - laid.nodes.length] : undefined;
          const lit = (link: LaidLink): boolean => link === activeLink || (activeNode !== undefined && (link.source === activeNode || link.target === activeNode));
          const anchor = activeNode
            ? { x: activeNode.x1 ?? 0, y: ((activeNode.y0 ?? 0) + (activeNode.y1 ?? 0)) / 2 }
            : activeLink
              ? { x: (((activeLink.source as LaidNode).x1 ?? 0) + ((activeLink.target as LaidNode).x0 ?? 0)) / 2, y: ((activeLink.y0 ?? 0) + (activeLink.y1 ?? 0)) / 2 }
              : undefined;
          return (
            <>
              <ChartSvg label={label} width={width} height={plotHeight} interactive {...cursor.svgProps}>
                <g aria-hidden="true" fill="none">
                  {laid.links.map((link, index) => {
                    const source = link.source as LaidNode;
                    return (
                      <path
                        key={index}
                        d={path(link) ?? ""}
                        className={cn(chartSeries(source.colour).stroke, "transition-opacity duration-instant motion-reduce:transition-none")}
                        strokeOpacity={cursor.active === null ? 0.32 : lit(link) ? 0.6 : 0.12}
                        strokeWidth={Math.max(1, link.width ?? 1)}
                        onPointerEnter={() => cursor.point(laid.nodes.length + index)}
                      />
                    );
                  })}
                </g>
                <g aria-hidden="true">
                  {laid.nodes.map((node, index) => {
                    const x0 = node.x0 ?? 0;
                    const x1 = node.x1 ?? 0;
                    const y0 = node.y0 ?? 0;
                    const y1 = node.y1 ?? 0;
                    const onLeft = x0 < width / 2;
                    return (
                      <g key={node.id} onPointerEnter={() => cursor.point(index)}>
                        <rect x={x0} y={y0} width={x1 - x0} height={Math.max(1, y1 - y0)} className={cn(chartSeries(node.colour).fill, "[rx:min(var(--radius),2px)]")} />
                        <text
                          x={onLeft ? x0 - 6 : x1 + 6}
                          y={(y0 + y1) / 2}
                          dy="0.32em"
                          textAnchor={onLeft ? "end" : "start"}
                          className={cn("text-xs", activeNode === node ? "fill-foreground font-medium" : "fill-muted-foreground")}
                        >
                          {fitText(node.name, room - 8)}
                        </text>
                      </g>
                    );
                  })}
                  {activeNode ? (
                    <rect
                      x={(activeNode.x0 ?? 0) - 2}
                      y={(activeNode.y0 ?? 0) - 2}
                      width={(activeNode.x1 ?? 0) - (activeNode.x0 ?? 0) + 4}
                      height={(activeNode.y1 ?? 0) - (activeNode.y0 ?? 0) + 4}
                      fill="none"
                      className="pointer-events-none stroke-foreground"
                      strokeWidth={2}
                    />
                  ) : null}
                </g>
              </ChartSvg>
              {anchor && reading ? <ChartTooltip x={anchor.x} y={anchor.y} side={anchor.x > width / 2 ? "left" : "right"} title={reading.title} rows={reading.rows} /> : null}
            </>
          );
        }}
      </ChartContainer>
    </div>
  );
}
