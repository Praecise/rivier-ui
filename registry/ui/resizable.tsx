"use client";
/**
 * @name resizable
 * @category ui
 * @description Panels side by side (or stacked) with a handle between each pair that is dragged, or moved with the arrow keys, to share the space differently; Home and End go to the limits and Enter folds a panel away and back: the WAI-ARIA window splitter pattern.
 * @when Layouts whose parts the person sizes: a list beside a detail view, an editor beside its preview, a map beside its table. For a panel docked beside the whole page use dock; for two fixed columns use split.
 * @example
 * <ResizablePanelGroup defaultSizes={[30, 70]} aria-label="Mail">
 *   <ResizablePanel minSize={20} id="folders">Folders</ResizablePanel>
 *   <ResizableHandle aria-label="Resize the folders" />
 *   <ResizablePanel id="messages">Messages</ResizablePanel>
 * </ResizablePanelGroup>
 */
import { Children, cloneElement, createContext, isValidElement, use, useRef, type ComponentProps, type KeyboardEvent, type PointerEvent, type ReactElement, type RefObject } from "react";
import { cn } from "@/lib/cn";
import { useControllableState } from "@/lib/use-controllable-state";
import { isRtl } from "@/lib/direction";

type GroupContext = {
  direction: "horizontal" | "vertical";
  sizes: readonly number[];
  setSizes: (next: readonly number[]) => void;
  limits: { min: number; max: number }[];
  ids: (string | undefined)[];
  group: RefObject<HTMLDivElement | null>;
  step: number;
};

const Context = createContext<GroupContext | null>(null);

export type ResizablePanelGroupProps = Omit<ComponentProps<"div">, "defaultValue"> & {
  direction?: "horizontal" | "vertical";
  /** Each panel's share in percent, in order. Controlled with `onSizesChange`. */
  sizes?: readonly number[];
  defaultSizes?: readonly number[];
  onSizesChange?: (sizes: readonly number[]) => void;
  /** What an arrow key moves a handle by, in percent. Default 5. */
  step?: number;
};

/** Panels and handles, alternating, as its direct children. */
export function ResizablePanelGroup({ direction = "horizontal", sizes: sizesProp, defaultSizes, onSizesChange, step = 5, className, children, ...props }: ResizablePanelGroupProps) {
  const items = Children.toArray(children).filter(isValidElement) as ReactElement<Record<string, unknown>>[];
  const panels = items.filter((child) => child.type === ResizablePanel);
  const even = panels.map(() => 100 / Math.max(1, panels.length));
  const [sizes, setSizes] = useControllableState<readonly number[]>({ value: sizesProp, defaultValue: defaultSizes ?? even, onChange: onSizesChange });
  const group = useRef<HTMLDivElement>(null);
  const limits = panels.map((panel) => ({ min: Number(panel.props["minSize"] ?? 10), max: Number(panel.props["maxSize"] ?? 90) }));
  const ids = panels.map((panel) => panel.props["id"] as string | undefined);
  let panelIndex = 0;
  let handleIndex = 0;
  return (
    <Context value={{ direction, sizes, setSizes, limits, ids, group, step }}>
      <div ref={group} data-slot="resizable-panel-group" data-direction={direction} className={cn("flex size-full min-h-0 min-w-0", direction === "vertical" && "flex-col", className)} {...props}>
        {items.map((child) => {
          if (child.type === ResizablePanel) return cloneElement(child, { key: `p${panelIndex}`, index: panelIndex++ });
          if (child.type === ResizableHandle) return cloneElement(child, { key: `h${handleIndex}`, index: handleIndex++ });
          return child;
        })}
      </div>
    </Context>
  );
}

export type ResizablePanelProps = ComponentProps<"div"> & {
  /** The smallest share in percent. Default 10. */
  minSize?: number;
  /** The largest share in percent. Default 90. */
  maxSize?: number;
  /** Set by the group. */
  index?: number;
};

