"use client";
/**
 * @name undo-line
 * @category ui
 * @description A line that stays where something was just done, says what it was, and offers to undo it.
 * @when After an action that can be taken back, inside the place it happened: a row removed from a plan, a message archived, a change applied by an assistant. It stays until it is dismissed or the next action replaces it, so it is not missed the way a toast is by someone using a screen reader, a magnifier or a slow hand. For news that needs no answer and is unrelated to one place use toaster; for a decision before the action use dialog.
 * @example
 * {removed ? (
 *   <UndoLine>
 *     <UndoLineMessage>Lunch was removed from Saturday.</UndoLineMessage>
 *     <UndoLineAction onClick={restore}>Undo</UndoLineAction>
 *     <UndoLineDismiss aria-label="Dismiss" onClick={() => setRemoved(null)} />
 *   </UndoLine>
 * ) : null}
 */
import { X } from "lucide-react";
import { useEffect, useRef, type ComponentProps } from "react";
import { buttonVariants } from "@/components/ui/button";
import { announce } from "@/lib/announce";
import { cn } from "@/lib/cn";

/** The line: the message at the start, the actions at the end, wrapping under it when narrow. */
export function UndoLine({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="undo-line"
      className={cn("flex w-full min-w-0 flex-wrap items-center gap-x-2 gap-y-1 rounded-control border bg-muted py-1 ps-3.5 pe-1 text-sm text-foreground", className)}
      {...props}
    />
  );
}

export type UndoLineMessageProps = ComponentProps<"p"> & {
  /** Set false to stop the message being said to screen-reader users (when the project announces it itself). */
  announced?: boolean;
};

/**
 * What was done, in the past tense and with its object ("Lunch was removed from Saturday"). It is said
 * politely to screen-reader users when the line appears and again whenever its words change, through the
 * page's shared live region: a line that has only just been added to the page would otherwise be missed.
 */
export function UndoLineMessage({ className, announced = true, ...props }: UndoLineMessageProps) {
  const ref = useRef<HTMLParagraphElement>(null);
  const said = useRef("");
  useEffect(() => {
    const text = ref.current?.textContent?.trim() ?? "";
    if (!announced || text === "" || text === said.current) return;
    said.current = text;
    announce(text);
  });
  return <p ref={ref} data-slot="undo-line-message" className={cn("min-w-0 flex-1 basis-40 py-1.5", className)} {...props} />;
}

/** Takes the action back. Its word is the project's ("Undo"). After undoing, move focus to what came back. */
export function UndoLineAction({ className, type = "button", ...props }: ComponentProps<"button">) {
  return <button type={type} data-slot="undo-line-action" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "font-medium underline underline-offset-4 pointer-coarse:h-control", className)} {...props} />;
}

/** Closes the line and keeps the change. Icon only: give it an `aria-label` in the interface language. */
export function UndoLineDismiss({ className, children, type = "button", "aria-label": ariaLabel = "Dismiss", ...props }: ComponentProps<"button">) {
  return (
    <button
      type={type}
      data-slot="undo-line-dismiss"
      aria-label={ariaLabel}
      className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "size-(--control-h-sm) px-0 text-muted-foreground pointer-coarse:size-(--control-h)", className)}
      {...props}
    >
      {children ?? <X aria-hidden="true" strokeWidth={1.5} />}
    </button>
  );
}
