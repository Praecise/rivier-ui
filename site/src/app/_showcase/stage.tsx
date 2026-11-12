"use client";
// Showcase: film-stage, with the scrubber, scene strip, captions and hotspots it composes.
//
// The scenes are plain markup and SVG drawn from each scene's own time, and the narration is a quiet tone
// made in the browser as a WAV file, so the page needs no network and no media file.

import { useRef, useState, useSyncExternalStore } from "react";
import {
  FilmStage,
  FilmStageAudio,
  FilmStageCaptionsButton,
  FilmStageControls,
  FilmStageControlsRow,
  FilmStageFrame,
  FilmStageMute,
  FilmStagePlay,
  FilmStageRate,
  FilmStageSceneStrip,
  FilmStageScrubber,
  FilmStageTime,
  useFilmClock,
  type FilmScene,
  type FilmStageHandle,
} from "@/components/motion/film-stage";
import { Button } from "@/components/ui/button";
import { Captions, type Cue } from "@/components/ui/captions";
import { HotspotList, Hotspots, type HotspotSpec } from "@/components/ui/hotspots";
import { Input } from "@/components/ui/input";
import { Demo } from "./demo";

const SECONDS = 20;
const SAMPLE_RATE = 8000;

/** Twenty seconds of a quiet tone that swells and fades, as the bytes of a WAV file. */
function toneBytes(): ArrayBuffer {
  const samples = SECONDS * SAMPLE_RATE;
  const buffer = new ArrayBuffer(44 + samples * 2);
  const view = new DataView(buffer);
  const text = (offset: number, value: string): void => {
    for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index));
  };
  text(0, "RIFF");
  view.setUint32(4, 36 + samples * 2, true);
  text(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, samples * 2, true);
  for (let index = 0; index < samples; index += 1) {
    const at = index / SAMPLE_RATE;
    const swell = 0.03 + 0.1 * Math.abs(Math.sin(at * 0.9)) * Math.abs(Math.sin(at * 2.3 + 1));
    view.setInt16(44 + index * 2, Math.round(Math.sin(at * 2 * Math.PI * 220) * swell * 32767), true);
  }
  return buffer;
}

let url: string | undefined;
const toneUrl = (): string => (url ??= URL.createObjectURL(new Blob([toneBytes()], { type: "audio/wav" })));
const subscribe = (): (() => void) => () => {};
const noUrl = (): string | undefined => undefined;