// minSize and maxSize are read by the group from the element's props; here they are only marked on the panel.
export function ResizablePanel({ className, style, index = 0, minSize, maxSize, ...props }: ResizablePanelProps) {
  const context = use(Context);
  const size = context?.sizes[index] ?? 50;
  return <div data-slot="resizable-panel" data-min-size={minSize} data-max-size={maxSize} className={cn("min-h-0 min-w-0 overflow-auto", className)} style={{ flexBasis: 0, flexGrow: size, flexShrink: 1, ...style }} {...props} />;
}

export type ResizableHandleProps = Omit<ComponentProps<"div">, "children"> & {
  /** Set by the group. */
  index?: number;
  /** Shown as a small grip in the middle of the line. Default true. */
  withGrip?: boolean;
};

/** The splitter between panel `index` and the next. Name it with `aria-label`: "Resize the folders". */
export function ResizableHandle({ className, index = 0, withGrip = true, ...props }: ResizableHandleProps) {
  const context = use(Context);
  const before = useRef<number | null>(null);
  if (!context) throw new Error("ResizableHandle must be inside a ResizablePanelGroup.");
  const { direction, sizes, setSizes, limits, ids, group, step } = context;
  const a = sizes[index] ?? 50;
  const b = sizes[index + 1] ?? 50;
  const pair = a + b;
  const low = Math.max(limits[index]?.min ?? 10, pair - (limits[index + 1]?.max ?? 90));
  const high = Math.min(limits[index]?.max ?? 90, pair - (limits[index + 1]?.min ?? 10));
  const place = (value: number): void => {
    const next = Math.max(low, Math.min(high, value));
    setSizes(sizes.map((size, i) => (i === index ? next : i === index + 1 ? pair - next : size)));
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const sign = direction === "horizontal" && isRtl(event.currentTarget) ? -1 : 1;
    const grow = direction === "horizontal" ? "ArrowRight" : "ArrowDown";
    const shrink = direction === "horizontal" ? "ArrowLeft" : "ArrowUp";
    if (event.key === grow) place(a + step * sign);
    else if (event.key === shrink) place(a - step * sign);
    else if (event.key === "Home") place(low);
    else if (event.key === "End") place(high);
    else if (event.key === "Enter") {
      // Fold the first panel to its smallest and back to where it was.
      if (a > low + 0.5) {
        before.current = a;
        place(low);
      } else place(before.current ?? pair / 2);
    } else return;
    event.preventDefault();
  };
  const onPointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    const box = group.current?.getBoundingClientRect();
    if (!box) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const total = direction === "horizontal" ? box.width : box.height;
    const start = direction === "horizontal" ? event.clientX : event.clientY;
    const sign = direction === "horizontal" && isRtl(event.currentTarget) ? -1 : 1;
    const origin = a;
    const move = (e: globalThis.PointerEvent): void => place(origin + (((direction === "horizontal" ? e.clientX : e.clientY) - start) / total) * 100 * sign);
    const up = (): void => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  return (
    <div
      data-slot="resizable-handle"
      role="separator"
      tabIndex={0}
      aria-orientation={direction === "horizontal" ? "vertical" : "horizontal"}
      aria-valuenow={Math.round(a)}
      aria-valuemin={Math.round(low)}
      aria-valuemax={Math.round(high)}
      aria-controls={ids[index]}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      className={cn(
        "group/handle relative flex shrink-0 touch-none items-center justify-center bg-border select-none",
        direction === "horizontal"
          ? "w-px cursor-col-resize before:absolute before:inset-y-0 before:-inset-x-2 before:content-['']"
          : "h-px cursor-row-resize before:absolute before:inset-x-0 before:-inset-y-2 before:content-['']",
        className,
      )}
      {...props}
    >
      {withGrip ? <span aria-hidden="true" className={cn("z-10 rounded-full border bg-background", direction === "horizontal" ? "h-6 w-2" : "h-2 w-6")} /> : null}
    </div>
  );
}
