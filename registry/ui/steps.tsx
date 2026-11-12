"use client";
/**
 * @name steps
 * @category ui
 * @description A rail that shows where one is in a sequence of steps: a row of thin segments, or numbered markers with titles, each step with a state (done, filled in for you, current, not started, skipped, blocked).
 * @when Showing progress through a known, ordered set of steps: a booking, a sign-up, an import, a checklist that runs in order. Use "segments" above a card where space is short and "labelled" where the step names help. Pair it with StepsCount ("Step 2 of 5"), which says the same in words. For a measured amount of one task use progress; for the whole guided task with its buttons use wizard, which draws this rail itself; for moving between unordered views use tabs.
 * @example
 * <StepsCount current={2} total={4} />
 * <Steps aria-label="Booking progress">
 *   <Step state="done">Dates</Step>
 *   <Step state="current">People</Step>
 *   <Step state="upcoming">Extras</Step>
 *   <Step state="upcoming">Review</Step>
 * </Steps>
 *
 * // Numbered markers with titles; a finished step can be a button that goes back to it
 * <Steps variant="labelled" aria-label="Import">
 *   <Step state="done" onClick={() => goTo("file")}>Choose a file</Step>
 *   <Step state="assumed" note="Taken from the file's first row">Match the columns</Step>
 *   <Step state="current" description="About a minute">Check the rows</Step>
 *   <Step state="skipped">Add notes</Step>
 * </Steps>
 */
