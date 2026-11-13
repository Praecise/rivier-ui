"use client";
/**
 * @name alert-dialog
 * @category ui
 * @description A modal question that must be answered before anything else: a title, what will happen, and two buttons, with focus starting on the safe one and Escape choosing it. It cannot be dismissed by clicking outside.
 * @when Confirming something that cannot be undone or costs something: deleting, leaving with unsaved work, paying. For a window of content use dialog; for a change that can be undone, do it and offer undo-line instead of asking.
 * @example
 * <AlertDialog>
 *   <AlertDialogTrigger asChild><Button variant="destructive">Delete the project</Button></AlertDialogTrigger>
 *   <AlertDialogContent>
 *     <AlertDialogHeader>
 *       <AlertDialogTitle>Delete the project?</AlertDialogTitle>
 *       <AlertDialogDescription>Its 14 files are deleted for everyone. This cannot be undone.</AlertDialogDescription>
 *     </AlertDialogHeader>
 *     <AlertDialogFooter>
 *       <AlertDialogCancel>Keep it</AlertDialogCancel>
 *       <AlertDialogAction variant="destructive" onClick={remove}>Delete</AlertDialogAction>
 *     </AlertDialogFooter>
 *   </AlertDialogContent>
 * </AlertDialog>
 */
import { AlertDialog as AlertDialogPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import type { VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";
import { buttonVariants } from "@/components/ui/button";

export function AlertDialog(props: ComponentProps<typeof AlertDialogPrimitive.Root>) {
  return <AlertDialogPrimitive.Root {...props} />;
}

export function AlertDialogTrigger(props: ComponentProps<typeof AlertDialogPrimitive.Trigger>) {
  return <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />;
}

/** The question, with its portal and overlay. Never taller or wider than the viewport. */
export function AlertDialogContent({ className, ...props }: ComponentProps<typeof AlertDialogPrimitive.Content>) {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Overlay
        data-slot="alert-dialog-overlay"
        className="fixed inset-0 z-50 bg-overlay ease-out animation-duration-(--duration-base) fade-in-0 fade-out-0 data-[state=closed]:animate-out data-[state=open]:animate-in motion-reduce:animate-none!"
      />
      <AlertDialogPrimitive.Content
        data-slot="alert-dialog-content"
        className={cn(
          "fixed inset-0 z-50 m-auto flex h-fit max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md flex-col gap-4 overflow-y-auto rounded-surface border bg-card p-6 text-card-foreground ease-out animation-duration-(--duration-base) fade-in-0 fade-out-0 zoom-in-95 zoom-out-95 data-[state=closed]:animate-out data-[state=open]:animate-in motion-reduce:animate-none!",
          className,
        )}
        {...props}
      />
    </AlertDialogPrimitive.Portal>
  );
}

export function AlertDialogHeader({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="alert-dialog-header" className={cn("flex flex-col gap-1.5 text-start", className)} {...props} />;
}

export function AlertDialogTitle({ className, ...props }: ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return <AlertDialogPrimitive.Title data-slot="alert-dialog-title" className={cn("text-base font-medium leading-tight", className)} {...props} />;
}

export function AlertDialogDescription({ className, ...props }: ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return <AlertDialogPrimitive.Description data-slot="alert-dialog-description" className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

/** The two answers: stacked on phones with the main one first, in a row at the end from `sm`. */
export function AlertDialogFooter({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="alert-dialog-footer" className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />;
}

/** The answer that does the thing. Name it after what it does ("Delete"), not "OK". */
export function AlertDialogAction({ className, variant = "solid", ...props }: ComponentProps<typeof AlertDialogPrimitive.Action> & Pick<VariantProps<typeof buttonVariants>, "variant">) {
  return <AlertDialogPrimitive.Action data-slot="alert-dialog-action" className={cn(buttonVariants({ variant }), className)} {...props} />;
}

/** The safe answer. It takes focus when the question opens, and Escape chooses it. */
export function AlertDialogCancel({ className, ...props }: ComponentProps<typeof AlertDialogPrimitive.Cancel>) {
  return <AlertDialogPrimitive.Cancel data-slot="alert-dialog-cancel" className={cn(buttonVariants({ variant: "outline" }), className)} {...props} />;
}
