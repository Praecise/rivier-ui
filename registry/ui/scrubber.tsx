"use client";
/**
 * @name scrubber
 * @category ui
 * @description The time bar of a player: a slider over the length of a clip that shows what has played and what has loaded, marks chapters, and can show the time and a picture for the moment under the pointer.
 * @when Seeking in audio, video or any timeline measured in seconds. video-player and audio-player already contain one bound to their media; use this directly for a custom player or a timeline. For choosing a number that is not a time use slider. Time runs left to right in every language (as on players everywhere: the bar is a picture of time, like a clock face, not a line of text), so the bar and its arrow keys are not mirrored in right-to-left pages; pass `dir="rtl"` if a product decides otherwise, and the keys follow what is drawn.
 * @example
 * // Uncontrolled
 * <Scrubber duration={200} defaultValue={65} aria-label="Seek" onValueCommit={(time) => player.seek(time)} />
 *
 * // Controlled by the player's clock, with chapters and a preview picture from a sprite sheet
 * <Scrubber
 *   value={time}
 *   duration={duration}
 *   buffered={[[0, 90]]}
 *   marks={[{ time: 0, label: "Opening" }, { time: 60, label: "The climb" }]}
 *   onValueCommit={seek}
 *   aria-label="Seek"
 * >
 *   <ScrubberTrack />
 *   <ScrubberThumb />
 *   <ScrubberPreview thumbnail={{ url: "/sprite.jpg", columns: 10, rows: 10, interval: 2 }} />
 * </Scrubber>
 */
import { Slider as SliderPrimitive } from "radix-ui";
import { createContext, use, useRef, useState, type ComponentProps, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useControllableState } from "@/lib/use-controllable-state";
import { describeMediaTime, formatMediaTime } from "@/lib/use-media";

/** A named moment on the bar: the start of a chapter or a scene. */
export type ScrubberMark = { time: number; label: string };

/** One picture file holding a grid of stills, one every `interval` seconds, left to right then top to bottom. */
export type ScrubberSprite = { url: string; columns: number; rows: number; interval: number; aspect?: number };

type ScrubberContextValue = {
  value: number;
  duration: number;
  buffered: readonly (readonly [number, number])[];
  marks: readonly ScrubberMark[];
  locale: string | undefined;
  label: { "aria-label"?: string | undefined; "aria-labelledby"?: string | undefined; "aria-describedby"?: string | undefined };
  valueText: string;
  /** The time the preview shows, or null when it is hidden. */
  previewTime: number | null;
  setThumbFocused: (focused: boolean) => void;
};

const ScrubberContext = createContext<ScrubberContextValue | null>(null);

function useScrubber(part: string): ScrubberContextValue {
  const context = use(ScrubberContext);
  if (!context) throw new Error(`<${part}> must be used inside <Scrubber>.`);
  return context;
}

/** The mark a time falls in: the last one that starts at or before it. */
export function markAt(marks: readonly ScrubberMark[], time: number): ScrubberMark | undefined {
  let found: ScrubberMark | undefined;
  for (const mark of marks) if (mark.time <= time && (!found || mark.time >= found.time)) found = mark;
  return found;
}

export type ScrubberProps = Omit<ComponentProps<typeof SliderPrimitive.Root>, "value" | "defaultValue" | "onValueChange" | "onValueCommit" | "min" | "max" | "orientation" | "inverted" | "minStepsBetweenThumbs"> & {
  /** The current time in seconds: controlled, usually the player's clock. */
  value?: number;
  /** The starting time when uncontrolled. Default 0. */
  defaultValue?: number;
  /** Called while the thumb is dragged and on every key press. */
  onValueChange?: (time: number) => void;
  /** Called once when the drag ends or a key is pressed: seek here. */
  onValueCommit?: (time: number) => void;
  /** The length in seconds. 0 or less (not known yet) disables the bar. */
  duration: number;
  /** Loaded ranges as [start, end] in seconds, drawn under the played part. */
  buffered?: readonly (readonly [number, number])[];
  /** Chapters or scenes: ticks on the bar, and their names in the preview and in what a screen reader says. */
  marks?: readonly ScrubberMark[];
  /** What Left and Right move by, in seconds. Default 5. */
  keyStep?: number;
  /** What Page Up and Page Down (and Shift with an arrow) move by, in seconds. Default 30. */
  pageStep?: number;
  /** The language tag times are formatted for. */
  locale?: string;
  /** What a screen reader says for a position. Default: "1 minute 5 seconds of 3 minutes 20 seconds", then the chapter. Replace it to translate "of". */
  valueText?: (time: number, duration: number, mark: ScrubberMark | undefined) => string;
  /** The parts. Default: ScrubberTrack and ScrubberThumb. */
  children?: ReactNode;
};

