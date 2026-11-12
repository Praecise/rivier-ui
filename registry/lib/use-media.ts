"use client";
/**
 * @name use-media
 * @category lib
 * @description Follows an audio or video element (playing, time, duration, buffered, volume, rate, text tracks, waiting, error) as React state, with the actions to drive it, the context player parts share, and time formatting through Intl.
 * @when Building player parts around a `<video>` or `<audio>` element the project renders. video-player, audio-player, captions and scene-strip are built on it; use it directly for a control they do not have. The element stays the source of truth: sources, HLS and DRM are attached to it by the project, and nothing here loads or decodes media.
 * @example
 * function Elapsed() {
 *   const { state, locale } = useMediaContext("Elapsed");
 *   return <span>{formatMediaTime(state.time, locale)}</span>;
 * }
 *
 * // Without a player around it
 * const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
 * const state = useMediaState(audio);
 * <audio ref={setAudio} src="/note.mp3" />
 * <Button onClick={() => mediaActions(audio).toggle()}>{state.playing ? "Pause" : "Play"}</Button>
 */
import { createContext, use, useMemo, useState, useSyncExternalStore } from "react";
import { useControllableState } from "@/lib/use-controllable-state";

export type MediaTrack = { index: number; label: string; language: string; kind: string };

export type MediaState = {
  /** False until the element is known (on the server, before it mounts). */
  bound: boolean;
  playing: boolean;
  /** Seconds. */
  time: number;
  /** Seconds; 0 while it is not known (before metadata, or for a live stream). */
  duration: number;
  /** Loaded ranges as [start, end] in seconds. */
  buffered: [number, number][];
  muted: boolean;
  /** 0 to 1. */
  volume: number;
  rate: number;
  ended: boolean;
  /** Playback wants to continue but is waiting for data. */
  waiting: boolean;
  /** The element's error message or code, or null. */
  error: string | null;
  /** Caption and subtitle tracks of the element, in its order. */
  tracks: MediaTrack[];
};

const IDLE: MediaState = { bound: false, playing: false, time: 0, duration: 0, buffered: [], muted: false, volume: 1, rate: 1, ended: false, waiting: false, error: null, tracks: [] };

const EVENTS = ["play", "playing", "pause", "ended", "timeupdate", "durationchange", "loadedmetadata", "progress", "seeking", "seeked", "waiting", "canplay", "volumechange", "ratechange", "error", "emptied", "loadstart"] as const;

function read(media: HTMLMediaElement, previous: MediaState): MediaState {
  const buffered: [number, number][] = [];
  for (let index = 0; index < media.buffered.length; index += 1) buffered.push([media.buffered.start(index), media.buffered.end(index)]);
  const tracks: MediaTrack[] = [];
  for (let index = 0; index < media.textTracks.length; index += 1) {
    const track = media.textTracks[index];
    if (track && (track.kind === "captions" || track.kind === "subtitles")) tracks.push({ index, label: track.label, language: track.language, kind: track.kind });
  }
  const same = <T,>(next: T[], before: T[]): T[] => (JSON.stringify(next) === JSON.stringify(before) ? before : next);
  return {
    bound: true,
    playing: !media.paused && !media.ended,
    time: media.currentTime,
    duration: Number.isFinite(media.duration) ? media.duration : 0,
    buffered: same(buffered, previous.buffered),
    muted: media.muted,
    volume: media.volume,
    rate: media.playbackRate,
    ended: media.ended,
    // readyState 2 (HAVE_CURRENT_DATA) or less while it should be playing or is seeking: it is waiting.
    waiting: media.error === null && media.networkState !== 3 && media.readyState < 3 && (!media.paused || media.seeking),
    error: media.error ? media.error.message || `code ${media.error.code}` : null,
    tracks: same(tracks, previous.tracks),
  };
}

function shallowEqual(a: MediaState, b: MediaState): boolean {
  return (Object.keys(a) as (keyof MediaState)[]).every((key) => Object.is(a[key], b[key]));
}

type Store = { subscribe: (onChange: () => void) => () => void; get: () => MediaState };

