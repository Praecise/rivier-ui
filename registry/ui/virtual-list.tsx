"use client";
/**
 * @name virtual-list
 * @category ui
 * @description A long list or grid that renders only the rows in view: thousands of items of any height in a box that scrolls, or down a page that scrolls with the window, each still announced with its position in the whole list, with a way to go to an item and to come back to where the person was.
 * @when More items than the page should hold at once (a few hundred or more): a feed, a log, search results, a picture library. Rows may have any height: each is measured once it is drawn and the rest are estimated, and the view does not jump when a row above it turns out taller. Give the box a height and a name (`aria-label`); or, where the list is the page (a feed, results under a header), `scroll="window"` and no height: it then grows to its full length and the window scrolls it. For a short list render the rows plainly; for a conversation that grows at the bottom use thread; for pages of results use pagination. Written here on ResizeObserver instead of adding a virtualisation package: a headless one would bring the offsets but not the roles, the positions for screen readers, the kept focus or the restoration, which are most of this file.
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
 * // The page scrolls, not a box: no height, and rows above and below the window are not rendered
 * <VirtualList scroll="window" count={results.length} estimateSize={96} getKey={(index) => results[index].id} aria-label="Results">
 *   {(index) => <ResultCard result={results[index]} />}
 * </VirtualList>
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
  /** The list's own element: the box that scrolls, or, with `scroll="window"`, the block the window scrolls past. */
  element: HTMLDivElement | null;
};

/** The items in view (not counting the extra rows kept above and below), as indexes. */
export type VirtualRange = { start: number; end: number };

