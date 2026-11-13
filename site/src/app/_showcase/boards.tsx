"use client";
// Showcase: trees, boards, diagrams, a tour and an inbox. Every name and task is invented.

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FlowDiagram, type FlowEdge, type FlowNode } from "@/components/ui/flow-diagram";
import { Kanban, type KanbanCard } from "@/components/ui/kanban";
import { NotificationList } from "@/components/ui/notification-list";
import { Tour } from "@/components/ui/tour";
import { TreeView } from "@/components/ui/tree-view";
import { Demo } from "./demo";

const FILES = [
  {
    id: "src",
    label: "src",
    children: [
      { id: "app", label: "app.tsx" },
      { id: "lib", label: "lib", children: [{ id: "cn", label: "cn.ts" }, { id: "dates", label: "dates.ts" }] },
      { id: "styles", label: "styles", children: [{ id: "theme", label: "theme.css" }] },
    ],
  },
  { id: "docs", label: "docs", children: [{ id: "guide", label: "guide.md" }] },
  { id: "readme", label: "README.md" },
];

const COLUMNS = [
  { id: "todo", title: "To do" },
  { id: "doing", title: "Doing" },
  { id: "done", title: "Done" },
];

const NODES: FlowNode[] = [
  { id: "placed", label: "Order placed", x: 20, y: 40, kind: "start" },
  { id: "paid", label: "Paid", x: 230, y: 40, note: "card or invoice" },
  { id: "packed", label: "Packed", x: 440, y: 40 },
  { id: "sent", label: "Sent", x: 440, y: 160, kind: "end" },
];
const EDGES: FlowEdge[] = [
  { id: "placed-paid", source: "placed", target: "paid" },
  { id: "paid-packed", source: "paid", target: "packed" },
];

export function Boards() {
  const [selected, setSelected] = useState<string | null>(null);
  const [cards, setCards] = useState<readonly KanbanCard[]>([
    { id: "brief", column: "todo", title: "Write the brief" },
    { id: "survey", column: "todo", title: "Plan the survey", description: "Three towns, two weeks" },
    { id: "map", column: "doing", title: "Draw the map" },
    { id: "print", column: "done", title: "Print the posters" },
  ]);
  const [nodes, setNodes] = useState<readonly FlowNode[]>(NODES);
  const [edges, setEdges] = useState<readonly FlowEdge[]>(EDGES);
  const [touring, setTouring] = useState(false);
  const [toured, setToured] = useState("no");
  return (
    <div className="grid gap-6 @3xl:grid-cols-2">
      <Demo title="Tree view">
        <TreeView aria-label="Files" items={FILES} defaultExpanded={["src"]} selected={selected} onSelectedChange={setSelected} />
        <p className="mt-2 text-sm text-muted-foreground" data-testid="tree-selected">
          {selected ?? "none"}
        </p>
      </Demo>
      <Demo title="Notifications">
        <NotificationList
          aria-label="Notifications"
          now="2026-11-13T12:00:00Z"
          defaultItems={[
            { id: "1", title: "Report ready", body: "The October report can be downloaded.", time: "2026-11-13T11:55:00Z", kind: "success" },
            { id: "2", title: "Storage nearly full", body: "92% of the space is used.", time: "2026-11-13T08:00:00Z", kind: "warning" },
            { id: "3", title: "New comment", body: "On the map of the coast.", time: "2026-11-11T09:00:00Z", read: true },
          ]}
        />
      </Demo>
      <Demo title="Kanban" className="@3xl:col-span-2">
        <Kanban aria-label="Tasks" columns={COLUMNS} cards={cards} onCardsChange={setCards} />
        <p className="mt-2 text-sm text-muted-foreground" data-testid="cards">
          {COLUMNS.map((column) => `${column.title}: ${cards.filter((c) => c.column === column.id).map((c) => c.title).join(", ")}`).join(" | ")}
        </p>
      </Demo>
      <Demo title="Flow diagram" className="@3xl:col-span-2">
        <FlowDiagram aria-label="Order flow" nodes={nodes} edges={edges} onNodesChange={setNodes} onEdgesChange={setEdges} />
        <p className="mt-2 text-sm text-muted-foreground" data-testid="edges">
          {edges.map((e) => `${e.source}>${e.target}`).join(" ")}
        </p>
      </Demo>
      <Demo title="Tour">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setTouring(true)}>Show me around</Button>
          <Button variant="outline" id="tour-search">
            Search
          </Button>
          <Button variant="outline" id="tour-share">
            Share
          </Button>
        </div>
        <p className="mt-2 text-sm text-muted-foreground" data-testid="toured">
          {toured}
        </p>
        <Tour
          open={touring}
          onOpenChange={setTouring}
          onComplete={() => setToured("completed")}
          steps={[
            { target: "#tour-search", title: "Search", body: "Find any file by its name or its words." },
            { target: "#tour-share", title: "Share", body: "Send a link to the people you work with." },
          ]}
        />
      </Demo>
    </div>
  );
}
