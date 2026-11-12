"use client";
/**
 * @name audio-player
 * @category ui
 * @description The parts of a sound player around an `<audio>` element: play, a waveform that is also the time bar, time, speed and mute.
 * @when A voice note, a recording, a clip of music or narration a person plays and seeks in. The project gives the element its source and, for the waveform, the peaks (computed ahead of time, or with computePeaks for a short clip); without peaks the bar is a flat line of the same size. Offer a Transcript (from captions) for anything spoken. Nothing plays by itself. For video use video-player; for a plain time bar without a waveform use scrubber.
 * @example
 * <AudioPlayer aria-label="Voice note from Ana">
 *   <AudioPlayerAudio src="/note.mp3" />
 *   <AudioPlayerPlay />
 *   <AudioPlayerWaveform peaks={peaks} />
 *   <AudioPlayerTime />
 *   <AudioPlayerRate />
 *   <AudioPlayerMute />
 * </AudioPlayer>
 *
 * // Peaks for a short clip, in the browser
 * const peaks = await computePeaks(await (await fetch("/note.mp3")).arrayBuffer(), 64);
 */
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { createContext, use, useImperativeHandle, useState, type ComponentProps, type KeyboardEvent, type PointerEvent } from "react";
import { announce } from "@/lib/announce";
import { cn } from "@/lib/cn";
import {
  MediaContext,
  describeMediaTime,
  formatMediaRate,
  formatMediaTime,
  isTypingTarget,
  nextMediaRate,
  useMediaContext,
  useMediaProvider,
  type MediaProviderOptions,
} from "@/lib/use-media";

/** Every word the player says. Pass `labels` to translate any of them. */
export type AudioPlayerLabels = { play: string; pause: string; mute: string; seek: string; rate: string; muted: string; unmuted: string; error: string };

const LABELS: AudioPlayerLabels = {
  play: "Play",
  pause: "Pause",
  mute: "Mute",
  seek: "Seek",
  rate: "Playback speed",
  muted: "Muted",
  unmuted: "Sound on",
  error: "This sound could not be played.",
};

const LabelsContext = createContext<AudioPlayerLabels>(LABELS);

export type AudioPlayerProps = ComponentProps<"div"> &
  MediaProviderOptions & {
    /** Seconds Left and Right move by. Default 5. */
    seekStep?: number;
    labels?: Partial<AudioPlayerLabels>;
  };

/**
 * A named group laid out as one row that wraps. While focus is inside it, K plays and pauses, M mutes, and
 * Left and Right go back and forward (time runs left to right in every language, like the waveform). Name it
 * with `aria-label`: what the sound is.
 */
export function AudioPlayer({ className, seekStep = 5, labels, locale, captions, defaultCaptions, onCaptionsChange, children, onKeyDown, ...props }: AudioPlayerProps) {
  const media = useMediaProvider({ locale, captions, defaultCaptions, onCaptionsChange });
  const { state, actions } = media;
  const words = { ...LABELS, ...labels };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    onKeyDown?.(event);
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || isTypingTarget(event.target)) return;
    const onSlider = (event.target as HTMLElement).closest("[role=slider]") !== null;
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    const act: Record<string, (() => void) | undefined> = {
      k: actions.toggle,
      m: () => {
        announce(state.muted ? words.unmuted : words.muted);
        actions.toggleMuted();
      },
      ArrowLeft: onSlider ? undefined : () => actions.seekBy(-seekStep),
      ArrowRight: onSlider ? undefined : () => actions.seekBy(seekStep),
    };
    const run = act[key];
    if (!run) return;
    event.preventDefault();
    run();
  };

  return (
    <MediaContext value={media}>
      <LabelsContext value={words}>
        <div
          data-slot="audio-player"
          role="group"
          data-playing={state.playing ? "" : undefined}
          className={cn("flex w-full min-w-0 flex-wrap items-center gap-x-2 gap-y-1 rounded-surface border bg-card p-2 text-card-foreground", className)}
          onKeyDown={handleKeyDown}
          {...props}
        >
          {children}
          {state.error !== null ? (
            <p data-slot="audio-player-error" role="alert" className="w-full px-1 text-sm text-destructive">
              {words.error}
            </p>
          ) : null}
        </div>
      </LabelsContext>
    </MediaContext>
  );
}

/** The `<audio>` element: give it `src` or `<source>` children. It draws nothing (the parts are the controls) and never plays by itself. */
export function AudioPlayerAudio({ ref, children, ...props }: ComponentProps<"audio">) {
  const { media, setMedia } = useMediaContext("AudioPlayerAudio");
  // The player holds the element; a ref from the project is given the same one.
  useImperativeHandle(ref, () => media as HTMLAudioElement, [media]);
  return (
    <audio ref={setMedia} data-slot="audio-player-audio" preload="metadata" {...props}>
      {children}
    </audio>
  );
}

type ControlButtonProps = Omit<ComponentProps<"button">, "type">;

