"use client";
// Site: the small client parts every page shares: the main region, a copy button, the mode switch, the sidebar.

import { Check, ChevronDown, Copy, Moon, Sun } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type ComponentProps, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DirectionProvider, type Direction } from "@/components/ui/direction-provider";
import { useTheme } from "@/components/ui/theme-provider";
import { announce } from "@/lib/announce";
import { cn } from "@/lib/cn";

const subscribe = (): (() => void) => () => {};

/** Whether the page has hydrated. False on the server and in the first render. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

const asked = (): Direction => (new URLSearchParams(window.location.search).get("dir") === "rtl" ? "rtl" : "ltr");
const leftToRight = (): Direction => "ltr";

/**
 * The page's main region. Any page can be read right-to-left by adding ?dir=rtl to its address, as the
 * showcase pages can. It marks the page ready for the browser checks once it has hydrated.
 */
export function Main({ className, children, ...props }: ComponentProps<"main">) {
  const hydrated = useHydrated();
  const dir = useSyncExternalStore(subscribe, asked, leftToRight);
  // <html> carries the direction too, so that the header and portalled content (menus, dialogs) follow it.
  useEffect(() => {
    const before = document.documentElement.dir;
    document.documentElement.dir = dir;
    return () => {
      document.documentElement.dir = before;
    };
  }, [dir]);
  return (
    <DirectionProvider dir={dir}>
      <main id="main" tabIndex={-1} data-lab-ready={hydrated ? "" : undefined} className={cn("isolate overflow-x-clip", className)} {...props}>
        {children}
      </main>
    </DirectionProvider>
  );
}

export type CopyButtonProps = Omit<ComponentProps<typeof Button>, "children" | "onClick"> & {
  /** What goes to the clipboard. */
  text: string;
  /** What the button is called, and what is announced once it has copied. */
  label?: string;
  copied?: string;
  /** Words beside the icon. Without them the button is an icon. */
  children?: ReactNode;
};

export function CopyButton({ text, label = "Copy", copied = "Copied", children, variant = "ghost", size, className, ...props }: CopyButtonProps) {
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);
  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      announce("Copying is not allowed here", "assertive");
      return;
    }
    setDone(true);
    announce(copied);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setDone(false), 1600);
  };
  const Icon = done ? Check : Copy;
  return (
    <Button
      type="button"
      data-slot="copy-button"
      data-copied={done ? "" : undefined}
      variant={variant}
      size={size ?? (children ? "sm" : "icon")}
      aria-label={children ? undefined : label}
      onClick={() => void copy()}
      className={className}
      {...props}
    >
      <Icon aria-hidden="true" strokeWidth={1.5} />
      {children ? (done ? copied : children) : null}
    </Button>
  );
}

/** Light or dark, in one press. The page keeps following the device until it is pressed. */
export function ModeSwitch() {
  const { resolvedMode, setTheme } = useTheme();
  const hydrated = useHydrated();
  const dark = hydrated && resolvedMode === "dark";
  return (
    <Button
      type="button"
      data-slot="mode-switch"
      variant="ghost"
      size="icon"
      aria-label={dark ? "Switch to light" : "Switch to dark"}
      onClick={() => setTheme({ mode: dark ? "light" : "dark" })}
    >
      {dark ? <Sun aria-hidden="true" strokeWidth={1.5} /> : <Moon aria-hidden="true" strokeWidth={1.5} />}
    </Button>
  );
}

export type SidebarGroup = { title: string; links: { href: string; title: string }[] };

function SidebarLinks({ groups, pathname }: { groups: SidebarGroup[]; pathname: string }) {
  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <div key={group.title}>
          <p className="px-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">{group.title}</p>
          <ul className="mt-2 flex flex-col">
            {group.links.map((link) => {
              const current = link.href === pathname;
              return (
                <li key={link.href}>
                  <a
                    href={link.href}
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "flex min-h-9 items-center rounded-control px-3 text-sm text-muted-foreground transition-colors duration-instant ease-out hover:bg-accent hover:text-foreground motion-reduce:transition-none pointer-coarse:min-h-10",
                      current && "bg-highlight-soft font-medium text-foreground",
                    )}
                  >
                    {link.title}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** The section's pages: a column beside the text from `lg`, a section that opens above it below that. */
export function Sidebar({ groups, label, menuLabel = "Pages in this section" }: { groups: SidebarGroup[]; label: string; menuLabel?: string }) {
  const pathname = usePathname();
  const column = useRef<HTMLElement>(null);
  // A long list opens with the page being read in view, without moving the page itself.
  useEffect(() => {
    const nav = column.current;
    const current = nav?.querySelector<HTMLElement>("[aria-current=page]");
    if (nav && current) nav.scrollTop = current.offsetTop - nav.clientHeight / 2;
  }, [pathname]);
  return (
    <>
      <nav ref={column} aria-label={label} data-slot="sidebar" className="sticky top-20 hidden max-h-[calc(100dvh-6rem)] w-60 shrink-0 overflow-y-auto pe-2 pb-10 lg:block">
        <SidebarLinks groups={groups} pathname={pathname} />
      </nav>
      <Collapsible className="lg:hidden">
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="group w-full justify-between">
            {menuLabel}
            <ChevronDown aria-hidden="true" strokeWidth={1.5} className="transition-transform duration-base ease-out group-data-[state=open]:rotate-180 motion-reduce:transition-none" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <nav aria-label={label} className="mt-3 rounded-surface border p-3">
            <SidebarLinks groups={groups} pathname={pathname} />
          </nav>
        </CollapsibleContent>
      </Collapsible>
    </>
  );
}
