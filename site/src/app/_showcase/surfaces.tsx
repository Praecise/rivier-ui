"use client";
// Showcase: surfaces and navigation that Radix gives the behaviour of, and the layout pieces around them.

import { Bold, ChartBar, Inbox, Italic, Minus, Plus, Settings, Underline } from "lucide-react";
import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ButtonGroup, ButtonGroupText } from "@/components/ui/button-group";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Kbd } from "@/components/ui/kbd";
import { Menubar, MenubarCheckboxItem, MenubarContent, MenubarItem, MenubarMenu, MenubarSeparator, MenubarShortcut, MenubarTrigger } from "@/components/ui/menubar";
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from "@/components/ui/navigation-menu";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Sidebar, SidebarContent, SidebarGroup, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { SkipLink } from "@/components/ui/skip-link";
import { Toolbar, ToolbarButton, ToolbarSeparator, ToolbarToggleGroup, ToolbarToggleItem } from "@/components/ui/toolbar";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { formatHotkey, useHotkeys } from "@/lib/use-hotkeys";
import { Demo } from "./demo";

export function Surfaces() {
  const [deleted, setDeleted] = useState("kept");
  const [zoom, setZoom] = useState(100);
  const [grid, setGrid] = useState(true);
  const [styles, setStyles] = useState<string[]>(["bold"]);
  const [sizes, setSizes] = useState<readonly number[]>([30, 70]);
  const [pressed, setPressed] = useState(0);
  const [sidebar, setSidebar] = useState(true);
  useHotkeys("shift+j", () => setPressed((n) => n + 1));
  return (
    <div className="grid gap-6 @3xl:grid-cols-2">
      <Demo title="Alert dialog">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">Delete the project</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete the project?</AlertDialogTitle>
              <AlertDialogDescription>Its 14 files are deleted for everyone. This cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep it</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={() => setDeleted("deleted")}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <p className="mt-2 text-sm text-muted-foreground" data-testid="deleted">
          {deleted}
        </p>
      </Demo>
      <Demo title="Hover card and collapsible">
        <p className="text-sm">
          Drawn by{" "}
          <HoverCard>
            <HoverCardTrigger asChild>
              <a href="#surfaces-title" className="underline underline-offset-4">
                the maps team
              </a>
            </HoverCardTrigger>
            <HoverCardContent>Four people who draw the maps, in three cities.</HoverCardContent>
          </HoverCard>
          .
        </p>
        <Collapsible className="mt-4">
          <CollapsibleTrigger>More options</CollapsibleTrigger>
          <CollapsibleContent>
            <p className="text-sm text-muted-foreground" data-testid="more">
              Export, print and share.
            </p>
          </CollapsibleContent>
        </Collapsible>
      </Demo>
      <Demo title="Menubar">
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>File</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>
                New <MenubarShortcut>{formatHotkey("mod+n")}</MenubarShortcut>
              </MenubarItem>
              <MenubarItem>Open</MenubarItem>
              <MenubarSeparator />
              <MenubarItem>Print</MenubarItem>
            </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger>View</MenubarTrigger>
            <MenubarContent>
              <MenubarCheckboxItem checked={grid} onCheckedChange={setGrid}>
                Show the grid
              </MenubarCheckboxItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
        <p className="mt-2 text-sm text-muted-foreground" data-testid="grid">
          {grid ? "grid on" : "grid off"}
        </p>
      </Demo>
      <Demo title="Navigation menu">
        <NavigationMenu aria-label="Example site">
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger>Products</NavigationMenuTrigger>
              <NavigationMenuContent>
                <NavigationMenuLink href="#maps">
                  <span className="font-medium">Maps</span>
                  <span className="text-muted-foreground">Regions, places and routes</span>
                </NavigationMenuLink>
                <NavigationMenuLink href="#charts">
                  <span className="font-medium">Charts</span>
                  <span className="text-muted-foreground">Every common form</span>
                </NavigationMenuLink>
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink href="#pricing" active>
                Pricing
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </Demo>
      <Demo title="Toolbar and button group">
        <div className="flex flex-col gap-4">
          <Toolbar aria-label="Formatting">
            <ToolbarToggleGroup type="multiple" aria-label="Style" value={styles} onValueChange={setStyles}>
              <ToolbarToggleItem value="bold" aria-label="Bold">
                <Bold aria-hidden="true" />
              </ToolbarToggleItem>
              <ToolbarToggleItem value="italic" aria-label="Italic">
                <Italic aria-hidden="true" />
              </ToolbarToggleItem>
              <ToolbarToggleItem value="underline" aria-label="Underline">
                <Underline aria-hidden="true" />
              </ToolbarToggleItem>
            </ToolbarToggleGroup>
            <ToolbarSeparator />
            <ToolbarButton>Share</ToolbarButton>
          </Toolbar>
          <p className="text-sm text-muted-foreground" data-testid="styles">
            {styles.join(", ") || "plain"}
          </p>
          <ButtonGroup aria-label="Zoom">
            <Button variant="outline" size="icon" aria-label="Zoom out" onClick={() => setZoom((z) => z - 10)}>
              <Minus aria-hidden="true" />
            </Button>
            <ButtonGroupText data-testid="zoom">{zoom}%</ButtonGroupText>
            <Button variant="outline" size="icon" aria-label="Zoom in" onClick={() => setZoom((z) => z + 10)}>
              <Plus aria-hidden="true" />
            </Button>
          </ButtonGroup>
        </div>
      </Demo>
      <Demo title="Resizable">
        <div className="h-48 rounded-surface border">
          <ResizablePanelGroup sizes={sizes} onSizesChange={setSizes} aria-label="Mail">
            <ResizablePanel id="folders" minSize={20} className="p-3 text-sm">
              Folders
            </ResizablePanel>
            <ResizableHandle aria-label="Resize the folders" />
            <ResizablePanel id="messages" className="p-3 text-sm">
              Messages
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
        <p className="mt-2 text-sm text-muted-foreground" data-testid="sizes">
          {sizes.map((s) => Math.round(s)).join(" / ")}
        </p>
      </Demo>
      <Demo title="Sidebar" className="@3xl:col-span-2">
        <div className="h-72 overflow-hidden rounded-surface border">
          <SidebarProvider open={sidebar} onOpenChange={setSidebar} shortcut={null} className="h-full">
            <Sidebar aria-label="Workspace">
              <SidebarHeader>Workspace</SidebarHeader>
              <SidebarContent>
                <SidebarGroup label="Work">
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton href="#inbox" icon={<Inbox />} current badge="3">
                        Inbox
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton href="#reports" icon={<ChartBar />}>
                        Reports
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton href="#settings" icon={<Settings />}>
                        Settings
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroup>
              </SidebarContent>
            </Sidebar>
            <SidebarInset className="p-3">
              <SidebarTrigger />
              <p className="mt-2 text-sm text-muted-foreground">The page beside the sidebar.</p>
            </SidebarInset>
          </SidebarProvider>
        </div>
      </Demo>
      <Demo title="Skip link, hidden words and shortcuts">
        <div className="relative flex flex-col gap-3 text-sm">
          <SkipLink href="#surfaces-title" className="absolute">
            Skip to the heading
          </SkipLink>
          <button type="button" className="inline-flex size-10 items-center justify-center rounded-control border" data-testid="bell">
            <Inbox aria-hidden="true" className="size-4" />
            <VisuallyHidden>Inbox, 3 new</VisuallyHidden>
          </button>
          <p>
            Press <Kbd>{formatHotkey("shift+j")}</Kbd> anywhere on the page: <span data-testid="pressed">{pressed}</span>
          </p>
        </div>
      </Demo>
    </div>
  );
}