const controlButton =
  "inline-flex h-8 min-w-8 shrink-0 items-center justify-center gap-1 rounded-control px-1.5 text-sm font-medium text-foreground transition-[background-color,opacity] duration-instant ease-out select-none hover:bg-accent disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none pointer-coarse:h-(--control-h) pointer-coarse:min-w-(--control-h) [&_svg]:size-4 [&_svg]:shrink-0";

/** Plays or pauses, in the highlight colour: the one main action. Its name is what pressing it will do: "Play", then "Pause". */
export function AudioPlayerPlay({ className, children, onClick, ...props }: ControlButtonProps) {
  const { state, actions } = useMediaContext("AudioPlayerPlay");
  const labels = use(LabelsContext);
  return (
    <button
      type="button"
      data-slot="audio-player-play"
      aria-label={state.playing ? labels.pause : labels.play}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) actions.toggle();
      }}
      className={cn(controlButton, "size-(--control-h) bg-primary px-0 text-primary-foreground hover:bg-primary hover:opacity-90", className)}
      {...props}
    >
      {children ?? (state.playing ? <Pause aria-hidden="true" strokeWidth={1.5} /> : <Play aria-hidden="true" strokeWidth={1.5} />)}
    </button>
  );
}

/** Elapsed and total time, in figures of equal width. Not a live region: the waveform says the time when asked. */
export function AudioPlayerTime({ className, ...props }: ComponentProps<"span">) {
  const { state, locale } = useMediaContext("AudioPlayerTime");
  return (
    <span data-slot="audio-player-time" className={cn("shrink-0 px-1 text-xs whitespace-nowrap text-muted-foreground tabular-nums", className)} {...props}>
      <span data-slot="audio-player-elapsed" className="text-foreground">
        {formatMediaTime(state.time, locale)}
      </span>
      {" / "}
      <span data-slot="audio-player-duration">{formatMediaTime(state.duration, locale)}</span>
    </span>
  );
}

/** Mutes or unmutes: a toggle whose pressed state says whether it is on. */
export function AudioPlayerMute({ className, children, onClick, ...props }: ControlButtonProps) {
  const { state, actions } = useMediaContext("AudioPlayerMute");
  const labels = use(LabelsContext);
  return (
    <button
      type="button"
      data-slot="audio-player-mute"
      aria-label={labels.mute}
      aria-pressed={state.muted}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) actions.toggleMuted();
      }}
      className={cn(controlButton, className)}
      {...props}
    >
      {children ?? (state.muted ? <VolumeX aria-hidden="true" strokeWidth={1.5} /> : <Volume2 aria-hidden="true" strokeWidth={1.5} />)}
    </button>
  );
}

const RATES = [1, 1.25, 1.5, 2, 0.75] as const;

/** The playback speed: each press goes to the next of `rates` and says it. Its name carries the speed ("Playback speed: 1.5×"). */
export function AudioPlayerRate({ className, rates = RATES, onClick, children, ...props }: ControlButtonProps & { rates?: readonly number[] }) {
  const { state, actions, locale } = useMediaContext("AudioPlayerRate");
  const labels = use(LabelsContext);
  return (
    <button
      type="button"
      data-slot="audio-player-rate"
      aria-label={`${labels.rate}: ${formatMediaRate(state.rate, locale)}`}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        const next = nextMediaRate(rates, state.rate);
        actions.setRate(next);
        announce(`${labels.rate}: ${formatMediaRate(next, locale)}`);
      }}
      className={cn(controlButton, className)}
      {...props}
    >
      {children ?? <span dir="ltr" className="min-w-8 text-center text-xs tabular-nums">{formatMediaRate(state.rate, locale)}</span>}
    </button>
  );
}

export type AudioPlayerWaveformProps = Omit<ComponentProps<"div">, "children" | "dir"> & {
  /** One number from 0 to 1 per bar: how loud that slice of the sound is. Left out (not computed yet), a flat line of the same size is drawn. */
  peaks?: readonly number[] | undefined;
  /** How many bars the flat line has while there are no peaks. Default 48. */
  bars?: number;
  /** Seconds Left and Right move by. Default 5. */
  keyStep?: number;
  /** Seconds Page Up and Page Down move by. Default 30. */
  pageStep?: number;
  /** "ltr" (default): time runs left to right in every language. "rtl" mirrors the drawing and the keys together. */
  dir?: "ltr" | "rtl";
  /** What a screen reader says for a position. Default: "5 seconds of 20 seconds". Replace it to translate "of". */
  valueText?: (time: number, duration: number) => string;
};

/**
 * The sound drawn as bars, and the time bar at once: it is a slider (role="slider"). What has played is in
 * the highlight colour with a line at the playing position, so the position does not rest on colour alone.
 * Press or drag to seek; Right and Left move by `keyStep`, Page Up and Page Down by `pageStep`, Home and End
 * go to the ends. It takes the width left in the row and keeps its height with or without peaks.
 */
