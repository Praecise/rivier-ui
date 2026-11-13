"use client";
/**
 * @name image-annotator
 * @category ui
 * @description A picture on which areas are marked and named: drawn by dragging, or added with a button and placed with the keys (arrows move, plus and minus resize, Delete removes), each named in a list beside the picture; areas come out as fractions of the picture, every change said aloud.
 * @when Labelling what is in a picture: damage on a photo, rooms on a plan, objects for training a model, notes on a design. For cutting a picture use image-cropper; for named points that play at moments of a video use hotspots.
 * @example
 * <ImageAnnotator src="/plan.png" alt="Ground floor plan" defaultAreas={[{ id: "a", x: 0.1, y: 0.2, width: 0.3, height: 0.25, label: "Kitchen" }]} onAreasChange={save} />
 */
import { Plus, Trash2 } from "lucide-react";
import { useId, useRef, useState, type ComponentProps, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { announce } from "@/lib/announce";
import { cn } from "@/lib/cn";
import { useControllableState } from "@/lib/use-controllable-state";
import { chartSeries } from "@/components/viz/chart";

/** A marked area as fractions of the picture's width and height, from its top left. */
export type ImageArea = { id: string; x: number; y: number; width: number; height: number; label: string };

export type ImageAnnotatorLabels = {
  areas: string;
  add: string;
  remove: (label: string) => string;
  name: (index: number) => string;
  unnamed: (index: number) => string;
  help: string;
  added: (label: string) => string;
  removed: (label: string) => string;
  area: string;
};

const LABELS: ImageAnnotatorLabels = {
  areas: "Marked areas",
  add: "Add an area",
  remove: (label) => `Remove ${label}`,
  name: (index) => `Name of area ${index}`,
  unnamed: (index) => `Area ${index}`,
  help: "Arrow keys move the area, with Shift further; plus and minus resize it; Delete removes it.",
  added: (label) => `${label} added`,
  removed: (label) => `${label} removed`,
  area: "area",
};

export type ImageAnnotatorProps = Omit<ComponentProps<"div">, "defaultValue" | "onChange"> & {
  src: string;
  alt: string;
  areas?: readonly ImageArea[];
  defaultAreas?: readonly ImageArea[];
  onAreasChange?: (areas: readonly ImageArea[]) => void;
  /** Areas can be looked at but not changed. */
  readOnly?: boolean;
  /** Draws the picture: the framework's image component. */
  renderImage?: (props: { src: string; alt: string; className: string; draggable: false }) => ReactNode;
  labels?: Partial<ImageAnnotatorLabels>;
};

const MIN = 0.03;
/** Literal class names, so Tailwind finds them: the series colours as borders. */
const BORDERS = ["border-chart-1", "border-chart-2", "border-chart-3", "border-chart-4", "border-chart-5"] as const;
const clamp = (a: ImageArea): ImageArea => {
  const width = Math.max(MIN, Math.min(1, a.width));
  const height = Math.max(MIN, Math.min(1, a.height));
  return { ...a, width, height, x: Math.max(0, Math.min(1 - width, a.x)), y: Math.max(0, Math.min(1 - height, a.y)) };
};

export function ImageAnnotator({ src, alt, areas: areasProp, defaultAreas = [], onAreasChange, readOnly = false, renderImage, labels: given, className, ...props }: ImageAnnotatorProps) {
  const labels = { ...LABELS, ...given };
  const [areas, setAreas] = useControllableState<readonly ImageArea[]>({ value: areasProp, defaultValue: defaultAreas, onChange: onAreasChange });
  const [active, setActive] = useState<string | null>(null);
  const frame = useRef<HTMLDivElement>(null);
  const boxes = useRef(new Map<string, HTMLDivElement | null>());
  const drawing = useRef<{ id: string; x: number; y: number } | null>(null);
  const moving = useRef<{ id: string; x: number; y: number; from: ImageArea } | null>(null);
  const helpId = useId();
  const counter = useRef(areas.length);
  const nameOf = (area: ImageArea, index: number): string => area.label || labels.unnamed(index + 1);
  const update = (id: string, change: (a: ImageArea) => ImageArea): void => setAreas(areas.map((a) => (a.id === id ? clamp(change(a)) : a)));
  const newId = (): string => {
    counter.current += 1;
    return `${helpId}-area-${counter.current}`;
  };
  const remove = (id: string): void => {
    const index = areas.findIndex((a) => a.id === id);
    const area = areas[index];
    setAreas(areas.filter((a) => a.id !== id));
    if (area) announce(labels.removed(nameOf(area, index)));
    setActive(null);
  };
  const fraction = (event: PointerEvent<HTMLElement>): { x: number; y: number } => {
    const box = frame.current?.getBoundingClientRect();
    if (!box) return { x: 0, y: 0 };
    return { x: Math.max(0, Math.min(1, (event.clientX - box.left) / box.width)), y: Math.max(0, Math.min(1, (event.clientY - box.top) / box.height)) };
  };
  const onBoxKeyDown = (area: ImageArea, event: KeyboardEvent<HTMLDivElement>): void => {
    if (readOnly) return;
    const step = event.shiftKey ? 0.05 : 0.01;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const move = moves[event.key];
    const grow = event.key === "+" || event.key === "=" ? 0.02 : event.key === "-" || event.key === "_" ? -0.02 : 0;
    if (move) {
      event.preventDefault();
      update(area.id, (a) => ({ ...a, x: a.x + move[0], y: a.y + move[1] }));
    } else if (grow !== 0) {
      event.preventDefault();
      update(area.id, (a) => ({ x: a.x - grow / 2, y: a.y - grow / 2, width: a.width + grow, height: a.height + grow, id: a.id, label: a.label }));
    } else if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      remove(area.id);
    }
  };

  return (
    <div data-slot="image-annotator" className={cn("@container grid w-full min-w-0 gap-4 @2xl:grid-cols-[minmax(0,1fr)_16rem]", className)} {...props}>
      <div
        ref={frame}
        dir="ltr"
        className={cn("relative touch-none overflow-hidden rounded-surface border select-none", !readOnly && "cursor-crosshair")}
        onPointerDown={(event) => {
          if (readOnly || event.target !== event.currentTarget.querySelector("[data-slot=image-annotator-surface]")) return;
          const p = fraction(event);
          const id = newId();
          drawing.current = { id, x: p.x, y: p.y };
          event.currentTarget.setPointerCapture(event.pointerId);
          setAreas([...areas, { id, x: p.x, y: p.y, width: MIN, height: MIN, label: "" }]);
          setActive(id);
        }}
        onPointerMove={(event) => {
          const p = fraction(event);
          if (drawing.current) {
            const d = drawing.current;
            update(d.id, (a) => ({ ...a, x: Math.min(d.x, p.x), y: Math.min(d.y, p.y), width: Math.abs(p.x - d.x), height: Math.abs(p.y - d.y) }));
          } else if (moving.current) {
            const m = moving.current;
            update(m.id, () => ({ ...m.from, x: m.from.x + p.x - m.x, y: m.from.y + p.y - m.y }));
          }
        }}
        onPointerUp={() => {
          if (drawing.current) {
            const id = drawing.current.id;
            const index = areas.findIndex((a) => a.id === id);
            announce(labels.added(labels.unnamed(index + 1)));
          }
          drawing.current = null;
          moving.current = null;
        }}
      >
        {renderImage ? (
          renderImage({ src, alt, className: "block h-auto w-full", draggable: false })
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- The library is not tied to one framework: the default is the plain element, and `renderImage` takes the framework's image component.
          <img src={src} alt={alt} className="block h-auto w-full" draggable={false} />
        )}
        <div data-slot="image-annotator-surface" className="absolute inset-0" />
        {areas.map((area, index) => {
          return (
            <div
              key={area.id}
              ref={(node) => {
                boxes.current.set(area.id, node);
              }}
              data-slot="image-annotator-area"
              role="group"
              aria-roledescription={labels.area}
              aria-label={nameOf(area, index)}
              aria-describedby={readOnly ? undefined : helpId}
              tabIndex={0}
              onFocus={() => setActive(area.id)}
              onKeyDown={(event) => onBoxKeyDown(area, event)}
              onPointerDown={(event) => {
                if (readOnly) return;
                event.stopPropagation();
                const p = fraction(event);
                moving.current = { id: area.id, x: p.x, y: p.y, from: area };
                frame.current?.setPointerCapture(event.pointerId);
                setActive(area.id);
              }}
              className={cn("absolute border-2", BORDERS[index % 5], active === area.id ? "outline-2 outline-offset-1 outline-foreground" : "", !readOnly && "cursor-move")}
              style={{ left: `${area.x * 100}%`, top: `${area.y * 100}%`, width: `${area.width * 100}%`, height: `${area.height * 100}%` }}
            >
              <span
                aria-hidden="true"
                className={cn("absolute -top-px start-0 max-w-full -translate-y-full truncate rounded-t-[min(var(--radius),4px)] border-2 border-b-0 bg-background px-1.5 text-xs text-foreground", BORDERS[index % 5])}
              >
                {index + 1}. {area.label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <h3 className="text-sm font-medium">{labels.areas}</h3>
        <ol className="flex flex-col gap-2">
          {areas.map((area, index) => (
            <li key={area.id} className={cn("flex items-center gap-2 rounded-control", active === area.id && "bg-highlight-soft")}>
              <span aria-hidden="true" className={cn("size-3 shrink-0 rounded-[min(var(--radius),3px)]", chartSeries(index % 5).background)} />
              <input
                aria-label={labels.name(index + 1)}
                value={area.label}
                readOnly={readOnly}
                onFocus={() => setActive(area.id)}
                onChange={(event) => setAreas(areas.map((a) => (a.id === area.id ? { ...a, label: event.target.value } : a)))}
                placeholder={labels.unnamed(index + 1)}
                className="h-control-sm min-w-0 flex-1 rounded-control border border-input bg-background px-2 text-sm pointer-coarse:h-control"
              />
              {!readOnly ? (
                <button
                  type="button"
                  aria-label={labels.remove(nameOf(area, index))}
                  onClick={() => remove(area.id)}
                  className="flex size-8 shrink-0 items-center justify-center rounded-control text-muted-foreground hover:bg-accent pointer-coarse:size-10"
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
              ) : null}
            </li>
          ))}
        </ol>
        {!readOnly ? (
          <button
            type="button"
            onClick={() => {
              const id = newId();
              const label = labels.unnamed(areas.length + 1);
              setAreas([...areas, { id, x: 0.35, y: 0.35, width: 0.3, height: 0.3, label: "" }]);
              setActive(id);
              announce(labels.added(label));
              requestAnimationFrame(() => boxes.current.get(id)?.focus());
            }}
            className="inline-flex h-control-sm items-center gap-1.5 self-start rounded-control border border-border-strong px-3 text-sm hover:bg-accent pointer-coarse:h-control"
          >
            <Plus aria-hidden="true" className="size-4" />
            {labels.add}
          </button>
        ) : null}
        <span id={helpId} className="sr-only">
          {labels.help}
        </span>
      </div>
    </div>
  );
}
