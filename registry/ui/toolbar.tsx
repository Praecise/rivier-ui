"use client";
/**
 * @name toolbar
 * @category ui
 * @description A row of controls (buttons, toggles, toggle groups, links, separators) that is one stop in the Tab order and moved through with the arrow keys, to the WAI-ARIA toolbar pattern.
 * @when A cluster of related commands over a piece of content: text formatting over an editor, tools over a canvas, actions over a list. For a site's links use navbar; for two to five choices of which one is on use segmented-control.
 * @example
 * <Toolbar aria-label="Formatting">
 *   <ToolbarToggleGroup type="multiple" aria-label="Style">
 *     <ToolbarToggleItem value="bold" aria-label="Bold"><Bold /></ToolbarToggleItem>
 *     <ToolbarToggleItem value="italic" aria-label="Italic"><Italic /></ToolbarToggleItem>
 *   </ToolbarToggleGroup>
 *   <ToolbarSeparator />
 *   <ToolbarButton>Share</ToolbarButton>
 * </Toolbar>
 */
import { Toolbar as ToolbarPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/** The toolbar. Name it with `aria-label`. It wraps onto a second row when there is no room. */
export function Toolbar({ className, ...props }: ComponentProps<typeof ToolbarPrimitive.Root>) {
  return <ToolbarPrimitive.Root data-slot="toolbar" className={cn("flex min-w-0 flex-wrap items-center gap-1 rounded-control border bg-background p-1", className)} {...props} />;
}

const control =
  "inline-flex h-control-sm min-w-(--control-h-sm) items-center justify-center gap-1.5 rounded-control px-2 text-sm hover:bg-accent disabled:opacity-50 data-[state=on]:bg-highlight-soft pointer-coarse:h-control pointer-coarse:min-w-(--control-h) [&_svg]:size-4";

export function ToolbarButton({ className, ...props }: ComponentProps<typeof ToolbarPrimitive.Button>) {
  return <ToolbarPrimitive.Button data-slot="toolbar-button" className={cn(control, className)} {...props} />;
}

export function ToolbarLink({ className, ...props }: ComponentProps<typeof ToolbarPrimitive.Link>) {
  return <ToolbarPrimitive.Link data-slot="toolbar-link" className={cn(control, "underline-offset-4 hover:underline", className)} {...props} />;
}

export function ToolbarToggleGroup({ className, ...props }: ComponentProps<typeof ToolbarPrimitive.ToggleGroup>) {
  return <ToolbarPrimitive.ToggleGroup data-slot="toolbar-toggle-group" className={cn("flex items-center gap-0.5", className)} {...props} />;
}

/** A toggle: on is marked by its ground and by aria-pressed (or aria-checked in a single group), not by colour alone to assistive technology. */
export function ToolbarToggleItem({ className, ...props }: ComponentProps<typeof ToolbarPrimitive.ToggleItem>) {
  return <ToolbarPrimitive.ToggleItem data-slot="toolbar-toggle-item" className={cn(control, "data-[state=on]:font-medium", className)} {...props} />;
}

export function ToolbarSeparator({ className, ...props }: ComponentProps<typeof ToolbarPrimitive.Separator>) {
  return <ToolbarPrimitive.Separator data-slot="toolbar-separator" className={cn("mx-1 h-5 w-px bg-border", className)} {...props} />;
}
