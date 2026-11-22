"use client";
// Showcase: explainers. A film written as plain data: every kind of scene, captions, a narration cue and a
// provenance label on each scene; the same film drawn frame by frame for export; and a spec to edit, with its
// faults in words. The river, the town and all the numbers are invented. Pictures are SVG drawn here, the
// model is the computed vase in /models, and the narration is a tone from /sounds.

import { useMemo, useState } from "react";
import { FilmStageFrame, FilmStagePlay, FilmStageScrubber, FilmStageControls, FilmStageControlsRow, FilmStageTime } from "@/components/motion/film-stage";
import { Explainer, ExplainerCaptions, ExplainerProvenance } from "@/components/motion/explainer";
import { Textarea } from "@/components/ui/textarea";
import type { ExplainerSpec } from "@/lib/explainer-spec";
import { Demo } from "./demo";

const picture = (label: string, water: number): string =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice"><rect width="320" height="180" fill="#dde3e8"/><path d="M0 ${180 - water} C80 ${170 - water} 160 ${190 - water} 320 ${175 - water} V180 H0 Z" fill="#7aa7d6"/><path d="M40 ${150 - water} V90 L70 70 L100 90 V${150 - water} Z M200 ${150 - water} V100 H260 V${150 - water} Z" fill="#8a949c"/><text x="160" y="24" font-family="sans-serif" font-size="14" text-anchor="middle" fill="#3a444c">${label}</text></svg>`,
  )}`;

const DAYS = Array.from({ length: 14 }, (_, i) => ({ day: i + 1, level: Math.round((1.8 + Math.max(0, Math.sin((i - 2) / 3)) * 2.4 + i * 0.05) * 100) / 100 }));
const DISTRICTS = {
  type: "FeatureCollection" as const,
  features: Array.from({ length: 12 }, (_, i) => {
    const x0 = 4 + (i % 4) * 2;
    const y0 = 46 + Math.floor(i / 4) * 2;
    return {
      type: "Feature" as const,
      id: `d${i}`,
      properties: { name: `Ward ${i + 1}`, flooded: Math.round(((i * 37) % 60) + (i % 4) * 8) },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [x0, y0],
            [x0, y0 + 2],
            [x0 + 2, y0 + 2],
            [x0 + 2, y0],
            [x0, y0],
          ],
        ],
      },
    };
  }),
};

export const SPEC: ExplainerSpec = {
  title: "How the river rose",
  lang: "en",
  transition: "crossfade",
  scenes: [
    { id: "intro", kind: "title", duration: 3, title: "How the river rose", subtitle: "An invented town, spring 2026", captions: [{ start: 0.3, end: 2.8, text: "Two weeks in an invented town." }] },
    {
      id: "levels",
      kind: "chart",
      duration: 5,
      title: "The level, day by day",
      chart: "line-chart",
      props: { label: "Water level by day, in metres", data: DAYS, x: "day", series: [{ key: "level", label: "Level (m)" }], xLabel: "Day" },
      captions: [
        { start: 0.4, end: 2.6, text: "The river rose for six days." },
        { start: 2.6, end: 4.9, text: "Then it fell back slowly." },
      ],
      narration: { src: "/sounds/2s-330hz.wav", start: 0.4, volume: 0.4 },
      provenance: { kind: "measured", note: "gauge readings", sources: ["Gauge at the old bridge, read every hour", "Averaged to one reading a day"] },
    },
    {
      id: "wards",
      kind: "map",
      duration: 5,
      title: "Where the water reached",
      label: "Share of each ward under water",
      geojson: DISTRICTS,
      projection: "mercator",
      layers: [{ type: "choropleth", label: "Share flooded", valueProperty: "flooded", nameProperty: "name", thresholds: [20, 40, 60], valueLabel: "Flooded (%)" }],
      camera: { from: { k: 1, x: 0, y: 0 }, to: { k: 1.6, x: -120, y: -40 } },
      captions: [{ start: 0.4, end: 4.6, text: "The low wards by the bend were worst hit." }],
      provenance: { kind: "reconstructed", note: "from photographs and reports" },
    },
    {
      id: "bridge",
      kind: "compare",
      duration: 4,
      label: "The old bridge before and during the flood",
      before: { src: picture("Before", 10), alt: "The bridge over a low river", label: "Before" },
      after: { src: picture("During", 70), alt: "The river up to the bridge's deck", label: "During" },
      captions: [{ start: 0.3, end: 3.8, text: "The water came up to the deck of the old bridge." }],
      provenance: { kind: "invented", note: "drawn for this example" },
    },
    {
      id: "vase",
      kind: "model",
      duration: 4,
      title: "What was found in the mud",
      src: "/models/vase.glb",
      alt: "A clay vase with a painted belt",
      turn: 90,
      provenance: { kind: "generated", note: "a computed model" },
    },
    { id: "voice", kind: "quote", duration: 4, text: "We moved everything upstairs on the third night, and slept by the window.", attribution: "A resident (invented)" },
    { id: "end", kind: "caption", duration: 3, text: "The level is back to normal. The gauge is read every hour.", picture: { src: picture("After", 5), alt: "" } },
  ],
};

const BROKEN = `{
  "title": "Broken on purpose",
  "scenes": [
    { "id": "one", "kind": "title", "duration": 3000, "title": "A title" },
    { "id": "one", "kind": "chart", "duration": 4, "chart": "pie-chart", "props": {} },
    { "id": "three", "kind": "map", "duration": 4, "geojson": {}, "provenance": { "kind": "guessed" } }
  ]
}`;

export function Explainers() {
  const [text, setText] = useState(() => JSON.stringify({ title: "A short one", scenes: [SPEC.scenes[0], SPEC.scenes[1]] }, null, 2));
  const parsed = useMemo((): { spec: ExplainerSpec | null; error: string } => {
    try {
      return { spec: JSON.parse(text) as ExplainerSpec, error: "" };
    } catch (error) {
      return { spec: null, error: error instanceof Error ? error.message : String(error) };
    }
  }, [text]);
  return (
    <div className="grid gap-6">
      <Demo title="From a spec">
        <Explainer spec={SPEC} />
      </Demo>
      <Demo title="Drawn for export">
        <p className="mb-3 text-sm text-muted-foreground">
          Deterministic: nothing moves by itself. <code className="font-mono text-xs">scripts/export-film.ts</code> calls <code className="font-mono text-xs">window.__filmStage.demo.renderAt(t)</code>{" "}
          for each frame and saves it.
        </p>
        <Explainer spec={SPEC} deterministic exportName="demo">
          <FilmStageFrame>
            <ExplainerProvenance />
            <ExplainerCaptions />
          </FilmStageFrame>
          <FilmStageControls>
            <FilmStageScrubber />
            <FilmStageControlsRow>
              <FilmStagePlay />
              <FilmStageTime />
            </FilmStageControlsRow>
          </FilmStageControls>
        </Explainer>
      </Demo>
      <Demo title="Write a spec">
        <div className="grid gap-4 @3xl:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="spec" className="text-sm font-medium">
              Spec (JSON)
            </label>
            <Textarea id="spec" value={text} onChange={(event) => setText(event.target.value)} className="min-h-72 font-mono text-xs" spellCheck={false} />
            <button type="button" className="self-start text-sm underline underline-offset-4" onClick={() => setText(BROKEN)}>
              Load a spec with faults
            </button>
          </div>
          <div className="flex min-w-0 flex-col gap-2" data-testid="spec-result">
            {parsed.error ? (
              <p role="alert" className="text-sm">
                Not JSON: {parsed.error}
              </p>
            ) : parsed.spec ? (
              <Explainer spec={parsed.spec} />
            ) : null}
          </div>
        </div>
      </Demo>
    </div>
  );
}
