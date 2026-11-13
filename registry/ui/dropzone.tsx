"use client";
/**
 * @name dropzone
 * @category ui
 * @description A place to choose files to upload, by dropping them, pasting them or pressing a button, and the rows that show each file's progress with slots for pause, resume, retry and remove.
 * @when Adding pictures, documents or other files where progress matters: a listing's photos, attachments, an import. It contains no upload engine: the project uploads (plain, or resumable such as tus) and tells each row its state and progress. For one small file in a form, an input with type="file" is enough. Name the dropzone with `aria-label` or `aria-labelledby`, and word rejected files yourself from the reason given to `onReject`.
 * @example
 * <Dropzone accept="image/*" maxSize={10_000_000} onFiles={start} onReject={explain} aria-label="Add pictures">
 *   <DropzoneHint>Drop pictures here, or</DropzoneHint>
 *   <DropzoneButton>Choose pictures</DropzoneButton>
 * </Dropzone>
 * <UploadList aria-label="Pictures being added">
 *   {uploads.map((upload) => (
 *     <UploadItem key={upload.id} name={upload.file.name} size={upload.file.size} state={upload.state}>
 *       <UploadProgress value={upload.percent} />
 *       <UploadActions>
 *         {upload.state === "uploading" ? <UploadPause onClick={() => pause(upload.id)} /> : null}
 *         {upload.state === "paused" ? <UploadResume onClick={() => resume(upload.id)} /> : null}
 *         {upload.state === "failed" ? <UploadRetry onClick={() => retry(upload.id)} /> : null}
 *         <UploadRemove onClick={() => remove(upload.id)} />
 *       </UploadActions>
 *     </UploadItem>
 *   ))}
 * </UploadList>
 *
 * // A state of the project's own, with its word and tone; and a row that is not a list item
 * <UploadItem as="div" name="walk.mp4" state="checking" stateLabel="Being checked" stateTone="warning" />
 */
import { CircleAlert, CircleCheck, CircleDashed, Clock, File as FileIcon, Pause, Play, RotateCw, TriangleAlert, Upload, X } from "lucide-react";
import {
  createContext,
  use,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type ComponentProps,
  type ComponentType,
  type DragEvent,
  type ReactNode,
} from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { announce } from "@/lib/announce";
import { cn } from "@/lib/cn";

/** Why a file was not taken: its type is not in `accept`, it is larger than `maxSize`, or it is beyond `maxFiles`. */
export type FileRejectionReason = "type" | "size" | "count";
export type FileRejection = { file: File; reason: FileRejectionReason };

type DropzoneContextValue = { open: () => void; dragging: boolean; disabled: boolean };

const DropzoneContext = createContext<DropzoneContextValue | null>(null);

function useDropzone(part: string): DropzoneContextValue {
  const context = use(DropzoneContext);
  if (!context) throw new Error(`<${part}> must be used inside <Dropzone>.`);
  return context;
}

/** Whether a file matches an `accept` list as the browser reads it: ".png", "image/*", "application/pdf". */
function accepts(file: File, accept: string | undefined): boolean {
  if (!accept || accept.trim() === "") return true;
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return accept
    .split(",")
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean)
    .some((token) => (token.startsWith(".") ? name.endsWith(token) : token.endsWith("/*") ? type.startsWith(token.slice(0, -1)) : type === token));
}

export type DropzoneProps = Omit<ComponentProps<"div">, "onDrop"> & {
  /** The types taken, as for a file input: "image/*,.pdf". */
  accept?: string;
  /** The largest file taken, in bytes. */
  maxSize?: number;
  /** The most files taken in one go. The project counts what it already holds and passes what is left. */
  maxFiles?: number;
  /** Take more than one file at a time. Default true. */
  multiple?: boolean;
  disabled?: boolean;
  /** The files that passed, each time some are dropped, pasted or chosen. */
  onFiles?: (files: File[]) => void;
  /** The files that did not pass, each with the reason, for the project to say in its own words. */
  onReject?: (rejections: FileRejection[]) => void;
};

/**
 * The region. Files arrive three ways, all through the same rules: dropped on it, pasted while focus is
 * inside it, or chosen in the file dialog its DropzoneButton opens (the way that works by keyboard and
 * screen reader, so always include one). While files are dragged over it, it changes its look and its
 * DropzoneHint changes its words.
 */
