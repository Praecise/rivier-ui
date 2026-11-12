"use client";
/**
 * @name command
 * @category ui
 * @description A command palette: a search field over a filtered, keyboard-driven list of actions, inline or in a dialog.
 * @when Fast access to many actions or pages by typing (the Ctrl/Cmd+K palette), or a searchable list inside a popover. For a handful of actions use dropdown-menu. CommandDialog is usually opened by a shortcut, with no trigger, so focus has nowhere to return: remember the opener (`opener.current = document.activeElement` before opening) and refocus it in `onCloseAutoFocus={(event) => { event.preventDefault(); opener.current?.focus(); }}`.
 * @example
 * const [open, setOpen] = useState(false);
 *
 * <Button variant="outline" onClick={() => setOpen(true)}>Search</Button>
 * <CommandDialog open={open} onOpenChange={setOpen}>
 *   <CommandInput placeholder="Type a command" />
 *   <CommandList>
 *     <CommandEmpty>Nothing found.</CommandEmpty>
 *     <CommandGroup heading="Pages">
 *       <CommandItem onSelect={() => setOpen(false)}>Dashboard</CommandItem>
 *       <CommandItem onSelect={() => setOpen(false)}>Settings <CommandShortcut>Ctrl ,</CommandShortcut></CommandItem>
 *     </CommandGroup>
 *     <CommandSeparator />
 *     <CommandGroup heading="Account">
 *       <CommandItem onSelect={() => setOpen(false)}>Sign out</CommandItem>
 *     </CommandGroup>
 *   </CommandList>
 * </CommandDialog>
 */
import { Command as CommandPrimitive } from "cmdk";
import { Search } from "lucide-react";
import type { ComponentProps } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, type DialogContentProps } from "@/components/ui/dialog";
import { cn } from "@/lib/cn";

/** The palette itself. Use it inline (in a card or popover), or let CommandDialog wrap it. */
export function Command({ className, ...props }: ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn("flex min-h-0 w-full flex-col overflow-hidden rounded-surface bg-popover text-popover-foreground", className)}
      {...props}
    />
  );
}

export type CommandDialogProps = ComponentProps<typeof Dialog> &
  Pick<DialogContentProps, "onCloseAutoFocus" | "onOpenAutoFocus"> & {
    /** The dialog's accessible name. Read by screen readers, not shown. */
    title?: string;
    /** The dialog's accessible description. Read by screen readers, not shown. */
    description?: string;
    /** Classes for the dialog window. */
    className?: string;
    /** Props for the palette inside: `filter`, `shouldFilter`, `loop`, `label`. */
    commandProps?: ComponentProps<typeof CommandPrimitive>;
  };

/** The palette in a dialog. Escape and a click outside close it, so it has no close button. */
export function CommandDialog({
  title = "Command palette",
  description = "Type to search, use the arrow keys to move, Enter to run.",
  className,
  commandProps,
  onCloseAutoFocus,
  onOpenAutoFocus,
  children,
  ...props
}: CommandDialogProps) {
  return (
    <Dialog {...props}>
      <DialogContent
        showCloseButton={false}
        onCloseAutoFocus={onCloseAutoFocus}
        onOpenAutoFocus={onOpenAutoFocus}
        className={cn("gap-0 overflow-hidden bg-popover p-0 text-popover-foreground", className)}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Command {...commandProps}>{children}</Command>
      </DialogContent>
    </Dialog>
  );
}

/** The search field. The focus ring is drawn on the whole row, inside its edge. */
export function CommandInput({ className, ...props }: ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div
      data-slot="command-input-wrapper"
      className="flex h-12 shrink-0 items-center gap-2 border-b px-3.5 has-focus-visible:outline-2 has-focus-visible:-outline-offset-2 has-focus-visible:outline-ring"
    >
      <Search aria-hidden="true" strokeWidth={1.5} className="size-4 shrink-0 text-muted-foreground" />
      <CommandPrimitive.Input
        data-slot="command-input"
        className={cn(
          "h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        {...props}
      />
    </div>
  );
}

export function CommandList({ className, ...props }: ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn("max-h-80 min-h-0 scroll-py-1 overflow-x-hidden overflow-y-auto p-1", className)}
      {...props}
    />
  );
}

export function CommandEmpty({ className, ...props }: ComponentProps<typeof CommandPrimitive.Empty>) {
  return <CommandPrimitive.Empty data-slot="command-empty" className={cn("px-2.5 py-6 text-center text-sm text-muted-foreground", className)} {...props} />;
}

export function CommandGroup({ className, ...props }: ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(
        "overflow-hidden text-foreground [&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function CommandSeparator({ className, ...props }: ComponentProps<typeof CommandPrimitive.Separator>) {
  return <CommandPrimitive.Separator data-slot="command-separator" className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />;
}

/** One action. Focus stays in the search field; the active item is marked by cmdk's `data-selected`. */
export function CommandItem({ className, ...props }: ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        "relative flex min-h-9 cursor-default items-center gap-2 rounded-control px-2.5 py-1.5 text-sm select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground pointer-coarse:min-h-10 [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

/** A keyboard hint at the end of an item. It only shows the keys: bind them yourself. */
export function CommandShortcut({ className, ...props }: ComponentProps<"span">) {
  return <span data-slot="command-shortcut" className={cn("ms-auto ps-4 text-xs tracking-widest text-muted-foreground", className)} {...props} />;
}
