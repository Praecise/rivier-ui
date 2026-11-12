"use client";
/**
 * @name compare-slider
 * @category ui
 * @description Two layers of the same size, one over the other, with a divider that is dragged or moved with the keyboard to show more of one and less of the other: then and now, before and after.
 * @when Comparing two views of the same thing in the same frame: two pictures, two maps, two 3D viewers, any two children. Each side has a visible name. The divider is a slider, so it works without dragging. The frame is drawn left to right in every language (a picture is not mirrored in a right-to-left page), so the first layer is always on the left and the arrow keys move the divider the way they point. For two things that are not the same view use two cards side by side; for many pictures use gallery or carousel.
 * @example
 * <CompareSlider aspect={16 / 9} labels={{ first: "1930", second: "Today" }} aria-label="The square in 1930 and today">
 *   <CompareSliderFirst><img src="/square-1930.jpg" alt="The square in 1930: a tram stop and a kiosk" /></CompareSliderFirst>
 *   <CompareSliderSecond><img src="/square-today.jpg" alt="The square today: trees and a fountain" /></CompareSliderSecond>
 *   <CompareSliderLabels />
 *   <CompareSliderHandle />
 * </CompareSlider>
 *
 * // Controlled, with any two children
 * <CompareSlider value={split} onValueChange={setSplit} labels={{ first: "Survey", second: "Reconstruction" }} aria-label="Survey and reconstruction">
 *   <CompareSliderFirst><SurveyView /></CompareSliderFirst>
 *   <CompareSliderSecond><ReconstructionView /></CompareSliderSecond>
 *   <CompareSliderLabels />
 *   <CompareSliderHandle />
 * </CompareSlider>
 */
import { ChevronsLeftRight } from "lucide-react";
import { createContext, use, useRef, useState, type ComponentProps, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useControllableState } from "@/lib/use-controllable-state";

/** The name of each side: what is read on the picture and said by the slider. */
export type CompareSliderLabels = { first: string; second: string };

type CompareSliderContextValue = {
  /** How much of the frame the first layer takes, from the left: 0 to 100. */
  value: number;
  labels: CompareSliderLabels;
  disabled: boolean;
  dragging: boolean;
  valueText: string;
  name: { "aria-label"?: string | undefined; "aria-labelledby"?: string | undefined; "aria-describedby"?: string | undefined };
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  pointer: {
    onPointerDown: (event: PointerEvent<HTMLElement>) => void;
    onPointerMove: (event: PointerEvent<HTMLElement>) => void;
    onPointerUp: (event: PointerEvent<HTMLElement>) => void;
    onPointerCancel: (event: PointerEvent<HTMLElement>) => void;
  };
};

const CompareSliderContext = createContext<CompareSliderContextValue | null>(null);

function useCompareSlider(part: string): CompareSliderContextValue {
  const context = use(CompareSliderContext);
  if (!context) throw new Error(`<${part}> must be used inside <CompareSlider>.`);
  return context;
}

const clamp = (value: number): number => Math.min(100, Math.max(0, value));

export type CompareSliderProps = Omit<ComponentProps<"div">, "defaultValue" | "dir"> & {
  /** How much of the frame the first layer takes, from the left, 0 to 100: controlled. */
  value?: number;
  /** The starting split when uncontrolled. Default 50. */
  defaultValue?: number;
  /** Called while the divider is dragged and on every key press. */
  onValueChange?: (value: number) => void;
  /** Called once when a drag ends or a key is pressed. */
  onValueCommit?: (value: number) => void;
  /** The name of each side. They are shown by CompareSliderLabels, name the two layers, and are said in the slider's value. */
  labels: CompareSliderLabels;
  /** Width / height of the frame, as a number (16 / 9) or a CSS ratio ("4 / 3"). Without it the frame takes its height from the parent or from `className`. */
  aspect?: number | string;
  /** What an arrow key moves the divider by, in percent. Default 1. */
  step?: number;
  /** What Page Up, Page Down and Shift with an arrow move it by. Default 10. */
  pageStep?: number;
  /** What a screen reader says for a position. Default: "60% 1930, 40% Today". */
  valueText?: (value: number, labels: CompareSliderLabels) => string;
  /** The divider cannot be moved. */
  disabled?: boolean;
};

