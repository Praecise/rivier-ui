"use client";
/**
 * @name carousel
 * @category ui
 * @description A row of slides that is scrolled sideways one at a time (or a few at a time), with previous and next buttons, dots or a count, keys, and an optional autoplay that always has a pause button.
 * @when A handful of pictures or cards of equal weight where one (or a few) is enough at a time: the photos of a place, featured items, quotes. It is the browser's own scrolling with CSS scroll snap, so a swipe, a trackpad and momentum work as they do everywhere, right-to-left pages mirror by themselves and nothing moves under reduced motion; no carousel package is used (Embla, MIT, moves slides with transforms on its own engine, which this does not need). Set how many slides show with a basis on the slides (`className="basis-1/2 md:basis-1/3"`). Do not hide content a person must read in a carousel, and do not autoplay anything with text to read. For looking at pictures large use gallery with lightbox; for scenes of a clip use scene-strip; for thousands of items use virtual-list.
 * @example
 * <Carousel aria-label="Rooms">
 *   <CarouselViewport>
 *     {rooms.map((room) => (
 *       <CarouselSlide key={room.id}>
 *         <img src={room.picture} alt={room.name} className="aspect-video w-full object-cover" />
 *       </CarouselSlide>
 *     ))}
 *   </CarouselViewport>
 *   <div className="flex items-center justify-between gap-2">
 *     <CarouselPrevious />
 *     <CarouselDots />
 *     <CarouselNext />
 *   </div>
 * </Carousel>
 *
 * // Controlled, three to a view on wide screens, with a count; and one that plays by itself
 * <Carousel index={index} onIndexChange={setIndex} aria-label="Featured">
 *   <CarouselViewport>{cards.map((card) => <CarouselSlide key={card.id} className="basis-full md:basis-1/3">…</CarouselSlide>)}</CarouselViewport>
 *   <CarouselPrevious /> <CarouselCount /> <CarouselNext />
 * </Carousel>
 * <Carousel autoplay={5000} loop aria-label="Highlights">
 *   <CarouselViewport>…</CarouselViewport>
 *   <CarouselPlayPause /> <CarouselPrevious /> <CarouselNext />
 * </Carousel>
 */
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { createContext, use, useCallback, useEffect, useId, useRef, useState, useSyncExternalStore, type ComponentProps, type KeyboardEvent, type ReactNode } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { inlineSign, inlineStep } from "@/lib/direction";
import { useControllableState } from "@/lib/use-controllable-state";

/** The words a screen reader says and the names of the controls. Translate them with the interface. */
export type CarouselLabels = {
  /** What kind of thing the root is, said after its name. */
  carousel: string;
  /** What kind of thing a slide is. */
  slide: string;
  /** A slide's name: its place, counted from 1. */
  slideOf: (position: number, total: number) => string;
  previous: string;
  next: string;
  /** The name of the group of dots. */
  dots: string;
  /** A dot's name. */
  goTo: (position: number) => string;
  /** What the count says to a screen reader ("Slide 2 of 5"). */
  count: (position: number, total: number) => string;
  play: string;
  pause: string;
};

export const CAROUSEL_LABELS: CarouselLabels = {
  carousel: "carousel",
  slide: "slide",
  slideOf: (position, total) => `${position} of ${total}`,
  previous: "Previous slide",
  next: "Next slide",
  dots: "Choose a slide",
  goTo: (position) => `Go to slide ${position}`,
  count: (position, total) => `Slide ${position} of ${total}`,
  play: "Start the slides moving",
  pause: "Stop the slides moving",
};

type Geometry = {
  /** The slides, in order. */
  slides: readonly HTMLElement[];
  /** The slide at the start edge of the viewport now. */
  at: number;
  /** The slide at the start edge when the row is scrolled to its end: the last place to go to. */
  last: number;
};

const EMPTY: Geometry = { slides: [], at: 0, last: 0 };