export function Dropzone({ accept, maxSize, maxFiles, multiple = true, disabled = false, onFiles, onReject, className, children, onPaste, ...props }: DropzoneProps) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  /** dragenter and dragleave fire for every child crossed: only the outermost pair counts. */
  const depth = useRef(0);

  const take = (list: FileList | null | undefined): void => {
    if (disabled || !list || list.length === 0) return;
    const accepted: File[] = [];
    const rejected: FileRejection[] = [];
    const limit = multiple ? (maxFiles ?? Number.POSITIVE_INFINITY) : 1;
    for (const file of list) {
      if (!accepts(file, accept)) rejected.push({ file, reason: "type" });
      else if (maxSize !== undefined && file.size > maxSize) rejected.push({ file, reason: "size" });
      else if (accepted.length >= limit) rejected.push({ file, reason: "count" });
      else accepted.push(file);
    }
    if (accepted.length > 0) onFiles?.(accepted);
    if (rejected.length > 0) onReject?.(rejected);
  };

  const hasFiles = (event: DragEvent): boolean => event.dataTransfer.types.includes("Files");

  return (
    <DropzoneContext value={{ open: () => input.current?.click(), dragging, disabled }}>
      <div
        data-slot="dropzone"
        data-dragging={dragging ? "" : undefined}
        data-disabled={disabled ? "" : undefined}
        role="group"
        onDragEnter={(event) => {
          if (disabled || !hasFiles(event)) return;
          depth.current += 1;
          setDragging(true);
        }}
        onDragOver={(event) => {
          // Without this the browser opens the file instead of handing it over.
          if (!disabled && hasFiles(event)) event.preventDefault();
        }}
        onDragLeave={(event) => {
          if (disabled || !hasFiles(event)) return;
          depth.current = Math.max(0, depth.current - 1);
          if (depth.current === 0) setDragging(false);
        }}
        onDrop={(event) => {
          if (disabled || !hasFiles(event)) return;
          event.preventDefault();
          depth.current = 0;
          setDragging(false);
          take(event.dataTransfer.files);
        }}
        onPaste={(event: ClipboardEvent<HTMLDivElement>) => {
          onPaste?.(event);
          if (event.defaultPrevented || event.clipboardData.files.length === 0) return;
          event.preventDefault();
          take(event.clipboardData.files);
        }}
        className={cn(
          "flex w-full min-w-0 flex-col items-center justify-center gap-3 rounded-surface border border-dashed border-border-strong bg-background p-6 text-center text-sm transition-[background-color,border-color] duration-instant ease-out data-[disabled]:opacity-50 data-[dragging]:border-solid data-[dragging]:border-primary data-[dragging]:bg-highlight-soft motion-reduce:transition-none",
          className,
        )}
        {...props}
      >
        {children}
        <input
          ref={input}
          data-slot="dropzone-input"
          type="file"
          hidden
          tabIndex={-1}
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onChange={(event) => {
            take(event.target.files);
            // Cleared so that choosing the same file again is still a change.
            event.target.value = "";
          }}
        />
      </div>
    </DropzoneContext>
  );
}

/** The button that opens the file dialog. A real button, so it works by keyboard, switch and screen reader. */
export function DropzoneButton({ children, variant = "outline", onClick, disabled, ...props }: ButtonProps) {
  const context = useDropzone("DropzoneButton");
  return (
    <Button
      data-slot="dropzone-button"
      variant={variant}
      disabled={disabled || context.disabled}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) context.open();
      }}
      {...props}
    >
      <Upload aria-hidden="true" strokeWidth={1.5} />
      {children}
    </Button>
  );
}

export type DropzoneHintProps = ComponentProps<"p"> & {
  /** The words shown in its place while files are dragged over the dropzone. Default "Drop the files to add them". */
  draggingText?: ReactNode;
};

/** The line that says what to do, and what may be added (types, largest size). It changes its words while files are over the dropzone. */
export function DropzoneHint({ className, children, draggingText = "Drop the files to add them", ...props }: DropzoneHintProps) {
  const { dragging } = useDropzone("DropzoneHint");
  return (
    <p data-slot="dropzone-hint" className={cn("max-w-prose text-muted-foreground", dragging && "font-medium text-foreground", className)} {...props}>
      {dragging ? draggingText : children}
    </p>
  );
}

/** A size in bytes as people read it ("3.4 MB"), in the locale's digits and unit names. */
export function formatFileSize(bytes: number, locale?: string): string {
  const units = ["byte", "kilobyte", "megabyte", "gigabyte", "terabyte"] as const;
  let value = Math.max(0, bytes);
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit += 1;
  }
  return new Intl.NumberFormat(locale, { style: "unit", unit: units[unit], unitDisplay: "short", maximumFractionDigits: unit === 0 || value >= 100 ? 0 : 1 }).format(value);
}

export type UploadState = "queued" | "uploading" | "paused" | "done" | "failed";

/** How a state reads: plain, good news, something to look at, or a failure. Each has its own mark as well as its colour. */
export type UploadTone = "neutral" | "success" | "warning" | "destructive";

type Mark = ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: "true" }>;