/**
 * A slider (role="slider" on the thumb). Right moves forward and Left back by `keyStep`; Page Up and Page
 * Down by `pageStep`; Home and End go to the start and the end. While the thumb is dragged the bar shows the
 * drag, not `value`, so a clock that keeps running does not pull the thumb away. Name it with `aria-label`
 * ("Seek") or `aria-labelledby`.
 */
export function Scrubber({
  className,
  value,
  defaultValue = 0,
  onValueChange,
  onValueCommit,
  duration,
  buffered = [],
  marks = [],
  step = 0.1,
  keyStep = 5,
  pageStep = 30,
  dir = "ltr",
  locale,
  valueText,
  disabled,
  children,
  onKeyDown,
  onPointerDown,
  onPointerMove,
  onPointerLeave,
  onPointerUp,
  onPointerCancel,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  ...props
}: ScrubberProps) {
  const known = Number.isFinite(duration) && duration > 0;
  const length = known ? duration : 1;
  const [time, setTime] = useControllableState({ value, defaultValue, onChange: onValueChange });
  /** Where the thumb is being dragged to, until it is let go. */
  const [drag, setDrag] = useState<number | null>(null);
  const [pressed, setPressed] = useState(false);
  /** The same as `pressed`, readable in the handlers of the press that set it. */
  const pressing = useRef(false);
  const [pointerTime, setPointerTime] = useState<number | null>(null);
  const [thumbFocused, setThumbFocused] = useState(false);
  const shown = Math.min(length, Math.max(0, drag ?? time));

  const timeAt = (event: PointerEvent<HTMLElement>): number => {
    const rect = event.currentTarget.getBoundingClientRect();
    const fraction = rect.width > 0 ? Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)) : 0;
    return (dir === "rtl" ? 1 - fraction : fraction) * length;
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLSpanElement>): void => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const forward = dir === "rtl" ? "ArrowLeft" : "ArrowRight";
    const back = dir === "rtl" ? "ArrowRight" : "ArrowLeft";
    const large = event.shiftKey ? pageStep : keyStep;
    const moves: Record<string, number | undefined> = { [forward]: large, [back]: -large, ArrowUp: large, ArrowDown: -large, PageUp: pageStep, PageDown: -pageStep };
    const move = moves[event.key];
    if (move === undefined) return;
    // The slider's own arrow step is its pointer resolution (a tenth of a second); a key press moves by seconds.
    event.preventDefault();
    const next = Math.min(length, Math.max(0, shown + move));
    setTime(next);
    onValueCommit?.(next);
  };

  const mark = markAt(marks, shown);
  const text = !known ? "" : valueText ? valueText(shown, duration, mark) : defaultValueText(shown, duration, mark, locale);
  const previewTime = !known ? null : pressed ? shown : (pointerTime ?? (thumbFocused ? shown : null));

  return (
    <ScrubberContext
      value={{
        value: shown,
        duration: length,
        buffered,
        marks,
        locale,
        label: { "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy, "aria-describedby": ariaDescribedBy },
        valueText: text,
        previewTime,
        setThumbFocused,
      }}
    >
      <SliderPrimitive.Root
        data-slot="scrubber"
        dir={dir}
        min={0}
        max={length}
        step={step}
        value={[shown]}
        disabled={disabled || !known}
        onValueChange={([next]) => {
          if (next === undefined) return;
          // Only a pointer drags: Home and End commit at once.
          if (pressing.current) setDrag(next);
          setTime(next);
        }}
        onValueCommit={([next]) => {
          setDrag(null);
          if (next !== undefined) onValueCommit?.(next);
        }}
        onKeyDown={handleKeyDown}
        onPointerDown={(event) => {
          onPointerDown?.(event);
          pressing.current = true;
          setPressed(true);
        }}
        onPointerMove={(event) => {
          onPointerMove?.(event);
          setPointerTime(timeAt(event));
        }}
        onPointerLeave={(event) => {
          onPointerLeave?.(event);
          setPointerTime(null);
        }}
        onPointerUp={(event) => {
          onPointerUp?.(event);
          pressing.current = false;
          setPressed(false);
          setDrag(null);
          if (event.pointerType !== "mouse") setPointerTime(null);
        }}
        onPointerCancel={(event) => {
          onPointerCancel?.(event);
          pressing.current = false;
          setPressed(false);
          setDrag(null);
          setPointerTime(null);
        }}
        className={cn(
          "group/scrubber relative flex h-6 w-full min-w-0 touch-none items-center select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 pointer-coarse:h-10",
          className,
        )}
        {...props}
      >
        {children ?? (
          <>
            <ScrubberTrack />
            <ScrubberThumb />
          </>
        )}
      </SliderPrimitive.Root>
    </ScrubberContext>
  );
}

