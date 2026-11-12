"use client";
/**
 * @name part-frame
 * @category ui
 * @description A card for one structured piece of a conversation (a plan, a result, a form) that has a life: loading, live, saving a change, replaced by a newer one, or final.
 * @when An assistant's reply contains something to look at or work in, not only words, and that thing changes over the conversation. The frame holds its size while it loads, says "Saving" in words while a change is on its way, shrinks to a one-line stub when a newer frame replaces it, and can open its content full screen. For a static card use card; for words use message; for a flow of steps put steps or a wizard inside it.
 * @example
 * <PartFrame state={plan.state} replacementRef={newerPlan}>
 *   <PartFrameHeader>
 *     <PartFrameTitle>Plan for Saturday</PartFrameTitle>
 *     <PartFrameExpand title="Plan for Saturday"><PlanEditor plan={plan} roomy /></PartFrameExpand>
 *   </PartFrameHeader>
 *   <PartFrameContent className="min-h-40"><PlanEditor plan={plan} /></PartFrameContent>
 *   <PartFrameFooter><Button size="sm">Confirm</Button></PartFrameFooter>
 * </PartFrame>
 *
 * // Replaced by a newer one: a stub that says so and points to it
 * <PartFrame state="superseded" supersededBy={<a href="#plan-2">See the new plan</a>}>
 *   <PartFrameHeader><PartFrameTitle>Plan for Saturday</PartFrameTitle></PartFrameHeader>
 *   <PartFrameContent>…</PartFrameContent>
 * </PartFrame>
 */
import { Maximize2 } from "lucide-react";
import { createContext, use, useEffect, useId, useRef, type ComponentProps, type ReactNode, type RefObject } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { announce } from "@/lib/announce";
import { cn } from "@/lib/cn";

export type PartFrameState = "loading" | "live" | "pending" | "superseded" | "final";

export type PartFrameLabels = {
  /** Said to screen readers while loading. Default "Loading". */
  loading?: string;
  /** Shown and announced while a change is being saved. Default "Saving". */
  pending?: string;
  /** Shown on the stub of a frame that was replaced. Default "Replaced". */
  superseded?: string;
  /** Shown on a frame that can no longer change. Default: nothing. */
  final?: string;
};

type PartFrameContextValue = { state: PartFrameState; titleId: string; labels: PartFrameLabels };

const PartFrameContext = createContext<PartFrameContextValue | null>(null);

function usePartFrameContext(part: string): PartFrameContextValue {
  const context = use(PartFrameContext);
  if (!context) throw new Error(`<${part}> must be used inside <PartFrame>.`);
  return context;
}

/** The frame's state, for content that adapts to it (hide its controls when "final", for example). */
export function usePartFrame(): { state: PartFrameState } {
  return { state: usePartFrameContext("usePartFrame").state };
}

export type PartFrameProps = Omit<ComponentProps<"section">, "role"> & {
  /** Where the frame is in its life. Default "live". */
  state?: PartFrameState;
  /** The words for the states. Translate them with the interface. */
  labels?: PartFrameLabels;
  /** On a superseded frame: what replaced it, usually a link or button that goes there ("See the new plan"). */
  supersededBy?: ReactNode;
  /**
   * The frame that replaces this one. If keyboard focus was inside this frame at the moment it became
   * "superseded", focus is passed to that element (a PartFrame takes focus itself), so the person is not
   * dropped at the top of the page. Without it, focus stays on this frame's stub.
   */
  replacementRef?: RefObject<HTMLElement | null>;
};

/**
 * A named group: PartFrameTitle is its heading and its accessible name. It can take focus from code
 * (`tabIndex={-1}`), never from Tab. An arriving frame does not take focus by itself.
 */
export function PartFrame({ className, state = "live", labels = {}, supersededBy, replacementRef, children, onFocus, onBlur, ...props }: PartFrameProps) {
  const titleId = useId();
  const rootRef = useRef<HTMLElement>(null);
  /** Whether focus is inside. An element removed with its frame's content fires no blur, so this stays true through the change. */
  const hadFocus = useRef(false);
  const previous = useRef(state);
  const pendingLabel = labels.pending ?? "Saving";

  useEffect(() => {
    const before = previous.current;
    previous.current = state;
    if (before === state) return;
    if (state === "pending") announce(pendingLabel);
    if (state === "superseded" && hadFocus.current) {
      const root = rootRef.current;
      const active = document.activeElement;
      // Only when focus was dropped by the change, not when the person has since moved elsewhere.
      if (active === null || active === document.body || (root !== null && root.contains(active))) {
        (replacementRef?.current ?? root)?.focus();
      }
    }
  }, [state, pendingLabel, replacementRef]);

  return (
    <PartFrameContext value={{ state, titleId, labels }}>
      <section
        ref={rootRef}
        data-slot="part-frame"
        data-state={state}
        role="group"
        aria-labelledby={titleId}
        aria-busy={state === "loading" || state === "pending" || undefined}
        tabIndex={-1}
        onFocus={(event) => {
          hadFocus.current = true;
          onFocus?.(event);
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) hadFocus.current = false;
          onBlur?.(event);
        }}
        className={cn(
          "flex w-full min-w-0 flex-col rounded-surface border bg-card text-card-foreground data-[state=superseded]:border-dashed data-[state=superseded]:bg-transparent",
          className,
        )}
        {...props}
      >
        {children}
        {state === "superseded" && supersededBy ? (
          <div data-slot="part-frame-superseded-by" className="px-4 pb-3 text-sm">
            {supersededBy}
          </div>
        ) : null}
      </section>
    </PartFrameContext>
  );
}

