"use client";
/**
 * @name sidebar
 * @category ui
 * @description An application's side navigation: groups of links with icons that fold to a slim rail of icons (their names still read out) and back with a button or Ctrl/⌘+B, and that becomes a sheet from the side on narrow screens; with the main area beside it.
 * @when The frame of an app with many sections: a dashboard, settings, a workspace. For a site's header links use navbar; for a panel of tools the person resizes use dock or resizable.
 * @example
 * <SidebarProvider>
 *   <Sidebar aria-label="Workspace">
 *     <SidebarHeader>Acme</SidebarHeader>
 *     <SidebarContent>
 *       <SidebarGroup label="Work">
 *         <SidebarMenu>
 *           <SidebarMenuItem><SidebarMenuButton href="/inbox" icon={<Inbox />} current>Inbox</SidebarMenuButton></SidebarMenuItem>
 *           <SidebarMenuItem><SidebarMenuButton href="/reports" icon={<ChartBar />}>Reports</SidebarMenuButton></SidebarMenuItem>
 *         </SidebarMenu>
 *       </SidebarGroup>
 *     </SidebarContent>
 *   </Sidebar>
 *   <SidebarInset>
 *     <SidebarTrigger />
 *     …
 *   </SidebarInset>
 * </SidebarProvider>
 */
import { PanelLeft } from "lucide-react";
import { createContext, use, useId, useSyncExternalStore, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useControllableState } from "@/lib/use-controllable-state";
import { useHotkeys } from "@/lib/use-hotkeys";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

type SidebarContextValue = {
  id: string;
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  narrow: boolean;
  labels: SidebarLabels;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

/** The sidebar's state, for a part of the project's own: whether it is open, and the narrow-screen sheet. */
export function useSidebar(): SidebarContextValue {
  const context = use(SidebarContext);
  if (!context) throw new Error("Sidebar parts must be inside a SidebarProvider.");
  return context;
}

export type SidebarLabels = { show: string; hide: string; title: string };
const LABELS: SidebarLabels = { show: "Show the sidebar", hide: "Fold the sidebar", title: "Navigation" };

const NARROW = "(max-width: 767.98px)";
const subscribeNarrow = (change: () => void): (() => void) => {
  const query = window.matchMedia(NARROW);
  query.addEventListener("change", change);
  return () => query.removeEventListener("change", change);
};

export type SidebarProviderProps = ComponentProps<"div"> & {
  /** Wide, with names, or folded to icons (on wide screens). Controlled with `onOpenChange`. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The shortcut that folds and unfolds it. Default "mod+b"; null for none. */
  shortcut?: string | null;
  labels?: Partial<SidebarLabels>;
};

export function SidebarProvider({ open: openProp, defaultOpen = true, onOpenChange, shortcut = "mod+b", labels: given, className, style, ...props }: SidebarProviderProps) {
  const [open, setOpen] = useControllableState<boolean>({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });
  const [openMobile, setOpenMobile] = useControllableState<boolean>({ defaultValue: false });
  const narrow = useSyncExternalStore(
    subscribeNarrow,
    () => window.matchMedia(NARROW).matches,
    () => false,
  );
  const id = useId();
  useHotkeys(shortcut ?? "", () => (narrow ? setOpenMobile(!openMobile) : setOpen(!open)), { enabled: shortcut !== null });
  return (
    <SidebarContext value={{ id, open, setOpen, openMobile, setOpenMobile, narrow, labels: { ...LABELS, ...given } }}>
      <div
        data-slot="sidebar-provider"
        data-state={open ? "open" : "folded"}
        className={cn("group/sidebar flex min-h-0 w-full", className)}
        style={{ ["--sidebar-w" as string]: "16rem", ["--sidebar-rail" as string]: "3.5rem", ...style }}
        {...props}
      />
    </SidebarContext>
  );
}

export type SidebarProps = Omit<ComponentProps<"nav">, "children"> & { children?: ReactNode };

/** The sidebar: a navigation landmark (name it with `aria-label`). On narrow screens it is a sheet opened by SidebarTrigger. */
export function Sidebar({ className, children, ...props }: SidebarProps) {
  const { id, open, narrow, openMobile, setOpenMobile, labels } = useSidebar();
  if (narrow) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent side="start" className="w-(--sidebar-w) max-w-[85vw] p-0">
          <SheetTitle className="sr-only">{labels.title}</SheetTitle>
          <nav id={id} data-slot="sidebar" data-state="open" className={cn("flex h-full flex-col", className)} {...props}>
            {children}
          </nav>
        </SheetContent>
      </Sheet>
    );
  }
  return (
    <nav
      id={id}
      data-slot="sidebar"
      data-state={open ? "open" : "folded"}
      className={cn("sticky top-0 flex h-full max-h-dvh shrink-0 flex-col overflow-hidden border-e bg-card text-card-foreground", open ? "w-(--sidebar-w)" : "w-(--sidebar-rail)", className)}
      {...props}
    >
      {children}
    </nav>
  );
}

