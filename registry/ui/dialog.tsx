"use client";
/**
 * @name dialog
 * @category ui
 * @description A modal window over a dimmed page, with parts for a header, title, description and footer.
 * @when A short task or a decision that must be finished or dismissed before going on. For a panel from an edge (menus, filters, details) use sheet; for something small attached to a control use popover. Always give it a DialogTitle (add className="sr-only" to hide it). Opened by a DialogTrigger, focus returns to that trigger on close. Opened by state with no trigger (a shortcut, a menu item), Radix has nothing to return to: remember the opener (`opener.current = document.activeElement` before opening) and refocus it in `onCloseAutoFocus={(event) => { event.preventDefault(); opener.current?.focus(); }}` on DialogContent.
 * @example
 * <Dialog>
 *   <DialogTrigger asChild><Button variant="outline">Rename</Button></DialogTrigger>
 *   <DialogContent>
 *     <DialogHeader>
 *       <DialogTitle>Rename project</DialogTitle>
 *       <DialogDescription>The address of the project does not change.</DialogDescription>
 *     </DialogHeader>
 *     <input aria-label="Name" defaultValue="Atlas" className="h-control rounded-control border border-input px-3 text-base" />
 *     <DialogFooter>
 *       <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
 *       <Button>Save</Button>
 *     </DialogFooter>
 *   </DialogContent>
 * </Dialog>
 */
import { Dialog as DialogPrimitive } from "radix-ui";
import { X } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function Dialog(props: ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root {...props} />;
}

export function DialogTrigger(props: ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

export function DialogClose(props: ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

export function DialogOverlay({ className, ...props }: ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-overlay ease-out animation-duration-(--duration-base) fade-in-0 fade-out-0 data-[state=closed]:animate-out data-[state=open]:animate-in motion-reduce:animate-none!",
        className,
      )}
      {...props}
    />
  );
}

export type DialogContentProps = ComponentProps<typeof DialogPrimitive.Content> & {
  /** The close button in the top corner. Turn it off only when the content has its own way out. */
  showCloseButton?: boolean;
  /** The close button's accessible name. Translate it with the rest of the interface. */
  closeLabel?: string;
};

/** The window, with its portal and overlay. Never taller or wider than the viewport: it scrolls inside. */
export function DialogContent({ className, children, showCloseButton = true, closeLabel = "Close", ...props }: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "fixed inset-0 z-50 m-auto flex h-fit max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg flex-col gap-4 overflow-y-auto rounded-surface border bg-card p-6 text-card-foreground ease-out animation-duration-(--duration-base) fade-in-0 fade-out-0 zoom-in-95 zoom-out-95 data-[state=closed]:animate-out data-[state=open]:animate-in motion-reduce:animate-none!",
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton ? (
          <DialogPrimitive.Close
            data-slot="dialog-close-button"
            aria-label={closeLabel}
            className="absolute end-2 top-2 inline-flex size-(--control-h) items-center justify-center rounded-control text-muted-foreground transition-[background-color,color] duration-instant ease-out hover:bg-accent hover:text-foreground motion-reduce:transition-none"
          >
            <X aria-hidden="true" strokeWidth={1.5} className="size-4" />
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

/** Leaves room at the end for the close button. */
export function DialogHeader({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="dialog-header" className={cn("flex flex-col gap-1.5 pe-8 text-start", className)} {...props} />;
}

export function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title data-slot="dialog-title" className={cn("text-base font-medium leading-tight", className)} {...props} />;
}

export function DialogDescription({ className, ...props }: ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description data-slot="dialog-description" className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

/** Actions: stacked on phones with the main action first, in a row at the end from `sm`. */
export function DialogFooter({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="dialog-footer" className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />;
}
