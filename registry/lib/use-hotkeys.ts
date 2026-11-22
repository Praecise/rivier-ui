"use client";
/**
 * @name use-hotkeys
 * @category lib
 * @description Binds keyboard shortcuts ("mod+k", "shift+?", "g i") to handlers on the page or on one element, by the key's place for letters so they work on keyboards of every script, left alone while typing in a field; and formats a shortcut for showing ("⌘K" on Apple, "Ctrl+K" elsewhere).
 * @when Shortcuts for frequent actions: opening command, saving, moving between items. Show each one where its action is (kbd, a menu's shortcut slot) and keep a list of them. Do not take keys a screen reader or the browser uses (single letters without a modifier only inside a focused widget; never Tab or the arrows on the page).
 * @example
 * useHotkeys("mod+k", () => setOpen(true));
 * useHotkeys("g i", () => router.push("/inbox"), { sequenceTimeout: 800 });
 * <Kbd>{formatHotkey("mod+k")}</Kbd>
 */
import { useEffect, useRef, type RefObject } from "react";

export type HotkeyOptions = {
  /** Default true. */
  enabled?: boolean;
  /** Listen on this element only (and what is inside it) instead of the whole page. */
  target?: RefObject<HTMLElement | null>;
  /** Fire while focus is in a text field. Default false: typing is never taken over. */
  inInputs?: boolean;
  /** Default true. */
  preventDefault?: boolean;
  /** The longest pause between the keys of a sequence ("g i"), in milliseconds. Default 1000. */
  sequenceTimeout?: number;
};

type Chord = { key: string; mod: boolean; ctrl: boolean; meta: boolean; alt: boolean; shift: boolean };

const isApple = (): boolean => typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);

function parseChord(text: string): Chord {
  const parts = text.toLowerCase().split("+").map((p) => p.trim());
  const key = parts.pop() ?? "";
  return { key, mod: parts.includes("mod"), ctrl: parts.includes("ctrl"), meta: parts.includes("meta") || parts.includes("cmd"), alt: parts.includes("alt") || parts.includes("option"), shift: parts.includes("shift") };
}

/** The key of an event as the binding names it: letters and digits by their place (event.code), so "k" is the same key on any layout. */
function keyOf(event: KeyboardEvent): string {
  const code = event.code;
  if (/^Key[A-Z]$/.test(code)) return code.slice(3).toLowerCase();
  if (/^Digit\d$/.test(code)) return code.slice(5);
  return event.key.toLowerCase();
}

function matches(chord: Chord, event: KeyboardEvent): boolean {
  const apple = isApple();
  const wantCtrl = chord.ctrl || (chord.mod && !apple);
  const wantMeta = chord.meta || (chord.mod && apple);
  // A shifted symbol ("?") is matched by its own key; shift is then implied.
  const symbol = chord.key.length === 1 && !/[a-z0-9]/.test(chord.key);
  const key = symbol ? event.key.toLowerCase() : keyOf(event);
  return key === chord.key && event.ctrlKey === wantCtrl && event.metaKey === wantMeta && event.altKey === chord.alt && (symbol || event.shiftKey === chord.shift);
}

const typing = (target: EventTarget | null): boolean => {
  const element = target as HTMLElement | null;
  if (!element) return false;
  return element.isContentEditable || /^(input|textarea|select)$/i.test(element.tagName);
};

/** Calls `handler` when the shortcut is pressed. A space separates the keys of a sequence: "g i". */
export function useHotkeys(binding: string, handler: (event: KeyboardEvent) => void, options: HotkeyOptions = {}): void {
  const { enabled = true, target, inInputs = false, preventDefault = true, sequenceTimeout = 1000 } = options;
  const latest = useRef(handler);
  useEffect(() => {
    latest.current = handler;
  });
  useEffect(() => {
    if (!enabled) return;
    const steps = binding.split(" ").filter(Boolean).map(parseChord);
    let position = 0;
    let last = 0;
    const node: HTMLElement | Document = target?.current ?? document;
    const listener = (event: Event): void => {
      const key = event as KeyboardEvent;
      if (key.repeat || (!inInputs && typing(key.target))) return;
      if (position > 0 && key.timeStamp - last > sequenceTimeout) position = 0;
      const step = steps[position];
      if (step && matches(step, key)) {
        position += 1;
        last = key.timeStamp;
        if (position === steps.length) {
          position = 0;
          if (preventDefault) key.preventDefault();
          latest.current(key);
        }
      } else if (!["Shift", "Control", "Alt", "Meta"].includes(key.key)) {
        position = steps[0] && matches(steps[0], key) ? 1 : 0;
        last = key.timeStamp;
      }
    };
    node.addEventListener("keydown", listener);
    return () => node.removeEventListener("keydown", listener);
  }, [binding, enabled, target, inInputs, preventDefault, sequenceTimeout]);
}

/** A shortcut as people read it: "⌘K" on Apple systems, "Ctrl+K" elsewhere; a sequence as "G then I". */
export function formatHotkey(binding: string, words: { then: string } = { then: "then" }): string {
  const apple = isApple();
  return binding
    .split(" ")
    .filter(Boolean)
    .map((chord) => {
      const parts = chord.split("+").map((p) => p.trim().toLowerCase());
      const key = parts.pop() ?? "";
      const names = parts.map((p) => (p === "mod" ? (apple ? "⌘" : "Ctrl") : p === "meta" || p === "cmd" ? (apple ? "⌘" : "Win") : p === "ctrl" ? (apple ? "⌃" : "Ctrl") : p === "alt" || p === "option" ? (apple ? "⌥" : "Alt") : p === "shift" ? (apple ? "⇧" : "Shift") : p));
      const shown = key.length === 1 ? key.toUpperCase() : key[0]?.toUpperCase() + key.slice(1);
      return apple ? [...names, shown].join("") : [...names, shown].join("+");
    })
    .join(` ${words.then} `);
}