const STATE_WORDS: Record<UploadState, string> = { queued: "Waiting", uploading: "Uploading", paused: "Paused", done: "Uploaded", failed: "Failed" };
const STATE_ICONS: Record<UploadState, Mark> = {
  queued: Clock,
  uploading: Upload,
  paused: Pause,
  done: CircleCheck,
  failed: CircleAlert,
};
const STATE_TONES: Record<UploadState, UploadTone> = { queued: "neutral", uploading: "neutral", paused: "neutral", done: "success", failed: "destructive" };
/** The mark of a state the project names itself, by its tone. */
const TONE_ICONS: Record<UploadTone, Mark> = { neutral: CircleDashed, success: CircleCheck, warning: TriangleAlert, destructive: CircleAlert };
const TONE_CLASSES: Record<UploadTone, string> = { neutral: "", success: "text-success", warning: "text-warning", destructive: "text-destructive" };

const isUploadState = (state: string): state is UploadState => state in STATE_WORDS;

const UploadItemContext = createContext<{ name: string; state: string; locale: string | undefined } | null>(null);

function useUploadItem(part: string): { name: string; state: string; locale: string | undefined } {
  const context = use(UploadItemContext);
  if (!context) throw new Error(`<${part}> must be used inside <UploadItem>.`);
  return context;
}

/** The list of files chosen. Name it with `aria-label` ("Files being added"). */
export function UploadList({ className, ...props }: ComponentProps<"ul">) {
  return <ul data-slot="upload-list" className={cn("flex w-full min-w-0 flex-col gap-2", className)} {...props} />;
}

export type UploadItemProps = Omit<ComponentProps<"li">, "children"> & {
  /** The element the row is. "li" (default) inside an UploadList; "div" where the row is not an item of a list of its own (inside another list's row, or alone). */
  as?: "li" | "div";
  /** The file's name. */
  name: string;
  /** Its size in bytes. */
  size?: number;
  /** One of the five upload states, or a state of the project's own ("checking", "published"): give that one a `stateLabel`. */
  state: UploadState | (string & {});
  /** The word for each state, to translate or reword. Defaults: Waiting, Uploading, Paused, Uploaded, Failed. */
  stateLabels?: Partial<Record<UploadState, string>>;
  /** The word for this row's state, whatever it is: it replaces the one from `stateLabels`. Needed for a state of the project's own. */
  stateLabel?: string;
  /** How this row's state reads. Default: by the state ("done" is success, "failed" is destructive, anything else neutral). */
  stateTone?: UploadTone;
  /** The mark beside the word, in place of the one the state or the tone gives (an icon, `aria-hidden`). */
  stateIcon?: ReactNode;
  /** More about the state, after its word: why it failed, what is left. */
  detail?: ReactNode;
  /** A small picture of the file. Without one, a file mark is shown. */
  thumbnail?: ReactNode;
  /** For the size and the percentage. Default: the browser's. */
  locale?: string;
  /** Say "name: Uploaded" or "name: Failed" to screen readers when the row reaches that state (or a state of the project's own whose tone is success or destructive). Default true. */
  announceChanges?: boolean;
  /** UploadProgress and UploadActions. */
  children?: ReactNode;
};

/**
 * One file: a picture or mark, its name, its state in words with a mark (never colour alone), its size,
 * then its progress and its buttons. Reaching "done" or "failed" is announced once; progress on the way is
 * not, because a screen reader would read every step. The state may be one of the project's own, with the
 * word and the tone it gives.
 */
