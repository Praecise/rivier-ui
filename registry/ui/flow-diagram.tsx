"use client";
/**
 * @name flow-diagram
 * @category ui
 * @description A diagram of boxes joined by arrows that the person edits: nodes dragged or moved with the arrow keys, joined by pressing C and choosing the next node (or by pointer), removed with Delete, zoomed and panned; every change said aloud and the whole diagram also given as a list of steps and links.
 * @when Processes, pipelines and simple node graphs the person builds or rearranges: an approval flow, a data pipeline, a decision tree. For a graph to look at, laid out automatically, use network-graph; for stages with amounts use sankey-chart; for work moving between columns use kanban.
 * @example
 * const [nodes, setNodes] = useState([{ id: "a", label: "Order placed", x: 40, y: 60 }, { id: "b", label: "Paid", x: 260, y: 60 }]);
 * const [edges, setEdges] = useState([{ id: "a-b", source: "a", target: "b" }]);
 * <FlowDiagram aria-label="Order flow" nodes={nodes} edges={edges} onNodesChange={setNodes} onEdgesChange={setEdges} />
 */
import { Minus, Plus, RotateCcw } from "lucide-react";
import { useId, useRef, useState, type ComponentProps, type KeyboardEvent, type PointerEvent } from "react";
import { announce } from "@/lib/announce";
import { cn } from "@/lib/cn";
import { useControllableState } from "@/lib/use-controllable-state";

export type FlowNode = {
  id: string;
  label: string;
  x: number;
  y: number /** A short line under the label. */;
  note?: string /** "start" and "end" are drawn round. */;
  kind?: "step" | "start" | "end" | "decision";
};
export type FlowEdge = { id: string; source: string; target: string; label?: string };

export type FlowDiagramLabels = {
  diagram: string;
  node: string;
  help: string;
  connecting: (from: string) => string;
  connected: (from: string, to: string) => string;
  removed: (what: string) => string;
  moved: (node: string, x: number, y: number) => string;
  links: string;
  noLinks: string;
  linksFrom: (node: string, targets: string) => string;
  zoomIn: string;
  zoomOut: string;
  reset: string;
  cancelled: string;
};

const LABELS: FlowDiagramLabels = {
  diagram: "diagram",
  node: "step",
  help: "Tab moves between steps. Arrow keys move a step, with Shift further. C starts a link from the step; then Enter on another step ends it, Escape cancels. Delete removes a step and its links.",
  connecting: (from) => `Linking from ${from}: go to another step and press Enter, or Escape to cancel.`,
  connected: (from, to) => `${from} now leads to ${to}`,
  removed: (what) => `${what} removed`,
  moved: (node, x, y) => `${node} moved to ${x}, ${y}`,
  links: "Steps and links",
  noLinks: "leads nowhere",
  linksFrom: (node, targets) => `${node} leads to ${targets}`,
  zoomIn: "Zoom in",
  zoomOut: "Zoom out",
  reset: "Reset the view",
  cancelled: "Link cancelled",
};

export type FlowDiagramProps = Omit<ComponentProps<"div">, "defaultValue"> & {
  nodes?: readonly FlowNode[];
  defaultNodes?: readonly FlowNode[];
  onNodesChange?: (nodes: readonly FlowNode[]) => void;
  edges?: readonly FlowEdge[];
  defaultEdges?: readonly FlowEdge[];
  onEdgesChange?: (edges: readonly FlowEdge[]) => void;
  /** Nothing can be changed; the diagram can still be read, zoomed and panned. */
  readOnly?: boolean;
  /** The grid nodes snap to, in diagram units. Default 10. */
  grid?: number;
  /** Height in pixels. Default 360. */
  height?: number;
  labels?: Partial<FlowDiagramLabels>;
};

const NODE_W = 160;
const NODE_H = 56;
const EMPTY_NODES: readonly FlowNode[] = [];
const EMPTY_EDGES: readonly FlowEdge[] = [];

