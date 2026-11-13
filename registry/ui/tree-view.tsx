"use client";
/**
 * @name tree-view
 * @category ui
 * @description A hierarchy of items that open and close (folders and files, sections and pages), moved through to the WAI-ARIA tree pattern: Up and Down through what is visible, Right to open or go in, Left to close or go up, Home, End, typing a letter to jump, * to open every sibling, and Enter to choose.
 * @when Navigating or choosing within nested items: a file tree, a table of contents, categories. For flat lists use a list or virtual-list; for a few levels of site links use navigation-menu; for nested data to compare use data-grid grouping.
 * @example
 * <TreeView
 *   aria-label="Files"
 *   items={[
 *     { id: "src", label: "src", children: [{ id: "app", label: "app.tsx" }, { id: "lib", label: "lib", children: [{ id: "cn", label: "cn.ts" }] }] },
 *     { id: "readme", label: "README.md" },
 *   ]}
 *   defaultExpanded={["src"]}
 *   onSelectedChange={(id) => open(id)}
 * />
 */
import { ChevronRight, File, Folder, FolderOpen } from "lucide-react";
import { useRef, useState, type ComponentProps, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useControllableState } from "@/lib/use-controllable-state";
import { inlineStep } from "@/lib/direction";

export type TreeItem = {
  id: string;
  label: string;
  /** Shown before the label. Default: a folder for items with children, a file otherwise. */
  icon?: ReactNode;
  children?: readonly TreeItem[];
  disabled?: boolean;
};

export type TreeViewProps = Omit<ComponentProps<"ul">, "defaultValue" | "onSelect"> & {
  items: readonly TreeItem[];
  /** The ids of open items. Controlled with `onExpandedChange`. */
  expanded?: readonly string[];
  defaultExpanded?: readonly string[];
  onExpandedChange?: (expanded: readonly string[]) => void;
  /** The chosen item's id. Controlled with `onSelectedChange`. */
  selected?: string | null;
  defaultSelected?: string | null;
  onSelectedChange?: (id: string) => void;
  /** Draws an item's label; the default is its text. */
  renderLabel?: (item: TreeItem) => ReactNode;
};

type Row = { item: TreeItem; level: number; parent: string | null; setSize: number; position: number };

const EMPTY: readonly string[] = [];

