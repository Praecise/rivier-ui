"use client";
/**
 * @name sheet
 * @category ui
 * @description A modal panel that slides in from an edge of the screen, with parts for a header, title, description and footer.
 * @when Navigation, filters, details or a longer form beside the page. `side` is "end" by default ("start" and "end" follow the reading direction; "left" and "right" do not); on phones "bottom" is the natural choice, because it is within reach of the thumb. For a short decision in the middle of the screen use dialog. Always give it a SheetTitle (add className="sr-only" to hide it). Opened by state with no SheetTrigger, focus does not return on close: remember the opener (`opener.current = document.activeElement`) and refocus it in `onCloseAutoFocus={(event) => { event.preventDefault(); opener.current?.focus(); }}` on SheetContent.
 * @example
 * <Sheet>
 *   <SheetTrigger asChild><Button variant="outline">Filters</Button></SheetTrigger>
 *   <SheetContent side="bottom">
 *     <SheetHeader>
 *       <SheetTitle>Filters</SheetTitle>
 *       <SheetDescription>Narrow the list of projects.</SheetDescription>
 *     </SheetHeader>
 *     <div className="px-5">…</div>
 *     <SheetFooter>
 *       <SheetClose asChild><Button>Show results</Button></SheetClose>
 *     </SheetFooter>
 *   </SheetContent>
 * </Sheet>
 */
import { Dialog as SheetPrimitive } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export const sheetVariants = cva(
  "fixed z-50 flex flex-col overflow-y-auto border-border bg-card text-card-foreground ease-out animation-duration-(--duration-base) data-[state=closed]:animate-out data-[state=open]:animate-in motion-reduce:animate-none!",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 max-h-[calc(100dvh-3rem)] rounded-b-surface border-b slide-in-from-top slide-out-to-top",
        bottom:
          "inset-x-0 bottom-0 max-h-[calc(100dvh-3rem)] rounded-t-surface border-t pb-[env(safe-area-inset-bottom)] slide-in-from-bottom slide-out-to-bottom",
        start: "inset-y-0 start-0 max-h-dvh w-[calc(100%-3rem)] max-w-sm border-e slide-in-from-start slide-out-to-start",
        end: "inset-y-0 end-0 max-h-dvh w-[calc(100%-3rem)] max-w-sm border-s slide-in-from-end slide-out-to-end",
        left: "inset-y-0 left-0 max-h-dvh w-[calc(100%-3rem)] max-w-sm border-r slide-in-from-left slide-out-to-left",
        right: "inset-y-0 right-0 max-h-dvh w-[calc(100%-3rem)] max-w-sm border-l slide-in-from-right slide-out-to-right",
      },
    },
    defaultVariants: { side: "end" },
  },
);

export type SheetSide = NonNullable<VariantProps<typeof sheetVariants>["side"]>;

export function Sheet(props: ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root {...props} />;
}

export function SheetTrigger(props: ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

export function SheetClose(props: ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

export function SheetOverlay({ className, ...props }: ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-overlay ease-out animation-duration-(--duration-base) fade-in-0 fade-out-0 data-[state=closed]:animate-out data-[state=open]:animate-in motion-reduce:animate-none!",
        className,
      )}
      {...props}
    />
  );
}

export type SheetContentProps = ComponentProps<typeof SheetPrimitive.Content> & {
  /** The edge it slides from. "start" and "end" follow the reading direction. */
  side?: SheetSide;
  /** The close button in the top corner. Turn it off only when the content has its own way out. */
  showCloseButton?: boolean;
  /** The close button's accessible name. Translate it with the rest of the interface. */
  closeLabel?: string;
};

/** The panel, with its portal and overlay. Never larger than the viewport: it scrolls inside. */
export function SheetContent({ className, children, side = "end", showCloseButton = true, closeLabel = "Close", ...props }: SheetContentProps) {
  return (
    <SheetPrimitive.Portal>
      <SheetOverlay />
      <SheetPrimitive.Content data-slot="sheet-content" data-side={side} className={cn(sheetVariants({ side }), className)} {...props}>
        {children}
        {showCloseButton ? (
          <SheetPrimitive.Close
            data-slot="sheet-close-button"
            aria-label={closeLabel}
            className="absolute end-2 top-2 inline-flex size-(--control-h) items-center justify-center rounded-control text-muted-foreground transition-[background-color,color] duration-instant ease-out hover:bg-accent hover:text-foreground motion-reduce:transition-none"
          >
            <X aria-hidden="true" strokeWidth={1.5} className="size-4" />
          </SheetPrimitive.Close>
        ) : null}
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

/** Leaves room at the end for the close button. */
export function SheetHeader({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="sheet-header" className={cn("flex flex-col gap-1.5 p-5 pe-14 text-start", className)} {...props} />;
}

export function SheetTitle({ className, ...props }: ComponentProps<typeof SheetPrimitive.Title>) {
  return <SheetPrimitive.Title data-slot="sheet-title" className={cn("text-base font-medium leading-tight", className)} {...props} />;
}

export function SheetDescription({ className, ...props }: ComponentProps<typeof SheetPrimitive.Description>) {
  return <SheetPrimitive.Description data-slot="sheet-description" className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

/** Sits at the bottom of the panel when the content is shorter than it. */
export function SheetFooter({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="sheet-footer" className={cn("mt-auto flex flex-col gap-2 p-5", className)} {...props} />;
}
