"use client";
/**
 * @name message
 * @category ui
 * @description One message in a conversation, from the person, the assistant or the system, with parts for an avatar, the words, the time and sending state, a toolbar of actions, and suggested replies.
 * @when Inside a thread, one per message. The person's own messages sit at the end side in a bubble; the assistant's read as plain text at the start. For words that are still arriving put streaming-text inside MessageContent; for a structured piece of a reply (a plan, a form) use part-frame beside it. Not for comments under an article or a notification list: those are plain lists.
 * @example
 * <Message from="user">
 *   <MessageBody>
 *     <MessageContent>Somewhere quiet for lunch on Saturday?</MessageContent>
 *     <MessageMeta time={sentAt} status="failed" />
 *   </MessageBody>
 * </Message>
 *
 * <Message from="assistant">
 *   <MessageAvatar><Avatar size="sm"><AvatarFallback>AI</AvatarFallback></Avatar></MessageAvatar>
 *   <MessageBody>
 *     <MessageContent>Three places are open then.</MessageContent>
 *     <MessageActions aria-label="Actions for this reply">
 *       <MessageAction aria-label="Copy" onClick={copy}><Copy /></MessageAction>
 *       <MessageAction aria-label="Try again" onClick={retry}><RotateCcw /></MessageAction>
 *     </MessageActions>
 *     <MessageSuggestions aria-label="Suggested replies">
 *       <MessageSuggestion onClick={() => send("Only outdoors")}>Only outdoors</MessageSuggestion>
 *     </MessageSuggestions>
 *   </MessageBody>
 * </Message>
 */
import { Toolbar as ToolbarPrimitive } from "radix-ui";
import { CircleAlert } from "lucide-react";
import { createContext, use, type ComponentProps, type ReactNode } from "react";
import { ChipButton, type ChipButtonProps } from "@/components/ui/chip";
import { cn } from "@/lib/cn";

export type MessageFrom = "user" | "assistant" | "system";

const MessageContext = createContext<MessageFrom>("assistant");

export type MessageProps = ComponentProps<"div"> & {
  /** Who it is from. "user" is the person using the product; "system" is a note in the conversation (a date, "the plan changed"). */
  from: MessageFrom;
};

/**
 * The row. The person's messages run from the end side, everyone else's from the start, by the reading
 * direction (nothing here is left or right). Who is speaking is said by the ThreadTurn around it.
 */
export function Message({ className, from, ...props }: MessageProps) {
  return (
    <MessageContext value={from}>
      <div
        data-slot="message"
        data-from={from}
        className={cn("group/message flex min-w-0 gap-3 data-[from=system]:justify-center data-[from=user]:flex-row-reverse", className)}
        {...props}
      />
    </MessageContext>
  );
}

