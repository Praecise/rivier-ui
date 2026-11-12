"use client";
/**
 * @name text-reveal
 * @category motion
 * @description Reveals a heading word by word, or line by line, when it scrolls into view.
 * @when A headline or a short statement. Not for paragraphs of body text (use reveal on the block), and not for text that changes while it is shown.
 * @example
 * <TextReveal as="h1" className="text-4xl font-medium" playOnLoad>
 *   Websites, apps and systems that last
 * </TextReveal>
 * <TextReveal as="p" by="line" interval={0.12} className="max-w-prose text-xl">
 *   We design the brand, build the product and stay to run it.
 * </TextReveal>
 */
import { Fragment, useImperativeHandle, useRef, type HTMLAttributes, type Ref } from "react";
import { cn } from "@/lib/cn";
import { useEntrance, type EntranceOptions } from "@/lib/motion";

export type TextRevealProps = Omit<HTMLAttributes<HTMLElement>, "children"> & {
  ref?: Ref<HTMLElement>;
  /** The text. A plain string; a line break ("\n") in it is kept. */
  children: string;
  /** The element to render. Default "h2". */
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span" | "div";
  /** Reveal each word in turn, or each line as it wraps on screen (measured once, when it starts). Default "word". */
  by?: "word" | "line";
  /** Seconds between one word (or line) and the next. Default 0.04 by word, 0.1 by line. */
  interval?: number;
  /** Seconds before the first one. Default 0. */
  delay?: number;
  /** Seconds each word takes. Default: the scene duration (0.7). */
  duration?: number;
  /** How far each word rises, in pixels. Default 12. */
  distance?: number;
  /** Play once (default), or again each time it comes back into view. */
  once?: boolean;
  /** Also play when it is already in view as the page loads (a hero heading). Default false: left as it is. */
  playOnLoad?: boolean;
  /** Grows or shrinks the viewport edge used for "in view", as a CSS margin. */
  margin?: EntranceOptions["margin"];
};

function wordsOf(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>("[data-word]"));
}

/** The index of the wrapped line each word sits on, read from where the words landed. */
function lineIndexes(words: HTMLElement[]): number[] {
  let line = -1;
  let top = Number.NaN;
  return words.map((word) => {
    if (word.offsetTop !== top) {
      top = word.offsetTop;
      line += 1;
    }
    return line;
  });
}

export function TextReveal({
  className,
  children,
  as: Tag = "h2",
  by = "word",
  interval,
  delay = 0,
  duration,
  distance = 12,
  once = true,
  playOnLoad = false,
  margin,
  ref,
  ...props
}: TextRevealProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  useImperativeHandle(ref, () => rootRef.current as HTMLElement, []);
  const step = interval ?? (by === "line" ? 0.1 : 0.04);
  const lines = useRef<number[] | null>(null);
  useEntrance(rootRef, wordsOf, {
    direction: "up",
    distance,
    duration,
    delay: (index, words) => {
      if (by === "word") return delay + index * step;
      if (index === 0 || !lines.current) lines.current = lineIndexes(words);
      return delay + (lines.current[index] ?? 0) * step;
    },
    once,
    playOnLoad,
    margin,
  });

  // One accessible reading: the real text is rendered once, whole, in a visually hidden span that screen
  // readers and crawlers read; the per-word spans people see are aria-hidden. Splitting the only copy into
  // inline-block spans would make some screen readers announce it word by word, and an aria-label is not
  // allowed on a p, span or div, so this is the form that works for every `as`.
  return (
    <Tag
      ref={(node: HTMLElement | null) => {
        rootRef.current = node;
      }}
      data-slot="text-reveal"
      className={cn(className)}
      {...props}
    >
      <span className="sr-only">{children}</span>
      <span aria-hidden="true" data-slot="text-reveal-visual">
        {children.split("\n").map((line, lineIndex) => (
          <Fragment key={lineIndex}>
            {lineIndex > 0 ? <br /> : null}
            {line
              .split(/\s+/)
              .filter(Boolean)
              .map((word, wordIndex) => (
                <Fragment key={wordIndex}>
                  {wordIndex > 0 ? " " : null}
                  <span data-word="" className="inline-block">
                    {word}
                  </span>
                </Fragment>
              ))}
          </Fragment>
        ))}
      </span>
    </Tag>
  );
}
