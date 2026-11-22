"use client";
/**
 * @name gantt-chart
 * @category viz
 * @description Tasks as bars along a time axis, one row each, under optional group headings: how far each has got, which must finish before another starts (arrows), milestones as diamonds and a line for today, with Up and Down reading each task.
 * @when Planning or reporting work over time: a project plan, a release schedule, a timeline of events with lengths. For events without length use timeline (a list) or a line-chart annotation; for a calendar of single days use calendar or calendar-heatmap.
 * @example
 * <GanttChart
 *   label="Launch plan"
 *   tasks={[
 *     { id: "design", label: "Design", start: "2026-03-02", end: "2026-03-13", group: "Product", progress: 1 },
 *     { id: "build", label: "Build", start: "2026-03-09", end: "2026-04-03", group: "Product", progress: 0.4, dependsOn: ["design"] },
 *     { id: "launch", label: "Launch", start: "2026-04-06", end: "2026-04-06", group: "Marketing", milestone: true, dependsOn: ["build"] },
 *   ]}
 *   today="2026-03-20"
 * />
 */
import { scaleUtc } from "d3-scale";
import { useMemo, type ComponentProps, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import { ChartContainer, ChartEmpty, ChartGrid, chartSeries, ChartSvg, ChartTooltip, dateFormatter, fitText, formatNumber, useChartCursor, widestText, type ChartFormat } from "@/components/viz/chart";

export type GanttTask = {
  id: string;
  label: string;
  /** "YYYY-MM-DD", or "YYYY-MM-DDTHH:mm" for times (read as UTC unless it carries a zone). */
  start: string;
  /** The same form. A day-only end includes that whole day. */
  end: string;
  /** Tasks with the same group sit together under its name, in one colour. */
  group?: string;
  /** How much is done, 0 to 1. */
  progress?: number;
  /** Ids of tasks that must finish before this one starts. */
  dependsOn?: readonly string[];
  /** A moment rather than a span: a diamond at `start`. */
  milestone?: boolean;
};

export type GanttChartLabels = {
  task: string;
  group: string;
  start: string;
  end: string;
  progress: string;
  length: (days: number, formatted: string) => string;
  today: string;
  after: string;
  milestone: string;
};

export type GanttChartProps = Omit<ComponentProps<"div">, "children"> &
  ChartFormat & {
    tasks: readonly GanttTask[];
    /** What the chart shows, for assistive technology. */
    label: string;
    /** "YYYY-MM-DD": a line for today. Left out, none is drawn (the server and the browser may not agree on the date). */
    today?: string;
    /** The height of a row in pixels. Default 32. */
    rowHeight?: number;
    labels?: Partial<GanttChartLabels>;
    emptyLabel?: string;
  };

const LABELS: GanttChartLabels = {
  task: "Task",
  group: "Group",
  start: "Start",
  end: "End",
  progress: "Done",
  length: (days, formatted) => `${formatted} ${days === 1 ? "day" : "days"}`,
  today: "Today",
  after: "After",
  milestone: "Milestone",
};
const DAY = 86400000;
const ROUND = "[rx:min(var(--radius),4px)] [ry:min(var(--radius),4px)]";

function parseMoment(text: string, end: boolean): number | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const at = Date.parse(`${text}T00:00:00Z`);
    return Number.isFinite(at) ? at + (end ? DAY : 0) : null;
  }
  const at = Date.parse(/[zZ]|[+-]\d{2}:?\d{2}$/.test(text) ? text : `${text}Z`);
  return Number.isFinite(at) ? at : null;
}

type Row = { kind: "group"; name: string; colour: number } | { kind: "task"; task: GanttTask; index: number; from: number; to: number; colour: number };