function defaultValueText(time: number, duration: number, mark: ScrubberMark | undefined, locale?: string): string {
  const position = `${describeMediaTime(time, locale)} of ${describeMediaTime(duration, locale)}`;
  return mark ? `${position}, ${mark.label}` : position;
}

/** A position along the bar as an inline-start offset, so it follows the bar's own direction. */
const along = (time: number, duration: number): string => `${Math.min(100, Math.max(0, (time / duration) * 100))}%`;

/** The bar: what has loaded, what has played, and the marks. */
export function ScrubberTrack({ className, children, ...props }: ComponentProps<typeof SliderPrimitive.Track>) {
  const { buffered, duration } = useScrubber("ScrubberTrack");
  return (
    <SliderPrimitive.Track data-slot="scrubber-track" className={cn("relative h-1.5 w-full grow overflow-hidden rounded-full bg-border-strong", className)} {...props}>
      {buffered.map(([start, end]) => (
        <span
          key={`${start}-${end}`}
          data-slot="scrubber-buffered"
          className="absolute inset-y-0 bg-muted-foreground opacity-50"
          style={{ insetInlineStart: along(start, duration), width: along(end - start, duration) }}
        />
      ))}
      <SliderPrimitive.Range data-slot="scrubber-range" className="absolute h-full bg-primary" />
      {children ?? <ScrubberMarks />}
    </SliderPrimitive.Track>
  );
}

/** A gap in the bar where each chapter or scene starts. Decoration: the names are in the preview and in the slider's value text. */
export function ScrubberMarks({ className, ...props }: ComponentProps<"span">) {
  const { marks, duration } = useScrubber("ScrubberMarks");
  return (
    <span data-slot="scrubber-marks" aria-hidden="true" className={cn("pointer-events-none absolute inset-0", className)} {...props}>
      {marks
        .filter((mark) => mark.time > 0 && mark.time < duration)
        .map((mark) => (
          <span key={mark.time} data-slot="scrubber-mark" className="absolute inset-y-0 w-0.5 bg-background" style={{ insetInlineStart: along(mark.time, duration) }} />
        ))}
    </span>
  );
}

