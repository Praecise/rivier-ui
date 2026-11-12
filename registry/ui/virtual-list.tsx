"use client";
/**
 * @name virtual-list
 * @category ui
 * @description A long list or grid that renders only the rows in view: thousands of items of any height in a box that scrolls, each still announced with its position in the whole list, with a way to go to an item and to come back to where the person was.
 * @when More items than the page should hold at once (a few hundred or more): a feed, a log, search results, a picture library. Rows may have any height: each is measured once it is drawn and the rest are estimated, and the view does not jump when a row above it turns out taller. Give the box a height and a name (`aria-label`). For a short list render the rows plainly; for a conversation that grows at the bottom use thread; for pages of results use pagination. Written here on ResizeObserver instead of adding a virtualisation package: a headless one would bring the offsets but not the roles, the positions for screen readers, the kept focus or the restoration, which are most of this file. It scrolls inside its own box only, not with the window.
 * @example
 * // Rows of any height
 * <VirtualList count={messages.length} estimateSize={72} getKey={(index) => messages[index].id} aria-label="Messages" className="h-96 rounded-surface border">
 *   {(index) => <article className="border-b p-3">{messages[index].text}</article>}
 * </VirtualList>
 *
 * // A grid, as many columns as fit; the place is remembered for this tab
 * <VirtualGrid count={pictures.length} columns={{ minWidth: 160 }} gap={8} estimateSize={160} restoreKey="library" aria-label="Pictures" className="h-[32rem]">
 *   {(index) => <img src={pictures[index].src} alt={pictures[index].alt} className="aspect-square w-full rounded-control object-cover" />}
 * </VirtualGrid>
 *
 * // Going to an item
 * const list = useRef<VirtualListHandle>(null);
 * <VirtualList handleRef={list} count={10000} aria-label="Lines">{(index) => <p className="p-2">Line {index + 1}</p>}</VirtualList>
 * <Button onClick={() => list.current?.scrollToIndex(4999, { align: "center" })}>Go to line 5,000</Button>
 */
import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type ComponentProps, type FocusEvent, type KeyboardEvent, type ReactNode, type Ref, type UIEvent } from "react";
import { flushSync } from "react-dom";
import { cn } from "@/lib/cn";

/** Where an item is put in the box when it is gone to. "nearest" moves only if it is not wholly in view. */
export type VirtualAlign = "start" | "center" | "end" | "nearest";

export type VirtualListHandle = {
  /** Brings an item into view, without animation. It stays put while the rows around it are measured. */
  scrollToIndex: (index: number, options?: { align?: VirtualAlign }) => void;
  /** The box that scrolls. */
  element: HTMLDivElement | null;
};

/** The items in view (not counting the extra rows kept above and below), as indexes. */
export type VirtualRange = { start: number; end: number };

type Shared = Omit<ComponentProps<"div">, "children" | "ref"> & {
  /** How many items there are in all. */
  count: number;
  /** Extra rows kept drawn above and below the view, so a fast scroll does not show a blank. Default 4. */
  overscan?: number;
  /** The space between rows (and between columns of a grid), in pixels. Default 0. */
  gap?: number;
  /** A stable key for an item: its id. Left out, it is the index, which is right only for a list that does not reorder. */
  getKey?: (index: number) => string | number;
  /** A name for this list's place. With it, where the person was is kept for the tab (sessionStorage) and returned to when the list is shown again. */
  restoreKey?: string;
  /** Receives `scrollToIndex` and the scrolling element. */
  handleRef?: Ref<VirtualListHandle>;
  /** Called when the items in view change: load more near the end, or mark what was seen. */
  onRangeChange?: (range: VirtualRange) => void;
  /** Draws one item. It is called only for the items being rendered. */
  children: (index: number) => ReactNode;
};

export type VirtualListProps = Shared & {
  /** The height a row is taken to have until it has been measured, in pixels: one number, or a function of the index. A close guess keeps the scrollbar steady. Default 48. */
  estimateSize?: number | ((index: number) => number);
};

