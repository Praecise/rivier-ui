"use client";
/**
 * @name view-transition
 * @category motion
 * @description Helpers for the browser's View Transitions API: run an update as a transition, name an element so it morphs between states or pages, and a link that navigates inside a transition.
 * @when Moving between pages or between two states of a view, where the browser can cross-fade the page and morph elements that share a name. It needs no library and degrades to an instant change. For a shared element inside one React tree (a tabs indicator) use layout-transition; for a simple enter on route change use page-transition.
 * @example
 * // A link that navigates inside a view transition. In Next.js pass router.push:
 * const router = useRouter();
 * <TransitionLink href="/work/atlas" navigate={router.push}>Atlas</TransitionLink>
 *
 * // The same name on the list page and on the detail page: the image morphs from one to the other.
 * <ViewTransitionName name="work-atlas-cover" asChild>
 *   <img src="/atlas.jpg" alt="Atlas" />
 * </ViewTransitionName>
 * <img src="/atlas.jpg" alt="Atlas" style={viewTransitionName("work-atlas-cover")} />
 *
 * // A state change in place. flushSync (from react-dom) makes React apply it before the browser's snapshot.
 * <Button onClick={() => startViewTransition(() => flushSync(() => setLayout("grid")))}>Grid</Button>
 */
import { Slot } from "radix-ui";
import { useLayoutEffect, useRef, useTransition, type ComponentProps, type CSSProperties, type MouseEvent } from "react";
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
  const identifier = name.trim().replace(/[^a-zA-Z0-9_-]+/g, "-");
  return { viewTransitionName: /^[a-zA-Z_]/.test(identifier) ? identifier : `vt-${identifier}` };
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
