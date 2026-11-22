/**
 * @name button-group
 * @category ui
 * @description Buttons joined into one block with shared edges (rounded only at the ends), side by side or stacked, with an optional piece of text or a separator between them.
 * @when Related actions that belong together: a split button (an action and its menu), zoom out and in, previous and next. For a choice of one use segmented-control or toggle-group; for a set of commands over content use toolbar.
 * @example
 * <ButtonGroup aria-label="Zoom">
 *   <Button variant="outline" size="icon" aria-label="Zoom out"><Minus /></Button>
 *   <ButtonGroupText>100%</ButtonGroupText>
 *   <Button variant="outline" size="icon" aria-label="Zoom in"><Plus /></Button>
 * </ButtonGroup>
 */
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export type ButtonGroupProps = ComponentProps<"div"> & { orientation?: "horizontal" | "vertical" };

/** A named group. Its children lose the radius where they meet, and their borders overlap so the seam is one line. */
export function ButtonGroup({ className, orientation = "horizontal", ...props }: ButtonGroupProps) {
  return (
    <div
      data-slot="button-group"
      role="group"
      data-orientation={orientation}
      className={cn(
        "inline-flex w-fit items-stretch *:focus-visible:relative *:focus-visible:z-10",
        orientation === "horizontal"
          ? "*:not-first:rounded-s-none *:not-last:rounded-e-none *:not-first:-ms-px"
          : "flex-col *:not-first:rounded-t-none *:not-last:rounded-b-none *:not-first:-mt-px",
        className,
      )}
      {...props}
    />
  );
}

/** Words or a value between the buttons, in the same frame. */
export function ButtonGroupText({ className, ...props }: ComponentProps<"span">) {
  return <span data-slot="button-group-text" className={cn("inline-flex items-center rounded-control border border-border-strong bg-muted px-3 text-sm tabular-nums", className)} {...props} />;
}

/** A line between buttons of the same look (two solid buttons) so the seam shows. */
export function ButtonGroupSeparator({ className, ...props }: ComponentProps<"span">) {
  return <span data-slot="button-group-separator" aria-hidden="true" className={cn("w-px self-stretch bg-border-strong", className)} {...props} />;
}
