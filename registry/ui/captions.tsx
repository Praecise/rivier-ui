"use client";
/**
 * @name captions
 * @category ui
 * @description Captions drawn by the page instead of the browser, on a solid ground that reads on any picture, and a transcript: every line of a clip as a list that can be pressed to go there.
 * @when Inside video-player (Captions sits above the controls and moves with them) or beside audio-player (Transcript, or Captions with `inline`). Captions are for people who cannot hear the sound; a Transcript is also the alternative for people who cannot see or play it, so offer one for anything spoken. The lines come from a caption track of the media element (`<track kind="captions">`), or from `cues` the project passes. Not a live region: with the sound on, a screen reader would talk over it.
 * @example
 * // In a video player: the lines of the element's caption track
 * <VideoPlayer aria-label="Loading the kiln" defaultCaptions>
 *   <VideoPlayerVideo src="/kiln.mp4"><track kind="captions" src="/kiln.en.vtt" srcLang="en" label="English" /></VideoPlayerVideo>
 *   <Captions />
 *   <VideoPlayerControls>…</VideoPlayerControls>
 * </VideoPlayer>
 *
 * // Beside an audio player: cues from the project, as a transcript
 * const cues = [{ start: 0, end: 4, text: "Welcome." }, { start: 4, end: 9, text: "This is the yard." }];
 * <AudioPlayer aria-label="A walk through the yard">
 *   <AudioPlayerAudio src="/yard.mp3" />
 *   <AudioPlayerPlay /> <AudioPlayerWaveform peaks={peaks} />
 *   <Transcript cues={cues} aria-label="Transcript" lang="en" />
 * </AudioPlayer>
 */
