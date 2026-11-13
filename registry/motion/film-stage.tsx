"use client";
/**
 * @name film-stage
 * @category motion
 * @description A stage for a sequence of timed scenes with a transport: it owns the clock and the chrome (play, time bar, speed, sound), mounts the scene for the current moment, cuts or crossfades between scenes, and can draw any moment on request for export.
 * @when Content the project draws itself from a time: an animated explainer, a story in scenes, a slideshow with narration, a film assembled from markup, SVG or canvas. Each scene gets its own local time and draws from it, so any frame can be drawn again exactly. The stage is the clock other things follow: scrubber, scene-strip, captions and hotspots work inside it as they do inside video-player, and any number of sounds (a clip for each narrated line, a bed under them) are kept in step, each from its own start for its own length. For a video or sound file use video-player or audio-player; for motion tied to scrolling use scroll-scene; for a set of pictures a person pages through use carousel.
 * @example
 * const scenes = [
 *   { id: "title", duration: 4, label: "Title", children: <h2 className="p-8 text-3xl">How a pot is thrown</h2> },
 *   { id: "wheel", duration: 6, label: "On the wheel", transition: "crossfade" as const, render: ({ progress }) => <Wheel turn={progress} /> },
 * ];
 * <FilmStage scenes={scenes} aria-label="How a pot is thrown">
 *   <FilmStageFrame aspect={16 / 9}>
 *     <Captions cues={cues} lang="en" />
 *   </FilmStageFrame>
 *   <FilmStageAudio src="/narration.mp3" />
 *   <FilmStageControls>
 *     <FilmStageScrubber />
 *     <FilmStageControlsRow>
 *       <FilmStagePreviousScene />
 *       <FilmStagePlay />
 *       <FilmStageNextScene />
 *       <FilmStageMute />
 *       <FilmStageTime />
 *       <FilmStageRate className="ms-auto" />
 *     </FilmStageControlsRow>
 *   </FilmStageControls>
 *   <FilmStageSceneStrip />
 * </FilmStage>
 *
 * // One clip for each narrated line and a bed under them; each follows the clock, the speed, a seek and the mute
 * <FilmStage scenes={scenes} loop onSceneChange={(scene) => track(scene.id)} aria-label="How a pot is thrown">
 *   <FilmStageFrame />
 *   <FilmStageAudio src="/bed.mp3" volume={0.3} />
 *   {lines.map((line) => <FilmStageAudio key={line.id} src={line.src} start={line.start} duration={line.length} />)}
 * </FilmStage>
 *
 * // Export: a headless browser draws each frame, with no timer running on the page
 * <FilmStage scenes={scenes} deterministic exportName="main" aria-label="How a pot is thrown">…</FilmStage>
 * // in the page, from the exporter: await window.__filmStage.main.renderAt(frame / 30), then take the picture
 */
