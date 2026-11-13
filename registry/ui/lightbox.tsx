"use client";
/**
 * @name lightbox
 * @category ui
 * @description A full-screen viewer for a set of pictures (or any media the project renders): swipe or arrow between slides, zoom and pan, a counter, captions, thumbnails, and the picture growing out of the thumbnail that opened it.
 * @when Looking closely at pictures that are shown small on the page: a listing's photos, a portfolio, attachments. It is a modal dialog, so focus is held inside and returns to the thumbnail of the picture shown when it closes. For a grid of thumbnails that opens it use gallery (GalleryLightbox does both). For one picture with text beside it use dialog; for a row of cards that scroll in the page use a scroll-snap row, not a lightbox. Always give it a LightboxTitle (className="sr-only" hides it) and say how many slides there are with `count`.
 * @example
 * <Lightbox count={photos.length}>
 *   {photos.map((photo, index) => (
 *     <LightboxTrigger key={photo.src} index={index} aria-label={`Open picture: ${photo.alt}`}>
 *       <img src={photo.thumb} alt="" className="size-24 rounded-control object-cover" />
 *     </LightboxTrigger>
 *   ))}
 *   <LightboxContent>
 *     <LightboxHeader>
 *       <LightboxTitle className="sr-only">Photos</LightboxTitle>
 *       <LightboxCounter />
 *       <LightboxZoom className="ms-auto" />
 *       <LightboxClose />
 *     </LightboxHeader>
 *     <LightboxStage>
 *       <LightboxViewport>
 *         {photos.map((photo, index) => (
 *           <LightboxSlide key={photo.src} index={index}>
 *             <img src={photo.src} alt={photo.alt} className="max-h-full max-w-full object-contain" />
 *           </LightboxSlide>
 *         ))}
 *       </LightboxViewport>
 *       <LightboxPrevious />
 *       <LightboxNext />
 *     </LightboxStage>
 *   </LightboxContent>
 * </Lightbox>
 */
import { Dialog as DialogPrimitive, Slot } from "radix-ui";
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from "lucide-react";
import {
  createContext,
  use,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type Ref,
  type RefObject,
} from "react";
import { flushSync } from "react-dom";
import { announce } from "@/lib/announce";
import { cn } from "@/lib/cn";
import { inlineStep } from "@/lib/direction";
import { useControllableState } from "@/lib/use-controllable-state";

type Zoom = { scale: number; x: number; y: number };
const NO_ZOOM: Zoom = { scale: 1, x: 0, y: 0 };
/** What one press of a zoom button, or one + or - key, multiplies the scale by. */
const ZOOM_STEP = 1.5;
/** The scale a double click or double tap goes to. */
const ZOOM_DOUBLE = 2.5;

type LightboxContextValue = {
  open: boolean;
  count: number;
  index: number;
  loop: boolean;
  maxZoom: number;
  zoom: Zoom;
  /** True when open and close run as a view transition: the dialog's own fade is then switched off. */
  viaTransition: boolean;
  /** The view-transition-name shared by a thumbnail and its slide. */
  transitionName: string;
  formatPosition: (current: number, total: number) => string;
  viewportRef: RefObject<HTMLDivElement | null>;
  surfaceRef: RefObject<HTMLDivElement | null>;
  registerTrigger: (index: number, element: HTMLElement | null) => void;
  focusTrigger: () => void;
  openAt: (index: number) => void;
  /** Shows a slide. Out of range wraps round with `loop` and is ignored without. */
  go: (index: number) => void;
  /** Follows the track after a swipe: sets the index without scrolling again. */
  settle: (index: number) => void;
  /** Sets the scale, keeping the point `origin` (in viewport coordinates) under the pointer. `say` announces the new level. */
  zoomTo: (scale: number, options?: { origin?: { x: number; y: number }; say?: boolean }) => void;
  panTo: (x: number, y: number) => void;
};

const LightboxContext = createContext<LightboxContextValue | null>(null);

/** The lightbox's state, for a part the project writes itself: a caption for the current slide, a download button. */
export function useLightbox(part = "useLightbox"): LightboxContextValue {
  const context = use(LightboxContext);
  if (!context) throw new Error(`<${part}> must be used inside <Lightbox>.`);
  return context;
}

const canTransition = (): boolean =>
  typeof document !== "undefined" && typeof document.startViewTransition === "function" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const reducedMotion = (): boolean => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The slide whose centre is nearest the centre of the track: the one in view. Works in both directions. */
