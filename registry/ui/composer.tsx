"use client";
/**
 * @name composer
 * @category ui
 * @description The box a person writes a message in: a field that grows with the text, a list of attachments, and a toolbar with slots for an attach button, a voice button and send (which becomes stop while a reply is on its way).
 * @when Under a thread, or anywhere a person sends free text to an assistant or to other people. It owns the text and the keys (Enter sends, Shift+Enter makes a new line, nothing is sent while an input method is composing); the project owns the files, the microphone and the sending. For one line with no attachments (a search box) use input-group; for a long form field use textarea.
 * @example
 * <Composer onSubmit={send} busy={replying} onStop={stop}>
 *   <ComposerAttachments aria-label="Attachments">
 *     {files.map((file) => (
 *       <ComposerAttachment key={file.name} onRemove={() => remove(file)} removeLabel={`Remove ${file.name}`}>{file.name}</ComposerAttachment>
 *     ))}
 *   </ComposerAttachments>
 *   <ComposerInput aria-label="Message" placeholder="Ask anything" />
 *   <ComposerToolbar>
 *     <ComposerAttachButton aria-label="Attach a file" onFiles={add} accept="image/*" multiple />
 *     <ComposerVoiceButton pressed={listening} onPressedChange={setListening} />
 *     <ComposerSubmit />
 *   </ComposerToolbar>
 * </Composer>
 */
import { Toggle as TogglePrimitive } from "radix-ui";
import { ArrowUp, AudioLines, Mic, Paperclip, Square } from "lucide-react";
import {
  createContext,
  use,
  useId,
  useLayoutEffect,
  useRef,
  type ChangeEvent,
  type ComponentProps,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { Chip, ChipRemove } from "@/components/ui/chip";
import { cn } from "@/lib/cn";
import { useControllableState } from "@/lib/use-controllable-state";

type ComposerContextValue = {
  value: string;
  setValue: (value: string) => void;
  disabled: boolean;
  busy: boolean;
  /** Whether there is something to send and sending is allowed. */
  canSubmit: boolean;
  submit: () => void;
  stop: () => void;
  inputRef: RefObject<HTMLTextAreaElement | null>;
};

const ComposerContext = createContext<ComposerContextValue | null>(null);

function useComposerContext(part: string): ComposerContextValue {
  const context = use(ComposerContext);
  if (!context) throw new Error(`<${part}> must be used inside <Composer>.`);
  return context;
}

/** The composer's text and actions, for a project's own part (a character count, a custom send control). */
export function useComposer(): Pick<ComposerContextValue, "value" | "setValue" | "disabled" | "busy" | "canSubmit" | "submit" | "stop"> {
  const { value, setValue, disabled, busy, canSubmit, submit, stop } = useComposerContext("useComposer");
  return { value, setValue, disabled, busy, canSubmit, submit, stop };
}

export type ComposerProps = Omit<ComponentProps<"form">, "onSubmit" | "defaultValue"> & {
  /** The controlled text. */
  value?: string;
  /** The starting text when uncontrolled. */
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Called with the trimmed text when the person sends. The field is then cleared (see `clearOnSubmit`) and takes focus again. */
  onSubmit?: (text: string) => void;
  /** A reply is on its way: send becomes stop, and Enter does not send. The person can keep typing. */
  busy?: boolean;
  /** Called when the person presses stop while `busy`. */
  onStop?: () => void;
  disabled?: boolean;
  /** Empty the field after sending. Default true. Turn it off to clear it yourself once the message is accepted. */
  clearOnSubmit?: boolean;
  /** Allow sending with no text: set it when there are attachments to send. */
  allowEmpty?: boolean;
};

/**
 * A form. It looks like one field: the border and the focus ring are on the frame, and the parts inside
 * have none of their own. After sending, focus goes back to the field, so the person can keep writing.
 */
export function Composer({
  className,
  value,
  defaultValue = "",
  onValueChange,
  onSubmit,
  busy = false,
  onStop,
  disabled = false,
  clearOnSubmit = true,
  allowEmpty = false,
  children,
  ...props
}: ComposerProps) {
  const [text, setText] = useControllableState({ value, defaultValue, onChange: onValueChange });
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const canSubmit = !disabled && !busy && (allowEmpty || text.trim() !== "");

  const submit = (): void => {
    if (!canSubmit) return;
    onSubmit?.(text.trim());
    if (clearOnSubmit) setText("");
    inputRef.current?.focus();
  };

  return (
    <ComposerContext value={{ value: text, setValue: setText, disabled, busy, canSubmit, submit, stop: () => onStop?.(), inputRef }}>
      <form
        data-slot="composer"
        data-busy={busy ? "" : undefined}
        data-disabled={disabled ? "" : undefined}
        aria-busy={busy || undefined}
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          submit();
        }}
        className={cn(
          "flex w-full min-w-0 flex-col gap-1 rounded-surface border border-input bg-background p-2 text-foreground has-[textarea:focus-visible]:outline-2 has-[textarea:focus-visible]:outline-offset-2 has-[textarea:focus-visible]:outline-ring data-[disabled]:opacity-50",
          className,
        )}
        {...props}
      >
        {children}
      </form>
    </ComposerContext>
  );
}