import { Captions as CaptionsIcon, CaptionsOff, Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import {
  createContext,
  use,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from "react";
import { flushSync } from "react-dom";
import { SceneStrip, type SceneStripProps } from "@/components/ui/scene-strip";
import { Scrubber, ScrubberPreview, ScrubberThumb, ScrubberTrack, type ScrubberProps } from "@/components/ui/scrubber";
import { announce } from "@/lib/announce";
import { cn } from "@/lib/cn";
import { useControllableState } from "@/lib/use-controllable-state";
import { MediaContext, formatMediaRate, formatMediaTime, isTypingTarget, nextMediaRate, type MediaContextValue } from "@/lib/use-media";

/** How a scene arrives: at once, or by fading in over the last frame of the scene before it. */
export type FilmTransition = "cut" | "crossfade";

/** What a scene is told about its own time. */
export type FilmSceneTime = {
  /** Seconds since the scene started, from 0 to `duration`. */
  time: number;
  /** The same as a fraction, from 0 to 1. */
  progress: number;
  /** The scene's length in seconds. */
  duration: number;
  /** False while it is the outgoing scene of a crossfade, held on its last frame. */
  active: boolean;
};

export type FilmScene = {
  id: string;
  /** Its length in seconds. */
  duration: number;
  /** Its name: on the time bar, in the scene strip, and in what a screen reader says for a position. */
  label?: string;
  /** Its picture in the scene strip: an element that fills the frame (`<img alt="">`). */
  picture?: ReactNode;
  /** How it arrives. Left out, it is the stage's `transition`. The first scene always cuts. */
  transition?: FilmTransition;
  /** Content that does not change with time. */
  children?: ReactNode;
  /** Content drawn from the scene's own time. It must depend on nothing else that changes (no timers, no CSS animations): then a moment looks the same every time it is drawn. */
  render?: (local: FilmSceneTime) => ReactNode;
};

/** The stage's clock, for things outside React: narration, a canvas, an exporter. */
export type FilmClock = {
  /** The current time in seconds. */
  now: () => number;
  /** The length of the whole film in seconds. */
  duration: () => number;
  /** Whether the clock is advancing at this moment (playing, on screen, in a visible tab). */
  running: () => boolean;
  rate: () => number;
  /** Calls `listener` whenever the time, the running state, the rate or the length changes. Returns the function that stops it. */
  subscribe: (listener: () => void) => () => void;
};

/** What the newest render knows, for callbacks that outlive it: the frame loop and the handle. */
type Bound = { advance: (seconds: number) => void; actions: FilmStageActions; renderAt: FilmStageHandle["renderAt"]; scenes: () => { id: string; start: number; duration: number }[] };

type ClockStore = FilmClock & {
  set: (time: number) => void;
  setMeta: (running: boolean, rate: number, duration: number) => void;
  /** Called after every render with that render's callbacks. */
  bind: (bound: Bound) => void;
  advance: (seconds: number) => void;
  handle: FilmStageHandle;
  /** A sound element joined the stage. Returns the function that takes it away again. */
  addSound: (element: HTMLAudioElement) => () => void;
  /** How many sounds are attached. */
  sounds: () => number;
};

function createClock(initial: number): ClockStore {
  let time = initial;
  let running = false;
  let rate = 1;
  let duration = 0;
  let bound: Bound | undefined;
  const sounds = new Set<HTMLAudioElement>();
  const listeners = new Set<() => void>();
  const emit = (): void => {
    for (const listener of [...listeners]) listener();
  };
  const clock: FilmClock = {
    now: () => time,
    duration: () => duration,
    running: () => running,
    rate: () => rate,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
  return {
    ...clock,
    bind(next) {
      bound = next;
    },
    advance: (seconds) => bound?.advance(seconds),
    addSound(element) {
      sounds.add(element);
      emit();
      return () => {
        sounds.delete(element);
        emit();
      };
    },
    sounds: () => sounds.size,
    handle: {
      clock,
      play: () => bound?.actions.play(),
      pause: () => bound?.actions.pause(),
      toggle: () => bound?.actions.toggle(),
      seek: (next) => bound?.actions.seek(next),
      seekBy: (seconds) => bound?.actions.seekBy(seconds),
      setRate: (next) => bound?.actions.setRate(next),
      setMuted: (next) => bound?.actions.setMuted(next),
      toggleMuted: () => bound?.actions.toggleMuted(),
      previousScene: () => bound?.actions.previousScene(),
      nextScene: () => bound?.actions.nextScene(),
      renderAt: (moment, options) => (bound ? bound.renderAt(moment, options) : Promise.resolve(time)),
      scenes: () => bound?.scenes() ?? [],
    },
    set(next) {
      if (next === time) return;
      time = next;
      emit();
    },
    setMeta(nextRunning, nextRate, nextDuration) {
      if (nextRunning === running && nextRate === rate && nextDuration === duration) return;
      running = nextRunning;
      rate = nextRate;
      duration = nextDuration;
      emit();
    },
  };
}

/** Every word the stage says. Pass `labels` to translate any of them. */
export type FilmStageLabels = {
  play: string;
  pause: string;
  mute: string;
  muted: string;
  unmuted: string;
  seek: string;
  rate: string;
  captions: string;
  controls: string;
  scenes: string;
  previousScene: string;
  nextScene: string;
  /** Read out after going to a scene with the keys or the buttons: its place, and its name when it has one. */
  sceneOf: (position: number, total: number, name?: string) => string;
};

const LABELS: FilmStageLabels = {
  play: "Play",
  pause: "Pause",
  mute: "Mute",
  muted: "Muted",
  unmuted: "Sound on",
  seek: "Seek",
  rate: "Playback speed",
  captions: "Captions",
  controls: "Playback controls",
  scenes: "Scenes",
  previousScene: "Previous scene",
  nextScene: "Next scene",
  sceneOf: (position, total, name) => (name ? `${name}, scene ${position} of ${total}` : `Scene ${position} of ${total}`),
};

export type FilmStageActions = {
  /** Starts the clock; from the start again when it is at the end. */
  play: () => void;
  pause: () => void;
  toggle: () => void;
  /** Goes to a time in seconds, kept inside the film. */
  seek: (time: number) => void;
  seekBy: (seconds: number) => void;
  setRate: (rate: number) => void;
  setMuted: (muted: boolean) => void;
  toggleMuted: () => void;
  /** Goes to the start of the scene on stage, or, within its first second, to the start of the one before. */
  previousScene: () => void;
  /** Goes to the start of the next scene. Nothing on the last one. */
  nextScene: () => void;
};

/** What `onSceneChange` is given. */
export type FilmSceneChange = {
  /** The scene now on stage. */
  id: string;
  /** Its place among the scenes, from 0. */
  index: number;
  /** When it starts and how long it lasts, in seconds. */
  start: number;
  duration: number;
  label: string | undefined;
  /** The id of the scene that was on stage before. */
  previous: string | undefined;
};

/** What the stage hands to code outside it (`handleRef`), and, with `exportName`, to the page's `window`. */
export type FilmStageHandle = FilmStageActions & {
  clock: FilmClock;
  /**
   * Draws the frame for `time` now, synchronously, and resolves (with the time drawn, kept inside the
   * film) once the frame is in the page and the fonts and pictures inside the stage are decoded. Take the
   * picture after it resolves. Pictures marked `loading="lazy"` are loaded at once, off screen or hidden as
   * they may be: they would otherwise never arrive. It rejects, naming the picture and its scene, when one
   * is still not ready after `timeout` milliseconds (default 10000) rather than waiting for ever; a picture
   * whose file is missing does not hold it up. That wait is the only timer it starts.
   */
  renderAt: (time: number, options?: { timeout?: number }) => Promise<number>;
  /** Where each scene starts and how long it lasts. */
  scenes: () => { id: string; start: number; duration: number }[];
};

type Placed = FilmScene & { start: number };

type FilmStageContextValue = {
  clock: FilmClock;
  scenes: readonly Placed[];
  duration: number;
  time: number;
  /** Asked to play (the play button shows "Pause"). */
  playing: boolean;
  /** Playing, on screen and in a visible tab: the clock is advancing. */
  running: boolean;
  rate: number;
  muted: boolean;
  /** How many FilmStageAudio are attached. */
  sounds: number;
  /** A FilmStageAudio joins with its element; the function returned takes it away. */
  attachSound: (element: HTMLAudioElement) => () => void;
  /** The place of the scene on stage, from 0 (-1 when there are no scenes). */
  sceneIndex: number;
  /** The scene a step back or forward leads to, if there is one. */
  sceneAfter: (by: 1 | -1) => Placed | undefined;
  /** Tells the clock which element to watch: it stops while that element is off screen. */
  watch: (root: HTMLElement | null) => void;
  deterministic: boolean;
  transition: FilmTransition;
  fade: number;
  /** Crossfades are drawn as cuts: the visitor asked for less motion. */
  still: boolean;
  seekStep: number;
  labels: FilmStageLabels;
  locale: string | undefined;
  actions: FilmStageActions;
  handle: FilmStageHandle;
};

const FilmStageContext = createContext<FilmStageContextValue | null>(null);

function useFilmStage(part: string): FilmStageContextValue {
  const context = use(FilmStageContext);
  if (!context) throw new Error(`<${part}> must be used inside <FilmStage> or <FilmStageProvider>.`);
  return context;
}

/**
 * The stage's clock as React state: the time (it changes every frame while playing, so the component
 * re-renders every frame), the length, whether it is running, and the `clock` itself for code that would
 * rather subscribe than re-render.
 */
export function useFilmClock(): { time: number; duration: number; playing: boolean; running: boolean; rate: number; sceneIndex: number; clock: FilmClock; actions: FilmStageActions } {
  const { time, duration, playing, running, rate, sceneIndex, clock, actions } = useFilmStage("useFilmClock");
  return { time, duration, playing, running, rate, sceneIndex, clock, actions };
}

export type FilmStageOptions = {
  /** The scenes, in order. The film's length is the sum of theirs. */
  scenes: readonly FilmScene[];
  /** The current time in seconds: controlled. The stage then only asks for changes through `onTimeChange`. */
  time?: number | undefined;
  /** The starting time when uncontrolled. Default 0. */
  defaultTime?: number | undefined;
  /** Called with the new time on every frame while playing, and on every seek. */
  onTimeChange?: ((time: number) => void) | undefined;
  /** Whether it plays: controlled. */
  playing?: boolean | undefined;
  /** Whether it starts playing. Default false: nothing moves until asked. */
  defaultPlaying?: boolean | undefined;
  onPlayingChange?: ((playing: boolean) => void) | undefined;
  /** The speed: controlled. 1 is real time. */
  rate?: number | undefined;
  defaultRate?: number | undefined;
  onRateChange?: ((rate: number) => void) | undefined;
  /** Start again at the end instead of stopping. */
  loop?: boolean | undefined;
  /** Called when another scene comes on stage, however it got there: playing, a seek, the scene buttons, `renderAt`. Not called for the scene the stage starts on. */
  onSceneChange?: ((scene: FilmSceneChange) => void) | undefined;
  /** Whether attached sound is muted: controlled. */
  muted?: boolean | undefined;
  defaultMuted?: boolean | undefined;
  onMutedChange?: ((muted: boolean) => void) | undefined;
  /** Whether captions inside the stage show: controlled. */
  captions?: boolean | undefined;
  /** Default true. */
  defaultCaptions?: boolean | undefined;
  onCaptionsChange?: ((on: boolean) => void) | undefined;
  /** How scenes arrive unless a scene says otherwise. Default "cut". */
  transition?: FilmTransition | undefined;
  /** The length of a crossfade in seconds (never longer than the arriving scene). Default 0.5. */
  crossfade?: number | undefined;
  /** Seconds Left and Right move by. Default 5. */
  seekStep?: number | undefined;
  /**
   * For export. The clock never advances by itself: no animation frame, no timer, no sound; the time changes
   * only through `renderAt`, `seek` or a controlled `time`. Transitions and animations of everything inside
   * the stage are switched off, and the visitor's reduced-motion setting is ignored, so a moment is drawn
   * the same on every machine.
   */
  deterministic?: boolean | undefined;
  /** Puts the stage's handle on the page as `window.__filmStage[exportName]`, so a headless browser can call `renderAt`. Left out, nothing is added to `window`. */
  exportName?: string | undefined;
  /** The stage's handle, for code in the project: the clock, the actions and `renderAt`. */
  handleRef?: Ref<FilmStageHandle> | undefined;
  /** The language tag times are formatted for. */
  locale?: string | undefined;
  labels?: Partial<FilmStageLabels> | undefined;
};

const subscribeVisibility = (onChange: () => void): (() => void) => {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
};
const tabVisible = (): boolean => document.visibilityState !== "hidden";
const REDUCED = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (onChange: () => void): (() => void) => {
  const query = window.matchMedia(REDUCED);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const reducedNow = (): boolean => window.matchMedia(REDUCED).matches;
const yes = (): boolean => true;
const no = (): boolean => false;
const zero = (): number => 0;
const nothing = (): void => {};
const NO_RANGES: [number, number][] = [];
const NO_TRACKS: MediaContextValue["state"]["tracks"] = [];

/** How long `renderAt` waits for a picture before it gives up, in milliseconds. */
const PICTURE_TIMEOUT = 10_000;

/** A picture as an error message names it: its address, its description, the scene it is in. */
function describePicture(picture: HTMLImageElement): string {
  const address = picture.currentSrc || picture.getAttribute("src") || picture.getAttribute("srcset") || "";
  const scene = picture.closest<HTMLElement>("[data-scene]")?.dataset["scene"];
  return `<img src="${address.length > 120 ? `${address.slice(0, 117)}...` : address}"${picture.alt ? ` alt="${picture.alt}"` : ""}>${scene ? ` in scene "${scene}"` : ""}`;
}

/** Resolves when one picture can be drawn: loaded and decoded, or known to be broken. A lazy picture is made to load now. */
function pictureReady(picture: HTMLImageElement): Promise<void> {
  // Off screen, or inside something that is not displayed, a lazy picture never starts to load by itself.
  if (picture.loading === "lazy") picture.loading = "eager";
  if (picture.complete) return picture.decode().catch(nothing);
  return new Promise<void>((done) => {
    picture.addEventListener("load", () => void picture.decode().catch(nothing).then(done), { once: true });
    picture.addEventListener("error", () => done(), { once: true });
  });
}

/**
 * Resolves when the fonts and the pictures inside `scope` are ready to be drawn, and rejects, naming the
 * picture, when one is not ready in time. The only timer is the one that gives up.
 */
async function settle(scope: ParentNode, moment: number, timeout: number): Promise<void> {
  if (document.fonts.status === "loading") await document.fonts.ready;
  const pictures = [...scope.querySelectorAll("img")].filter((picture) => picture.getAttribute("src") || picture.getAttribute("srcset"));
  await Promise.all(
    pictures.map((picture) => {
      let timer = 0;
      const late = new Promise<never>((_, fail) => {
        timer = window.setTimeout(() => fail(new Error(`FilmStage renderAt(${moment}): a picture was not ready after ${timeout} ms: ${describePicture(picture)}`)), timeout);
      });
      return Promise.race([pictureReady(picture), late]).finally(() => window.clearTimeout(timer));
    }),
  );
}

/** The place of the scene on stage at a time: the last one that has started. -1 when there are none. */
function sceneIndexAt(scenes: readonly { start: number }[], time: number): number {
  let index = -1;
  for (let at = 0; at < scenes.length; at += 1) if ((scenes[at]?.start ?? 0) <= time) index = at;
  return index;
}

/** How far into a scene, in seconds, "previous" still means the scene before rather than this one's start. */
const RESTART_AFTER = 1;

type ExportRegistry = Record<string, FilmStageHandle | undefined>;
const exportRegistry = (): ExportRegistry => {
  const host = window as unknown as { __filmStage?: ExportRegistry };
  return (host.__filmStage ??= {});
};

/** The clock, the state and both contexts' values: what FilmStage and FilmStageProvider share. */
function useFilmStageState(options: Omit<FilmStageOptions, "handleRef">): { stage: FilmStageContextValue; media: MediaContextValue } {
  const { scenes, loop = false, transition = "cut", crossfade = 0.5, seekStep = 5, deterministic = false, exportName, locale } = options;
  const labels = { ...LABELS, ...options.labels };

  const placed: Placed[] = [];
  let total = 0;
  for (const scene of scenes) {
    placed.push({ ...scene, start: total });
    total += Math.max(0, scene.duration);
  }
  const within = (value: number): number => Math.min(total, Math.max(0, Number.isFinite(value) ? value : 0));

  const [store] = useState(() => createClock(options.time ?? options.defaultTime ?? 0));
  const controlled = options.time !== undefined;
  // A controlled time is the page's: the clock follows it before the browser paints.
  useLayoutEffect(() => {
    if (options.time !== undefined) store.set(options.time);
  }, [store, options.time]);
  const time = within(useSyncExternalStore(store.subscribe, store.now, store.now));

  const [wantsPlaying, setPlaying] = useControllableState({ value: options.playing, defaultValue: options.defaultPlaying ?? false, onChange: options.onPlayingChange });
  const [rate, setRate] = useControllableState({ value: options.rate, defaultValue: options.defaultRate ?? 1, onChange: options.onRateChange });
  const [muted, setMuted] = useControllableState({ value: options.muted, defaultValue: options.defaultMuted ?? false, onChange: options.onMutedChange });
  const [captions, setCaptions] = useControllableState({ value: options.captions, defaultValue: options.defaultCaptions ?? true, onChange: options.onCaptionsChange });
  const sounds = useSyncExternalStore(store.subscribe, store.sounds, zero);
  const [root, setRoot] = useState<HTMLElement | null>(null);
  /** Whether the stage is on screen. True until an observer says otherwise. */
  const [inView, setInView] = useState(true);
  const visible = useSyncExternalStore(subscribeVisibility, tabVisible, yes);
  const reduced = useSyncExternalStore(subscribeReduced, reducedNow, no);

  useEffect(() => {
    if (!root || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => setInView(entries.some((entry) => entry.isIntersecting)));
    observer.observe(root);
    return () => observer.disconnect();
  }, [root]);

  const playing = wantsPlaying && !deterministic;
  const running = playing && visible && inView && total > 0;

  const commit = (next: number): void => {
    const target = within(next);
    if (!controlled) store.set(target);
    if (target !== store.now() || !controlled) options.onTimeChange?.(target);
  };
  const advance = (seconds: number): void => {
    let next = store.now() + seconds * rate;
    if (next >= total) {
      if (loop && total > 0) next %= total;
      else {
        next = total;
        setPlaying(false);
      }
    }
    commit(next);
  };
  const sceneIndex = sceneIndexAt(placed, time);
  const sceneAfter = (by: 1 | -1): Placed | undefined => {
    const now = store.now();
    const at = sceneIndexAt(placed, now);
    const current = placed[at];
    if (!current) return undefined;
    if (by === 1) return placed[at + 1];
    return at === 0 || now - current.start > RESTART_AFTER ? current : placed[at - 1];
  };
  const stepScene = (by: 1 | -1): void => {
    const scene = sceneAfter(by);
    if (scene) commit(scene.start);
  };
  const actions: FilmStageActions = {
    play: () => {
      if (deterministic) return;
      if (store.now() >= total && !loop) commit(0);
      setPlaying(true);
    },
    pause: () => setPlaying(false),
    toggle: () => (playing ? actions.pause() : actions.play()),
    seek: commit,
    seekBy: (seconds) => commit(store.now() + seconds),
    setRate,
    setMuted,
    toggleMuted: () => setMuted(!muted),
    previousScene: () => stepScene(-1),
    nextScene: () => stepScene(1),
  };
  const renderAt: FilmStageHandle["renderAt"] = (moment, given) => {
    const target = within(moment);
    flushSync(() => commit(target));
    return settle(root ?? document, target, Math.max(0, given?.timeout ?? PICTURE_TIMEOUT)).then(() => target);
  };

  // Another scene came on stage: say so once, after the frame that shows it.
  const scene = placed[sceneIndex];
  const sceneId = scene?.id;
  const sceneSeen = useRef(sceneId);
  const sceneReport = useRef<() => void>(nothing);
  useEffect(() => {
    sceneReport.current = () => {
      const previous = sceneSeen.current;
      sceneSeen.current = sceneId;
      if (scene && previous !== sceneId) options.onSceneChange?.({ id: scene.id, index: sceneIndex, start: scene.start, duration: Math.max(0, scene.duration), label: scene.label, previous });
    };
  });
  useEffect(() => {
    sceneReport.current();
  }, [sceneId]);

  useEffect(() => {
    store.bind({ advance, actions, renderAt, scenes: () => placed.map((scene) => ({ id: scene.id, start: scene.start, duration: scene.duration })) });
  });

  // The clock: one animation frame loop while running, and nothing at all otherwise.
  useEffect(() => {
    if (!running) return;
    let last = performance.now();
    let frame = requestAnimationFrame(function tick(now: number): void {
      // A long gap (a stalled tab) is not played through in one jump.
      const seconds = Math.min(0.25, Math.max(0, (now - last) / 1000));
      last = now;
      store.advance(seconds);
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [store, running]);

  useEffect(() => {
    store.setMeta(running, rate, total);
  }, [store, running, rate, total]);

  const { handle } = store;
  useEffect(() => {
    if (!exportName) return;
    const registry = exportRegistry();
    registry[exportName] = handle;
    return () => {
      if (registry[exportName] === handle) delete registry[exportName];
    };
  }, [exportName, handle]);

  const stage: FilmStageContextValue = {
    clock: handle.clock,
    scenes: placed,
    duration: total,
    time,
    playing,
    running,
    rate,
    muted,
    sounds,
    attachSound: store.addSound,
    sceneIndex,
    sceneAfter,
    watch: setRoot,
    deterministic,
    transition,
    fade: Math.max(0, crossfade),
    still: reduced && !deterministic,
    seekStep,
    labels,
    locale,
    actions,
    handle,
  };
  // The same context a video or sound player gives its parts, driven by this clock instead of a media
  // element: Captions, Transcript, SceneStrip, Hotspots and HotspotList follow the stage with no props.
  const media: MediaContextValue = {
    media: null,
    setMedia: nothing,
    state: { bound: true, playing, time, duration: total, buffered: NO_RANGES, muted, volume: 1, rate, ended: total > 0 && time >= total, waiting: false, error: null, tracks: NO_TRACKS },
    actions: { ...actions, setVolume: nothing, reload: nothing },
    locale,
    captions,
    setCaptions,
    captionTrack: null,
    setCaptionTrack: nothing,
  };
  return { stage, media };
}

/**
 * Shares one stage with parts that sit outside it: a Transcript beside it, a scene list in a sidebar, a
 * canvas that follows `useFilmClock()`. Give it (not the FilmStage inside) the scenes and the state props.
 * It draws nothing.
 */
export function FilmStageProvider({ children, handleRef, ...options }: FilmStageOptions & { children?: ReactNode }) {
  const { stage, media } = useFilmStageState(options);
  const { handle } = stage;
  useImperativeHandle(handleRef, () => handle, [handle]);
  return (
    <FilmStageContext value={stage}>
      <MediaContext value={media}>{children}</MediaContext>
    </FilmStageContext>
  );
}

const NO_SCENES: readonly FilmScene[] = [];

export type FilmStageProps = Omit<ComponentProps<"div">, "children"> &
  Omit<FilmStageOptions, "scenes"> & {
    /** The scenes. Left out inside a FilmStageProvider, which has them. */
    scenes?: readonly FilmScene[];
    /** The parts: FilmStageFrame, FilmStageControls, FilmStageSceneStrip, FilmStageAudio. */
    children?: ReactNode;
  };

/**
 * The stage: a named group (give it `aria-label`: what the film is) that holds the clock and the keyboard
 * for everything inside it. Space or K plays and pauses, Left and Right go back and forward by `seekStep`
 * (time runs left to right in every language, like the bar), Home and End go to the start and the end, N
 * and P go to the next and the previous scene (which is then read out), and M mutes when sound is attached. The keys are left alone while typing in a field; a slider or a toolbar
 * inside keeps its own arrows and a button its own Space. The clock stops while the tab is hidden or the
 * stage is off screen and goes on when it is back, and nothing plays until asked unless `defaultPlaying`
 * says so. It is not announced scene by scene: with narration playing a screen reader would talk over it.
 */
export function FilmStage({
  className,
  children,
  onKeyDown,
  scenes,
  time,
  defaultTime,
  onTimeChange,
  playing,
  defaultPlaying,
  onPlayingChange,
  rate,
  defaultRate,
  onRateChange,
  loop,
  onSceneChange,
  muted,
  defaultMuted,
  onMutedChange,
  captions,
  defaultCaptions,
  onCaptionsChange,
  transition,
  crossfade,
  seekStep,
  deterministic,
  exportName,
  handleRef,
  locale,
  labels,
  ...props
}: FilmStageProps) {
  // Inside a FilmStageProvider the stage joins it; alone, it is its own.
  const outerStage = use(FilmStageContext);
  const outerMedia = use(MediaContext);
  const own = useFilmStageState({
    scenes: scenes ?? NO_SCENES,
    time,
    defaultTime,
    onTimeChange,
    playing,
    defaultPlaying,
    onPlayingChange,
    rate,
    defaultRate,
    onRateChange,
    loop,
    onSceneChange,
    muted,
    defaultMuted,
    onMutedChange,
    captions,
    defaultCaptions,
    onCaptionsChange,
    transition,
    crossfade,
    seekStep,
    deterministic,
    // Joined to a provider, the provider's handle is the one that is exported.
    exportName: outerStage && scenes === undefined ? undefined : exportName,
    locale,
    labels,
  });
  const joined = outerStage !== null && outerMedia !== null && scenes === undefined;
  const stage = joined ? outerStage : own.stage;
  const media = joined ? outerMedia : own.media;
  const { actions, handle, watch } = stage;
  useImperativeHandle(handleRef, () => handle, [handle]);
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    watch(root);
    return () => watch(null);
  }, [watch, root]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    onKeyDown?.(event);
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || isTypingTarget(event.target)) return;
    const target = event.target as HTMLElement;
    const onSlider = target.closest("[role=slider]") !== null;
    const onButton = target.closest("button, a, [role=button]") !== null;
    // A letter typed on a keyboard of another script is found by the key's place instead.
    const placed = event.key.length === 1 && event.key.charCodeAt(0) > 127 ? /^Key([A-Z])$/.exec(event.code)?.[1] : undefined;
    const key = placed ? placed.toLowerCase() : event.key.length === 1 ? event.key.toLowerCase() : event.key;
    const act: Record<string, (() => void) | undefined> = {
      " ": onButton ? undefined : actions.toggle,
      k: actions.toggle,
      ArrowLeft: onSlider ? undefined : () => actions.seekBy(-stage.seekStep),
      ArrowRight: onSlider ? undefined : () => actions.seekBy(stage.seekStep),
      Home: onSlider ? undefined : () => actions.seek(0),
      End: onSlider ? undefined : () => actions.seek(stage.duration),
      n: () => goToScene(stage, 1),
      p: () => goToScene(stage, -1),
      m:
        stage.sounds > 0
          ? () => {
              announce(stage.muted ? stage.labels.unmuted : stage.labels.muted);
              actions.toggleMuted();
            }
          : undefined,
    };
    const run = act[key];
    if (!run) return;
    event.preventDefault();
    run();
  };

  return (
    <FilmStageContext value={stage}>
      <MediaContext value={media}>
        <div
          ref={setRoot}
          data-slot="film-stage"
          role="group"
          tabIndex={0}
          data-state={stage.playing ? "playing" : "paused"}
          data-held={stage.playing && !stage.running ? "" : undefined}
          data-deterministic={stage.deterministic ? "" : undefined}
          onKeyDown={handleKeyDown}
          className={cn("group/stage flex w-full min-w-0 flex-col gap-2 rounded-surface", stage.deterministic && "**:transition-none! **:animate-none!", className)}
          {...props}
        >
          {children}
        </div>
      </MediaContext>
    </FilmStageContext>
  );
}

/** Goes a scene back or forward and says where that is: no focus move reads it out. */
function goToScene(stage: FilmStageContextValue, by: 1 | -1): void {
  const scene = stage.sceneAfter(by);
  if (!scene) return;
  if (by === 1) stage.actions.nextScene();
  else stage.actions.previousScene();
  announce(stage.labels.sceneOf(stage.scenes.indexOf(scene) + 1, stage.scenes.length, scene.label));
}

type Layer = { scene: Placed; local: FilmSceneTime; opacity: number };

/** The scenes on stage at a moment, bottom first: the current one, and under it the one it is fading in over. */
function layersAt(scenes: readonly Placed[], time: number, fallback: FilmTransition, fade: number, still: boolean): Layer[] {
  const index = sceneIndexAt(scenes, time);
  const scene = scenes[index];
  if (!scene) return [];
  const length = Math.max(0, scene.duration);
  const elapsed = Math.min(length, Math.max(0, time - scene.start));
  const local: FilmSceneTime = { time: elapsed, progress: length > 0 ? elapsed / length : 1, duration: length, active: true };
  const before = scenes[index - 1];
  const span = Math.min(fade, length);
  if (!before || still || span <= 0 || (scene.transition ?? fallback) !== "crossfade" || elapsed >= span) return [{ scene, local, opacity: 1 }];
  const held = Math.max(0, before.duration);
  return [
    { scene: before, local: { time: held, progress: 1, duration: held, active: false }, opacity: 1 },
    { scene, local, opacity: elapsed / span },
  ];
}

export type FilmStageFrameProps = ComponentProps<"div"> & {
  /** Width / height. Default 16 / 9. The frame keeps this shape at every width. */
  aspect?: number | string;
};

/**
 * The picture: a box that keeps its shape and holds the scene for the current moment, and, during a
 * crossfade, the last frame of the scene before it underneath. Only those are mounted. A crossfade changes
 * opacity alone, worked out from the time (not a CSS transition), so seeking into the middle of one shows
 * the middle of it; under reduced motion it is a cut. Children are drawn over the scenes: Captions,
 * Hotspots, a title. The frame is a size container, so content can use container units (`cqi`).
 */
export function FilmStageFrame({ className, style, aspect = 16 / 9, children, ...props }: FilmStageFrameProps) {
  const { scenes, time, transition, fade, still } = useFilmStage("FilmStageFrame");
  const layers = layersAt(scenes, time, transition, fade, still);
  return (
    <div
      data-slot="film-stage-frame"
      className={cn("@container relative isolate w-full min-w-0 overflow-hidden rounded-surface border bg-muted text-foreground", className)}
      style={{ aspectRatio: String(aspect), ...style }}
      {...props}
    >
      {layers.map(({ scene, local, opacity }) => (
        <div
          key={scene.id}
          data-slot="film-stage-scene"
          data-scene={scene.id}
          data-active={local.active ? "" : undefined}
          inert={!local.active}
          aria-hidden={local.active ? undefined : true}
          className="absolute inset-0 overflow-hidden"
          style={{ opacity }}
        >
          {scene.render ? scene.render(local) : scene.children}
        </div>
      ))}
      {children}
    </div>
  );
}

/** How far the sound may be from the clock, in seconds, before it is moved back in step. */
const DRIFT = 0.3;

/** Puts a sound element in step with the clock. Outside any component: the element is the browser's, changed in place. */
function followClock(element: HTMLAudioElement, clock: FilmClock, offset: number, length: number | undefined, volume: number | undefined): void {
  if (volume !== undefined && element.volume !== volume) element.volume = volume;
  const at = clock.now() - offset;
  // It sounds from its start for its length, or to the end of its file, whichever comes first.
  const end = Math.min(length ?? Number.POSITIVE_INFINITY, Number.isFinite(element.duration) ? element.duration : Number.POSITIVE_INFINITY);
  const inside = at >= 0 && at < end;
  if (clock.running() && inside) {
    if (Math.abs(element.currentTime - at) > DRIFT) element.currentTime = at;
    if (element.playbackRate !== clock.rate()) element.playbackRate = clock.rate();
    // A browser may refuse sound before a gesture: the film goes on without it.
    if (element.paused) element.play().catch(nothing);
    return;
  }
  if (!element.paused) element.pause();
  if (inside && Math.abs(element.currentTime - at) > 0.02) element.currentTime = at;
}

export type FilmStageAudioProps = Omit<ComponentProps<"audio">, "muted" | "autoPlay" | "loop" | "controls"> & {
  /** The moment of the film, in seconds, at which the sound starts. Default 0. */
  start?: number;
  /** How long it sounds for, in seconds, from its `start`. Left out, to the end of its file. */
  duration?: number;
  /** How loud it is, from 0 to 1: a bed under narration is quieter than the voice. Left out, the element's own (1). */
  volume?: number;
};

/**
 * Narration or music. The stage's clock leads and the sound follows: it plays while the clock runs, at the
 * clock's speed, pauses with it, goes where it is sought, and is moved back in step whenever it is more
 * than three tenths of a second away. Any number may be attached at once, each with its own `start` and
 * `duration`: one clip for each narrated line, a bed under them all. It is silent in `deterministic` mode
 * (an exporter adds the sound files itself). With any attached, M and FilmStageMute mute them all. It
 * draws nothing.
 */
export function FilmStageAudio({ start = 0, duration, volume, ref, ...props }: FilmStageAudioProps) {
  const { clock, attachSound, muted } = useFilmStage("FilmStageAudio");
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  useImperativeHandle(ref, () => audio as HTMLAudioElement, [audio]);
  const level = volume === undefined ? undefined : Math.min(1, Math.max(0, volume));
  useEffect(() => (audio ? attachSound(audio) : undefined), [audio, attachSound]);
  useEffect(() => {
    if (!audio) return;
    const follow = (): void => followClock(audio, clock, start, duration, level);
    follow();
    audio.addEventListener("loadedmetadata", follow);
    const stop = clock.subscribe(follow);
    return () => {
      audio.removeEventListener("loadedmetadata", follow);
      stop();
      audio.pause();
    };
  }, [audio, clock, start, duration, level]);
  return <audio ref={setAudio} data-slot="film-stage-audio" data-start={start} preload="auto" muted={muted} {...props} />;
}

/** The transport under the picture: a named group. Arrange the parts inside it. */
export function FilmStageControls({ className, ...props }: ComponentProps<"div">) {
  const { labels } = useFilmStage("FilmStageControls");
  return (
    <div
      data-slot="film-stage-controls"
      role="group"
      aria-label={labels.controls}
      className={cn("flex min-w-0 flex-col rounded-surface border bg-card px-2 py-1 text-card-foreground", className)}
      {...props}
    />
  );
}

/** One row of controls. Push a control to the end with `className="ms-auto"`. */
export function FilmStageControlsRow({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="film-stage-controls-row" className={cn("flex min-w-0 flex-wrap items-center gap-1", className)} {...props} />;
}

type ControlButtonProps = Omit<ComponentProps<"button">, "type">;

function ControlButton({ className, ...props }: ControlButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-8 min-w-8 shrink-0 items-center justify-center gap-1 rounded-control px-1.5 text-sm font-medium text-foreground transition-[background-color,opacity] duration-instant ease-out select-none hover:bg-accent disabled:pointer-events-none disabled:opacity-50 aria-disabled:opacity-50 motion-reduce:transition-none pointer-coarse:h-(--control-h) pointer-coarse:min-w-(--control-h) [&_svg]:size-4 [&_svg]:shrink-0",
        className,
      )}
      {...props}
    />
  );
}

/** Plays or pauses. Its name is what pressing it will do: "Play", then "Pause". Disabled in `deterministic` mode, where nothing plays. */
export function FilmStagePlay({ children, onClick, disabled, ...props }: ControlButtonProps) {
  const { playing, actions, labels, deterministic, duration } = useFilmStage("FilmStagePlay");
  return (
    <ControlButton
      data-slot="film-stage-play"
      aria-label={playing ? labels.pause : labels.play}
      disabled={disabled || deterministic || duration <= 0}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) actions.toggle();
      }}
      {...props}
    >
      {children ?? (playing ? <Pause aria-hidden="true" strokeWidth={1.5} /> : <Play aria-hidden="true" strokeWidth={1.5} />)}
    </ControlButton>
  );
}

