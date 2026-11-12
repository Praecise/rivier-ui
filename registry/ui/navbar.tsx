"use client";
/**
 * @name navbar
 * @category ui
 * @description A responsive site header: a brand, a row of links and a slot for actions. Below `md` the links move into a menu button that opens them in a sheet.
 * @when The top of a site or app with up to about seven top-level links. The links are written once, as NavbarLink children, and shown in the bar or in the sheet. The sheet closes when a link in it is followed, and focus returns to the menu button. Mark the current page with `current`. With a router link, pass it through `asChild`. For navigation inside a page use tabs; for the path to a page use breadcrumb.
 * @example
 * <Navbar
 *   brand={<a href="/" className="text-base font-medium">Rivier</a>}
 *   actions={<Button size="sm" asChild><a href="/contact">Contact</a></Button>}
 * >
 *   <NavbarLink href="/work" current>Work</NavbarLink>
 *   <NavbarLink href="/studio">Studio</NavbarLink>
 *   <NavbarLink href="/about">About</NavbarLink>
 * </Navbar>
 */
import { Slot } from "radix-ui";
import { Menu } from "lucide-react";
import { useEffect, useState, type ComponentProps, type MouseEvent, type ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, type SheetSide } from "@/components/ui/sheet";
import { cn } from "@/lib/cn";

export type NavbarProps = Omit<ComponentProps<"header">, "children"> & {
  /** The logo or name, usually a link to the home page. */
  brand?: ReactNode;
  /** Buttons at the end of the bar. They stay in the bar on phones, so keep them few and short. */
  actions?: ReactNode;
  /** The links: NavbarLink elements. Rendered in the bar from `md`, and in the sheet below it. */
  children?: ReactNode;
  /** Accessible name of the navigation. */
  label?: string;
  /** The title shown at the top of the menu sheet. */
  menuTitle?: string;
  /** Accessible name of the menu button. */
  menuLabel?: string;
  /** The edge the menu sheet opens from. "bottom" is within reach of the thumb on phones. */
  menuSide?: SheetSide;
};

export function Navbar({ className, brand, actions, children, label = "Main", menuTitle = "Menu", menuLabel = "Open menu", menuSide = "bottom", ...props }: NavbarProps) {
  const [open, setOpen] = useState(false);

  // The menu button disappears at `md`: close the sheet if the window grows past it while open.
  useEffect(() => {
    if (!open) return;
    const wide = window.matchMedia("(min-width: 48rem)");
    const close = (): void => {
      if (wide.matches) setOpen(false);
    };
    close();
    wide.addEventListener("change", close);
    return () => wide.removeEventListener("change", close);
  }, [open]);

  // Following a link closes the sheet; Radix then returns focus to the menu button.
  const closeOnNavigation = (event: MouseEvent<HTMLElement>): void => {
    if (event.target instanceof Element && event.target.closest("a[href]")) setOpen(false);
  };

  return (
    <header data-slot="navbar" className={cn("w-full border-b bg-background text-foreground", className)} {...props}>
      <div className="mx-auto flex h-14 w-full max-w-page items-center gap-2 px-4 md:gap-6 md:px-6">
        {brand ? (
          <div data-slot="navbar-brand" className="flex min-w-0 shrink-0 items-center">
            {brand}
          </div>
        ) : null}
        <nav data-slot="navbar-links" aria-label={label} className="hidden min-w-0 items-center gap-1 md:flex">
          {children}
        </nav>
        <div data-slot="navbar-actions" className="ms-auto flex items-center gap-2">
          {actions}
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger data-slot="navbar-menu-button" aria-label={menuLabel} className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "md:hidden")}>
            <Menu aria-hidden="true" strokeWidth={1.5} />
          </SheetTrigger>
          <SheetContent side={menuSide} aria-describedby={undefined}>
            <SheetHeader>
              <SheetTitle>{menuTitle}</SheetTitle>
            </SheetHeader>
            <nav data-slot="navbar-menu" aria-label={label} onClick={closeOnNavigation} className="flex flex-col gap-1 px-3 pb-5">
              {children}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

export type NavbarLinkProps = ComponentProps<"a"> & {
  /** The page being shown: emphasised, and marked `aria-current="page"`. */
  current?: boolean;
  /** Render the child element (a router link, for example) with the link's look. */
  asChild?: boolean;
};

/** A link in the bar; a full-width row, 44px tall, when it is in the menu sheet. */
export function NavbarLink({ className, current = false, asChild = false, ...props }: NavbarLinkProps) {
  const Comp = asChild ? Slot.Root : "a";
  return (
    <Comp
      data-slot="navbar-link"
      aria-current={current ? "page" : undefined}
      className={cn(
        "inline-flex h-control shrink-0 items-center rounded-control px-3 text-sm font-medium whitespace-nowrap text-muted-foreground transition-[background-color,color] duration-instant ease-out hover:bg-accent hover:text-foreground aria-[current=page]:text-foreground motion-reduce:transition-none in-data-[slot=navbar-menu]:h-control-lg in-data-[slot=navbar-menu]:w-full in-data-[slot=navbar-menu]:text-base",
        className,
      )}
      {...props}
    />
  );
}
