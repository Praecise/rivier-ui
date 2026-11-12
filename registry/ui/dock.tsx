"use client";
/**
 * @name dock
 * @category ui
 * @description A layout of main content with a panel docked beside it that stays while the person works: the panel can be resized with a splitter, collapsed to a slim bar, and on narrow containers gives way to a bar at the bottom.
 * @when A working surface that belongs beside the content and is not modal: a plan next to a conversation, an inspector next to a canvas, details next to a list. For a panel that covers the page for a moment use sheet; for two fixed columns with no resizing use split. Write the parts in reading order: DockMain, DockResizer, DockPanel for a panel at the end; DockPanel, DockResizer, DockMain with side="start". Below 42rem of its own width the panel and splitter are hidden and DockBar shows at the bottom: open the panel's content in a bottom-sheet from `onOpenStacked`. Give the Dock a height (it fills its parent).
 * @example
 * <Dock defaultSize={32} minSize={24} maxSize={50} className="h-[32rem]">
 *   <DockMain>…the conversation…</DockMain>
 *   <DockResizer aria-label="Resize the plan" />
 *   <DockPanel aria-label="Plan">
 *     <DockCollapse aria-label="Hide the plan"><PanelRightClose /></DockCollapse>
 *     …the plan…
 *   </DockPanel>
 *   <DockBar onOpenStacked={() => setSheetOpen(true)}>Plan · 3 stops</DockBar>
 * </Dock>
 *
 * // Controlled, in pixels, at the start
 * <Dock side="start" unit="px" size={width} onSizeChange={setWidth} minSize={240} maxSize={480} collapsed={hidden} onCollapsedChange={setHidden}>…</Dock>
 */