function SceneButton({ by, children, onClick, ...props }: ControlButtonProps & { by: 1 | -1 }) {
  const stage = useFilmStage(by === 1 ? "FilmStageNextScene" : "FilmStagePreviousScene");
  // Nowhere to go: the last scene has no next, and the very start has no previous.
  const stuck = by === 1 ? stage.sceneIndex >= stage.scenes.length - 1 : stage.time <= 0;
  return (
    <ControlButton
      data-slot={by === 1 ? "film-stage-next-scene" : "film-stage-previous-scene"}
      aria-label={by === 1 ? stage.labels.nextScene : stage.labels.previousScene}
      // Unavailable, but still focusable: the film reaching its last scene must not drop the keyboard's place.
      aria-disabled={stuck || undefined}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented && !stuck) goToScene(stage, by);
      }}
      {...props}
    >
      {children ?? (by === 1 ? <SkipForward aria-hidden="true" strokeWidth={1.5} /> : <SkipBack aria-hidden="true" strokeWidth={1.5} />)}
    </ControlButton>
  );
}

/**
 * Goes to the start of the scene on stage, or, pressed within its first second, to the start of the scene
 * before it, as the same button does in a music player. The scene arrived at is read out. At the very
 * start it says it is unavailable.
 */
export function FilmStagePreviousScene(props: ControlButtonProps) {
  return <SceneButton by={-1} {...props} />;
}