/** The handle: the element that is the slider. Its target is 40px whatever its drawn size. */
export function ScrubberThumb({ className, onFocus, onBlur, ...props }: ComponentProps<typeof SliderPrimitive.Thumb>) {
  const { label, valueText, setThumbFocused } = useScrubber("ScrubberThumb");
  return (
    <SliderPrimitive.Thumb
      data-slot="scrubber-thumb"
      aria-valuetext={valueText}
      onFocus={(event) => {
        onFocus?.(event);
        // Only for a keyboard: a pointer shows the preview where it points.
        setThumbFocused(event.currentTarget.matches(":focus-visible"));
      }}
      onBlur={(event) => {
        onBlur?.(event);
        setThumbFocused(false);
      }}
      className={cn(
        "relative block size-4 shrink-0 rounded-full border border-primary bg-background transition-transform duration-instant ease-out after:absolute after:-inset-3 active:scale-110 motion-reduce:transition-none motion-reduce:active:scale-100",
        className,
      )}
      {...label}
      {...props}
    />
  );
}

export type ScrubberPreviewProps = Omit<ComponentProps<"div">, "children"> & {
  /** The picture for a moment: a function of the time that returns an element, or a sprite sheet. Left out, the preview shows the time alone. */
  thumbnail?: ((time: number) => ReactNode) | ScrubberSprite;
  /** Replaces the time and chapter line. */
  children?: (time: number, mark: ScrubberMark | undefined) => ReactNode;
};

/**
 * A small surface above the bar at the moment under the pointer (or at the thumb, while it is dragged or
 * has keyboard focus). It stays inside the ends of the bar. Hidden from assistive technology: the slider
 * already says the time and the chapter. Its width is `--rui-preview-w`; set that in `className` to resize it.
 */
export function ScrubberPreview({ className, style, thumbnail, children, ...props }: ScrubberPreviewProps) {
  const { previewTime, duration, marks, locale } = useScrubber("ScrubberPreview");
  if (previewTime === null) return null;
  const mark = markAt(marks, previewTime);
  return (
    <div
      data-slot="scrubber-preview"
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute bottom-full z-10 mb-1 flex w-(--rui-preview-w) flex-col items-center gap-1 text-xs text-popover-foreground",
        thumbnail ? "[--rui-preview-w:8rem]" : "[--rui-preview-w:6rem]",
        className,
      )}
      style={{ insetInlineStart: `clamp(0px, calc(${along(previewTime, duration)} - var(--rui-preview-w) / 2), calc(100% - var(--rui-preview-w)))`, ...style }}
      {...props}
    >
      {thumbnail ? (
        <div data-slot="scrubber-preview-picture" className="w-full overflow-hidden rounded-control border border-border-strong bg-muted">
          {typeof thumbnail === "function" ? thumbnail(previewTime) : <SpriteFrame sprite={thumbnail} time={previewTime} />}
        </div>
      ) : null}
      <div data-slot="scrubber-preview-label" className="flex max-w-full flex-col items-center rounded-control border border-border-strong bg-popover px-1.5 py-0.5 text-center tabular-nums">
        {children ? (
          children(previewTime, mark)
        ) : (
          <>
            {mark ? <span className="max-w-full truncate font-medium">{mark.label}</span> : null}
            <span>{formatMediaTime(previewTime, locale)}</span>
          </>
        )}
      </div>
    </div>
  );
}

/** One still out of a sprite sheet, picked by time. */
function SpriteFrame({ sprite, time }: { sprite: ScrubberSprite; time: number }) {
  const count = sprite.columns * sprite.rows;
  const index = Math.min(count - 1, Math.max(0, Math.floor(time / sprite.interval)));
  const column = index % sprite.columns;
  const row = Math.floor(index / sprite.columns);
  const position = (at: number, of: number): string => (of > 1 ? `${(at / (of - 1)) * 100}%` : "0%");
  return (
    <div
      data-slot="scrubber-sprite"
      data-frame={index}
      className="w-full bg-no-repeat"
      style={{
        aspectRatio: String(sprite.aspect ?? 16 / 9),
        backgroundImage: `url(${JSON.stringify(sprite.url)})`,
        backgroundSize: `${sprite.columns * 100}% ${sprite.rows * 100}%`,
        backgroundPosition: `${position(column, sprite.columns)} ${position(row, sprite.rows)}`,
      }}
    />
  );
}
