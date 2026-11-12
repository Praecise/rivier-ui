"use client";
/**
 * @name video-player
 * @category ui
 * @description The parts of a video player around a `<video>` element the project renders: a frame that keeps its shape, controls that step back while it plays, play, mute, volume, time, a scrubber, captions, speed, full screen, and words for loading and failure.
 * @when Any video a person controls: a clip on a page, a lesson, a recording. The project gives the element its sources (a file, or HLS attached to the element); the parts only drive it, so compose the ones the clip needs. Nothing plays by itself: for a silent, looping decoration use a plain `<video muted loop>` with its own pause control. For sound alone use audio-player; for a picture viewer use lightbox.
 * @example
 * <VideoPlayer aria-label="How the kiln is loaded" defaultCaptions>
 *   <VideoPlayerVideo src="/kiln.mp4" poster="/kiln.jpg">
 *     <track kind="captions" src="/kiln.en.vtt" srcLang="en" label="English" />
 *   </VideoPlayerVideo>
 *   <VideoPlayerLoading />
 *   <VideoPlayerError />
 *   <Captions />
 *   <VideoPlayerControls>
 *     <VideoPlayerScrubber />
 *     <VideoPlayerControlsRow>
 *       <VideoPlayerPlay />
 *       <VideoPlayerMute />
 *       <VideoPlayerVolume />
 *       <VideoPlayerTime />
 *       <VideoPlayerCaptionsButton className="ms-auto" />
 *       <VideoPlayerRate />
 *       <VideoPlayerFullscreen />
 *     </VideoPlayerControlsRow>
 *   </VideoPlayerControls>
 * </VideoPlayer>
 */
