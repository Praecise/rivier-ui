"use client";
/**
 * @name data-grid
 * @category ui
 * @description A table of records a person works in: sorting by one or several columns, a filter per column and a search across all, grouping with totals, columns pinned to the start, shown and hidden, rows chosen by checkbox, pages or a window of rows for thousands, and cells edited in place; one tab stop and arrow keys from cell to cell, to the WAI-ARIA grid pattern.
 * @when Lists of records that are sorted, narrowed, compared and changed: orders, accounts, files, results. For a few rows to read use table; for side-by-side comparison of two to four things use compare-table; for an endless feed use virtual-list.
 * @example
 * <DataGrid
 *   label="Orders"
 *   rows={orders}
 *   rowId={(order) => order.id}
 *   columns={[
 *     { key: "id", header: "Order", pin: "start", width: 110 },
 *     { key: "customer", header: "Customer" },
 *     { key: "status", header: "Status" },
 *     { key: "total", header: "Total", type: "number", aggregate: "sum", editable: true },
 *   ]}
 *   selectable
 *   pageSize={20}
 *   onCellEdit={(id, key, value) => save(id, key, value)}
 * />
 */
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronRight, Columns3, Search } from "lucide-react";
import { createContext, use, useId, useMemo, useRef, useState, type ComponentProps, type KeyboardEvent, type ReactNode } from "react";
import { announce } from "@/lib/announce";
import { cn } from "@/lib/cn";
import { useControllableState } from "@/lib/use-controllable-state";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

export type DataGridAggregate = "sum" | "mean" | "count" | "min" | "max";

export type DataGridColumn<T> = {
  /** The field the column shows. */
  key: keyof T & string;
  header: string;
  /** How values sort, align and are typed when edited. Default "text". */
  type?: "text" | "number" | "date";
  /** Width in pixels. Pinned columns need one; others share the space. */
  width?: number;
  /** Text for a value: in the cell, the search and the filter. Default: Intl for numbers, the value as text otherwise. */
  format?: (value: unknown, row: T) => string;
  /** The cell's content, when it is more than text. The text of `format` is still what is searched. */
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  /** The cell can be changed: Enter or F2 starts, Enter keeps, Escape leaves it as it was. */
  editable?: boolean;
  /** What a group's row shows for this column. */
  aggregate?: DataGridAggregate;
  /** Stays in view at the start while the rest scrolls sideways. */
  pin?: "start";
};

export type DataGridSort = { key: string; direction: "ascending" | "descending" };

export type DataGridLabels = {
  search: string;
  columns: string;
  filter: (column: string) => string;
  sortBy: (column: string) => string;
  sorted: (column: string, direction: "ascending" | "descending") => string;
  noResults: string;
  selectAll: string;
  selectRow: (row: number) => string;
  selected: (count: string) => string;
  results: (shown: string, total: string) => string;
  page: (page: string, pages: string) => string;
  previous: string;
  next: string;
  group: (value: string, count: string) => string;
  expand: string;
  collapse: string;
  editHint: string;
  empty: string;
};

const LABELS: DataGridLabels = {
  search: "Search",
  columns: "Columns",
  filter: (column) => `Filter ${column}`,
  sortBy: (column) => `Sort by ${column}`,
  sorted: (column, direction) => `Sorted by ${column}, ${direction}`,
  noResults: "Nothing matches.",
  selectAll: "Choose every row on this page",
  selectRow: (row) => `Choose row ${row}`,
  selected: (count) => `${count} chosen`,
  results: (shown, total) => `${shown} of ${total}`,
  page: (page, pages) => `Page ${page} of ${pages}`,
  previous: "Previous page",
  next: "Next page",
  group: (value, count) => `${value} (${count})`,
  expand: "Show the group",
  collapse: "Hide the group",
  editHint: "Enter to edit",
  empty: "(empty)",
};

