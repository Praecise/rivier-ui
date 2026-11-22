"use client";
// Showcase: the charts added on 2026-11-13. Every figure is generated here from a seeded sequence, so the page
// needs no network, draws the same numbers every time, and holds no data about real people.

import { useState } from "react";
import { BarChart } from "@/components/viz/bar-chart";
import { BoxPlot } from "@/components/viz/box-plot";
import { BulletChart } from "@/components/viz/bullet-chart";
import { CalendarHeatmap } from "@/components/viz/calendar-heatmap";
import { CandlestickChart } from "@/components/viz/candlestick-chart";
import { ChartBrush } from "@/components/viz/chart-brush";
import { ChordDiagram } from "@/components/viz/chord-diagram";
import { CirclePack } from "@/components/viz/circle-pack";
import { DensityChart } from "@/components/viz/density-chart";
import { DotPlot } from "@/components/viz/dot-plot";
import { FanChart } from "@/components/viz/fan-chart";
import { FunnelChart } from "@/components/viz/funnel-chart";
import { GanttChart } from "@/components/viz/gantt-chart";
import { Histogram } from "@/components/viz/histogram";
import { LineChart } from "@/components/viz/line-chart";
import { NetworkGraph } from "@/components/viz/network-graph";
import { ParallelCoordinates } from "@/components/viz/parallel-coordinates";
import { RadarChart } from "@/components/viz/radar-chart";
import { SankeyChart } from "@/components/viz/sankey-chart";
import { ScatterChart } from "@/components/viz/scatter-chart";
import { SlopeChart } from "@/components/viz/slope-chart";
import { SmallMultiples } from "@/components/viz/small-multiples";
import { StreamChart } from "@/components/viz/stream-chart";
import { Sunburst } from "@/components/viz/sunburst";
import { Treemap } from "@/components/viz/treemap";
import { WaterfallChart } from "@/components/viz/waterfall-chart";
import type { ChartTreeNode } from "@/components/viz/chart";
import { Demo } from "./demo";

/** A small seeded generator (mulberry32): the same sequence on the server and in the browser. */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** A roughly normal number from a uniform generator. */
const normal = (random: () => number, mean: number, sd: number): number => mean + sd * (random() + random() + random() + random() - 2) * 1.2;
const round = (value: number, places = 1): number => Math.round(value * 10 ** places) / 10 ** places;

