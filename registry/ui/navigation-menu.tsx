"use client";
/**
 * @name navigation-menu
 * @category ui
 * @description A site's main links where some open a panel of further links (a mega menu): the panel opens on hover or on Enter, and the arrow keys move between the top links, to the Radix navigation pattern.
 * @when A site with sections that each hold several pages. For a few plain links use navbar (which also folds them into a sheet on phones); for commands use menubar or dropdown-menu. Below `md`, put the same links in navbar's sheet.
 * @example
 * <NavigationMenu aria-label="Main">
 *   <NavigationMenuList>
 *     <NavigationMenuItem>
 *       <NavigationMenuTrigger>Products</NavigationMenuTrigger>
 *       <NavigationMenuContent>
 *         <NavigationMenuLink href="/maps">Maps</NavigationMenuLink>
 *         <NavigationMenuLink href="/charts">Charts</NavigationMenuLink>
 *       </NavigationMenuContent>
 *     </NavigationMenuItem>
 *     <NavigationMenuItem><NavigationMenuLink href="/pricing">Pricing</NavigationMenuLink></NavigationMenuItem>
 *   </NavigationMenuList>
 * </NavigationMenu>
 */
import { NavigationMenu as NavigationMenuPrimitive } from "radix-ui";
import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/** The navigation landmark. Give it an `aria-label` when the page has more than one. */
export function NavigationMenu({ className, children, ...props }: ComponentProps<typeof NavigationMenuPrimitive.Root>) {
  return (
    <NavigationMenuPrimitive.Root data-slot="navigation-menu" className={cn("relative z-30 flex max-w-max flex-1 items-center", className)} {...props}>
      {children}
      <div className="absolute start-0 top-full flex justify-center">
        <NavigationMenuPrimitive.Viewport
          data-slot="navigation-menu-viewport"
          className="relative mt-1.5 h-(--radix-navigation-menu-viewport-height) w-[min(var(--radix-navigation-menu-viewport-width),calc(100vw-2rem))] overflow-hidden rounded-surface border bg-popover text-popover-foreground ease-out animation-duration-(--duration-base) data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-reduce:animate-none!"
        />
      </div>
    </NavigationMenuPrimitive.Root>
  );
}

export function NavigationMenuList({ className, ...props }: ComponentProps<typeof NavigationMenuPrimitive.List>) {
  return <NavigationMenuPrimitive.List data-slot="navigation-menu-list" className={cn("flex flex-1 list-none items-center gap-1", className)} {...props} />;
}

export function NavigationMenuItem(props: ComponentProps<typeof NavigationMenuPrimitive.Item>) {
  return <NavigationMenuPrimitive.Item data-slot="navigation-menu-item" {...props} />;
}

const topLink = "inline-flex h-control items-center gap-1 rounded-control px-3 text-sm font-medium hover:bg-accent data-[state=open]:bg-accent data-active:underline data-active:underline-offset-4";

export function NavigationMenuTrigger({ className, children, ...props }: ComponentProps<typeof NavigationMenuPrimitive.Trigger>) {
  return (
    <NavigationMenuPrimitive.Trigger data-slot="navigation-menu-trigger" className={cn(topLink, "group/nav", className)} {...props}>
      {children}
      <ChevronDown aria-hidden="true" className="size-3.5 transition-transform duration-base ease-out group-data-[state=open]/nav:rotate-180 motion-reduce:transition-none" />
    </NavigationMenuPrimitive.Trigger>
  );
}

/** A panel of links. It lays its links in one column, two from `sm`: pass your own layout as children. */
export function NavigationMenuContent({ className, ...props }: ComponentProps<typeof NavigationMenuPrimitive.Content>) {
  return <NavigationMenuPrimitive.Content data-slot="navigation-menu-content" className={cn("grid w-max max-w-[calc(100vw-2rem)] gap-1 p-2 sm:grid-cols-2", className)} {...props} />;
}

/** A link: a top link, or one in a panel. Mark the page one is on with `active`. */
export function NavigationMenuLink({ className, active, ...props }: ComponentProps<typeof NavigationMenuPrimitive.Link>) {
  return (
    <NavigationMenuPrimitive.Link
      data-slot="navigation-menu-link"
      active={active}
      aria-current={active ? "page" : undefined}
      className={cn("flex min-h-10 flex-col justify-center gap-0.5 rounded-control px-3 py-2 text-sm hover:bg-accent focus-visible:bg-accent data-active:font-medium", className)}
      {...props}
    />
  );
}
