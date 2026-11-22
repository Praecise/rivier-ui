"use client";
/**
 * @name image-cropper
 * @category ui
 * @description A picture with a frame over it that chooses the part to keep: dragged or resized by its corners, or moved with the arrow keys and resized with plus and minus, optionally held to a shape (square, 16:9); the choice comes out as fractions and as pixels of the original.
 * @when Cropping an avatar, a cover picture, a product photo before upload. The cutting itself is the project's (a canvas, the server); this gives the rectangle. For marking areas on a picture use image-annotator; for comparing two pictures use compare-slider.
 * @example
 * <ImageCropper src="/photo.jpg" alt="The harbour at dawn" aspect={1} onCropChange={(crop) => setCrop(crop.pixels)} />
 */
import { useId, useRef, useState, type ComponentProps, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { announce } from "@/lib/announce";
import { cn } from "@/lib/cn";
import { useControllableState } from "@/lib/use-controllable-state";

/** A rectangle as fractions of the picture's width and height, from its top left. */
export type CropRect = { x: number; y: number; width: number; height: number };
export type Crop = { fractions: CropRect; pixels: CropRect };

export type ImageCropperLabels = { area: string; help: string; size: (width: number, height: number) => string };
const LABELS: ImageCropperLabels = {
  area: "Crop area",
  help: "Arrow keys move the area, with Shift further. Plus and minus make it larger or smaller.",
  size: (width, height) => `${width} by ${height} pixels`,
};

export type ImageCropperProps = Omit<ComponentProps<"div">, "defaultValue" | "onChange"> & {
  src: string;
  alt: string;
  /** Width / height the area keeps. Left out, any shape. */
  aspect?: number;
  value?: CropRect;
  defaultValue?: CropRect;
  /** Called with the area as fractions and as pixels of the original picture. */
  onCropChange?: (crop: Crop) => void;
  /** Draws the picture: the framework's image component. It must pass `onLoad` through. */
  renderImage?: (props: { src: string; alt: string; className: string; onLoad: (event: { currentTarget: HTMLImageElement }) => void; draggable: false }) => ReactNode;
  labels?: Partial<ImageCropperLabels>;
};

const MIN = 0.05;

export function ImageCropper({ src, alt, aspect, value, defaultValue, onCropChange, renderImage, labels: given, className, ...props }: ImageCropperProps) {
  const labels = { ...LABELS, ...given };
  const [natural, setNatural] = useState({ width: 0, height: 0 });
  const start: CropRect = defaultValue ?? { x: 0.1, y: 0.1, width: 0.8, height: 0.8 };
  const pixelsOf = (r: CropRect): CropRect => ({
    x: Math.round(r.x * natural.width),
    y: Math.round(r.y * natural.height),
    width: Math.round(r.width * natural.width),
    height: Math.round(r.height * natural.height),
  });
  const [crop, setCrop] = useControllableState<CropRect>({ value, defaultValue: start, onChange: (next) => onCropChange?.({ fractions: next, pixels: pixelsOf(next) }) });
  const frame = useRef<HTMLDivElement>(null);
  const drag = useRef<{ mode: "move" | "nw" | "ne" | "sw" | "se"; x: number; y: number; from: CropRect } | null>(null);
  const helpId = useId();
  // The shape in fractions: the picture's own shape changes what a square is.
  const ratio = aspect && natural.width > 0 ? (aspect * natural.height) / natural.width : undefined;

  const fit = (r: CropRect): CropRect => {
    let { width, height } = r;
    width = Math.max(MIN, Math.min(1, width));
    height = Math.max(MIN, Math.min(1, height));
    if (ratio) {
      height = width / ratio;
      if (height > 1) {
        height = 1;
        width = ratio;
      }
    }
    return { x: Math.max(0, Math.min(1 - width, r.x)), y: Math.max(0, Math.min(1 - height, r.y)), width, height };
  };
  const set = (next: CropRect): void => setCrop(fit(next));

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const step = event.shiftKey ? 0.1 : 0.01;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const move = moves[event.key];
    // Plus and minus resize about the centre. (Alt with an arrow is the browser's Back and Forward.)
    const grow = event.key === "+" || event.key === "=" ? 0.02 : event.key === "-" || event.key === "_" ? -0.02 : 0;
    if (!move && grow === 0) return;
    event.preventDefault();
    // The picture is not mirrored in a right-to-left page, so Right is always right.
    const next = move ? fit({ ...crop, x: crop.x + move[0], y: crop.y + move[1] }) : fit({ x: crop.x - grow / 2, y: crop.y - grow / 2, width: crop.width + grow, height: crop.height + grow });
    setCrop(next);
    if (grow !== 0) {
      const px = pixelsOf(next);
      announce(labels.size(px.width, px.height));
    }
  };
  const onPointerDown = (mode: "move" | "nw" | "ne" | "sw" | "se", event: PointerEvent<HTMLElement>): void => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { mode, x: event.clientX, y: event.clientY, from: crop };
  };
  const onPointerMove = (event: PointerEvent<HTMLElement>): void => {
    const box = frame.current?.getBoundingClientRect();
    const d = drag.current;
    if (!box || !d) return;
    const dx = (event.clientX - d.x) / box.width;
    const dy = (event.clientY - d.y) / box.height;
    const f = d.from;
    if (d.mode === "move") set({ ...f, x: f.x + dx, y: f.y + dy });
    else {
      const west = d.mode === "nw" || d.mode === "sw";
      const north = d.mode === "nw" || d.mode === "ne";
      const width = f.width + (west ? -dx : dx);
      const height = ratio ? width / ratio : f.height + (north ? -dy : dy);
      set({ x: west ? f.x + f.width - width : f.x, y: north ? f.y + f.height - height : f.y, width, height });
    }
  };
  const px = pixelsOf(crop);
  const pct = (n: number): string => `${n * 100}%`;
  const image = {
    src,
    alt,
    className: "block h-auto w-full select-none",
    draggable: false as const,
    onLoad: (event: { currentTarget: HTMLImageElement }) => setNatural({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight }),
  };

  return (
    <div data-slot="image-cropper" className={cn("relative w-full min-w-0 touch-none overflow-hidden rounded-surface border", className)} dir="ltr" {...props}>
      <div ref={frame} className="relative" onPointerMove={onPointerMove} onPointerUp={() => {
          drag.current = null;
        }}>
        {renderImage ? (
          renderImage(image)
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- The library is not tied to one framework: the default is the plain element, and `renderImage` takes the framework's image component.
          <img {...image} />
        )}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-0 top-0 bg-overlay" style={{ height: pct(crop.y) }} />
          <div className="absolute inset-x-0 bottom-0 bg-overlay" style={{ height: pct(1 - crop.y - crop.height) }} />
          <div className="absolute bg-overlay" style={{ top: pct(crop.y), height: pct(crop.height), left: 0, width: pct(crop.x) }} />
          <div className="absolute bg-overlay" style={{ top: pct(crop.y), height: pct(crop.height), right: 0, width: pct(1 - crop.x - crop.width) }} />
        </div>
        <div
          data-slot="image-cropper-area"
          role="group"
          aria-roledescription={labels.area}
          aria-label={`${labels.area}: ${labels.size(px.width, px.height)}`}
          aria-describedby={helpId}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onPointerDown={(event) => onPointerDown("move", event)}
          className="absolute cursor-move border-2 border-background outline-1 outline-foreground focus-visible:outline-2 focus-visible:outline-ring"
          style={{ left: pct(crop.x), top: pct(crop.y), width: pct(crop.width), height: pct(crop.height) }}
        >
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
            {Array.from({ length: 9 }, (_, i) => (
              <span key={i} className="border-background/50 [&:not(:nth-child(3n))]:border-e [&:nth-child(-n+6)]:border-b" />
            ))}
          </span>
          {(["nw", "ne", "sw", "se"] as const).map((corner) => (
            <span
              key={corner}
              aria-hidden="true"
              onPointerDown={(event) => onPointerDown(corner, event)}
              className={cn(
                "absolute size-5 rounded-full border-2 border-foreground bg-background pointer-coarse:size-7",
                corner[0] === "n" ? "-top-2.5" : "-bottom-2.5",
                corner[1] === "w" ? "-left-2.5" : "-right-2.5",
                corner === "nw" || corner === "se" ? "cursor-nwse-resize" : "cursor-nesw-resize",
              )}
            />
          ))}
        </div>
      </div>
      <span id={helpId} className="sr-only">
        {labels.help}
      </span>
    </div>
  );
}
