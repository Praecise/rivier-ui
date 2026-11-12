"use client";
/**
 * @name separator
 * @category ui
 * @description A hairline between two pieces of content, horizontal or vertical, with an optional label in the middle.
 * @when Dividing groups inside a surface or a toolbar. Between page sections use section spacing instead, and inside a list prefer a border on the rows.
 * @example
 * <Separator />
 * <Separator>or continue with</Separator>
 * <div className="flex h-5 items-center gap-3">
 *   <span>Docs</span>
 *   <Separator orientation="vertical" />
 *   <span>Blog</span>
 * </div>
 */
import { Separator as SeparatorPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

const line =
  "shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-px data-[orientation=vertical]:self-stretch";

export type SeparatorProps = ComponentProps<typeof SeparatorPrimitive.Root>;

/**
 * Decorative by default (hidden from assistive technology). Pass `decorative={false}` when the split carries
 * meaning. Children become a centred label; a label is only drawn on a horizontal separator.
 */
export function Separator({ className, orientation = "horizontal", decorative = true, children, asChild, ...props }: SeparatorProps) {
  if (children && orientation === "horizontal" && !asChild) {
    return (
      <div
        data-slot="separator"
        data-orientation="horizontal"
        role={decorative ? undefined : "separator"}
        className={cn("flex w-full items-center gap-3 text-xs text-muted-foreground", className)}
        {...props}
      >
        <SeparatorPrimitive.Root decorative className={cn(line, "min-w-4 flex-1 data-[orientation=horizontal]:w-auto")} />
        <span data-slot="separator-label" className="min-w-0 text-center">
          {children}
        </span>
        <SeparatorPrimitive.Root decorative className={cn(line, "min-w-4 flex-1 data-[orientation=horizontal]:w-auto")} />
      </div>
    );
  }
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      orientation={orientation}
      decorative={decorative}
      asChild={asChild}
      className={cn(line, className)}
      {...props}
    >
      {asChild ? children : undefined}
    </SeparatorPrimitive.Root>
  );
}
