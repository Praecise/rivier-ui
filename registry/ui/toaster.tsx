"use client";
/**
 * @name toaster
 * @category ui
 * @description The place where toasts appear: sonner's Toaster drawn with the theme's tokens, and its `toast` function.
 * @when Short confirmations and errors that need no decision ("Saved", "Could not connect"). Render one Toaster in the root layout, then call `toast` from anywhere on the client. For something that must be answered use dialog; for a message that belongs to a field or a section, show it there.
 * @example
 * // app/layout.tsx
 * <body>
 *   {children}
 *   <Toaster />
 * </body>
 *
 * // any client component
 * <Button onClick={() => toast.success("Saved", { description: "Your changes are live." })}>Save</Button>
 */
import { CircleCheck, Info, LoaderCircle, OctagonX, TriangleExclamationPoint, X } from "lucide-react";
import type { CSSProperties } from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import { cn } from "@/lib/cn";

export { toast } from "sonner";

/* Sonner reads its colours from these variables. Pointing them at the tokens makes toasts follow the theme
   (light, dark, highlight, roundness) wherever the Toaster sits, so sonner's own `theme` prop is not needed.
   --border-radius repeats the rounded-surface formula. The success, warning and error colours show with
   `richColors`; without it every toast is the plain surface with an icon. Sonner stops its own motion under
   reduced motion. */
const tokens = {
  "--normal-bg": "var(--popover)",
  "--normal-bg-hover": "var(--accent)",
  "--normal-text": "var(--popover-foreground)",
  "--normal-border": "var(--border)",
  "--normal-border-hover": "var(--border-strong)",
  "--success-bg": "var(--success)",
  "--success-text": "var(--success-foreground)",
  "--success-border": "var(--success)",
  "--warning-bg": "var(--warning)",
  "--warning-text": "var(--warning-foreground)",
  "--warning-border": "var(--warning)",
  "--error-bg": "var(--destructive)",
  "--error-text": "var(--destructive-foreground)",
  "--error-border": "var(--destructive)",
  "--info-bg": "var(--popover)",
  "--info-text": "var(--popover-foreground)",
  "--info-border": "var(--border-strong)",
  "--border-radius": "calc(var(--radius) * 1.5)",
} as CSSProperties;

/* Flat: sonner's shadow goes, and its shadow-drawn focus ring is replaced by the theme's outline. */
const toastClass = "shadow-none! focus-visible:outline-2! focus-visible:outline-offset-2! focus-visible:outline-ring!";

export function Toaster({ className, style, toastOptions, icons, ...props }: ToasterProps) {
  return (
    <Sonner
      className={className}
      style={{ ...tokens, ...style }}
      icons={{
        success: <CircleCheck aria-hidden="true" strokeWidth={1.5} className="size-4" />,
        info: <Info aria-hidden="true" strokeWidth={1.5} className="size-4" />,
        warning: <TriangleExclamationPoint aria-hidden="true" strokeWidth={1.5} className="size-4" />,
        error: <OctagonX aria-hidden="true" strokeWidth={1.5} className="size-4" />,
        loading: <LoaderCircle aria-hidden="true" strokeWidth={1.5} className="size-4 animate-spin motion-reduce:animate-none" />,
        close: <X aria-hidden="true" strokeWidth={1.5} className="size-3" />,
        ...icons,
      }}
      toastOptions={{
        ...toastOptions,
        classNames: {
          ...toastOptions?.classNames,
          toast: cn(toastClass, toastOptions?.classNames?.toast),
          description: cn("text-muted-foreground!", toastOptions?.classNames?.description),
          closeButton: cn(toastClass, toastOptions?.classNames?.closeButton),
        },
      }}
      {...props}
    />
  );
}
