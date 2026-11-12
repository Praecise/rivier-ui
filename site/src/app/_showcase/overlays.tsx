"use client";
// Showcase: overlays, menus and navigation.

import { Copy, Settings, Trash2, User } from "lucide-react";
import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut } from "@/components/ui/command";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toaster";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Demo } from "./demo";

export function Overlays() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [compact, setCompact] = useState(true);

  return (
    <TooltipProvider>
      <div className="grid gap-4 @3xl:grid-cols-2">
        <Demo title="Dialog, sheet, popover, tooltip, toast" className="@3xl:col-span-2">
          <div className="flex flex-wrap items-center gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Open dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Rename project</DialogTitle>
                  <DialogDescription>The address of the project does not change.</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="ghost">Cancel</Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button>Save</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline">Open sheet</Button>
              </SheetTrigger>
              <SheetContent side="end">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                  <SheetDescription>A panel that slides in from the side.</SheetDescription>
                </SheetHeader>
              </SheetContent>
            </Sheet>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">Open popover</Button>
              </PopoverTrigger>
              <PopoverContent>
                <p className="text-sm">A small surface anchored to what opened it.</p>
              </PopoverContent>
            </Popover>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Copy">
                  <Copy strokeWidth={1.5} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy</TooltipContent>
            </Tooltip>

            <Button variant="outline" data-testid="toast" onClick={() => toast("Saved", { description: "Your changes are live." })}>
              Show toast
            </Button>

            <Button variant="outline" data-testid="palette" onClick={() => setPaletteOpen(true)}>
              Command palette
            </Button>
            <CommandDialog open={paletteOpen} onOpenChange={setPaletteOpen} title="Command palette" description="Search for a command to run.">
              <CommandInput placeholder="Type a command" />
              <CommandList>
                <CommandEmpty>Nothing found.</CommandEmpty>
                <CommandGroup heading="Go to">
                  <CommandItem onSelect={() => setPaletteOpen(false)}>
                    <User strokeWidth={1.5} /> Profile <CommandShortcut>P</CommandShortcut>
                  </CommandItem>
                  <CommandItem onSelect={() => setPaletteOpen(false)}>
                    <Settings strokeWidth={1.5} /> Settings <CommandShortcut>S</CommandShortcut>
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </CommandDialog>
          </div>
        </Demo>

        <Demo title="Dropdown and context menu">
          <div className="flex flex-wrap items-stretch gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Options</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Project</DropdownMenuLabel>
                <DropdownMenuItem>
                  <Copy strokeWidth={1.5} /> Duplicate <DropdownMenuShortcut>D</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuCheckboxItem checked={compact} onCheckedChange={setCompact}>
                  Compact view
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive">
                  <Trash2 strokeWidth={1.5} /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <ContextMenu>
              <ContextMenuTrigger className="flex min-h-10 flex-1 items-center justify-center rounded-control border border-dashed border-border-strong px-4 text-sm text-muted-foreground">
                Right-click or long-press here
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem>Open</ContextMenuItem>
                <ContextMenuItem>Rename</ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem variant="destructive">Delete</ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          </div>
        </Demo>

        <Demo title="Tabs">
          <div className="grid gap-6">
            <Tabs defaultValue="overview">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="pt-3 text-sm text-muted-foreground">
                The underline look, for sections of a page.
              </TabsContent>
              <TabsContent value="activity" className="pt-3 text-sm text-muted-foreground">
                Activity.
              </TabsContent>
              <TabsContent value="settings" className="pt-3 text-sm text-muted-foreground">
                Settings.
              </TabsContent>
            </Tabs>
            <Tabs defaultValue="month">
              <TabsList variant="pill">
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="month">Month</TabsTrigger>
                <TabsTrigger value="year">Year</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </Demo>

        <Demo title="Accordion">
          <Accordion type="single" collapsible defaultValue="a">
            <AccordionItem value="a">
              <AccordionTrigger>Is the code mine?</AccordionTrigger>
              <AccordionContent>Yes. Components are copied into your project.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="b">
              <AccordionTrigger>Can I change the look?</AccordionTrigger>
              <AccordionContent>From one stylesheet: mode, roundness, highlight colour.</AccordionContent>
            </AccordionItem>
          </Accordion>
        </Demo>

        <Demo title="Breadcrumb and pagination">
          <div className="grid gap-5">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="#overlays">Projects</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href="#overlays">Website</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Settings</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious href="#overlays" />
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink href="#overlays">1</PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink href="#overlays" isActive>
                    2
                  </PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext href="#overlays" />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </Demo>
      </div>
    </TooltipProvider>
  );
}
