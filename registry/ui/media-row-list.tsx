"use client";
/**
 * @name media-row-list
 * @category ui
 * @description The pictures or clips a person has added, as rows they can put in order, describe and choose a cover from: each row shows its upload progress or its error with a retry, a field for its text alternative, a "cover" choice and a remove button.
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
 */
import { useId, useRef, type ComponentProps, type ReactNode } from "react";
import { UploadActions, UploadItem, UploadProgress, UploadRemove, UploadRetry, type UploadState } from "@/components/ui/dropzone";
import { Input } from "@/components/ui/input";
import { SortableHandle, SortableItem, SortableList, SortableMoveButtons, type SortableMessages } from "@/components/ui/sortable-list";
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
  /** Where its upload is. A file that is already stored is "done". */
  state: UploadState;
  /** How much has been sent, 0 to 100. The bar shows while the row is not "done". */
  progress?: number;
  /** Why it failed, in the project's words, shown after "Failed". */
  error?: ReactNode;
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
  /** The visible label of the cover choice. */
  cover: string;
  /** The choice's name for a screen reader. */
  coverFor: (name: string) => string;
  /** The words on the row that is the cover. */
  isCover: string;
  /** Read out when the cover changes. */
  coverChanged: (name: string) => string;
  retry: string;
  remove: string;
  /** Read out when a row is removed. */
  removed: (name: string) => string;
};

export const MEDIA_ROW_LABELS: MediaRowLabels = {
  alt: "Description",
  altFor: (name) => `Description of ${name}`,
  altPlaceholder: "What the picture shows",
  cover: "Cover",
  coverFor: (name) => `Cover: ${name}`,
  isCover: "Cover picture",
  coverChanged: (name) => `${name} is now the cover.`,
  retry: "Try again",
  remove: "Remove",
  removed: (name) => `${name} removed.`,
};

export type MediaRowListProps = Omit<ComponentProps<"div">, "children" | "onChange"> & {
  /** The rows, in order. */
  items: readonly MediaRow[];
  /** The rows in their new order, after a move. */
  onItemsChange?: (items: MediaRow[]) => void;
  /** The ids in their new order, after a move (the same moment as `onItemsChange`). */
  onReorder?: (ids: string[]) => void;
  /** Take the row out. Left out, rows have no remove button. */
  onRemove?: (id: string) => void;
  /** Try a failed row again. Left out, failed rows have no retry button. */
  onRetry?: (id: string) => void;
  /** The text alternative was edited. Left out, rows have no description field. */
  onAltChange?: (id: string, alt: string) => void;
  /** The id of the cover row, or null for none: controlled. */
  cover?: string | null;
  /** The cover when uncontrolled. Default: none. */
  defaultCover?: string | null;
  /** Called with the new cover. When the cover row is removed, it is called with the first row left (or null). */
  onCoverChange?: (id: string | null) => void;
  /** Leave out the cover choice. */
  hideCover?: boolean;
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

/**
 * An ordered list, so a row is read as "2 of 5". Name it with `aria-label` or `aria-labelledby`. The
 * cover choices are radio buttons that share one name: exactly one row can be the cover, Tab stops on the
 * chosen one and the arrow keys move the choice between rows, as in any radio group. A failed row cannot
 * be the cover. After a row is removed, focus goes to the row that took its place (or the one before, or
 * the list itself when it was the last), and the removal is read out.
 */
export function MediaRowList({
  className,
  items,
  onItemsChange,
  onReorder,
  onRemove,
  onRetry,
  onAltChange,
  cover,
  defaultCover = null,
  onCoverChange,
  hideCover = false,
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
    if (chosen === item.id) setChosen(items.find((other) => other.id !== item.id && other.state !== "failed")?.id ?? null);
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
    <div ref={root} data-slot="media-row-list" tabIndex={-1} className={cn("w-full min-w-0", className)} {...props}>
      {items.length === 0 && empty ? (
        <div data-slot="media-row-empty" className="text-sm text-muted-foreground">
          {empty}
        </div>
      ) : (
        <SortableList values={ids} onValuesChange={reorder} disabled={disabled} aria-label={ariaLabel} aria-labelledby={ariaLabelledBy} {...(sortableMessages ? { messages: sortableMessages } : {})}>
          {items.map((item) => {
            const isCover = chosen === item.id;
            const failed = item.state === "failed";
            const altId = `${group}-alt-${item.id}`;
            return (
              <SortableItem key={item.id} value={item.id} label={item.name} data-slot="media-row" data-row={item.id} data-cover={isCover ? "" : undefined} className="items-start gap-1 p-2">
                <SortableHandle className="mt-1" />
                {/* The upload row is a list item of its own; inside a sortable row it is only layout. */}
                <ul role="presentation" className="min-w-0 flex-1">
                  <UploadItem
                    role="presentation"
                    name={item.name}
                    state={item.state}
                    className="border-0 bg-transparent p-1"
                    {...(item.size !== undefined ? { size: item.size } : {})}
                    {...(item.thumbnail ? { thumbnail: item.thumbnail } : {})}
                    {...(stateLabels ? { stateLabels } : {})}
                    {...(locale ? { locale } : {})}
                    detail={
                      failed || isCover ? (
                        <>
                          {failed ? item.error : null}
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
                      {failed && onRetry ? <UploadRetry label={words.retry} disabled={disabled} onClick={() => onRetry(item.id)} /> : null}
                      {onRemove ? <UploadRemove label={words.remove} disabled={disabled} onClick={() => remove(item)} /> : null}
                    </UploadActions>
                    <div data-slot="media-row-details" className="col-span-full flex min-w-0 flex-wrap items-end gap-x-3 gap-y-2 pt-1">
                      {onAltChange ? (
                        <div className="flex min-w-40 flex-1 flex-col gap-1">
                          <label htmlFor={altId} className="text-xs font-medium text-muted-foreground">
                            {words.alt}
                          </label>
                          <Input
                            id={altId}
                            data-slot="media-row-alt"
                            size="sm"
                            dir="auto"
                            autoComplete="off"
                            aria-label={words.altFor(item.name)}
                            placeholder={words.altPlaceholder}
                            value={item.alt ?? ""}
                            disabled={disabled}
                            onChange={(event) => onAltChange(item.id, event.target.value)}
                            className="pointer-coarse:h-control"
                          />
                        </div>
                      ) : null}
                      <div className="ms-auto flex shrink-0 items-center gap-1">
                        {hideCover ? null : (
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
                        )}
                        <SortableMoveButtons className="ms-0" />
                      </div>
                    </div>
                  </UploadItem>
                </ul>
              </SortableItem>
            );
          })}
        </SortableList>
      )}
    </div>
  );
}
