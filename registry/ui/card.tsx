/**
 * @name card
 * @category ui
 * @description A flat surface with a hairline edge, and parts for a header, title, description, content and footer.
 * @when Grouping related content: a plan, a stat, a form section. For a grid of unequal cards use bento-grid.
 * @example
 * <Card>
 *   <CardHeader>
 *     <CardTitle>Usage</CardTitle>
 *     <CardDescription>This month</CardDescription>
 *   </CardHeader>
 *   <CardContent>1,204 requests</CardContent>
 *   <CardFooter><Button size="sm">Details</Button></CardFooter>
 * </Card>
 */
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="card" className={cn("flex flex-col rounded-surface border bg-card text-card-foreground", className)} {...props} />;
}

export function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="card-header" className={cn("flex flex-col gap-1 p-5", className)} {...props} />;
}

/** Renders an h3. Pass `asChild`-free: change the level by using your own heading with these classes if needed. */
export function CardTitle({ className, ...props }: ComponentProps<"h3">) {
  return <h3 data-slot="card-title" className={cn("text-base font-medium leading-tight", className)} {...props} />;
}

export function CardDescription({ className, ...props }: ComponentProps<"p">) {
  return <p data-slot="card-description" className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

export function CardContent({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn("p-5 pt-0 first:pt-5", className)} {...props} />;
}

export function CardFooter({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="card-footer" className={cn("mt-auto flex items-center gap-2 border-t p-5", className)} {...props} />;
}