const picture = (label: string): string =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 90"><rect width="160" height="90" fill="#888" fill-opacity="0.25"/><text x="80" y="52" font-family="sans-serif" font-size="22" text-anchor="middle" fill="#888">${label}</text></svg>`,
  )}`;

const BAR_FILLS = ["fill-chart-1", "fill-chart-2", "fill-chart-3", "fill-chart-4", "fill-chart-5"];

const SCENES: FilmScene[] = [
  {
    id: "title",
    duration: 4,
    label: "Title",
    picture: <img src={picture("1")} alt="" />,
    children: (
      <div className="flex size-full items-center justify-center bg-card p-[6cqi] text-center">
        <p className="text-[clamp(1rem,6cqi,3rem)] font-medium tracking-tight">A film made of markup</p>
      </div>
    ),
  },
  {
    id: "circle",
    duration: 6,
    label: "A circle crosses",
    transition: "crossfade",
    picture: <img src={picture("2")} alt="" />,
    render: ({ progress }) => (
      <svg viewBox="0 0 160 90" className="size-full bg-highlight-soft" aria-hidden="true">
        <line x1="20" y1="60" x2="140" y2="60" className="stroke-border-strong" strokeWidth="1" />
        <circle data-testid="circle" data-x={(20 + progress * 120).toFixed(2)} cx={20 + progress * 120} cy="45" r="12" className="fill-primary" />
      </svg>
    ),
  },
  {
    id: "bars",
    duration: 5,
    label: "Bars rise",
    picture: <img src={picture("3")} alt="" />,
    render: ({ progress }) => (
      <svg viewBox="0 0 160 90" className="size-full bg-card" aria-hidden="true">
        {BAR_FILLS.map((fill, index) => {
          const height = 60 * Math.min(1, Math.max(0, progress * 2 - index * 0.2));
          return <rect key={fill} x={30 + index * 22} y={80 - height} width="14" height={height} className={fill} />;
        })}
      </svg>
    ),
  },
  {
    id: "end",
    duration: 5,
    label: "The end",
    transition: "crossfade",
    picture: <img src={picture("4")} alt="" />,
    render: ({ progress }) => (
      <div className="flex size-full items-center justify-center bg-muted p-[6cqi] text-center">
        <p className="text-[clamp(1rem,6cqi,3rem)] font-medium tracking-tight" style={{ opacity: 0.4 + 0.6 * progress }}>
          The end
        </p>
      </div>
    ),
  },
];

const CUES: Cue[] = [
  { start: 0, end: 4, text: "A film made of markup." },
  { start: 4, end: 10, text: "Each scene draws itself from its own time." },
  { start: 10, end: 15, text: "هذه الجملة تُكتب من اليمين إلى اليسار." },
  { start: 15, end: 20, text: "The last line." },
];

const SPOTS: HotspotSpec[] = [{ id: "circle", x: 50, y: 30, start: 5, end: 9, label: "The circle" }];

/** The clock as text, for the checks: the time to a hundredth of a second, and whether it is running. */
function Readout({ name }: { name: string }) {
  const { time, running } = useFilmClock();
  return (
    <p className="text-sm text-muted-foreground">
      Clock: <span data-testid={`${name}-time`}>{time.toFixed(2)}</span> seconds, <span data-testid={`${name}-running`}>{running ? "running" : "still"}</span>.
    </p>
  );
}

export function Stage() {
  const src = useSyncExternalStore(subscribe, toneUrl, noUrl);
  const [chosen, setChosen] = useState("nothing yet");
  const [time, setTime] = useState(2);
  const [playing, setPlaying] = useState(false);
  const handle = useRef<FilmStageHandle>(null);
  const [moment, setMoment] = useState("7");
  const [drawn, setDrawn] = useState("nothing yet");

  return (
    <div className="grid gap-4 @3xl:grid-cols-2">
      <Demo title="Film stage" className="@3xl:col-span-2">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
          <FilmStage scenes={SCENES} aria-label="A film made of markup" data-testid="film">
            <FilmStageFrame>
              <Hotspots hotspots={SPOTS} onSelect={(spot) => setChosen(spot.label)} />
              <Captions cues={CUES} lang="en" />
            </FilmStageFrame>
            <FilmStageAudio src={src} />
            <FilmStageControls>
              <FilmStageScrubber />
              <FilmStageControlsRow>
                <FilmStagePlay />
                <FilmStageMute />
                <FilmStageTime />
                <FilmStageCaptionsButton className="ms-auto" />
                <FilmStageRate />
              </FilmStageControlsRow>
            </FilmStageControls>
            <HotspotList hotspots={SPOTS} onSelect={(spot) => setChosen(spot.label)} aria-label="In this scene" empty="Nothing to choose at this moment." />
            <FilmStageSceneStrip />
            <Readout name="film" />
          </FilmStage>
          <p className="text-sm text-muted-foreground">
            Chosen: <span data-testid="film-chosen">{chosen}</span>. Uncontrolled, twenty seconds in four scenes, with a tone as narration. Keys: Space or K, Left and Right, Home, End, M.
          </p>
        </div>
      </Demo>

      <Demo title="Controlled">
        <div className="flex flex-col gap-3">
          <FilmStage scenes={SCENES} time={time} onTimeChange={setTime} playing={playing} onPlayingChange={setPlaying} seekStep={1} aria-label="The same film, driven by the page">
            <FilmStageFrame aspect={4 / 3} />
            <FilmStageControls>
              <FilmStageScrubber />
              <FilmStageControlsRow>
                <FilmStagePlay />
                <FilmStageTime />
                <FilmStageMute className="ms-auto" />
              </FilmStageControlsRow>
            </FilmStageControls>
          </FilmStage>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setTime(7)}>
              Go to 0:07
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPlaying((value) => !value)}>
              {playing ? "Stop it" : "Start it"}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            The page holds the time (<span data-testid="controlled-time">{time.toFixed(2)}</span>) and whether it plays (<span data-testid="controlled-playing">{playing ? "yes" : "no"}</span>). No sound is attached, so mute is disabled and M does nothing.
          </p>
        </div>
      </Demo>

      <Demo title="Drawn on request">
        <div className="flex flex-col gap-3">
          <FilmStage scenes={SCENES} deterministic exportName="demo" handleRef={handle} aria-label="The same film, drawn one moment at a time">
            <FilmStageFrame>
              <Captions cues={CUES} lang="en" />
            </FilmStageFrame>
            <FilmStageControls>
              <FilmStageControlsRow>
                <FilmStagePlay />
                <FilmStageTime />
              </FilmStageControlsRow>
            </FilmStageControls>
            <Readout name="drawn" />
          </FilmStage>
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void handle.current?.renderAt(Number(moment)).then((at) => setDrawn(at.toFixed(2)));
            }}
          >
            <label className="flex flex-col gap-1 text-sm">
              Moment, in seconds
              <Input type="number" min={0} max={20} step="0.01" value={moment} onChange={(event) => setMoment(event.target.value)} className="w-32" />
            </label>
            <Button type="submit" variant="outline">
              Draw it
            </Button>
          </form>
          <p className="text-sm text-muted-foreground">
            Drawn: <span data-testid="drawn-at">{drawn}</span>. In this mode no timer runs on the page; an exporter calls <code>window.__filmStage.demo.renderAt(seconds)</code> for each frame.
          </p>
        </div>
      </Demo>
    </div>
  );
}