import { Captions as CaptionsIcon, CaptionsOff, Maximize, Minimize, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { DropdownMenu as MenuPrimitive, Slider as SliderPrimitive } from "radix-ui";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentProps,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { DropdownMenu, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Scrubber, ScrubberPreview, ScrubberThumb, ScrubberTrack, type ScrubberProps } from "@/components/ui/scrubber";
import { Spinner } from "@/components/ui/spinner";
import { announce } from "@/lib/announce";
import { cn } from "@/lib/cn";
import { MediaContext, formatMediaRate, formatMediaTime, isTypingTarget, nextMediaRate, useMediaContext, useMediaProvider, useOptionalMediaContext, type MediaProviderOptions } from "@/lib/use-media";

/** Every word the player says. Pass `labels` to translate any of them. */
export type VideoPlayerLabels = {
  play: string;
  pause: string;
  mute: string;
  unmute: string;
  volume: string;
  seek: string;
  captions: string;
  captionsOff: string;
  captionsOn: string;
  noCaptions: string;
  rate: string;
  enterFullscreen: string;
  exitFullscreen: string;
  controls: string;
  loading: string;
  error: string;
  retry: string;
  muted: string;
  unmuted: string;
};

const LABELS: VideoPlayerLabels = {
  play: "Play",
  pause: "Pause",
  mute: "Mute",
  unmute: "Unmute",
  volume: "Volume",
  seek: "Seek",
  captions: "Captions",
  captionsOff: "Off",
  captionsOn: "Captions on",
  noCaptions: "Captions off",
  rate: "Playback speed",
  enterFullscreen: "Full screen",
  exitFullscreen: "Exit full screen",
  controls: "Video controls",
  loading: "Loading",
  error: "This video could not be played.",
  retry: "Try again",
  muted: "Muted",
  unmuted: "Sound on",
};

type VideoContextValue = {
  labels: VideoPlayerLabels;
  frame: HTMLDivElement | null;
  fullscreen: boolean;
  toggleFullscreen: () => void;
  controlsShown: boolean;
  /** A press on the picture: plays or pauses, except a touch that only brought the controls back. */
  pressPicture: (event: MouseEvent<HTMLElement>) => void;
};

const VideoContext = createContext<VideoContextValue | null>(null);

function useVideo(part: string): VideoContextValue {
  const context = use(VideoContext);
  if (!context) throw new Error(`<${part}> must be used inside <VideoPlayer>.`);
  return context;
}

const subscribeFullscreen = (onChange: () => void): (() => void) => {
  document.addEventListener("fullscreenchange", onChange);
  return () => document.removeEventListener("fullscreenchange", onChange);
};
const fullscreenElement = (): Element | null => document.fullscreenElement;
const noFullscreenElement = (): Element | null => null;

/**
 * Shares one player with parts that sit outside its frame: a Transcript, a SceneStrip or a HotspotList under
 * the video. Wrap the VideoPlayer and those parts in it, and give it (not the VideoPlayer) the `locale` and
 * the captions props. It draws nothing.
 */
export function VideoPlayerProvider({ children, ...options }: MediaProviderOptions & { children?: ReactNode }) {
  const media = useMediaProvider(options);
  return <MediaContext value={media}>{children}</MediaContext>;
}

export type VideoPlayerProps = ComponentProps<"div"> &
  MediaProviderOptions & {
    /** Width / height of the frame. Default 16 / 9. The frame keeps this shape before the video loads, so nothing jumps. */
    aspect?: number;
    /** Milliseconds without the pointer moving before the controls step back while playing. Default 3000. */
    hideAfter?: number;
    /** Seconds Left and Right move by. Default 5. */
    seekStep?: number;
    labels?: Partial<VideoPlayerLabels>;
  };

/**
 * The frame, and the keyboard for the whole player while focus is anywhere inside it: Space or K plays and
 * pauses, Left and Right go back and forward five seconds (time runs left to right in every language, like
 * the bar), Up and Down change the volume, M mutes, C switches captions, F is full screen, Home and End go
 * to the start and the end. The keys are left alone while typing in a field, and a slider or a menu inside
 * keeps its own arrows. Name the player with `aria-label` (what the video is). `captions`,
 * `defaultCaptions` and `onCaptionsChange` control whether captions show.
 */
export function VideoPlayer({
  className,
  style,
  aspect = 16 / 9,
  hideAfter = 3000,
  seekStep = 5,
  labels,
  locale,
  captions,
  defaultCaptions,
  onCaptionsChange,
  children,
  onKeyDown,
  onPointerMove,
  onPointerDownCapture,
  onFocus,
  onBlur,
  ...props
}: VideoPlayerProps) {
  // Inside a VideoPlayerProvider the player joins it; alone, it is its own.
  const outer = useOptionalMediaContext();
  const own = useMediaProvider({ locale, captions, defaultCaptions, onCaptionsChange });
  const media = outer ?? own;
  const { state, actions } = media;
  const words = { ...LABELS, ...labels };
  const [frame, setFrame] = useState<HTMLDivElement | null>(null);

  // Full screen: the browser's, or where it is refused (an iPhone), the frame fixed over the whole viewport.
  const nativeElement = useSyncExternalStore(subscribeFullscreen, fullscreenElement, noFullscreenElement);
  const [pseudo, setPseudo] = useState(false);
  const fullscreen = pseudo || (frame !== null && nativeElement === frame);
  const toggleFullscreen = (): void => {
    if (!frame) return;
    if (pseudo) setPseudo(false);
    else if (document.fullscreenElement === frame) void document.exitFullscreen();
    else if (typeof frame.requestFullscreen === "function") frame.requestFullscreen().catch(() => setPseudo(true));
    else setPseudo(true);
  };

  // Controls: shown while paused, while the pointer moves, and while the keyboard is inside.
  const [active, setActive] = useState(true);
  const [keyboardInside, setKeyboardInside] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const hiddenAtPress = useRef(false);
  const controlsShown = !state.playing || active || keyboardInside;
  const wake = (): void => {
    setActive(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setActive(false), hideAfter);
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const pressPicture = (event: MouseEvent<HTMLElement>): void => {
    const touch = (event.nativeEvent as PointerEvent).pointerType === "touch";
    if (touch && hiddenAtPress.current) return;
    actions.toggle();
  };

  const toggleCaptions = (): void => {
    announce(media.captions ? words.noCaptions : words.captionsOn);
    media.setCaptions(!media.captions);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    onKeyDown?.(event);
    wake();
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || isTypingTarget(event.target)) return;
    const target = event.target as HTMLElement;
    const onSlider = target.closest("[role=slider]") !== null;
    const onButton = target.closest("button, a, [role=button], [role=menuitemradio]") !== null;
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    const act: Record<string, (() => void) | undefined> = {
      " ": onButton ? undefined : actions.toggle,
      k: actions.toggle,
      ArrowLeft: onSlider ? undefined : () => actions.seekBy(-seekStep),
      ArrowRight: onSlider ? undefined : () => actions.seekBy(seekStep),
      ArrowUp: onSlider ? undefined : () => actions.setVolume(state.volume + 0.1),
      ArrowDown: onSlider ? undefined : () => actions.setVolume(state.volume - 0.1),
      Home: onSlider ? undefined : () => actions.seek(0),
      End: onSlider ? undefined : () => actions.seek(state.duration),
      m: () => {
        announce(state.muted ? words.unmuted : words.muted);
        actions.toggleMuted();
      },
      c: toggleCaptions,
      f: toggleFullscreen,
      Escape: pseudo ? () => setPseudo(false) : undefined,
    };
    const run = act[key];
    if (!run) return;
    event.preventDefault();
    run();
  };

  return (
    <MediaContext value={media}>
      <VideoContext value={{ labels: words, frame, fullscreen, toggleFullscreen, controlsShown, pressPicture }}>
        <div
          ref={setFrame}
          data-slot="video-player"
          role="group"
          tabIndex={0}
          data-controls={controlsShown ? "shown" : "hidden"}
          data-playing={state.playing ? "" : undefined}
          data-fullscreen={fullscreen ? "" : undefined}
          className={cn(
            "group/player @container relative isolate w-full min-w-0 overflow-hidden rounded-surface border bg-muted text-foreground",
            fullscreen && "rounded-none border-0",
            pseudo && "fixed inset-0 z-50 h-dvh",
            className,
          )}
          style={{ ...(fullscreen ? {} : { aspectRatio: String(aspect) }), ...style }}
          onKeyDown={handleKeyDown}
          onPointerMove={(event) => {
            onPointerMove?.(event);
            wake();
          }}
          onPointerDownCapture={(event) => {
            onPointerDownCapture?.(event);
            hiddenAtPress.current = !controlsShown;
            wake();
          }}
          onFocus={(event) => {
            onFocus?.(event);
            if ((event.target as HTMLElement).matches(":focus-visible")) setKeyboardInside(true);
          }}
          onBlur={(event) => {
            onBlur?.(event);
            if (!event.currentTarget.contains(event.relatedTarget)) setKeyboardInside(false);
          }}
          {...props}
        >
          {children}
        </div>
      </VideoContext>
    </MediaContext>
  );
}

/**
 * The `<video>` itself: give it `src` or `<source>` children, `<track>` children for captions, and a
 * `poster`. It plays inline on phones and never by itself. Pressing the picture plays or pauses; on a touch
 * screen the first tap only brings the controls back.
 */
export function VideoPlayerVideo({ className, ref, onClick, children, ...props }: ComponentProps<"video">) {
  const { media, setMedia } = useMediaContext("VideoPlayerVideo");
  const { pressPicture } = useVideo("VideoPlayerVideo");
  // The player holds the element; a ref from the project is given the same one.
  useImperativeHandle(ref, () => media as HTMLVideoElement, [media]);
  return (
    <video
      ref={setMedia}
      data-slot="video-player-video"
      playsInline
      preload="metadata"
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) pressPicture(event);
      }}
      className={cn("absolute inset-0 size-full bg-muted object-contain", className)}
      {...props}
    >
      {children}
    </video>
  );
}

