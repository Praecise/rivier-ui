"use client";
// Showcase: compare slider, certainty legend, provenance label.
//
// The pictures are drawn here as SVG, so the page needs no network and no picture file.

import { Landmark } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CertaintyLegend, CertaintySwatch, certaintyStyle, type CertaintyClass } from "@/components/ui/certainty-legend";
import { CompareSlider, CompareSliderFirst, CompareSliderHandle, CompareSliderLabels, CompareSliderSecond } from "@/components/ui/compare-slider";
import { ProvenanceFrame, ProvenanceLabel } from "@/components/ui/provenance-label";
import { VideoPlayer, VideoPlayerControls, VideoPlayerControlsRow, VideoPlayerFullscreen, VideoPlayerMute, VideoPlayerPlay, VideoPlayerTime, VideoPlayerVideo } from "@/components/ui/video-player";
import { Demo } from "./demo";

const picture = (label: string, shape: string, tone = "#888"): string =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice"><rect width="320" height="180" fill="${tone}" fill-opacity="0.22"/>${shape}<text x="160" y="168" font-family="sans-serif" font-size="12" text-anchor="middle" fill="${tone}">${label}</text></svg>`,
  )}`;

const THEN = picture("then", `<path d="M40 140 L40 80 L100 50 L160 80 L160 140 Z M190 140 L190 100 L250 100 L250 140 Z" fill="none" stroke="#888" stroke-width="3"/>`);
const NOW = picture("now", `<path d="M40 140 L40 40 L160 40 L160 140 Z M190 140 L190 60 L280 60 L280 140 Z" fill="#888" fill-opacity="0.5" stroke="#888" stroke-width="3"/>`);

const CLASSES: CertaintyClass[] = [
  { id: "recorded", label: "Recorded", description: "Measured on site" },
  { id: "inferred", label: "Inferred", description: "Worked out from what remains" },
  { id: "imagined", label: "Imagined", description: "Drawn to complete the picture" },
];

const FOUR: CertaintyClass[] = [
  { id: "standing", label: "Standing" },
  { id: "excavated", label: "Excavated" },
  { id: "described", label: "Described" },
  { id: "guessed", label: "Guessed" },
];

/** A drawing whose parts are marked by class, with the same patterns as the legend. */
function Plan({ shown }: { shown: readonly string[] }) {
  return (
    <div data-testid="plan" role="img" aria-label={`A plan showing: ${shown.join(", ") || "nothing"}`} className="grid grid-cols-3 gap-2 rounded-surface border p-3">
      {CLASSES.map((item, index) => (
        <div key={item.id} data-part={item.id} className="flex aspect-square items-center justify-center">
          {shown.includes(item.id) ? <CertaintySwatch {...certaintyStyle(index)} className="size-full" /> : null}
        </div>
      ))}
    </div>
  );
}

const SOURCES = (
  <>
    <p className="font-medium">How this picture was made</p>
    <ul className="list-disc ps-4 text-muted-foreground">
      <li>The survey of 1890, sheet 14</li>
      <li>Two photographs from the town archive</li>
    </ul>
    <p className="text-muted-foreground">
      The roof is a guess.{" "}
      <a href="#evidence-title" className="underline">
        How we reconstruct
      </a>
    </p>
  </>
);

export function Evidence() {
  const [changed, setChanged] = useState(50);
  const [committed, setCommitted] = useState<number | null>(null);
  const [split, setSplit] = useState(30);
  const [pressed, setPressed] = useState("nothing yet");
  const [shown, setShown] = useState<string[]>(CLASSES.map((item) => item.id));
  const [last, setLast] = useState("nothing yet");
  const [four, setFour] = useState<readonly string[]>(["standing", "excavated"]);
  const [open, setOpen] = useState(false);

  return (
    <div className="grid gap-4 @3xl:grid-cols-2">
      <Demo title="Compare slider">
        <div className="flex flex-col gap-3">
          <CompareSlider aspect={16 / 9} labels={{ first: "1930", second: "Today" }} aria-label="The street in 1930 and today" onValueChange={setChanged} onValueCommit={setCommitted}>
            <CompareSliderFirst>
              <img src={THEN} alt="The street in 1930: a gabled house and a shed" />
            </CompareSliderFirst>
            <CompareSliderSecond>
              <img src={NOW} alt="The street today: two flat-roofed blocks" />
            </CompareSliderSecond>
            <CompareSliderLabels />
            <CompareSliderHandle />
          </CompareSlider>
          <p className="text-sm text-muted-foreground">
            Uncontrolled. Changed to <span data-testid="compare-changed">{Math.round(changed)}</span>, let go at{" "}
            <span data-testid="compare-committed">{committed === null ? "nothing yet" : Math.round(committed)}</span>. Keys: arrows, Shift with an arrow, Page Up and Down, Home, End.
          </p>
        </div>
      </Demo>

      <Demo title="Compare slider: any two children">
        <div className="flex flex-col gap-3">
          <CompareSlider
            value={split}
            onValueChange={setSplit}
            labels={{ first: "Survey", second: "Reconstruction" }}
            valueText={(value, labels) => `${labels.first} up to ${Math.round(value)} percent`}
            aria-label="Survey and reconstruction"
            className="h-56"
          >
            <CompareSliderFirst className="flex items-end justify-start bg-card p-3">
              <Button variant="outline" size="sm" onClick={() => setPressed("survey")}>
                Open the survey
              </Button>
            </CompareSliderFirst>
            <CompareSliderSecond className="flex items-end justify-end bg-highlight-soft p-3">
              <Button variant="outline" size="sm" onClick={() => setPressed("reconstruction")}>
                Open the reconstruction
              </Button>
            </CompareSliderSecond>
            <CompareSliderLabels />
            <CompareSliderHandle />
          </CompareSlider>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setSplit(0)}>
              All reconstruction
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSplit(100)}>
              All survey
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Controlled: <span data-testid="compare-split">{Math.round(split)}</span>. Pressed: <span data-testid="compare-pressed">{pressed}</span>. The layers keep their own controls; only the divider belongs to the slider.
          </p>
          <CompareSlider disabled defaultValue={70} labels={{ first: "Draft", second: "Final" }} aria-label="Draft and final, fixed" className="h-20">
            <CompareSliderFirst className="bg-card" />
            <CompareSliderSecond className="bg-highlight-soft" />
            <CompareSliderLabels />
            <CompareSliderHandle />
          </CompareSlider>
        </div>
      </Demo>

      <Demo title="Certainty legend">
        <div className="flex flex-col gap-4">
          <CertaintyLegend
            aria-label="How sure each part is"
            classes={CLASSES}
            onValueChange={(next, change) => {
              setShown(next);
              setLast(`${change.id} ${change.shown ? "shown" : "hidden"}`);
            }}
          />
          <Plan shown={shown} />
          <p className="text-sm text-muted-foreground">
            Uncontrolled. Shown: <span data-testid="legend-shown">{shown.join(", ") || "none"}</span>. Last change: <span data-testid="legend-last">{last}</span>.
          </p>
        </div>
      </Demo>

      <Demo title="Certainty legend: four classes, controlled">
        <div className="flex flex-col gap-4">
          <CertaintyLegend aria-label="Kinds of evidence" classes={FOUR} value={four} onValueChange={setFour} />
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setFour(FOUR.map((item) => item.id))}>
              Show every kind
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Shown: <span data-testid="legend-four">{four.join(", ") || "none"}</span>.
          </p>
          <CertaintyLegend aria-label="Key only" classes={CLASSES.map(({ id, label }) => ({ id, label }))} disabled />
        </div>
      </Demo>

      <Demo title="Provenance label: in a frame">
        <div className="flex flex-col gap-3">
          <ProvenanceFrame aria-label="The mill, reconstructed">
            <ProvenanceLabel details={SOURCES} icon={<Landmark strokeWidth={1.5} />} open={open} onOpenChange={setOpen}>
              Imagined reconstruction
            </ProvenanceLabel>
            <VideoPlayer aria-label="The mill as it may have looked" className="rounded-none border-0">
              <VideoPlayerVideo poster={THEN} />
              <VideoPlayerControls>
                <VideoPlayerControlsRow>
                  <VideoPlayerPlay />
                  <VideoPlayerMute />
                  <VideoPlayerTime />
                  <VideoPlayerFullscreen className="ms-auto" />
                </VideoPlayerControlsRow>
              </VideoPlayerControls>
            </VideoPlayer>
          </ProvenanceFrame>
          <p className="text-sm text-muted-foreground">
            The label has its own row above the player. Details are <span data-testid="provenance-open">{open ? "open" : "closed"}</span> (controlled).
          </p>
        </div>
      </Demo>

      <Demo title="Provenance label: over the media">
        <div className="flex flex-col gap-3">
          <VideoPlayer aria-label="The street, reconstructed">
            <VideoPlayerVideo poster={NOW} />
            <ProvenanceLabel position="top-start" details={<p>Made from the survey of 1890. Nothing here is a photograph.</p>} detailsLabel="how it was made">
              Reconstruction
            </ProvenanceLabel>
            <VideoPlayerControls>
              <VideoPlayerControlsRow>
                <VideoPlayerPlay />
                <VideoPlayerMute />
                <VideoPlayerTime />
                <VideoPlayerFullscreen className="ms-auto" />
              </VideoPlayerControlsRow>
            </VideoPlayerControls>
          </VideoPlayer>
          <div className="relative overflow-hidden rounded-surface border">
            <img src={THEN} alt="The street in 1930" className="aspect-video w-full object-cover" />
            <ProvenanceLabel position="top-end">Photograph, 1930</ProvenanceLabel>
          </div>
          <p className="text-sm text-muted-foreground">Inside the player, in a top corner above its controls: it stays in full screen. Without details it is plain text.</p>
        </div>
      </Demo>
    </div>
  );
}
