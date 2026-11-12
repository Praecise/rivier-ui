"use client";
/**
 * @name thread
 * @category ui
 * @description The scrolling log of a conversation: it follows the newest content while the person is at the bottom, stops the moment they scroll up, and offers a way back down.
 * @when A conversation with an assistant or between people, where messages arrive over time. It holds no messages and no transport: render them inside it (message, streaming-text, part-frame). The log is deliberately silent (`aria-live="off"`): say what is happening through one status-line beside it, and the finished reply once through streaming-text's `announceWhenDone`. For a list that does not grow at the bottom use scroll-area.
 * @example
 * <Thread aria-label="Conversation with the assistant" className="h-[32rem]">
 *   <ThreadContent>
 *     {messages.length === 0 ? <ThreadEmpty>Ask anything to begin.</ThreadEmpty> : null}
 *     {messages.map((message) => (
 *       <ThreadTurn key={message.id} label={message.from === "user" ? "You" : "Assistant"}>
 *         <Message from={message.from}>
 *           <MessageBody><MessageContent>{message.text}</MessageContent></MessageBody>
 *         </Message>
 *       </ThreadTurn>
 *     ))}
 *   </ThreadContent>
 *   <ThreadJump>Jump to latest</ThreadJump>
 * </Thread>
 *
 * // Always show what the person just sent, even if they had scrolled up
 * <Thread aria-label="Conversation" resumeKey={lastOwnMessageId}>…</Thread>
 */
import { ArrowDown } from "lucide-react";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { cn } from "@/lib/cn";

/** How close to the end, in pixels, still counts as "at the bottom". */
const NEAR_BOTTOM = 32;
/** Keys that scroll a focused region up. */
const UP_KEYS = new Set(["ArrowUp", "PageUp", "Home"]);

type ThreadContextValue = {
  viewportRef: RefObject<HTMLDivElement | null>;
  /** Whether the view is at the newest content. */
  atBottom: boolean;
  /** Whether content has arrived since the person scrolled up. */
  unseen: boolean;
  /** Goes to the newest content and follows it again. */
  scrollToBottom: (options?: { focus?: boolean }) => void;
  label: { "aria-label"?: string | undefined; "aria-labelledby"?: string | undefined };
  /** For ThreadContent: the person scrolled up by their own act. */
  release: () => void;
  onScroll: () => void;
  onGrow: () => void;
};

const ThreadContext = createContext<ThreadContextValue | null>(null);

function useThreadContext(part: string): ThreadContextValue {
  const context = use(ThreadContext);
  if (!context) throw new Error(`<${part}> must be used inside <Thread>.`);
  return context;
}

/** Where the thread is: for a project's own "new messages" marker or a custom jump control. */
export function useThread(): Pick<ThreadContextValue, "atBottom" | "unseen" | "scrollToBottom"> {
  const { atBottom, unseen, scrollToBottom } = useThreadContext("useThread");
  return { atBottom, unseen, scrollToBottom };
}

export type ThreadProps = ComponentProps<"div"> & {
  /**
   * When this value changes, the thread goes to the newest content and follows it again, wherever the person
   * had scrolled to. Pass the id of the person's own latest message, so that what they send is always shown.
   */
  resumeKey?: string | number | null;
};

/**
 * The frame: give it a height (or let a flex parent do so) and a name with `aria-label` or
 * `aria-labelledby`, which is handed to the log inside. It never moves focus when content arrives.
 */