function createStore(media: HTMLMediaElement | null): Store {
  if (!media) return { subscribe: () => () => {}, get: () => IDLE };
  let snapshot = read(media, IDLE);
  const refresh = (): boolean => {
    const next = read(media, snapshot);
    if (shallowEqual(next, snapshot)) return false;
    snapshot = next;
    return true;
  };
  return {
    subscribe(onChange) {
      const update = (): void => {
        if (refresh()) onChange();
      };
      for (const event of EVENTS) media.addEventListener(event, update);
      media.textTracks.addEventListener("addtrack", update);
      media.textTracks.addEventListener("removetrack", update);
      // timeupdate fires about four times a second; reading ten times a second while playing keeps a time bar even.
      let frame = 0;
      let last = 0;
      const tick = (now: number): void => {
        if (!media.paused && now - last >= 100) {
          last = now;
          update();
        }
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      refresh();
      return () => {
        for (const event of EVENTS) media.removeEventListener(event, update);
        media.textTracks.removeEventListener("addtrack", update);
        media.textTracks.removeEventListener("removetrack", update);
        cancelAnimationFrame(frame);
      };
    },
    get: () => snapshot,
  };
}

const idle = (): MediaState => IDLE;

/** The element's state, kept current from its events. Give it the element from a `ref` held in state (not a ref object). */
export function useMediaState(media: HTMLMediaElement | null): MediaState {
  const store = useMemo(() => createStore(media), [media]);
  return useSyncExternalStore(store.subscribe, store.get, idle);
}

export type MediaActions = {
  play: () => void;
  pause: () => void;
  toggle: () => void;
  /** Goes to a time in seconds, kept inside the media. */
  seek: (time: number) => void;
  seekBy: (seconds: number) => void;
  setVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
  toggleMuted: () => void;
  setRate: (rate: number) => void;
  /** Loads the sources again: what a retry button calls after an error. */
  reload: () => void;
};

/** Actions on a media element. Every one is safe to call with null (it does nothing). */
export function mediaActions(media: HTMLMediaElement | null): MediaActions {
  const limit = (time: number): number => {
    const end = media && Number.isFinite(media.duration) ? media.duration : Number.MAX_SAFE_INTEGER;
    return Math.min(end, Math.max(0, time));
  };
  const play = (): void => {
    // A browser may refuse to play (no gesture yet, no source): the element stays paused and its state says so.
    media?.play().catch(() => {});
  };
  return {
    play,
    pause: () => media?.pause(),
    toggle: () => {
      if (!media) return;
      if (media.paused || media.ended) play();
      else media.pause();
    },
    seek: (time) => {
      if (media) media.currentTime = limit(time);
    },
    seekBy: (seconds) => {
      if (media) media.currentTime = limit(media.currentTime + seconds);
    },
    setVolume: (volume) => {
      if (!media) return;
      media.volume = Math.min(1, Math.max(0, volume));
      if (media.volume > 0) media.muted = false;
    },
    setMuted: (muted) => {
      if (media) media.muted = muted;
    },
    toggleMuted: () => {
      if (media) media.muted = !media.muted;
    },
    setRate: (rate) => {
      if (media) media.playbackRate = rate;
    },
    reload: () => media?.load(),
  };
}

export type MediaContextValue = {
  media: HTMLMediaElement | null;
  /** The `ref` of the media element: the element part of a player passes it on. */
  setMedia: (media: HTMLMediaElement | null) => void;
  state: MediaState;
  actions: MediaActions;
  /** The language tag times and numbers are formatted for. Undefined: the runtime's own. */
  locale: string | undefined;
  /** Whether captions are shown, and which of the element's caption tracks (an index into its textTracks). */
  captions: boolean;
  setCaptions: (on: boolean) => void;
  captionTrack: number | null;
  setCaptionTrack: (index: number) => void;
};

export const MediaContext = createContext<MediaContextValue | null>(null);

/** The player a part is inside. `part` names the caller in the error. */
export function useMediaContext(part: string): MediaContextValue {
  const context = use(MediaContext);
  if (!context) throw new Error(`<${part}> must be used inside a player (<VideoPlayer> or <AudioPlayer>).`);
  return context;
}

/** The same, or null outside a player: for parts that can also be given their media by props. */
export function useOptionalMediaContext(): MediaContextValue | null {
  return use(MediaContext);
}

export type MediaProviderOptions = {
  locale?: string | undefined;
  /** Captions shown: controlled. */
  captions?: boolean | undefined;
  defaultCaptions?: boolean | undefined;
  onCaptionsChange?: ((on: boolean) => void) | undefined;
};

/** What a player root calls to make the value of MediaContext. */
export function useMediaProvider({ locale, captions, defaultCaptions = false, onCaptionsChange }: MediaProviderOptions): MediaContextValue {
  const [media, setMedia] = useState<HTMLMediaElement | null>(null);
  const state = useMediaState(media);
  const actions = useMemo(() => mediaActions(media), [media]);
  const [captionsOn, setCaptions] = useControllableState({ value: captions, defaultValue: defaultCaptions, onChange: onCaptionsChange });
  const [chosenTrack, setCaptionTrack] = useState<number | null>(null);
  const captionTrack = chosenTrack !== null && state.tracks.some((track) => track.index === chosenTrack) ? chosenTrack : (state.tracks[0]?.index ?? null);
  return { media, setMedia, state, actions, locale, captions: captionsOn, setCaptions, captionTrack, setCaptionTrack };
}

/** A time as a clock: "1:05", "1:02:09". Digits follow the locale. */
export function formatMediaTime(seconds: number, locale?: string): string {
  const total = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  const two = new Intl.NumberFormat(locale, { minimumIntegerDigits: 2, useGrouping: false });
  const one = new Intl.NumberFormat(locale, { useGrouping: false });
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = two.format(total % 60);
  return hours > 0 ? `${one.format(hours)}:${two.format(minutes)}:${rest}` : `${one.format(minutes)}:${rest}`;
}

/** A time in words, for a screen reader: "1 minute 5 seconds". Units and digits follow the locale. */
export function describeMediaTime(seconds: number, locale?: string): string {
  const total = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  const unit = (value: number, name: "hour" | "minute" | "second"): string => new Intl.NumberFormat(locale, { style: "unit", unit: name, unitDisplay: "long" }).format(value);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const parts = [hours > 0 ? unit(hours, "hour") : null, hours > 0 || minutes > 0 ? unit(minutes, "minute") : null, unit(total % 60, "second")].filter((part): part is string => part !== null);
  return new Intl.ListFormat(locale, { style: "narrow", type: "unit" }).format(parts);
}

/** A playback rate as text: "1.5×". */
export function formatMediaRate(rate: number, locale?: string): string {
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(rate)}×`;
}

/** The rate after `rate` in `rates`, going round. */
export function nextMediaRate(rates: readonly number[], rate: number): number {
  const index = rates.findIndex((candidate) => Math.abs(candidate - rate) < 0.001);
  return rates[(index + 1) % rates.length] ?? 1;
}

/** Whether a key press should be left alone by a player's shortcuts: it was typed into a field or belongs to a control that uses it. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || target.closest("input, textarea, select, [role=textbox], [role=combobox], [role=menu], [role=listbox]") !== null;
}
