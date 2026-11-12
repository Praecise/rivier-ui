"use client";
/**
 * @name streaming-text
 * @category ui
 * @description Text that grows as it arrives, with a caret while it is arriving, that is never read out word by word: it is announced once, when it is finished.
 * @when A reply from a model, a transcript or a log line that streams in. Pass the text so far and whether more is coming. It must not sit inside a live region (a thread is `aria-live="off"`); say "Writing a reply" through a status-line while it streams. For text that is already complete use a plain element; for a headline that animates in use text-reveal.
 * @example
 * <MessageContent>
 *   <StreamingText text={reply} streaming={isStreaming} announceWhenDone onDone={saveReply} />
 * </MessageContent>
 *
 * // A shorter spoken form, and words that fade in as they land
 * <StreamingText text={reply} streaming={isStreaming} reveal="word" announceWhenDone="Three places found. The nearest is ten minutes away." />
 *
 * // The project's own renderer (Markdown, for example)
 * <StreamingText text={reply} streaming={isStreaming}>{(text) => <Markdown>{text}</Markdown>}</StreamingText>
 */
import { useEffect, useEffectEvent, useRef, type ComponentProps, type ReactNode } from "react";
import { announce } from "@/lib/announce";
import { cn } from "@/lib/cn";

export type StreamingTextProps = Omit<ComponentProps<"span">, "children"> & {
  /** The text so far. */
  text: string;
  /** Whether more is coming. While true the element is `aria-busy` and shows the caret. */
  streaming?: boolean;
  /**
   * Said once through the shared live region when streaming ends: `true` says the whole text, a string says
   * that instead (a shorter spoken form of a long reply). Leave it out when the project announces the reply
   * some other way. Text that was complete when it was first shown is not announced.
   */
  announceWhenDone?: boolean | string;
  /** Called once when `streaming` goes from true to false, with the finished text. */
  onDone?: (text: string) => void;
  /** The caret after the last word while streaming. Default true. */
  caret?: boolean;
  /** "word": each word fades in as it lands (opacity only, off under reduced motion). The text is in the page either way. Default "none". */
  reveal?: "none" | "word";
  /** Render the text yourself (Markdown, links). `reveal` then does not apply. */
  children?: (text: string) => ReactNode;
};

/**
 * Nothing here is a live region, on purpose: a screen reader that announced every arriving word would be
 * unusable. The element only marks itself busy; the one announcement is made when the text is whole.
 * Arriving text never takes or moves focus.
 */
export function StreamingText({ className, text, streaming = false, announceWhenDone, onDone, caret = true, reveal = "none", children, ...props }: StreamingTextProps) {
  const wasStreaming = useRef(streaming);
  const finish = useEffectEvent((): void => {
    onDone?.(text);
    if (announceWhenDone === true) announce(text);
    else if (typeof announceWhenDone === "string") announce(announceWhenDone);
  });
  useEffect(() => {
    if (wasStreaming.current && !streaming) finish();
    wasStreaming.current = streaming;
  }, [streaming]);

  return (
    <span data-slot="streaming-text" data-streaming={streaming ? "" : undefined} aria-busy={streaming || undefined} className={cn("wrap-anywhere whitespace-pre-wrap", className)} {...props}>
      {children ? children(text) : reveal === "word" ? <Words text={text} /> : text}
      {streaming && caret ? (
        <span
          aria-hidden="true"
          data-slot="streaming-text-caret"
          className="ms-0.5 inline-block h-[1em] w-[0.5em] translate-y-[0.15em] animate-pulse rounded-control bg-current opacity-70 motion-reduce:animate-none"
        />
      ) : null}
    </span>
  );
}

/**
 * The text as words and the spaces between them. A word keeps its key as the text grows, so only a word
 * that has just landed is mounted, and only that one fades in. The words are real text in the page.
 */
function Words({ text }: { text: string }) {
  const pieces = text.split(/(\s+)/);
  return (
    <>
      {pieces.map((piece, index) =>
        index % 2 === 1 || piece === "" ? (
          piece
        ) : (
          <span key={index} className="animation-duration-(--duration-slow) animate-in fade-in-0 motion-reduce:animate-none">
            {piece}
          </span>
        ),
      )}
    </>
  );
}
