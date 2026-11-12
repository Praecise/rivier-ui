"use client";
/**
 * @name view-transition
 * @category motion
 * @description View transitions two ways: wrappers over React's own <ViewTransition> (a shared element that morphs between two places, a boundary that cross-fades what changes inside it), and helpers for the browser's API (run an update as a transition, name an element, a link that navigates inside a transition).
 * @when Moving between pages or between two states of a view, where an element in the old view should become one in the new. Use the React wrappers (SharedElement, TransitionBoundary) when the change is a React transition: a state update inside startTransition, a Suspense boundary revealing, a navigation by a router that uses transitions (Next.js). React then starts the browser's transition itself. Use the browser helpers (startViewTransition, ViewTransitionName, TransitionLink) when nothing in the tree uses React's component: a synchronous update, a router that does not use transitions, an element that stays mounted while the view around it changes. Do not mix the two for one update: React's documentation says not to call document.startViewTransition yourself around an update it is already animating. Both degrade to an instant change where the API is missing, and the theme switches them off under reduced motion. For a shared element that must be interrupted mid-way use layout-transition; for a simple enter on route change use page-transition.
 * @example
 * // React's way: the same name in two places; the update runs in a transition.
 * const [open, setOpen] = useState(false);
 * {open ? (
 *   <SharedElement name="atlas-cover"><img src="/atlas.jpg" alt="Atlas" className="w-full" /></SharedElement>
 * ) : (
 *   <button onClick={() => startTransition(() => setOpen(true))}>
 *     <SharedElement name="atlas-cover"><img src="/atlas.jpg" alt="Atlas" className="size-24" /></SharedElement>
 *   </button>
 * )}
 *
 * // The browser's way. A link that navigates inside a view transition; in Next.js pass router.push:
 * <TransitionLink href="/work/atlas" navigate={router.push}>Atlas</TransitionLink>
 * // The same name on the list page and on the detail page: the image morphs from one to the other.
 * <ViewTransitionName name="work-atlas-cover" asChild>
 *   <img src="/atlas.jpg" alt="Atlas" />
 * </ViewTransitionName>
 * // A state change in place. flushSync (from react-dom) makes React apply it before the browser's snapshot.
 * <Button onClick={() => startViewTransition(() => flushSync(() => setLayout("grid")))}>Grid</Button>
 */
import { Slot } from "radix-ui";
import { useLayoutEffect, useRef, useTransition, ViewTransition, type ComponentProps, type CSSProperties, type MouseEvent, type ViewTransitionProps } from "react";
import { cn } from "@/lib/cn";

/** How long a navigation may hold the page still before the transition goes ahead without it, in milliseconds. */
const NAVIGATION_TIMEOUT = 1500;

/**
 * Runs `update` (which changes the page) inside a view transition and resolves when the transition has
 * finished. Where the API is missing, or the visitor has asked for reduced motion, it runs `update` directly.
 * The durations and easing of the transition are set by the theme (`::view-transition-*` in rivier-ui.css).
 * If `update` returns a promise, the browser holds the old view until it resolves, so resolve it only once
 * the new view is in the document.
 */
export async function startViewTransition(update: () => void | Promise<void>): Promise<void> {
  const supported = typeof document !== "undefined" && typeof document.startViewTransition === "function";
  if (!supported || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    await update();
    return;
  }
  await document.startViewTransition(update).finished;
}

/**
 * The style that names an element for view transitions. An element with the same name in the old and the new
 * view morphs from one to the other. A name must be unique among the elements on screen at one time; anything
 * that is not valid in a CSS identifier is replaced.
 */
export function viewTransitionName(name: string): CSSProperties {
  return { viewTransitionName: identifierOf(name) };
}

/** A name as a CSS identifier: what is not valid in one is replaced. */
function identifierOf(name: string): string {
  const identifier = name.trim().replace(/[^a-zA-Z0-9_-]+/g, "-");
  return /^[a-zA-Z_]/.test(identifier) ? identifier : `vt-${identifier}`;
}

export type SharedElementProps = Omit<ViewTransitionProps, "name"> & {
  /** The shared name. Use the same one in the other place; it must be unique among what is on screen at one time. */
  name: string;
};

/**
 * React's <ViewTransition> with a name. When one SharedElement leaves the tree and another with the same
 * name enters it in the same React transition (startTransition, a Suspense reveal, a navigation), the
 * browser morphs the first into the second. It adds no element: the name is put on the child's DOM node.
 * Updates outside a transition (a plain setState) are applied at once, with no animation.
 */
export function SharedElement({ name, children, ...props }: SharedElementProps) {
  return (
    <ViewTransition name={identifierOf(name)} {...props}>
      {children}
    </ViewTransition>
  );
}

/**
 * React's <ViewTransition> without a name: what enters, leaves or changes inside it during a React
 * transition cross-fades instead of swapping. `enter`, `exit`, `update` and `share` take a
 * view-transition-class (or "none") to style or switch off each case.
 */
export function TransitionBoundary(props: ViewTransitionProps) {
  return <ViewTransition {...props} />;
}

export type ViewTransitionNameProps = ComponentProps<"div"> & {
  /** The shared name. Use the same one on the matching element of the other view ("post-42-cover"). */
  name: string;
  /** Put the name on the child element instead of a wrapping div. */
  asChild?: boolean;
};

/** Names an element for view transitions: a div, or with `asChild` the element passed in. */
export function ViewTransitionName({ className, name, asChild = false, style, ...props }: ViewTransitionNameProps) {
  const Comp = asChild ? Slot.Root : "div";
  return <Comp data-slot="view-transition-name" className={cn(className)} style={{ ...style, ...viewTransitionName(name) }} {...props} />;
}

export type TransitionLinkProps = Omit<ComponentProps<"a">, "href"> & {
  href: string;
  /** Performs the client navigation: `router.push` in Next.js, `navigate` in React Router. May return a promise. */
  navigate: (href: string) => void | Promise<void>;
};

/**
 * An anchor that navigates on the client inside a view transition. It is a real link: modified clicks, new
 * tabs, downloads and other origins are left to the browser. It has no dependency on a router: the old view
 * is held until React has finished the transition that `navigate` starts (or the promise it returns), and
 * never for longer than a moment.
 */
export function TransitionLink({ className, href, navigate, onClick, ...props }: TransitionLinkProps) {
  const [pending, startTransition] = useTransition();
  const settle = useRef<(() => void) | null>(null);

  // The navigation has been committed (pending is false again) or this link has left the page with the old
  // view: either way the new view is in the document, so let the browser take its snapshot.
  useLayoutEffect(() => {
    if (!pending) settle.current?.();
  }, [pending]);
  useLayoutEffect(() => () => settle.current?.(), []);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>): void => {
    onClick?.(event);
    const anchor = event.currentTarget;
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if ((anchor.target && anchor.target !== "_self") || anchor.hasAttribute("download") || anchor.origin !== window.location.origin) return;
    event.preventDefault();
    void startViewTransition(
      () =>
        new Promise<void>((resolve) => {
          const timer = window.setTimeout(() => settle.current?.(), NAVIGATION_TIMEOUT);
          settle.current = () => {
            window.clearTimeout(timer);
            settle.current = null;
            resolve();
          };
          startTransition(async () => {
            await navigate(href);
          });
        }),
    ).catch(() => {});
  };

  return <a data-slot="transition-link" className={cn(className)} href={href} onClick={handleClick} {...props} />;
}