export type ComposerInputProps = Omit<ComponentProps<"textarea">, "value" | "defaultValue" | "rows"> & {
  /** The most lines it grows to before it scrolls inside. Default 8. */
  maxRows?: number;
  /** Enter sends (default). Turn it off where Enter should always make a new line; the send button still works. */
  submitOnEnter?: boolean;
};

/**
 * The field. It starts one line tall and grows with what is typed, up to `maxRows`, then scrolls.
 * `dir="auto"` lets a message in a right-to-left language read correctly whatever the page's direction.
 * Name it with `aria-label` (default "Message") or a label; a placeholder is not a name.
 */
export function ComposerInput({ className, maxRows = 8, submitOnEnter = true, onKeyDown, onChange, "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy, ...props }: ComposerInputProps) {
  const { value, setValue, disabled, canSubmit, submit, inputRef } = useComposerContext("ComposerInput");

  // Fit the height to the text. Read and written in one pass before paint, so the field never flickers.
  useLayoutEffect(() => {
    const field = inputRef.current;
    if (!field) return;
    const fit = (): void => {
      const style = getComputedStyle(field);
      const line = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.5;
      const frame = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom) + parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
      const limit = line * maxRows + frame;
      field.style.height = "auto";
      const wanted = field.scrollHeight + parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
      field.style.height = `${Math.min(wanted, limit)}px`;
      field.style.overflowY = wanted > limit ? "auto" : "hidden";
    };
    fit();
    if (typeof ResizeObserver === "undefined") return;
    // A narrower field wraps onto more lines.
    let width = field.clientWidth;
    const observer = new ResizeObserver(() => {
      if (field.clientWidth === width) return;
      width = field.clientWidth;
      fit();
    });
    observer.observe(field);
    return () => observer.disconnect();
  }, [value, maxRows, inputRef]);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    onKeyDown?.(event);
    if (event.defaultPrevented || event.key !== "Enter" || !submitOnEnter) return;
    // Enter that confirms a choice in an input method (Japanese, Chinese, Korean) is not "send". 229 is what older browsers report.
    if (event.shiftKey || event.altKey || event.nativeEvent.isComposing || event.keyCode === 229) return;
    event.preventDefault();
    if (canSubmit) submit();
  };

  return (
    <textarea
      ref={inputRef}
      data-slot="composer-input"
      dir="auto"
      rows={1}
      aria-label={ariaLabel ?? (ariaLabelledBy ? undefined : "Message")}
      aria-labelledby={ariaLabelledBy}
      enterKeyHint={submitOnEnter ? "send" : "enter"}
      disabled={disabled}
      value={value}
      onChange={(event: ChangeEvent<HTMLTextAreaElement>) => {
        onChange?.(event);
        setValue(event.target.value);
      }}
      onKeyDown={handleKeyDown}
      className={cn(
        "block w-full min-w-0 resize-none bg-transparent px-2 py-1.5 text-base leading-normal text-foreground outline-none placeholder:text-muted-foreground disabled:pointer-events-none",
        className,
      )}
      {...props}
    />
  );
}

