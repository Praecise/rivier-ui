"use client";
// Showcase: bottom sheet, dock, map frame.

import { MapPin, Minus, PanelRightClose, Plus } from "lucide-react";
import { useState } from "react";
import { MapFrame, MapFrameActivate, MapFrameCanvas, MapFrameFullscreen, MapFrameList, MapFrameNotice, MapFramePlaceholder, MapFrameStage, MapFrameToolbar, mapFrameControlClass } from "@/components/layout/map-frame";
import {
  BottomSheet,
  BottomSheetBody,
  BottomSheetClose,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetFooter,
  BottomSheetHandle,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetTrigger,
  type BottomSheetSnap,
} from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Dock, DockBar, DockCollapse, DockMain, DockPanel, DockResizer } from "@/components/ui/dock";
import { Demo } from "./demo";

const STOPS = [
  { name: "Harbour market", note: "Opens at 8", x: 22, y: 60 },
  { name: "Old lighthouse", note: "20 minutes on foot", x: 55, y: 30 },
  { name: "Tide pools", note: "Best at low water", x: 78, y: 68 },
];

function StopList() {
  return (
    <ol className="flex flex-col gap-2">
      {STOPS.map((stop, index) => (
        <li key={stop.name} className="flex items-baseline gap-3 rounded-control border px-3 py-2 text-sm">
          <span className="font-mono text-xs text-muted-foreground">{index + 1}</span>
          <span className="font-medium">{stop.name}</span>
          <span className="ms-auto text-muted-foreground">{stop.note}</span>
        </li>
      ))}
    </ol>
  );
}

/** Stands in for a map engine: drawn from divs, no network. */
function FakeMap({ zoom }: { zoom: number }) {
  return (
    <div data-testid="fake-map" className="relative size-full bg-highlight-soft">
      {STOPS.map((stop, index) => (
        <span
          key={stop.name}
          className="absolute flex size-7 -translate-1/2 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground"
          style={{ insetInlineStart: `${stop.x}%`, top: `${stop.y}%`, scale: String(zoom) }}
        >
          {index + 1}
        </span>
      ))}
      <span className="absolute start-3 bottom-3 rounded-control bg-background px-2 py-1 font-mono text-xs">zoom {zoom.toFixed(1)}</span>
    </div>
  );
}

const PLAYER_SNAPS: BottomSheetSnap[] = ["8rem", "320px", 1];

