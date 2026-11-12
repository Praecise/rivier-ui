/**
 * @name empty-state
 * @category ui
 * @description What a list, a table or a search shows when there is nothing in it: an icon, a title, a description and an action.
 * @when An empty list, zero search results, a first run. Say what belongs here and offer the one action that fills it. For a failure use alert; while loading use skeleton.
 * @example
 * <EmptyState
 *   title="No projects yet"
 *   description="Projects you create will appear here."
 *   action={<Button>New project</Button>}
 * />
 * <EmptyState icon={<SearchX />} title="No results" description="Try a shorter search." bordered={false} />
 */
import { Inbox } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type EmptyStateProps = Omit<ComponentProps<"div">, "title"> & {
  /** An icon element. Defaults to an inbox; pass `null` for none. */
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** One button or link, or two at most. */
  action?: ReactNode;
  /** Draws the dashed edge. Turn it off inside a card or a table. */
  bordered?: boolean;
};

/** The title is an h3. Children, if any, are placed under the action. */
export function EmptyState({ className, icon, title, description, action, bordered = true, children, ...props }: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex w-full flex-col items-center justify-center gap-4 px-6 py-12 text-center",
        bordered && "rounded-surface border border-dashed border-border-strong",
        className,
      )}
      {...props}
    >
      {icon === null ? null : (
        <div data-slot="empty-state-icon" aria-hidden="true" className="flex size-10 items-center justify-center rounded-control bg-muted text-foreground [&_svg]:size-5">
          {icon === undefined ? <Inbox strokeWidth={1.5} /> : icon}
        </div>
      )}
      <div className="flex max-w-prose flex-col gap-1">
        <h3 data-slot="empty-state-title" className="text-base font-medium leading-tight">
          {title}
        </h3>
        {description ? (
          <p data-slot="empty-state-description" className="text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action ? (
        <div data-slot="empty-state-action" className="flex flex-wrap items-center justify-center gap-2">
          {action}
        </div>
      ) : null}
      {children}
    </div>
  );
}