type GridState<T> = {
  id: string;
  label: string;
  columns: readonly DataGridColumn<T>[];
  visible: readonly DataGridColumn<T>[];
  hidden: readonly string[];
  setHidden: (next: readonly string[]) => void;
  sort: readonly DataGridSort[];
  setSort: (next: readonly DataGridSort[]) => void;
  filters: Readonly<Record<string, string>>;
  setFilters: (next: Readonly<Record<string, string>>) => void;
  search: string;
  setSearch: (next: string) => void;
  groupBy: string | null;
  page: number;
  setPage: (next: number) => void;
  pages: number;
  pageRows: readonly Line<T>[];
  matched: readonly T[];
  total: number;
  selected: readonly string[];
  setSelected: (next: readonly string[]) => void;
  selectable: boolean;
  rowId: (row: T) => string;
  text: (column: DataGridColumn<T>, row: T) => string;
  labels: DataGridLabels;
  locale: string;
  collapsed: readonly string[];
  toggleGroup: (value: string) => void;
  onCellEdit: ((id: string, key: string, value: string | number) => void) | undefined;
  height: number | undefined;
  rowHeight: number;
};

type Line<T> = { kind: "row"; row: T; index: number } | { kind: "group"; value: string; rows: readonly T[] };

// The context holds the grid of one row type; parts read it without knowing the type.
const GridContext = createContext<GridState<object> | null>(null);

function useGrid(part: string): GridState<object> {
  const context = use(GridContext);
  if (!context) throw new Error(`${part} must be inside a DataGrid.`);
  return context;
}

export type DataGridProps<T extends object> = Omit<ComponentProps<"div">, "children" | "defaultValue"> & {
  /** What the grid holds, for assistive technology: "Orders". */
  label: string;
  rows: readonly T[];
  columns: readonly DataGridColumn<T>[];
  /** A stable id for each row: selection and editing keep to it as rows move. */
  rowId: (row: T) => string;
  sort?: readonly DataGridSort[];
  defaultSort?: readonly DataGridSort[];
  onSortChange?: (sort: readonly DataGridSort[]) => void;
  /** A column key to group rows by, with a row per group showing its count and aggregates. */
  groupBy?: string | null;
  hidden?: readonly string[];
  defaultHidden?: readonly string[];
  onHiddenChange?: (hidden: readonly string[]) => void;
  /** A checkbox on each row and one for the page. */
  selectable?: boolean;
  selected?: readonly string[];
  defaultSelected?: readonly string[];
  onSelectedChange?: (selected: readonly string[]) => void;
  /** Rows per page. Leave out (or 0) for one page; with `height`, only the rows in view are drawn. */
  pageSize?: number;
  /** A fixed height in pixels for the scrolling body; long lists then draw only the rows in view. */
  height?: number;
  /** The height of a row in pixels, for drawing only the rows in view. Default 40. */
  rowHeight?: number;
  /** Called when a cell is edited: the row's id, the column key and the new value. The project changes `rows`. */
  onCellEdit?: (id: string, key: string, value: string | number) => void;
  labels?: Partial<DataGridLabels>;
  locale?: string;
  /** The parts, arranged by the project. Left out: toolbar, grid and pages. */
  children?: ReactNode;
};

const EMPTY: readonly never[] = [];

function aggregateOf(kind: DataGridAggregate, values: number[]): number {
  if (kind === "count") return values.length;
  if (values.length === 0) return 0;
  if (kind === "sum") return values.reduce((a, b) => a + b, 0);
  if (kind === "mean") return values.reduce((a, b) => a + b, 0) / values.length;
  if (kind === "min") return Math.min(...values);
  return Math.max(...values);
}