export type VirtualGridProps = Shared & {
  /** How many columns, or the narrowest a column may be in pixels: as many as fit are used. Default `{ minWidth: 160 }`. */
  columns?: number | { minWidth: number };
  /** The height a row of cells is taken to have until it has been measured, in pixels. Default 160. */
  estimateSize?: number;
};

type Target = { row: number; align: "start" | "center" | "end"; offset: number };
type Latest = { offsets: Float64Array; rowCount: number; perRow: number; height: number; gap: number; first: number; last: number; sizes: ReadonlyMap<string | number, number>; keyOf: (row: number) => string | number };

const STORE = "rui-virtual:";
const EMPTY_SIZES: ReadonlyMap<string | number, number> = new Map();

/** The row a distance from the top falls in: the last one that starts at or before it. */
function rowAt(offsets: Float64Array, rowCount: number, y: number): number {
  let low = 0;
  let high = rowCount - 1;
  while (low < high) {
    const middle = (low + high + 1) >> 1;
    if ((offsets[middle] ?? 0) <= y) low = middle;
    else high = middle - 1;
  }
  return Math.max(0, low);
}

/** How far down the box its content starts: the box's own padding, which scrolls with the rows. */
const insetOf = (box: HTMLElement): number => (box.firstElementChild as HTMLElement | null)?.offsetTop ?? 0;

function readPlace(key: string): { index: number; offset: number } | null {
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(STORE + key) ?? "null") as { index?: unknown; offset?: unknown } | null;
    return saved && typeof saved.index === "number" && typeof saved.offset === "number" ? { index: saved.index, offset: saved.offset } : null;
  } catch {
    return null;
  }
}

function writePlace(key: string, place: { index: number; offset: number }): void {
  try {
    window.sessionStorage.setItem(STORE + key, JSON.stringify(place));
  } catch {
    // Storage is full or switched off: the list simply starts at the top next time.
  }
}