/** Goes to the start of the next scene, which is read out. On the last scene it says it is unavailable. */
export function FilmStageNextScene(props: ControlButtonProps) {
  return <SceneButton by={1} {...props} />;
}

/** Elapsed and total time, in figures of equal width so the row does not shift. Not a live region: the scrubber says the time when asked. */
export function FilmStageTime({ className, ...props }: ComponentProps<"span">) {
  const { time, duration, locale } = useFilmStage("FilmStageTime");
  return (
    <span data-slot="film-stage-time" className={cn("shrink-0 px-1.5 text-xs whitespace-nowrap text-muted-foreground tabular-nums", className)} {...props}>
      <span data-slot="film-stage-elapsed" className="text-foreground">
        {formatMediaTime(time, locale)}
      </span>
      {" / "}
      <span data-slot="film-stage-duration">{formatMediaTime(duration, locale)}</span>
    </span>
  );
}

export type FilmStageScrubberProps = Omit<ScrubberProps, "value" | "defaultValue" | "duration" | "buffered">;

/**
 * The scrubber, bound to the clock. The scenes that have a `label` are its marks, so the bar shows where
 * each starts and says its name. The picture follows the thumb while it is dragged: a frame costs nothing
 * to draw, so there is no need to wait for the thumb to be let go. Children replace its parts.
 */