type CarouselContextValue = {
  id: string;
  labels: CarouselLabels;
  locale: string | undefined;
  loop: boolean;
  /** The place shown: where a move is heading, else where the row is. */
  index: number;
  /** How many places there are to go to (the number of slides when one shows at a time). */
  positions: number;
  slides: readonly HTMLElement[];
  /** The slides at least half in view. null before the first look: every slide is reachable then. */
  visible: ReadonlySet<HTMLElement> | null;
  goTo: (index: number) => void;
  step: (by: number) => void;
  setViewport: (element: HTMLDivElement | null) => void;
  /** Whether there is an autoplay to control (off under reduced motion). */
  autoplay: boolean;
  /** Whether the person wants it playing. */
  playing: boolean;
  setPlaying: (playing: boolean) => void;
  /** Whether it is moving by itself right now. */
  running: boolean;
  /** Called by a pause button when it mounts; returns what to call when it goes. Without one, autoplay does not run. */
  registerPause: () => () => void;
};

const CarouselContext = createContext<CarouselContextValue | null>(null);

function useCarousel(part: string): CarouselContextValue {
  const context = use(CarouselContext);
  if (!context) throw new Error(`<${part}> must be used inside <Carousel>.`);
  return context;
}

const REDUCED = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (onChange: () => void): (() => void) => {
  const query = window.matchMedia(REDUCED);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const subscribeHidden = (onChange: () => void): (() => void) => {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
};

/** How far a slide's start edge is from the viewport's start edge, towards the end, in pixels. */
function startOffset(viewport: HTMLElement, slide: HTMLElement, sign: 1 | -1): number {
  const outer = viewport.getBoundingClientRect();
  const inner = slide.getBoundingClientRect();
  const padding = Number.parseFloat(getComputedStyle(viewport).scrollPaddingInlineStart) || 0;
  return (sign === 1 ? inner.left - outer.left : outer.right - inner.right) - padding;
}

function measure(viewport: HTMLElement): Geometry {
  const slides = [...viewport.querySelectorAll<HTMLElement>(":scope > [data-slot=carousel-slide]")];
  if (slides.length === 0) return EMPTY;
  const sign = inlineSign(viewport);
  // Scrolled distance from the start: scrollLeft counts down from 0 in a right-to-left row.
  const scrolled = Math.abs(viewport.scrollLeft);
  const most = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
  const offsets = slides.map((slide) => startOffset(viewport, slide, sign));
  let at = 0;
  let last = slides.length - 1;
  for (let index = 0; index < offsets.length; index += 1) {
    if (Math.abs(offsets[index] ?? 0) < Math.abs(offsets[at] ?? 0)) at = index;
  }
  for (let index = 0; index < offsets.length; index += 1) {
    if ((offsets[index] ?? 0) + scrolled >= most - 2) {
      last = index;
      break;
    }
  }
  return { slides, at: Math.min(at, last), last };
}

const sameGeometry = (a: Geometry, b: Geometry): boolean => a.at === b.at && a.last === b.last && a.slides.length === b.slides.length && a.slides.every((slide, index) => slide === b.slides[index]);

export type CarouselProps = Omit<ComponentProps<"div">, "children"> & {
  /** The slide at the start of the view, counted from 0: controlled. */
  index?: number;
  /** Where it starts when uncontrolled. Default 0. */
  defaultIndex?: number;
  /** Called when it comes to rest on another slide, however it got there. */
  onIndexChange?: (index: number) => void;
  /** Next on the last slide goes to the first, and Previous on the first to the last. Without it the buttons say they are unavailable at the ends. */
  loop?: boolean;
  /** Move to the next slide by itself every so many milliseconds. It needs a CarouselPlayPause (it does not run without one), stops while the pointer or focus is on the carousel, while it is off screen or the tab is hidden, and never runs under reduced motion. */
  autoplay?: number;
  /** Whether it is playing: controlled. */
  playing?: boolean;
  /** Whether autoplay starts playing. Default true. */
  defaultPlaying?: boolean;
  onPlayingChange?: (playing: boolean) => void;
  /** The words, where the English defaults are not wanted. */
  labels?: Partial<CarouselLabels>;
  /** For the figures of the count. Default: the browser's. */
  locale?: string;
  /** CarouselViewport with its slides, and the controls, arranged as the project likes. */
  children?: ReactNode;
};

/**
 * The carousel pattern of the WAI-ARIA Authoring Practices: a named region ("Rooms, carousel") holding
 * slides that are each a group ("2 of 5, slide"), with buttons before or after them. Name it with
 * `aria-label` or `aria-labelledby`. Left and Right on the slides or on any of its controls go to the
 * previous and next slide (the other way round in a right-to-left page), Home and End to the first and the
 * last. Slides out of view are inert, so Tab never lands on something that cannot be seen.
 */
export function Carousel({
  className,
  index,
  defaultIndex = 0,
  onIndexChange,
  loop = false,
  autoplay,
  playing,
  defaultPlaying = true,
  onPlayingChange,
  labels,
  locale,
  children,
  onKeyDown,
  onPointerEnter,
  onPointerLeave,
  onFocus,
  onBlur,
  ...props
}: CarouselProps) {
  const id = useId();
  const merged = { ...CAROUSEL_LABELS, ...labels };
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const [viewport, setViewport] = useState<HTMLDivElement | null>(null);
  const [geometry, setGeometry] = useState<Geometry>(EMPTY);
  const [visible, setVisible] = useState<ReadonlySet<HTMLElement> | null>(null);
  const [current, setCurrent] = useControllableState({ value: index, defaultValue: defaultIndex, onChange: onIndexChange });
  const [wanted, setWanted] = useControllableState({ value: playing, defaultValue: defaultPlaying, onChange: onPlayingChange });
  /** Where a move made here is heading, until the row comes to rest. */
  const [target, setTarget] = useState<number | null>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [onScreen, setOnScreen] = useState(true);
  const reduced = useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED).matches,
    () => false,
  );
  const hidden = useSyncExternalStore(
    subscribeHidden,
    () => document.hidden,
    () => false,
  );
  /** How many pause buttons are rendered. */
  const pauseControls = useRef(0);
  const registerPause = useCallback((): (() => void) => {
    pauseControls.current += 1;
    return () => {
      pauseControls.current -= 1;
    };
  }, []);
  /** The latest of everything the observers, timers and effects below need, without re-subscribing them. */
  const latest = useRef({ geometry, current, target, setCurrent, loop, placed: false });
  useEffect(() => {
    latest.current = { ...latest.current, geometry, current, target, setCurrent, loop };
  });

  // Watch the row: its scroll position, its size, its slides.
  useEffect(() => {
    if (!viewport) return;
    let frame = 0;
    let rest = 0;
    const look = (): void => {
      const next = measure(viewport);
      setGeometry((previous) => (sameGeometry(previous, next) ? previous : next));
    };
    const settle = (): void => {
      const now = measure(viewport);
      setTarget(null);
      if (latest.current.placed && now.slides.length > 0 && now.at !== latest.current.current) latest.current.setCurrent(now.at);
    };
    const scrolled = (): void => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(look);
      // At rest when no scroll event has come for a moment (scrollend is not in every browser).
      window.clearTimeout(rest);
      rest = window.setTimeout(settle, 140);
    };
    const sizes = new ResizeObserver(look);
    const views = new IntersectionObserver(
      (entries) =>
        setVisible((previous) => {
          const next = new Set(previous ?? []);
          for (const entry of entries) {
            if (entry.isIntersecting) next.add(entry.target as HTMLElement);
            else next.delete(entry.target as HTMLElement);
          }
          return next;
        }),
      { root: viewport, threshold: 0.5 },
    );
    const watch = (): void => {
      sizes.disconnect();
      views.disconnect();
      sizes.observe(viewport);
      for (const slide of viewport.querySelectorAll(":scope > [data-slot=carousel-slide]")) {
        sizes.observe(slide);
        views.observe(slide);
      }
    };
    const children = new MutationObserver(() => {
      watch();
      look();
    });
    watch();
    children.observe(viewport, { childList: true });
    viewport.addEventListener("scroll", scrolled, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(rest);
      sizes.disconnect();
      views.disconnect();
      children.disconnect();
      viewport.removeEventListener("scroll", scrolled);
    };
  }, [viewport]);

  // Off screen, autoplay waits.
  useEffect(() => {
    if (!root || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => setOnScreen(entries.some((entry) => entry.isIntersecting)));
    observer.observe(root);
    return () => observer.disconnect();
  }, [root]);

  const scrollToIndex = (to: number, instant = false): void => {
    const slide = geometry.slides[to];
    if (!viewport || !slide) return;
    const sign = inlineSign(viewport);
    const still = instant || window.matchMedia(REDUCED).matches;
    viewport.scrollBy({ left: startOffset(viewport, slide, sign) * sign, behavior: still ? "instant" : "smooth" });
  };

  // Follow the value: the starting slide, and a controlled index set from outside.
  const count = geometry.slides.length;
  const wantedIndex = Math.min(Math.max(0, current), geometry.last);
  useEffect(() => {
    if (count === 0) return;
    const state = latest.current;
    const first = !state.placed;
    state.placed = true;
    if (state.target !== null || wantedIndex === state.geometry.at) return;
    scrollToIndex(wantedIndex, first);
    // scrollToIndex reads the geometry of this render, which is what the dependencies below stand for.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantedIndex, count, geometry.last]);

  const goTo = (to: number): void => {
    if (count === 0) return;
    const next = Math.min(Math.max(0, to), geometry.last);
    setTarget(next);
    scrollToIndex(next);
    setCurrent(next);
  };
  const shown = Math.min(target ?? geometry.at, geometry.last);
  /** The place a step from the one shown leads to. */
  const after = (by: number): number => {
    const next = shown + by;
    if (next > geometry.last) return loop ? 0 : geometry.last;
    if (next < 0) return loop ? geometry.last : 0;
    return next;
  };
  const step = (by: number): void => goTo(after(by));

  const canPlay = autoplay !== undefined && autoplay > 0 && !reduced;
  const running = canPlay && wanted && !hovered && !focused && !hidden && onScreen && count > 1;
  const tick = useRef<() => void>(() => {});
  useEffect(() => {
    tick.current = () => {
      // Autoplay goes round: after the last slide comes the first.
      if (pauseControls.current > 0) goTo(shown >= geometry.last ? 0 : shown + 1);
    };
  });
  useEffect(() => {
    if (!running || autoplay === undefined) return;
    const timer = window.setInterval(() => tick.current(), Math.max(1000, autoplay));
    return () => window.clearInterval(timer);
  }, [running, autoplay]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    onKeyDown?.(event);
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const from = event.target as HTMLElement;
    // Keys pressed inside a slide's own content (a field, a player) belong to that content.
    if (from.closest("[data-slot=carousel-slide]")) return;
    const by = inlineStep(event.key, event.currentTarget);
    const next = by !== 0 ? after(by) : event.key === "Home" ? 0 : event.key === "End" ? geometry.last : null;
    if (next === null) return;
    event.preventDefault();
    goTo(next);
    // On the dots, focus goes with the choice.
    from.closest("[data-slot=carousel-dots]")?.querySelector<HTMLElement>(`[data-index="${next}"]`)?.focus();
  };

  return (
    <CarouselContext
      value={{
        id,
        labels: merged,
        locale,
        loop,
        index: shown,
        positions: count === 0 ? 0 : geometry.last + 1,
        slides: geometry.slides,
        visible,
        goTo,
        step,
        setViewport,
        autoplay: canPlay,
        playing: wanted,
        setPlaying: setWanted,
        running,
        registerPause,
      }}
    >
      <div
        ref={setRoot}
        data-slot="carousel"
        data-autoplay={!canPlay ? undefined : running ? "running" : "paused"}
        role="region"
        aria-roledescription={merged.carousel}
        onKeyDown={handleKeyDown}
        onPointerEnter={(event) => {
          onPointerEnter?.(event);
          if (event.pointerType === "mouse") setHovered(true);
        }}
        onPointerLeave={(event) => {
          onPointerLeave?.(event);
          setHovered(false);
        }}
        onFocus={(event) => {
          onFocus?.(event);
          setFocused(true);
        }}
        onBlur={(event) => {
          onBlur?.(event);
          if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
        }}
        className={cn("flex w-full min-w-0 flex-col gap-3", className)}
        {...props}
      >
        {children}
      </div>
    </CarouselContext>
  );
}

export type CarouselViewportProps = Omit<ComponentProps<"div">, "ref">;

/**
 * The row that scrolls: put the CarouselSlides in it, and nothing else. It is a Tab stop, so the arrow keys
 * work without a pointer, and it is a live region that says the new slide when the person moves to it, but
 * stays silent while the carousel plays by itself. Give it a gap with `className` ("gap-4"), and a
 * `scroll-ps-*` with matching padding to let the next slide show at the edge.
 */
export function CarouselViewport({ className, children, ...props }: CarouselViewportProps) {
  const { id, setViewport, running, labels, index, positions } = useCarousel("CarouselViewport");
  return (
    <div
      ref={setViewport}
      id={`${id}-slides`}
      data-slot="carousel-viewport"
      role="group"
      aria-label={positions > 0 ? labels.count(index + 1, positions) : undefined}
      aria-live={running ? "off" : "polite"}
      tabIndex={0}
      className={cn(
        "flex w-full min-w-0 snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-surface [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export type CarouselSlideProps = ComponentProps<"div">;

/**
 * One slide: a group named by its place ("2 of 5") unless it is given an `aria-label` or `aria-labelledby`
 * of its own. It fills the view; give it a basis (`basis-1/2`, `md:basis-1/3`) to show several.
 */
export function CarouselSlide({ className, children, ref, "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy, ...props }: CarouselSlideProps) {
  const { slides, visible, labels } = useCarousel("CarouselSlide");
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const position = element ? slides.indexOf(element) : -1;
  const out = visible !== null && element !== null && position !== -1 && !visible.has(element);
  return (
    <div
      ref={(node) => {
        setElement(node);
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      data-slot="carousel-slide"
      data-visible={out ? undefined : ""}
      role="group"
      aria-roledescription={labels.slide}
      aria-label={ariaLabel ?? (ariaLabelledBy || position === -1 ? undefined : labels.slideOf(position + 1, slides.length))}
      aria-labelledby={ariaLabelledBy}
      inert={out}
      className={cn("min-w-0 shrink-0 grow-0 basis-full snap-start", className)}
      {...props}
    >
      {children}
    </div>
  );
}

type CarouselStepProps = Omit<ButtonProps, "asChild" | "loading">;

function CarouselStep({ by, slot, className, variant = "outline", size = "icon", onClick, children, ...props }: CarouselStepProps & { by: 1 | -1; slot: string }) {
  const { id, labels, loop, index, positions, step } = useCarousel(by === 1 ? "CarouselNext" : "CarouselPrevious");
  const stuck = positions <= 1 || (!loop && (by === 1 ? index >= positions - 1 : index <= 0));
  return (
    <Button
      data-slot={slot}
      type="button"
      variant={variant}
      size={size}
      aria-label={by === 1 ? labels.next : labels.previous}
      aria-controls={`${id}-slides`}
      // Unavailable, but still focusable: pressing Next up to the last slide must not drop the keyboard's place.
      aria-disabled={stuck || undefined}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented && !stuck) step(by);
      }}
      className={cn("aria-disabled:opacity-40", className)}
      {...props}
    >
      {children ?? (by === 1 ? <ChevronRight aria-hidden="true" strokeWidth={1.5} className="rtl:-scale-x-100" /> : <ChevronLeft aria-hidden="true" strokeWidth={1.5} className="rtl:-scale-x-100" />)}
    </Button>
  );
}

/** Goes to the slide before. At the first slide it says it is unavailable, unless the carousel loops. */
export function CarouselPrevious(props: CarouselStepProps) {
  return <CarouselStep by={-1} slot="carousel-previous" {...props} />;
}

/** Goes to the slide after. At the last slide it says it is unavailable, unless the carousel loops. */
export function CarouselNext(props: CarouselStepProps) {
  return <CarouselStep by={1} slot="carousel-next" {...props} />;
}

export type CarouselDotsProps = Omit<ComponentProps<"div">, "children">;

/**
 * One dot for each place to go to. A named group of buttons with one Tab stop: the dot of the slide in
 * view, which carries `aria-current` and is drawn as a bar rather than a dot (shape, not colour alone).
 * Arrow keys, Home and End move the carousel and focus goes with it. For more than about eight slides use
 * CarouselCount instead.
 */
export function CarouselDots({ className, ...props }: CarouselDotsProps) {
  const { id, labels, index, positions, goTo } = useCarousel("CarouselDots");
  return (
    <div data-slot="carousel-dots" role="group" aria-label={labels.dots} className={cn("flex min-w-0 flex-wrap items-center justify-center", className)} {...props}>
      {Array.from({ length: positions }, (_, position) => (
        <button
          key={position}
          type="button"
          data-slot="carousel-dot"
          data-index={position}
          tabIndex={position === index ? 0 : -1}
          aria-label={labels.goTo(position + 1)}
          aria-current={position === index ? "true" : undefined}
          aria-controls={`${id}-slides`}
          onClick={() => goTo(position)}
          className="group/dot inline-flex size-6 shrink-0 items-center justify-center rounded-control pointer-coarse:size-10"
        >
          <span
            aria-hidden="true"
            className="block h-2 w-2 rounded-full bg-border-strong transition-[background-color,width] duration-instant ease-out group-hover/dot:bg-muted-foreground group-aria-[current=true]/dot:w-5 group-aria-[current=true]/dot:bg-primary motion-reduce:transition-none"
          />
        </button>
      ))}
    </div>
  );
}

export type CarouselCountProps = Omit<ComponentProps<"p">, "children"> & {
  /** Replaces the figures shown ("2 / 5"). */
  children?: (position: number, total: number) => ReactNode;
};

/** Where the carousel is, in figures ("2 / 5", in the locale's digits), with the same in words for a screen reader. */
export function CarouselCount({ className, children, ...props }: CarouselCountProps) {
  const { labels, locale, index, positions } = useCarousel("CarouselCount");
  const figure = new Intl.NumberFormat(locale);
  const position = positions === 0 ? 0 : index + 1;
  return (
    <p data-slot="carousel-count" className={cn("text-sm text-muted-foreground tabular-nums", className)} {...props}>
      <span aria-hidden="true">{children ? children(position, positions) : `${figure.format(position)} / ${figure.format(positions)}`}</span>
      <span className="sr-only">{labels.count(position, positions)}</span>
    </p>
  );
}

export type CarouselPlayPauseProps = Omit<ButtonProps, "asChild" | "loading">;

/**
 * The button that stops and starts autoplay: required with `autoplay` (WCAG 2.2.2), and the carousel does
 * not move by itself unless one is rendered. Put it before the slides in the markup, so it is the first
 * thing reached. Its name says what a press will do. It renders nothing when there is no autoplay or the
 * visitor asked for reduced motion, because then nothing moves.
 */
export function CarouselPlayPause({ className, variant = "outline", size = "icon", onClick, children, ...props }: CarouselPlayPauseProps) {
  const { id, labels, autoplay, playing, setPlaying, registerPause } = useCarousel("CarouselPlayPause");
  useEffect(() => registerPause(), [registerPause]);
  if (!autoplay) return null;
  return (
    <Button
      data-slot="carousel-play-pause"
      data-state={playing ? "playing" : "stopped"}
      type="button"
      variant={variant}
      size={size}
      aria-label={playing ? labels.pause : labels.play}
      aria-controls={`${id}-slides`}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) setPlaying(!playing);
      }}
      className={className}
      {...props}
    >
      {children ?? (playing ? <Pause aria-hidden="true" strokeWidth={1.5} /> : <Play aria-hidden="true" strokeWidth={1.5} />)}
    </Button>
  );
}
