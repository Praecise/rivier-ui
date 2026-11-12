"use client";
// Showcase: 3D scenes and charts. All figures are example data.

import { FloatingShapes } from "@/components/three/floating-shapes";
import { Globe } from "@/components/three/globe";
import { ModelStage } from "@/components/three/model-stage";
import { Orb } from "@/components/three/orb";
import { ParticleField } from "@/components/three/particle-field";
import { Scene } from "@/components/three/scene";
import { Stat } from "@/components/ui/stat";
import { AreaChart } from "@/components/viz/area-chart";
import { BarChart } from "@/components/viz/bar-chart";
import { DonutChart } from "@/components/viz/donut-chart";
import { Heatmap } from "@/components/viz/heatmap";
import { LineChart } from "@/components/viz/line-chart";
import { RadialProgress } from "@/components/viz/radial-progress";
import { Sparkline } from "@/components/viz/sparkline";
import { Demo } from "./demo";

export function Three() {
  return (
    <div className="grid gap-4 @3xl:grid-cols-2">
      <Demo title="Orb">
        <Scene aspect={16 / 9} label="A slowly morphing sphere in the highlight colour">
          <Orb />
        </Scene>
      </Demo>
      <Demo title="Globe">
        <Scene aspect={16 / 9} label="A dotted globe with three markers">
          <Globe
            markers={[
              { lat: 52.37, lon: 4.9 },
              { lat: 4.17, lon: 73.51 },
              { lat: 37.77, lon: -122.42 },
            ]}
          />
        </Scene>
      </Demo>
      <Demo title="Floating shapes">
        <Scene aspect={16 / 9}>
          <FloatingShapes />
        </Scene>
      </Demo>
      <Demo title="Particle field">
        <Scene aspect={16 / 9}>
          <ParticleField />
        </Scene>
      </Demo>
      <Demo title="Model stage" className="@3xl:col-span-2">
        <Scene aspect={3} label="A turning torus knot; drag to orbit">
          <ModelStage>
            <mesh>
              <torusKnotGeometry args={[1, 0.32, 128, 16]} />
              <meshStandardMaterial flatShading />
            </mesh>
          </ModelStage>
        </Scene>
      </Demo>
    </div>
  );
}

const DAYS = Array.from({ length: 12 }, (_, index) => {
  const requests = [120, 180, 150, 210, 260, 240, 300, 280, 340, 390, 370, 430][index] ?? 0;
  const errors = [14, 19, 13, 22, 18, 25, 21, 30, 24, 28, 35, 31][index] ?? 0;
  return { day: new Date(Date.UTC(2026, 2, index + 1)), requests, errors: errors * 4 };
});

const MONTHS = [
  { month: new Date(Date.UTC(2026, 0, 1)), images: 12, video: 30, audio: 6 },
  { month: new Date(Date.UTC(2026, 1, 1)), images: 18, video: 42, audio: 9 },
  { month: new Date(Date.UTC(2026, 2, 1)), images: 22, video: 61, audio: 11 },
  { month: new Date(Date.UTC(2026, 3, 1)), images: 27, video: 70, audio: 16 },
  { month: new Date(Date.UTC(2026, 4, 1)), images: 35, video: 84, audio: 18 },
];

const QUARTERS = [
  { quarter: "Q1", web: 320, app: 210 },
  { quarter: "Q2", web: 410, app: 290 },
  { quarter: "Q3", web: 380, app: 350 },
  { quarter: "Q4", web: 460, app: 420 },
];

const SOURCES = [
  { source: "Search", visits: 5200 },
  { source: "Direct", visits: 3100 },
  { source: "Referral", visits: 1400 },
  { source: "Social", visits: 900 },
];

const HOURS = ["09", "10", "11", "12", "13", "14", "15", "16"];
const SESSIONS = ["Mon", "Tue", "Wed", "Thu", "Fri"].flatMap((day, d) => HOURS.map((hour, h) => ({ day, hour, sessions: 6 + ((d * 7 + h * 5 + d * h) % 23) })));

export function Charts() {
  return (
    <div className="grid gap-4 @3xl:grid-cols-2">
      <Demo title="Line chart">
        <LineChart
          label="Example: requests and errors per day"
          data={DAYS}
          x="day"
          series={[
            { key: "requests", label: "Requests" },
            { key: "errors", label: "Errors" },
          ]}
        />
      </Demo>
      <Demo title="Area chart, stacked">
        <AreaChart
          label="Example: storage used per month, by kind"
          data={MONTHS}
          x="month"
          series={[
            { key: "images", label: "Images" },
            { key: "video", label: "Video" },
            { key: "audio", label: "Audio" },
          ]}
          stacked
        />
      </Demo>
      <Demo title="Bar chart">
        <BarChart
          label="Example: orders by channel per quarter"
          data={QUARTERS}
          x="quarter"
          series={[
            { key: "web", label: "Web" },
            { key: "app", label: "App" },
          ]}
          showValues
        />
      </Demo>
      <Demo title="Donut chart">
        <DonutChart label="Example: traffic by source" data={SOURCES} name="source" value="visits" centerLabel="Visits" />
      </Demo>
      <Demo title="Heatmap">
        <Heatmap label="Example: sessions by day and hour" data={SESSIONS} x="hour" y="day" value="sessions" />
      </Demo>
      <Demo title="Radial progress, sparkline, stat">
        <div className="grid items-center gap-4 @sm:grid-cols-2">
          <RadialProgress value={72} label="Storage used" className="mx-auto w-40" />
          <Stat
            label="Signups"
            value="1,204"
            change="12%"
            direction="up"
            tone="positive"
            changeLabel="than last week"
            chart={<Sparkline data={[4, 6, 5, 9, 12, 10, 14]} label="Example: signups, last 7 days" />}
          />
        </div>
      </Demo>
    </div>
  );
}