/**
 * The frame. `aria-label` (or `aria-labelledby`) names the slider, not the frame: say what is compared
 * ("The square in 1930 and today"). Right and Up show more of the first layer, Left and Down less, by
 * `step`; Shift with an arrow, Page Up and Page Down by `pageStep`; Home shows none of it and End all of it.
 * Each layer is cut with `clip-path`, never resized, so its content does not reflow as the divider moves,
 * and the pointer reaches whatever is visible of either layer: only the divider itself is taken by the
 * slider. The split is also on the frame as `--rui-compare` (a percentage) for a project's own parts.
 */
export function CompareSlider({
  className,
  style,
  value,
  defaultValue = 50,
  onValueChange,
  onValueCommit,
  labels,
  aspect,
  step = 1,
  pageStep = 10,
  valueText,
  disabled = false,
  children,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  ...props
}: CompareSliderProps) {
  const [split, setSplit] = useControllableState({ value, defaultValue, onChange: onValueChange });
  const [dragging, setDragging] = useState(false);
  const frame = useRef<HTMLDivElement>(null);
  /** The pointer that is dragging, and the last value it gave. */
  const drag = useRef<{ pointer: number; value: number } | null>(null);
  const shown = clamp(split);

  const at = (event: PointerEvent<HTMLElement>): number => {
    const rect = frame.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return shown;
    return clamp(Math.round(((event.clientX - rect.left) / rect.width) * 1000) / 10);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
    if (disabled || event.defaultPrevented) return;
    const large = event.shiftKey ? pageStep : step;
    // The frame is drawn left to right in every language, so the keys move the divider the way they point.
    const moves: Record<string, number | undefined> = { ArrowRight: large, ArrowUp: large, ArrowLeft: -large, ArrowDown: -large, PageUp: pageStep, PageDown: -pageStep, Home: -100, End: 100 };
    const move = moves[event.key];
    if (move === undefined) return;
    event.preventDefault();
    const next = clamp(shown + move);
    setSplit(next);
    onValueCommit?.(next);
  };

  const end = (event: PointerEvent<HTMLElement>, commit: boolean): void => {
    const current = drag.current;
    if (!current || current.pointer !== event.pointerId) return;
    drag.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (commit) onValueCommit?.(current.value);
  };

  const pointer: CompareSliderContextValue["pointer"] = {
    onPointerDown: (event) => {
      if (disabled || (event.pointerType === "mouse" && event.button !== 0)) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = { pointer: event.pointerId, value: shown };
      setDragging(true);
    },
    onPointerMove: (event) => {
      const current = drag.current;
      if (!current || current.pointer !== event.pointerId) return;
      const next = at(event);
      current.value = next;
      setSplit(next);
    },
    onPointerUp: (event) => end(event, true),
    onPointerCancel: (event) => end(event, false),
  };

  const text = valueText ? valueText(shown, labels) : `${Math.round(shown)}% ${labels.first}, ${Math.round(100 - shown)}% ${labels.second}`;

  return (
    <CompareSliderContext
      value={{ value: shown, labels, disabled, dragging, valueText: text, name: { "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy, "aria-describedby": ariaDescribedBy }, onKeyDown, pointer }}
    >
      <div
        ref={frame}
        data-slot="compare-slider"
        data-dragging={dragging ? "" : undefined}
        data-disabled={disabled ? "" : undefined}
        // A picture is not mirrored in a right-to-left page: the first layer is on the left in every language.
        dir="ltr"
        className={cn("relative isolate w-full min-w-0 overflow-hidden rounded-surface border bg-muted", dragging && "select-none", className)}
        style={{ ...(aspect === undefined ? {} : { aspectRatio: String(aspect) }), ...style, ["--rui-compare" as string]: `${shown}%` }}
        {...props}
      >
        {children}
      </div>
    </CompareSliderContext>
  );
}

const LAYER = "absolute inset-0 [&>img]:size-full [&>img]:object-cover [&>video]:size-full [&>video]:object-cover";

/** The layer on the left of the divider. Any content that fills the frame; a direct `<img>` or `<video>` child is made to cover it. A named group, so its content is told apart from the other side's. */
export function CompareSliderFirst({ className, style, ...props }: ComponentProps<"div">) {
  const { labels } = useCompareSlider("CompareSliderFirst");
  return (
    <div
      data-slot="compare-slider-first"
      role="group"
      aria-label={labels.first}
      className={cn(LAYER, className)}
      style={{ clipPath: "inset(0 calc(100% - var(--rui-compare)) 0 0)", ...style }}
      {...props}
    />
  );
}

/** The layer on the right of the divider. */
export function CompareSliderSecond({ className, style, ...props }: ComponentProps<"div">) {
  const { labels } = useCompareSlider("CompareSliderSecond");
  return (
    <div
      data-slot="compare-slider-second"
      role="group"
      aria-label={labels.second}
      className={cn(LAYER, className)}
      style={{ clipPath: "inset(0 0 0 var(--rui-compare))", ...style }}
      {...props}
    />
  );
}

export type CompareSliderLabelsProps = Omit<ComponentProps<"div">, "children"> & {
  /** Which edge the names sit on. Default "top": the bottom edge is usually where a layer's own controls are. */
  side?: "top" | "bottom";
};

/**
 * The two names, each in its own corner on a solid ground from the theme, so they read on any picture in
 * both modes. Each is cut by the divider with its layer: a name is never shown over the other side.
 * Hidden from assistive technology, which gets the same names from the layers and from the slider's value.
 */
export function CompareSliderLabels({ className, side = "top", ...props }: CompareSliderLabelsProps) {
  const { labels } = useCompareSlider("CompareSliderLabels");
  const chip = "absolute max-w-[45%] truncate rounded-control border border-border-strong bg-background px-2 py-1 text-xs font-medium text-foreground";
  const edge = side === "top" ? "top-2" : "bottom-2";
  return (
    <div data-slot="compare-slider-labels" aria-hidden="true" className={cn("pointer-events-none absolute inset-0 z-10", className)} {...props}>
      <div className="absolute inset-0" style={{ clipPath: "inset(0 calc(100% - var(--rui-compare)) 0 0)" }}>
        <span data-slot="compare-slider-label" data-side="first" dir="auto" className={cn(chip, edge, "start-2")}>
          {labels.first}
        </span>
      </div>
      <div className="absolute inset-0" style={{ clipPath: "inset(0 0 0 var(--rui-compare))" }}>
        <span data-slot="compare-slider-label" data-side="second" dir="auto" className={cn(chip, edge, "end-2")}>
          {labels.second}
        </span>
      </div>
    </div>
  );
}

export type CompareSliderHandleProps = Omit<ComponentProps<"div">, "children"> & {
  /** Replaces what is drawn in the grip (the default is a pair of arrows). */
  children?: ReactNode;
};

/**
 * The divider: a line down the frame with a grip, which is the slider (`role="slider"`). The whole line can
 * be dragged, on a strip 44px wide; a touch that moves up or down on it still scrolls the page
 * (`touch-action: pan-y`), and nothing else in the frame is taken from the layers.
 */
export function CompareSliderHandle({ className, children, ...props }: CompareSliderHandleProps) {
  const { value, disabled, dragging, valueText, name, onKeyDown, pointer } = useCompareSlider("CompareSliderHandle");
  return (
    <div
      data-slot="compare-slider-handle"
      data-dragging={dragging ? "" : undefined}
      className={cn("absolute inset-y-0 z-20 flex w-11 -translate-x-1/2 touch-pan-y items-center justify-center", disabled ? "pointer-events-none" : "cursor-ew-resize", className)}
      style={{ insetInlineStart: "var(--rui-compare)" }}
      {...pointer}
      {...props}
    >
      <span aria-hidden="true" data-slot="compare-slider-line" className="absolute inset-y-0 start-1/2 w-1 -translate-x-1/2 border-x border-border-strong bg-background" />
      <div
        data-slot="compare-slider-grip"
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value)}
        aria-valuetext={valueText}
        aria-disabled={disabled || undefined}
        onKeyDown={onKeyDown}
        className={cn(
          "relative inline-flex size-10 items-center justify-center rounded-full border border-border-strong bg-background text-foreground transition-transform duration-instant ease-out motion-reduce:transition-none",
          dragging && "scale-110 motion-reduce:scale-100",
          disabled && "opacity-50",
        )}
        {...name}
      >
        {children ?? <ChevronsLeftRight aria-hidden="true" strokeWidth={1.5} className="size-4" />}
      </div>
    </div>
  );
}
