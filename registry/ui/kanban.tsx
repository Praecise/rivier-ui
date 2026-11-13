"use client";
/**
 * @name kanban
 * @category ui
 * @description Cards in columns (to do, doing, done) that move between and within columns three ways: dragged with a mouse, lifted with Space and carried with the arrow keys, or sent by each card's "Move to" menu; every move is said aloud.
 * @when Work that passes through stages: tasks, applications, orders. For one ordered list use sortable-list; for a schedule over time use gantt-chart; for records to sort and filter use data-grid.
 * @example
 * <Kanban
 *   aria-label="Tasks"
 *   columns={[{ id: "todo", title: "To do" }, { id: "doing", title: "Doing" }, { id: "done", title: "Done" }]}
 *   defaultCards={[{ id: "1", column: "todo", title: "Write the brief" }, { id: "2", column: "doing", title: "Draw the map" }]}
 * />
 */
import { MoreHorizontal } from "lucide-react";
import { useRef, useState, type ComponentProps, type DragEvent, type KeyboardEvent, type ReactNode } from "react";
import { announce } from "@/lib/announce";
import { cn } from "@/lib/cn";
import { useControllableState } from "@/lib/use-controllable-state";
import { inlineStep } from "@/lib/direction";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export type KanbanColumn = { id: string; title: string };
export type KanbanCard = { id: string; column: string; title: string; description?: string };

export type KanbanLabels = {
  lifted: (card: string, column: string, position: number, count: number) => string;
  moved: (card: string, column: string, position: number, count: number) => string;
  dropped: (card: string, column: string, position: number, count: number) => string;
  cancelled: (card: string) => string;
  moveTo: string;
  moveMenu: (card: string) => string;
  instructions: string;
  count: (count: number) => string;
  /** What a card is called, for screen readers. */
  card: string;
  /** Added to a card's name while it is lifted. */
  liftedState: string;
};

const LABELS: KanbanLabels = {
  lifted: (card, column, position, count) => `${card} lifted, in ${column}, ${position} of ${count}. Arrow keys move it, Space drops it, Escape puts it back.`,
  moved: (card, column, position, count) => `${card}: ${column}, ${position} of ${count}`,
  dropped: (card, column, position, count) => `${card} dropped in ${column}, ${position} of ${count}`,
  cancelled: (card) => `${card} put back`,
  moveTo: "Move to",
  moveMenu: (card) => `Move ${card}`,
  instructions: "Space lifts a card to move it.",
  count: (count) => `${count} ${count === 1 ? "card" : "cards"}`,
  card: "card",
  liftedState: "lifted",
};

export type KanbanProps = Omit<ComponentProps<"div">, "defaultValue" | "onChange"> & {
  columns: readonly KanbanColumn[];
  /** The cards, each with its column; their order in the list is their order in the column. Controlled with `onCardsChange`. */
  cards?: readonly KanbanCard[];
  defaultCards?: readonly KanbanCard[];
  onCardsChange?: (cards: readonly KanbanCard[]) => void;
  /** Draws a card's body; the default is its title and description. */
  renderCard?: (card: KanbanCard) => ReactNode;
  labels?: Partial<KanbanLabels>;
};

/** Moves a card to a column at a place in it (0-based), keeping every other card's order. */
function place(cards: readonly KanbanCard[], id: string, column: string, index: number): KanbanCard[] {
  const card = cards.find((c) => c.id === id);
  if (!card) return [...cards];
  const rest = cards.filter((c) => c.id !== id);
  const inColumn = rest.filter((c) => c.column === column);
  const anchor = inColumn[index];
  const moved = { ...card, column };
  if (!anchor) {
    const last = inColumn[inColumn.length - 1];
    const at = last ? rest.indexOf(last) + 1 : rest.length;
    return [...rest.slice(0, at), moved, ...rest.slice(at)];
  }
  const at = rest.indexOf(anchor);
  return [...rest.slice(0, at), moved, ...rest.slice(at)];
}

