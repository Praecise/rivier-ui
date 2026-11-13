"use client";
/**
 * @name chord-diagram
 * @category viz
 * @description Flows between the members of one group, both ways, around a circle: each member an arc sized by all it sends, each ribbon joining two members with ends as wide as what goes each way, lit with its member on hover or focus.
 * @when Showing exchanges within a set where both directions matter: moves between regions, trade between countries, messages between teams. Keep it to about a dozen members. For flows in one direction through stages use sankey-chart; for links without amounts use network-graph.
 * @example
 * <ChordDiagram
 *   label="Moves between neighbourhoods"
 *   names={["North", "South", "East"]}
 *   matrix={[
 *     [0, 120, 40],
 *     [80, 0, 60],
 *     [30, 90, 0],
 *   ]}
 * />
 */
import { arc } from "d3-shape";
import { useMemo } from "react";
import { cn } from "@/lib/cn";
import { ChartContainer, ChartEmpty, chartSeries, ChartSvg, ChartTooltip, fitText, formatNumber, useChartCursor, type ChartBaseProps } from "@/components/viz/chart";

export type ChordDiagramLabels = { from: string; to: string; value: string; sends: string; receives: string };

export type ChordDiagramProps = ChartBaseProps & {
  /** The members, in order round the circle. */
  names: readonly string[];
  /** matrix[i][j]: how much member i sends to member j. Square, one row and one column per name. */
  matrix: readonly (readonly number[])[];
  labels?: Partial<ChordDiagramLabels>;
};

const LABELS: ChordDiagramLabels = { from: "From", to: "To", value: "Amount", sends: "Sends", receives: "Receives" };
const PAD = 0.04;

type Span = { start: number; end: number };
type Group = Span & { index: number; total: number };
type Chord = { a: number; b: number; ab: number; ba: number; sourceSpan: Span; targetSpan: Span };

