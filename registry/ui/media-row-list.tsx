"use client";
/**
 * @name media-row-list
 * @category ui
 * @description The pictures or clips a person has added, as rows they can put in order, describe and choose a cover from: each row shows its state in words (an upload's, or one the project names), its progress or its error with pause, resume and retry, a field for its text alternative that can be required, a "cover" choice, a remove button, and room for a status line and controls of the project's own.
 * @when After a dropzone, when the order of the files matters and each needs a description: the photos of a listing, the slides of a story, the pages of a document. It is ready-made from sortable-list (drag by the handle, lift and move with the keyboard, or the move buttons; every move is read out) and the upload rows of dropzone, and contains no upload engine: the project uploads and passes each row its state. For files whose order does not matter use the dropzone's own UploadList; to reorder things that are not files use sortable-list.
 * @example
 * const [rows, setRows] = useState<MediaRow[]>([
 *   { id: "a", name: "kitchen.jpg", size: 1_200_000, state: "done", alt: "The kitchen, from the door" },
 *   { id: "b", name: "garden.jpg", size: 2_400_000, state: "uploading", progress: 40 },
 *   { id: "c", name: "stairs.jpg", state: "failed", error: "The connection dropped." },
 * ]);
 * const [cover, setCover] = useState<string | null>("a");
 * <MediaRowList
 *   aria-label="Pictures, in order"
 *   items={rows}
 *   onItemsChange={setRows}
 *   cover={cover}
 *   onCoverChange={setCover}
 *   onAltChange={(id, alt) => setRows((all) => all.map((row) => (row.id === id ? { ...row, alt } : row)))}
 *   onRemove={(id) => setRows((all) => all.filter((row) => row.id !== id))}
 *   onRetry={(id) => upload(id)}
 * />
 *
 * // A state of the project's own, a status line, a control of its own, no cover choice, and a description that is required
 * const row: MediaRow = {
 *   id: "d", name: "walk.mp4", state: "checking", stateLabel: "Being checked", stateTone: "warning",
 *   status: "Usually takes a minute.", controls: <Button size="sm" variant="ghost">Trim</Button>,
 *   hideCover: true, altRequired: true, altError: "Say what the clip shows.",
 * };
 * <MediaRowList aria-label="Clips" items={[row]} variant="lines" onAltChange={describe} onPause={pause} onResume={resume} onDropped={({ values }) => save(values)} />
 */
import { CircleAlert } from "lucide-react";
import { useEffect, useId, useRef, type ComponentProps, type ReactNode } from "react";
import { UploadActions, UploadItem, UploadPause, UploadProgress, UploadRemove, UploadResume, UploadRetry, type UploadState, type UploadTone } from "@/components/ui/dropzone";
import { Input } from "@/components/ui/input";
import { SortableHandle, SortableItem, SortableList, SortableMoveButtons, type SortableDrop, type SortableMessages } from "@/components/ui/sortable-list";
import { announce } from "@/lib/announce";
import { cn } from "@/lib/cn";
import { useControllableState } from "@/lib/use-controllable-state";

/** One file, as plain data. */
export type MediaRow = {
  /** Unique among the rows. */
  id: string;
  /** The file's name: shown, and used in the names of the row's controls. */
  name: string;
  /** Its size in bytes. */
  size?: number;
  /** Where its upload is (a file that is already stored is "done"), or a state of the project's own ("checking", "published"): give that one a `stateLabel`. */
  state: UploadState | (string & {});
  /** The word for this row's state: it replaces the list's `stateLabels`. Needed for a state of the project's own. */
  stateLabel?: string;
  /** How the state reads: "neutral", "success", "warning" or "destructive", each with its own mark. Default: by the state. */
  stateTone?: UploadTone;
  /** How much has been sent, 0 to 100. The bar shows while the row is not "done". */
  progress?: number;
  /** Why it failed, in the project's words, shown after the state's word on a failed row (or one whose tone is "destructive"). */
  error?: ReactNode;
  /** A line of the row's own under its name and state: what is happening to it, or what it is waiting for. */
  status?: ReactNode;
  /** Controls of the project's own for this row (buttons, a menu), beside the cover choice. Name each after the file. */
  controls?: ReactNode;
  /** Leave the cover choice out of this row: a clip that cannot be a cover, a file still being checked. */
  hideCover?: boolean;
  /** The description must be given: the field says so in words and to a screen reader. */
  altRequired?: boolean;
  /** The description is not acceptable. Default: true when there is an `altError`. */
  altInvalid?: boolean;
  /** What is wrong with the description, in words the person can act on: shown under the field, tied to it, and read out when it appears. */
  altError?: string;
  /** A small picture of it (an `<img alt="">`: the name is beside it). */
  thumbnail?: ReactNode;
  /** Its text alternative: what the picture shows, for people who cannot see it. */
  alt?: string;
};

