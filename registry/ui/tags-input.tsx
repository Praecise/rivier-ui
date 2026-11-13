"use client";
/**
 * @name tags-input
 * @category ui
 * @description A field that collects several short values as removable tags: typed and added with Enter or a comma, pasted as a list, picked from suggestions, removed by their button or with Backspace, each change said aloud.
 * @when Free-form lists of words: labels on a note, email addresses to invite, skills. For choosing from a fixed list use combobox or chips; for one value use input.
 * @example
 * <TagsInput aria-label="Labels" defaultValue={["urgent"]} suggestions={["design", "bug", "later"]} name="labels" />
 */
import { X } from "lucide-react";
import { useId, useRef, useState, type ComponentProps, type KeyboardEvent } from "react";
import { announce } from "@/lib/announce";
import { cn } from "@/lib/cn";
import { useControllableState } from "@/lib/use-controllable-state";

export type TagsInputLabels = {
  remove: (tag: string) => string;
  added: (tag: string) => string;
  removed: (tag: string) => string;
  rejected: (tag: string) => string;
  full: string;
  suggestions: string;
};

const LABELS: TagsInputLabels = {
  remove: (tag) => `Remove ${tag}`,
  added: (tag) => `${tag} added`,
  removed: (tag) => `${tag} removed`,
  rejected: (tag) => `${tag} cannot be added`,
  full: "No more can be added",
  suggestions: "Suggestions",
};

export type TagsInputProps = Omit<ComponentProps<"input">, "value" | "defaultValue" | "onChange" | "size"> & {
  value?: readonly string[];
  defaultValue?: readonly string[];
  onValueChange?: (value: readonly string[]) => void;
  /** Values offered as the person types; any other value can still be typed. */
  suggestions?: readonly string[];
  /** The most tags. */
  max?: number;
  /** Whether a typed value may be added: return false to refuse it (it is said as refused). */
  validate?: (tag: string) => boolean;
  /** Characters that end a tag as it is typed, besides Enter. Default [","]. */
  separators?: readonly string[];
  labels?: Partial<TagsInputLabels>;
};

export function TagsInput({
  value,
  defaultValue = [],
  onValueChange,
  suggestions = [],
  max,
  validate,
  separators = [","],
  labels: given,
  name,
  className,
  disabled,
  id,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  ...props
}: TagsInputProps) {
  const labels = { ...LABELS, ...given };
  const [tags, setTags] = useControllableState<readonly string[]>({ value, defaultValue, onChange: onValueChange });
  const [draft, setDraft] = useState("");
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const ownId = useId();
  const inputId = id ?? ownId;
  const open = draft.trim().length > 0;
  const matches = open ? suggestions.filter((s) => s.toLocaleLowerCase().includes(draft.trim().toLocaleLowerCase()) && !tags.includes(s)).slice(0, 8) : [];

  const add = (raw: string): void => {
    const parts = raw
      .split(new RegExp(`[${["\n", ...separators].map((s) => s.replace(/[-\\^\]]/g, "\\$&")).join("")}]`))
      .map((part) => part.trim())
      .filter(Boolean);
    let next = [...tags];
    for (const part of parts) {
      if (next.includes(part)) continue;
      if (max !== undefined && next.length >= max) {
        announce(labels.full);
        break;
      }
      if (validate && !validate(part)) {
        announce(labels.rejected(part), "assertive");
        continue;
      }
      next = [...next, part];
      announce(labels.added(part));
    }
    setTags(next);
    setDraft("");
    setActive(-1);
  };
  const remove = (tag: string): void => {
    setTags(tags.filter((t) => t !== tag));
    announce(labels.removed(tag));
    inputRef.current?.focus();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "ArrowDown" && matches.length > 0) {
      event.preventDefault();
      setActive((a) => (a + 1) % matches.length);
    } else if (event.key === "ArrowUp" && matches.length > 0) {
      event.preventDefault();
      setActive((a) => (a <= 0 ? matches.length - 1 : a - 1));
    } else if (event.key === "Enter") {
      if (!draft.trim() && active < 0) return;
      event.preventDefault();
      add(active >= 0 ? (matches[active] ?? draft) : draft);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      setDraft("");
      setActive(-1);
    } else if (event.key === "Backspace" && draft === "" && tags.length > 0) {
      event.preventDefault();
      const last = tags[tags.length - 1];
      if (last) remove(last);
    }
  };

  return (
    <div data-slot="tags-input" className={cn("relative w-full min-w-0", className)}>
      <div
        className={cn(
          "flex min-h-(--control-h) w-full flex-wrap items-center gap-1.5 rounded-control border border-input bg-background px-2 py-1.5 text-sm focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <ul className="contents" aria-label={ariaLabel}>
          {tags.map((tag) => (
            <li key={tag} data-slot="tags-input-tag" className="inline-flex max-w-full items-center gap-1 rounded-control bg-muted ps-2 text-sm">
              <span className="truncate" dir="auto">
                {tag}
              </span>
              <button
                type="button"
                aria-label={labels.remove(tag)}
                disabled={disabled}
                onClick={(event) => {
                  event.stopPropagation();
                  remove(tag);
                }}
                className="flex size-7 items-center justify-center rounded-control text-muted-foreground hover:bg-accent hover:text-foreground pointer-coarse:size-9"
              >
                <X aria-hidden="true" className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
        <input
          ref={inputRef}
          id={inputId}
          role="combobox"
          aria-expanded={matches.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          value={draft}
          disabled={disabled}
          onChange={(event) => {
            const text = event.target.value;
            if (separators.some((s) => text.endsWith(s))) add(text);
            else {
              setDraft(text);
              setActive(-1);
            }
          }}
          onPaste={(event) => {
            const text = event.clipboardData.getData("text");
            if (/[\n,]/.test(text)) {
              event.preventDefault();
              add(text);
            }
          }}
          onBlur={() => {
            if (draft.trim()) add(draft);
          }}
          onKeyDown={onKeyDown}
          className="h-7 min-w-24 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
          {...props}
        />
      </div>
      <ul
        id={listId}
        role="listbox"
        aria-label={labels.suggestions}
        hidden={matches.length === 0}
        className="absolute inset-x-0 top-full z-50 mt-1 max-h-60 overflow-auto rounded-surface border bg-popover p-1 text-sm"
      >
        {matches.map((match, index) => (
          <li
            key={match}
            id={`${listId}-${index}`}
            role="option"
            aria-selected={index === active}
            onPointerDown={(event) => {
              event.preventDefault();
              add(match);
            }}
            className={cn("cursor-pointer rounded-control px-2 py-2", index === active && "bg-accent")}
          >
            {match}
          </li>
        ))}
      </ul>
      {name ? tags.map((tag) => <input key={tag} type="hidden" name={name} value={tag} />) : null}
    </div>
  );
}
