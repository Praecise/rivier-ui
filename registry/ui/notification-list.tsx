"use client";
/**
 * @name notification-list
 * @category ui
 * @description An inbox of notices: each with its kind, title, words and time ("5 min ago"), unread ones marked by a dot and the word "Unread", a switch between all and unread, marking one or all as read, and room for each notice's own action; every change said aloud.
 * @when The list behind a bell in an app's header (put it in a popover or sheet), or an activity page. For a message that appears and goes by itself use toaster; for a problem on the page use alert; for a conversation use thread.
 * @example
 * <NotificationList
 *   aria-label="Notifications"
 *   now="2026-11-13T12:00:00Z"
 *   defaultItems={[
 *     { id: "1", title: "Report ready", body: "The October report can be downloaded.", time: "2026-11-13T11:55:00Z" },
 *     { id: "2", title: "New comment", body: "On the map of the coast.", time: "2026-11-12T09:00:00Z", read: true },
 *   ]}
 * />
 */
import { AlertTriangle, Bell, CheckCheck, CircleCheck, Info } from "lucide-react";
import { useState, type ComponentProps, type ReactNode } from "react";
import { announce } from "@/lib/announce";
import { cn } from "@/lib/cn";
import { useControllableState } from "@/lib/use-controllable-state";

export type Notice = {
  id: string;
  title: string;
  body?: string;
  /** When it happened: an ISO date-time. */
  time: string;
  read?: boolean;
  kind?: "info" | "success" | "warning";
  /** A button or link of the project's own: "Open", "Reply". */
  action?: ReactNode;
};

export type NotificationListLabels = {
  all: string;
  unread: string;
  unreadMark: string;
  markRead: string;
  markUnread: string;
  markedRead: (title: string) => string;
  markedUnread: (title: string) => string;
  markAll: string;
  empty: string;
  emptyUnread: string;
  allRead: string;
  count: (unread: number) => string;
  filter: string;
};

const LABELS: NotificationListLabels = {
  all: "All",
  unread: "Unread",
  unreadMark: "Unread",
  markRead: "Mark as read",
  markUnread: "Mark as unread",
  markedRead: (title) => `${title}: read`,
  markedUnread: (title) => `${title}: unread`,
  markAll: "Mark all as read",
  empty: "Nothing here yet.",
  emptyUnread: "Nothing unread.",
  allRead: "All marked as read",
  count: (unread) => `${unread} unread`,
  filter: "Show",
};

const ICONS = { info: Info, success: CircleCheck, warning: AlertTriangle } as const;

export type NotificationListProps = Omit<ComponentProps<"section">, "defaultValue"> & {
  items?: readonly Notice[];
  defaultItems?: readonly Notice[];
  onItemsChange?: (items: readonly Notice[]) => void;
  /** The moment times are counted from, as an ISO date-time: pass the server's time so both sides print the same words. */
  now: string;
  locale?: string;
  labels?: Partial<NotificationListLabels>;
};

function relative(time: string, now: string, locale: string): string {
  const seconds = (Date.parse(time) - Date.parse(now)) / 1000;
  if (!Number.isFinite(seconds)) return "";
  const format = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "short" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unit, size] of units) if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit);
  return format.format(Math.round(seconds), "second");
}

export function NotificationList({ items: itemsProp, defaultItems = [], onItemsChange, now, locale = "en-US", labels: given, className, ...props }: NotificationListProps) {
  const labels = { ...LABELS, ...given };
  const [items, setItems] = useControllableState<readonly Notice[]>({ value: itemsProp, defaultValue: defaultItems, onChange: onItemsChange });
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const unread = items.filter((item) => !item.read).length;
  const shown = filter === "unread" ? items.filter((item) => !item.read) : items;
  const full = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });
  const setRead = (id: string, read: boolean): void => {
    setItems(items.map((item) => (item.id === id ? { ...item, read } : item)));
    const title = items.find((item) => item.id === id)?.title ?? "";
    announce(read ? labels.markedRead(title) : labels.markedUnread(title));
  };
  return (
    <section data-slot="notification-list" className={cn("flex w-full min-w-0 flex-col rounded-surface border bg-card", className)} {...props}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b p-2">
        <div role="group" aria-label={labels.filter} className="flex gap-1">
          {(["all", "unread"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
              className={cn("h-control-sm rounded-control px-3 text-sm hover:bg-accent aria-pressed:bg-highlight-soft aria-pressed:font-medium pointer-coarse:h-control")}
            >
              {value === "all" ? labels.all : labels.unread}
              {value === "unread" && unread > 0 ? <span className="ms-1.5 tabular-nums text-muted-foreground">{unread}</span> : null}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={unread === 0}
          onClick={() => {
            setItems(items.map((item) => ({ ...item, read: true })));
            announce(labels.allRead);
          }}
          className="inline-flex h-control-sm items-center gap-1.5 rounded-control px-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50 pointer-coarse:h-control"
        >
          <CheckCheck aria-hidden="true" className="size-4" />
          {labels.markAll}
        </button>
      </div>
      {shown.length === 0 ? (
        <p className="flex flex-col items-center gap-2 p-8 text-sm text-muted-foreground">
          <Bell aria-hidden="true" className="size-5" />
          {filter === "unread" ? labels.emptyUnread : labels.empty}
        </p>
      ) : (
        <ul className="flex flex-col divide-y">
          {shown.map((item) => {
            const Icon = ICONS[item.kind ?? "info"];
            return (
              <li key={item.id} data-slot="notification" data-read={item.read ? "" : undefined} className={cn("flex gap-3 p-3", !item.read && "bg-highlight-soft/40")}>
                <Icon aria-hidden="true" className={cn("mt-0.5 size-4 shrink-0", item.kind === "warning" ? "text-warning" : item.kind === "success" ? "text-success" : "text-muted-foreground")} />
                <article className="flex min-w-0 flex-1 flex-col gap-1">
                  <h3 className="flex items-center gap-2 text-sm font-medium" dir="auto">
                    {!item.read ? (
                      <>
                        <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-primary" />
                        <span className="sr-only">{labels.unreadMark}: </span>
                      </>
                    ) : null}
                    <span className="min-w-0 truncate">{item.title}</span>
                  </h3>
                  {item.body ? (
                    <p className="text-sm text-muted-foreground" dir="auto">
                      {item.body}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <time dateTime={item.time} title={full.format(new Date(item.time))}>
                      {relative(item.time, now, locale)}
                    </time>
                    {item.action}
                    <button type="button" onClick={() => setRead(item.id, !item.read)} className="min-h-8 underline underline-offset-4 hover:text-foreground pointer-coarse:min-h-10">
                      {item.read ? labels.markUnread : labels.markRead}
                      <span className="sr-only">: {item.title}</span>
                    </button>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
