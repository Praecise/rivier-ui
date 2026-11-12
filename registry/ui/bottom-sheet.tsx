"use client";
/**
 * @name bottom-sheet
 * @category ui
 * @description A panel that rises from the bottom edge, rests at one of several heights (snap points), and can be dragged between them or down to dismiss, with a keyboard handle that does the same.
 * @when Phones first: details, filters, a picker or a secondary task that should stay within reach of the thumb and may be peeked at before it is opened fully. With `modal={false}` it stays open while the page behind is used (a player, a route summary). For a panel from a side edge, or one with no snap points on a desktop, use sheet; for a short decision use dialog; beside the content on wide screens use dock. Always give it a BottomSheetTitle (add className="sr-only" to hide it). Opened by state with no BottomSheetTrigger, focus does not return on close: refocus the opener in `onCloseAutoFocus` on BottomSheetContent.
 * @example
 * <BottomSheet snapPoints={[0.4, 0.9]}>
 *   <BottomSheetTrigger asChild><Button variant="outline">Details</Button></BottomSheetTrigger>
 *   <BottomSheetContent>
 *     <BottomSheetHandle />
 *     <BottomSheetHeader>
 *       <BottomSheetTitle>Saturday</BottomSheetTitle>
 *       <BottomSheetDescription>Three things planned.</BottomSheetDescription>
 *     </BottomSheetHeader>
 *     <BottomSheetBody>…</BottomSheetBody>
 *     <BottomSheetFooter>
 *       <BottomSheetClose asChild><Button>Done</Button></BottomSheetClose>
 *     </BottomSheetFooter>
 *   </BottomSheetContent>
 * </BottomSheet>
 *
 * // Controlled, in pixels and rems, staying open while the page is used
 * <BottomSheet open={open} onOpenChange={setOpen} snapPoints={["6rem", "320px", 1]} snap={snap} onSnapChange={setSnap} modal={false} dismissible={false}>
 *   …
 * </BottomSheet>
 */
import { Dialog as SheetPrimitive } from "radix-ui";
import { createContext, use, useEffect, useRef, type ComponentProps, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useControllableState } from "@/lib/use-controllable-state";

/**
 * A height the sheet rests at: a number is a fraction of the viewport height (0.5 is half), a string is any
 * CSS length ("320px", "20rem"). The sheet is never taller than the viewport, whatever is asked.
 */
export type BottomSheetSnap = number | string;

const snapCss = (snap: BottomSheetSnap): string => (typeof snap === "number" ? `${snap * 100}dvh` : snap);

/** A snap point in pixels, measured by the browser so that any CSS length works. */
function snapPx(snap: BottomSheetSnap): number {
  if (typeof snap === "number") return snap * window.innerHeight;
  const probe = document.createElement("div");
  probe.style.cssText = "position:fixed;visibility:hidden;pointer-events:none;inset-block-start:0;inline-size:0";
  probe.style.height = snap;
  document.body.append(probe);
  const height = probe.getBoundingClientRect().height;
  probe.remove();
  return height;
}

type SheetContextValue = {
  snapPoints: BottomSheetSnap[];
  /** The index of the snap point the sheet rests at. 0 when there are none. */
  index: number;
  setIndex: (index: number) => void;
  modal: boolean;
  dismissible: boolean;
  close: () => void;
};

const SheetContext = createContext<SheetContextValue | null>(null);

function useSheet(part: string): SheetContextValue {
  const context = use(SheetContext);
  if (!context) throw new Error(`<${part}> must be used inside <BottomSheet>.`);
  return context;
}

/** Moving the sheet by hand: the handle drives it with a pointer, the body with a finger. */
type DragEngine = {
  begin: (y: number) => void;
  move: (y: number) => void;
  /** Lets go. Returns how far the sheet was moved, in pixels, so that a press without a drag can be told apart. */
  end: () => number;
};

const DragContext = createContext<DragEngine | null>(null);

export type BottomSheetProps = {
  children?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /**
   * The heights the sheet rests at, lowest first. Left out, the sheet is as tall as its content and has one
   * position. The sheet opens at the first one.
   */
  snapPoints?: BottomSheetSnap[];
  /** The controlled snap point: one of `snapPoints`. */
  snap?: BottomSheetSnap;
  /** The snap point it opens at when uncontrolled. Default: the first. */
  defaultSnap?: BottomSheetSnap;
  onSnapChange?: (snap: BottomSheetSnap) => void;
  /** true (default): a veil covers the page and focus stays in the sheet. false: the page behind stays usable. */
  modal?: boolean;
  /** false: Escape, a press outside and a drag down do not close it; only a BottomSheetClose or the state does. */
  dismissible?: boolean;
};