export function Thread({ className, children, resumeKey, "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy, ...props }: ThreadProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [unseen, setUnseen] = useState(false);
  /** Whether new content pulls the view down. A ref: it is read in observers between renders. */
  const following = useRef(true);
  /** The last scroll position seen, to tell a scroll up (the person's) from content growing or a jump on its way down. */
  const lastTop = useRef(0);

  const scrollToBottom = useCallback((options?: { focus?: boolean }): void => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    following.current = true;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    viewport.scrollTo({ top: viewport.scrollHeight, behavior: smooth ? "smooth" : "instant" });
    setUnseen(false);
    if (options?.focus) viewport.focus({ preventScroll: true });
  }, []);

  // The person sent something: show it. The scroll event that follows brings the state up to date.
  const resumed = useRef(resumeKey);
  useEffect(() => {
    if (Object.is(resumed.current, resumeKey)) return;
    resumed.current = resumeKey;
    const viewport = viewportRef.current;
    if (!viewport) return;
    following.current = true;
    viewport.scrollTop = viewport.scrollHeight;
  }, [resumeKey]);

  const release = useCallback((): void => {
    following.current = false;
  }, []);

  const onScroll = useCallback((): void => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const top = viewport.scrollTop;
    const bottom = viewport.scrollHeight - top - viewport.clientHeight <= NEAR_BOTTOM;
    if (bottom) {
      following.current = true;
      setUnseen(false);
    } else if (top < lastTop.current - 1) {
      // Growing content and a jump on its way only ever move the view down: a move up is the person's.
      following.current = false;
    }
    lastTop.current = top;
    setAtBottom(bottom);
  }, []);

  const onGrow = useCallback((): void => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    if (following.current) {
      // Also ends a smooth jump that was aimed at where the end used to be.
      viewport.scrollTop = viewport.scrollHeight;
    } else if (viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight > NEAR_BOTTOM) {
      setUnseen(true);
      setAtBottom(false);
    }
  }, []);

  const value = useMemo<ThreadContextValue>(
    () => ({ viewportRef, atBottom, unseen, scrollToBottom, label: { "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy }, release, onScroll, onGrow }),
    [atBottom, unseen, scrollToBottom, ariaLabel, ariaLabelledBy, release, onScroll, onGrow],
  );

  return (
    <ThreadContext value={value}>
      <div
        data-slot="thread"
        data-at-bottom={atBottom ? "" : undefined}
        data-unseen={unseen ? "" : undefined}
        className={cn("relative flex min-h-0 min-w-0 flex-col", className)}
        {...props}
      >
        {children}
      </div>
    </ThreadContext>
  );
}

export type ThreadContentProps = ComponentProps<"div">;

/**
 * The log itself and its scroll container. `role="log"` with `aria-live="off"`: a screen reader can browse
 * it, but words that stream in are not read out as they land. It takes keyboard focus (a scrollable region
 * must), so arrow keys and Page Up scroll it; scrolling up by wheel, touch or keyboard stops it following.
 */
export function ThreadContent({ className, children, onWheel, onTouchMove, onKeyDown, onScroll, ...props }: ThreadContentProps) {
  const context = useThreadContext("ThreadContent");
  const { viewportRef, onGrow, onScroll: track, release } = context;
  const innerRef = useRef<HTMLDivElement>(null);

  // Start at the newest content, before the first paint.
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (viewport) viewport.scrollTop = viewport.scrollHeight;
  }, [viewportRef]);

  // Content that grows (a new message, a streamed word, an image that loads) or a frame that resizes.
  useEffect(() => {
    const viewport = viewportRef.current;
    const inner = innerRef.current;
    if (!viewport || !inner || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => onGrow());
    observer.observe(inner);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [viewportRef, onGrow]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    onKeyDown?.(event);
    if (event.target === event.currentTarget && (UP_KEYS.has(event.key) || (event.key === " " && event.shiftKey))) release();
  };

  return (
    <div
      ref={viewportRef}
      data-slot="thread-content"
      role="log"
      aria-live="off"
      tabIndex={0}
      {...context.label}
      onScroll={(event) => {
        onScroll?.(event);
        track();
      }}
      onWheel={(event) => {
        onWheel?.(event);
        if (event.deltaY < 0) release();
      }}
      onTouchMove={(event) => {
        onTouchMove?.(event);
        release();
      }}
      onKeyDown={handleKeyDown}
      className={cn("min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain rounded-surface [overflow-anchor:none]", className)}
      {...props}
    >
      <div ref={innerRef} data-slot="thread-inner" className="flex min-h-full flex-col gap-6 p-4">
        {children}
      </div>
    </div>
  );
}

export type ThreadTurnProps = Omit<ComponentProps<"div">, "role"> & {
  /** Who is speaking, in the project's words ("You", "Assistant", a person's name). Read by screen readers, not shown. */
  label: ReactNode;
  /** The level of the hidden heading, so the turn fits the page's outline. Default 3. */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
};

/**
 * One speaker's turn: a group named by a visually hidden heading, so a screen-reader user can move from
 * turn to turn by heading and always knows who is speaking.
 */
export function ThreadTurn({ className, label, headingLevel = 3, children, ...props }: ThreadTurnProps) {
  const id = useId();
  const Heading = `h${headingLevel}` as const;
  return (
    <div data-slot="thread-turn" role="group" aria-labelledby={id} className={cn("flex min-w-0 flex-col gap-3", className)} {...props}>
      <Heading id={id} className="sr-only">
        {label}
      </Heading>
      {children}
    </div>
  );
}

export type ThreadJumpProps = Omit<ComponentProps<"button">, "type"> & {
  /** "unseen" (default): shown when the person has scrolled up and something new arrived. "away": shown whenever they are not at the bottom. */
  show?: "unseen" | "away";
};

/**
 * The way back down. It is in the page only while it is useful, sits outside the log, and on press goes to
 * the newest content (smoothly, or at once under reduced motion) and hands focus to the log, so focus is not
 * lost when the button goes away. Its children are its name: "Jump to latest", in the project's language.
 */
export function ThreadJump({ className, show = "unseen", children = "Jump to latest", onClick, ...props }: ThreadJumpProps) {
  const { atBottom, unseen, scrollToBottom } = useThreadContext("ThreadJump");
  if (atBottom || (show === "unseen" && !unseen)) return null;
  return (
    <button
      type="button"
      data-slot="thread-jump"
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) scrollToBottom({ focus: true });
      }}
      className={cn(
        "absolute inset-x-0 bottom-3 z-10 mx-auto inline-flex h-control-sm w-fit max-w-[calc(100%-2rem)] items-center gap-1.5 rounded-control border border-border-strong bg-background px-3 text-sm font-medium text-foreground transition-[background-color,opacity] duration-instant ease-out animation-duration-(--duration-base) animate-in fade-in-0 hover:bg-accent motion-reduce:animate-none motion-reduce:transition-none pointer-coarse:h-control [&_svg]:size-4 [&_svg]:shrink-0",
        className,
      )}
      {...props}
    >
      <ArrowDown aria-hidden="true" strokeWidth={1.5} />
      <span className="truncate">{children}</span>
    </button>
  );
}

/** What the thread shows before the first message: centred in the space, with room for suggestions. */
export function ThreadEmpty({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="thread-empty"
      className={cn("flex flex-1 flex-col items-center justify-center gap-3 px-4 py-10 text-center text-base text-muted-foreground", className)}
      {...props}
    />
  );
}