export function UploadItem({ as = "li", name, size, state, stateLabels, stateLabel, stateTone, stateIcon, detail, thumbnail, locale, announceChanges = true, className, children, ...props }: UploadItemProps) {
  // One set of props for either element: a list item and a div take the same attributes here.
  const Row = as as "div";
  const known = isUploadState(state);
  const word = stateLabel ?? (known ? (stateLabels?.[state] ?? STATE_WORDS[state]) : state);
  const tone = stateTone ?? (known ? STATE_TONES[state] : "neutral");
  // A known state keeps its own mark unless the project gives it another tone.
  const Mark = known && stateTone === undefined ? STATE_ICONS[state] : TONE_ICONS[tone];
  const final = known ? state === "done" || state === "failed" : tone === "success" || tone === "destructive";
  const previous = useRef(state);
  useEffect(() => {
    if (previous.current === state) return;
    previous.current = state;
    if (announceChanges && final) announce(`${name}: ${word}`);
  }, [state, name, word, announceChanges, final]);

  return (
    <UploadItemContext value={{ name, state, locale }}>
      <Row
        data-slot="upload-item"
        data-state={state}
        data-tone={tone}
        className={cn("grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 rounded-control border bg-card p-3 text-sm data-[tone=destructive]:border-destructive", className)}
        {...(props as ComponentProps<"div">)}
      >
        <span
          data-slot="upload-thumbnail"
          aria-hidden={thumbnail ? undefined : "true"}
          className="row-span-2 flex size-10 shrink-0 items-center justify-center self-start overflow-hidden rounded-control bg-muted text-muted-foreground [&_img]:size-full [&_img]:object-cover [&_svg]:size-4"
        >
          {thumbnail ?? <FileIcon aria-hidden="true" strokeWidth={1.5} />}
        </span>
        <div className="col-start-2 min-w-0">
          <p data-slot="upload-name" className="truncate font-medium">
            {/* Isolated: a name in another script keeps its own direction without moving the row. */}
            <bdi>{name}</bdi>
          </p>
          <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
            <span data-slot="upload-state" className={cn("inline-flex items-center gap-1 [&_svg]:size-3.5 [&_svg]:shrink-0", TONE_CLASSES[tone])}>
              {stateIcon ?? <Mark aria-hidden="true" strokeWidth={1.5} />}
              {word}
            </span>
            {detail ? <span data-slot="upload-detail">{detail}</span> : null}
            {size !== undefined ? <bdi data-slot="upload-size">{formatFileSize(size, locale)}</bdi> : null}
          </p>
        </div>
        {children}
      </Row>
    </UploadItemContext>
  );
}

export type UploadProgressProps = Omit<ComponentProps<typeof Progress>, "value" | "max"> & {
  /** How much has been sent, from 0 to 100. A paused or failed resumable upload keeps the value it reached. */
  value: number;
};

/**
 * The row's bar, with the percentage beside it in figures. The bar is named after the file and says the
 * percentage, so a screen reader can ask for it; it is not a live region.
 */
export function UploadProgress({ value, className, "aria-label": ariaLabel, ...props }: UploadProgressProps) {
  const { name, locale } = useUploadItem("UploadProgress");
  const percent = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }).format(Math.min(100, Math.max(0, value)) / 100);
  return (
    <div data-slot="upload-progress" className={cn("col-start-2 row-start-2 flex min-w-0 items-center gap-2", className)}>
      <Progress size="sm" value={Math.min(100, Math.max(0, value))} max={100} aria-label={ariaLabel ?? name} getValueLabel={() => percent} {...props} />
      <span aria-hidden="true" className="w-10 shrink-0 text-end text-xs text-muted-foreground tabular-nums">
        {percent}
      </span>
    </div>
  );
}

/** Holds the row's buttons at its end. */
export function UploadActions({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="upload-actions" className={cn("col-start-3 row-span-2 row-start-1 flex shrink-0 items-center self-center", className)} {...props} />;
}

export type UploadActionProps = Omit<ComponentProps<"button">, "type"> & {
  /** The verb, joined to the file's name for the button's accessible name ("Pause: plan.pdf"). An `aria-label` replaces the whole name. */
  label?: string;
};

function UploadAction({ label, className, children, "aria-label": ariaLabel, ...props }: UploadActionProps & { label: string }) {
  const { name } = useUploadItem("UploadAction");
  return (
    <button
      type="button"
      aria-label={ariaLabel ?? `${label}: ${name}`}
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-control text-muted-foreground transition-[background-color,color] duration-instant ease-out hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none pointer-coarse:size-10 [&_svg]:size-4",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/** Pauses a resumable upload. The project decides what pausing means; the row keeps its progress. */
export function UploadPause({ label = "Pause", children, ...props }: UploadActionProps) {
  return (
    <UploadAction data-slot="upload-pause" label={label} {...props}>
      {children ?? <Pause aria-hidden="true" strokeWidth={1.5} />}
    </UploadAction>
  );
}

/** Carries on a paused upload from where it stopped. */
export function UploadResume({ label = "Resume", children, ...props }: UploadActionProps) {
  return (
    <UploadAction data-slot="upload-resume" label={label} {...props}>
      {children ?? <Play aria-hidden="true" strokeWidth={1.5} />}
    </UploadAction>
  );
}

/** Tries a failed upload again. */
export function UploadRetry({ label = "Try again", children, ...props }: UploadActionProps) {
  return (
    <UploadAction data-slot="upload-retry" label={label} {...props}>
      {children ?? <RotateCw aria-hidden="true" strokeWidth={1.5} />}
    </UploadAction>
  );
}

/** Takes the file off the list, cancelling it if it is on its way. Move focus to a neighbouring row or to the dropzone's button afterwards. */
export function UploadRemove({ label = "Remove", children, ...props }: UploadActionProps) {
  return (
    <UploadAction data-slot="upload-remove" label={label} {...props}>
      {children ?? <X aria-hidden="true" strokeWidth={1.5} />}
    </UploadAction>
  );
}