/**
 * The files to be sent with the message, as a named list above the field. The project owns the files: it
 * renders one ComposerAttachment for each. Render it only when there is something in it (an empty list is
 * announced as "list, 0 items").
 */
export function ComposerAttachments({ className, "aria-label": ariaLabel = "Attachments", ...props }: ComponentProps<"ul">) {
  return <ul data-slot="composer-attachments" aria-label={ariaLabel} className={cn("flex max-w-full flex-wrap gap-2 px-1 pt-1 pb-1.5", className)} {...props} />;
}

export type ComposerAttachmentProps = ComponentProps<"li"> & {
  /** Removes this file. Leave it out for a file that cannot be removed. */
  onRemove?: () => void;
  /** The remove button's name: say which file ("Remove plan.pdf"). */
  removeLabel?: string;
};

/** One file: a chip with its name (and a small picture or icon before it, if you like) and a cross to remove it. */
export function ComposerAttachment({ className, onRemove, removeLabel = "Remove", children, ...props }: ComposerAttachmentProps) {
  const { inputRef } = useComposerContext("ComposerAttachment");
  return (
    <li data-slot="composer-attachment" className={cn("flex max-w-full min-w-0", className)} {...props}>
      <Chip variant="muted" className="min-w-0 shrink">
        <span className="inline-flex min-w-0 items-center gap-1.5 truncate">{children}</span>
        {onRemove ? (
          <ChipRemove
            aria-label={removeLabel}
            onClick={() => {
              onRemove();
              // The chip is about to go: keep focus in the composer.
              inputRef.current?.focus();
            }}
          />
        ) : null}
      </Chip>
    </li>
  );
}

/** The row under the field. Controls gather at the start; ComposerSubmit pushes itself to the end. */
export function ComposerToolbar({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="composer-toolbar" className={cn("flex min-w-0 items-center gap-1", className)} {...props} />;
}

const toolButton =
  "inline-flex size-(--control-h) shrink-0 items-center justify-center rounded-control text-muted-foreground transition-[background-color,color,opacity] duration-instant ease-out hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none [&_svg]:size-4 [&_svg]:shrink-0";

export type ComposerAttachButtonProps = Omit<ComponentProps<"button">, "type"> & {
  /** Given the files the person picked. When set, the button opens the device's file picker; when not, handle `onClick` and open your own. */
  onFiles?: (files: File[]) => void;
  /** File types the picker offers ("image/*,.pdf"). */
  accept?: string;
  /** Let the person pick several files. */
  multiple?: boolean;
};

/** Opens a file picker. An icon button, so it needs a name: `aria-label`, "Attach a file" by default. */
export function ComposerAttachButton({ className, children, onFiles, accept, multiple, onClick, disabled, "aria-label": ariaLabel = "Attach a file", ...props }: ComposerAttachButtonProps) {
  const context = useComposerContext("ComposerAttachButton");
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <button
        type="button"
        data-slot="composer-attach-button"
        aria-label={ariaLabel}
        disabled={disabled ?? context.disabled}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented && onFiles) fileRef.current?.click();
        }}
        className={cn(toolButton, className)}
        {...props}
      >
        {children ?? <Paperclip aria-hidden="true" strokeWidth={1.5} />}
      </button>
      {onFiles ? (
        <input
          ref={fileRef}
          type="file"
          hidden
          tabIndex={-1}
          aria-hidden="true"
          accept={accept}
          multiple={multiple}
          onChange={(event) => {
            const files = [...(event.target.files ?? [])];
            // Cleared, so that picking the same file again still reports a change.
            event.target.value = "";
            if (files.length > 0) onFiles(files);
          }}
        />
      ) : null}
    </>
  );
}

