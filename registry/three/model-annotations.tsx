"use client";
/**
 * @name model-annotations
 * @category three
 * @description Labels pinned to points on a 3D model that follow them as the model turns, each a button that opens its note, hidden while its point is behind the camera or out of view; the same notes are always given as a list, so nobody has to find them by turning.
 * @when Pointing out parts of a 3D object: the parts of a machine, features of a building, finds on a scan. Put the tracker inside the scene and the labels over it, in the same positioned box. For a flat picture use hotspots; for a model with no notes use model-viewer.
 * @example
 * const store = useAnnotationStore();
 * <div className="relative">
 *   <Scene label="A vase" aspect={1}>
 *     <ModelStage><Vase /></ModelStage>
 *     <ModelAnnotationTracker store={store} points={[{ id: "handle", position: [0.6, 0.4, 0] }]} />
 *   </Scene>
 *   <ModelAnnotations store={store} annotations={[{ id: "handle", label: "Handle", note: "Added later, in a darker clay." }]} />
 * </div>
 */
import { useFrame, useThree } from "@react-three/fiber";
import { useRef, useState, type ComponentProps } from "react";
import { Vector3 } from "three";
import { cn } from "@/lib/cn";

/** Connects the tracker in the canvas to the labels on the page: the tracker writes each label's place straight onto it every frame. */
export type AnnotationStore = { elements: Map<string, HTMLElement> };

/** A store for one set of annotations. */
export function useAnnotationStore(): AnnotationStore {
  const [store] = useState<AnnotationStore>(() => ({ elements: new Map() }));
  return store;
}

export type AnnotationPoint = { id: string; position: readonly [number, number, number] };

/** Inside the scene: projects each point to the canvas every frame and moves its label there. */
export function ModelAnnotationTracker({ store, points }: { store: AnnotationStore; points: readonly AnnotationPoint[] }) {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const scratch = useRef(new Vector3());
  useFrame(() => {
    for (const point of points) {
      const element = store.elements.get(point.id);
      if (!element) continue;
      const v = scratch.current.set(point.position[0], point.position[1], point.position[2]);
      // The point in the camera's space: behind the camera when z is past 1 after projection.
      v.project(camera);
      const visible = v.z < 1 && Math.abs(v.x) <= 1.05 && Math.abs(v.y) <= 1.05;
      element.style.transform = `translate(${((v.x + 1) / 2) * size.width}px, ${((1 - v.y) / 2) * size.height}px) translate(-50%, -50%)`;
      element.dataset["hidden"] = visible ? "false" : "true";
    }
  });
  return null;
}

export type ModelAnnotation = { id: string; label: string; note?: string };

export type ModelAnnotationsProps = Omit<ComponentProps<"div">, "children"> & {
  store: AnnotationStore;
  annotations: readonly ModelAnnotation[];
  /** The heading of the list of notes. Default "Notes". */
  listLabel?: string;
};

/** Over the scene: a button per point, and under it the same notes as a list. */
export function ModelAnnotations({ store, annotations, listLabel = "Notes", className, ...props }: ModelAnnotationsProps) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <>
      <div data-slot="model-annotations" aria-hidden="true" className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} {...props}>
        {annotations.map((annotation, index) => (
          <div
            key={annotation.id}
            ref={(node) => {
              if (node) store.elements.set(annotation.id, node);
              else store.elements.delete(annotation.id);
            }}
            data-hidden="true"
            // Placed from the canvas's own left edge: the projection is in screen pixels, which do not mirror.
            className="pointer-events-auto absolute left-0 top-0 transition-opacity duration-instant data-[hidden=true]:pointer-events-none data-[hidden=true]:opacity-0 motion-reduce:transition-none"
          >
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setOpen(open === annotation.id ? null : annotation.id)}
              className="flex items-center gap-1.5 rounded-control border bg-background px-2 py-1 text-xs font-medium"
            >
              <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground tabular-nums">{index + 1}</span>
              {annotation.label}
            </button>
            {open === annotation.id && annotation.note ? <p className="mt-1 max-w-56 rounded-surface border bg-popover p-2 text-xs text-popover-foreground">{annotation.note}</p> : null}
          </div>
        ))}
      </div>
      <ol data-slot="model-annotations-list" aria-label={listLabel} className="mt-3 flex flex-col gap-1 text-sm">
        {annotations.map((annotation, index) => (
          <li key={annotation.id} className="flex gap-2">
            <span aria-hidden="true" className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground tabular-nums">
              {index + 1}
            </span>
            <span>
              <span className="font-medium">{annotation.label}</span>
              {annotation.note ? <span className="text-muted-foreground"> — {annotation.note}</span> : null}
            </span>
          </li>
        ))}
      </ol>
    </>
  );
}