export function BottomSheet({ children, open, defaultOpen = false, onOpenChange, snapPoints, snap, defaultSnap, onSnapChange, modal = true, dismissible = true }: BottomSheetProps) {
  const points = snapPoints ?? [];
  const [isOpen, setOpen] = useControllableState({ value: open, defaultValue: defaultOpen, onChange: onOpenChange });
  const [active, setActive] = useControllableState<BottomSheetSnap | null>({
    value: snap,
    defaultValue: defaultSnap ?? points[0] ?? null,
    onChange: (next) => {
      if (next !== null) onSnapChange?.(next);
    },
  });
  const index = Math.max(
    0,
    points.findIndex((point) => point === active),
  );

  return (
    <SheetContext
      value={{
        snapPoints: points,
        index,
        setIndex: (next) => {
          const point = points[Math.min(points.length - 1, Math.max(0, next))];
          if (point !== undefined) setActive(point);
        },
        modal,
        dismissible,
        close: () => setOpen(false),
      }}
    >
      <SheetPrimitive.Root open={isOpen} onOpenChange={setOpen} modal={modal}>
        {children}
      </SheetPrimitive.Root>
    </SheetContext>
  );
}

export function BottomSheetTrigger(props: ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="bottom-sheet-trigger" {...props} />;
}

export function BottomSheetClose(props: ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="bottom-sheet-close" {...props} />;
}

export function BottomSheetOverlay({ className, ...props }: ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="bottom-sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-overlay ease-out animation-duration-(--duration-base) fade-in-0 fade-out-0 data-[state=closed]:animate-out data-[state=open]:animate-in motion-reduce:animate-none!",
        className,
      )}
      {...props}
    />
  );
}

/** How far ahead a release is projected from its speed, in milliseconds: a flick carries the sheet on. */
const PROJECTION = 140;
/** Speed, in pixels a millisecond, above which a downward flick at the lowest position dismisses. */
const FLICK = 0.6;

export type BottomSheetContentProps = Omit<ComponentProps<typeof SheetPrimitive.Content>, "ref">;

/**
 * The panel, with its portal and (when modal) its veil. Its height is the tallest snap point, and it is
 * pushed down so that only the current one shows: a move between snap points is one transform, and nothing
 * is laid out again. Under reduced motion it changes position without travelling.
 */