type Windowing = {
  /** The rows to render, in order. */
  rows: number[];
  offsets: Float64Array;
  total: number;
  onScroll: (event: UIEvent<HTMLDivElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  onFocus: (event: FocusEvent<HTMLDivElement>) => void;
  onBlur: (event: FocusEvent<HTMLDivElement>) => void;
};

/**
 * The windowing both components share. A "row" is one item of a list or one line of cells of a grid. Row
 * heights are kept by key; the offset of every row is a running sum of measured heights and estimates.
 */
function useWindowing(options: {
  box: HTMLDivElement | null;
  height: number;
  ready: boolean;
  count: number;
  rowCount: number;
  perRow: number;
  grid: boolean;
  estimateSize: number | ((index: number) => number);
  getKey: ((index: number) => string | number) | undefined;
  gap: number;
  overscan: number;
  restoreKey: string | undefined;
  handleRef: Ref<VirtualListHandle> | undefined;
  onRangeChange: ((range: VirtualRange) => void) | undefined;
  onScroll: ((event: UIEvent<HTMLDivElement>) => void) | undefined;
  onKeyDown: ((event: KeyboardEvent<HTMLDivElement>) => void) | undefined;
}): Windowing {
  const { box, height, ready, count, rowCount, perRow, grid, estimateSize, getKey, gap, overscan, restoreKey, handleRef, onRangeChange, onScroll, onKeyDown } = options;
  const [sizes, setSizes] = useState<ReadonlyMap<string | number, number>>(EMPTY_SIZES);
  const [scrollTop, setScrollTop] = useState(0);
  const [focusedRow, setFocusedRow] = useState<number | null>(null);

  const { offsets, keyOf } = useMemo(() => {
    // A grid's rows change when its column count does, so their heights are kept per column count.
    const keyOf = (row: number): string | number => (grid ? `${perRow}:${row}` : getKey ? getKey(row) : row);
    const offsets = new Float64Array(rowCount + 1);
    for (let row = 0; row < rowCount; row += 1) {
      const size = sizes.get(keyOf(row)) ?? (typeof estimateSize === "function" ? estimateSize(row) : estimateSize);
      offsets[row + 1] = (offsets[row] ?? 0) + size + (row < rowCount - 1 ? gap : 0);
    }
    return { offsets, keyOf };
  }, [rowCount, perRow, grid, getKey, estimateSize, gap, sizes]);
  const total = offsets[rowCount] ?? 0;

  const first = rowCount === 0 ? 0 : rowAt(offsets, rowCount, scrollTop);
  const last = rowCount === 0 ? -1 : rowAt(offsets, rowCount, scrollTop + height);
  const rows: number[] = [];
  for (let row = Math.max(0, first - overscan); row <= Math.min(rowCount - 1, last + overscan); row += 1) rows.push(row);
  // The row that holds focus stays rendered wherever the view goes: focus is never dropped by scrolling.
  if (focusedRow !== null && focusedRow < rowCount && !rows.includes(focusedRow)) {
    rows.push(focusedRow);
    rows.sort((a, b) => a - b);
  }

  /** The box, for the handlers that scroll it: they run between renders, and a value from state may not be changed. */
  const element = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    element.current = box;
  }, [box]);

  /** What the observers and handlers read between renders. */
  const latest = useRef<Latest>({ offsets, rowCount, perRow, height, gap, first, last, sizes, keyOf });
  useLayoutEffect(() => {
    latest.current = { offsets, rowCount, perRow, height, gap, first, last, sizes, keyOf };
  });

  /** An item being gone to: held in place until the rows around it have been measured, or the person scrolls. */
  const target = useRef<Target | null>(null);
  const settle = useRef(0);
  const lastTop = useRef(0);
  const saving = useRef(0);

  const applyTarget = useCallback((): void => {
    const goal = target.current;
    const now = latest.current;
    const box = element.current;
    if (!goal || !box || now.rowCount === 0) return;
    const row = Math.min(goal.row, now.rowCount - 1);
    const start = now.offsets[row] ?? 0;
    const size = (now.offsets[row + 1] ?? start) - start - (row < now.rowCount - 1 ? now.gap : 0);
    const inset = insetOf(box);
    const limit = box.scrollHeight - box.clientHeight;
    const wanted = inset + (goal.align === "start" ? start + goal.offset : goal.align === "center" ? start - (box.clientHeight - size) / 2 : start + size - box.clientHeight);
    // The first and last rows go to the very ends, the box's padding included.
    const top = row === 0 && goal.align === "start" && goal.offset === 0 ? 0 : row === now.rowCount - 1 && goal.align === "end" ? limit : Math.max(0, Math.min(wanted, limit));
    if (Math.abs(box.scrollTop - top) > 1) box.scrollTop = top;
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => {
      target.current = null;
    }, 300);
  }, []);

  // Heights changed (rows were measured): keep the item being gone to where it was asked to be.
  useLayoutEffect(() => {
    applyTarget();
  }, [applyTarget, offsets, height]);

  const save = useCallback((): void => {
    const now = latest.current;
    if (!restoreKey || now.rowCount === 0) return;
    const row = rowAt(now.offsets, now.rowCount, lastTop.current);
    writePlace(restoreKey, { index: row * now.perRow, offset: lastTop.current - (now.offsets[row] ?? 0) });
  }, [restoreKey]);

  // Return to the saved place once the box has a size (and a grid knows its columns).
  const restored = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (!ready || !restoreKey || restored.current === restoreKey) return;
    restored.current = restoreKey;
    const place = readPlace(restoreKey);
    if (!place || place.index < 0) return;
    target.current = { row: Math.floor(place.index / latest.current.perRow), align: "start", offset: Math.max(0, place.offset) };
    applyTarget();
  }, [ready, restoreKey, applyTarget]);

  useEffect(() => {
    if (!restoreKey) return;
    window.addEventListener("pagehide", save);
    return () => {
      window.removeEventListener("pagehide", save);
      // Leaving the page inside the application: keep the last place seen.
      if (saving.current !== 0) {
        window.clearTimeout(saving.current);
        saving.current = 0;
        save();
      }
    };
  }, [restoreKey, save]);

  // A scroll the person makes ends any going-to in progress.
  useEffect(() => {
    if (!box) return;
    const release = (): void => {
      target.current = null;
    };
    const events = ["wheel", "touchmove", "keydown", "pointerdown"] as const;
    for (const name of events) box.addEventListener(name, release, { passive: true });
    return () => {
      for (const name of events) box.removeEventListener(name, release);
      window.clearTimeout(settle.current);
    };
  }, [box]);

  /** Rows report their heights here. A row above the view that changes height moves the view by as much, so what the person is reading stays still. */
  const measure = useCallback(
    (entries: ResizeObserverEntry[]): void => {
      const box = element.current;
      if (!box) return;
      const now = latest.current;
      const top = box.scrollTop;
      const inset = insetOf(box);
      const anchor = rowAt(now.offsets, now.rowCount, top - inset);
      // At the very end, stay there: rows measured taller than their estimate must not push the end out of reach.
      const pinned = top > 0 && top + box.clientHeight >= box.scrollHeight - 1;
      let next: Map<string | number, number> | null = null;
      let shift = 0;
      for (const entry of entries) {
        const node = entry.target as HTMLElement;
        const row = Number(node.dataset["row"]);
        if (!node.isConnected || !Number.isInteger(row) || row >= now.rowCount) continue;
        const size = entry.borderBoxSize?.[0]?.blockSize ?? node.getBoundingClientRect().height;
        // Nothing has a height while the list is hidden (a closed tab, a collapsed panel): keep what is known.
        if (size <= 0) continue;
        const before = (now.offsets[row + 1] ?? 0) - (now.offsets[row] ?? 0) - (row < now.rowCount - 1 ? now.gap : 0);
        if (Math.abs(before - size) < 0.5) continue;
        next ??= new Map(now.sizes);
        next.set(now.keyOf(row), size);
        if (row < anchor) shift += size - before;
      }
      if (!next) return;
      const measured = next;
      // Both in the same frame, before it is painted: the rows move and the view moves with them.
      flushSync(() => {
        setSizes(measured);
        setScrollTop(top - inset + (target.current ? 0 : shift));
      });
      if (target.current) return;
      if (pinned) box.scrollTop = box.scrollHeight - box.clientHeight;
      else if (shift !== 0) box.scrollTop = top + shift;
    },
    [],
  );

  const observer = useRef<ResizeObserver | null>(null);
  const observed = useRef(new Set<Element>());
  useLayoutEffect(() => {
    if (!box || typeof ResizeObserver === "undefined") return;
    const seen = observed.current;
    observer.current = new ResizeObserver(measure);
    return () => {
      observer.current?.disconnect();
      observer.current = null;
      seen.clear();
    };
  }, [box, measure]);
  // After every render: watch the rows that arrived, let go of the ones that left.
  useLayoutEffect(() => {
    const watcher = observer.current;
    const sizer = box?.firstElementChild;
    if (!watcher || !sizer) return;
    const seen = observed.current;
    for (const node of seen) {
      if (node.isConnected) continue;
      watcher.unobserve(node);
      seen.delete(node);
    }
    for (const node of sizer.children) {
      if (seen.has(node)) continue;
      watcher.observe(node);
      seen.add(node);
    }
  });

  const scrollToIndex = useCallback(
    (index: number, scroll?: { align?: VirtualAlign }): void => {
      const now = latest.current;
      const box = element.current;
      if (!box || now.rowCount === 0) return;
      const row = Math.min(now.rowCount - 1, Math.max(0, Math.floor(index / now.perRow)));
      let align = scroll?.align ?? "start";
      if (align === "nearest") {
        const start = now.offsets[row] ?? 0;
        const end = (now.offsets[row + 1] ?? start) - (row < now.rowCount - 1 ? now.gap : 0);
        const top = box.scrollTop - insetOf(box);
        if (start >= top && end <= top + box.clientHeight) return;
        align = start < top ? "start" : "end";
      }
      target.current = { row, align, offset: 0 };
      applyTarget();
    },
    [applyTarget],
  );
  useImperativeHandle(handleRef, () => ({ scrollToIndex, element: box }), [scrollToIndex, box]);

  const start = first * perRow;
  const end = Math.min(count - 1, (last + 1) * perRow - 1);
  const report = useRef(onRangeChange);
  useEffect(() => {
    report.current = onRangeChange;
  });
  useEffect(() => {
    if (ready && end >= start) report.current?.({ start, end });
  }, [ready, start, end]);

  return {
    rows,
    offsets,
    total,
    onScroll: (event) => {
      onScroll?.(event);
      const top = event.currentTarget.scrollTop - insetOf(event.currentTarget);
      lastTop.current = top;
      if (restoreKey) {
        window.clearTimeout(saving.current);
        saving.current = window.setTimeout(() => {
          saving.current = 0;
          save();
        }, 120);
      }
      // Render only when other rows come into view, and then before the frame is painted.
      const now = latest.current;
      if (now.rowCount === 0) return;
      if (rowAt(now.offsets, now.rowCount, top) === now.first && rowAt(now.offsets, now.rowCount, top + event.currentTarget.clientHeight) === now.last) return;
      flushSync(() => setScrollTop(top));
    },
    onKeyDown: (event) => {
      onKeyDown?.(event);
      if (event.defaultPrevented || (event.key !== "Home" && event.key !== "End") || event.altKey || event.metaKey) return;
      // In a field inside a row, Home and End belong to the text.
      if ((event.target as HTMLElement).closest("input, textarea, select, [contenteditable]")) return;
      // The browser would scroll to where the end is estimated to be; going to the last row lands on the real one.
      event.preventDefault();
      scrollToIndex(event.key === "Home" ? 0 : count - 1, { align: event.key === "Home" ? "start" : "end" });
    },
    onFocus: (event) => {
      const row = Number((event.target as HTMLElement).closest<HTMLElement>("[data-row]")?.dataset["row"]);
      if (Number.isInteger(row)) setFocusedRow(row);
    },
    onBlur: (event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setFocusedRow(null);
    },
  };
}