export function FilmStageScrubber({ onValueChange, onValueCommit, marks, children, ...props }: FilmStageScrubberProps) {
  const { time, duration, scenes, actions, labels, locale } = useFilmStage("FilmStageScrubber");
  const named = scenes.flatMap((scene) => (scene.label ? [{ time: scene.start, label: scene.label }] : []));
  return (
    <Scrubber
      aria-label={labels.seek}
      locale={locale}
      value={time}
      duration={duration}
      marks={marks ?? named}
      onValueChange={(next) => {
        actions.seek(next);
        onValueChange?.(next);
      }}
      onValueCommit={(next) => {
        actions.seek(next);
        onValueCommit?.(next);
      }}
      {...props}
    >
      {children ?? (
        <>
          <ScrubberTrack />
          <ScrubberThumb />
          <ScrubberPreview />
        </>
      )}
    </Scrubber>
  );
}

const RATES = [1, 1.25, 1.5, 2, 0.75] as const;

/** The speed: each press goes to the next of `rates` and says it. Its name carries the speed ("Playback speed: 1.5×"). */
export function FilmStageRate({ rates = RATES, onClick, children, ...props }: ControlButtonProps & { rates?: readonly number[] }) {
  const { rate, actions, labels, locale } = useFilmStage("FilmStageRate");
  return (
    <ControlButton
      data-slot="film-stage-rate"
      aria-label={`${labels.rate}: ${formatMediaRate(rate, locale)}`}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        const next = nextMediaRate(rates, rate);
        actions.setRate(next);
        announce(`${labels.rate}: ${formatMediaRate(next, locale)}`);
      }}
      {...props}
    >
      {children ?? (
        <span dir="ltr" className="min-w-8 text-center text-xs tabular-nums">
          {formatMediaRate(rate, locale)}
        </span>
      )}
    </ControlButton>
  );
}

