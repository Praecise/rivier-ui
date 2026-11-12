/**
 * @name status-line
 * @category ui
 * @description One line that says in words what is happening now ("Searching", "Writing a reply", "Done"), read out politely by screen readers, with an optional moving mark and a slot for a stop button.
 * @when Beside a thread or any surface where work goes on that the person waits for: it is the one polite live region of that surface. Render it from the start, empty, and change its text: a region that appears together with its text is often not announced. It keeps its height when empty, so nothing jumps. For a wait with no words use spinner; for a measurable one use progress; for a result that must outlive the moment use alert or toaster.
 * @example
 * <StatusLine working={busy} action={busy ? <StatusLineAction onClick={stop}>Stop</StatusLineAction> : null}>
 *   {busy ? "Searching three sources" : ""}
 * </StatusLine>
 */
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type StatusLineProps = ComponentProps<"div"> & {
  /** Shows the moving mark. The words, not the mark, carry the meaning. */
  working?: boolean;
  /** The mark: three dots (default), a ring, none, or your own element (it is hidden from assistive technology). */
  indicator?: "dots" | "spinner" | "none" | ReactNode;
  /** A control beside the words, usually StatusLineAction ("Stop"). It sits outside the live region, so it is not read out with every change. */
  action?: ReactNode;
  /** The status in words. An empty string clears it. */
  children?: ReactNode;
};

/**
 * `role="status"` (polite, atomic) on the words alone. The mark is decoration: it pulses or turns with
 * opacity and transform only, and stands still under reduced motion.
 */
export function StatusLine({ className, working = false, indicator = "dots", action, children, ...props }: StatusLineProps) {
  return (
    <div
      data-slot="status-line"
      data-working={working ? "" : undefined}
      className={cn("flex min-h-(--control-h-sm) min-w-0 items-center gap-2 text-sm text-muted-foreground pointer-coarse:min-h-(--control-h)", className)}
      {...props}
    >
      {working && indicator !== "none" ? (
        <span aria-hidden="true" data-slot="status-line-indicator" className="inline-flex shrink-0 items-center">
          {indicator === "dots" ? <Dots /> : indicator === "spinner" ? <Ring /> : indicator}
        </span>
      ) : null}
      <span data-slot="status-line-text" role="status" aria-live="polite" aria-atomic="true" className="min-w-0 flex-1 truncate">
        {children}
      </span>
      {action}
    </div>
  );
}

function Dots() {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="size-1.5 animate-pulse rounded-full bg-current motion-reduce:animate-none" />
      <span className="size-1.5 animate-pulse rounded-full bg-current [animation-delay:var(--duration-base)] motion-reduce:animate-none" />
      <span className="size-1.5 animate-pulse rounded-full bg-current [animation-delay:calc(var(--duration-base)*2)] motion-reduce:animate-none" />
    </span>
  );
}

function Ring() {
  return <span className="size-4 animate-spin rounded-full border-2 border-current border-e-transparent motion-reduce:animate-none" />;
}

export type StatusLineActionProps = ComponentProps<"button">;

/** A small text button for the line: "Stop", "Cancel", "Try again". */
export function StatusLineAction({ className, type = "button", ...props }: StatusLineActionProps) {
  return (
    <button
      type={type}
      data-slot="status-line-action"
      className={cn(
        "inline-flex h-control-sm shrink-0 items-center justify-center gap-1.5 rounded-control border border-border-strong bg-background px-3 text-sm font-medium text-foreground transition-[background-color,opacity] duration-instant ease-out hover:bg-accent disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none pointer-coarse:h-control [&_svg]:size-4 [&_svg]:shrink-0",
        className,
      )}
      {...props}
    />
  );
}