import { useCallback, useEffect, useRef, useSyncExternalStore, type ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { formatMediaTime, useOptionalMediaContext } from "@/lib/use-media";

/** One line: when it starts and ends, in seconds, and what is said. */
export type Cue = { start: number; end: number; text: string };

/** The text of a WebVTT cue without its markup (<v Name>, <i>, timestamps). */
const plain = (text: string): string => text.replace(/<[^>]*>/g, "").trim();

/** Shows the chosen caption track without the browser drawing it ("hidden" loads its cues and fires cue changes), and switches the others off. */
function chooseTrack(media: HTMLMediaElement, chosen: number | null): void {
  for (let index = 0; index < media.textTracks.length; index += 1) {
    const track = media.textTracks[index];
    if (!track || (track.kind !== "captions" && track.kind !== "subtitles")) continue;
    track.mode = index === chosen ? "hidden" : "disabled";
  }
}

function cuesOf(track: TextTrack | null | undefined): Cue[] {
  const list: Cue[] = [];
  const cues = track?.cues;
  if (!cues) return list;
  for (let index = 0; index < cues.length; index += 1) {
    const cue = cues[index];
    if (cue) list.push({ start: cue.startTime, end: cue.endTime, text: plain((cue as VTTCue).text ?? "") });
  }
  return list;
}

/**
 * The cues of one of an element's caption tracks, kept current as the track loads. The snapshot is the
 * cues as text, so it is compared by value.
 */
function useTrackCues(media: HTMLMediaElement | null, index: number | null, enabled: boolean): Cue[] {
  const subscribe = useCallback(
    (onChange: () => void): (() => void) => {
      if (!media || !enabled) return () => {};
      chooseTrack(media, index);
      const track = index === null ? undefined : media.textTracks[index];
      const elements = [...media.querySelectorAll("track")];
      track?.addEventListener("cuechange", onChange);
      media.addEventListener("loadedmetadata", onChange);
      media.textTracks.addEventListener("addtrack", onChange);
      for (const element of elements) element.addEventListener("load", onChange);
      return () => {
        track?.removeEventListener("cuechange", onChange);
        media.removeEventListener("loadedmetadata", onChange);
        media.textTracks.removeEventListener("addtrack", onChange);
        for (const element of elements) element.removeEventListener("load", onChange);
      };
    },
    [media, index, enabled],
  );
  const snapshot = useSyncExternalStore(
    subscribe,
    () => (media && enabled && index !== null ? JSON.stringify(cuesOf(media.textTracks[index])) : "[]"),
    () => "[]",
  );
  return JSON.parse(snapshot) as Cue[];
}

type CueSource = {
  /** The lines, when the project has them. Left out, they are read from the media element's caption track. */
  cues?: readonly Cue[];
  /** The current time in seconds. Left out, it is the player's. */
  time?: number;
  /** The media element. Left out, it is the player's. */
  media?: HTMLMediaElement | null;
};

function useCues({ cues, time, media }: CueSource): { cues: readonly Cue[]; time: number; language: string | undefined } {
  const context = useOptionalMediaContext();
  const element = media ?? context?.media ?? null;
  const index = context ? context.captionTrack : firstCaptionTrack(element);
  const fromTrack = useTrackCues(element, index, cues === undefined);
  const language = cues === undefined && element && index !== null ? element.textTracks[index]?.language || undefined : undefined;
  return { cues: cues ?? fromTrack, time: time ?? context?.state.time ?? 0, language };
}

function firstCaptionTrack(media: HTMLMediaElement | null): number | null {
  if (!media) return null;
  for (let index = 0; index < media.textTracks.length; index += 1) {
    const kind = media.textTracks[index]?.kind;
    if (kind === "captions" || kind === "subtitles") return index;
  }
  return null;
}

export type CaptionsProps = Omit<ComponentProps<"div">, "children"> &
  CueSource & {
    /** Whether they show. Left out, it is the player's captions switch (on when there is no player). */
    show?: boolean;
    /** A normal block in the flow (beside an audio player) instead of a layer over the bottom of a video frame. */
    inline?: boolean;
  };

/**
 * The lines being said now. Over a video it sits along the bottom and moves up when the controls show, so
 * the two never overlap. The text is on a solid ground from the theme (it reads on any picture, in both
 * modes), its size follows the width of the frame, and it carries `lang` and `dir="auto"` so a caption in
 * another script is shaped and read the right way. Give `lang` when the cues are passed in; a track's own
 * language is used otherwise.
 */
export function Captions({ className, cues, time, media, show, inline = false, lang, ...props }: CaptionsProps) {
  const context = useOptionalMediaContext();
  const source = useCues({ cues, time, media });
  const on = show ?? context?.captions ?? true;
  const lines = on ? source.cues.filter((cue) => cue.start <= source.time && source.time < cue.end).flatMap((cue) => cue.text.split("\n")) : [];
  return (
    <div
      data-slot="captions"
      data-state={on ? "on" : "off"}
      className={cn(
        inline
          ? "flex min-h-[2lh] items-end justify-center text-base"
          : "pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center px-[4cqi] pb-[3cqi] text-[clamp(0.875rem,3.4cqi,1.75rem)] transition-transform duration-base ease-out group-data-[controls=shown]/player:translate-y-[calc(var(--rui-controls-h,0px)*-1)] motion-reduce:transition-none",
        className,
      )}
      {...props}
    >
      {lines.length > 0 ? (
        <p data-slot="captions-text" lang={lang ?? source.language} dir="auto" className="max-w-full text-center leading-normal font-medium">
          {lines.map((line, index) => (
            <span key={index} className="block">
              <span className="bg-background box-decoration-clone px-[0.4em] py-[0.1em] text-foreground">{line}</span>
            </span>
          ))}
        </p>
      ) : null}
    </div>
  );
}

export type TranscriptProps = Omit<ComponentProps<"div">, "children"> &
  CueSource & {
    /** Called with a line's start time when it is pressed. Left out, the player seeks there. */
    onSeek?: (time: number) => void;
    /** Show each line's time before it. Default true. */
    times?: boolean;
    /** The language tag times are formatted for. Left out, it is the player's. */
    locale?: string;
  };

/**
 * Every line, in order, each a button that goes to its moment; the line being said is marked with
 * `aria-current` and a bar at its start. The list scrolls inside its own box (give it a height with
 * `className`, default about six lines) and follows the playing line, unless the person has scrolled away:
 * then it leaves the list where they put it until the playing line is back in view. Name it with
 * `aria-label` ("Transcript").
 */
export function Transcript({ className, cues, time, media, onSeek, times = true, locale, lang, ...props }: TranscriptProps) {
  const context = useOptionalMediaContext();
  const source = useCues({ cues, time, media });
  const current = source.cues.findIndex((cue) => cue.start <= source.time && source.time < cue.end);
  const list = useRef<HTMLOListElement>(null);
  /** The person scrolled the list away from the playing line. */
  const away = useRef(false);

  const visible = (item: HTMLElement, box: HTMLElement): boolean => item.offsetTop >= box.scrollTop && item.offsetTop + item.offsetHeight <= box.scrollTop + box.clientHeight;

  useEffect(() => {
    const box = list.current;
    const item = box?.querySelector<HTMLElement>('[data-current="true"]');
    if (!box || !item || away.current || visible(item, box)) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    box.scrollTo({ top: item.offsetTop - (box.clientHeight - item.offsetHeight) / 2, behavior: reduced ? "instant" : "smooth" });
  }, [current]);

  const leave = (): void => {
    away.current = true;
  };

  return (
    <div data-slot="transcript" role="group" className={cn("min-w-0 rounded-surface border bg-card text-card-foreground", className)} {...props}>
      <ol
        ref={list}
        data-slot="transcript-list"
        lang={lang ?? source.language}
        className="relative flex max-h-48 flex-col overflow-y-auto overscroll-contain p-1"
        onWheel={leave}
        onTouchMove={leave}
        onKeyDown={(event) => {
          if (["PageUp", "PageDown"].includes(event.key)) leave();
        }}
        onScroll={(event) => {
          const item = event.currentTarget.querySelector<HTMLElement>('[data-current="true"]');
          if (item && visible(item, event.currentTarget)) away.current = false;
        }}
      >
        {source.cues.map((cue, index) => (
          <li key={`${cue.start}-${index}`} data-current={index === current ? "true" : undefined}>
            <button
              type="button"
              data-slot="transcript-cue"
              aria-current={index === current ? "true" : undefined}
              onClick={() => (onSeek ?? context?.actions.seek)?.(cue.start)}
              className="flex min-h-8 w-full items-baseline gap-3 rounded-control border-s-2 border-transparent px-2 py-1.5 text-start text-sm text-muted-foreground transition-colors duration-instant ease-out hover:bg-accent hover:text-foreground aria-[current=true]:border-primary aria-[current=true]:bg-highlight-soft aria-[current=true]:font-medium aria-[current=true]:text-foreground motion-reduce:transition-none pointer-coarse:min-h-(--control-h)"
            >
              {times ? (
                <span data-slot="transcript-time" className="shrink-0 text-xs tabular-nums">
                  {formatMediaTime(cue.start, locale ?? context?.locale)}
                </span>
              ) : null}
              <span dir="auto" className="min-w-0 whitespace-pre-line">
                {cue.text}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