/** The size of the box that scrolls (its height) and of what is inside it (its width), kept current. */
function useBox(): { box: HTMLDivElement | null; setBox: (node: HTMLDivElement | null) => void; height: number; width: number } {
  const [box, setBox] = useState<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ height: 0, width: 0 });
  useEffect(() => {
    if (!box || typeof ResizeObserver === "undefined") return;
    const inner = box.firstElementChild;
    const observer = new ResizeObserver(() => {
      const height = box.clientHeight;
      const width = inner?.clientWidth ?? box.clientWidth;
      setSize((previous) => (previous.height === height && previous.width === width ? previous : { height, width }));
    });
    observer.observe(box);
    if (inner) observer.observe(inner);
    return () => observer.disconnect();
  }, [box]);
  return { box, setBox, height: size.height, width: size.width };
}

const BOX = "relative min-h-0 overflow-x-hidden overflow-y-auto overscroll-contain [overflow-anchor:none]";
const ROW = "absolute inset-x-0 top-0";

/**
 * A list (`role="list"`) whose box scrolls and takes focus, so the arrow keys and Page Up and Down scroll it
 * as they do any region; Home and End go to the first and the last row themselves, not to where the end was
 * estimated to be. Each rendered item is a `listitem` carrying `aria-setsize` (the whole
 * count) and `aria-posinset`, so a screen reader says "37 of 10,000" although only a few are in the page.
 * Rows are placed with a transform and are not animated. Give the box a height (`className="h-96"`) and a
 * name (`aria-label`); without a height nothing scrolls and every row is rendered.
 */
