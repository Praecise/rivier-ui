/**
 * @name kbd
 * @category ui
 * @description A key cap for showing a keyboard key or a shortcut.
 * @when Naming a key the reader can press: in a menu item, a tooltip, a hint under a field. Wrap a combination in KbdGroup, one Kbd per key.
 * @example
 * <Kbd>Esc</Kbd>
 * <KbdGroup>
 *   <Kbd>Ctrl</Kbd>
 *   <Kbd>K</Kbd>
 * </KbdGroup>
 */
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function Kbd({ className, ...props }: ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-control border border-border-strong bg-muted px-1 font-mono text-xs font-medium whitespace-nowrap text-foreground [&_svg]:size-3",
        className,
      )}
      {...props}
    />
  );
}

/** Keys pressed together. Renders an outer kbd, which is the correct markup for a combination. */
export function KbdGroup({ className, ...props }: ComponentProps<"kbd">) {
  return <kbd data-slot="kbd-group" className={cn("inline-flex items-center gap-1 font-mono", className)} {...props} />;
}
