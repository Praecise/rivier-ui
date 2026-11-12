"use client";
/**
 * @name dropdown-menu
 * @category ui
 * @description A menu of actions that opens from a button: items, checkbox and radio items, labels, separators, sub-menus and a shortcut slot.
 * @when A list of actions or options behind one button (an account menu, "more" on a row). For choosing one value in a form use select; for actions on right-click use context-menu; for free content use popover. An icon-only trigger needs an `aria-label`.
 * @example
 * <DropdownMenu>
 *   <DropdownMenuTrigger asChild><Button variant="outline">Options</Button></DropdownMenuTrigger>
 *   <DropdownMenuContent align="start">
 *     <DropdownMenuLabel>Project</DropdownMenuLabel>
 *     <DropdownMenuItem>Rename <DropdownMenuShortcut>F2</DropdownMenuShortcut></DropdownMenuItem>
 *     <DropdownMenuCheckboxItem checked>Show in sidebar</DropdownMenuCheckboxItem>
 *     <DropdownMenuSub>
 *       <DropdownMenuSubTrigger>Move to</DropdownMenuSubTrigger>
 *       <DropdownMenuSubContent>
 *         <DropdownMenuRadioGroup value="work">
 *           <DropdownMenuRadioItem value="work">Work</DropdownMenuRadioItem>
 *           <DropdownMenuRadioItem value="archive">Archive</DropdownMenuRadioItem>
 *         </DropdownMenuRadioGroup>
 *       </DropdownMenuSubContent>
 *     </DropdownMenuSub>
 *     <DropdownMenuSeparator />
 *     <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
 *   </DropdownMenuContent>
 * </DropdownMenu>
 */
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import { Check, ChevronRight, Circle } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/* The highlight (Radix's data-highlighted, which follows both pointer and keyboard) is the ground; the theme's
   focus ring stays for keyboard users and is drawn inside the item so the menu's edge does not clip it. */
const item =
  "relative flex min-h-9 cursor-default items-center gap-2 rounded-control px-2.5 py-1.5 text-sm select-none -outline-offset-2 data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-accent data-highlighted:text-accent-foreground pointer-coarse:min-h-10 [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";

const surface =
  "z-50 min-w-40 overflow-x-hidden overflow-y-auto rounded-surface border bg-popover p-1 text-popover-foreground ease-out animation-duration-(--duration-base) fade-in-0 fade-out-0 zoom-in-95 zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=open]:animate-in motion-reduce:animate-none!";

export function DropdownMenu(props: ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root {...props} />;
}

export function DropdownMenuTrigger(props: ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
  return <DropdownMenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />;
}

export function DropdownMenuContent({ className, sideOffset = 6, collisionPadding = 8, ...props }: ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cn(
          surface,
          "max-h-(--radix-dropdown-menu-content-available-height) max-w-(--radix-dropdown-menu-content-available-width) origin-(--radix-dropdown-menu-content-transform-origin)",
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

export function DropdownMenuGroup(props: ComponentProps<typeof DropdownMenuPrimitive.Group>) {
  return <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />;
}

export type DropdownMenuItemProps = ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  /** Indent to line up with checkbox and radio items in the same menu. */
  inset?: boolean;
  /** "destructive" only for deleting. */
  variant?: "default" | "destructive";
};

export function DropdownMenuItem({ className, inset = false, variant = "default", ...props }: DropdownMenuItemProps) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-variant={variant}
      className={cn(item, inset && "ps-8", variant === "destructive" && "text-destructive data-highlighted:text-destructive", className)}
      {...props}
    />
  );
}

export function DropdownMenuCheckboxItem({ className, children, ...props }: ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) {
  return (
    <DropdownMenuPrimitive.CheckboxItem data-slot="dropdown-menu-checkbox-item" className={cn(item, "ps-8", className)} {...props}>
      <span aria-hidden="true" className="pointer-events-none absolute start-2.5 flex size-4 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Check strokeWidth={1.5} className="size-4" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  );
}

export function DropdownMenuRadioGroup(props: ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>) {
  return <DropdownMenuPrimitive.RadioGroup data-slot="dropdown-menu-radio-group" {...props} />;
}

export function DropdownMenuRadioItem({ className, children, ...props }: ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) {
  return (
    <DropdownMenuPrimitive.RadioItem data-slot="dropdown-menu-radio-item" className={cn(item, "ps-8", className)} {...props}>
      <span aria-hidden="true" className="pointer-events-none absolute start-2.5 flex size-4 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Circle strokeWidth={1.5} className="size-2 fill-current" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  );
}

export function DropdownMenuLabel({ className, inset = false, ...props }: ComponentProps<typeof DropdownMenuPrimitive.Label> & { inset?: boolean }) {
  return (
    <DropdownMenuPrimitive.Label
      data-slot="dropdown-menu-label"
      className={cn("px-2.5 py-1.5 text-xs font-medium text-muted-foreground", inset && "ps-8", className)}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({ className, ...props }: ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return <DropdownMenuPrimitive.Separator data-slot="dropdown-menu-separator" className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />;
}

/** A keyboard hint at the end of an item. It only shows the keys: bind them yourself. */
export function DropdownMenuShortcut({ className, ...props }: ComponentProps<"span">) {
  return <span data-slot="dropdown-menu-shortcut" className={cn("ms-auto ps-4 text-xs tracking-widest text-muted-foreground", className)} {...props} />;
}

export function DropdownMenuSub(props: ComponentProps<typeof DropdownMenuPrimitive.Sub>) {
  return <DropdownMenuPrimitive.Sub {...props} />;
}

export function DropdownMenuSubTrigger({ className, inset = false, children, ...props }: ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & { inset?: boolean }) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      data-slot="dropdown-menu-sub-trigger"
      className={cn(item, "data-[state=open]:bg-accent", inset && "ps-8", className)}
      {...props}
    >
      {children}
      <ChevronRight aria-hidden="true" strokeWidth={1.5} className="ms-auto size-4 rtl:rotate-180" />
    </DropdownMenuPrimitive.SubTrigger>
  );
}

export function DropdownMenuSubContent({ className, collisionPadding = 8, ...props }: ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.SubContent
        data-slot="dropdown-menu-sub-content"
        collisionPadding={collisionPadding}
        className={cn(
          surface,
          "max-h-(--radix-dropdown-menu-content-available-height) max-w-(--radix-dropdown-menu-content-available-width) origin-(--radix-dropdown-menu-content-transform-origin)",
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}