export function VirtualList({ className, count, estimateSize = 48, overscan = 4, gap = 0, getKey, restoreKey, handleRef, onRangeChange, onScroll, onKeyDown, children, ...props }: VirtualListProps) {
  const { box, setBox, height } = useBox();
  const list = useWindowing({ box, height, ready: height > 0, count, rowCount: count, perRow: 1, grid: false, estimateSize, getKey, gap, overscan, restoreKey, handleRef, onRangeChange, onScroll, onKeyDown });
  return (
    <div ref={setBox} data-slot="virtual-list" role="list" tabIndex={0} onScroll={list.onScroll} onKeyDown={list.onKeyDown} className={cn(BOX, className)} {...props}>
      <div data-slot="virtual-list-sizer" role="presentation" className="relative w-full" style={{ height: list.total }} onFocus={list.onFocus} onBlur={list.onBlur}>
        {list.rows.map((row) => (
          <div
            key={getKey ? getKey(row) : row}
            data-slot="virtual-list-item"
            role="listitem"
            aria-setsize={count}
            aria-posinset={row + 1}
            data-row={row}
            data-index={row}
            className={cn(ROW, "flow-root")}
            style={{ transform: `translateY(${list.offsets[row] ?? 0}px)` }}
          >
            {children(row)}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * The same for cells in columns: lines of cells are windowed, each line as tall as its tallest cell. It is
 * still one list to a screen reader (each cell a `listitem` with its position among all the cells), read in
 * order, and it mirrors in right-to-left pages. With `columns={{ minWidth }}` the number of columns follows
 * the width of the box.
 */
export function VirtualGrid({ className, count, columns = { minWidth: 160 }, estimateSize = 160, overscan = 2, gap = 0, getKey, restoreKey, handleRef, onRangeChange, onScroll, onKeyDown, children, ...props }: VirtualGridProps) {
  const { box, setBox, height, width } = useBox();
  const perRow = typeof columns === "number" ? Math.max(1, Math.floor(columns)) : Math.max(1, Math.floor((width + gap) / (Math.max(1, columns.minWidth) + gap)));
  const rowCount = Math.ceil(count / perRow);
  const grid = useWindowing({ box, height, ready: height > 0 && width > 0, count, rowCount, perRow, grid: true, estimateSize, getKey: undefined, gap, overscan, restoreKey, handleRef, onRangeChange, onScroll, onKeyDown });
  return (
    <div ref={setBox} data-slot="virtual-grid" role="list" tabIndex={0} data-columns={perRow} onScroll={grid.onScroll} onKeyDown={grid.onKeyDown} className={cn(BOX, className)} {...props}>
      <div data-slot="virtual-grid-sizer" role="presentation" className="relative w-full" style={{ height: grid.total }} onFocus={grid.onFocus} onBlur={grid.onBlur}>
        {grid.rows.map((row) => (
          <div
            key={row}
            data-slot="virtual-grid-row"
            role="presentation"
            data-row={row}
            className={cn(ROW, "grid")}
            style={{ transform: `translateY(${grid.offsets[row] ?? 0}px)`, gridTemplateColumns: `repeat(${perRow}, minmax(0, 1fr))`, columnGap: gap }}
          >
            {Array.from({ length: Math.min(perRow, count - row * perRow) }, (_, column) => {
              const index = row * perRow + column;
              return (
                <div key={getKey ? getKey(index) : index} data-slot="virtual-grid-item" role="listitem" aria-setsize={count} aria-posinset={index + 1} data-index={index} className="min-w-0">
                  {children(index)}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