export function GanttChart({ tasks, label, today, rowHeight = 32, labels: given, emptyLabel, locale = "en-US", timeZone = "UTC", className, ...props }: GanttChartProps) {
  const labels = { ...LABELS, ...given };
  const model = useMemo(() => {
    const groups = [...new Set(tasks.map((task) => task.group ?? ""))];
    const rows: Row[] = [];
    const placed: Extract<Row, { kind: "task" }>[] = [];
    for (const [g, name] of groups.entries()) {
      const colour = g < 5 ? g : -1;
      if (name) rows.push({ kind: "group", name, colour });
      for (const task of tasks.filter((item) => (item.group ?? "") === name)) {
        const from = parseMoment(task.start, false);
        const to = task.milestone ? from : parseMoment(task.end, true);
        if (from === null || to === null) continue;
        const row: Extract<Row, { kind: "task" }> = { kind: "task", task, index: placed.length, from, to: Math.max(from, to), colour };
        rows.push(row);
        placed.push(row);
      }
    }
    return { rows, placed };
  }, [tasks]);
  const { rows, placed } = model;
  const cursor = useChartCursor(placed.length);
  const span = placed.length > 0 ? Math.max(...placed.map((row) => row.to)) - Math.min(...placed.map((row) => row.from)) : 0;
  const fullDate = dateFormatter(Math.min(span, 300 * DAY), "full", locale, timeZone);
  const axisDate = dateFormatter(span, "axis", locale, timeZone);
  const hasTime = tasks.some((task) => task.start.includes("T") || task.end.includes("T"));
  const dateText = (at: number, end: boolean): string => fullDate(hasTime || !end ? at : at - DAY);
  const percent = (share: number): string => formatNumber(share, locale, { style: "percent", maximumFractionDigits: 0 });
  const lengthText = (row: Extract<Row, { kind: "task" }>): string => {
    const days = Math.round(((row.to - row.from) / DAY) * 10) / 10;
    return labels.length(days, formatNumber(days, locale));
  };
  const nameOf = (id: string): string => tasks.find((task) => task.id === id)?.label ?? id;
  const describe = (row: Extract<Row, { kind: "task" }>): { label: string; value: string }[] => [
    ...(row.task.milestone
      ? [{ label: labels.milestone, value: dateText(row.from, false) }]
      : [
          { label: labels.start, value: dateText(row.from, false) },
          { label: labels.end, value: dateText(row.to, true) },
          { label: "", value: lengthText(row) },
        ]),
    ...(row.task.progress !== undefined ? [{ label: labels.progress, value: percent(row.task.progress) }] : []),
    ...(row.task.dependsOn && row.task.dependsOn.length > 0 ? [{ label: labels.after, value: row.task.dependsOn.map(nameOf).join(", ") }] : []),
  ];
  const table = {
    caption: label,
    columns: [labels.task, labels.group, labels.start, labels.end, labels.progress, labels.after],
    rows: placed.map((row) => [
      row.task.label,
      row.task.group ?? "",
      dateText(row.from, false),
      row.task.milestone ? labels.milestone : dateText(row.to, true),
      row.task.progress === undefined ? "" : percent(row.task.progress),
      (row.task.dependsOn ?? []).map(nameOf).join(", "),
    ]),
  };
  const current = cursor.active === null ? undefined : placed[cursor.active];
  const todayAt = today ? parseMoment(today, false) : null;
  const onKeyDown = (event: KeyboardEvent<SVGSVGElement>): void => {
    // Rows run down the page, so Up and Down read them; Left and Right do the same for one-handed use.
    if (event.key === "ArrowDown") {
      event.preventDefault();
      cursor.select(cursor.active === null ? 0 : cursor.active + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      cursor.select(cursor.active === null ? placed.length - 1 : cursor.active - 1);
    } else cursor.svgProps.onKeyDown(event);
  };
  const axis = 26;
  const plotHeight = rows.length * rowHeight + axis + 4;

  return (
    <div data-slot="gantt-chart" className={cn("flex w-full min-w-0 flex-col gap-3", className)} {...props}>
      <ChartContainer
        height={Math.max(80, plotHeight)}
        table={table}
        announcement={
          cursor.keyboard && current
            ? `${current.task.label}: ${describe(current)
                .map((item) => `${item.label} ${item.value}`.trim())
                .join(", ")}`
            : ""
        }
      >
        {({ width, height: measured }) => {
          if (placed.length === 0) return <ChartEmpty>{emptyLabel}</ChartEmpty>;
          const left = Math.min(Math.round(width * 0.34), widestText(placed.map((row) => row.task.label)) + 16);
          const right = 12;
          const first = Math.min(...placed.map((row) => row.from), ...(todayAt === null ? [] : [todayAt]));
          const last = Math.max(...placed.map((row) => row.to), ...(todayAt === null ? [] : [todayAt]));
          const sx = scaleUtc()
            .domain([first, last === first ? first + DAY : last])
            .range([left, width - right])
            .nice();
          const ticks = sx.ticks(Math.max(2, Math.floor((width - left) / 90)));
          const yOf = (rowIndex: number): number => axis + rowIndex * rowHeight;
          const bar = Math.min(18, rowHeight - 10);
          const rowIndexOf = new Map(placed.map((row) => [row.task.id, rows.indexOf(row)]));
          const shownRow = current ? rows.indexOf(current) : -1;
          return (
            <>
              <ChartSvg label={label} width={width} height={measured} interactive {...cursor.svgProps} onKeyDown={onKeyDown}>
                <ChartGrid offsets={ticks.map((tick) => sx(tick))} from={axis} to={measured - 4} vertical />
                <g aria-hidden="true" className="fill-muted-foreground tabular-nums">
                  {ticks.map((tick) => (
                    <text key={tick.getTime()} x={sx(tick)} y={axis - 10} textAnchor="middle">
                      {axisDate(tick)}
                    </text>
                  ))}
                </g>
                <g aria-hidden="true">
                  {rows.map((row, rowIndex) =>
                    row.kind === "group" ? (
                      <g key={`g:${row.name}`}>
                        <line x1={0} x2={width} y1={yOf(rowIndex)} y2={yOf(rowIndex)} className="stroke-border" shapeRendering="crispEdges" />
                        <text x={0} y={yOf(rowIndex) + rowHeight / 2} dy="0.32em" className="fill-foreground text-xs font-medium">
                          {fitText(row.name, width)}
                        </text>
                      </g>
                    ) : (
                      <g
                        key={row.task.id}
                        onPointerEnter={() => cursor.point(row.index)}
                        className={cn("transition-opacity duration-instant motion-reduce:transition-none", current && current !== row && "opacity-55")}
                      >
                        <rect x={0} y={yOf(rowIndex)} width={width} height={rowHeight} fill="transparent" />
                        <text x={8} y={yOf(rowIndex) + rowHeight / 2} dy="0.32em" className="fill-muted-foreground text-xs">
                          {fitText(row.task.label, left - 16)}
                        </text>
                        {row.task.milestone ? (
                          <path
                            d={`M0,${-bar / 2} L${bar / 2},0 L0,${bar / 2} L${-bar / 2},0 Z`}
                            transform={`translate(${sx(row.from)},${yOf(rowIndex) + rowHeight / 2})`}
                            className={cn(chartSeries(row.colour).fill, "stroke-background")}
                            strokeWidth={2}
                          />
                        ) : (
                          <>
                            <rect
                              x={sx(row.from)}
                              y={yOf(rowIndex) + (rowHeight - bar) / 2}
                              width={Math.max(2, sx(row.to) - sx(row.from))}
                              height={bar}
                              className={cn(chartSeries(row.colour).fill, ROUND)}
                              fillOpacity={0.3}
                            />
                            <rect
                              x={sx(row.from)}
                              y={yOf(rowIndex) + (rowHeight - bar) / 2}
                              width={Math.max(row.task.progress ? 2 : 0, (sx(row.to) - sx(row.from)) * Math.max(0, Math.min(1, row.task.progress ?? 0)))}
                              height={bar}
                              className={cn(chartSeries(row.colour).fill, ROUND)}
                            />
                          </>
                        )}
                      </g>
                    ),
                  )}
                  {placed.flatMap((row) =>
                    (row.task.dependsOn ?? []).flatMap((id) => {
                      const before = placed.find((other) => other.task.id === id);
                      const fromRow = rowIndexOf.get(id);
                      const toRow = rowIndexOf.get(row.task.id);
                      if (!before || fromRow === undefined || toRow === undefined) return [];
                      const x1 = sx(before.to);
                      const y1 = yOf(fromRow) + rowHeight / 2;
                      const x2 = sx(row.from) - (row.task.milestone ? bar / 2 : 0);
                      const y2 = yOf(toRow) + rowHeight / 2;
                      const bend = Math.max(x1 + 6, Math.min(x2 - 6, x1 + 10));
                      return [
                        <g key={`${id}>${row.task.id}`} className="stroke-muted-foreground" fill="none" strokeWidth={1.25}>
                          <path d={`M${x1},${y1} H${bend} V${y2} H${x2 - 1}`} />
                          <path d={`M${x2 - 6},${y2 - 4} L${x2 - 1},${y2} L${x2 - 6},${y2 + 4}`} />
                        </g>,
                      ];
                    }),
                  )}
                  {todayAt !== null ? (
                    <g>
                      <line x1={sx(todayAt)} x2={sx(todayAt)} y1={axis - 4} y2={measured - 4} className="stroke-foreground" strokeDasharray="3 3" />
                      <text x={sx(todayAt) + 4} y={measured - 8} className="fill-foreground text-xs">
                        {labels.today}
                      </text>
                    </g>
                  ) : null}
                  {current && shownRow >= 0 ? (
                    <rect x={1} y={yOf(shownRow) + 1} width={width - 2} height={rowHeight - 2} fill="none" className={cn("stroke-foreground", ROUND)} strokeWidth={2} />
                  ) : null}
                </g>
              </ChartSvg>
              {current && shownRow >= 0 ? (
                <ChartTooltip
                  x={Math.min(width - 20, sx(current.to))}
                  y={yOf(shownRow) + rowHeight / 2}
                  side={sx(current.to) > width * 0.6 ? "left" : "right"}
                  title={current.task.label}
                  rows={describe(current)}
                />
              ) : null}
            </>
          );
        }}
      </ChartContainer>
    </div>
  );
}
