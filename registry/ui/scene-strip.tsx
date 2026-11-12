"use client";
/**
 * @name scene-strip
 * @category ui
 * @description A row of the scenes or chapters of a clip, each with a picture, a name and a length, that scrolls sideways, marks the one that is playing and goes to a scene when it is pressed.
 * @when Under or beside a player whose clip has named parts: chapters of a lesson, scenes of a film, steps of a recipe. It reads the time from the player it is inside (wrap the player and the strip in VideoPlayerProvider, or put it inside AudioPlayer), or from `time` and `onSeek`. For marks on the time bar itself use the scrubber's `marks`; for the spoken lines use Transcript.
 * @example
 * <VideoPlayerProvider>
 *   <VideoPlayer aria-label="A day at the pottery">…</VideoPlayer>
 *   <SceneStrip
 *     aria-label="Scenes"
 *     scenes={[
 *       { start: 0, label: "Wedging the clay", picture: <img src="/scene-1.jpg" alt="" /> },
 *       { start: 42, label: "On the wheel", picture: <img src="/scene-2.jpg" alt="" /> },
 *     ]}
 *   />
 * </VideoPlayerProvider>
 */
import { Play } from "lucide-react";
import { useEffect, useRef, type ComponentProps, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { inlineStep } from "@/lib/direction";
import { formatMediaTime, useOptionalMediaContext } from "@/lib/use-media";

export type Scene = {
  /** When it starts, in seconds. */
  start: number;
  /** When it ends. Left out: where the next scene starts, or the end of the clip. */
  end?: number;
  /** Its name. */
  label: string;
  /** Its picture: an element that fills the frame (an `<img alt="">`: the name is beside it). */
  picture?: ReactNode;
};

export type SceneStripProps = Omit<ComponentProps<"div">, "children"> & {
  scenes: readonly Scene[];
  /** The current time in seconds. Left out, it is the player's. */
  time?: number;
  /** The length of the clip in seconds, for the last scene's length. Left out, it is the player's. */
  duration?: number;
  /** Called with a scene's start when it is pressed. Left out, the player seeks there. */
  onSeek?: (time: number, scene: Scene) => void;
  /** The language tag lengths are formatted for. Left out, it is the player's. */
  locale?: string;
  /** What is said after the name of the playing scene ("playing"). Translate it with the interface. */
  currentLabel?: string;
};

/**
 * A toolbar of buttons with one Tab stop: Left and Right (the other way round in right-to-left pages, where
 * the strip itself runs from the right) move between scenes, Home and End go to the first and last, Enter
 * or Space goes to the scene. The playing scene carries `aria-current`, a mark on its picture and its name
 * in a heavier weight, and is kept in view as the clip plays, without ever scrolling the page. Name the
 * strip with `aria-label` ("Scenes").
 */
export function SceneStrip({ className, scenes, time, duration, onSeek, locale, currentLabel = "playing", onKeyDown, ...props }: SceneStripProps) {
  const context = useOptionalMediaContext();
  const now = time ?? context?.state.time ?? 0;
  const length = duration ?? context?.state.duration ?? 0;
  const where = locale ?? context?.locale;
  const box = useRef<HTMLDivElement>(null);

  const endOf = (index: number): number => scenes[index]?.end ?? scenes[index + 1]?.start ?? length;
  const current = scenes.findIndex((scene, index) => scene.start <= now && (now < endOf(index) || index === scenes.length - 1));

  // Keep the playing scene in view by scrolling the strip only (scrollIntoView would move the page too).
  useEffect(() => {
    const strip = box.current;
    const item = strip?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!strip || !item) return;
    const outer = strip.getBoundingClientRect();
    const inner = item.getBoundingClientRect();
    const shift = inner.left < outer.left ? inner.left - outer.left - 4 : inner.right > outer.right ? inner.right - outer.right + 4 : 0;
    if (shift === 0) return;
    strip.scrollBy({ left: shift, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }, [current]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const items = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("[data-slot=scene-strip-item]")];
    const at = items.indexOf(document.activeElement as HTMLButtonElement);
    const step = inlineStep(event.key, event.currentTarget);
    const next = step !== 0 ? at + step : event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : -1;
    if (at === -1 || next < 0 || next >= items.length) return;
    event.preventDefault();
    // The player's own Left and Right (seek) must not also run.
    event.stopPropagation();
    items[next]?.focus();
  };

  // One Tab stop: the playing scene, or the first when none is.
  const stop = current === -1 ? 0 : current;

  return (
    <div
      ref={box}
      data-slot="scene-strip"
      role="toolbar"
      aria-orientation="horizontal"
      onKeyDown={handleKeyDown}
      className={cn("flex w-full min-w-0 snap-x scroll-px-1 gap-2 overflow-x-auto overscroll-x-contain p-1", className)}
      {...props}
    >
      {scenes.map((scene, index) => {
        const playing = index === current;
        const span = endOf(index) - scene.start;
        return (
          <button
            key={`${scene.start}-${scene.label}`}
            type="button"
            data-slot="scene-strip-item"
            tabIndex={index === stop ? 0 : -1}
            aria-current={playing ? "true" : undefined}
            onClick={() => (onSeek ? onSeek(scene.start, scene) : context?.actions.seek(scene.start))}
            onFocus={(event) => event.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest" })}
            // relative: the visually hidden text inside is positioned, and must stay within the item so the strip clips it.
            className="group/scene relative flex w-28 shrink-0 snap-start flex-col gap-1.5 rounded-control p-1 text-start text-xs text-muted-foreground transition-colors duration-instant ease-out hover:bg-accent hover:text-foreground aria-[current=true]:text-foreground motion-reduce:transition-none sm:w-36"
          >
            <span
              data-slot="scene-strip-picture"
              className="relative block aspect-video w-full overflow-hidden rounded-control border border-border-strong bg-muted group-aria-[current=true]/scene:border-primary [&>img]:size-full [&>img]:object-cover"
            >
              {scene.picture}
              {playing ? (
                <span aria-hidden="true" className="absolute start-1 bottom-1 inline-flex size-5 items-center justify-center rounded-control bg-primary text-primary-foreground">
                  <Play strokeWidth={2} className="size-3" />
                </span>
              ) : null}
            </span>
            <span className="flex min-w-0 items-baseline justify-between gap-2">
              <span data-slot="scene-strip-label" className="min-w-0 truncate group-aria-[current=true]/scene:font-medium">
                {scene.label}
                {playing ? <span className="sr-only">, {currentLabel}</span> : null}
              </span>
              {span > 0 ? (
                <span data-slot="scene-strip-length" className="shrink-0 tabular-nums">
                  {formatMediaTime(span, where)}
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