function nearestSlide(viewport: HTMLElement): number {
  const box = viewport.getBoundingClientRect();
  const centre = box.left + box.width / 2;
  let best = -1;
  let distance = Number.POSITIVE_INFINITY;
  for (const slide of viewport.querySelectorAll<HTMLElement>(":scope > [data-slot=lightbox-slide]")) {
    const rect = slide.getBoundingClientRect();
    const away = Math.abs(rect.left + rect.width / 2 - centre);
    if (away < distance) {
      distance = away;
      best = Number(slide.dataset["index"]);
    }
  }
  return best;
}

export type LightboxProps = {
  /** How many slides there are. */
  count: number;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The slide shown, from 0. */
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  /** Going past the last slide comes back to the first. Default false: the buttons are disabled at the ends. */
  loop?: boolean;
  /** The largest scale zoom reaches. Default 4. */
  maxZoom?: number;
  /**
   * Open and close as a shared-element transition: the picture grows out of its thumbnail and shrinks back
   * into it (the browser's View Transitions API; a plain fade where that is missing or motion is reduced).
   * Default true.
   */
  sharedTransition?: boolean;
  /** The words for a position: the counter's text and each slide's name. Default "3 of 12". */
  formatPosition?: (current: number, total: number) => string;
  /** What is announced when the zoom buttons or keys change the scale. Default "Zoom 150%". */
  formatZoom?: (percent: number) => string;
  children?: ReactNode;
};

/**
 * Holds the state: whether it is open, which slide is shown, and the zoom of that slide. Open and index are
 * each controlled (`open` / `index`) or uncontrolled (`defaultOpen` / `defaultIndex`).
 *
 * The shared-element transition uses `document.startViewTransition` directly, because the thumbnail stays
 * mounted while the dialog opens (React's <ViewTransition> shares between an element that unmounts and one
 * that mounts). Do not run it inside a React transition that also animates <ViewTransition> components.
 */
