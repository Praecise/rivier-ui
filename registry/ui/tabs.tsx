"use client";
/**
 * @name tabs
 * @category ui
 * @description Panels that share one place, switched by a row of tabs. Two looks: an underline, or a segmented pill.
 * @when Views of the same thing that people switch between without leaving the page. `variant="underline"` (the default) for sections of a page; `variant="pill"` for a compact switch between two to four views. For moving between pages use links (navbar, breadcrumb); for stacked sections that can be open together use accordion.
 * @example
 * <Tabs defaultValue="overview">
 *   <TabsList aria-label="Project">
 *     <TabsTrigger value="overview">Overview</TabsTrigger>
 *     <TabsTrigger value="activity">Activity</TabsTrigger>
 *   </TabsList>
 *   <TabsContent value="overview">The overview.</TabsContent>
 *   <TabsContent value="activity">The activity.</TabsContent>
 * </Tabs>
 *
 * <Tabs defaultValue="month">
 *   <TabsList variant="pill" aria-label="Billing period">
 *     <TabsTrigger value="month">Monthly</TabsTrigger>
 *     <TabsTrigger value="year">Yearly</TabsTrigger>
 *   </TabsList>
 *   <TabsContent value="month">Billed every month.</TabsContent>
 *   <TabsContent value="year">Billed once a year.</TabsContent>
 * </Tabs>
 */
import { Tabs as TabsPrimitive } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function Tabs({ className, ...props }: ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn("flex flex-col gap-4", className)} {...props} />;
}

/* A long row scrolls sideways instead of wrapping or overflowing the page. */
export const tabsListVariants = cva("group/tabs-list flex max-w-full items-center overflow-x-auto", {
  variants: {
    variant: {
      underline: "gap-5 border-b",
      pill: "w-fit gap-1 rounded-control border bg-muted p-1",
    },
  },
  defaultVariants: { variant: "underline" },
});

export type TabsListProps = ComponentProps<typeof TabsPrimitive.List> & VariantProps<typeof tabsListVariants>;

/** The row of tabs. Its `variant` also styles the triggers inside it. */
export function TabsList({ className, variant, ...props }: TabsListProps) {
  return (
    <TabsPrimitive.List data-slot="tabs-list" data-variant={variant ?? "underline"} className={cn(tabsListVariants({ variant }), className)} {...props} />
  );
}

/* The focus ring is drawn inside the tab, because the scrolling row would clip it. The underline is always
   in the markup and only its opacity changes, so switching tabs never moves anything. */
export function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center gap-2 text-sm font-medium whitespace-nowrap text-muted-foreground transition-[background-color,border-color,color] duration-instant ease-out select-none -outline-offset-2 hover:text-foreground disabled:pointer-events-none disabled:opacity-50 data-[state=active]:text-foreground motion-reduce:transition-none [&_svg]:size-4 [&_svg]:shrink-0",
        "group-data-[variant=underline]/tabs-list:h-control group-data-[variant=underline]/tabs-list:px-1 group-data-[variant=underline]/tabs-list:after:absolute group-data-[variant=underline]/tabs-list:after:inset-x-0 group-data-[variant=underline]/tabs-list:after:bottom-0 group-data-[variant=underline]/tabs-list:after:h-0.5 group-data-[variant=underline]/tabs-list:after:bg-primary group-data-[variant=underline]/tabs-list:after:opacity-0 group-data-[variant=underline]/tabs-list:after:transition-opacity group-data-[variant=underline]/tabs-list:after:duration-base group-data-[variant=underline]/tabs-list:after:ease-out group-data-[variant=underline]/tabs-list:data-[state=active]:after:opacity-100 motion-reduce:after:transition-none",
        "group-data-[variant=pill]/tabs-list:h-control-sm group-data-[variant=pill]/tabs-list:flex-1 group-data-[variant=pill]/tabs-list:rounded-control group-data-[variant=pill]/tabs-list:border group-data-[variant=pill]/tabs-list:border-transparent group-data-[variant=pill]/tabs-list:px-3 group-data-[variant=pill]/tabs-list:data-[state=active]:border-border group-data-[variant=pill]/tabs-list:data-[state=active]:bg-background group-data-[variant=pill]/tabs-list:pointer-coarse:h-control",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn("text-base", className)} {...props} />;
}