import { Ban, Check, Minus } from "lucide-react";
import { createContext, use, type ComponentProps, type MouseEventHandler, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type StepState = "done" | "assumed" | "current" | "upcoming" | "skipped" | "blocked";
export type StepsVariant = "segments" | "labelled";

/** The word said (and, in the labelled variant, shown where it matters) for each state. Translate them with the interface. */
export const STEP_STATE_LABELS: Record<StepState, string> = {
  done: "Done",
  assumed: "Filled in for you",
  current: "Current step",
  upcoming: "Not started",
  skipped: "Skipped",
  blocked: "Blocked",
};

const StepsContext = createContext<{ variant: StepsVariant; stateLabels: Record<StepState, string> }>({ variant: "segments", stateLabels: STEP_STATE_LABELS });

export type StepsProps = ComponentProps<"ol"> & {
  /** "segments" (default): one thin segment per step. "labelled": numbered markers with titles, in a column that becomes a row when the rail is wide enough. */
  variant?: StepsVariant;
  /** The word for each state, where the English defaults are not wanted. */
  stateLabels?: Partial<Record<StepState, string>>;
};

/**
 * An ordered list, so a screen reader says how many steps there are and which one it is on. Name it with
 * `aria-label` or `aria-labelledby`. Every step is read as its title and its state in words; the marks
 * (tick, ring, dashes, bar) repeat the state for the eye, so it never rests on colour alone.
 */
export function Steps({ className, variant = "segments", stateLabels, children, ...props }: StepsProps) {
  return (
    <div data-slot="steps" data-variant={variant} className={cn("@container w-full min-w-0", className)}>
      <ol
        data-slot="steps-list"
        className={cn("[counter-reset:rui-step]", variant === "segments" ? "flex w-full items-center gap-1.5" : "flex w-full flex-col @lg:flex-row @lg:gap-3")}
        {...props}
      >
        <StepsContext value={{ variant, stateLabels: { ...STEP_STATE_LABELS, ...stateLabels } }}>{children}</StepsContext>
      </ol>
    </div>
  );
}

export type StepProps = Omit<ComponentProps<"li">, "onClick"> & {
  state: StepState;
  /** Why the step is in this state: what was filled in and from where, or what is in the way. Read out with the state; shown under the title in the labelled variant. */
  note?: string;
  /** A line under the title in the labelled variant. */
  description?: ReactNode;
  /** Makes the step a button, for a step the person may go back to. */
  onClick?: MouseEventHandler<HTMLButtonElement>;
  /** Makes the step a link. */
  href?: string;
};

const SEGMENT: Record<StepState, string> = {
  done: "bg-primary",
  assumed: "bg-primary",
  current: "h-1.5 bg-foreground",
  upcoming: "bg-input",
  // Dashes: drawn as short pieces (see Step), so they stay dashes at any width.
  skipped: "flex h-0.5 gap-1 bg-transparent",
  blocked: "bg-destructive",
};

const MARKER: Record<StepState, string> = {
  done: "border-primary bg-primary text-primary-foreground",
  assumed: "border-primary bg-highlight-soft text-foreground",
  current: "border-2 border-foreground bg-background font-medium text-foreground",
  upcoming: "border-input bg-background text-muted-foreground",
  skipped: "border-dashed border-input bg-background text-muted-foreground",
  blocked: "border-destructive bg-background text-destructive",
};

/** The mark inside a labelled marker: an icon for the states that have one, the step's number for the rest. */
function MarkerContent({ state }: { state: StepState }) {
  if (state === "done") return <Check aria-hidden="true" strokeWidth={2} className="size-4" />;
  if (state === "skipped") return <Minus aria-hidden="true" strokeWidth={2} className="size-4" />;
  if (state === "blocked") return <Ban aria-hidden="true" strokeWidth={2} className="size-4" />;
  return <span aria-hidden="true" className="tabular-nums before:content-[counter(rui-step)]" />;
}

/**
 * One step. Its children are its title. In the segments variant the title and state are read out but not
 * shown; in the labelled variant they are shown. The current step carries `aria-current="step"`.
 */
export function Step({ className, state, note, description, onClick, href, children, ...props }: StepProps) {
  const { variant, stateLabels } = use(StepsContext);
  const stateText = `${stateLabels[state]}${note ? `: ${note}` : ""}`;
  const interactive = "rounded-control transition-opacity duration-instant ease-out hover:opacity-80 motion-reduce:transition-none";

  if (variant === "segments") {
    const body = (
      <>
        <span aria-hidden="true" data-slot="step-segment" className={cn("block h-1 w-full rounded-full", SEGMENT[state])}>
          {state === "skipped" ? Array.from({ length: 4 }, (_, piece) => <span key={piece} className="h-full flex-1 rounded-full bg-input" />) : null}
        </span>
        {state === "assumed" || state === "blocked" ? (
          // A second mark on the bar: an open ring for "filled in for you", a filled square for "blocked".
          <span
            aria-hidden="true"
            data-slot="step-mark"
            className={cn("absolute end-0 top-1/2 size-2.5 -translate-y-1/2 border-2", state === "assumed" ? "rounded-full border-primary bg-background" : "rounded-none border-destructive bg-destructive")}
          />
        ) : null}
        <span className="sr-only">
          {children}, {stateText}
        </span>
      </>
    );
    // The bar is thin; the pressable area around it is 24px tall, 40px on touch screens.
    const hit = "relative flex h-6 w-full items-center pointer-coarse:h-10";
    return (
      <li data-slot="step" data-state={state} aria-current={state === "current" ? "step" : undefined} title={note} className={cn("relative min-w-0 flex-1 [counter-increment:rui-step]", className)} {...props}>
        {href !== undefined ? (
          <a href={href} className={cn(hit, interactive)}>
            {body}
          </a>
        ) : onClick ? (
          <button type="button" onClick={onClick} className={cn(hit, interactive)}>
            {body}
          </button>
        ) : (
          <span className={hit}>{body}</span>
        )}
      </li>
    );
  }

  const body = (
    <>
      <span data-slot="step-marker" className={cn("relative z-[1] inline-flex size-7 shrink-0 items-center justify-center rounded-full border text-xs", MARKER[state])}>
        <MarkerContent state={state} />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5 pt-1 text-start @lg:pt-0">
        <span data-slot="step-title" className={cn("text-sm leading-tight", state === "current" ? "font-medium text-foreground" : state === "upcoming" || state === "skipped" ? "text-muted-foreground" : "text-foreground")}>
          {children}
        </span>
        {/* The state in words. Shown where the marker alone could be misread; always read out. */}
        <span data-slot="step-state" className={cn("text-xs text-muted-foreground", state === "done" || state === "current" || state === "upcoming" ? (note ? "" : "sr-only") : "")}>
          {stateText}
        </span>
        {description ? (
          <span data-slot="step-description" className="text-xs text-muted-foreground">
            {description}
          </span>
        ) : null}
      </span>
    </>
  );
  const row = "flex w-full min-w-0 gap-3 @lg:flex-col @lg:gap-2";
  return (
    <li
      data-slot="step"
      data-state={state}
      aria-current={state === "current" ? "step" : undefined}
      className={cn(
        "relative min-w-0 pb-5 [counter-increment:rui-step] last:pb-0 @lg:flex-1 @lg:pb-0",
        // The line to the next step: down the column, or along the row.
        "before:absolute before:start-[calc(0.875rem-0.5px)] before:top-8 before:bottom-1 before:w-px before:bg-border-strong last:before:hidden",
        "@lg:before:start-9 @lg:before:end-0 @lg:before:top-[calc(0.875rem-0.5px)] @lg:before:bottom-auto @lg:before:h-px @lg:before:w-auto",
        className,
      )}
      {...props}
    >
      {href !== undefined ? (
        <a href={href} className={cn(row, interactive)}>
          {body}
        </a>
      ) : onClick ? (
        <button type="button" onClick={onClick} className={cn(row, interactive)}>
          {body}
        </button>
      ) : (
        <span className={row}>{body}</span>
      )}
    </li>
  );
}

export type StepsCountProps = ComponentProps<"p"> & {
  /** The step one is on, counted from 1. */
  current: number;
  total: number;
  /** The words. Default: "Step 2 of 5". Translate it with the interface. */
  label?: (current: number, total: number) => string;
};

/** The count in words: what the rail shows, for everyone. */
export function StepsCount({ className, current, total, label = (now, all) => `Step ${now} of ${all}`, ...props }: StepsCountProps) {
  return (
    <p data-slot="steps-count" className={cn("text-xs text-muted-foreground tabular-nums", className)} {...props}>
      {label(current, total)}
    </p>
  );
}
