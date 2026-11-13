"use client";
// Showcase: data-grid. Invented orders: no real people, no real companies.

import { useState } from "react";
import { DataGrid, type DataGridColumn } from "@/components/ui/data-grid";
import { Demo } from "./demo";

type Order = { id: string; customer: string; city: string; status: string; items: number; total: number; placed: string };

const CITIES = ["Harbour", "Millford", "Eastwick", "Highmoor", "Saltby"];
const STATUSES = ["Open", "Packed", "Sent", "Returned"];
const NAMES = ["Alder & Co", "Birch Studio", "Cedar Works", "Delta Kitchen", "Elm Books", "Fern Cycles", "Gale Print", "Heron Tea"];

function makeOrders(count: number): Order[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `A-${String(1000 + i)}`,
    customer: NAMES[(i * 7) % NAMES.length] ?? "",
    city: CITIES[(i * 3) % CITIES.length] ?? "",
    status: STATUSES[(i * 5) % STATUSES.length] ?? "",
    items: 1 + ((i * 13) % 9),
    total: Math.round((20 + ((i * 37) % 480) + (i % 7) * 0.25) * 100) / 100,
    placed: `2026-0${1 + (i % 9)}-${String(1 + ((i * 11) % 28)).padStart(2, "0")}`,
  }));
}

const COLUMNS: DataGridColumn<Order>[] = [
  { key: "id", header: "Order", pin: "start", width: 104 },
  { key: "customer", header: "Customer" },
  { key: "city", header: "City" },
  { key: "status", header: "Status" },
  { key: "items", header: "Items", type: "number", aggregate: "sum" },
  { key: "total", header: "Total", type: "number", aggregate: "sum", editable: true, format: (value) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value)) },
  { key: "placed", header: "Placed", type: "date" },
];

export function Grid() {
  const [orders, setOrders] = useState(() => makeOrders(57));
  const [many] = useState(() => makeOrders(2000));
  const [selected, setSelected] = useState<readonly string[]>([]);
  return (
    <div className="grid gap-6">
      <Demo title="Orders">
        <DataGrid
          label="Orders"
          rows={orders}
          rowId={(order) => order.id}
          columns={COLUMNS}
          selectable
          selected={selected}
          onSelectedChange={setSelected}
          pageSize={10}
          onCellEdit={(id, key, value) => setOrders((list) => list.map((order) => (order.id === id ? { ...order, [key]: value } : order)))}
        />
        <p className="mt-2 text-sm text-muted-foreground" data-testid="grid-selected">
          {selected.join(", ") || "none"}
        </p>
      </Demo>
      <Demo title="Grouped by status">
        <DataGrid label="Orders by status" rows={orders} rowId={(order) => order.id} columns={COLUMNS} groupBy="status" defaultHidden={["placed"]} />
      </Demo>
      <Demo title="Two thousand rows">
        <DataGrid label="All orders" rows={many} rowId={(order) => order.id} columns={COLUMNS} height={360} />
      </Demo>
    </div>
  );
}