/** A slot for the speaker's picture (an Avatar). Decorative when the turn already names the speaker: give the image alt="". */
export function MessageAvatar({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="message-avatar" className={cn("shrink-0", className)} {...props} />;
}

/** The column that stacks the words, the meta line, the actions and the suggestions. */
export function MessageBody({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="message-body"
      className={cn(
        "flex min-w-0 flex-col gap-1.5 group-data-[from=assistant]/message:flex-1 group-data-[from=system]/message:items-center group-data-[from=user]/message:max-w-[85%] group-data-[from=user]/message:items-end",
        className,
      )}
      {...props}
    />
  );
}

export type MessageContentProps = ComponentProps<"div">;

/**
 * The words. A person's own words get `dir="auto"`, so a message typed in a right-to-left language reads
 * correctly in a left-to-right page and the other way round; pass `dir` to override. Long words and links
 * wrap rather than widen the page.
 */
export function MessageContent({ className, dir, ...props }: MessageContentProps) {
  const from = use(MessageContext);
  return (
    <div
      data-slot="message-content"
      dir={dir ?? (from === "user" ? "auto" : undefined)}
      className={cn(
        "max-w-full min-w-0 text-base leading-relaxed wrap-anywhere whitespace-pre-wrap text-foreground",
        from === "user" && "rounded-surface bg-muted px-4 py-2.5 text-start",
        from === "system" && "text-center text-sm text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export type MessageStatus = "sending" | "sent" | "failed";

export type MessageMetaProps = ComponentProps<"div"> & {
  /** When it was sent: shown as a time of day in `locale`. */
  time?: Date | number | string;
  /** A BCP 47 language tag for the time. Default: the runtime's. */
  locale?: string;
  /** How the time is written. Default: hour and minute. */
  timeFormat?: Intl.DateTimeFormatOptions;
  /** "sending" and "failed" are said in words; "sent" (default) shows only the time. */
  status?: MessageStatus;
  /** The words for the states. Translate them with the interface. */
  labels?: { sending?: string; failed?: string };
  children?: ReactNode;
};

/**
 * The small line under a message: the time, and a state said in words (and a mark, for "not sent"), never by
 * colour alone. Put a retry button in its children when sending failed.
 */
export function MessageMeta({ className, time, locale, timeFormat, status = "sent", labels, children, ...props }: MessageMetaProps) {
  const date = time === undefined ? null : new Date(time);
  const valid = date !== null && !Number.isNaN(date.getTime());
  return (
    <div
      data-slot="message-meta"
      data-status={status}
      className={cn("flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground", className)}
      {...props}
    >
      {valid ? (
        // The server and the browser may be in different time zones: the browser's reading wins.
        <time dateTime={date.toISOString()} suppressHydrationWarning>
          {new Intl.DateTimeFormat(locale, timeFormat ?? { hour: "numeric", minute: "2-digit" }).format(date)}
        </time>
      ) : null}
      {status === "sending" ? <span data-slot="message-status">{labels?.sending ?? "Sending"}</span> : null}
      {status === "failed" ? (
        <span data-slot="message-status" className="inline-flex items-center gap-1 font-medium text-destructive">
          <CircleAlert aria-hidden="true" strokeWidth={1.5} className="size-3.5 shrink-0" />
          {labels?.failed ?? "Not sent"}
        </span>
      ) : null}
      {children}
    </div>
  );
}

export type MessageActionsProps = ComponentProps<typeof ToolbarPrimitive.Root> & {
  /** "hover" (default): shown when the message is hovered or holds focus, and always on touch screens. "always": always shown (the latest reply). */
  visible?: "hover" | "always";
};

/**
 * A toolbar of small actions on one message (copy, try again, rate). One Tab stop; Left and Right arrows move
 * between the buttons. It is in the page even when faint, so the keyboard reaches it, and it shows itself
 * on hover, on focus, and always where there is no hover. Name it with `aria-label`.
 */
export function MessageActions({ className, visible = "hover", "aria-label": ariaLabel = "Message actions", ...props }: MessageActionsProps) {
  return (
    <ToolbarPrimitive.Root
      data-slot="message-actions"
      aria-label={ariaLabel}
      className={cn(
        "-ms-2 flex max-w-full flex-wrap items-center gap-0.5 transition-opacity duration-instant ease-out group-data-[from=user]/message:ms-0 group-data-[from=user]/message:-me-2 motion-reduce:transition-none",
        visible === "hover" && "opacity-0 group-focus-within/message:opacity-100 group-hover/message:opacity-100 pointer-coarse:opacity-100",
        className,
      )}
      {...props}
    />
  );
}

export type MessageActionProps = ComponentProps<typeof ToolbarPrimitive.Button>;

/** One action: an icon button. It needs an `aria-label` ("Copy"), or visible text beside the icon. */
export function MessageAction({ className, ...props }: MessageActionProps) {
  return (
    <ToolbarPrimitive.Button
      data-slot="message-action"
      className={cn(
        "inline-flex h-control-sm min-w-(--control-h-sm) shrink-0 items-center justify-center gap-1.5 rounded-control px-2 text-sm text-muted-foreground transition-[background-color,color] duration-instant ease-out hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none pointer-coarse:h-control pointer-coarse:min-w-(--control-h) [&_svg]:size-4 [&_svg]:shrink-0",
        className,
      )}
      {...props}
    />
  );
}

/** Suggested replies under a message: a named group of chips that wrap. Name it with `aria-label`. */
export function MessageSuggestions({ className, "aria-label": ariaLabel = "Suggested replies", ...props }: ComponentProps<"div">) {
  return <div data-slot="message-suggestions" role="group" aria-label={ariaLabel} className={cn("flex max-w-full flex-wrap gap-2 pt-1", className)} {...props} />;
}

/** One suggested reply: a chip that is a button. Its text is what pressing it sends. */
export function MessageSuggestion({ variant = "soft", ...props }: ChipButtonProps) {
  return <ChipButton data-slot="message-suggestion" variant={variant} {...props} />;
}