/**
 * The bar of controls along the bottom, a named group. While the video plays it fades out after the pointer
 * has been still; it stays while the video is paused and while keyboard focus is inside the player, and it
 * can always be reached with Tab. It tells the frame its height, so captions sit above it.
 */
export function VideoPlayerControls({ className, ...props }: ComponentProps<"div">) {
  const { labels } = useVideo("VideoPlayerControls");
  const measure = useCallback((node: HTMLDivElement | null) => {
    const frame = node?.closest<HTMLElement>("[data-slot=video-player]");
    if (!node || !frame || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => frame.style.setProperty("--rui-controls-h", `${node.offsetHeight}px`));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      ref={measure}
      data-slot="video-player-controls"
      role="group"
      aria-label={labels.controls}
      className={cn(
        "absolute inset-x-0 bottom-0 z-20 flex flex-col border-t bg-card px-2 pt-1 pb-1 text-card-foreground transition-[opacity,translate] duration-base ease-out group-data-[controls=hidden]/player:pointer-events-none group-data-[controls=hidden]/player:translate-y-2 group-data-[controls=hidden]/player:opacity-0 motion-reduce:transition-none motion-reduce:group-data-[controls=hidden]/player:translate-y-0",
        className,
      )}
      {...props}
    />
  );
}

/** One row of controls. Push a control to the end with `className="ms-auto"`. */
export function VideoPlayerControlsRow({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="video-player-controls-row" className={cn("flex min-w-0 items-center gap-1", className)} {...props} />;
}

type ControlButtonProps = Omit<ComponentProps<"button">, "type">;

function ControlButton({ className, ...props }: ControlButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-8 min-w-8 shrink-0 items-center justify-center gap-1 rounded-control px-1.5 text-sm font-medium text-foreground transition-[background-color,opacity] duration-instant ease-out select-none hover:bg-accent disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none pointer-coarse:h-(--control-h) pointer-coarse:min-w-(--control-h) [&_svg]:size-4 [&_svg]:shrink-0",
        className,
      )}
      {...props}
    />
  );
}