export function AudioPlayerWaveform({
  className,
  peaks,
  bars = 48,
  keyStep = 5,
  pageStep = 30,
  dir = "ltr",
  valueText,
  onKeyDown,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  ...props
}: AudioPlayerWaveformProps) {
  const { state, actions, locale } = useMediaContext("AudioPlayerWaveform");
  const labels = use(LabelsContext);
  const known = state.duration > 0;
  const duration = known ? state.duration : 1;
  /** Where it is being dragged to, until it is let go. */
  const [drag, setDrag] = useState<number | null>(null);
  const time = Math.min(duration, Math.max(0, drag ?? state.time));
  const progress = time / duration;
  const heights = peaks && peaks.length > 0 ? peaks : null;
  const count = heights ? heights.length : bars;

  const timeAt = (event: PointerEvent<HTMLDivElement>): number => {
    const rect = event.currentTarget.getBoundingClientRect();
    const fraction = rect.width > 0 ? Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)) : 0;
    return (dir === "rtl" ? 1 - fraction : fraction) * duration;
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    onKeyDown?.(event);
    if (event.defaultPrevented || !known) return;
    const forward = dir === "rtl" ? "ArrowLeft" : "ArrowRight";
    const back = dir === "rtl" ? "ArrowRight" : "ArrowLeft";
    const moves: Record<string, number | undefined> = {
      [forward]: time + keyStep,
      [back]: time - keyStep,
      ArrowUp: time + keyStep,
      ArrowDown: time - keyStep,
      PageUp: time + pageStep,
      PageDown: time - pageStep,
      Home: 0,
      End: duration,
    };
    const next = moves[event.key];
    if (next === undefined) return;
    event.preventDefault();
    event.stopPropagation();
    actions.seek(next);
  };

  return (
    <div
      data-slot="audio-player-waveform"
      role="slider"
      tabIndex={known ? 0 : -1}
      dir={dir}
      aria-label={labels.seek}
      aria-orientation="horizontal"
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      aria-valuenow={Math.round(time)}
      aria-valuetext={known ? (valueText ? valueText(time, duration) : `${describeMediaTime(time, locale)} of ${describeMediaTime(duration, locale)}`) : undefined}
      aria-disabled={known ? undefined : true}
      data-peaks={heights ? "" : undefined}
      onKeyDown={handleKeyDown}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        if (event.defaultPrevented || event.button !== 0 || !known) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        setDrag(timeAt(event));
      }}
      onPointerMove={(event) => {
        onPointerMove?.(event);
        if (drag !== null) setDrag(timeAt(event));
      }}
      onPointerUp={(event) => {
        onPointerUp?.(event);
        if (drag === null) return;
        actions.seek(timeAt(event));
        setDrag(null);
      }}
      onPointerCancel={(event) => {
        onPointerCancel?.(event);
        setDrag(null);
      }}
      className={cn("relative h-12 min-w-24 flex-1 cursor-pointer touch-pan-y rounded-control select-none aria-disabled:cursor-default aria-disabled:opacity-60", className)}
      {...props}
    >
      <svg aria-hidden="true" viewBox={`0 0 ${count} 100`} preserveAspectRatio="none" className={cn("size-full", dir === "rtl" && "-scale-x-100")}>
        {Array.from({ length: count }, (_, index) => {
          // A flat line while there are no peaks; never less than a visible stub.
          const height = heights ? Math.max(6, Math.min(1, heights[index] ?? 0) * 100) : 6;
          const played = (index + 0.5) / count <= progress;
          return <rect key={index} x={index + 0.2} y={(100 - height) / 2} width={0.6} height={height} className={played ? "fill-primary" : "fill-muted-foreground opacity-60"} />;
        })}
      </svg>
      <span
        aria-hidden="true"
        data-slot="audio-player-playhead"
        className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-foreground rtl:translate-x-1/2"
        style={{ insetInlineStart: `${progress * 100}%` }}
      />
    </div>
  );
}

/**
 * Peaks for AudioPlayerWaveform from a sound file's bytes: decodes it with Web Audio in the browser and
 * returns `count` numbers from 0 to 1 (the loudest sample of each slice, scaled so the loudest slice is 1).
 * It holds the whole decoded sound in memory, so it is meant for voice notes and clips of a few minutes
 * (files under about 10 MB); for anything longer compute the peaks once on the server and store them with
 * the file. Rejects when the browser cannot decode the file.
 */
export async function computePeaks(data: ArrayBuffer, count = 64): Promise<number[]> {
  // An offline context decodes without a gesture and without opening a sound device.
  const context = new OfflineAudioContext(1, 1, 44100);
  const audio = await context.decodeAudioData(data.slice(0));
  const samples = audio.getChannelData(0);
  const size = Math.max(1, Math.floor(samples.length / count));
  // Reading every sample of a long clip would block the page: look at up to about 500 samples per slice.
  const stride = Math.max(1, Math.floor(size / 500));
  const peaks: number[] = [];
  for (let slice = 0; slice < count; slice += 1) {
    let loudest = 0;
    const end = Math.min(samples.length, (slice + 1) * size);
    for (let index = slice * size; index < end; index += stride) loudest = Math.max(loudest, Math.abs(samples[index] ?? 0));
    peaks.push(loudest);
  }
  const top = Math.max(...peaks);
  return top > 0 ? peaks.map((peak) => Number((peak / top).toFixed(3))) : peaks;
}