type Shared = Omit<ComponentProps<"div">, "children" | "ref"> & {
  /** How many items there are in all. It may change: rows keep their measured heights by key. */
  count: number;
  /**
   * What scrolls. "box" (default): the list's own box, which needs a height. "window": the page; the list
   * takes its full length in the page, renders the rows the window shows, and is not a Tab stop (the page
   * already scrolls by keyboard). `scrollToIndex` then scrolls the window, leaving room for a sticky header
   * when the list has a `scroll-margin-top` (`className="scroll-mt-16"`), and `onScroll` is not called.
   */
  scroll?: "box" | "window";
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

/**
 * Where the view is, as the distance scrolled past the top of the box. In its own box that is `scrollTop`;
 * with the window it is how far the box's top edge is above the window's, and negative while the list has
 * not yet reached the top of the window.
 */
function topOf(box: HTMLElement, windowed: boolean): number {
  if (!windowed) return box.scrollTop;
  const sizer = box.firstElementChild;
  return insetOf(box) - (sizer ? sizer.getBoundingClientRect().top : box.getBoundingClientRect().top);
}

/** The height of the view: the box's, or the window's. */
const viewOf = (box: HTMLElement, windowed: boolean): number => (windowed ? document.documentElement.clientHeight : box.clientHeight);

/** Moves the view. Outside any component: the box and the window are the browser's, scrolled in place. */
function moveTo(box: HTMLElement, windowed: boolean, top: number): void {
  if (!windowed) box.scrollTop = top;
  else window.scrollBy({ top: top - topOf(box, true), behavior: "instant" });
}

/** How far the view can go either way, and where it is when the end of the list is at the end of the view. */
function reachOf(box: HTMLElement, windowed: boolean): { least: number; most: number; end: number } {
  if (!windowed) {
    const most = box.scrollHeight - box.clientHeight;
    return { least: 0, most, end: most };
  }
  const now = topOf(box, true);
  const view = viewOf(box, true);
  const least = now - window.scrollY;
  const most = now + Math.max(0, document.documentElement.scrollHeight - view - window.scrollY);
  return { least, most, end: box.offsetHeight - view };
}

/** The room a sticky header takes at the top of the window: the list's own `scroll-margin-top`. */
const headroomOf = (box: HTMLElement, windowed: boolean): number => (windowed ? Number.parseFloat(getComputedStyle(box).scrollMarginTop) || 0 : 0);

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
  /** The window scrolls the list, not its own box. */
  windowed: boolean;
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
  const { box, windowed, height, ready, count, rowCount, perRow, grid, estimateSize, getKey, gap, overscan, restoreKey, handleRef, onRangeChange, onScroll, onKeyDown } = options;
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
  /** With the window: Home or End was pressed, and the page is on its way to that end of itself. */
  const bound = useRef<"top" | "bottom" | null>(null);

  const applyTarget = useCallback((): void => {
    const goal = target.current;
    const now = latest.current;
    const box = element.current;
    if (!goal || !box || now.rowCount === 0) return;
    const row = Math.min(goal.row, now.rowCount - 1);
    const start = now.offsets[row] ?? 0;
    const size = (now.offsets[row + 1] ?? start) - start - (row < now.rowCount - 1 ? now.gap : 0);
    const inset = insetOf(box);
    const view = viewOf(box, windowed);
    const reach = reachOf(box, windowed);
    const headroom = headroomOf(box, windowed);
    const within = (value: number): number => Math.max(reach.least, Math.min(value, reach.most));
    const wanted = inset + (goal.align === "start" ? start + goal.offset - headroom : goal.align === "center" ? start - (view - headroom - size) / 2 - headroom : start + size - view);
    // The first and last rows go to the very ends, the box's padding included.
    const top = within(row === 0 && goal.align === "start" && goal.offset === 0 ? -headroom : row === now.rowCount - 1 && goal.align === "end" ? reach.end : wanted);
    if (Math.abs(topOf(box, windowed) - top) > 1) moveTo(box, windowed, top);
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => {
      target.current = null;
    }, 300);
  }, [windowed]);

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
    const release = (event: Event): void => {
      target.current = null;
      // Home and End are the page's own keys. While the page is on its way, the list must not hold it back.
      const key = windowed && event instanceof KeyboardEvent && !event.defaultPrevented && !(event.target instanceof Element && event.target.closest("input, textarea, select, [contenteditable]")) ? event.key : "";
      bound.current = key === "Home" ? "top" : key === "End" ? "bottom" : null;
    };
    const events = ["wheel", "touchmove", "keydown", "pointerdown"] as const;
    // With the window scrolling, the scroll may be made anywhere on the page.
    const source: HTMLElement | Window = windowed ? window : box;
    for (const name of events) source.addEventListener(name, release, { passive: true });
    return () => {
      for (const name of events) source.removeEventListener(name, release);
      window.clearTimeout(settle.current);
    };
  }, [box, windowed]);

  /** Rows report their heights here. A row above the view that changes height moves the view by as much, so what the person is reading stays still. */
  const measure = useCallback(
    (entries: ResizeObserverEntry[]): void => {
      const box = element.current;
      if (!box) return;
      const now = latest.current;
      const top = topOf(box, windowed);
      const inset = insetOf(box);
      const anchor = rowAt(now.offsets, now.rowCount, top - inset);
      // At the very end, stay there: rows measured taller than their estimate must not push the end out of reach.
      // With the window the end is the page's: it is there, or End was pressed and it is on its way.
      const page = document.documentElement;
      const pinned = windowed ? bound.current === "bottom" || (window.scrollY > 0 && window.scrollY + page.clientHeight >= page.scrollHeight - 1) : top > 0 && top + box.clientHeight >= box.scrollHeight - 1;
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
      if (pinned) {
        if (windowed) window.scrollTo({ top: page.scrollHeight, behavior: "instant" });
        else box.scrollTop = box.scrollHeight - box.clientHeight;
      }
      // On its way to the top of the page: there is nothing to hold still, and a scroll made here would stop it short.
      else if (windowed && bound.current === "top") return;
      // With the window, the browser may have moved the page itself to keep something below the list still:
      // the rows the person is reading are what must not move, so the place is set again from where it is.
      else if (windowed ? Math.abs(topOf(box, true) - (top + shift)) > 0.5 : shift !== 0) moveTo(box, windowed, top + shift);
    },
    [windowed],
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
        const top = topOf(box, windowed) - insetOf(box);
        if (start >= top + headroomOf(box, windowed) && end <= top + viewOf(box, windowed)) return;
        align = start < top + headroomOf(box, windowed) ? "start" : "end";
      }
      target.current = { row, align, offset: 0 };
      applyTarget();
    },
    [applyTarget, windowed],
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

  /** The view moved: remember the place, and render other rows if other rows are now in view. */
  const scrolled = useCallback(
    (flush: boolean): void => {
      const box = element.current;
      if (!box) return;
      const top = topOf(box, windowed) - insetOf(box);
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
      if (rowAt(now.offsets, now.rowCount, top) === now.first && rowAt(now.offsets, now.rowCount, top + viewOf(box, windowed)) === now.last) return;
      if (flush) flushSync(() => setScrollTop(top));
      else setScrollTop(top);
    },
    [windowed, restoreKey, save],
  );

  // With the window: its scroll is the list's, and so is wherever the page already is when the list arrives.
  useEffect(() => {
    if (!windowed || !box || !ready) return;
    const onWindowScroll = (): void => scrolled(true);
    const first = window.requestAnimationFrame(() => scrolled(false));
    window.addEventListener("scroll", onWindowScroll, { passive: true });
    return () => {
      window.cancelAnimationFrame(first);
      window.removeEventListener("scroll", onWindowScroll);
    };
  }, [windowed, box, ready, scrolled]);

  return {
    rows,
    offsets,
    total,
    onScroll: (event) => {
      onScroll?.(event);
      if (!windowed) scrolled(true);
    },
    onKeyDown: (event) => {
      onKeyDown?.(event);
      // With the window, Home and End are the page's: they go to its top and its bottom.
      if (windowed) return;
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

/** The size of the view (the height of the box that scrolls, or of the window) and of what is inside it (its width), kept current. */
function useBox(windowed: boolean): { box: HTMLDivElement | null; setBox: (node: HTMLDivElement | null) => void; height: number; width: number } {
  const [box, setBox] = useState<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ height: 0, width: 0 });
  useEffect(() => {
    if (!box || typeof ResizeObserver === "undefined") return;
    const inner = box.firstElementChild;
    const look = (): void => {
      const height = viewOf(box, windowed);
      const width = inner?.clientWidth ?? box.clientWidth;
      setSize((previous) => (previous.height === height && previous.width === width ? previous : { height, width }));
    };
    const observer = new ResizeObserver(look);
    observer.observe(box);
    if (inner) observer.observe(inner);
    if (windowed) window.addEventListener("resize", look);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", look);
    };
  }, [box, windowed]);
  return { box, setBox, height: size.height, width: size.width };
}