/** Plays or pauses. Its name is what pressing it will do: "Play", then "Pause". */
export function VideoPlayerPlay({ children, onClick, ...props }: ControlButtonProps) {
  const { state, actions } = useMediaContext("VideoPlayerPlay");
  const { labels } = useVideo("VideoPlayerPlay");
  return (
    <ControlButton
      data-slot="video-player-play"
      aria-label={state.playing ? labels.pause : labels.play}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) actions.toggle();
      }}
      {...props}
    >
      {children ?? (state.playing ? <Pause aria-hidden="true" strokeWidth={1.5} /> : <Play aria-hidden="true" strokeWidth={1.5} />)}
    </ControlButton>
  );
}

/** Mutes or unmutes: a toggle whose name stays "Mute" and whose pressed state says whether it is on. */
export function VideoPlayerMute({ children, onClick, ...props }: ControlButtonProps) {
  const { state, actions } = useMediaContext("VideoPlayerMute");
  const { labels } = useVideo("VideoPlayerMute");
  const silent = state.muted || state.volume === 0;
  return (
    <ControlButton
      data-slot="video-player-mute"
      aria-label={labels.mute}
      aria-pressed={silent}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        if (state.volume === 0) actions.setVolume(1);
        else actions.toggleMuted();
      }}
      {...props}
    >
      {children ?? (silent ? <VolumeX aria-hidden="true" strokeWidth={1.5} /> : <Volume2 aria-hidden="true" strokeWidth={1.5} />)}
    </ControlButton>
  );
}

export type VideoPlayerVolumeProps = Omit<ComponentProps<typeof SliderPrimitive.Root>, "value" | "defaultValue" | "onValueChange" | "min" | "max">;