export function ChordDiagram({ names, matrix, labels: given, label, aspect = 1, height, emptyLabel, locale, formatValue, className, ...props }: ChordDiagramProps) {
  const labels = { ...LABELS, ...given };
  const layout = useMemo(() => {
    const n = names.length;
    const at = (i: number, j: number): number => Math.max(0, matrix[i]?.[j] ?? 0);
    const totals = names.map((_, i) => names.reduce((sum, __, j) => sum + at(i, j), 0));
    const sum = totals.reduce((a, b) => a + b, 0);
    const k = sum > 0 ? (2 * Math.PI - PAD * n) / sum : 0;
    const groups: Group[] = [];
    // Within each member's arc, the slices for each partner in order: subgroup[i][j] is i's share sent to j.
    const slices: Span[][] = [];
    let angle = 0;
    for (let i = 0; i < n; i++) {
      const start = angle;
      const row: Span[] = [];
      for (let j = 0; j < n; j++) {
        const width = at(i, j) * k;
        row.push({ start: angle, end: angle + width });
        angle += width;
      }
      slices.push(row);
      groups.push({ index: i, start, end: angle, total: totals[i] ?? 0 });
      angle += PAD;
    }
    const chords: Chord[] = [];
    for (let i = 0; i < n; i++) {
      for (let j = i; j < n; j++) {
        if (at(i, j) + at(j, i) <= 0) continue;
        chords.push({ a: i, b: j, ab: at(i, j), ba: at(j, i), sourceSpan: slices[i]?.[j] ?? { start: 0, end: 0 }, targetSpan: slices[j]?.[i] ?? { start: 0, end: 0 } });
      }
    }
    const receives = names.map((_, j) => names.reduce((s, __, i) => s + at(i, j), 0));
    return { groups, chords, sum, receives };
  }, [names, matrix]);
  const { groups, chords, sum, receives } = layout;
  const cursor = useChartCursor(groups.length + chords.length);
  const number = formatValue ?? ((value: number) => formatNumber(value, locale));
  const table = {
    caption: label,
    columns: [labels.from, labels.to, labels.value],
    rows: names.flatMap((from, i) => names.flatMap((to, j) => ((matrix[i]?.[j] ?? 0) > 0 ? [[from, to, number(matrix[i]?.[j] ?? 0)]] : []))),
  };
  const colour = (i: number): number => (i < 5 ? i : -1);
  const reading = (index: number): { title: string; rows: { label: string; value: string }[] } => {
    const group = groups[index];
    if (group)
      return {
        title: names[group.index] ?? "",
        rows: [
          { label: labels.sends, value: number(group.total) },
          { label: labels.receives, value: number(receives[group.index] ?? 0) },
        ],
      };
    const chord = chords[index - groups.length];
    if (!chord) return { title: "", rows: [] };
    const a = names[chord.a] ?? "";
    const b = names[chord.b] ?? "";
    return {
      title: chord.a === chord.b ? a : `${a} ↔ ${b}`,
      rows: [{ label: `${a} → ${b}`, value: number(chord.ab) }, ...(chord.a === chord.b ? [] : [{ label: `${b} → ${a}`, value: number(chord.ba) }])],
    };
  };
  const current = cursor.active === null ? undefined : reading(cursor.active);

  return (
    <div data-slot="chord-diagram" className={cn("flex w-full min-w-0 flex-col gap-3", className)} {...props}>
      <ChartContainer
        aspect={aspect}
        height={height}
        table={table}
        announcement={cursor.keyboard && current ? `${current.title}: ${current.rows.map((row) => `${row.label} ${row.value}`).join(", ")}` : ""}
      >
        {({ width, height: plotHeight }) => {
          if (sum <= 0) return <ChartEmpty>{emptyLabel}</ChartEmpty>;
          const outer = Math.max(20, Math.min(width, plotHeight) / 2 - 56);
          const inner = outer - 12;
          const cx = width / 2;
          const cy = plotHeight / 2;
          const ring = arc<Span>()
            .innerRadius(inner)
            .outerRadius(outer)
            .startAngle((s) => s.start)
            .endAngle((s) => s.end)
            .cornerRadius(2);
          const point = (angle: number, r: number): string => `${Math.sin(angle) * r},${-Math.cos(angle) * r}`;
          const ribbon = (c: Chord): string => {
            const s = c.sourceSpan;
            const t = c.targetSpan;
            const r = inner - 1;
            const large = (span: Span): number => (span.end - span.start > Math.PI ? 1 : 0);
            return `M${point(s.start, r)}A${r},${r} 0 ${large(s)} 1 ${point(s.end, r)}Q0,0 ${point(t.start, r)}A${r},${r} 0 ${large(t)} 1 ${point(t.end, r)}Q0,0 ${point(s.start, r)}Z`;
          };
          const activeGroup = cursor.active !== null && cursor.active < groups.length ? cursor.active : null;
          const activeChord = cursor.active !== null && cursor.active >= groups.length ? chords[cursor.active - groups.length] : undefined;
          const lit = (c: Chord): boolean => c === activeChord || (activeGroup !== null && (c.a === activeGroup || c.b === activeGroup));
          const anchorAngle =
            activeGroup !== null ? ((groups[activeGroup]?.start ?? 0) + (groups[activeGroup]?.end ?? 0)) / 2 : activeChord ? (activeChord.sourceSpan.start + activeChord.sourceSpan.end) / 2 : 0;
          const anchor = { x: cx + Math.sin(anchorAngle) * (activeGroup !== null ? outer : inner * 0.6), y: cy - Math.cos(anchorAngle) * (activeGroup !== null ? outer : inner * 0.6) };
          return (
            <>
              <ChartSvg label={label} width={width} height={plotHeight} interactive {...cursor.svgProps}>
                <g transform={`translate(${cx},${cy})`} aria-hidden="true">
                  {chords.map((c, i) => (
                    <path
                      key={i}
                      d={ribbon(c)}
                      className={cn(chartSeries(colour(c.ab >= c.ba ? c.a : c.b)).fill, "stroke-background transition-opacity duration-instant motion-reduce:transition-none")}
                      fillOpacity={cursor.active === null ? 0.45 : lit(c) ? 0.7 : 0.08}
                      strokeWidth={0.75}
                      onPointerEnter={() => cursor.point(groups.length + i)}
                    />
                  ))}
                  {groups.map((g) => {
                    const mid = (g.start + g.end) / 2;
                    const right = Math.sin(mid) >= 0;
                    return (
                      <g key={g.index} onPointerEnter={() => cursor.point(g.index)}>
                        <path d={ring(g) ?? ""} className={chartSeries(colour(g.index)).fill} />
                        <text
                          transform={`translate(${Math.sin(mid) * (outer + 8)},${-Math.cos(mid) * (outer + 8)})`}
                          dy="0.32em"
                          textAnchor={right ? "start" : "end"}
                          className={cn("text-xs", activeGroup === g.index ? "fill-foreground font-medium" : "fill-muted-foreground")}
                        >
                          {fitText(names[g.index] ?? "", 52)}
                        </text>
                      </g>
                    );
                  })}
                  {activeGroup !== null && groups[activeGroup] ? <path d={ring(groups[activeGroup]) ?? ""} fill="none" className="stroke-foreground" strokeWidth={2} /> : null}
                  {activeChord ? <path d={ribbon(activeChord)} fill="none" className="stroke-foreground" strokeWidth={1.5} /> : null}
                </g>
              </ChartSvg>
              {current ? <ChartTooltip x={anchor.x} y={anchor.y} side={anchor.x > cx ? "left" : "right"} title={current.title} rows={current.rows} /> : null}
            </>
          );
        }}
      </ChartContainer>
    </div>
  );
}