export function BottomSheetContent({ className, style, children, onInteractOutside, onEscapeKeyDown, ...props }: BottomSheetContentProps) {
  const context = useSheet("BottomSheetContent");
  const { snapPoints, index, setIndex, dismissible, close, modal } = context;
  const element = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startY: number; delta: number; samples: { y: number; time: number }[] } | null>(null);
  const current = snapPoints[index];

  /** The height of the sheet that shows at a snap point, in pixels: never more than the sheet itself. */
  const visibleAt = (point: BottomSheetSnap | undefined, full: number): number => (point === undefined ? full : Math.min(snapPx(point), full));

  const engine: DragEngine = {
    begin(y) {
      const node = element.current;
      if (!node) return;
      drag.current = { startY: y, delta: 0, samples: [{ y, time: performance.now() }] };
      node.dataset["dragging"] = "";
    },
    move(y) {
      const node = element.current;
      const state = drag.current;
      if (!node || !state) return;
      const full = node.offsetHeight;
      // Up is negative. The sheet cannot be pulled higher than its own height.
      state.delta = Math.max(y - state.startY, visibleAt(current, full) - full);
      state.samples = [...state.samples.slice(-5), { y, time: performance.now() }];
      node.style.setProperty("--rui-sheet-drag", `${state.delta}px`);
    },
    end() {
      const node = element.current;
      const state = drag.current;
      drag.current = null;
      if (!node || !state) return 0;
      delete node.dataset["dragging"];
      const full = node.offsetHeight;
      const first = state.samples[0];
      const last = state.samples.at(-1);
      const elapsed = first && last ? last.time - first.time : 0;
      // Pixels a millisecond, positive downwards.
      const speed = first && last && elapsed > 0 && performance.now() - last.time < 80 ? (last.y - first.y) / elapsed : 0;
      const showing = visibleAt(current, full) - state.delta;
      const projected = showing - speed * PROJECTION;
      const heights = snapPoints.length > 0 ? snapPoints.map((point) => visibleAt(point, full)) : [full];
      const lowest = Math.min(...heights);
      if (dismissible && Math.abs(state.delta) > 4 && (projected < lowest / 2 || (speed > FLICK && showing < lowest))) {
        // The offset is kept, so that the sheet leaves from where the finger let go.
        close();
        return state.delta;
      }
      node.style.removeProperty("--rui-sheet-drag");
      let nearest = 0;
      heights.forEach((height, at) => {
        if (Math.abs(height - projected) < Math.abs((heights[nearest] ?? 0) - projected)) nearest = at;
      });
      if (snapPoints.length > 0) setIndex(nearest);
      return state.delta;
    },
  };

  const tallest = snapPoints.length > 0 ? `min(100dvh, max(${snapPoints.map(snapCss).join(", ")}))` : undefined;

  return (
    <SheetPrimitive.Portal>
      {modal ? <BottomSheetOverlay /> : null}
      <SheetPrimitive.Content
        ref={element}
        data-slot="bottom-sheet-content"
        data-snap-index={index}
        data-top={index >= snapPoints.length - 1 ? "" : undefined}
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 mx-auto flex w-full max-w-2xl flex-col rounded-t-surface border border-b-0 border-border bg-card pb-[env(safe-area-inset-bottom)] text-card-foreground transition-[translate] duration-slow ease-out animation-duration-(--duration-slow) slide-in-from-bottom slide-out-to-bottom data-[dragging]:transition-none data-[state=closed]:animate-out data-[state=open]:animate-in motion-reduce:animate-none! motion-reduce:transition-none",
          snapPoints.length === 0 && "h-fit max-h-[calc(100dvh-3rem)]",
          className,
        )}
        style={
          {
            "--rui-sheet-snap": current === undefined ? "100%" : snapCss(current),
            height: tallest,
            translate: "0 calc(100% - min(var(--rui-sheet-snap), 100%) + var(--rui-sheet-drag, 0px))",
            ...style,
          } as CSSProperties
        }
        onInteractOutside={(event) => {
          onInteractOutside?.(event);
          // A sheet the page is used behind does not close when the page is used.
          if (!dismissible || !modal) event.preventDefault();
        }}
        onEscapeKeyDown={(event) => {
          onEscapeKeyDown?.(event);
          if (!dismissible) event.preventDefault();
        }}
        {...props}
      >
        <DragContext value={engine}>{children}</DragContext>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

export type BottomSheetHandleProps = Omit<ComponentProps<"div">, "children"> & {
  /** What a screen reader says for a position. Default: "Position 2 of 3". Translate it with the interface. */
  snapLabel?: (index: number, count: number) => string;
};

/**
 * The grab bar. With a pointer or a finger: drag it to move the sheet (a flick carries it on; a flick down
 * from the lowest position dismisses), or press it to go to the next position. With a keyboard it is a
 * slider: Up and Down move between the positions, Home and End go to the lowest and the highest, Enter and
 * Space go to the next. It says its position, so nothing here needs a drag. Its name ("Sheet height") is
 * an `aria-label`: translate it. With a single position there is nothing to set, and it is only a grab bar.
 */
export function BottomSheetHandle({
  className,
  snapLabel = (index, count) => `Position ${index + 1} of ${count}`,
  "aria-label": ariaLabel = "Sheet height",
  onKeyDown,
  onPointerDown,
  ...props
}: BottomSheetHandleProps) {
  const { snapPoints, index, setIndex } = useSheet("BottomSheetHandle");
  const engine = use(DragContext);
  const count = snapPoints.length;
  const adjustable = count > 1;
  const next = (): void => setIndex((index + 1) % count);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    onKeyDown?.(event);
    if (event.defaultPrevented || !adjustable) return;
    const moves: Record<string, number | undefined> = {
      ArrowUp: index + 1,
      ArrowDown: index - 1,
      Home: 0,
      End: count - 1,
      Enter: (index + 1) % count,
      " ": (index + 1) % count,
    };
    const target = moves[event.key];
    if (target === undefined) return;
    event.preventDefault();
    setIndex(target);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    onPointerDown?.(event);
    if (event.defaultPrevented || event.button !== 0 || !engine) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    engine.begin(event.clientY);
  };
  const release = (event: PointerEvent<HTMLDivElement>): void => {
    if (!engine || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    const moved = engine.end();
    if (event.type === "pointerup" && Math.abs(moved) <= 4 && adjustable) next();
  };

  return (
    <div
      data-slot="bottom-sheet-handle"
      {...(adjustable
        ? {
            role: "slider",
            tabIndex: 0,
            "aria-label": ariaLabel,
            "aria-orientation": "vertical" as const,
            "aria-valuemin": 0,
            "aria-valuemax": count - 1,
            "aria-valuenow": index,
            "aria-valuetext": snapLabel(index, count),
          }
        : { "aria-hidden": true })}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) engine?.move(event.clientY);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      className={cn(
        "flex h-7 w-full shrink-0 cursor-grab touch-none items-center justify-center rounded-t-surface select-none active:cursor-grabbing pointer-coarse:h-10",
        className,
      )}
      {...props}
    >
      <span aria-hidden="true" className="h-1 w-10 rounded-full bg-border-strong" />
    </div>
  );
}