export function SidebarHeader({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="sidebar-header" className={cn("flex min-h-14 items-center gap-2 border-b px-3 font-medium group-data-[state=folded]/sidebar:justify-center", className)} {...props} />;
}

export function SidebarContent({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="sidebar-content" className={cn("flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-2", className)} {...props} />;
}

export function SidebarFooter({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="sidebar-footer" className={cn("mt-auto border-t p-2", className)} {...props} />;
}

/** A group of links under a small heading. The heading is hidden while folded, but still names the group. */
export function SidebarGroup({ label, className, children, ...props }: ComponentProps<"div"> & { label?: string }) {
  const headingId = useId();
  return (
    <div data-slot="sidebar-group" role="group" aria-labelledby={label ? headingId : undefined} className={cn("flex flex-col gap-1", className)} {...props}>
      {label ? (
        <span id={headingId} className="px-2 text-xs font-medium text-muted-foreground group-data-[state=folded]/sidebar:sr-only">
          {label}
        </span>
      ) : null}
      {children}
    </div>
  );
}

export function SidebarMenu({ className, ...props }: ComponentProps<"ul">) {
  return <ul data-slot="sidebar-menu" className={cn("flex flex-col gap-0.5", className)} {...props} />;
}

export function SidebarMenuItem({ className, ...props }: ComponentProps<"li">) {
  return <li data-slot="sidebar-menu-item" className={cn("min-w-0", className)} {...props} />;
}

export type SidebarMenuButtonProps = Omit<ComponentProps<"a">, "children"> & {
  icon?: ReactNode;
  /** The page one is on: marked with aria-current and a stronger ground, not by colour alone. */
  current?: boolean;
  /** What it is called. Hidden while folded, but still its name. */
  children: ReactNode;
  /** A count or a state at the end, such as unread items. */
  badge?: ReactNode;
};

/** A link in the sidebar. Use `href`; for an action, put a button of your own with the same classes in the item. */
export function SidebarMenuButton({ icon, current = false, badge, className, children, ...props }: SidebarMenuButtonProps) {
  return (
    <a
      data-slot="sidebar-menu-button"
      aria-current={current ? "page" : undefined}
      className={cn(
        "flex min-h-10 items-center gap-3 rounded-control px-2 text-sm hover:bg-accent aria-[current=page]:bg-highlight-soft aria-[current=page]:font-medium group-data-[state=folded]/sidebar:justify-center [&>svg]:size-4 [&>svg]:shrink-0",
        className,
      )}
      {...props}
    >
      {icon ? (
        <span aria-hidden="true" className="flex size-4 shrink-0 items-center justify-center [&>svg]:size-4">
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1 truncate group-data-[state=folded]/sidebar:sr-only">{children}</span>
      {badge ? <span className="ms-auto text-xs tabular-nums text-muted-foreground group-data-[state=folded]/sidebar:sr-only">{badge}</span> : null}
    </a>
  );
}

/** The main area beside the sidebar. */
export function SidebarInset({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="sidebar-inset" className={cn("flex min-w-0 flex-1 flex-col", className)} {...props} />;
}

/** The button that folds and unfolds the sidebar, or opens its sheet on narrow screens. */
export function SidebarTrigger({ className, onClick, ...props }: Omit<ComponentProps<"button">, "children">) {
  const { id, open, setOpen, narrow, openMobile, setOpenMobile, labels } = useSidebar();
  const expanded = narrow ? openMobile : open;
  return (
    <button
      type="button"
      data-slot="sidebar-trigger"
      aria-controls={id}
      aria-expanded={expanded}
      aria-label={expanded ? labels.hide : labels.show}
      onClick={(event) => {
        onClick?.(event);
        if (narrow) setOpenMobile(!openMobile);
        else setOpen(!open);
      }}
      className={cn("inline-flex size-(--control-h) items-center justify-center rounded-control hover:bg-accent", className)}
      {...props}
    >
      <PanelLeft aria-hidden="true" className="size-4 rtl:-scale-x-100" />
    </button>
  );
}