export function FlowDiagram({
  nodes: nodesProp,
  defaultNodes = EMPTY_NODES,
  onNodesChange,
  edges: edgesProp,
  defaultEdges = EMPTY_EDGES,
  onEdgesChange,
  readOnly = false,
  grid = 10,
  height = 360,
  labels: given,
  className,
  "aria-label": ariaLabel,
  ...props
}: FlowDiagramProps) {
  const labels = { ...LABELS, ...given };
  const [nodes, setNodes] = useControllableState<readonly FlowNode[]>({ value: nodesProp, defaultValue: defaultNodes, onChange: onNodesChange });
  const [edges, setEdges] = useControllableState<readonly FlowEdge[]>({ value: edgesProp, defaultValue: defaultEdges, onChange: onEdgesChange });
  const [view, setView] = useState({ k: 1, x: 0, y: 0 });
  const [selected, setSelected] = useState<string | null>(null);
  const [linkFrom, setLinkFrom] = useState<string | null>(null);
  const drag = useRef<{ id: string; dx: number; dy: number; moved: boolean } | null>(null);
  const pan = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const helpId = useId();
  const nameOf = (id: string): string => nodes.find((n) => n.id === id)?.label ?? id;
  const snap = (v: number): number => Math.round(v / grid) * grid;

  const moveNode = (id: string, x: number, y: number): void => setNodes(nodes.map((n) => (n.id === id ? { ...n, x: snap(x), y: snap(y) } : n)));
  const connect = (from: string, to: string): void => {
    setLinkFrom(null);
    if (from === to || edges.some((e) => e.source === from && e.target === to)) return;
    setEdges([...edges, { id: `${from}-${to}`, source: from, target: to }]);
    announce(labels.connected(nameOf(from), nameOf(to)));
  };
  const removeNode = (id: string): void => {
    const name = nameOf(id);
    setNodes(nodes.filter((n) => n.id !== id));
    setEdges(edges.filter((e) => e.source !== id && e.target !== id));
    announce(labels.removed(name));
    setSelected(null);
  };

  const onNodeKeyDown = (node: FlowNode, event: KeyboardEvent<SVGGElement>): void => {
    const step = (event.shiftKey ? 5 : 1) * grid;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const move = moves[event.key];
    if (move && !readOnly) {
      event.preventDefault();
      // The canvas is not mirrored in a right-to-left page: Right is always further right.
      const x = snap(node.x + move[0]);
      const y = snap(node.y + move[1]);
      moveNode(node.id, x, y);
      announce(labels.moved(node.label, x, y));
    } else if ((event.key === "c" || event.key === "C") && !readOnly) {
      event.preventDefault();
      setLinkFrom(node.id);
      announce(labels.connecting(node.label));
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (linkFrom && linkFrom !== node.id) connect(linkFrom, node.id);
      else setSelected(node.id);
    } else if (event.key === "Escape" && linkFrom) {
      event.preventDefault();
      setLinkFrom(null);
      announce(labels.cancelled);
    } else if ((event.key === "Delete" || event.key === "Backspace") && !readOnly) {
      event.preventDefault();
      removeNode(node.id);
    }
  };
  const local = (event: PointerEvent<Element>, svg: SVGSVGElement): { x: number; y: number } => {
    const box = svg.getBoundingClientRect();
    return { x: (event.clientX - box.left - view.x) / view.k, y: (event.clientY - box.top - view.y) / view.k };
  };
  const zoom = (factor: number): void => setView((v) => ({ ...v, k: Math.max(0.4, Math.min(2.5, v.k * factor)) }));

  const centre = (n: FlowNode): { x: number; y: number } => ({ x: n.x + NODE_W / 2, y: n.y + NODE_H / 2 });
  // A link leaves the side of the box facing its target and arrives at the side facing its source.
  const anchor = (from: FlowNode, to: FlowNode): { x: number; y: number } => {
    const a = centre(from);
    const b = centre(to);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (Math.abs(dx) * NODE_H > Math.abs(dy) * NODE_W) return { x: a.x + (Math.sign(dx) * NODE_W) / 2, y: a.y };
    return { x: a.x, y: a.y + (Math.sign(dy) * NODE_H) / 2 };
  };

  return (
    <div data-slot="flow-diagram" className={cn("relative w-full min-w-0 overflow-hidden rounded-surface border bg-card", className)} style={{ height }} {...props}>
      <svg
        role="application"
        aria-roledescription={labels.diagram}
        aria-label={ariaLabel}
        aria-describedby={helpId}
        direction="ltr"
        className="block size-full touch-none select-none"
        onPointerDown={(event) => {
          if (event.target !== event.currentTarget) return;
          setSelected(null);
          pan.current = { x: event.clientX, y: event.clientY, vx: view.x, vy: view.y };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const svg = event.currentTarget;
          if (drag.current) {
            const p = local(event, svg);
            drag.current.moved = true;
            moveNode(drag.current.id, p.x - drag.current.dx, p.y - drag.current.dy);
          } else if (pan.current) {
            const start = pan.current;
            setView((v) => ({ ...v, x: start.vx + event.clientX - start.x, y: start.vy + event.clientY - start.y }));
          }
        }}
        onPointerUp={() => {
          drag.current = null;
          pan.current = null;
        }}
      >
        <defs>
          <marker id={`${helpId}-arrow`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" className="fill-muted-foreground" />
          </marker>
          <pattern id={`${helpId}-dots`} width={grid * 2} height={grid * 2} patternUnits="userSpaceOnUse">
            <circle cx={1} cy={1} r={1} className="fill-border" />
          </pattern>
        </defs>
        <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
          <rect x={-5000} y={-5000} width={10000} height={10000} fill={`url(#${helpId}-dots)`} pointerEvents="none" />
          <g aria-hidden="true">
            {edges.map((edge) => {
              const from = nodes.find((n) => n.id === edge.source);
              const to = nodes.find((n) => n.id === edge.target);
              if (!from || !to) return null;
              const a = anchor(from, to);
              const b = anchor(to, from);
              const mx = (a.x + b.x) / 2;
              const horizontal = Math.abs(b.x - a.x) > Math.abs(b.y - a.y);
              const d = horizontal ? `M${a.x},${a.y} C${mx},${a.y} ${mx},${b.y} ${b.x},${b.y}` : `M${a.x},${a.y} C${a.x},${(a.y + b.y) / 2} ${b.x},${(a.y + b.y) / 2} ${b.x},${b.y}`;
              const lit = selected === edge.source || selected === edge.target;
              return (
                <g key={edge.id}>
                  <path d={d} fill="none" className={lit ? "stroke-foreground" : "stroke-muted-foreground"} strokeWidth={lit ? 2 : 1.5} markerEnd={`url(#${helpId}-arrow)`} />
                  {edge.label ? (
                    <text x={mx} y={(a.y + b.y) / 2 - 6} textAnchor="middle" className="fill-muted-foreground stroke-card text-xs" paintOrder="stroke" strokeWidth={4}>
                      {edge.label}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </g>
          {nodes.map((node) => {
            const isSelected = selected === node.id;
            const isSource = linkFrom === node.id;
            const round = node.kind === "start" || node.kind === "end";
            return (
              <g
                key={node.id}
                data-slot="flow-diagram-node"
                role="group"
                aria-roledescription={labels.node}
                aria-label={`${node.label}${node.note ? `, ${node.note}` : ""}`}
                tabIndex={0}
                transform={`translate(${node.x},${node.y})`}
                className="cursor-grab outline-none focus-visible:[&>rect:first-of-type]:stroke-ring focus-visible:[&>rect:first-of-type]:[stroke-width:3]"
                onKeyDown={(event) => onNodeKeyDown(node, event)}
                onFocus={() => setSelected(node.id)}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  const svg = event.currentTarget.ownerSVGElement;
                  if (!svg) return;
                  if (linkFrom && linkFrom !== node.id) {
                    connect(linkFrom, node.id);
                    return;
                  }
                  setSelected(node.id);
                  if (readOnly) return;
                  const p = local(event, svg);
                  drag.current = { id: node.id, dx: p.x - node.x, dy: p.y - node.y, moved: false };
                  svg.setPointerCapture(event.pointerId);
                }}
              >
                <rect
                  width={NODE_W}
                  height={NODE_H}
                  className={cn(
                    isSelected ? "fill-highlight-soft stroke-foreground" : "fill-card stroke-border-strong",
                    round ? "[rx:28px]" : node.kind === "decision" ? "[rx:0]" : "[rx:min(var(--radius),10px)]",
                  )}
                  strokeWidth={isSelected ? 2 : 1}
                  strokeDasharray={isSource ? "4 3" : undefined}
                />
                <text x={NODE_W / 2} y={node.note ? NODE_H / 2 - 6 : NODE_H / 2} dy="0.32em" textAnchor="middle" className="fill-foreground text-sm font-medium" pointerEvents="none">
                  {node.label.length > 20 ? `${node.label.slice(0, 19)}…` : node.label}
                </text>
                {node.note ? (
                  <text x={NODE_W / 2} y={NODE_H / 2 + 12} dy="0.32em" textAnchor="middle" className="fill-muted-foreground text-xs" pointerEvents="none">
                    {node.note.length > 26 ? `${node.note.slice(0, 25)}…` : node.note}
                  </text>
                ) : null}
                {!readOnly ? (
                  <circle
                    cx={NODE_W}
                    cy={NODE_H / 2}
                    r={6}
                    className="fill-background stroke-foreground"
                    onPointerDown={(event) => {
                      // The handle starts a link: the next node pressed is its end.
                      event.stopPropagation();
                      setLinkFrom(node.id);
                      announce(labels.connecting(node.label));
                    }}
                  />
                ) : null}
              </g>
            );
          })}
        </g>
      </svg>
      <span id={helpId} className="sr-only">
        {readOnly ? "" : labels.help}
      </span>
      <div className="absolute end-2 top-2 flex flex-col overflow-hidden rounded-control border bg-background">
        <button type="button" aria-label={labels.zoomIn} onClick={() => zoom(1.25)} className="flex size-9 items-center justify-center hover:bg-accent pointer-coarse:size-11">
          <Plus aria-hidden="true" className="size-4" />
        </button>
        <button type="button" aria-label={labels.zoomOut} onClick={() => zoom(0.8)} className="flex size-9 items-center justify-center border-y hover:bg-accent pointer-coarse:size-11">
          <Minus aria-hidden="true" className="size-4" />
        </button>
        <button type="button" aria-label={labels.reset} onClick={() => setView({ k: 1, x: 0, y: 0 })} className="flex size-9 items-center justify-center hover:bg-accent pointer-coarse:size-11">
          <RotateCcw aria-hidden="true" className="size-4" />
        </button>
      </div>
      <div className="sr-only">
        <h4>{labels.links}</h4>
        <ul data-slot="flow-diagram-list">
          {nodes.map((node) => {
            const targets = edges.filter((e) => e.source === node.id).map((e) => nameOf(e.target));
            return <li key={node.id}>{targets.length > 0 ? labels.linksFrom(node.label, targets.join(", ")) : `${node.label}: ${labels.noLinks}`}</li>;
          })}
        </ul>
      </div>
    </div>
  );
}