const BOX = "relative min-h-0 overflow-x-hidden overflow-y-auto overscroll-contain [overflow-anchor:none]";
/** With the window scrolling: a plain block as long as its rows. The browser does not anchor the page's scroll to rows that are placed by transform. */
const PAGE = "relative [overflow-anchor:none]";
const ROW = "absolute inset-x-0 top-0";

/**
 * A list (`role="list"`) whose box scrolls and takes focus, so the arrow keys and Page Up and Down scroll it
 * as they do any region; Home and End go to the first and the last row themselves, not to where the end was
 * estimated to be. Each rendered item is a `listitem` carrying `aria-setsize` (the whole
 * count) and `aria-posinset`, so a screen reader says "37 of 10,000" although only a few are in the page.
 * Rows are placed with a transform and are not animated. Give the box a height (`className="h-96"`) and a
 * name (`aria-label`); without a height nothing scrolls and every row is rendered. With `scroll="window"`
 * it needs no height: the page scrolls, and the keys are the page's.
 */
export function VirtualList({ className, count, scroll = "box", estimateSize = 48, overscan = 4, gap = 0, getKey, restoreKey, handleRef, onRangeChange, onScroll, onKeyDown, children, ...props }: VirtualListProps) {
  const windowed = scroll === "window";
  const { box, setBox, height } = useBox(windowed);
  const list = useWindowing({ box, windowed, height, ready: height > 0, count, rowCount: count, perRow: 1, grid: false, estimateSize, getKey, gap, overscan, restoreKey, handleRef, onRangeChange, onScroll, onKeyDown });
  return (
    <div ref={setBox} data-slot="virtual-list" data-scroll={scroll} role="list" tabIndex={windowed ? undefined : 0} onScroll={list.onScroll} onKeyDown={list.onKeyDown} className={cn(windowed ? PAGE : BOX, className)} {...props}>
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
export function VirtualGrid({ className, count, scroll = "box", columns = { minWidth: 160 }, estimateSize = 160, overscan = 2, gap = 0, getKey, restoreKey, handleRef, onRangeChange, onScroll, onKeyDown, children, ...props }: VirtualGridProps) {
  const windowed = scroll === "window";
  const { box, setBox, height, width } = useBox(windowed);
  const perRow = typeof columns === "number" ? Math.max(1, Math.floor(columns)) : Math.max(1, Math.floor((width + gap) / (Math.max(1, columns.minWidth) + gap)));
  const rowCount = Math.ceil(count / perRow);
  const grid = useWindowing({ box, windowed, height, ready: height > 0 && width > 0, count, rowCount, perRow, grid: true, estimateSize, getKey: undefined, gap, overscan, restoreKey, handleRef, onRangeChange, onScroll, onKeyDown });
  return (
    <div ref={setBox} data-slot="virtual-grid" data-scroll={scroll} role="list" tabIndex={windowed ? undefined : 0} data-columns={perRow} onScroll={grid.onScroll} onKeyDown={grid.onKeyDown} className={cn(windowed ? PAGE : BOX, className)} {...props}>
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
