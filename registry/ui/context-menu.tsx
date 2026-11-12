"use client";
/**
 * @name context-menu
 * @category ui
 * @description A menu of actions that opens at the pointer on right-click, and on a long press on touch screens: items, checkbox and radio items, labels, separators, sub-menus and a shortcut slot.
 * @when Shortcuts to actions on a thing in a dense interface (a file, a row, a canvas object). Nothing shows that it exists, so every action in it must also be reachable another way; for a visible button use dropdown-menu.
 * @example
 * <ContextMenu>
 *   <ContextMenuTrigger className="flex h-32 items-center justify-center rounded-surface border border-dashed text-sm">
 *     Right-click, or press and hold
 *   </ContextMenuTrigger>
 *   <ContextMenuContent>
 *     <ContextMenuItem>Open <ContextMenuShortcut>Enter</ContextMenuShortcut></ContextMenuItem>
 *     <ContextMenuCheckboxItem checked>Pinned</ContextMenuCheckboxItem>
 *     <ContextMenuSub>
 *       <ContextMenuSubTrigger>Label</ContextMenuSubTrigger>
 *       <ContextMenuSubContent>
 *         <ContextMenuRadioGroup value="none">
 *           <ContextMenuRadioItem value="none">None</ContextMenuRadioItem>
 *           <ContextMenuRadioItem value="urgent">Urgent</ContextMenuRadioItem>
 *         </ContextMenuRadioGroup>
 *       </ContextMenuSubContent>
 *     </ContextMenuSub>
 *     <ContextMenuSeparator />
 *     <ContextMenuItem variant="destructive">Delete</ContextMenuItem>
 *   </ContextMenuContent>
 * </ContextMenu>
 */
import { ContextMenu as ContextMenuPrimitive } from "radix-ui";
import { Check, ChevronRight, Circle } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/* The highlight (Radix's data-highlighted, which follows both pointer and keyboard) is the ground; the theme's
   focus ring stays for keyboard users and is drawn inside the item so the menu's edge does not clip it. */
const item =
  "relative flex min-h-9 cursor-default items-center gap-2 rounded-control px-2.5 py-1.5 text-sm select-none -outline-offset-2 data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-accent data-highlighted:text-accent-foreground pointer-coarse:min-h-10 [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";

/* The menu opens at the pointer, so it only fades and scales from that corner: there is no side to slide from. */
const surface =
  "z-50 max-h-(--radix-context-menu-content-available-height) min-w-40 max-w-(--radix-context-menu-content-available-width) origin-(--radix-context-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-surface border bg-popover p-1 text-popover-foreground ease-out animation-duration-(--duration-base) fade-in-0 fade-out-0 zoom-in-95 zoom-out-95 data-[state=closed]:animate-out data-[state=open]:animate-in motion-reduce:animate-none!";

export function ContextMenu(props: ComponentProps<typeof ContextMenuPrimitive.Root>) {
  return <ContextMenuPrimitive.Root {...props} />;
}

/** The area that answers to right-click and long press. Renders a span: give it layout classes, or use `asChild`. */
export function ContextMenuTrigger(props: ComponentProps<typeof ContextMenuPrimitive.Trigger>) {
  return <ContextMenuPrimitive.Trigger data-slot="context-menu-trigger" {...props} />;
}

export function ContextMenuContent({ className, collisionPadding = 8, ...props }: ComponentProps<typeof ContextMenuPrimitive.Content>) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Content data-slot="context-menu-content" collisionPadding={collisionPadding} className={cn(surface, className)} {...props} />
    </ContextMenuPrimitive.Portal>
  );
}

export function ContextMenuGroup(props: ComponentProps<typeof ContextMenuPrimitive.Group>) {
  return <ContextMenuPrimitive.Group data-slot="context-menu-group" {...props} />;
}

export type ContextMenuItemProps = ComponentProps<typeof ContextMenuPrimitive.Item> & {
  /** Indent to line up with checkbox and radio items in the same menu. */
  inset?: boolean;
  /** "destructive" only for deleting. */
  variant?: "default" | "destructive";
};