export function DataGrid<T extends object>({
  label,
  rows,
  columns,
  rowId,
  sort: sortProp,
  defaultSort = EMPTY,
  onSortChange,
  groupBy = null,
  hidden: hiddenProp,
  defaultHidden = EMPTY,
  onHiddenChange,
  selectable = false,
  selected: selectedProp,
  defaultSelected = EMPTY,
  onSelectedChange,
  pageSize = 0,
  height,
  rowHeight = 40,
  onCellEdit,
  labels: given,
  locale = "en-US",
  className,
  children,
  ...props
}: DataGridProps<T>) {
  const id = useId();
  const labels = { ...LABELS, ...given };
  const [sort, setSort] = useControllableState<readonly DataGridSort[]>({ value: sortProp, defaultValue: defaultSort, onChange: onSortChange });
  const [hidden, setHidden] = useControllableState<readonly string[]>({ value: hiddenProp, defaultValue: defaultHidden, onChange: onHiddenChange });
  const [selected, setSelected] = useControllableState<readonly string[]>({ value: selectedProp, defaultValue: defaultSelected, onChange: onSelectedChange });
  const [filters, setFilters] = useState<Readonly<Record<string, string>>>({});
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [collapsed, setCollapsed] = useState<readonly string[]>([]);

  const numbers = useMemo(() => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }), [locale]);
  const text = (column: DataGridColumn<T>, row: T): string => {
    const value = (row as Record<string, unknown>)[column.key];
    if (column.format) return column.format(value, row);
    if (typeof value === "number") return numbers.format(value);
    return value === null || value === undefined ? "" : String(value);
  };
  const visible = columns.filter((column) => !hidden.includes(column.key));
  // Pinned columns first, so they can stick at the start.
  const ordered = [...visible.filter((c) => c.pin === "start"), ...visible.filter((c) => c.pin !== "start")];

  const matched = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase(locale);
    const active = Object.entries(filters).filter(([, value]) => value.trim() !== "");
    const out = rows.filter((row) => {
      if (needle && !columns.some((column) => text(column, row).toLocaleLowerCase(locale).includes(needle))) return false;
      return active.every(([key, value]) => {
        const column = columns.find((c) => c.key === key);
        return column ? text(column, row).toLocaleLowerCase(locale).includes(value.trim().toLocaleLowerCase(locale)) : true;
      });
    });
    const collator = new Intl.Collator(locale, { numeric: true, sensitivity: "base" });
    if (sort.length > 0) {
      out.sort((a, b) => {
        for (const item of sort) {
          const column = columns.find((c) => c.key === item.key);
          if (!column) continue;
          const va = (a as Record<string, unknown>)[item.key];
          const vb = (b as Record<string, unknown>)[item.key];
          let order: number;
          if (column.type === "number") order = (typeof va === "number" ? va : -Infinity) - (typeof vb === "number" ? vb : -Infinity);
          else if (column.type === "date") order = String(va ?? "").localeCompare(String(vb ?? ""));
          else order = collator.compare(text(column, a), text(column, b));
          if (order !== 0) return item.direction === "ascending" ? order : -order;
        }
        return 0;
      });
    }
    return out;
    // `text` follows `columns` and `locale`, which are listed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, columns, filters, search, sort, locale]);

  const lines = useMemo((): Line<T>[] => {
    if (!groupBy) return matched.map((row, index) => ({ kind: "row", row, index }));
    const column = columns.find((c) => c.key === groupBy);
    const groups = new Map<string, T[]>();
    for (const row of matched) {
      const value = column ? text(column, row) : String((row as Record<string, unknown>)[groupBy] ?? "");
      groups.set(value, [...(groups.get(value) ?? []), row]);
    }
    let index = 0;
    return [...groups].flatMap(([value, members]) => [
      { kind: "group" as const, value, rows: members },
      ...(collapsed.includes(value) ? [] : members.map((row) => ({ kind: "row" as const, row, index: index++ }))),
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matched, groupBy, columns, collapsed]);

  const size = pageSize > 0 ? pageSize : Math.max(1, lines.length);
  const pages = Math.max(1, Math.ceil(lines.length / size));
  const current = Math.min(page, pages - 1);
  const pageRows = lines.slice(current * size, current * size + size);

  const state: GridState<T> = {
    id,
    label,
    columns,
    visible: ordered,
    hidden,
    setHidden,
    sort,
    setSort: (next) => {
      setSort(next);
      const first = next[0];
      const column = columns.find((c) => c.key === first?.key);
      if (first && column) announce(labels.sorted(column.header, first.direction));
    },
    filters,
    setFilters: (next) => {
      setFilters(next);
      setPage(0);
    },
    search,
    setSearch: (next) => {
      setSearch(next);
      setPage(0);
    },
    groupBy,
    page: current,
    setPage,
    pages,
    pageRows,
    matched,
    total: rows.length,
    selected,
    setSelected,
    selectable,
    rowId,
    text,
    labels,
    locale,
    collapsed,
    toggleGroup: (value) => setCollapsed((list) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value])),
    onCellEdit,
    height,
    rowHeight,
  };

  return (
    <GridContext value={state as unknown as GridState<object>}>
      <div data-slot="data-grid" className={cn("@container flex w-full min-w-0 flex-col gap-3", className)} {...props}>
        {children ?? (
          <>
            <DataGridToolbar>
              <DataGridSearch />
              <DataGridColumns />
            </DataGridToolbar>
            <DataGridTable />
            <DataGridFooter />
          </>
        )}
      </div>
    </GridContext>
  );
}