export function Lightbox({
  count,
  open,
  defaultOpen = false,
  onOpenChange,
  index,
  defaultIndex = 0,
  onIndexChange,
  loop = false,
  maxZoom = 4,
  sharedTransition = true,
  formatPosition = (current, total) => `${current} of ${total}`,
  formatZoom = (percent) => `Zoom ${percent}%`,
  children,
}: LightboxProps) {
  const [isOpen, setOpen] = useControllableState({ value: open, defaultValue: defaultOpen, onChange: onOpenChange });
  const [current, setCurrent] = useControllableState({ value: index, defaultValue: defaultIndex, onChange: onIndexChange });
  // The zoom belongs to one slide: it is dropped as soon as another slide is shown.
  const [zoomState, setZoomState] = useState<Zoom & { index: number }>({ ...NO_ZOOM, index: -1 });
  const [viaTransition, setViaTransition] = useState(false);
  /** Every trigger of each slide: one picture may have two (a tile in a grid and another in a row that scrolls). */
  const triggers = useRef(new Map<number, Set<HTMLElement>>());
  const opener = useRef(0);
  /** A wait for a trigger to become reachable, so that a newer one can replace it. */
  const focusWait = useRef(0);
  /** The triggers of a slide that are drawn, the ones a person can reach first. */
  const triggersOf = (at: number): HTMLElement[] => {
    const all = triggers.current.get(at);
    if (!all) return [];
    // A trigger that has left the page is forgotten here: a ref is not told which element went.
    for (const element of all) if (!element.isConnected) all.delete(element);
    const drawn = [...all].filter((element) => element.getClientRects().length > 0);
    // In view and reachable first, then reachable, then the rest.
    const rank = (element: HTMLElement): number => (reachable(element) ? (inView(element) ? 0 : 1) : 2);
    return drawn.sort((a, b) => rank(a) - rank(b));
  };
  const viewportRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const transitionName = `rui-lightbox-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const shown = Math.min(Math.max(0, current), Math.max(0, count - 1));
  const zoom = zoomState.index === shown ? zoomState : NO_ZOOM;

  const changeOpen = (next: boolean, at: number): void => {
    const apply = (via: boolean): void => {
      setViaTransition(via);
      if (next) setCurrent(at);
      else setZoomState({ ...NO_ZOOM, index: -1 });
      setOpen(next);
    };
    if (!sharedTransition || !canTransition()) {
      apply(false);
      return;
    }
    // The thumbnail carries the shared name in the view without the dialog; the slide carries it in the view with it.
    const trigger = triggersOf(at)[0];
    const thumbnail = trigger?.isConnected ? (trigger.querySelector<HTMLElement>("img, [data-lightbox-shared]") ?? trigger) : null;
    if (next && thumbnail) thumbnail.style.viewTransitionName = transitionName;
    const transition = document.startViewTransition(() => {
      flushSync(() => apply(true));
      if (thumbnail) thumbnail.style.viewTransitionName = next ? "" : transitionName;
    });
    const clear = (): void => {
      if (thumbnail) thumbnail.style.viewTransitionName = "";
    };
    transition.finished.then(clear, clear);
  };

  const go = (target: number): void => {
    if (count === 0) return;
    const next = loop ? ((target % count) + count) % count : target;
    if (next < 0 || next > count - 1) return;
    setCurrent(next);
  };

  const clampOffset = (scale: number, x: number, y: number): Zoom => {
    const surface = surfaceRef.current;
    const slide = surface?.parentElement;
    if (!surface || !slide || scale <= 1) return NO_ZOOM;
    const maxX = Math.max(0, (surface.offsetWidth * scale - slide.clientWidth) / 2);
    const maxY = Math.max(0, (surface.offsetHeight * scale - slide.clientHeight) / 2);
    return { scale, x: Math.min(maxX, Math.max(-maxX, x)), y: Math.min(maxY, Math.max(-maxY, y)) };
  };

  const zoomTo: LightboxContextValue["zoomTo"] = (target, options) => {
    const slide = surfaceRef.current?.parentElement;
    if (!slide) return;
    const scale = Math.min(maxZoom, Math.max(1, target));
    const box = slide.getBoundingClientRect();
    // The point to keep still, measured from the centre of the slide (the transform's origin).
    const px = options?.origin ? options.origin.x - (box.left + box.width / 2) : 0;
    const py = options?.origin ? options.origin.y - (box.top + box.height / 2) : 0;
    const ratio = scale / zoom.scale;
    setZoomState({ ...clampOffset(scale, px - (px - zoom.x) * ratio, py - (py - zoom.y) * ratio), index: shown });
    if (options?.say && scale !== zoom.scale) announce(formatZoom(Math.round(scale * 100)));
  };

  const context: LightboxContextValue = {
    open: isOpen,
    count,
    index: shown,
    loop,
    maxZoom,
    zoom,
    viaTransition,
    transitionName,
    formatPosition,
    viewportRef,
    surfaceRef,
    registerTrigger: (at, element) => {
      if (!element) return;
      // An element is the trigger of one slide: a tile whose index changed leaves its old one.
      for (const [index, all] of triggers.current) if (index !== at) all.delete(element);
      const all = triggers.current.get(at) ?? new Set<HTMLElement>();
      all.add(element);
      triggers.current.set(at, all);
    },
    focusTrigger: () => {
      window.cancelAnimationFrame(focusWait.current);
      // The trigger of the slide shown, else the one that opened; of two for one slide, the one in view.
      const target = [...triggersOf(shown), ...triggersOf(opener.current)][0];
      if (!target) return;
      if (reachable(target)) {
        target.focus();
        return;
      }
      // It is inside something inert because it is out of view (a slide of a carousel): bring it into
      // view, and focus it once whatever made it inert has let go.
      target.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
      let frames = 0;
      const attempt = (): void => {
        frames += 1;
        if (!target.isConnected) return;
        if (reachable(target) || frames >= FOCUS_WAIT_FRAMES) target.focus();
        else focusWait.current = window.requestAnimationFrame(attempt);
      };
      focusWait.current = window.requestAnimationFrame(attempt);
    },
    openAt: (at) => {
      opener.current = at;
      changeOpen(true, Math.min(Math.max(0, at), Math.max(0, count - 1)));
    },
    go,
    settle: (at) => {
      if (at >= 0 && at !== shown) setCurrent(at);
    },
    zoomTo,
    panTo: (x, y) => setZoomState({ ...clampOffset(zoom.scale, x, y), index: shown }),
  };

  return (
    <LightboxContext value={context}>
      <DialogPrimitive.Root open={isOpen} onOpenChange={(next) => changeOpen(next, shown)}>
        {children}
      </DialogPrimitive.Root>
    </LightboxContext>
  );
}

/**
 * A picture directly inside a slide is never larger than the slide. `max-h-full` on the picture cannot do
 * that by itself: the wrapper around it is as tall as its content, and a percentage of that is no limit, so
 * a picture taller than the slide was cut off. The slide's own size, in container units, is a limit.
 */
const SLIDE_PICTURE = "[&>img]:max-h-[100cqh] [&>img]:max-w-[100cqw]";

/** Whether focus can go to an element now: nothing around it is inert. */
const reachable = (element: HTMLElement): boolean => element.closest("[inert]") === null;
/** Whether any of an element is inside the window. */
const inView = (element: HTMLElement): boolean => {
  const box = element.getBoundingClientRect();
  return box.bottom > 0 && box.right > 0 && box.top < window.innerHeight && box.left < window.innerWidth;
};
/** How long a trigger that was scrolled into view is waited for before focus is tried anyway: about a second. */
const FOCUS_WAIT_FRAMES = 60;

export type LightboxTriggerProps = ComponentProps<"button"> & {
  /** The slide this opens at, from 0. */
  index?: number;
  /** Make the child element the trigger (a gallery tile, for example). */
  asChild?: boolean;
};

/**
 * A thumbnail (or any button) that opens the lightbox at a slide. The lightbox remembers it: focus comes
 * back here on close, or to the trigger of the slide shown at that moment. A trigger that is out of view
 * inside something inert (a slide of a carousel) is scrolled into view first and then focused; where one
 * slide has two triggers, the one in view is used. The picture inside it (the first <img>, or an element
 * marked `data-lightbox-shared`) is what the slide grows out of.
 */
export function LightboxTrigger({ index = 0, asChild = false, onClick, ref, ...props }: LightboxTriggerProps) {
  const { registerTrigger, openAt } = useLightbox("LightboxTrigger");
  const Comp = asChild ? Slot.Root : "button";
  const setRef = (element: HTMLButtonElement | null): void => {
    registerTrigger(index, element);
    assignRef(ref, element);
  };
  return (
    <Comp
      data-slot="lightbox-trigger"
      aria-haspopup="dialog"
      {...(asChild ? {} : { type: "button" as const })}
      ref={setRef}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) openAt(index);
      }}
      {...props}
    />
  );
}

function assignRef<T>(ref: Ref<T> | undefined, value: T | null): void {
  if (typeof ref === "function") ref(value);
  else if (ref) ref.current = value;
}

export type LightboxContentProps = ComponentProps<typeof DialogPrimitive.Content>;

/**
 * The full-screen dialog, with its portal. Keys, anywhere inside: Left and Right arrows show the previous
 * and next slide (the other way round in right-to-left pages), Home and End the first and last, + and -
 * zoom, 0 resets the zoom, Escape closes.
 */
export function LightboxContent({ className, children, onKeyDown, onCloseAutoFocus, ...props }: LightboxContentProps) {
  const context = useLightbox("LightboxContent");
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    onKeyDown?.(event);
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.target instanceof HTMLElement && event.target.closest("input, textarea, select, [contenteditable=true]")) return;
    const step = inlineStep(event.key, event.currentTarget);
    if (step !== 0) context.go(context.index + step);
    else if (event.key === "Home") context.go(0);
    else if (event.key === "End") context.go(context.count - 1);
    else if (event.key === "+" || event.key === "=") context.zoomTo(context.zoom.scale * ZOOM_STEP, { say: true });
    else if (event.key === "-") context.zoomTo(context.zoom.scale / ZOOM_STEP, { say: true });
    else if (event.key === "0") context.zoomTo(1, { say: true });
    else return;
    event.preventDefault();
  };
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Content
        data-slot="lightbox-content"
        data-transition={context.viaTransition ? "shared" : "fade"}
        aria-describedby={undefined}
        onKeyDown={handleKeyDown}
        onCloseAutoFocus={(event) => {
          onCloseAutoFocus?.(event);
          if (event.defaultPrevented) return;
          event.preventDefault();
          context.focusTrigger();
        }}
        className={cn(
          "fixed inset-0 z-50 flex flex-col bg-background text-foreground outline-none ease-out animation-duration-(--duration-base) fade-in-0 fade-out-0 data-[state=closed]:animate-out data-[state=open]:animate-in data-[transition=shared]:animate-none! motion-reduce:animate-none!",
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

/** The bar above the stage: title, counter, zoom, close. */
export function LightboxHeader({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="lightbox-header" className={cn("flex min-h-(--control-h-lg) shrink-0 items-center gap-2 border-b px-3 py-1.5 ps-4", className)} {...props} />;
}

/** The bar below the stage: caption, thumbnails. */
export function LightboxFooter({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="lightbox-footer" className={cn("flex shrink-0 flex-col gap-2 border-t px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]", className)} {...props} />;
}

/** The dialog's name. Required; add className="sr-only" to hide it. */
export function LightboxTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title data-slot="lightbox-title" className={cn("min-w-0 truncate text-sm font-medium", className)} {...props} />;
}

/** The area the slides fill, and what the previous and next buttons are placed against. */
export function LightboxStage({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="lightbox-stage" className={cn("relative min-h-0 flex-1", className)} {...props} />;
}

export type LightboxViewportProps = ComponentProps<"div"> & {
  /** What the track is called by a screen reader's role description. Default "carousel". */
  roleDescription?: string;
};

/**
 * The track: a horizontal scroll-snap row, one slide wide. Swiping is the browser's own scrolling, so it has
 * momentum, follows the finger and runs the right way in right-to-left pages; the current index follows
 * where the track comes to rest. Changing the index (keys, buttons, thumbnails, a controlled `index`)
 * scrolls to that slide, without travel under reduced motion. While a slide is zoomed the track does not
 * scroll. Name it with `aria-label` (default "Pictures").
 */
export function LightboxViewport({ className, children, roleDescription = "carousel", "aria-label": ariaLabel = "Pictures", ...props }: LightboxViewportProps) {
  const { viewportRef, index, settle, zoom } = useLightbox("LightboxViewport");
  const first = useRef(true);
  /** The slide a scroll started here is on its way to. Until it arrives, where the track rests is not a swipe. */
  const heading = useRef<number | null>(null);
  const previous = useRef(index);

  // Bring the current slide into view: at once when the dialog opens, travelling to a neighbour after
  // that, and at once again for a jump further than a neighbour (a long travel past other pictures).
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const opening = first.current;
    first.current = false;
    // Measured from the slide last asked for, not from where the track is: a second key press during a travel is still one step.
    const from = previous.current;
    previous.current = index;
    if (heading.current === null && nearestSlide(viewport) === index) return;
    const slide = viewport.querySelector<HTMLElement>(`:scope > [data-slot=lightbox-slide][data-index="${index}"]`);
    if (!slide) return;
    const box = viewport.getBoundingClientRect();
    const rect = slide.getBoundingClientRect();
    const instant = opening || reducedMotion() || Math.abs(from - index) > 1;
    // An instant scroll has arrived by the time this returns; only a travelling one is waited for, and not for ever.
    heading.current = instant ? null : index;
    if (!instant) window.setTimeout(() => {
      if (heading.current === index) heading.current = null;
    }, 1200);
    // scrollTo, not scrollBy: a relative scroll is a direction to the browser, and it would stop at the first slide it meets.
    viewport.scrollTo({ left: viewport.scrollLeft + rect.left + rect.width / 2 - (box.left + box.width / 2), behavior: instant ? "instant" : "smooth" });
  }, [index, viewportRef]);

  // Follow the track when it comes to rest after a swipe.
  const latest = useRef(settle);
  useEffect(() => {
    latest.current = settle;
  });
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const rest = (): void => {
      const at = nearestSlide(viewport);
      if (heading.current === null) latest.current(at);
      else if (at === heading.current) heading.current = null;
    };
    // A finger, a wheel or a pen on the track takes over from a scroll started here.
    const takeOver = (): void => {
      heading.current = null;
    };
    viewport.addEventListener("pointerdown", takeOver);
    viewport.addEventListener("wheel", takeOver, { passive: true });
    if ("onscrollend" in window) {
      viewport.addEventListener("scrollend", rest);
      return () => {
        viewport.removeEventListener("scrollend", rest);
        viewport.removeEventListener("pointerdown", takeOver);
        viewport.removeEventListener("wheel", takeOver);
      };
    }
    let timer = 0;
    const onScroll = (): void => {
      window.clearTimeout(timer);
      timer = window.setTimeout(rest, 140);
    };
    viewport.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearTimeout(timer);
      viewport.removeEventListener("scroll", onScroll);
      viewport.removeEventListener("pointerdown", takeOver);
      viewport.removeEventListener("wheel", takeOver);
    };
  }, [viewportRef]);

  return (
    <div
      ref={viewportRef}
      data-slot="lightbox-viewport"
      data-zoomed={zoom.scale > 1 ? "" : undefined}
      role="group"
      aria-roledescription={roleDescription}
      aria-label={ariaLabel}
      tabIndex={0}
      className={cn(
        "flex size-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] data-[zoomed]:overflow-x-hidden",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export type LightboxSlideProps = ComponentProps<"div"> & {
  /** Its position, from 0. */
  index: number;
  /** What the slide is called by a screen reader's role description. Default "slide". */
  roleDescription?: string;
};

/**
 * One slide. Put the picture inside with `max-h-full max-w-full object-contain`; anything else the project
 * renders (a video, a document page) works too. The slide in view can be zoomed: double click or double
 * tap, pinch with two fingers, Ctrl and the wheel, and dragged about while zoomed, never further than its
 * own edge. Slides out of view are inert. Its name is its position ("3 of 12") unless `aria-label` is given.
 */
export function LightboxSlide({ index, className, children, roleDescription = "slide", "aria-label": ariaLabel, ...props }: LightboxSlideProps) {
  const context = useLightbox("LightboxSlide");
  const active = context.index === index;
  return (
    <div
      data-slot="lightbox-slide"
      data-index={index}
      data-active={active ? "" : undefined}
      role="group"
      aria-roledescription={roleDescription}
      aria-label={ariaLabel ?? context.formatPosition(index + 1, context.count)}
      inert={!active}
      // A size container: the picture inside is held to the slide's own height and width (see SLIDE_PICTURE).
      className={cn("relative flex size-full shrink-0 snap-center snap-always items-center justify-center overflow-hidden p-2 [container-type:size]", className)}
      {...props}
    >
      {active ? <ZoomSurface>{children}</ZoomSurface> : <div className={cn("flex max-h-full max-w-full items-center justify-center", SLIDE_PICTURE)}>{children}</div>}
    </div>
  );
}

/** The current slide's content: the element that is scaled and moved, and that carries the shared transition name. */
function ZoomSurface({ children }: { children: ReactNode }) {
  const { surfaceRef, zoom, zoomTo, panTo, open, viaTransition, transitionName } = useLightbox("LightboxSlide");
  const [gesturing, setGesturing] = useState(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ kind: "pan"; x: number; y: number; fromX: number; fromY: number } | { kind: "pinch"; distance: number; scale: number } | null>(null);
  const lastTap = useRef({ time: 0, x: 0, y: 0 });
  const lastTouch = useRef(0);

  // Ctrl and the wheel (and a trackpad pinch, which browsers report the same way) zoom about the pointer.
  // Registered by hand because the page must not zoom with it, and React's wheel listener cannot prevent that.
  const latest = useRef({ zoom, zoomTo });
  useEffect(() => {
    latest.current = { zoom, zoomTo };
  });
  useEffect(() => {
    const slide = surfaceRef.current?.parentElement;
    if (!slide) return;
    const onWheel = (event: WheelEvent): void => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      latest.current.zoomTo(latest.current.zoom.scale * Math.exp(-event.deltaY * 0.01), { origin: { x: event.clientX, y: event.clientY } });
    };
    slide.addEventListener("wheel", onWheel, { passive: false });
    return () => slide.removeEventListener("wheel", onWheel);
  }, [surfaceRef]);

  const spread = (): number => {
    const [a, b] = [...pointers.current.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };
  const middle = (): { x: number; y: number } => {
    const [a, b] = [...pointers.current.values()];
    return a && b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : { x: 0, y: 0 };
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) {
      gesture.current = { kind: "pinch", distance: spread(), scale: zoom.scale };
      setGesturing(true);
    } else if (pointers.current.size === 1 && zoom.scale > 1) {
      gesture.current = { kind: "pan", x: event.clientX, y: event.clientY, fromX: zoom.x, fromY: zoom.y };
      event.currentTarget.setPointerCapture(event.pointerId);
      setGesturing(true);
    }
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const current = gesture.current;
    if (current?.kind === "pinch" && pointers.current.size === 2 && current.distance > 0) {
      zoomTo(current.scale * (spread() / current.distance), { origin: middle() });
    } else if (current?.kind === "pan") {
      panTo(current.fromX + event.clientX - current.x, current.fromY + event.clientY - current.y);
    }
  };

  const onPointerEnd = (event: PointerEvent<HTMLDivElement>): void => {
    if (!pointers.current.delete(event.pointerId)) return;
    const moved = gesture.current !== null;
    gesture.current = null;
    setGesturing(false);
    // A double tap: touch screens do not send dblclick to an element that handles its own touches.
    if (event.type === "pointerup" && event.pointerType !== "mouse" && !moved && pointers.current.size === 0) {
      const now = event.timeStamp;
      lastTouch.current = now;
      const near = Math.hypot(event.clientX - lastTap.current.x, event.clientY - lastTap.current.y) < 30;
      if (now - lastTap.current.time < 300 && near) {
        lastTap.current.time = 0;
        zoomTo(zoom.scale > 1 ? 1 : ZOOM_DOUBLE, { origin: { x: event.clientX, y: event.clientY } });
      } else {
        lastTap.current = { time: now, x: event.clientX, y: event.clientY };
      }
    }
  };

  const style: CSSProperties = {
    transform: zoom.scale === 1 ? undefined : `translate3d(${zoom.x}px, ${zoom.y}px, 0) scale(${zoom.scale})`,
    ...(open && viaTransition ? { viewTransitionName: transitionName } : {}),
  };

  return (
    <div
      ref={surfaceRef}
      data-slot="lightbox-zoom-surface"
      data-zoomed={zoom.scale > 1 ? "" : undefined}
      data-gesture={gesturing ? "" : undefined}
      style={style}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onDoubleClick={(event) => {
        // A double tap has already been handled from the pointer events.
        if (event.timeStamp - lastTouch.current < 700) return;
        zoomTo(zoom.scale > 1 ? 1 : ZOOM_DOUBLE, { origin: { x: event.clientX, y: event.clientY } });
      }}
      className={cn(SLIDE_PICTURE, "flex max-h-full max-w-full touch-pan-x items-center justify-center transition-transform duration-base ease-out select-none data-[gesture]:transition-none data-[zoomed]:cursor-grab data-[zoomed]:touch-none data-[zoomed]:data-[gesture]:cursor-grabbing motion-reduce:transition-none [&_img]:pointer-events-none")}
    >
      {children}
    </div>
  );
}

const iconButton =
  "inline-flex size-(--control-h) shrink-0 items-center justify-center rounded-control text-foreground transition-[background-color,color,opacity] duration-instant ease-out hover:bg-accent aria-disabled:pointer-events-none aria-disabled:opacity-40 motion-reduce:transition-none [&_svg]:size-4";

/**
 * A button that cannot act just now says so with aria-disabled and stays focusable. The disabled attribute
 * would drop keyboard focus the moment the button that was just pressed reaches its limit (the next button
 * on the last slide, zoom out at 100%), and a disabled button swallows the keys pressed after that.
 */
const unavailable = (off: boolean): { "aria-disabled"?: "true" } => (off ? { "aria-disabled": "true" } : {});

type StepButtonProps = Omit<ComponentProps<"button">, "type">;

function StepButton({ step, className, children, onClick, ...props }: StepButtonProps & { step: -1 | 1 }) {
  const { index, count, loop, go } = useLightbox(step === 1 ? "LightboxNext" : "LightboxPrevious");
  const atEnd = !loop && (step === 1 ? index >= count - 1 : index <= 0);
  return (
    <button
      type="button"
      {...unavailable(atEnd || count < 2)}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented && !(atEnd || count < 2)) go(index + step);
      }}
      className={cn(iconButton, "absolute top-1/2 -translate-y-1/2 border bg-background", step === 1 ? "end-2" : "start-2", className)}
      {...props}
    >
      {children}
    </button>
  );
}

/** Shows the previous slide. Sits at the start edge of the stage. Its name ("Previous picture") is an `aria-label`: translate it. */
export function LightboxPrevious({ children, "aria-label": ariaLabel = "Previous picture", ...props }: StepButtonProps) {
  return (
    <StepButton data-slot="lightbox-previous" step={-1} aria-label={ariaLabel} {...props}>
      {children ?? <ChevronLeft aria-hidden="true" strokeWidth={1.5} className="rtl:-scale-x-100" />}
    </StepButton>
  );
}

/** Shows the next slide. Sits at the end edge of the stage. Its name ("Next picture") is an `aria-label`: translate it. */
export function LightboxNext({ children, "aria-label": ariaLabel = "Next picture", ...props }: StepButtonProps) {
  return (
    <StepButton data-slot="lightbox-next" step={1} aria-label={ariaLabel} {...props}>
      {children ?? <ChevronRight aria-hidden="true" strokeWidth={1.5} className="rtl:-scale-x-100" />}
    </StepButton>
  );
}

/** "3 of 12". A polite live region: the new position is read out when the slide changes, whatever changed it. */
export function LightboxCounter({ className, ...props }: Omit<ComponentProps<"p">, "children">) {
  const { index, count, formatPosition } = useLightbox("LightboxCounter");
  return (
    <p data-slot="lightbox-counter" aria-live="polite" aria-atomic="true" className={cn("shrink-0 text-sm text-muted-foreground tabular-nums", className)} {...props}>
      {formatPosition(index + 1, count)}
    </p>
  );
}

/** The words under the picture. Render the caption of the current slide: `useLightbox().index` says which. */
export function LightboxCaption({ className, ...props }: ComponentProps<"p">) {
  return <p data-slot="lightbox-caption" dir="auto" className={cn("text-sm text-foreground", className)} {...props} />;
}

/** A strip of small pictures to jump between slides. It scrolls sideways when it is longer than the screen. Name it with `aria-label` (default "All pictures"). */
export function LightboxThumbnails({ className, "aria-label": ariaLabel = "All pictures", ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="lightbox-thumbnails"
      role="group"
      aria-label={ariaLabel}
      className={cn("-mx-1 flex gap-2 overflow-x-auto px-1 py-1 [scrollbar-width:thin]", className)}
      {...props}
    />
  );
}

export type LightboxThumbnailProps = Omit<ComponentProps<"button">, "type"> & { index: number };

/**
 * One small picture in the strip. The one for the slide in view has `aria-current`, a strong edge and full
 * opacity. Give it a name: an `aria-label`, or the `alt` of the picture inside.
 */
export function LightboxThumbnail({ index, className, onClick, ...props }: LightboxThumbnailProps) {
  const context = useLightbox("LightboxThumbnail");
  const active = context.index === index;
  return (
    <button
      type="button"
      data-slot="lightbox-thumbnail"
      aria-current={active ? "true" : undefined}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) context.go(index);
      }}
      className={cn(
        "relative size-12 shrink-0 overflow-hidden rounded-control border border-border opacity-60 transition-opacity duration-instant ease-out hover:opacity-100 aria-[current]:border-2 aria-[current]:border-primary aria-[current]:opacity-100 motion-reduce:transition-none [&_img]:size-full [&_img]:object-cover",
        className,
      )}
      {...props}
    />
  );
}

export type LightboxZoomProps = Omit<ComponentProps<"div">, "children"> & {
  zoomInLabel?: string;
  zoomOutLabel?: string;
  /** Read before the level on the middle button, which goes back to 100% ("Reset zoom: 150%"). */
  resetLabel?: string;
};

/**
 * Zoom out, the level (press it to reset), zoom in. The buttons are the alternative to pinching and to the
 * wheel; the keys + - and 0 do the same anywhere in the lightbox. The new level is announced.
 */
export function LightboxZoom({ className, zoomInLabel = "Zoom in", zoomOutLabel = "Zoom out", resetLabel = "Reset zoom", "aria-label": ariaLabel = "Zoom", ...props }: LightboxZoomProps) {
  const { zoom, zoomTo, maxZoom } = useLightbox("LightboxZoom");
  return (
    <div data-slot="lightbox-zoom" role="group" aria-label={ariaLabel} className={cn("flex shrink-0 items-center", className)} {...props}>
      <button type="button" data-slot="lightbox-zoom-out" aria-label={zoomOutLabel} {...unavailable(zoom.scale <= 1)} onClick={() => zoomTo(zoom.scale / ZOOM_STEP, { say: true })} className={iconButton}>
        <ZoomOut aria-hidden="true" strokeWidth={1.5} />
      </button>
      <button
        type="button"
        data-slot="lightbox-zoom-reset"
        {...unavailable(zoom.scale === 1)}
        onClick={() => zoomTo(1, { say: true })}
        className={cn(iconButton, "w-auto min-w-12 px-1 text-sm tabular-nums aria-disabled:opacity-100")}
      >
        <span className="sr-only">{resetLabel}: </span>
        <span data-slot="lightbox-zoom-level">{Math.round(zoom.scale * 100)}%</span>
      </button>
      <button type="button" data-slot="lightbox-zoom-in" aria-label={zoomInLabel} {...unavailable(zoom.scale >= maxZoom)} onClick={() => zoomTo(zoom.scale * ZOOM_STEP, { say: true })} className={iconButton}>
        <ZoomIn aria-hidden="true" strokeWidth={1.5} />
      </button>
    </div>
  );
}

/** Closes the lightbox. Its name ("Close") is an `aria-label`: translate it. */
export function LightboxClose({ className, children, "aria-label": ariaLabel = "Close", ...props }: ComponentProps<typeof DialogPrimitive.Close>) {
  return (
    <DialogPrimitive.Close data-slot="lightbox-close" aria-label={ariaLabel} className={cn(iconButton, className)} {...props}>
      {children ?? <X aria-hidden="true" strokeWidth={1.5} />}
    </DialogPrimitive.Close>
  );
}