export function Kanban({ columns, cards: cardsProp, defaultCards = [], onCardsChange, renderCard, labels: given, className, ...props }: KanbanProps) {
  const labels = { ...LABELS, ...given };
  const [cards, setCards] = useControllableState<readonly KanbanCard[]>({ value: cardsProp, defaultValue: defaultCards, onChange: onCardsChange });
  const [lifted, setLifted] = useState<{ id: string; before: readonly KanbanCard[] } | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const refs = useRef(new Map<string, HTMLDivElement | null>());
  const titleOf = (column: string): string => columns.find((c) => c.id === column)?.title ?? column;
  const where = (list: readonly KanbanCard[], id: string): { column: string; index: number; count: number } => {
    const card = list.find((c) => c.id === id);
    const inColumn = list.filter((c) => c.column === card?.column);
    return { column: card?.column ?? "", index: inColumn.findIndex((c) => c.id === id), count: inColumn.length };
  };
  const refocus = (id: string): void => {
    requestAnimationFrame(() => refs.current.get(id)?.focus());
  };
  const say = (kind: "moved" | "dropped", list: readonly KanbanCard[], id: string): void => {
    const card = list.find((c) => c.id === id);
    const at = where(list, id);
    announce(labels[kind](card?.title ?? "", titleOf(at.column), at.index + 1, at.count));
  };
  const moveTo = (id: string, column: string, index: number, kind: "moved" | "dropped"): void => {
    const next = place(cards, id, column, index);
    setCards(next);
    say(kind, next, id);
    refocus(id);
  };

  const onCardKeyDown = (card: KanbanCard, event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.target !== event.currentTarget) return;
    const at = where(cards, card.id);
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      if (lifted?.id === card.id) {
        setLifted(null);
        say("dropped", cards, card.id);
      } else {
        setLifted({ id: card.id, before: cards });
        announce(labels.lifted(card.title, titleOf(at.column), at.index + 1, at.count));
      }
      return;
    }
    if (event.key === "Escape" && lifted?.id === card.id) {
      event.preventDefault();
      setCards(lifted.before);
      setLifted(null);
      announce(labels.cancelled(card.title));
      refocus(card.id);
      return;
    }
    const columnIndex = columns.findIndex((c) => c.id === at.column);
    const step = inlineStep(event.key, event.currentTarget);
    if (lifted?.id === card.id) {
      if (event.key === "ArrowUp" && at.index > 0) moveTo(card.id, at.column, at.index - 1, "moved");
      else if (event.key === "ArrowDown" && at.index < at.count - 1) moveTo(card.id, at.column, at.index + 1, "moved");
      else if (step !== 0 && columns[columnIndex + step]) {
        const target = columns[columnIndex + step]?.id ?? at.column;
        moveTo(card.id, target, Math.min(at.index, cards.filter((c) => c.column === target).length), "moved");
      } else return;
      event.preventDefault();
      return;
    }
    // Not lifted: the arrow keys move focus between cards.
    const inColumn = cards.filter((c) => c.column === at.column);
    let target: KanbanCard | undefined;
    if (event.key === "ArrowUp") target = inColumn[at.index - 1];
    else if (event.key === "ArrowDown") target = inColumn[at.index + 1];
    else if (step !== 0) {
      for (let i = columnIndex + step; i >= 0 && i < columns.length; i += step) {
        const list = cards.filter((c) => c.column === columns[i]?.id);
        if (list.length > 0) {
          target = list[Math.min(at.index, list.length - 1)];
          break;
        }
      }
    }
    if (!target) return;
    event.preventDefault();
    refs.current.get(target.id)?.focus();
  };

  const onDrop = (column: string, event: DragEvent<HTMLElement>): void => {
    event.preventDefault();
    const id = event.dataTransfer.getData("text/plain") || dragging;
    setOver(null);
    setDragging(null);
    if (!id) return;
    // Dropped among the cards: before the first card whose middle is below the pointer.
    const list = cards.filter((c) => c.column === column && c.id !== id);
    const index = list.findIndex((c) => {
      const box = refs.current.get(c.id)?.getBoundingClientRect();
      return box ? event.clientY < box.top + box.height / 2 : false;
    });
    moveTo(id, column, index < 0 ? list.length : index, "dropped");
  };

  return (
    <div data-slot="kanban" role="group" className={cn("flex w-full min-w-0 snap-x gap-3 overflow-x-auto pb-2", className)} {...props}>
      <p className="sr-only">{labels.instructions}</p>
      {columns.map((column) => {
        const list = cards.filter((c) => c.column === column.id);
        return (
          <section
            key={column.id}
            data-slot="kanban-column"
            aria-label={column.title}
            className={cn("flex w-64 shrink-0 snap-start flex-col gap-2 rounded-surface border bg-muted p-2 @md:w-72", over === column.id && "outline-2 outline-ring")}
            onDragOver={(event) => {
              event.preventDefault();
              setOver(column.id);
            }}
            onDragLeave={() => setOver((current) => (current === column.id ? null : current))}
            onDrop={(event) => onDrop(column.id, event)}
          >
            <h3 className="flex items-center justify-between px-1 text-sm font-medium">
              {column.title}
              <span className="text-xs font-normal tabular-nums text-muted-foreground">{labels.count(list.length)}</span>
            </h3>
            <ul className="flex min-h-12 flex-col gap-2">
              {list.map((card) => {
                const isLifted = lifted?.id === card.id;
                return (
                  <li key={card.id}>
                    <div
                      ref={(node) => {
                        refs.current.set(card.id, node);
                      }}
                      data-slot="kanban-card"
                      data-lifted={isLifted ? "" : undefined}
                      tabIndex={0}
                      role="group"
                      aria-roledescription={labels.card}
                      aria-label={isLifted ? `${card.title}, ${labels.liftedState}` : card.title}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData("text/plain", card.id);
                        event.dataTransfer.effectAllowed = "move";
                        setDragging(card.id);
                      }}
                      onDragEnd={() => setDragging(null)}
                      onKeyDown={(event) => onCardKeyDown(card, event)}
                      onBlur={() => {
                        if (isLifted) setLifted(null);
                      }}
                      className={cn(
                        "flex items-start gap-2 rounded-surface border bg-card p-3 text-sm transition-transform duration-instant ease-out motion-reduce:transition-none",
                        isLifted && "-translate-y-0.5 border-border-strong outline-2 outline-dashed outline-ring",
                        dragging === card.id && "opacity-50",
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        {renderCard ? (
                          renderCard(card)
                        ) : (
                          <>
                            <p className="font-medium" dir="auto">
                              {card.title}
                            </p>
                            {card.description ? (
                              <p className="mt-1 text-muted-foreground" dir="auto">
                                {card.description}
                              </p>
                            ) : null}
                          </>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          aria-label={labels.moveMenu(card.title)}
                          className="-me-1 -mt-1 flex size-8 shrink-0 items-center justify-center rounded-control text-muted-foreground hover:bg-accent pointer-coarse:size-10"
                        >
                          <MoreHorizontal aria-hidden="true" className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>{labels.moveTo}</DropdownMenuLabel>
                          {columns
                            .filter((c) => c.id !== card.column)
                            .map((c) => (
                              <DropdownMenuItem key={c.id} onSelect={() => moveTo(card.id, c.id, cards.filter((x) => x.column === c.id).length, "dropped")}>
                                {c.title}
                              </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