/** Mutes or unmutes the attached sound: a toggle whose pressed state says whether it is on. Disabled while no FilmStageAudio is attached. */
export function FilmStageMute({ children, onClick, disabled, ...props }: ControlButtonProps) {
  const { muted, sounds, actions, labels } = useFilmStage("FilmStageMute");
  return (
    <ControlButton
      data-slot="film-stage-mute"
      aria-label={labels.mute}
      aria-pressed={muted}
      disabled={disabled || sounds === 0}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) actions.toggleMuted();
      }}
      {...props}
    >
      {children ?? (muted ? <VolumeX aria-hidden="true" strokeWidth={1.5} /> : <Volume2 aria-hidden="true" strokeWidth={1.5} />)}
    </ControlButton>
  );
}

/** Switches the captions inside the stage on and off: a toggle with a pressed state. */
export function FilmStageCaptionsButton({ children, onClick, ...props }: ControlButtonProps) {
  const { labels } = useFilmStage("FilmStageCaptionsButton");
  const media = use(MediaContext);
  const on = media?.captions ?? false;
  return (
    <ControlButton
      data-slot="film-stage-captions-button"
      aria-label={labels.captions}
      aria-pressed={on}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) media?.setCaptions(!on);
      }}
      {...props}
    >
      {children ?? (on ? <CaptionsIcon aria-hidden="true" strokeWidth={1.5} /> : <CaptionsOff aria-hidden="true" strokeWidth={1.5} />)}
    </ControlButton>
  );
}

export type FilmStageSceneStripProps = Omit<SceneStripProps, "scenes" | "time" | "duration">;

/** The scene strip, filled from the stage's scenes (name, picture, length): it marks the scene on stage and goes to a scene when it is pressed. */
export function FilmStageSceneStrip(props: FilmStageSceneStripProps) {
  const { scenes, labels } = useFilmStage("FilmStageSceneStrip");
  return (
    <SceneStrip
      aria-label={labels.scenes}
      scenes={scenes.map((scene) => ({ start: scene.start, end: scene.start + Math.max(0, scene.duration), label: scene.label ?? scene.id, picture: scene.picture }))}
      {...props}
    />
  );
}