/** A row of controls over the grid: search, the columns menu, actions of the project's own. */
export function DataGridToolbar({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="data-grid-toolbar" className={cn("flex flex-wrap items-center gap-2", className)} {...props} />;
}

/** One field that narrows the rows by any column's text. */
export function DataGridSearch({ className, ...props }: Omit<ComponentProps<"input">, "value" | "onChange" | "size">) {
  const grid = useGrid("DataGridSearch");
  return (
    <div className={cn("relative min-w-0 flex-1 @md:max-w-xs", className)}>
      <Search aria-hidden="true" className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input type="search" aria-label={grid.labels.search} placeholder={grid.labels.search} value={grid.search} onChange={(event) => grid.setSearch(event.target.value)} className="ps-9" {...props} />
    </div>
  );
}

/** A menu of the columns, each shown or hidden by a checkbox item. */
export function DataGridColumns({ className }: { className?: string }) {
  const grid = useGrid("DataGridColumns");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={className}>
          <Columns3 aria-hidden="true" />
          {grid.labels.columns}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{grid.labels.columns}</DropdownMenuLabel>
        {grid.columns.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.key}
            checked={!grid.hidden.includes(column.key)}
            // At least one column stays.
            disabled={!grid.hidden.includes(column.key) && grid.columns.length - grid.hidden.length <= 1}
            onCheckedChange={(on) => grid.setHidden(on ? grid.hidden.filter((key) => key !== column.key) : [...grid.hidden, column.key])}
            onSelect={(event) => event.preventDefault()}
          >
            {column.header}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** The grid itself: headers with sorting and filters, rows, group rows, and the keys of the grid pattern. */
export function DataGridTable({ className, showFilters = true, ...props }: ComponentProps<"div"> & { showFilters?: boolean }) {
  const grid = useGrid("DataGridTable");
  const { visible, pageRows, labels, selectable } = grid;
  const [focus, setFocus] = useState<{ row: number; column: number }>({ row: 0, column: 0 });
  const [editing, setEditing] = useState<{ row: number; column: number; value: string } | null>(null);
  const [scroll, setScroll] = useState(0);
  const tableRef = useRef<HTMLTableElement>(null);
  const columnCount = visible.length + (selectable ? 1 : 0);
  // Grid rows: the header, the filter row, then the body. Positions are 0-based here.
  const headRows = showFilters ? 2 : 1;
  const rowCount = headRows + pageRows.length;
  const lead = selectable ? 1 : 0;
  const pinnedWidths = visible.map((column) => (column.pin === "start" ? (column.width ?? 160) : 0));
  const offsetOf = (index: number): number => (selectable ? 48 : 0) + pinnedWidths.slice(0, index).reduce((a, b) => a + b, 0);

  // Only the rows in view are drawn when the body has a fixed height.
  const windowed = grid.height !== undefined && pageRows.length > 60;
  const first = windowed ? Math.max(0, Math.floor(scroll / grid.rowHeight) - 10) : 0;
  const last = windowed ? Math.min(pageRows.length, first + Math.ceil((grid.height ?? 0) / grid.rowHeight) + 20) : pageRows.length;

  const moveTo = (row: number, column: number): void => {
    const next = { row: Math.max(0, Math.min(rowCount - 1, row)), column: Math.max(0, Math.min(columnCount - 1, column)) };
    setFocus(next);
    requestAnimationFrame(() => {
      const cell = tableRef.current?.querySelector<HTMLElement>(`[data-cell="${next.row}:${next.column}"]`);
      // A cell holding one control hands focus to it, as the grid pattern asks.
      const inner = cell?.querySelector<HTMLElement>("button, input, [role=checkbox]");
      (inner ?? cell)?.focus();
      if (!cell && windowed && tableRef.current?.parentElement) tableRef.current.parentElement.scrollTop = (next.row - headRows) * grid.rowHeight;
    });
  };
  const sortBy = (column: DataGridColumn<object>, add: boolean): void => {
    const existing = grid.sort.find((item) => item.key === column.key);
    const direction: DataGridSort["direction"] = existing?.direction === "ascending" ? "descending" : "ascending";
    const rest = add ? grid.sort.filter((item) => item.key !== column.key) : [];
    grid.setSort(existing?.direction === "descending" && !add ? [] : [...rest, { key: column.key, direction }]);
  };
  const commit = (): void => {
    if (!editing) return;
    const line = pageRows[editing.row - headRows];
    const column = visible[editing.column - lead];
    if (line?.kind === "row" && column) {
      const value = column.type === "number" ? Number(editing.value) : editing.value;
      if (!(column.type === "number" && !Number.isFinite(value))) grid.onCellEdit?.(grid.rowId(line.row), column.key, value);
    }
    setEditing(null);
    moveTo(editing.row, editing.column);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLTableElement>): void => {
    if (editing) return;
    const target = event.target as HTMLElement;
    if (target.tagName === "INPUT" && (target as HTMLInputElement).type !== "checkbox" && !["ArrowUp", "ArrowDown", "Escape"].includes(event.key)) return;
    const page = Math.max(1, Math.floor((grid.height ?? 400) / grid.rowHeight) - 1);
    const { row, column } = focus;
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const ahead = rtl ? "ArrowLeft" : "ArrowRight";
    const back = rtl ? "ArrowRight" : "ArrowLeft";
    if (event.key === ahead) moveTo(row, column + 1);
    else if (event.key === back) moveTo(row, column - 1);
    else if (event.key === "ArrowDown") moveTo(row + 1, column);
    else if (event.key === "ArrowUp") moveTo(row - 1, column);
    else if (event.key === "Home") moveTo(event.ctrlKey ? 0 : row, 0);
    else if (event.key === "End") moveTo(event.ctrlKey ? rowCount - 1 : row, columnCount - 1);
    else if (event.key === "PageDown") moveTo(row + page, column);
    else if (event.key === "PageUp") moveTo(row - page, column);
    else if ((event.key === "Enter" || event.key === "F2") && row >= headRows) {
      const column_ = visible[column - lead];
      const line = pageRows[row - headRows];
      if (line?.kind === "group") {
        grid.toggleGroup(line.value);
      } else if (column_?.editable && line?.kind === "row" && grid.onCellEdit) {
        setEditing({ row, column, value: String((line.row as Record<string, unknown>)[column_.key] ?? "") });
      } else return;
    } else return;
    event.preventDefault();
  };
  const cellProps = (row: number, column: number): { "data-cell": string; tabIndex: number; onFocus: () => void } => ({
    "data-cell": `${row}:${column}`,
    tabIndex: focus.row === row && focus.column === column ? 0 : -1,
    onFocus: () => setFocus({ row, column }),
  });
  const pin = (index: number): { className: string; style: { insetInlineStart: number; width: number; minWidth: number } } | { className: string; style?: undefined } =>
    visible[index]?.pin === "start"
      ? { className: "sticky z-10 bg-card", style: { insetInlineStart: offsetOf(index), width: pinnedWidths[index] ?? 160, minWidth: pinnedWidths[index] ?? 160 } }
      : { className: "" };
  const pageIds = pageRows.flatMap((line) => (line.kind === "row" ? [grid.rowId(line.row)] : []));
  const allChosen = pageIds.length > 0 && pageIds.every((rid) => grid.selected.includes(rid));
  const someChosen = pageIds.some((rid) => grid.selected.includes(rid));
  const aggregate = (column: DataGridColumn<object>, members: readonly object[]): string => {
    if (!column.aggregate) return "";
    const values = members.map((row) => (row as Record<string, unknown>)[column.key]).filter((v): v is number => typeof v === "number");
    return new Intl.NumberFormat(grid.locale, { maximumFractionDigits: 2 }).format(aggregateOf(column.aggregate, values));
  };

  return (
    <div
      data-slot="data-grid-scroller"
      className={cn("relative w-full overflow-auto rounded-surface border", className)}
      style={grid.height !== undefined ? { maxHeight: grid.height } : undefined}
      onScroll={windowed ? (event) => setScroll(event.currentTarget.scrollTop) : undefined}
      {...props}
    >
      <table
        ref={tableRef}
        role="grid"
        aria-label={grid.label}
        aria-rowcount={headRows + (grid.groupBy ? pageRows.length : grid.matched.length)}
        aria-colcount={columnCount}
        className="w-full border-separate border-spacing-0 text-sm"
        onKeyDown={onKeyDown}
      >
        <thead className="sticky top-0 z-20 bg-card">
          <tr aria-rowindex={1}>
            {selectable ? (
              <th scope="col" className="sticky start-0 z-10 w-12 border-b bg-card px-3" {...cellProps(0, 0)}>
                <Checkbox
                  aria-label={labels.selectAll}
                  checked={allChosen ? true : someChosen ? "indeterminate" : false}
                  onCheckedChange={(on) => grid.setSelected(on === true ? [...new Set([...grid.selected, ...pageIds])] : grid.selected.filter((rid) => !pageIds.includes(rid)))}
                  tabIndex={-1}
                />
              </th>
            ) : null}
            {visible.map((column, index) => {
              const sorted = grid.sort.find((item) => item.key === column.key);
              const position = grid.sort.length > 1 && sorted ? grid.sort.indexOf(sorted) + 1 : null;
              const Icon = sorted ? (sorted.direction === "ascending" ? ArrowUp : ArrowDown) : ArrowUpDown;
              const p = pin(index);
              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={sorted ? sorted.direction : column.sortable === false ? undefined : "none"}
                  className={cn("h-10 border-b px-3 text-start font-medium whitespace-nowrap text-muted-foreground", column.type === "number" && "text-end", p.className)}
                  style={p.style ?? (column.width ? { width: column.width } : undefined)}
                  {...cellProps(0, index + lead)}
                >
                  {column.sortable === false ? (
                    column.header
                  ) : (
                    <button
                      type="button"
                      tabIndex={-1}
                      aria-label={labels.sortBy(column.header)}
                      onClick={(event) => sortBy(column, event.shiftKey)}
                      className={cn("inline-flex min-h-8 items-center gap-1 rounded-control hover:text-foreground", sorted && "text-foreground")}
                    >
                      {column.header}
                      <Icon aria-hidden="true" className={cn("size-3.5", !sorted && "opacity-50")} />
                      {position ? <span className="text-xs tabular-nums">{position}</span> : null}
                    </button>
                  )}
                </th>
              );
            })}
          </tr>
          {showFilters ? (
            <tr aria-rowindex={2}>
              {selectable ? <td className="sticky start-0 z-10 border-b bg-card" {...cellProps(1, 0)} /> : null}
              {visible.map((column, index) => {
                const p = pin(index);
                return (
                  <td key={column.key} className={cn("border-b px-2 py-1.5", p.className)} style={p.style} {...cellProps(1, index + lead)}>
                    {column.filterable === false ? null : (
                      <Input
                        size="sm"
                        tabIndex={-1}
                        aria-label={labels.filter(column.header)}
                        value={grid.filters[column.key] ?? ""}
                        onChange={(event) => grid.setFilters({ ...grid.filters, [column.key]: event.target.value })}
                        className="min-w-16"
                      />
                    )}
                  </td>
                );
              })}
            </tr>
          ) : null}
        </thead>
        <tbody>
          {pageRows.length === 0 ? (
            <tr>
              <td colSpan={columnCount} className="px-3 py-8 text-center text-muted-foreground">
                {labels.noResults}
              </td>
            </tr>
          ) : null}
          {windowed && first > 0 ? (
            <tr aria-hidden="true">
              <td colSpan={columnCount} style={{ height: first * grid.rowHeight, padding: 0 }} />
            </tr>
          ) : null}
          {pageRows.slice(first, last).map((line, offset) => {
            const position = first + offset;
            const row = headRows + position;
            if (line.kind === "group") {
              const open = !grid.collapsed.includes(line.value);
              return (
                <tr key={`group:${line.value}`} aria-rowindex={row + 1} aria-expanded={open} className="bg-muted">
                  {selectable ? <td className="sticky start-0 z-10 border-b bg-muted" /> : null}
                  {visible.map((column, index) => {
                    const p = pin(index);
                    return (
                      <td
                        key={column.key}
                        className={cn("border-b px-3 font-medium", column.type === "number" && "text-end tabular-nums", p.className, p.className && "bg-muted")}
                        style={{ ...p.style, height: grid.rowHeight }}
                        {...cellProps(row, index + lead)}
                      >
                        {index === 0 ? (
                          <button
                            type="button"
                            tabIndex={-1}
                            onClick={() => grid.toggleGroup(line.value)}
                            aria-label={`${open ? labels.collapse : labels.expand}: ${line.value}`}
                            className="inline-flex items-center gap-1 rounded-control"
                          >
                            {open ? <ChevronDown aria-hidden="true" className="size-4" /> : <ChevronRight aria-hidden="true" className="size-4 rtl:-scale-x-100" />}
                            {labels.group(line.value || labels.empty, new Intl.NumberFormat(grid.locale).format(line.rows.length))}
                          </button>
                        ) : (
                          aggregate(column, line.rows)
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            }
            const rid = grid.rowId(line.row);
            const chosen = grid.selected.includes(rid);
            return (
              <tr
                key={rid}
                aria-rowindex={headRows + line.index + 1}
                aria-selected={selectable ? chosen : undefined}
                className={cn("hover:bg-accent", chosen && "bg-highlight-soft hover:bg-highlight-soft")}
              >
                {selectable ? (
                  <td className={cn("sticky start-0 z-10 border-b px-3", chosen ? "bg-highlight-soft" : "bg-card")} style={{ height: grid.rowHeight }} {...cellProps(row, 0)}>
                    <Checkbox
                      aria-label={labels.selectRow(line.index + 1)}
                      checked={chosen}
                      tabIndex={-1}
                      onCheckedChange={(on) => grid.setSelected(on === true ? [...grid.selected, rid] : grid.selected.filter((x) => x !== rid))}
                    />
                  </td>
                ) : null}
                {visible.map((column, index) => {
                  const p = pin(index);
                  const isEditing = editing?.row === row && editing.column === index + lead;
                  return (
                    <td
                      key={column.key}
                      className={cn("border-b px-3 whitespace-nowrap", column.type === "number" && "text-end tabular-nums", p.className, p.className && chosen && "bg-highlight-soft")}
                      style={{ ...p.style, height: grid.rowHeight }}
                      aria-description={column.editable && grid.onCellEdit ? labels.editHint : undefined}
                      {...cellProps(row, index + lead)}
                    >
                      {isEditing ? (
                        <Input
                          size="sm"
                          // The field is the edit: it takes focus as it opens.
                          autoFocus
                          aria-label={column.header}
                          type={column.type === "number" ? "number" : "text"}
                          value={editing.value}
                          onChange={(event) => setEditing({ ...editing, value: event.target.value })}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              commit();
                            } else if (event.key === "Escape") {
                              event.preventDefault();
                              setEditing(null);
                              moveTo(row, index + lead);
                            }
                            event.stopPropagation();
                          }}
                          onBlur={commit}
                        />
                      ) : column.render ? (
                        column.render(line.row)
                      ) : (
                        grid.text(column, line.row)
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
          {windowed && last < pageRows.length ? (
            <tr aria-hidden="true">
              <td colSpan={columnCount} style={{ height: (pageRows.length - last) * grid.rowHeight, padding: 0 }} />
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

/** Under the grid: how many rows match, how many are chosen, and the pages. */
export function DataGridFooter({ className, ...props }: ComponentProps<"div">) {
  const grid = useGrid("DataGridFooter");
  const n = (value: number): string => new Intl.NumberFormat(grid.locale).format(value);
  return (
    <div data-slot="data-grid-footer" className={cn("flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground", className)} {...props}>
      <p data-slot="data-grid-status" role="status" className="tabular-nums">
        {grid.labels.results(n(grid.matched.length), n(grid.total))}
        {grid.selectable && grid.selected.length > 0 ? ` · ${grid.labels.selected(n(grid.selected.length))}` : ""}
      </p>
      {grid.pages > 1 ? (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => grid.setPage(grid.page - 1)} disabled={grid.page === 0} aria-label={grid.labels.previous}>
            <ChevronRight aria-hidden="true" className="-scale-x-100 rtl:scale-x-100" />
          </Button>
          <span className="tabular-nums">{grid.labels.page(n(grid.page + 1), n(grid.pages))}</span>
          <Button variant="outline" size="sm" onClick={() => grid.setPage(grid.page + 1)} disabled={grid.page >= grid.pages - 1} aria-label={grid.labels.next}>
            <ChevronRight aria-hidden="true" className="rtl:-scale-x-100" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