/** The words shown and read out. Translate them with the interface. */
export type MediaRowLabels = {
  /** The visible label of the text-alternative field. */
  alt: string;
  /** The field's name for a screen reader, which must tell the rows apart. */
  altFor: (name: string) => string;
  /** The hint inside an empty field. */
  altPlaceholder: string;
  /** The word after the field's label when a description must be given. */
  required: string;
  /** Read out when a description's error appears. */
  altErrorFor: (name: string, error: string) => string;
  /** The visible label of the cover choice. */
  cover: string;
  /** The choice's name for a screen reader. */
  coverFor: (name: string) => string;
  /** The words on the row that is the cover. */
  isCover: string;
  /** Read out when the cover changes. */
  coverChanged: (name: string) => string;
  retry: string;
  pause: string;
  resume: string;
  remove: string;
  /** Read out when a row is removed. */
  removed: (name: string) => string;
};

export const MEDIA_ROW_LABELS: MediaRowLabels = {
  alt: "Description",
  altFor: (name) => `Description of ${name}`,
  altPlaceholder: "What the picture shows",
  required: "required",
  altErrorFor: (name, error) => `${name}: ${error}`,
  cover: "Cover",
  coverFor: (name) => `Cover: ${name}`,
  isCover: "Cover picture",
  coverChanged: (name) => `${name} is now the cover.`,
  retry: "Try again",
  pause: "Pause",
  resume: "Resume",
  remove: "Remove",
  removed: (name) => `${name} removed.`,
};

export type MediaRowListProps = Omit<ComponentProps<"div">, "children" | "onChange" | "onPause"> & {
  /** The rows, in order. */
  items: readonly MediaRow[];
  /** The rows in their new order, after a move. */
  onItemsChange?: (items: MediaRow[]) => void;
  /** The ids in their new order, after a move (the same moment as `onItemsChange`). */
  onReorder?: (ids: string[]) => void;
  /** Called once when a move ends (a dragged row is let go, a lifted row is dropped, a move button is pressed), with the row, where it was, where it is and the new order: the place to save. */
  onDropped?: (drop: SortableDrop) => void;
  /** Take the row out. Left out, rows have no remove button. */
  onRemove?: (id: string) => void;
  /** Try a failed row again. Left out, failed rows have no retry button. */
  onRetry?: (id: string) => void;
  /** Pause a row that is "uploading". Left out, there is no pause button. */
  onPause?: (id: string) => void;
  /** Carry on a row that is "paused". Left out, there is no resume button. */
  onResume?: (id: string) => void;
  /** The text alternative was edited. Left out, rows have no description field. */
  onAltChange?: (id: string, alt: string) => void;
  /** The id of the cover row, or null for none: controlled. */
  cover?: string | null;
  /** The cover when uncontrolled. Default: none. */
  defaultCover?: string | null;
  /** Called with the new cover. When the cover row is removed, it is called with the first row left (or null). */
  onCoverChange?: (id: string | null) => void;
  /** Leave out the cover choice in every row. One row leaves it out with its own `hideCover`. */
  hideCover?: boolean;
  /** Every row's description must be given. One row says so with its own `altRequired`. */
  altRequired?: boolean;
  /** "cards" (default): each row a bordered surface. "lines": rows with a hairline between them and no box, for a list inside a card or a panel. */
  variant?: "cards" | "lines";
  /** Stops reordering and every control. */
  disabled?: boolean;
  /** The words, where the English defaults are not wanted. */
  labels?: Partial<MediaRowLabels>;
  /** The words of the reordering (lifted, moved, dropped, the handle and the move buttons). */
  sortableMessages?: Partial<SortableMessages>;
  /** The word for each upload state. */
  stateLabels?: Partial<Record<UploadState, string>>;
  /** For sizes and percentages. Default: the browser's. */
  locale?: string;
  /** Shown instead of the list when there are no rows. */
  empty?: ReactNode;
};

type AltFieldProps = {
  id: string;
  row: MediaRow;
  words: MediaRowLabels;
  required: boolean;
  disabled: boolean;
  onChange: (alt: string) => void;
};