export function BottomSheetHeader({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="bottom-sheet-header" className={cn("flex shrink-0 flex-col gap-1.5 px-5 pb-4 text-start", className)} {...props} />;
}

export function BottomSheetTitle({ className, ...props }: ComponentProps<typeof SheetPrimitive.Title>) {
  return <SheetPrimitive.Title data-slot="bottom-sheet-title" className={cn("text-base font-medium leading-tight", className)} {...props} />;
}

export function BottomSheetDescription({ className, ...props }: ComponentProps<typeof SheetPrimitive.Description>) {
  return <SheetPrimitive.Description data-slot="bottom-sheet-description" className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

export type BottomSheetBodyProps = Omit<ComponentProps<"div">, "ref">;

/**
 * The part that scrolls. It scrolls only at the highest position; lower down, a finger on it moves the
 * sheet instead, and at the highest position a pull down from the top of the scroll moves the sheet too.
 * (With a mouse the body scrolls and selects text as usual: the handle moves the sheet.)
 */
export function BottomSheetBody({ className, ...props }: BottomSheetBodyProps) {
  const { snapPoints, index } = useSheet("BottomSheetBody");
  const engine = use(DragContext);
  const top = index >= snapPoints.length - 1;
  const node = useRef<HTMLDivElement>(null);
  const latest = useRef({ engine, top });
  useEffect(() => {
    latest.current = { engine, top };
  });

  useEffect(() => {
    const body = node.current;
    if (!body) return;
    let mode: "sheet" | "scroll" | null = null;
    let startY = 0;
    const start = (event: TouchEvent): void => {
      mode = null;
      startY = event.touches[0]?.clientY ?? 0;
    };
    const move = (event: TouchEvent): void => {
      const touch = event.touches[0];
      const { engine: current, top: atTop } = latest.current;
      if (!touch || !current || event.touches.length > 1) return;
      const distance = touch.clientY - startY;
      if (mode === null) {
        if (!atTop || (body.scrollTop <= 0 && distance > 4)) mode = "sheet";
        else if (Math.abs(distance) > 4) mode = "scroll";
        if (mode === "sheet") current.begin(touch.clientY);
      }
      if (mode === "sheet") {
        if (event.cancelable) event.preventDefault();
        current.move(touch.clientY);
      }
    };
    const end = (): void => {
      if (mode === "sheet") latest.current.engine?.end();
      mode = null;
    };
    body.addEventListener("touchstart", start, { passive: true });
    body.addEventListener("touchmove", move, { passive: false });
    body.addEventListener("touchend", end);
    body.addEventListener("touchcancel", end);
    return () => {
      body.removeEventListener("touchstart", start);
      body.removeEventListener("touchmove", move);
      body.removeEventListener("touchend", end);
      body.removeEventListener("touchcancel", end);
    };
  }, []);

  return (
    <div
      ref={node}
      data-slot="bottom-sheet-body"
      className={cn("min-h-0 flex-1 overscroll-contain px-5 pb-5", top ? "overflow-y-auto" : "touch-none overflow-hidden", className)}
      {...props}
    />
  );
}

/** Actions under the body. It is at the bottom of the sheet, so it shows at the highest position. */
export function BottomSheetFooter({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="bottom-sheet-footer" className={cn("flex shrink-0 flex-col gap-2 border-t border-border p-5", className)} {...props} />;
}
