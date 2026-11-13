"use client";
/**
 * @name sortable-list
 * @category ui
 * @description A list whose order the person sets, three ways: dragging a row by its handle (mouse, pen or touch), lifting it with the keyboard and moving it with the arrow keys, or pressing "Move up" and "Move down" buttons. Every move is read out.
 * @when The order itself is the data: the stops of a plan, priorities, pictures in a gallery, columns to show. Always give the rows SortableMoveButtons or a SortableHandle (both is best): dragging alone leaves out people who cannot drag (WCAG 2.5.7). It is one vertical list; it does not move rows between lists or sort a grid. For a list sorted by a rule (newest first) use a select for the rule instead; for choosing rather than ordering use chip or checkboxes.
 * @example
 * const [stops, setStops] = useState(["market", "lunch", "museum"]);
 * <SortableList values={stops} onValuesChange={setStops} aria-label="Stops, in order">
 *   {stops.map((id) => (
 *     <SortableItem key={id} value={id} label={NAMES[id]}>
 *       <SortableHandle />
 *       <span className="min-w-0 flex-1 truncate">{NAMES[id]}</span>
 *       <SortableMoveButtons />
 *     </SortableItem>
 *   ))}
 * </SortableList>
 *
 * // Uncontrolled: the list keeps the order and gives it to its children
 * <SortableList defaultValues={["a", "b", "c"]} aria-label="Priorities">
 *   {(order) => order.map((id) => <SortableItem key={id} value={id} label={id}>…</SortableItem>)}
 * </SortableList>
 *
 * // Save once, when a row has been let go, not at every step it passes
 * <SortableList values={stops} onValuesChange={setStops} onDropped={({ from, to, values }) => (from === to ? undefined : save(values))} aria-label="Stops, in order">…</SortableList>
 */
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { MotionConfig, Reorder, useDragControls, type DragControls } from "motion/react";
import {
  createContext,
  use,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { announce } from "@/lib/announce";
import { cn } from "@/lib/cn";
import { DURATION, EASE } from "@/lib/motion";
import { useControllableState } from "@/lib/use-controllable-state";

/** What is read out. Each takes the row's label, its position counted from 1, and how many rows there are. Translate them with the interface. */
export type SortableMessages = {
  lifted: (label: string, position: number, total: number) => string;
  moved: (label: string, position: number, total: number) => string;
  dropped: (label: string, position: number, total: number) => string;
  cancelled: (label: string, position: number, total: number) => string;
  /** How the keyboard works, given as the handle's description. */
  instructions: string;
  /** The handle's name. */
  handle: (label: string) => string;
  moveUp: (label: string) => string;
  moveDown: (label: string) => string;
};

export const SORTABLE_MESSAGES: SortableMessages = {
  lifted: (label, position, total) => `${label}, lifted. Position ${position} of ${total}. Use the Up and Down arrow keys to move it, Space to drop it, Escape to put it back.`,
  moved: (label, position, total) => `${label}, position ${position} of ${total}.`,
  dropped: (label, position, total) => `${label}, dropped at position ${position} of ${total}.`,
  cancelled: (label, position, total) => `${label}, put back at position ${position} of ${total}.`,
  instructions: "Press Space or Enter to lift, the Up and Down arrow keys to move, Space or Enter to drop, Escape to put it back.",
  handle: (label) => `Reorder ${label}`,
  moveUp: (label) => `Move ${label} up`,
  moveDown: (label) => `Move ${label} down`,
};

/** One finished move: what `onDropped` is given. */
export type SortableDrop = {
  /** The id of the row that was moved. */
  value: string;
  /** Where it was when it was picked up, counted from 0. */
  from: number;
  /** Where it was let go, counted from 0. The same as `from` when it was put down where it started. */
  to: number;
  /** The ids in the order the list now has. */
  values: string[];
};

type ListContextValue = {
  values: string[];
  setValues: (values: string[]) => void;
  /** A row was picked up (a drag began, or it was lifted with the keyboard): remembers where from. */
  begin: (value: string) => void;
  /** The row was let go: reports the move, once. `values` is the order when it is newer than the one rendered (a press of a move button). */
  finish: (value: string, values?: string[]) => void;
  /** The row went back where it was (Escape): nothing is reported. */
  abandon: () => void;
  messages: SortableMessages;
  disabled: boolean;
  instructionsId: string;
  /** The row lifted with the keyboard, and the order to go back to on Escape. */
  lifted: { value: string; from: string[] } | null;
  setLifted: (lifted: { value: string; from: string[] } | null) => void;
};

const ListContext = createContext<ListContextValue | null>(null);

type ItemContextValue = {
  value: string;
  label: string;
  index: number;
  total: number;
  disabled: boolean;
  lifted: boolean;
  controls: DragControls;
  /** Moves the row to an index (clamped) and says where it is now. False when it was already there. */
  moveTo: (index: number) => boolean;
  /** The same as one whole move, reported to `onDropped`: what a move button does. */
  moveOnce: (index: number) => boolean;
};

const ItemContext = createContext<ItemContextValue | null>(null);

function useList(part: string): ListContextValue {
  const context = use(ListContext);
  if (!context) throw new Error(`<${part}> must be used inside <SortableList>.`);
  return context;
}

function useItem(part: string): ItemContextValue {
  const context = use(ItemContext);
  if (!context) throw new Error(`<${part}> must be used inside <SortableItem>.`);
  return context;
}

export type SortableListProps = Omit<ComponentProps<"ol">, "children" | "values" | "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart" | "ref"> & {
  /** The ids of the rows, in order, controlled. Ids are strings and unique. */
  values?: string[];
  /** The starting order when uncontrolled. */
  defaultValues?: string[];
  /** Called with the new order at every step: each row a dragged row passes, each arrow key, each press of a move button. */
  onValuesChange?: (values: string[]) => void;
  /**
   * Called once when a move ends: a dragged row is let go, a row lifted with the keyboard is dropped (Space,
   * Enter, Tab or focus leaving), or a move button is pressed. Not called when a lifted row is put back with
   * Escape. `from` and `to` are equal when the row was put down where it started. The place to save the order.
   */
  onDropped?: (drop: SortableDrop) => void;
  /** Stops all reordering. */
  disabled?: boolean;
  /** The words that are read out and the names of the controls, where the English defaults are not wanted. */
  messages?: Partial<SortableMessages>;
  /** The rows (one SortableItem per id, keyed by it), or a function that is given the order and returns them. */
  children: ReactNode | ((values: string[]) => ReactNode);
};

/**
 * An ordered list (`ol`), so its rows are read as "2 of 5". Name it with `aria-label` or
 * `aria-labelledby`. Rows slide to their new places with a transform; under reduced motion they are simply
 * in their new places.
 */
export function SortableList({ className, values, defaultValues, onValuesChange, onDropped, disabled = false, messages, children, ...props }: SortableListProps) {
  const [order, setOrder] = useControllableState({ value: values, defaultValue: defaultValues ?? [], onChange: onValuesChange });
  const [lifted, setLifted] = useState<ListContextValue["lifted"]>(null);
  const instructionsId = useId();
  const merged = { ...SORTABLE_MESSAGES, ...messages };
  /** The row in the air and where it was picked up: one move is reported once, however it ends. */
  const moving = useRef<{ value: string; from: number } | null>(null);
  /** The newest order and listener, for a drag that ends between renders. */
  const latest = useRef({ order, onDropped });
  useEffect(() => {
    latest.current = { order, onDropped };
  });

  const begin = (value: string): void => {
    moving.current = { value, from: latest.current.order.indexOf(value) };
  };
  const finish = (value: string, next?: string[]): void => {
    const move = moving.current;
    moving.current = null;
    if (!move || move.value !== value) return;
    const now = next ?? latest.current.order;
    const to = now.indexOf(value);
    if (move.from !== -1 && to !== -1) latest.current.onDropped?.({ value, from: move.from, to, values: [...now] });
  };
  const abandon = (): void => {
    moving.current = null;
  };

  return (
    <ListContext value={{ values: order, setValues: setOrder, begin, finish, abandon, messages: merged, disabled, instructionsId, lifted, setLifted }}>
      <MotionConfig reducedMotion="user" transition={{ duration: DURATION.base, ease: EASE }}>
        <Reorder.Group as="ol" axis="y" values={order} onReorder={setOrder} data-slot="sortable-list" className={cn("flex w-full min-w-0 flex-col gap-2", className)} {...props}>
          {typeof children === "function" ? children(order) : children}
        </Reorder.Group>
      </MotionConfig>
      <span id={instructionsId} hidden>
        {merged.instructions}
      </span>
    </ListContext>
  );
}

export type SortableItemProps = Omit<ComponentProps<"li">, "value" | "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart" | "ref"> & {
  /** The row's id: one of the list's `values`. */
  value: string;
  /** The row's name in announcements and in the names of its handle and buttons ("Lunch"). */
  label: string;
  /** This row cannot be moved by the person (others can still move past it). */
  disabled?: boolean;
  /**
   * What starts a drag. "handle" (default): only the SortableHandle. "row": the whole row, at once with a
   * mouse or pen, and after a press of half a second on a touch screen, so that the list can still be scrolled.
   */
  dragBy?: "handle" | "row";
};

/** How long a finger rests on a row before it is lifted, and how far it may wander meanwhile. */
const LONG_PRESS = 450;
const LONG_PRESS_SLOP = 8;

/** One row. A flat surface with an edge; while it is lifted or dragged the edge takes the highlight colour and the handle is marked as pressed. */
export function SortableItem({ className, value, label, disabled = false, dragBy = "handle", children, onPointerDown, ...props }: SortableItemProps) {
  const list = useList("SortableItem");
  const controls = useDragControls();
  const [dragging, setDragging] = useState(false);
  const row = useRef<HTMLLIElement>(null);
  /** A touch that may become a long press, or has. */
  const press = useRef<{ timer: number; x: number; y: number; held: boolean } | null>(null);

  const index = list.values.indexOf(value);
  const total = list.values.length;
  const blocked = disabled || list.disabled;
  const lifted = list.lifted?.value === value;

  const moveTo = (to: number): boolean => {
    const target = Math.min(total - 1, Math.max(0, to));
    if (index === -1 || target === index) return false;
    const next = list.values.filter((item) => item !== value);
    next.splice(target, 0, value);
    list.setValues(next);
    announce(list.messages.moved(label, target + 1, total));
    return true;
  };
  /** A press of a move button: picked up, moved and let go in one. */
  const moveOnce = (to: number): boolean => {
    const target = Math.min(total - 1, Math.max(0, to));
    list.begin(value);
    if (!moveTo(target)) {
      list.abandon();
      return false;
    }
    const next = list.values.filter((item) => item !== value);
    next.splice(target, 0, value);
    list.finish(value, next);
    return true;
  };

  const endPress = (): void => {
    if (press.current) window.clearTimeout(press.current.timer);
    press.current = null;
  };
  useEffect(() => endPress, []);

  // Once a long press has lifted the row, the finger moves the row, not the page. Only a listener that is
  // not passive may stop the page from scrolling, and React's are passive.
  useEffect(() => {
    const element = row.current;
    if (!element || dragBy !== "row") return;
    const hold = (event: TouchEvent): void => {
      if (press.current?.held) event.preventDefault();
    };
    const menu = (event: Event): void => {
      if (press.current) event.preventDefault();
    };
    element.addEventListener("touchmove", hold, { passive: false });
    element.addEventListener("contextmenu", menu);
    return () => {
      element.removeEventListener("touchmove", hold);
      element.removeEventListener("contextmenu", menu);
    };
  }, [dragBy]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLLIElement>): void => {
    onPointerDown?.(event);
    if (event.defaultPrevented || blocked || dragBy !== "row" || event.button !== 0) return;
    if ((event.target as Element).closest("button, a, input, select, textarea, [role=button], [data-slot=sortable-handle]")) return;
    if (event.pointerType !== "touch") {
      controls.start(event);
      return;
    }
    endPress();
    const native = event.nativeEvent;
    press.current = {
      x: event.clientX,
      y: event.clientY,
      held: false,
      timer: window.setTimeout(() => {
        if (!press.current) return;
        press.current.held = true;
        controls.start(native);
      }, LONG_PRESS),
    };
  };

  return (
    <ItemContext value={{ value, label, index, total, disabled: blocked, lifted, controls, moveTo, moveOnce }}>
      <Reorder.Item
        as="li"
        ref={row}
        value={value}
        // The handle is the row's keyboard stop, not the row itself.
        tabIndex={undefined}
        drag={blocked ? false : "y"}
        dragListener={false}
        dragControls={controls}
        onDragStart={() => {
          setDragging(true);
          list.begin(value);
        }}
        onDragEnd={() => {
          setDragging(false);
          endPress();
          announce(list.messages.dropped(label, list.values.indexOf(value) + 1, list.values.length));
          list.finish(value);
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={(event: ReactPointerEvent<HTMLLIElement>) => {
          const current = press.current;
          if (current && !current.held && Math.hypot(event.clientX - current.x, event.clientY - current.y) > LONG_PRESS_SLOP) endPress();
        }}
        onPointerUp={endPress}
        onPointerCancel={endPress}
        data-slot="sortable-item"
        data-dragging={dragging ? "" : undefined}
        data-lifted={lifted ? "" : undefined}
        data-disabled={blocked ? "" : undefined}
        className={cn(
          "relative flex min-h-(--control-h-lg) w-full min-w-0 items-center gap-2 rounded-control border bg-card px-2 py-1.5 text-sm text-card-foreground data-[disabled]:opacity-60 data-[dragging]:border-primary data-[dragging]:bg-accent data-[lifted]:border-primary data-[lifted]:bg-accent",
          dragBy === "row" && !blocked && "cursor-grab select-none [-webkit-touch-callout:none] data-[dragging]:cursor-grabbing",
          className,
        )}
        {...props}
      >
        {children}
      </Reorder.Item>
    </ItemContext>
  );
}

export type SortableHandleProps = Omit<ComponentProps<"button">, "type">;

/**
 * The grip. With a pointer or a finger it drags the row (it does not scroll the page, so a finger can use
 * it at once). With the keyboard: Space or Enter lifts the row, Up and Down move it, Home and End send it to
 * either end, Space or Enter drops it, Escape puts it back where it was lifted. Tab, or focus leaving any
 * other way, drops it where it is. While lifted the button is `aria-pressed`.
 */
export function SortableHandle({ className, children, onKeyDown, onPointerDown, onBlur, "aria-label": ariaLabel, ...props }: SortableHandleProps) {
  const list = useList("SortableHandle");
  const item = useItem("SortableHandle");
  const { label, index, total, lifted } = item;
  const { messages } = list;

  const drop = (): void => {
    list.setLifted(null);
    announce(messages.dropped(label, index + 1, total));
    list.finish(item.value);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    onKeyDown?.(event);
    if (event.defaultPrevented || item.disabled || event.altKey || event.ctrlKey || event.metaKey) return;
    const { key } = event;
    if (key === " " || key === "Enter") {
      event.preventDefault();
      if (event.repeat) return;
      if (lifted) drop();
      else {
        list.setLifted({ value: item.value, from: list.values });
        list.begin(item.value);
        announce(messages.lifted(label, index + 1, total));
      }
      return;
    }
    if (!lifted) return;
    if (key === "ArrowUp" || key === "ArrowDown" || key === "Home" || key === "End") {
      event.preventDefault();
      item.moveTo(key === "ArrowUp" ? index - 1 : key === "ArrowDown" ? index + 1 : key === "Home" ? 0 : total - 1);
    } else if (key === "Escape") {
      // The Escape belongs to the lifted row, not to a dialog or sheet the list may be in.
      event.preventDefault();
      event.stopPropagation();
      const from = list.lifted?.from ?? list.values;
      // Rows added or removed since the lift keep their places; the rest go back.
      const known = from.filter((value) => list.values.includes(value));
      const restored = list.values.map((value) => (from.includes(value) ? (known.shift() ?? value) : value));
      list.setValues(restored);
      list.setLifted(null);
      list.abandon();
      announce(messages.cancelled(label, restored.indexOf(item.value) + 1, total));
    } else if (key === "Tab") {
      drop();
    }
  };

  return (
    <button
      type="button"
      data-slot="sortable-handle"
      aria-label={ariaLabel ?? messages.handle(label)}
      aria-describedby={list.instructionsId}
      aria-pressed={lifted}
      disabled={item.disabled}
      onKeyDown={handleKeyDown}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        if (!event.defaultPrevented && !item.disabled && event.button === 0) item.controls.start(event);
      }}
      onBlur={(event) => {
        onBlur?.(event);
        if (!lifted) return;
        // Focus left while the row was lifted (a press elsewhere): it stays where it is, and that is a drop.
        list.setLifted(null);
        list.finish(item.value);
      }}
      className={cn(
        "inline-flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-control text-muted-foreground transition-[background-color,color] duration-instant ease-out select-none hover:bg-accent hover:text-foreground active:cursor-grabbing disabled:pointer-events-none disabled:opacity-40 aria-pressed:bg-primary aria-pressed:text-primary-foreground motion-reduce:transition-none pointer-coarse:size-10 [&_svg]:size-4",
        className,
      )}
      {...props}
    >
      {children ?? <GripVertical aria-hidden="true" strokeWidth={1.5} />}
    </button>
  );
}

export type SortableMoveButtonsProps = ComponentProps<"div">;

/**
 * "Move up" and "Move down": reordering with single presses, for anyone who does not drag. At either end
 * the button that has nowhere to go says it is unavailable but keeps focus, so that pressing "up" until the
 * row reaches the top does not drop the keyboard's place.
 */
export function SortableMoveButtons({ className, ...props }: SortableMoveButtonsProps) {
  const { messages } = useList("SortableMoveButtons");
  const item = useItem("SortableMoveButtons");
  const button =
    "inline-flex size-8 shrink-0 items-center justify-center rounded-control text-muted-foreground transition-[background-color,color,opacity] duration-instant ease-out hover:bg-accent hover:text-foreground aria-disabled:pointer-events-none aria-disabled:opacity-40 motion-reduce:transition-none pointer-coarse:size-10 [&_svg]:size-4";
  const atTop = item.disabled || item.index <= 0;
  const atBottom = item.disabled || item.index >= item.total - 1;
  return (
    <div data-slot="sortable-move-buttons" className={cn("ms-auto flex shrink-0 items-center", className)} {...props}>
      <button type="button" data-slot="sortable-move-up" aria-label={messages.moveUp(item.label)} aria-disabled={atTop || undefined} onClick={() => (atTop ? undefined : item.moveOnce(item.index - 1))} className={button}>
        <ChevronUp aria-hidden="true" strokeWidth={1.5} />
      </button>
      <button type="button" data-slot="sortable-move-down" aria-label={messages.moveDown(item.label)} aria-disabled={atBottom || undefined} onClick={() => (atBottom ? undefined : item.moveOnce(item.index + 1))} className={button}>
        <ChevronDown aria-hidden="true" strokeWidth={1.5} />
      </button>
    </div>
  );
}