const random = seeded(7);
const KINDS = ["Tea", "Coffee", "Cocoa"];
const PRODUCTS = Array.from({ length: 36 }, (_, i) => ({
  name: `Blend ${i + 1}`,
  price: round(6 + random() * 18),
  rating: round(3 + random() * 2),
  sold: Math.round(40 + random() * 600),
  kind: KINDS[i % 3] ?? "Tea",
}));
const TIMES = Array.from({ length: 240 }, () => ({ minutes: round(normal(random, 32, 9)) }));
const REGIONS = ["North", "South", "East", "West"];
const RESPONSES = REGIONS.flatMap((region, r) => Array.from({ length: 40 }, () => ({ region, ms: Math.round(normal(random, 120 + r * 25, 18 + r * 6)) }))).concat([
  { region: "North", ms: 260 },
  { region: "East", ms: 330 },
]);
const FORECAST = Array.from({ length: 24 }, (_, i) => {
  const week = i + 1;
  if (week <= 14) return { week, observed: Math.round(100 + week * 3 + Math.sin(week) * 6) };
  const reach = week - 14;
  const median = 142 + reach * 2.6;
  return { week, median, low90: median - reach * 5.5, high90: median + reach * 6, low50: median - reach * 2.6, high50: median + reach * 2.8 };
});
FORECAST[13] = { ...FORECAST[13], median: 142, low90: 142, high90: 142, low50: 142, high50: 142 } as (typeof FORECAST)[number];
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const VISITS = ["North", "South", "East", "West", "Centre", "Coast"].flatMap((region, r) =>
  MONTHS.map((month) => ({ region, month, visits: Math.round(40 + r * 6 + Math.sin((month + r) / 2) * 14 + month * (r % 2 ? 1.5 : -0.6)) })),
);
const CHANNELS = ["Q1", "Q2", "Q3", "Q4"].map((quarter, i) => ({ quarter, web: 320 + i * 40, app: 210 + i * 60, shop: 120 - i * 10 }));
const SPENDING: ChartTreeNode = {
  name: "All spending",
  children: [
    {
      name: "Housing",
      children: [
        { name: "Rent", value: 1200 },
        { name: "Power", value: 140 },
        { name: "Water", value: 60 },
        { name: "Repairs", value: 90 },
      ],
    },
    {
      name: "Food",
      children: [
        { name: "Groceries", value: 420 },
        { name: "Cafés", value: 90 },
        { name: "Takeaway", value: 70 },
      ],
    },
    {
      name: "Travel",
      children: [
        { name: "Transit pass", value: 110 },
        { name: "Bike", value: 30 },
        { name: "Trains", value: 120 },
      ],
    },
    {
      name: "Leisure",
      children: [
        { name: "Books", value: 40 },
        { name: "Music", value: 25 },
        { name: "Sport", value: 55 },
      ],
    },
    { name: "Savings", value: 300 },
  ],
};
const FLOW_NODES = [
  { id: "salary", label: "Salary", group: "Income" },
  { id: "freelance", label: "Freelance", group: "Income" },
  { id: "budget", label: "Budget", group: "Budget" },
  { id: "rent", label: "Rent", group: "Spending" },
  { id: "food", label: "Food", group: "Spending" },
  { id: "travel", label: "Travel", group: "Spending" },
  { id: "saved", label: "Saved", group: "Savings" },
];
const FLOW_LINKS = [
  { source: "salary", target: "budget", value: 2400 },
  { source: "freelance", target: "budget", value: 600 },
  { source: "budget", target: "rent", value: 1200 },
  { source: "budget", target: "food", value: 600 },
  { source: "budget", target: "travel", value: 300 },
  { source: "budget", target: "saved", value: 900 },
];
const LIBS = ["app", "ui", "charts", "maps", "maths", "motion", "three", "theme", "icons", "dates", "forms", "tests"];
const NET_NODES = LIBS.map((id, i) => ({ id, label: id[0]?.toUpperCase() + id.slice(1), group: i === 0 ? "App" : i < 6 ? "Library" : "Tool" }));
const NET_LINKS = [
  ["app", "ui"],
  ["app", "charts"],
  ["app", "maps"],
  ["app", "forms"],
  ["ui", "theme"],
  ["ui", "icons"],
  ["ui", "motion"],
  ["charts", "maths"],
  ["charts", "theme"],
  ["maps", "maths"],
  ["maps", "theme"],
  ["motion", "theme"],
  ["three", "theme"],
  ["app", "three"],
  ["forms", "ui"],
  ["forms", "dates"],
  ["tests", "app"],
].map(([source, target]) => ({ source: source ?? "", target: target ?? "" }));
const DAYS = (() => {
  const out: { day: string; count: number }[] = [];
  const start = Date.UTC(2026, 0, 1);
  for (let i = 0; i < 181; i++) {
    const at = new Date(start + i * 86400000);
    const weekday = at.getUTCDay();
    const r = random();
    if (r < 0.3) continue;
    out.push({ day: at.toISOString().slice(0, 10), count: Math.round((weekday === 0 || weekday === 6 ? 1 : 3) * r * 4) });
  }
  return out;
})();
const TASKS = [
  { id: "research", label: "Research", start: "2026-03-02", end: "2026-03-10", group: "Product", progress: 1 },
  { id: "design", label: "Design", start: "2026-03-09", end: "2026-03-20", group: "Product", progress: 1, dependsOn: ["research"] },
  { id: "build", label: "Build", start: "2026-03-16", end: "2026-04-10", group: "Product", progress: 0.45, dependsOn: ["design"] },
  { id: "test", label: "Test", start: "2026-04-06", end: "2026-04-17", group: "Product", progress: 0, dependsOn: ["build"] },
  { id: "story", label: "Write the story", start: "2026-03-23", end: "2026-04-03", group: "Marketing", progress: 0.6 },
  { id: "site", label: "Update the site", start: "2026-04-06", end: "2026-04-14", group: "Marketing", progress: 0, dependsOn: ["story"] },
  { id: "launch", label: "Launch", start: "2026-04-20", end: "2026-04-20", group: "Marketing", milestone: true, dependsOn: ["test", "site"] },
];
const TRIPS = [...Array.from({ length: 220 }, () => ({ km: round(normal(random, 3, 1.1)), fare: 0 })), ...Array.from({ length: 120 }, () => ({ km: round(normal(random, 12, 2.2)), fare: 0 }))].map(
  (trip) => ({ km: Math.max(0.3, trip.km), fare: round(3 + Math.max(0.3, trip.km) * 2.1 + normal(random, 0, 1.6)) }),
);
const PLANS = [
  { measure: "Speed", basic: 3, plus: 4, pro: 5 },
  { measure: "Storage", basic: 2, plus: 4, pro: 5 },
  { measure: "Support", basic: 2, plus: 3, pro: 5 },
  { measure: "Price", basic: 5, plus: 4, pro: 2 },
  { measure: "Security", basic: 3, plus: 4, pro: 5 },
  { measure: "Sharing", basic: 2, plus: 5, pro: 4 },
];
const PROFIT = [
  { step: "Revenue", amount: 500, total: true },
  { step: "Costs", amount: -220 },
  { step: "Marketing", amount: -80 },
  { step: "Other income", amount: 30 },
  { step: "Tax", amount: -46 },
  { step: "Profit", amount: 184, total: true },
];
const SIGNUP = [
  { step: "Visited", people: 1200 },
  { step: "Started", people: 640 },
  { step: "Confirmed email", people: 410 },
  { step: "Finished", people: 290 },
];
const PRICES = (() => {
  let close = 40;
  return Array.from({ length: 30 }, (_, i) => {
    const open = close;
    close = round(open + normal(random, 0, 1.4));
    return { day: new Date(Date.UTC(2026, 2, 2 + i)), open, high: round(Math.max(open, close) + random() * 1.2), low: round(Math.min(open, close) - random() * 1.2), close };
  });
})();
const LAPTOPS = Array.from({ length: 14 }, (_, i) => ({
  name: `Model ${String.fromCharCode(65 + i)}`,
  price: Math.round(600 + random() * 1200),
  weight: round(1 + random() * 1.6),
  battery: Math.round(6 + random() * 12),
  screen: round(13 + random() * 4),
  kind: i % 3 === 0 ? "Power" : i % 3 === 1 ? "Light" : "Value",
}));
const SATISFACTION = [
  { team: "Support", before: 62, after: 78 },
  { team: "Sales", before: 70, after: 74 },
  { team: "Product", before: 55, after: 71 },
  { team: "Finance", before: 66, after: 63 },
  { team: "Design", before: 72, after: 81 },
];
const GENRES = Array.from({ length: 12 }, (_, i) => ({
  year: 2015 + i,
  jazz: Math.round(20 + i * 2.5 + Math.sin(i) * 4),
  folk: Math.round(30 + Math.sin(i / 2) * 8),
  rock: Math.round(50 - i * 2 + Math.cos(i) * 3),
  electronic: Math.round(15 + i * 3),
}));
const MODES = [
  { mode: "Car", y2016: 52, y2026: 41 },
  { mode: "Bike", y2016: 9, y2026: 18 },
  { mode: "Transit", y2016: 24, y2026: 27 },
  { mode: "Walking", y2016: 13, y2026: 12 },
];
const DAILY = Array.from({ length: 180 }, (_, i) => ({ day: new Date(Date.UTC(2026, 0, 1 + i)), visits: Math.round(200 + i * 0.8 + Math.sin(i / 6) * 40 + normal(random, 0, 12)) }));

