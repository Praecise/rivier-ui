"use client";
// Site: a component shown working. The demonstrations are the showcase's own, the ones the browser checks
// drive: a component page mounts the group its component is shown in and leaves on screen only the
// demonstrations that are about it.

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { Toaster } from "@/components/ui/toaster";

const GROUPS: Record<string, ComponentType> = {
  controls: dynamic(() => import("../_showcase/controls").then((m) => m.Controls)),
  overlays: dynamic(() => import("../_showcase/overlays").then((m) => m.Overlays)),
  display: dynamic(() => import("../_showcase/display").then((m) => m.Display)),
  layouts: dynamic(() => import("../_showcase/layouts").then((m) => m.Layouts)),
  motions: dynamic(() => import("../_showcase/motions").then((m) => m.Motions)),
  three: dynamic(() => import("../_showcase/visuals").then((m) => m.Three)),
  "overview-charts": dynamic(() => import("../_showcase/visuals").then((m) => m.Charts)),
  foundations: dynamic(() => import("../_showcase/foundations").then((m) => m.Foundations)),
  choices: dynamic(() => import("../_showcase/choices").then((m) => m.Choices)),
  dates: dynamic(() => import("../_showcase/dates").then((m) => m.Dates)),
  flows: dynamic(() => import("../_showcase/flows").then((m) => m.Flows)),
  panels: dynamic(() => import("../_showcase/panels").then((m) => m.Panels)),
  conversation: dynamic(() => import("../_showcase/conversation").then((m) => m.Conversation)),
  gallery: dynamic(() => import("../_showcase/gallery").then((m) => m.GalleryShowcase)),
  players: dynamic(() => import("../_showcase/players").then((m) => m.Players)),
  records: dynamic(() => import("../_showcase/records").then((m) => m.Records)),
  models: dynamic(() => import("../_showcase/models").then((m) => m.Models)),
  evidence: dynamic(() => import("../_showcase/evidence").then((m) => m.Evidence)),
  carousel: dynamic(() => import("../_showcase/carousel").then((m) => m.CarouselShowcase)),
  lists: dynamic(() => import("../_showcase/lists").then((m) => m.Lists)),
  stage: dynamic(() => import("../_showcase/stage").then((m) => m.Stage)),
  charts: dynamic(() => import("../_showcase/charts").then((m) => m.MoreCharts)),
  maps: dynamic(() => import("../_showcase/maps").then((m) => m.Maps)),
  explainers: dynamic(() => import("../_showcase/explainers").then((m) => m.Explainers)),
  grid: dynamic(() => import("../_showcase/grid").then((m) => m.Grid)),
  entry: dynamic(() => import("../_showcase/entry").then((m) => m.Entry)),
  surfaces: dynamic(() => import("../_showcase/surfaces").then((m) => m.Surfaces)),
  boards: dynamic(() => import("../_showcase/boards").then((m) => m.Boards)),
  editors: dynamic(() => import("../_showcase/editors").then((m) => m.Editors)),
  effects: dynamic(() => import("../_showcase/effects").then((m) => m.Effects)),
};

const quoted = (title: string): string => `"${title.replace(/["\\]/g, "\\$&")}"`;

export function Live({ group, titles }: { group: string; titles: string[] }) {
  const Group = GROUPS[group];
  if (!Group) return null;
  const keep = titles.map((title) => `[data-demo=${quoted(title)}]`).join(", ");
  return (
    <div data-slot="live" className="@container min-w-0">
      {/* Only the demonstrations about this component stay, one under the other. */}
      <style>{`[data-slot=live] [data-demo]:not(${keep}) { display: none; } [data-slot=live] > div { display: flex; flex-direction: column; gap: 1rem; }`}</style>
      <Group />
      <Toaster />
    </div>
  );
}