export type ComposerVoiceButtonProps = Omit<ComponentProps<typeof TogglePrimitive.Root>, "children"> & {
  /** The button's name. It stays the same in both states; the state is carried by `aria-pressed` and the words below. */
  label?: string;
  /** The state in words, for screen readers and beside the icon while listening. Translate them with the interface. */
  stateLabels?: { idle?: string; listening?: string };
  /** The icons for each state, when the defaults (a microphone, sound lines) are not wanted. */
  icons?: { idle?: ReactNode; listening?: ReactNode };
};

/**
 * A toggle for voice input. The project owns the microphone: this only shows and switches the state
 * (`pressed`, `defaultPressed`, `onPressedChange`). While listening it changes its ground, its icon and
 * shows the word, so the state is never carried by colour alone.
 */
export function ComposerVoiceButton({ className, label = "Voice input", stateLabels, icons, disabled, pressed, defaultPressed = false, onPressedChange, ...props }: ComposerVoiceButtonProps) {
  const context = useComposerContext("ComposerVoiceButton");
  const [listening, setListening] = useControllableState({ value: pressed, defaultValue: defaultPressed, onChange: onPressedChange });
  const stateId = useId();
  const state = listening ? (stateLabels?.listening ?? "Listening") : (stateLabels?.idle ?? "Not listening");
  return (
    <>
      <TogglePrimitive.Root
        data-slot="composer-voice-button"
        aria-label={label}
        aria-describedby={stateId}
        pressed={listening}
        onPressedChange={setListening}
        disabled={disabled ?? context.disabled}
        className={cn(toolButton, "data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:hover:opacity-90", className)}
        {...props}
      >
        {listening ? (icons?.listening ?? <AudioLines aria-hidden="true" strokeWidth={1.5} />) : (icons?.idle ?? <Mic aria-hidden="true" strokeWidth={1.5} />)}
      </TogglePrimitive.Root>
      <span id={stateId} data-slot="composer-voice-state" className={cn("truncate text-sm text-muted-foreground", !listening && "sr-only")}>
        {state}
      </span>
    </>
  );
}

export type ComposerSubmitProps = Omit<ComponentProps<"button">, "type" | "children"> & {
  /** The names of the two states. Translate them with the interface. */
  labels?: { send?: string; stop?: string };
  /** The icons of the two states. */
  icons?: { send?: ReactNode; stop?: ReactNode };
};

/**
 * Send, or stop while a reply is on its way. One button that changes its name and icon, so focus stays on
 * it through the change. Send is disabled while there is nothing to send.
 */
export function ComposerSubmit({ className, labels, icons, onClick, ...props }: ComposerSubmitProps) {
  const { busy, canSubmit, disabled, stop } = useComposerContext("ComposerSubmit");
  return (
    <button
      type={busy ? "button" : "submit"}
      data-slot="composer-submit"
      data-state={busy ? "stop" : "send"}
      aria-label={busy ? (labels?.stop ?? "Stop") : (labels?.send ?? "Send")}
      disabled={busy ? disabled : !canSubmit}
      onClick={(event) => {
        onClick?.(event);
        if (busy && !event.defaultPrevented) {
          event.preventDefault();
          stop();
        }
      }}
      className={cn(
        "ms-auto inline-flex size-(--control-h) shrink-0 items-center justify-center rounded-control bg-primary text-primary-foreground transition-[opacity,scale] duration-instant ease-out hover:opacity-90 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none motion-reduce:active:scale-100 [&_svg]:size-4 [&_svg]:shrink-0",
        className,
      )}
      {...props}
    >
      {busy ? (icons?.stop ?? <Square aria-hidden="true" strokeWidth={1.5} className="fill-current" />) : (icons?.send ?? <ArrowUp aria-hidden="true" strokeWidth={2} />)}
    </button>
  );
}
