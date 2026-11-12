/**
 * @name timeline
 * @category ui
 * @description An ordered list of numbered rows joined by a line: each with an optional time, a title and content, and a state (done, current, upcoming).
 * @when Things that happen in an order: the parts of a day, the stages of an order or a delivery, a history of changes, the steps of a plan. The number and the state are read out with each row. For the steps of a form the person is filling in use steps; for rows people reorder use sortable-list; for unordered items use a plain list.
 * @example
 * <Timeline aria-label="Saturday">
 *   <TimelineItem state="done">
 *     <TimelineTime dateTime="2026-03-14T09:30">09:30</TimelineTime>
 *     <TimelineTitle>Market walk</TimelineTitle>
 *     <TimelineContent>Meet at the north gate.</TimelineContent>
 *   </TimelineItem>
 *   <TimelineItem state="current">
 *     <TimelineTime dateTime="2026-03-14T12:30">12:30</TimelineTime>
 *     <TimelineTitle>Lunch</TimelineTitle>
 *   </TimelineItem>
 *   <TimelineItem>
 *     <TimelineTitle>Free afternoon</TimelineTitle>
 *   </TimelineItem>
 * </Timeline>
 */
import { Check } from "lucide-react";
import { createContext, use, type ComponentProps } from "react";
import { cn } from "@/lib/cn";

export type TimelineState = "done" | "current" | "upcoming";

const DEFAULT_LABELS: Record<TimelineState, string> = { done: "Done", current: "Now", upcoming: "Upcoming" };

const TimelineContext = createContext<Record<TimelineState, string>>(DEFAULT_LABELS);

export type TimelineProps = ComponentProps<"ol"> & {
  /** The words for the three states, read out with each row and shown beside the current one. Translate them with the interface. */
  stateLabels?: Partial<Record<TimelineState, string>>;
};

/** An ordered list. The numbers in the markers are drawn from the list's own counter, so they follow the rows. */
export function Timeline({ className, stateLabels, ...props }: TimelineProps) {
  return (
    <TimelineContext value={{ ...DEFAULT_LABELS, ...stateLabels }}>
      <ol data-slot="timeline" className={cn("flex w-full min-w-0 flex-col [counter-reset:rui-timeline]", className)} {...props} />
    </TimelineContext>
  );
}

export type TimelineItemProps = ComponentProps<"li"> & {
  /** "done" (a tick), "current" (a filled marker and the word), or "upcoming" (default: an outlined number). */
  state?: TimelineState;
};

/**
 * One row. The marker sits at the inline start with a hairline running down to the next row. The state is a
 * shape (tick, filled, outlined) and a word (visible for the current row, read out for all), never colour
 * alone; the current row carries `aria-current="step"`.
 */
export function TimelineItem({ className, state = "upcoming", children, ...props }: TimelineItemProps) {
  const labels = use(TimelineContext);
  return (
    <li
      data-slot="timeline-item"
      data-state={state}
      aria-current={state === "current" ? "step" : undefined}
      className={cn(
        "group/timeline relative flex min-w-0 gap-3 pb-6 [counter-increment:rui-timeline] before:absolute before:start-[calc(0.875rem-0.5px)] before:top-8 before:bottom-1 before:w-px before:bg-border-strong last:pb-0 last:before:hidden",
        className,
      )}
      {...props}
    >
      <span
        data-slot="timeline-marker"
        className={cn(
          "relative z-[1] inline-flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium tabular-nums",
          state === "upcoming" && "border-border-strong bg-background text-foreground before:content-[counter(rui-timeline)]",
          state === "current" && "border-primary bg-primary text-primary-foreground before:content-[counter(rui-timeline)]",
          state === "done" && "border-primary bg-highlight-soft text-foreground",
        )}
      >
        {state === "done" ? <Check aria-hidden="true" strokeWidth={2} className="size-3.5" /> : null}
        <span className="sr-only">{labels[state]}: </span>
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
        {state === "current" ? (
          <span aria-hidden="true" data-slot="timeline-state" className="text-xs font-medium text-foreground">
            {labels.current}
          </span>
        ) : null}
        {children}
      </div>
    </li>
  );
}

/** When it happens. Pass `dateTime` in machine form and the words the person reads as children. */
export function TimelineTime({ className, ...props }: ComponentProps<"time">) {
  return <time data-slot="timeline-time" className={cn("text-xs text-muted-foreground tabular-nums", className)} {...props} />;
}

/** The row's name. Render a heading with a class of your own when the rows are sections of a page. */
export function TimelineTitle({ className, ...props }: ComponentProps<"p">) {
  return <p data-slot="timeline-title" className={cn("text-sm font-medium break-words text-foreground", className)} {...props} />;
}

/** Anything else about the row: a sentence, a picture, a card, actions. */
export function TimelineContent({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="timeline-content" className={cn("mt-1 min-w-0 text-sm text-muted-foreground", className)} {...props} />;
}