export function Panels() {
  const [playerOpen, setPlayerOpen] = useState(false);
  const [playerSnap, setPlayerSnap] = useState<BottomSheetSnap>("8rem");
  const [planOpen, setPlanOpen] = useState(false);
  const [width, setWidth] = useState(280);
  const [hidden, setHidden] = useState(false);
  const [below, setBelow] = useState(200);
  const [opened, setOpened] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [mapOn, setMapOn] = useState(false);

  return (
    <div className="grid gap-4 @3xl:grid-cols-2">
      <Demo title="Bottom sheet" className="@3xl:col-span-2">
        <div className="flex flex-wrap items-center gap-3">
          <BottomSheet snapPoints={[0.4, 0.9]}>
            <BottomSheetTrigger asChild>
              <Button variant="outline">Open details</Button>
            </BottomSheetTrigger>
            <BottomSheetContent data-testid="details-sheet">
              <BottomSheetHandle />
              <BottomSheetHeader>
                <BottomSheetTitle>Saturday by the sea</BottomSheetTitle>
                <BottomSheetDescription>Three stops. Drag the bar, or use its arrow keys, to see more.</BottomSheetDescription>
              </BottomSheetHeader>
              <BottomSheetBody data-testid="details-body">
                <StopList />
                <div className="mt-4 flex flex-col gap-3 text-sm text-muted-foreground">
                  {Array.from({ length: 14 }, (_, index) => (
                    <p key={index}>Note {index + 1}. The walk between stops follows the shore path, which is flat and open to the wind.</p>
                  ))}
                </div>
              </BottomSheetBody>
              <BottomSheetFooter>
                <BottomSheetClose asChild>
                  <Button>Done</Button>
                </BottomSheetClose>
              </BottomSheetFooter>
            </BottomSheetContent>
          </BottomSheet>

          <BottomSheet>
            <BottomSheetTrigger asChild>
              <Button variant="outline">Open simple sheet</Button>
            </BottomSheetTrigger>
            <BottomSheetContent data-testid="simple-sheet">
              <BottomSheetHandle />
              <BottomSheetHeader>
                <BottomSheetTitle>Share this day</BottomSheetTitle>
                <BottomSheetDescription>No snap points: the sheet is as tall as its content.</BottomSheetDescription>
              </BottomSheetHeader>
              <BottomSheetFooter>
                <BottomSheetClose asChild>
                  <Button>Copy the link</Button>
                </BottomSheetClose>
              </BottomSheetFooter>
            </BottomSheetContent>
          </BottomSheet>

          <Button variant="outline" onClick={() => setPlayerOpen((open) => !open)} aria-expanded={playerOpen}>
            Toggle player
          </Button>
          <BottomSheet open={playerOpen} onOpenChange={setPlayerOpen} snapPoints={PLAYER_SNAPS} snap={playerSnap} onSnapChange={setPlayerSnap} modal={false} dismissible={false}>
            <BottomSheetContent data-testid="player-sheet" onOpenAutoFocus={(event) => event.preventDefault()}>
              <BottomSheetHandle aria-label="Player height" snapLabel={(index) => ["Small", "Half", "Full"][index] ?? ""} />
              <BottomSheetHeader>
                <BottomSheetTitle>Now playing: Shore sounds</BottomSheetTitle>
                <BottomSheetDescription>Not modal, not dismissible: the page behind stays usable.</BottomSheetDescription>
              </BottomSheetHeader>
              <BottomSheetBody>
                <StopList />
              </BottomSheetBody>
              <BottomSheetFooter>
                <BottomSheetClose asChild>
                  <Button variant="outline">Stop and close</Button>
                </BottomSheetClose>
              </BottomSheetFooter>
            </BottomSheetContent>
          </BottomSheet>
          <p className="text-sm text-muted-foreground">
            Player: <span data-testid="player-state">{playerOpen ? String(playerSnap) : "closed"}</span>
          </p>
        </div>
      </Demo>

      <Demo title="Dock" className="@3xl:col-span-2" bodyClassName="p-0">
        <Dock data-testid="dock" defaultSize={32} minSize={24} maxSize={50} className="h-96">
          <DockMain className="overflow-y-auto p-5">
            <p className="text-sm font-medium">Conversation</p>
            <p className="mt-2 max-w-prose text-sm text-muted-foreground">
              The main content. The plan stays beside it while you work; drag the line between them, or focus it and use the arrow keys. On a narrow screen the plan becomes a bar at the bottom that opens a sheet.
            </p>
            <Button variant="outline" size="sm" className="mt-4">
              A control in the main content
            </Button>
          </DockMain>
          <DockResizer aria-label="Resize the plan" />
          <DockPanel aria-label="Plan" className="bg-card">
            <div className="flex items-center justify-between gap-2 border-b py-1 ps-4 pe-1">
              <p className="text-sm font-medium">Plan</p>
              <DockCollapse aria-label="Hide the plan">
                <PanelRightClose aria-hidden="true" strokeWidth={1.5} />
              </DockCollapse>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <StopList />
            </div>
          </DockPanel>
          <DockBar onOpenStacked={() => setPlanOpen(true)}>
            <MapPin aria-hidden="true" strokeWidth={1.5} />
            Plan · 3 stops
          </DockBar>
        </Dock>
        <BottomSheet open={planOpen} onOpenChange={setPlanOpen}>
          <BottomSheetContent
            data-testid="plan-sheet"
            onCloseAutoFocus={(event) => {
              // Opened from state, not from a trigger: send focus back to the bar that opened it.
              event.preventDefault();
              document.querySelector<HTMLElement>("[data-testid=dock] [data-slot=dock-bar]")?.focus();
            }}
          >
            <BottomSheetHandle />
            <BottomSheetHeader>
              <BottomSheetTitle>Plan</BottomSheetTitle>
              <BottomSheetDescription>The panel's content, in a sheet on a narrow screen.</BottomSheetDescription>
            </BottomSheetHeader>
            <BottomSheetBody>
              <StopList />
            </BottomSheetBody>
          </BottomSheetContent>
        </BottomSheet>
      </Demo>

      <Demo title="Dock: controlled, at the start" className="@3xl:col-span-2" bodyClassName="p-0">
        <Dock data-testid="dock-start" side="start" unit="px" size={width} onSizeChange={setWidth} minSize={200} maxSize={360} step={20} collapsed={hidden} onCollapsedChange={setHidden} className="h-64">
          <DockPanel aria-label="Filters" className="bg-card p-4">
            <p className="text-sm font-medium">Filters</p>
            <DockCollapse className="mt-2 size-auto h-control-sm self-start border border-border-strong px-3 text-sm text-foreground">Hide filters</DockCollapse>
          </DockPanel>
          <DockResizer aria-label="Resize the filters" />
          <DockMain className="p-4">
            <p className="text-sm text-muted-foreground">
              Width: <span data-testid="dock-width">{Math.round(width)}</span>px, <span data-testid="dock-hidden">{hidden ? "hidden" : "shown"}</span>
            </p>
          </DockMain>
          <DockBar>Filters</DockBar>
        </Dock>
      </Demo>

      <Demo title="Dock: its own stacking width, the bar above a composer" className="@3xl:col-span-2" bodyClassName="p-0">
        <div className="flex flex-wrap items-center gap-3 border-b p-3 text-sm text-muted-foreground">
          <Button variant="outline" size="sm" onClick={() => setBelow((now) => (now === 200 ? 16 : 200))}>
            Stack below {below === 200 ? 16 : 200}rem instead
          </Button>
          <span>
            stackBelow: <span data-testid="dock-below">{below}</span> · the bar was pressed: <span data-testid="dock-opened">{opened}</span>
          </span>
        </div>
        <Dock data-testid="dock-above" stackBelow={below} defaultSize={40} minSize={30} maxSize={60} className="h-80">
          <DockMain className="flex flex-col">
            <div className="min-h-0 flex-1 p-4">
              <p className="text-sm font-medium">Conversation</p>
              <p className="mt-2 max-w-prose text-sm text-muted-foreground">On a narrow dock the bar for the plan sits here, above the composer, so the composer stays lowest.</p>
            </div>
            <DockBar show="stacked" onOpenStacked={() => setOpened((count) => count + 1)}>
              <MapPin aria-hidden="true" strokeWidth={1.5} />
              Plan · 3 stops
            </DockBar>
            <div data-testid="dock-composer" className="border-t p-3">
              <Button variant="outline" size="sm">
                Write a message
              </Button>
            </div>
          </DockMain>
          <DockResizer aria-label="Resize the plan beside the composer" />
          <DockPanel aria-label="Plan beside the composer" className="bg-card">
            <div className="flex items-center justify-between gap-2 border-b py-1 ps-4 pe-1">
              <p className="text-sm font-medium">Plan</p>
              <DockCollapse aria-label="Hide the plan beside the composer">
                <PanelRightClose aria-hidden="true" strokeWidth={1.5} />
              </DockCollapse>
            </div>
            <div className="min-h-0 flex-1 p-4 text-sm text-muted-foreground">Three stops.</div>
          </DockPanel>
          <DockBar show="collapsed">
            <MapPin aria-hidden="true" strokeWidth={1.5} />
            Plan · 3 stops
          </DockBar>
        </Dock>
      </Demo>

      <Demo title="Map frame">
        <MapFrame aria-label="Map of the three stops" active={mapOn} onActiveChange={setMapOn}>
          <MapFrameStage className="aspect-[4/3] @md:aspect-video">
            <MapFramePlaceholder>
              <MapPin aria-hidden="true" strokeWidth={1.5} className="size-6 text-muted-foreground" />
              <p className="text-sm">Three stops along the shore, 2 km end to end.</p>
              <MapFrameActivate>Show the map</MapFrameActivate>
              <MapFrameNotice>Nothing is loaded until you ask. A real map would say here who provides it and what they see.</MapFrameNotice>
            </MapFramePlaceholder>
            <MapFrameCanvas>
              <FakeMap zoom={zoom} />
            </MapFrameCanvas>
            <MapFrameToolbar>
              <button type="button" aria-label="Zoom out" className={mapFrameControlClass} onClick={() => setZoom((value) => Math.max(0.6, value - 0.2))}>
                <Minus aria-hidden="true" strokeWidth={1.5} />
              </button>
              <button type="button" aria-label="Zoom in" className={mapFrameControlClass} onClick={() => setZoom((value) => Math.min(2, value + 0.2))}>
                <Plus aria-hidden="true" strokeWidth={1.5} />
              </button>
              <MapFrameFullscreen />
            </MapFrameToolbar>
          </MapFrameStage>
          <MapFrameList>
            <StopList />
          </MapFrameList>
        </MapFrame>
        <p className="mt-3 text-sm text-muted-foreground">
          Map: <span data-testid="map-state">{mapOn ? "on" : "off"}</span>
        </p>
      </Demo>
    </div>
  );
}