export function TreeView({
  items,
  expanded: expandedProp,
  defaultExpanded = EMPTY,
  onExpandedChange,
  selected: selectedProp,
  defaultSelected = null,
  onSelectedChange,
  renderLabel,
  className,
  ...props
}: TreeViewProps) {
  const [expanded, setExpanded] = useControllableState<readonly string[]>({ value: expandedProp, defaultValue: defaultExpanded, onChange: onExpandedChange });
  const [selected, setSelected] = useControllableState<string | null>({ value: selectedProp, defaultValue: defaultSelected, onChange: (id) => id !== null && onSelectedChange?.(id) });
  const [focusId, setFocusId] = useState<string | null>(null);
  const typed = useRef({ text: "", at: 0 });
  const refs = useRef(new Map<string, HTMLLIElement | null>());

  // The visible rows in order: an item's children only when it is open.
  const rows: Row[] = [];
  const walk = (list: readonly TreeItem[], level: number, parent: string | null): void => {
    list.forEach((item, index) => {
      rows.push({ item, level, parent, setSize: list.length, position: index + 1 });
      if (item.children && item.children.length > 0 && expanded.includes(item.id)) walk(item.children, level + 1, item.id);
    });
  };
  walk(items, 1, null);
  const current = rows.find((row) => row.item.id === focusId) ?? rows.find((row) => row.item.id === selected) ?? rows[0];

  const focus = (id: string | undefined): void => {
    if (!id) return;
    setFocusId(id);
    refs.current.get(id)?.focus();
  };
  const toggle = (id: string, open?: boolean): void => {
    const isOpen = expanded.includes(id);
    const want = open ?? !isOpen;
    if (want === isOpen) return;
    setExpanded(want ? [...expanded, id] : expanded.filter((x) => x !== id));
  };
  const onKeyDown = (event: KeyboardEvent<HTMLUListElement>): void => {
    if (!current) return;
    const index = rows.indexOf(current);
    const hasChildren = Boolean(current.item.children?.length);
    const open = expanded.includes(current.item.id);
    const step = inlineStep(event.key, event.currentTarget);
    if (event.key === "ArrowDown") focus(rows[index + 1]?.item.id);
    else if (event.key === "ArrowUp") focus(rows[index - 1]?.item.id);
    else if (step === 1) {
      if (hasChildren && !open) toggle(current.item.id, true);
      else if (hasChildren) focus(rows[index + 1]?.item.id);
    } else if (step === -1) {
      if (hasChildren && open) toggle(current.item.id, false);
      else if (current.parent) focus(current.parent);
    } else if (event.key === "Home") focus(rows[0]?.item.id);
    else if (event.key === "End") focus(rows[rows.length - 1]?.item.id);
    else if (event.key === "Enter" || event.key === " ") {
      if (!current.item.disabled) setSelected(current.item.id);
      if (event.key === "Enter" && hasChildren) toggle(current.item.id);
    } else if (event.key === "*") {
      const siblings = rows.filter((row) => row.parent === current.parent && row.item.children?.length).map((row) => row.item.id);
      setExpanded([...new Set([...expanded, ...siblings])]);
    } else if (event.key.length === 1 && /\S/.test(event.key)) {
      // Type-ahead: letters typed in quick succession find the next item that starts with them.
      const now = event.timeStamp;
      typed.current = { text: now - typed.current.at < 600 ? typed.current.text + event.key.toLowerCase() : event.key.toLowerCase(), at: now };
      const order = [...rows.slice(index + 1), ...rows.slice(0, index + 1)];
      const hit = order.find((row) => row.item.label.toLowerCase().startsWith(typed.current.text)) ?? order.find((row) => row.item.label.toLowerCase().startsWith(event.key.toLowerCase()));
      focus(hit?.item.id);
    } else return;
    event.preventDefault();
  };

  const render = (list: readonly TreeItem[], level: number): ReactNode =>
    list.map((item, index) => {
      const hasChildren = Boolean(item.children && item.children.length > 0);
      const open = hasChildren && expanded.includes(item.id);
      const chosen = selected === item.id;
      return (
        <li
          key={item.id}
          ref={(node) => {
            refs.current.set(item.id, node);
          }}
          role="treeitem"
          aria-level={level}
          aria-setsize={list.length}
          aria-posinset={index + 1}
          aria-expanded={hasChildren ? open : undefined}
          aria-selected={chosen}
          aria-disabled={item.disabled || undefined}
          tabIndex={current?.item.id === item.id ? 0 : -1}
          data-slot="tree-view-item"
          className="outline-none focus-visible:[&>div]:outline-2 focus-visible:[&>div]:-outline-offset-2 focus-visible:[&>div]:outline-ring"
          onFocus={(event) => {
            if (event.target === event.currentTarget) setFocusId(item.id);
          }}
        >
          <div
            className={cn(
              "flex min-h-9 cursor-default items-center gap-1.5 rounded-control pe-2 text-sm select-none hover:bg-accent pointer-coarse:min-h-10",
              chosen && "bg-highlight-soft font-medium hover:bg-highlight-soft",
              item.disabled && "opacity-50",
            )}
            style={{ paddingInlineStart: `${(level - 1) * 1.25 + 0.25}rem` }}
            onClick={() => {
              focus(item.id);
              if (hasChildren) toggle(item.id);
              if (!item.disabled) setSelected(item.id);
            }}
          >
            <ChevronRight
              aria-hidden="true"
              className={cn(
                "size-4 shrink-0 text-muted-foreground transition-transform duration-instant motion-reduce:transition-none rtl:-scale-x-100",
                open && "rotate-90 rtl:-rotate-90",
                !hasChildren && "invisible",
              )}
            />
            <span aria-hidden="true" className="shrink-0 text-muted-foreground [&>svg]:size-4">
              {item.icon ?? (hasChildren ? open ? <FolderOpen className="size-4" /> : <Folder className="size-4" /> : <File className="size-4" />)}
            </span>
            <span className="min-w-0 truncate" dir="auto">
              {renderLabel ? renderLabel(item) : item.label}
            </span>
          </div>
          {open ? (
            <ul role="group" className="flex flex-col">
              {render(item.children ?? [], level + 1)}
            </ul>
          ) : null}
        </li>
      );
    });

  return (
    <ul data-slot="tree-view" role="tree" className={cn("flex min-w-0 flex-col", className)} onKeyDown={onKeyDown} {...props}>
      {render(items, 1)}
    </ul>
  );
}