import { createContext, use, useEffect, useId, useRef, type ComponentProps, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { cn } from "@/lib/cn";
import { inlineStep, isRtl } from "@/lib/direction";
import { useControllableState } from "@/lib/use-controllable-state";
import { useSize } from "@/lib/use-size";

/** The container width, in rem, below which the panel no longer sits beside the content (Tailwind's @2xl). */
const STACK_BELOW_REM = 42;

type DockSide = "start" | "end";
type FocusTarget = "bar" | "panel" | "resizer";

type DockContextValue = {
  side: DockSide;
  unit: "%" | "px";
  size: number;
  minSize: number;
  maxSize: number;
  step: number;
  /** Sets the size, kept within the limits. */
  resize: (size: number) => void;
  resetSize: () => void;
  collapsed: boolean;
  /**
   * Collapses or restores, then moves focus to what replaces the control that was used. `from` is where
   * a collapse came from, so that restoring from the bar returns there.
   */
  setCollapsed: (collapsed: boolean, focus?: FocusTarget | "back", from?: FocusTarget) => void;
  /** True when the dock is too narrow for the panel to sit beside the content. */
  stacked: boolean;
  panelId: string;
};

const DockContext = createContext<DockContextValue | null>(null);

/** The dock's state, for a part of your own: `stacked`, `collapsed`, `setCollapsed`, `size`, `resize`. */
export function useDock(part = "useDock"): DockContextValue {
  const context = use(DockContext);
  if (!context) throw new Error(`<${part}> must be used inside <Dock>.`);
  return context;
}

export type DockProps = ComponentProps<"div"> & {
  /** The edge the panel is on: "end" (default) or "start". Both follow the reading direction. */
  side?: DockSide;
  /** What `size`, `minSize` and `maxSize` are measured in: "%" of the dock's width (default) or "px". */
  unit?: "%" | "px";
  /** The controlled size of the panel. */
  size?: number;
  /** The size of the panel when uncontrolled, and what a double-click on the splitter goes back to. Default 32 (%) or 320 (px). */
  defaultSize?: number;
  onSizeChange?: (size: number) => void;
  minSize?: number;
  maxSize?: number;
  /** What one arrow key on the splitter adds or takes away. Default 2 (%) or 16 (px). */
  step?: number;
  collapsed?: boolean;
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
};

/**
 * The layout. Resizing sets one CSS variable that the panel's width reads, as the pointer moves: it is
 * layout, not an animation, and nothing transitions.
 */
export function Dock({
  className,
  style,
  children,
  side = "end",
  unit = "%",
  size,
  defaultSize,
  onSizeChange,
  minSize,
  maxSize,
  step,
  collapsed,
  defaultCollapsed = false,
  onCollapsedChange,
  ...props
}: DockProps) {
  const percent = unit === "%";
  const initial = defaultSize ?? (percent ? 32 : 320);
  const min = minSize ?? (percent ? 20 : 240);
  const max = maxSize ?? (percent ? 50 : 560);
  const [current, setCurrent] = useControllableState({ value: size, defaultValue: initial, onChange: onSizeChange });
  const [isCollapsed, setIsCollapsed] = useControllableState({ value: collapsed, defaultValue: defaultCollapsed, onChange: onCollapsedChange });
  const panelId = useId();
  const root = useRef<HTMLDivElement>(null);
  const returnTo = useRef<FocusTarget>("panel");
  const pendingFocus = useRef<FocusTarget | "back" | null>(null);
  const { ref: measure, width } = useSize<HTMLDivElement>();

  // Focus follows a collapse or a restore: the control that was used is hidden by it.
  useEffect(() => {
    const target = pendingFocus.current === "back" ? returnTo.current : pendingFocus.current;
    pendingFocus.current = null;
    if (target) root.current?.querySelector<HTMLElement>(`[data-slot=dock-${target}]`)?.focus();
  }, [isCollapsed]);

  const clamp = (value: number): number => Math.round(Math.min(max, Math.max(min, value)) * 100) / 100;

  return (
    <DockContext
      value={{
        side,
        unit,
        size: clamp(current),
        minSize: min,
        maxSize: max,
        step: step ?? (percent ? 2 : 16),
        resize: (next) => setCurrent(clamp(next)),
        resetSize: () => setCurrent(clamp(initial)),
        collapsed: isCollapsed,
        setCollapsed: (next, focus, from) => {
          if (next !== isCollapsed) pendingFocus.current = focus ?? null;
          if (from) returnTo.current = from;
          setIsCollapsed(next);
        },
        stacked: width > 0 && width < STACK_BELOW_REM * 16,
        panelId,
      }}
    >
      <div
        ref={(node) => {
          root.current = node;
          measure(node);
        }}
        data-slot="dock"
        data-side={side}
        data-collapsed={isCollapsed ? "" : undefined}
        className={cn("group/dock @container/dock h-full min-h-0 w-full min-w-0", className)}
        style={{ "--dock-size": `${clamp(current)}${unit}`, ...style } as CSSProperties}
        {...props}
      >
        <div data-slot="dock-layout" className="flex h-full min-h-0 w-full flex-col @2xl/dock:flex-row">
          {children}
        </div>
      </div>
    </DockContext>
  );
}

/** The content the panel is docked beside. It takes the room the panel leaves. */
export function DockMain({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="dock-main" className={cn("min-h-0 min-w-0 flex-1", className)} {...props} />;
}

export type DockPanelProps = ComponentProps<"aside">;

/**
 * The panel: a complementary landmark, so give it an `aria-label` (or `aria-labelledby`) that says what it
 * holds. Hidden while collapsed and on narrow containers.
 */
export function DockPanel({ className, ...props }: DockPanelProps) {
  const { panelId } = useDock("DockPanel");
  return (
    <aside
      id={panelId}
      tabIndex={-1}
      data-slot="dock-panel"
      className={cn(
        "hidden min-h-0 min-w-0 shrink-0 grow-0 basis-(--dock-size) flex-col overflow-hidden outline-none group-data-[collapsed]/dock:hidden! @2xl/dock:flex",
        className,
      )}
      {...props}
    />
  );
}

export type DockResizerProps = Omit<ComponentProps<"div">, "children"> & {
  /** What a screen reader says for a size. Default: "32%" or "320 pixels". Translate it with the interface. */
  valueText?: (size: number, unit: "%" | "px") => string;
};

/**
 * The splitter between the content and the panel (the window splitter pattern). Left and Right arrows move
 * it by a step, the way the arrow points in either reading direction; Home makes the panel as small as it
 * may be and End as large; Enter collapses the panel (Enter on the bar that replaces it restores it and
 * returns here). Drag it with a pointer or a finger: the target is wider than the line. A double-click
 * goes back to the default size. Its name ("Resize the panel") is an `aria-label`: translate it.
 */
export function DockResizer({
  className,
  valueText = (size, unit) => (unit === "%" ? `${Math.round(size)}%` : `${Math.round(size)} pixels`),
  "aria-label": ariaLabel = "Resize the panel",
  onKeyDown,
  onPointerDown,
  onDoubleClick,
  ...props
}: DockResizerProps) {
  const dock = useDock("DockResizer");
  const { side, unit, size, minSize, maxSize, step, resize } = dock;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    // A key that points towards the content makes the panel larger.
    const towardsEnd = inlineStep(event.key, event.currentTarget);
    if (towardsEnd !== 0) {
      event.preventDefault();
      resize(size + (side === "end" ? -towardsEnd : towardsEnd) * step);
    } else if (event.key === "Home") {
      event.preventDefault();
      resize(minSize);
    } else if (event.key === "End") {
      event.preventDefault();
      resize(maxSize);
    } else if (event.key === "Enter") {
      event.preventDefault();
      dock.setCollapsed(true, "bar", "resizer");
    }
  };

  const sizeAt = (handle: HTMLElement, clientX: number): number | null => {
    const node = handle.closest("[data-slot=dock]");
    if (!node) return null;
    const rect = node.getBoundingClientRect();
    if (rect.width === 0) return null;
    // The panel is on the right when it is at the end of a left-to-right line, or at the start of a right-to-left one.
    const onRight = (side === "end") !== isRtl(node);
    const pixels = onRight ? rect.right - clientX : clientX - rect.left;
    return unit === "%" ? (pixels / rect.width) * 100 : pixels;
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    onPointerDown?.(event);
    if (event.defaultPrevented || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  return (
    <div
      role="separator"
      tabIndex={0}
      data-slot="dock-resizer"
      aria-label={ariaLabel}
      aria-orientation="vertical"
      aria-controls={dock.panelId}
      aria-valuenow={Math.round(size)}
      aria-valuemin={Math.round(minSize)}
      aria-valuemax={Math.round(maxSize)}
      aria-valuetext={valueText(size, unit)}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={(event) => {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
        const next = sizeAt(event.currentTarget, event.clientX);
        if (next !== null) resize(next);
      }}
      onPointerUp={(event) => event.currentTarget.releasePointerCapture(event.pointerId)}
      onDoubleClick={(event) => {
        onDoubleClick?.(event);
        if (!event.defaultPrevented) dock.resetSize();
      }}
      className={cn(
        "relative z-10 hidden w-px shrink-0 cursor-col-resize touch-none bg-border-strong select-none group-data-[collapsed]/dock:hidden! before:absolute before:inset-y-0 before:-inset-x-[1.5px] before:my-auto before:h-8 before:rounded-full before:bg-border-strong after:absolute after:inset-y-0 after:-inset-x-3 hover:before:bg-foreground focus-visible:before:bg-foreground pointer-coarse:after:-inset-x-5 @2xl/dock:block",
        className,
      )}
      {...props}
    />
  );
}

export type DockCollapseProps = Omit<ComponentProps<"button">, "type">;

/**
 * A button that collapses the panel (or restores it, when placed outside the panel). Give it an
 * `aria-label` or text that says what it hides. Focus moves to the bar when the panel goes.
 */
export function DockCollapse({ className, onClick, ...props }: DockCollapseProps) {
  const dock = useDock("DockCollapse");
  return (
    <button
      type="button"
      data-slot="dock-collapse"
      aria-expanded={!dock.collapsed}
      aria-controls={dock.panelId}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        dock.setCollapsed(!dock.collapsed, dock.collapsed ? "panel" : "bar", "panel");
      }}
      className={cn(
        "inline-flex size-(--control-h) shrink-0 items-center justify-center rounded-control text-muted-foreground transition-[background-color,color] duration-instant ease-out hover:bg-accent hover:text-foreground motion-reduce:transition-none [&_svg]:size-4 rtl:[&_svg]:-scale-x-100",
        className,
      )}
      {...props}
    />
  );
}

export type DockBarProps = Omit<ComponentProps<"button">, "type"> & {
  /**
   * Called when the bar is pressed while the dock is too narrow for the panel to sit beside the content:
   * open the panel's content another way (a bottom-sheet). On a wide dock the bar restores the panel itself.
   */
  onOpenStacked?: () => void;
};

/**
 * The collapsed form of the panel: one button that says what is in the panel (its children: "Plan · 3
 * stops") and brings it back. On a wide dock it shows only while the panel is collapsed, as a slim strip
 * where the panel was; on a narrow one it is always there, across the bottom.
 */
export function DockBar({ className, onClick, onOpenStacked, children, ...props }: DockBarProps) {
  const dock = useDock("DockBar");
  return (
    <button
      type="button"
      data-slot="dock-bar"
      aria-expanded={dock.stacked ? undefined : false}
      aria-controls={dock.stacked ? undefined : dock.panelId}
      aria-haspopup={dock.stacked ? "dialog" : undefined}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        if (dock.stacked) onOpenStacked?.();
        else dock.setCollapsed(false, "back");
      }}
      className={cn(
        "flex h-control-lg w-full shrink-0 items-center gap-2 border-t border-border bg-card px-4 text-start text-sm font-medium text-card-foreground transition-colors duration-instant ease-out hover:bg-accent motion-reduce:transition-none [&_svg]:size-4 [&_svg]:shrink-0",
        "@2xl/dock:hidden @2xl/dock:h-full @2xl/dock:w-(--control-h-lg) @2xl/dock:justify-start @2xl/dock:border-t-0 @2xl/dock:px-0 @2xl/dock:py-4 @2xl/dock:[writing-mode:vertical-rl] @2xl/dock:group-data-[collapsed]/dock:flex @2xl/dock:group-data-[side=end]/dock:border-s @2xl/dock:group-data-[side=start]/dock:order-first @2xl/dock:group-data-[side=start]/dock:border-e",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