/** A slider for the volume. Phones set the volume with their own buttons and ignore it, so hide it at narrow widths (`hidden @md:flex`). */
export function VideoPlayerVolume({ className, ...props }: VideoPlayerVolumeProps) {
  const { state, actions, locale } = useMediaContext("VideoPlayerVolume");
  const { labels } = useVideo("VideoPlayerVolume");
  const volume = state.muted ? 0 : state.volume;
  return (
    <SliderPrimitive.Root
      data-slot="video-player-volume"
      min={0}
      max={1}
      step={0.05}
      value={[volume]}
      onValueChange={([next]) => {
        if (next !== undefined) actions.setVolume(next);
      }}
      className={cn("relative flex h-8 w-20 shrink-0 touch-none items-center select-none pointer-coarse:h-(--control-h)", className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-border-strong">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        aria-label={labels.volume}
        aria-valuetext={new Intl.NumberFormat(locale, { style: "percent" }).format(volume)}
        className="relative block size-4 shrink-0 rounded-full border border-primary bg-background after:absolute after:-inset-3"
      />
    </SliderPrimitive.Root>
  );
}

/** Elapsed and total time, in figures of equal width so the row does not shift. Not a live region: the scrubber says the time when asked. */
export function VideoPlayerTime({ className, ...props }: ComponentProps<"span">) {
  const { state, locale } = useMediaContext("VideoPlayerTime");
  return (
    <span data-slot="video-player-time" className={cn("shrink-0 px-1.5 text-xs whitespace-nowrap text-muted-foreground tabular-nums", className)} {...props}>
      <span data-slot="video-player-elapsed" className="text-foreground">
        {formatMediaTime(state.time, locale)}
      </span>
      {" / "}
      <span data-slot="video-player-duration">{formatMediaTime(state.duration, locale)}</span>
    </span>
  );
}

export type VideoPlayerScrubberProps = Omit<ScrubberProps, "value" | "defaultValue" | "duration" | "buffered">;

/** The scrubber, bound to the video: it follows the clock, shows what has loaded, and seeks once when let go. Children replace its parts (add a ScrubberPreview with a `thumbnail`). */
export function VideoPlayerScrubber({ onValueCommit, children, ...props }: VideoPlayerScrubberProps) {
  const { state, actions, locale } = useMediaContext("VideoPlayerScrubber");
  const { labels } = useVideo("VideoPlayerScrubber");
  return (
    <Scrubber
      aria-label={labels.seek}
      locale={locale}
      value={state.time}
      duration={state.duration}
      buffered={state.buffered}
      onValueCommit={(time) => {
        actions.seek(time);
        onValueCommit?.(time);
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

/**
 * Switches captions on and off: a toggle with a pressed state. When the video has several caption tracks it
 * opens a menu of them instead, with "Off" first. It is disabled when the video has no caption track, unless
 * `available` says the project supplies cues itself (Captions with `cues`).
 */
export function VideoPlayerCaptionsButton({ children, onClick, available, ...props }: ControlButtonProps & { available?: boolean }) {
  const media = useMediaContext("VideoPlayerCaptionsButton");
  const { labels, frame } = useVideo("VideoPlayerCaptionsButton");
  const { tracks } = media.state;
  const icon = children ?? (media.captions ? <CaptionsIcon aria-hidden="true" strokeWidth={1.5} /> : <CaptionsOff aria-hidden="true" strokeWidth={1.5} />);

  if (tracks.length < 2) {
    return (
      <ControlButton
        data-slot="video-player-captions-button"
        aria-label={labels.captions}
        aria-pressed={media.captions}
        disabled={!(available ?? tracks.length > 0)}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) media.setCaptions(!media.captions);
        }}
        {...props}
      >
        {icon}
      </ControlButton>
    );
  }

  const chosen = media.captions && media.captionTrack !== null ? String(media.captionTrack) : "off";
  return (
    // Not modal: the rest of the player stays usable, and nothing outside the frame is touched in full screen.
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <ControlButton data-slot="video-player-captions-button" aria-label={labels.captions} {...props}>
          {icon}
        </ControlButton>
      </DropdownMenuTrigger>
      {/* Inside the frame, not <body>: in full screen only the frame's own content is drawn. */}
      <MenuPrimitive.Portal container={frame}>
        <MenuPrimitive.Content
          data-slot="video-player-captions-menu"
          side="top"
          align="end"
          sideOffset={6}
          collisionPadding={8}
          className="z-50 min-w-36 rounded-surface border border-border-strong bg-popover p-1 text-sm text-popover-foreground"
        >
          <DropdownMenuRadioGroup
            value={chosen}
            onValueChange={(value) => {
              if (value === "off") media.setCaptions(false);
              else {
                media.setCaptionTrack(Number(value));
                media.setCaptions(true);
              }
            }}
          >
            <DropdownMenuRadioItem value="off">{labels.captionsOff}</DropdownMenuRadioItem>
            {tracks.map((track) => (
              <DropdownMenuRadioItem key={track.index} value={String(track.index)} lang={track.language || undefined}>
                {track.label || track.language}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </MenuPrimitive.Content>
      </MenuPrimitive.Portal>
    </DropdownMenu>
  );
}

const RATES = [1, 1.25, 1.5, 2, 0.75] as const;

/** The playback speed: each press goes to the next of `rates` and says it. Its name carries the speed ("Playback speed: 1.5×"). */
export function VideoPlayerRate({ rates = RATES, onClick, children, ...props }: ControlButtonProps & { rates?: readonly number[] }) {
  const { state, actions, locale } = useMediaContext("VideoPlayerRate");
  const { labels } = useVideo("VideoPlayerRate");
  return (
    <ControlButton
      data-slot="video-player-rate"
      aria-label={`${labels.rate}: ${formatMediaRate(state.rate, locale)}`}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        const next = nextMediaRate(rates, state.rate);
        actions.setRate(next);
        announce(`${labels.rate}: ${formatMediaRate(next, locale)}`);
      }}
      {...props}
    >
      {children ?? <span dir="ltr" className="min-w-8 text-center text-xs tabular-nums">{formatMediaRate(state.rate, locale)}</span>}
    </ControlButton>
  );
}

/** Enters and leaves full screen. Where the browser refuses (an iPhone), the frame is fixed over the whole viewport instead and Escape leaves it. */
export function VideoPlayerFullscreen({ children, onClick, ...props }: ControlButtonProps) {
  const { labels, fullscreen, toggleFullscreen } = useVideo("VideoPlayerFullscreen");
  return (
    <ControlButton
      data-slot="video-player-fullscreen"
      aria-label={fullscreen ? labels.exitFullscreen : labels.enterFullscreen}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) toggleFullscreen();
      }}
      {...props}
    >
      {children ?? (fullscreen ? <Minimize aria-hidden="true" strokeWidth={1.5} /> : <Maximize aria-hidden="true" strokeWidth={1.5} />)}
    </ControlButton>
  );
}

/** Shown while the video waits for data: a spinner with a name, over the picture. */
export function VideoPlayerLoading({ className, children, ...props }: ComponentProps<"div">) {
  const { state } = useMediaContext("VideoPlayerLoading");
  const { labels } = useVideo("VideoPlayerLoading");
  if (!state.waiting) return null;
  return (
    <div data-slot="video-player-loading" className={cn("pointer-events-none absolute inset-0 z-10 flex items-center justify-center", className)} {...props}>
      {children ?? (
        <span className="inline-flex items-center gap-2 rounded-control border bg-card px-3 py-2 text-sm text-card-foreground">
          <Spinner size="sm" label={labels.loading} />
          <span aria-hidden="true">{labels.loading}</span>
        </span>
      )}
    </div>
  );
}

/** Shown when the video cannot be played: the reason in words, announced at once, and a button that loads it again. Children replace the default message and button. */
export function VideoPlayerError({ className, children, ...props }: ComponentProps<"div">) {
  const { state, actions } = useMediaContext("VideoPlayerError");
  const { labels } = useVideo("VideoPlayerError");
  if (state.error === null) return null;
  return (
    <div
      data-slot="video-player-error"
      role="alert"
      className={cn("absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-card p-4 text-center text-sm text-card-foreground", className)}
      {...props}
    >
      {children ?? (
        <>
          <p>{labels.error}</p>
          <ControlButton data-slot="video-player-retry" className="border border-border-strong px-3" onClick={actions.reload}>
            <RotateCcw aria-hidden="true" strokeWidth={1.5} />
            {labels.retry}
          </ControlButton>
        </>
      )}
    </div>
  );
}

/** A slot over the picture, above the controls: a title, a badge, a large play button. It ignores the pointer unless its children take it. */
export function VideoPlayerOverlay({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="video-player-overlay" className={cn("pointer-events-none absolute inset-0 z-10 flex items-center justify-center *:pointer-events-auto", className)} {...props} />;
}
