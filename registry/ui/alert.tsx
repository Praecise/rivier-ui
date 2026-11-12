/**
 * @name alert
 * @category ui
 * @description A message in the page with an icon, a title, a description and an optional action. Four variants: info, success, warning, destructive.
 * @when Telling the reader something about the page or the result of an action, in place. For a message that appears and leaves use a toast; for one that needs an answer use a dialog.
 * @example
 * <Alert variant="success">
 *   <AlertTitle>Payment received</AlertTitle>
 *   <AlertDescription>A receipt is on its way to your inbox.</AlertDescription>
 * </Alert>
 * <Alert variant="destructive">
 *   <AlertTitle>The card was declined</AlertTitle>
 *   <AlertDescription>Check the number and the expiry date, then try again.</AlertDescription>
 *   <AlertAction><Button size="sm" variant="outline">Try again</Button></AlertAction>
 * </Alert>
 */
import { cva, type VariantProps } from "class-variance-authority";
import { CircleCheck, CircleExclamationPoint, Info, TriangleExclamationPoint } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export const alertVariants = cva("flex w-full items-start gap-3 rounded-surface border bg-card p-4 text-sm text-card-foreground [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0", {
  variants: {
    variant: {
      info: "[&>svg]:text-foreground",
      success: "border-success [&>svg]:text-success",
      warning: "border-warning [&>svg]:text-warning",
      destructive: "border-destructive [&>svg]:text-destructive",
    },
  },
  defaultVariants: { variant: "info" },
});

type AlertVariant = NonNullable<VariantProps<typeof alertVariants>["variant"]>;

const ICONS: Record<AlertVariant, typeof Info> = {
  info: Info,
  success: CircleCheck,
  warning: TriangleExclamationPoint,
  destructive: CircleExclamationPoint,
};

export type AlertProps = ComponentProps<"div"> &
  VariantProps<typeof alertVariants> & {
    /** Replaces the variant's icon. Pass `null` for no icon. */
    icon?: ReactNode;
    /** Interrupts a screen reader at once (`role="alert"`). On by default for "destructive" only; everything else is announced politely (`role="status"`). */
    urgent?: boolean;
  };

export function Alert({ className, variant, icon, urgent, children, ...props }: AlertProps) {
  const kind: AlertVariant = variant ?? "info";
  const Icon = ICONS[kind];
  const interrupts = urgent ?? kind === "destructive";
  return (
    <div data-slot="alert" data-variant={kind} role={interrupts ? "alert" : "status"} className={cn(alertVariants({ variant: kind }), className)} {...props}>
      {icon === undefined ? <Icon aria-hidden="true" strokeWidth={1.5} /> : icon}
      <div data-slot="alert-content" className="flex min-w-0 flex-1 flex-col gap-1">
        {children}
      </div>
    </div>
  );
}

/** A div, not a heading: an alert can appear anywhere, so it must not change the page outline. */
export function AlertTitle({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="alert-title" className={cn("font-medium leading-snug", className)} {...props} />;
}

export function AlertDescription({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="alert-description" className={cn("text-muted-foreground [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4", className)} {...props} />;
}

/** A row for one or two small buttons under the text. */
export function AlertAction({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="alert-action" className={cn("mt-2 flex flex-wrap items-center gap-2", className)} {...props} />;
}