/** The top row: the title, then controls such as PartFrameExpand at the end. */
export function PartFrameHeader({ className, ...props }: ComponentProps<"div">) {
  const { state } = usePartFrameContext("PartFrameHeader");
  return (
    <div
      data-slot="part-frame-header"
      className={cn("flex min-h-12 min-w-0 items-center gap-2 px-4 py-1.5", state !== "superseded" && "border-b", className)}
      {...props}
    />
  );
}

export type PartFrameTitleProps = ComponentProps<"h3"> & {
  /** The heading level, so the frame fits the page's outline. Default 3. */
  level?: 2 | 3 | 4 | 5 | 6;
};

/**
 * The heading that names the frame ("Plan for Saturday"), followed by the state in words where there is
 * something to say: "Saving" with a turning mark, "Replaced" on a stub. "Loading" is for screen readers only,
 * since the skeleton shows it.
 */
export function PartFrameTitle({ className, level = 3, children, ...props }: PartFrameTitleProps) {
  const { state, titleId, labels } = usePartFrameContext("PartFrameTitle");
  const Heading = `h${level}` as const;
  const word =
    state === "loading" ? (labels.loading ?? "Loading") : state === "pending" ? (labels.pending ?? "Saving") : state === "superseded" ? (labels.superseded ?? "Replaced") : state === "final" ? labels.final : undefined;
  return (
    <div data-slot="part-frame-title" className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-0.5">
      <Heading id={titleId} className={cn("min-w-0 truncate text-sm font-medium", state === "superseded" && "text-muted-foreground", className)} {...props}>
        {children}
      </Heading>
      {word ? (
        <span data-slot="part-frame-status" className={cn("inline-flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground", state === "loading" && "sr-only")}>
          {state === "pending" ? (
            <span aria-hidden="true" className="size-3 animate-spin rounded-full border-2 border-current border-e-transparent motion-reduce:animate-none" />
          ) : null}
          {word}
        </span>
      ) : null}
    </div>
  );
}

export type PartFrameContentProps = ComponentProps<"div"> & {
  /** What stands in while loading. Default: a few skeleton lines. It sits in the same box, so give the box its final size (`min-h-40`, an aspect ratio) and nothing jumps. */
  fallback?: ReactNode;
};

/** The body. Not rendered on a superseded frame; replaced by the skeleton while loading. */
export function PartFrameContent({ className, fallback, children, ...props }: PartFrameContentProps) {
  const { state } = usePartFrameContext("PartFrameContent");
  if (state === "superseded") return null;
  return (
    <div data-slot="part-frame-content" className={cn("min-w-0 p-4", className)} {...props}>
      {state === "loading"
        ? (fallback ?? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ))
        : children}
    </div>
  );
}

/** Actions under the body. Not rendered while loading or on a superseded frame. */
export function PartFrameFooter({ className, ...props }: ComponentProps<"div">) {
  const { state } = usePartFrameContext("PartFrameFooter");
  if (state === "superseded" || state === "loading") return null;
  return <div data-slot="part-frame-footer" className={cn("flex min-w-0 flex-wrap items-center gap-2 border-t px-4 py-3", className)} {...props} />;
}

export type PartFrameExpandProps = {
  /** The full-screen window's title: usually the same words as PartFrameTitle. */
  title: ReactNode;
  /** The button's name. Default "Open full screen". */
  label?: string;
  /** The close button's name in the window. Default "Close". */
  closeLabel?: string;
  /** What the window shows: usually the same content in a roomier layout. */
  children: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
};

/**
 * A button that opens the frame's content in a window that fills the screen (the library's dialog: focus
 * moves in, is kept in, Escape closes, and focus returns to this button). Not shown while loading or on a
 * superseded frame.
 */
export function PartFrameExpand({ title, label = "Open full screen", closeLabel, children, className, ...dialog }: PartFrameExpandProps) {
  const { state } = usePartFrameContext("PartFrameExpand");
  if (state === "superseded" || state === "loading") return null;
  return (
    <Dialog {...dialog}>
      <DialogTrigger
        data-slot="part-frame-expand"
        aria-label={label}
        className="-me-2 inline-flex size-(--control-h-sm) shrink-0 items-center justify-center rounded-control text-muted-foreground transition-[background-color,color] duration-instant ease-out hover:bg-accent hover:text-foreground motion-reduce:transition-none pointer-coarse:size-(--control-h) [&_svg]:size-4"
      >
        <Maximize2 aria-hidden="true" strokeWidth={1.5} />
      </DialogTrigger>
      <DialogContent aria-describedby={undefined} closeLabel={closeLabel} className={cn("h-[calc(100dvh-2rem)] max-w-none", className)}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div data-slot="part-frame-expanded" className="min-h-0 min-w-0 flex-1">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
