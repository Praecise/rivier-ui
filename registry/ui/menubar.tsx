"use client";
/**
 * @name menubar
 * @category ui
 * @description A row of menus that stays on screen, as in a desktop application: File, Edit, View, each opening a menu of items, checkbox and radio items and sub-menus, moved through with the arrow keys from one menu to the next.
 * @when An editor or tool with many commands grouped by kind. For a site's navigation use navbar or navigation-menu; for one button's actions use dropdown-menu; on a phone, prefer a toolbar or a single menu.
 * @example
 * <Menubar>
 *   <MenubarMenu>
 *     <MenubarTrigger>File</MenubarTrigger>
 *     <MenubarContent>
 *       <MenubarItem>New <MenubarShortcut>⌘N</MenubarShortcut></MenubarItem>
 *       <MenubarSeparator />
 *       <MenubarItem>Print</MenubarItem>
 *     </MenubarContent>
 *   </MenubarMenu>
 * </Menubar>
 */
import { Menubar as MenubarPrimitive } from "radix-ui";
import { Check, ChevronRight, Circle } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

const item =
  "relative flex min-h-9 cursor-default items-center gap-2 rounded-control px-2.5 py-1.5 text-sm select-none -outline-offset-2 data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-accent data-highlighted:text-accent-foreground pointer-coarse:min-h-10 [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";
/*
 * No closing animation. A menu that is still on screen while it animates out sees focus arrive in the menu
 * the arrow key has just opened, takes that for a move outside the bar, and closes every menu. So a menu
 * here closes at once.
 */
const surface =
  "z-50 min-w-48 overflow-x-hidden overflow-y-auto rounded-surface border bg-popover p-1 text-popover-foreground ease-out animation-duration-(--duration-base) fade-in-0 zoom-in-95 data-[state=open]:animate-in motion-reduce:animate-none!";

/** The bar. It scrolls sideways on a narrow screen rather than wrapping. */
export function Menubar({ className, ...props }: ComponentProps<typeof MenubarPrimitive.Root>) {
  return <MenubarPrimitive.Root data-slot="menubar" className={cn("flex h-control max-w-full items-center gap-1 overflow-x-auto rounded-control border bg-background p-1", className)} {...props} />;
}

export function MenubarMenu(props: ComponentProps<typeof MenubarPrimitive.Menu>) {
  return <MenubarPrimitive.Menu {...props} />;
}

export function MenubarTrigger({ className, ...props }: ComponentProps<typeof MenubarPrimitive.Trigger>) {
  return (
    <MenubarPrimitive.Trigger
      data-slot="menubar-trigger"
      className={cn("flex h-full shrink-0 items-center rounded-control px-3 text-sm font-medium select-none data-[state=open]:bg-accent data-highlighted:bg-accent pointer-coarse:px-4", className)}
      {...props}
    />
  );
}

export function MenubarContent({ className, align = "start", sideOffset = 6, collisionPadding = 8, ...props }: ComponentProps<typeof MenubarPrimitive.Content>) {
  return (
    <MenubarPrimitive.Portal>
      <MenubarPrimitive.Content data-slot="menubar-content" align={align} sideOffset={sideOffset} collisionPadding={collisionPadding} className={cn(surface, className)} {...props} />
    </MenubarPrimitive.Portal>
  );
}

export function MenubarItem({ className, inset = false, variant = "default", ...props }: ComponentProps<typeof MenubarPrimitive.Item> & { inset?: boolean; variant?: "default" | "destructive" }) {
  return <MenubarPrimitive.Item data-slot="menubar-item" className={cn(item, inset && "ps-8", variant === "destructive" && "text-destructive data-highlighted:text-destructive", className)} {...props} />;
}

export function MenubarCheckboxItem({ className, children, ...props }: ComponentProps<typeof MenubarPrimitive.CheckboxItem>) {
  return (
    <MenubarPrimitive.CheckboxItem data-slot="menubar-checkbox-item" className={cn(item, "ps-8", className)} {...props}>
      <span aria-hidden="true" className="pointer-events-none absolute start-2.5 flex size-4 items-center justify-center">
        <MenubarPrimitive.ItemIndicator>
          <Check strokeWidth={1.5} className="size-4" />
        </MenubarPrimitive.ItemIndicator>
      </span>
      {children}
    </MenubarPrimitive.CheckboxItem>
  );
}

export function MenubarRadioGroup(props: ComponentProps<typeof MenubarPrimitive.RadioGroup>) {
  return <MenubarPrimitive.RadioGroup data-slot="menubar-radio-group" {...props} />;
}

export function MenubarRadioItem({ className, children, ...props }: ComponentProps<typeof MenubarPrimitive.RadioItem>) {
  return (
    <MenubarPrimitive.RadioItem data-slot="menubar-radio-item" className={cn(item, "ps-8", className)} {...props}>
      <span aria-hidden="true" className="pointer-events-none absolute start-2.5 flex size-4 items-center justify-center">
        <MenubarPrimitive.ItemIndicator>
          <Circle strokeWidth={1.5} className="size-2 fill-current" />
        </MenubarPrimitive.ItemIndicator>
      </span>
      {children}
    </MenubarPrimitive.RadioItem>
  );
}

export function MenubarLabel({ className, ...props }: ComponentProps<typeof MenubarPrimitive.Label>) {
  return <MenubarPrimitive.Label data-slot="menubar-label" className={cn("px-2.5 py-1.5 text-xs font-medium text-muted-foreground", className)} {...props} />;
}

export function MenubarSeparator({ className, ...props }: ComponentProps<typeof MenubarPrimitive.Separator>) {
  return <MenubarPrimitive.Separator data-slot="menubar-separator" className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />;
}

/** A keyboard hint at the end of an item. It only shows the keys: bind them yourself (lib/use-hotkeys). */
export function MenubarShortcut({ className, ...props }: ComponentProps<"span">) {
  return <span data-slot="menubar-shortcut" className={cn("ms-auto ps-4 text-xs text-muted-foreground", className)} {...props} />;
}

export function MenubarSub(props: ComponentProps<typeof MenubarPrimitive.Sub>) {
  return <MenubarPrimitive.Sub {...props} />;
}

export function MenubarSubTrigger({ className, children, ...props }: ComponentProps<typeof MenubarPrimitive.SubTrigger>) {
  return (
    <MenubarPrimitive.SubTrigger data-slot="menubar-sub-trigger" className={cn(item, "data-[state=open]:bg-accent", className)} {...props}>
      {children}
      <ChevronRight aria-hidden="true" strokeWidth={1.5} className="ms-auto size-4 rtl:-scale-x-100" />
    </MenubarPrimitive.SubTrigger>
  );
}

export function MenubarSubContent({ className, collisionPadding = 8, ...props }: ComponentProps<typeof MenubarPrimitive.SubContent>) {
  return (
    <MenubarPrimitive.Portal>
      <MenubarPrimitive.SubContent data-slot="menubar-sub-content" collisionPadding={collisionPadding} className={cn(surface, className)} {...props} />
    </MenubarPrimitive.Portal>
  );
}