export function MoreCharts() {
  const [path, setPath] = useState<readonly string[]>([]);
  const [range, setRange] = useState<[number, number]>([120, 179]);
  return (
    <div className="grid gap-6 @3xl:grid-cols-2">
      <Demo title="Scatter and bubble">
        <ScatterChart
          label="Price against rating, bubbles sized by units sold"
          data={PRODUCTS}
          x="price"
          y="rating"
          size="sold"
          group="kind"
          name="name"
          xLabel="Price"
          yLabel="Rating"
          sizeLabel="Sold"
        />
      </Demo>
      <Demo title="Histogram">
        <Histogram label="Delivery times" data={TIMES} value="minutes" valueLabel="Minutes" bins={14} />
      </Demo>
      <Demo title="Box plot and violin">
        <div className="flex flex-col gap-6">
          <BoxPlot label="Response time by region" data={RESPONSES} group="region" value="ms" valueLabel="Milliseconds" />
          <BoxPlot label="Response time by region, as violins" data={RESPONSES} group="region" value="ms" variant="violin" colorBy="group" aspect={2} />
        </div>
      </Demo>
      <Demo title="Fan chart">
        <FanChart
          label="Visitors per week, observed and forecast"
          data={FORECAST}
          x="week"
          observed="observed"
          median="median"
          intervals={[
            { low: "low90", high: "high90", label: "90% interval" },
            { low: "low50", high: "high50", label: "50% interval" },
          ]}
          forecastFrom={14}
          xLabel="Week"
          labels={{ median: "Forecast (median)" }}
        />
      </Demo>
      <Demo title="Small multiples" className="@3xl:col-span-2">
        <SmallMultiples label="Monthly visits by region, on one shared scale" data={VISITS} facet="region" x="month" y="visits" kind="area" xLabel="Month" yLabel="Visits" />
      </Demo>
      <Demo title="Bars to 100 percent">
        <BarChart
          label="Orders by channel per quarter, as shares"
          data={CHANNELS}
          x="quarter"
          series={[
            { key: "web", label: "Web" },
            { key: "app", label: "App" },
            { key: "shop", label: "Shop" },
          ]}
          normalize
        />
      </Demo>
      <Demo title="Treemap">
        <Treemap label="Spending by area" data={SPENDING} path={path} onPathChange={setPath} />
        <p className="mt-2 text-sm text-muted-foreground" data-testid="treemap-path">
          {path.join(" / ") || "Top"}
        </p>
      </Demo>
      <Demo title="Sunburst">
        <Sunburst label="Spending by area, as rings" data={SPENDING} />
      </Demo>
      <Demo title="Circle packing">
        <CirclePack label="Spending by area, as circles" data={SPENDING} />
      </Demo>
      <Demo title="Sankey">
        <SankeyChart label="Where the money goes" nodes={FLOW_NODES} links={FLOW_LINKS} />
      </Demo>
      <Demo title="Network graph">
        <NetworkGraph label="Parts of an app and what they use" nodes={NET_NODES} links={NET_LINKS} />
      </Demo>
      <Demo title="Calendar heatmap" className="@3xl:col-span-2">
        <CalendarHeatmap label="Workouts per day" data={DAYS} day="day" value="count" from="2026-01-01" to="2026-06-30" valueLabel="Workouts" />
      </Demo>
      <Demo title="Gantt chart" className="@3xl:col-span-2">
        <GanttChart label="Launch plan" tasks={TASKS} today="2026-03-27" />
      </Demo>
      <Demo title="Density">
        <DensityChart label="Trip length against fare" data={TRIPS} x="km" y="fare" xLabel="Distance (km)" yLabel="Fare" />
      </Demo>
      <Demo title="Radar">
        <RadarChart
          label="Three plans compared"
          data={PLANS}
          axis="measure"
          series={[
            { key: "basic", label: "Basic" },
            { key: "plus", label: "Plus" },
            { key: "pro", label: "Pro" },
          ]}
          max={5}
        />
      </Demo>
      <Demo title="Waterfall">
        <WaterfallChart label="From revenue to profit" data={PROFIT} x="step" value="amount" total="total" />
      </Demo>
      <Demo title="Funnel">
        <FunnelChart label="Sign-up steps" data={SIGNUP} x="step" value="people" />
      </Demo>
      <Demo title="Bullet">
        <BulletChart
          label="Quarter targets"
          items={[
            { label: "Revenue", note: "thousands", value: 270, target: 250, ranges: [150, 225, 300] },
            { label: "New customers", value: 1400, target: 1600, ranges: [1000, 1500, 2000] },
            { label: "Satisfaction", note: "out of 5", value: 4.1, target: 4.3, ranges: [3, 4, 5] },
          ]}
        />
      </Demo>
      <Demo title="Candlestick">
        <CandlestickChart label="Price by day" data={PRICES} x="day" />
      </Demo>
      <Demo title="Chord diagram">
        <ChordDiagram
          label="Moves between neighbourhoods"
          names={["North", "South", "East", "West", "Centre"]}
          matrix={[
            [0, 120, 40, 30, 60],
            [80, 0, 60, 20, 40],
            [30, 90, 0, 50, 70],
            [20, 30, 40, 0, 35],
            [55, 45, 65, 30, 0],
          ]}
        />
      </Demo>
      <Demo title="Parallel coordinates" className="@3xl:col-span-2">
        <ParallelCoordinates
          label="Laptops compared"
          data={LAPTOPS}
          dimensions={[
            { key: "price", label: "Price" },
            { key: "weight", label: "Weight (kg)" },
            { key: "battery", label: "Battery (h)" },
            { key: "screen", label: "Screen (in)" },
          ]}
          name="name"
          group="kind"
        />
      </Demo>
      <Demo title="Dot plot">
        <div className="flex flex-col gap-6">
          <DotPlot
            label="Satisfaction before and after"
            data={SATISFACTION}
            y="team"
            series={[
              { key: "before", label: "Before" },
              { key: "after", label: "After" },
            ]}
            variant="dumbbell"
          />
          <DotPlot label="Every response time, by region" data={RESPONSES} y="region" series={[{ key: "ms", label: "Milliseconds" }]} variant="beeswarm" />
        </div>
      </Demo>
      <Demo title="Stream">
        <StreamChart
          label="Plays by genre"
          data={GENRES}
          x="year"
          series={[
            { key: "jazz", label: "Jazz" },
            { key: "folk", label: "Folk" },
            { key: "rock", label: "Rock" },
            { key: "electronic", label: "Electronic" },
          ]}
        />
      </Demo>
      <Demo title="Slope">
        <SlopeChart label="Share of trips by mode" data={MODES} name="mode" from="y2016" to="y2026" fromLabel="2016" toLabel="2026" />
      </Demo>
      <Demo title="Brush" className="@3xl:col-span-2">
        <div className="flex flex-col gap-3">
          <LineChart label="Visits per day, the stretch chosen below" data={DAILY.slice(range[0], range[1] + 1)} x="day" series={[{ key: "visits", label: "Visits" }]} aspect={3} />
          <ChartBrush data={DAILY} x="day" y="visits" value={range} onValueChange={setRange} labels={{ start: "From", end: "To", group: "Days shown" }} />
          <p className="text-sm text-muted-foreground" data-testid="brush-range">
            {range[0]}–{range[1]}
          </p>
        </div>
      </Demo>
    </div>
  );
}