export function ContextMenuItem({ className, inset = false, variant = "default", ...props }: ContextMenuItemProps) {
  return (
    <ContextMenuPrimitive.Item
      data-slot="context-menu-item"
      data-variant={variant}
      className={cn(item, inset && "ps-8", variant === "destructive" && "text-destructive data-highlighted:text-destructive", className)}
      {...props}
    />
  );
}

export function ContextMenuCheckboxItem({ className, children, ...props }: ComponentProps<typeof ContextMenuPrimitive.CheckboxItem>) {
  return (
    <ContextMenuPrimitive.CheckboxItem data-slot="context-menu-checkbox-item" className={cn(item, "ps-8", className)} {...props}>
      <span aria-hidden="true" className="pointer-events-none absolute start-2.5 flex size-4 items-center justify-center">
        <ContextMenuPrimitive.ItemIndicator>
          <Check strokeWidth={1.5} className="size-4" />
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.CheckboxItem>
  );
}

export function ContextMenuRadioGroup(props: ComponentProps<typeof ContextMenuPrimitive.RadioGroup>) {
  return <ContextMenuPrimitive.RadioGroup data-slot="context-menu-radio-group" {...props} />;
}

export function ContextMenuRadioItem({ className, children, ...props }: ComponentProps<typeof ContextMenuPrimitive.RadioItem>) {
  return (
    <ContextMenuPrimitive.RadioItem data-slot="context-menu-radio-item" className={cn(item, "ps-8", className)} {...props}>
      <span aria-hidden="true" className="pointer-events-none absolute start-2.5 flex size-4 items-center justify-center">
        <ContextMenuPrimitive.ItemIndicator>
          <Circle strokeWidth={1.5} className="size-2 fill-current" />
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.RadioItem>
  );
}

export function ContextMenuLabel({ className, inset = false, ...props }: ComponentProps<typeof ContextMenuPrimitive.Label> & { inset?: boolean }) {
  return (
    <ContextMenuPrimitive.Label
      data-slot="context-menu-label"
      className={cn("px-2.5 py-1.5 text-xs font-medium text-muted-foreground", inset && "ps-8", className)}
      {...props}
    />
  );
}

export function ContextMenuSeparator({ className, ...props }: ComponentProps<typeof ContextMenuPrimitive.Separator>) {
  return <ContextMenuPrimitive.Separator data-slot="context-menu-separator" className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />;
}

/** A keyboard hint at the end of an item. It only shows the keys: bind them yourself. */
export function ContextMenuShortcut({ className, ...props }: ComponentProps<"span">) {
  return <span data-slot="context-menu-shortcut" className={cn("ms-auto ps-4 text-xs tracking-widest text-muted-foreground", className)} {...props} />;
}

export function ContextMenuSub(props: ComponentProps<typeof ContextMenuPrimitive.Sub>) {
  return <ContextMenuPrimitive.Sub {...props} />;
}

export function ContextMenuSubTrigger({ className, inset = false, children, ...props }: ComponentProps<typeof ContextMenuPrimitive.SubTrigger> & { inset?: boolean }) {
  return (
    <ContextMenuPrimitive.SubTrigger
      data-slot="context-menu-sub-trigger"
      className={cn(item, "data-[state=open]:bg-accent", inset && "ps-8", className)}
      {...props}
    >
      {children}
      <ChevronRight aria-hidden="true" strokeWidth={1.5} className="ms-auto size-4 rtl:rotate-180" />
    </ContextMenuPrimitive.SubTrigger>
  );
}

export function ContextMenuSubContent({ className, collisionPadding = 8, ...props }: ComponentProps<typeof ContextMenuPrimitive.SubContent>) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.SubContent data-slot="context-menu-sub-content" collisionPadding={collisionPadding} className={cn(surface, className)} {...props} />
    </ContextMenuPrimitive.Portal>
  );
}
