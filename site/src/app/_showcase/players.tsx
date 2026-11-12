"use client";
// Showcase: scrubber, video player, captions and transcript, audio player.
//
// The clip is made in the browser (twenty seconds of a quiet tone as a WAV file), so the page needs no
// network and no media file. The video player plays it too: a <video> plays sound alone, with its poster.

import { useEffect, useState, useSyncExternalStore } from "react";
import { AudioPlayer, AudioPlayerAudio, AudioPlayerMute, AudioPlayerPlay, AudioPlayerRate, AudioPlayerTime, AudioPlayerWaveform, computePeaks } from "@/components/ui/audio-player";
import { Captions, Transcript, type Cue } from "@/components/ui/captions";
import { HotspotList, Hotspots, type HotspotSpec } from "@/components/ui/hotspots";
import { SceneStrip, type Scene } from "@/components/ui/scene-strip";
import { Scrubber, ScrubberPreview, ScrubberThumb, ScrubberTrack, type ScrubberMark } from "@/components/ui/scrubber";
import {
  VideoPlayer,
  VideoPlayerCaptionsButton,
  VideoPlayerControls,
  VideoPlayerControlsRow,
  VideoPlayerError,
  VideoPlayerFullscreen,
  VideoPlayerLoading,
  VideoPlayerMute,
  VideoPlayerPlay,
  VideoPlayerProvider,
  VideoPlayerRate,
  VideoPlayerScrubber,
  VideoPlayerTime,
  VideoPlayerVideo,
  VideoPlayerVolume,
} from "@/components/ui/video-player";
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
    const swell = 0.03 + 0.12 * Math.abs(Math.sin(at * 0.9)) * Math.abs(Math.sin(at * 2.3 + 1));
    view.setInt16(44 + index * 2, Math.round(Math.sin(at * 2 * Math.PI * 220) * swell * 32767), true);
  }
  return buffer;
}

let bytes: ArrayBuffer | undefined;
let url: string | undefined;
const tone = (): ArrayBuffer => (bytes ??= toneBytes());
const toneUrl = (): string => (url ??= URL.createObjectURL(new Blob([tone()], { type: "audio/wav" })));
const subscribe = (): (() => void) => () => {};
const noUrl = (): string | undefined => undefined;