/** The description field of one row: labelled, required or not, and with its error tied to it and read out when it appears. */
function AltField({ id, row, words, required, disabled, onChange }: AltFieldProps) {
  const error = row.altError?.trim() || undefined;
  const invalid = row.altInvalid ?? error !== undefined;
  const errorId = `${id}-error`;
  const { name } = row;
  const say = words.altErrorFor;
  // An error that arrives is said once. One that is already there when the row is first shown is not: a page that opens with ten of them would read ten.
  const said = useRef(error);
  useEffect(() => {
    if (said.current === error) return;
    said.current = error;
    if (error) announce(say(name, error));
  }, [error, name, say]);

  return (
    <div className="flex min-w-40 flex-1 flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {words.alt}
        {required ? <span data-slot="media-row-alt-required"> ({words.required})</span> : null}
      </label>
      <Input
        id={id}
        data-slot="media-row-alt"
        size="sm"
        dir="auto"
        autoComplete="off"
        aria-label={words.altFor(name)}
        aria-invalid={invalid || undefined}
        aria-describedby={error ? errorId : undefined}
        required={required}
        placeholder={words.altPlaceholder}
        value={row.alt ?? ""}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="pointer-coarse:h-control"
      />
      {error ? (
        <p id={errorId} data-slot="media-row-alt-error" className="flex items-start gap-1 text-xs text-destructive">
          <CircleAlert aria-hidden="true" strokeWidth={1.5} className="mt-0.5 size-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}

/**
 * An ordered list, so a row is read as "2 of 5". Name it with `aria-label` or `aria-labelledby`. The
 * cover choices are radio buttons that share one name: exactly one row can be the cover, Tab stops on the
 * chosen one and the arrow keys move the choice between rows, as in any radio group. A failed row cannot
 * be the cover. After a row is removed, focus goes to the row that took its place (or the one before, or
 * the list itself when it was the last), and the removal is read out. A row is a surface, with the
 * surface's corners at every roundness (never a pill), or a line with a hairline under it.
 */
export function MediaRowList({
  className,
  items,
  onItemsChange,
  onReorder,
  onDropped,
  onRemove,
  onRetry,
  onPause,
  onResume,
  onAltChange,
  cover,
  defaultCover = null,
  onCoverChange,
  hideCover = false,
  altRequired = false,
  variant = "cards",
  disabled = false,
  labels,
  sortableMessages,
  stateLabels,
  locale,
  empty,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  ...props
}: MediaRowListProps) {
  const words = { ...MEDIA_ROW_LABELS, ...labels };
  const group = useId();
  const root = useRef<HTMLDivElement>(null);
  const [chosen, setChosen] = useControllableState<string | null>({ value: cover, defaultValue: defaultCover, onChange: onCoverChange });
  const ids = items.map((item) => item.id);

  const reorder = (next: string[]): void => {
    onReorder?.(next);
    const byId = new Map(items.map((item) => [item.id, item]));
    onItemsChange?.(next.flatMap((id) => byId.get(id) ?? []));
  };

  const remove = (item: MediaRow): void => {
    const at = ids.indexOf(item.id);
    const neighbour = ids[at + 1] ?? ids[at - 1];
    if (chosen === item.id) setChosen(items.find((other) => other.id !== item.id && other.state !== "failed" && !other.hideCover)?.id ?? null);
    onRemove?.(item.id);
    announce(words.removed(item.name));
    // Once the row is gone, the keyboard's place is the row that took its place.
    requestAnimationFrame(() => {
      const box = root.current;
      if (!box) return;
      const row = neighbour === undefined ? null : [...box.querySelectorAll<HTMLElement>("[data-slot=media-row]")].find((node) => node.dataset["row"] === neighbour);
      (row?.querySelector<HTMLElement>("[data-slot=sortable-handle]:not(:disabled), [data-slot=upload-remove]") ?? box).focus();
    });
  };

  return (
    <div ref={root} data-slot="media-row-list" data-variant={variant} tabIndex={-1} className={cn("w-full min-w-0", className)} {...props}>
      {items.length === 0 && empty ? (
        <div data-slot="media-row-empty" className="text-sm text-muted-foreground">
          {empty}
        </div>
      ) : (
        <SortableList
          values={ids}
          onValuesChange={reorder}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          className={variant === "lines" ? "gap-0" : undefined}
          {...(onDropped ? { onDropped } : {})}
          {...(sortableMessages ? { messages: sortableMessages } : {})}
        >
          {items.map((item) => {
            const isCover = chosen === item.id;
            const failed = item.state === "failed";
            const showError = item.error !== undefined && (failed || item.stateTone === "destructive");
            const withCover = !hideCover && !item.hideCover;
            const altId = `${group}-alt-${item.id}`;
            return (
              <SortableItem
                key={item.id}
                value={item.id}
                label={item.name}
                data-slot="media-row"
                data-row={item.id}
                data-cover={isCover ? "" : undefined}
                // A row holds several lines: it takes the surface's corners, which stay corners when controls become pills.
                className={cn("items-start gap-1 p-2", variant === "lines" ? "rounded-none border-0 border-b bg-transparent px-0 last:border-b-0" : "rounded-surface")}
              >
                <SortableHandle className="mt-1" />
                <UploadItem
                  as="div"
                  name={item.name}
                  state={item.state}
                  className="min-w-0 flex-1 rounded-none border-0 bg-transparent p-1"
                  {...(item.stateLabel !== undefined ? { stateLabel: item.stateLabel } : {})}
                  {...(item.stateTone !== undefined ? { stateTone: item.stateTone } : {})}
                  {...(item.size !== undefined ? { size: item.size } : {})}
                  {...(item.thumbnail ? { thumbnail: item.thumbnail } : {})}
                  {...(stateLabels ? { stateLabels } : {})}
                  {...(locale ? { locale } : {})}
                  detail={
                    showError || isCover ? (
                      <>
                        {showError ? item.error : null}
                        {isCover ? (
                          <span data-slot="media-row-cover-mark" className="rounded-control border border-border-strong px-1.5 font-medium text-foreground">
                            {words.isCover}
                          </span>
                        ) : null}
                      </>
                    ) : undefined
                  }
                >
                  {item.state !== "done" && item.progress !== undefined ? <UploadProgress value={item.progress} /> : null}
                  <UploadActions className="self-start">
                    {item.state === "uploading" && onPause ? <UploadPause label={words.pause} disabled={disabled} onClick={() => onPause(item.id)} /> : null}
                    {item.state === "paused" && onResume ? <UploadResume label={words.resume} disabled={disabled} onClick={() => onResume(item.id)} /> : null}
                    {failed && onRetry ? <UploadRetry label={words.retry} disabled={disabled} onClick={() => onRetry(item.id)} /> : null}
                    {onRemove ? <UploadRemove label={words.remove} disabled={disabled} onClick={() => remove(item)} /> : null}
                  </UploadActions>
                  {item.status ? (
                    <p data-slot="media-row-status" className="col-span-full min-w-0 text-xs text-muted-foreground">
                      {item.status}
                    </p>
                  ) : null}
                  <div data-slot="media-row-details" className="col-span-full flex min-w-0 flex-wrap items-end gap-x-3 gap-y-2 pt-1">
                    {onAltChange ? <AltField id={altId} row={item} words={words} required={altRequired || item.altRequired === true} disabled={disabled} onChange={(alt) => onAltChange(item.id, alt)} /> : null}
                    <div className="ms-auto flex shrink-0 flex-wrap items-center justify-end gap-1">
                      {item.controls ? (
                        <div data-slot="media-row-controls" className="flex shrink-0 items-center gap-1">
                          {item.controls}
                        </div>
                      ) : null}
                      {withCover ? (
                        <label
                          data-slot="media-row-cover"
                          className={cn(
                            "inline-flex h-control-sm items-center gap-2 rounded-control px-2 text-sm text-foreground hover:bg-accent has-disabled:pointer-events-none has-disabled:opacity-50 pointer-coarse:h-control",
                            isCover && "font-medium",
                          )}
                        >
                          <input
                            type="radio"
                            name={`${group}-cover`}
                            value={item.id}
                            checked={isCover}
                            disabled={disabled || failed}
                            aria-label={words.coverFor(item.name)}
                            onChange={() => {
                              setChosen(item.id);
                              announce(words.coverChanged(item.name));
                            }}
                            className="size-4 shrink-0 accent-primary"
                          />
                          {words.cover}
                        </label>
                      ) : null}
                      <SortableMoveButtons className="ms-0" />
                    </div>
                  </div>
                </UploadItem>
              </SortableItem>
            );
          })}
        </SortableList>
      )}
    </div>
  );
}