const picture = (label: string, tone = "#888"): string =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 90"><rect width="160" height="90" fill="${tone}" fill-opacity="0.25"/><circle cx="80" cy="45" r="26" fill="none" stroke="${tone}" stroke-width="2"/><text x="80" y="50" font-family="sans-serif" font-size="13" text-anchor="middle" fill="${tone}">${label}</text></svg>`,
  )}`;

/** A sheet of ten stills, five across and two down, one for every twenty seconds. */
const SPRITE = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 180">${Array.from({ length: 10 }, (_, index) => {
    const x = (index % 5) * 160;
    const y = Math.floor(index / 5) * 90;
    return `<rect x="${x}" y="${y}" width="160" height="90" fill="#888" fill-opacity="${0.15 + index * 0.06}"/><text x="${x + 80}" y="${y + 52}" font-family="sans-serif" font-size="22" text-anchor="middle" fill="#888">${index + 1}</text>`;
  }).join("")}</svg>`,
)}`;

const MARKS: ScrubberMark[] = [
  { time: 0, label: "Opening" },
  { time: 60, label: "The climb" },
  { time: 140, label: "The view" },
];

const CUES: Cue[] = [
  { start: 0, end: 4, text: "This clip is a quiet tone." },
  { start: 4, end: 8, text: "It was made in the browser,\nso the page needs no file." },
  { start: 8, end: 12, text: "Captions are drawn by the page." },
  { start: 12, end: 16, text: "هذه الجملة تُكتب من اليمين إلى اليسار." },
  { start: 16, end: 20, text: "The last line." },
];

const SCENES: Scene[] = [
  { start: 0, label: "Opening", picture: <img src={picture("1")} alt="" /> },
  { start: 4, label: "In the browser", picture: <img src={picture("2")} alt="" /> },
  { start: 8, label: "Captions", picture: <img src={picture("3")} alt="" /> },
  { start: 12, label: "Another script", picture: <img src={picture("4")} alt="" /> },
  { start: 16, label: "The end", picture: <img src={picture("5")} alt="" /> },
];

const SPOTS: HotspotSpec[] = [
  { id: "ring", x: 50, y: 20, start: 2, end: 9, label: "The ring" },
  { id: "corner", x: 12, y: 30, start: 6, end: 14, label: "The corner" },
];

const GERMAN = ["Dieser Clip ist ein leiser Ton.", "Er wurde im Browser erzeugt.", "Die Untertitel zeichnet die Seite.", "Ein Satz auf Deutsch.", "Die letzte Zeile."];

/** Gives the video two caption tracks, as <track> elements would. */
function addTracks(video: HTMLVideoElement | null): void {
  if (!video || video.textTracks.length > 0) return;
  const english = video.addTextTrack("captions", "English", "en");
  const german = video.addTextTrack("captions", "Deutsch", "de");
  CUES.forEach((cue, index) => {
    english.addCue(new VTTCue(cue.start, cue.end, cue.text));
    german.addCue(new VTTCue(cue.start, cue.end, GERMAN[index] ?? ""));
  });
}

export function Players() {
  const src = useSyncExternalStore(subscribe, toneUrl, noUrl);
  const [changed, setChanged] = useState(65);
  const [committed, setCommitted] = useState<number | null>(null);
  const [clock, setClock] = useState(40);
  const [peaks, setPeaks] = useState<number[] | undefined>(undefined);
  const [captionsOn, setCaptionsOn] = useState(true);
  const [chosen, setChosen] = useState("nothing yet");

  useEffect(() => {
    let live = true;
    void computePeaks(tone(), 64).then((next) => {
      if (live) setPeaks(next);
    });
    return () => {
      live = false;
    };
  }, []);

  return (
    <div className="grid gap-4 @3xl:grid-cols-2">
      <Demo title="Scrubber">
        <div className="flex flex-col gap-6 pt-24">
          <div className="flex flex-col gap-2">
            <Scrubber duration={200} defaultValue={65} marks={MARKS} buffered={[[0, 120]]} aria-label="Seek" onValueChange={setChanged} onValueCommit={setCommitted}>
              <ScrubberTrack />
              <ScrubberThumb />
              <ScrubberPreview thumbnail={{ url: SPRITE, columns: 5, rows: 2, interval: 20 }} />
            </Scrubber>
            <p className="text-sm text-muted-foreground">
              Uncontrolled, with chapters, a loaded range and a sprite preview. Changed to <span data-testid="scrub-changed">{Math.round(changed)}</span>, sought to{" "}
              <span data-testid="scrub-committed">{committed === null ? "nothing yet" : Math.round(committed)}</span>.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Scrubber value={clock} duration={90} onValueChange={setClock} aria-label="Position in the recording" />
            <p className="text-sm text-muted-foreground">
              Controlled: <span data-testid="scrub-clock">{Math.round(clock)}</span> of 90 seconds.
            </p>
          </div>
          <Scrubber duration={0} aria-label="Length not known yet" />
        </div>
      </Demo>

      <Demo title="Audio player">
        <div className="flex flex-col gap-4">
          <AudioPlayer aria-label="A quiet tone, twenty seconds" defaultCaptions>
            <AudioPlayerAudio src={src} />
            <AudioPlayerPlay />
            <AudioPlayerWaveform peaks={peaks} />
            <AudioPlayerTime />
            <AudioPlayerRate />
            <AudioPlayerMute />
            <Captions inline cues={CUES} lang="en" className="w-full" />
            <Transcript cues={CUES} lang="en" aria-label="Transcript" className="w-full" />
          </AudioPlayer>
          <AudioPlayer aria-label="A sound with no source yet">
            <AudioPlayerAudio />
            <AudioPlayerPlay />
            <AudioPlayerWaveform />
            <AudioPlayerTime />
          </AudioPlayer>
        </div>
      </Demo>

      <Demo title="Video player" className="@3xl:col-span-2">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
          <VideoPlayerProvider captions={captionsOn} onCaptionsChange={setCaptionsOn}>
          <VideoPlayer aria-label="A quiet tone with a still picture" hideAfter={1200} data-testid="video">
            <VideoPlayerVideo ref={addTracks} src={src} poster={picture("Sound only")} />
            <VideoPlayerLoading />
            <VideoPlayerError />
            <Hotspots hotspots={SPOTS} onSelect={(spot) => setChosen(spot.label)} />
            <Captions />
            <VideoPlayerControls>
              <VideoPlayerScrubber marks={[{ time: 0, label: "First half" }, { time: 10, label: "Second half" }]} />
              <VideoPlayerControlsRow>
                <VideoPlayerPlay />
                <VideoPlayerMute />
                <VideoPlayerVolume className="hidden @md:flex" />
                <VideoPlayerTime />
                <VideoPlayerCaptionsButton className="ms-auto" />
                <VideoPlayerRate />
                <VideoPlayerFullscreen />
              </VideoPlayerControlsRow>
            </VideoPlayerControls>
          </VideoPlayer>
          <HotspotList hotspots={SPOTS} onSelect={(spot) => setChosen(spot.label)} aria-label="In this scene" empty="Nothing to choose at this moment." />
          <SceneStrip scenes={SCENES} aria-label="Scenes" />
          </VideoPlayerProvider>
          <p className="text-sm text-muted-foreground">
            Chosen: <span data-testid="spot-chosen">{chosen}</span>. Captions are <span data-testid="video-captions">{captionsOn ? "on" : "off"}</span> (controlled). Keys: Space or K, Left and Right, Up and Down, M, C, F, Home, End.
          </p>
        </div>
      </Demo>

      <Demo title="Video player: a clip that fails">
        <VideoPlayer aria-label="A clip that cannot be played" defaultCaptions>
          <VideoPlayerVideo src="data:video/mp4;base64,AAAA" />
          <VideoPlayerError />
          <Captions cues={[{ start: 0, end: 5, text: "Cues passed in by the project." }]} lang="en" />
          <VideoPlayerControls>
            <VideoPlayerControlsRow>
              <VideoPlayerPlay />
              <VideoPlayerTime />
              <VideoPlayerCaptionsButton available className="ms-auto" />
            </VideoPlayerControlsRow>
          </VideoPlayerControls>
        </VideoPlayer>
      </Demo>
    </div>
  );
}
