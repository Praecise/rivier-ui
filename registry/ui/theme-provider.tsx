"use client";
/**
 * @name theme-provider
 * @category ui
 * @description Holds the theme (light or dark, roundness, highlight colour), applies it to the page, remembers the visitor's choice, and avoids a flash of the wrong theme.
 * @when Once, around the app in the root layout, when visitors or the product can change the theme. For a fixed theme, skip it and set the attributes on <html> by hand.
 * @example
 * // app/layout.tsx
 * <html lang="en" suppressHydrationWarning>
 *   <head><ThemeScript defaults={{ mode: "system", radius: "md", accent: "blue" }} /></head>
 *   <body>
 *     <ThemeProvider defaults={{ mode: "system", radius: "md", accent: "blue" }}>{children}</ThemeProvider>
 *   </body>
 * </html>
 *
 * // anywhere below
 * const { theme, setTheme } = useTheme();
 * setTheme({ mode: "dark" });
 * setTheme({ accent: { hue: 262, chroma: 0.19 } });
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";

export const THEME_MODES = ["light", "dark", "system"] as const;
export const THEME_RADII = ["none", "sm", "md", "lg", "full"] as const;
export const THEME_ACCENTS = ["teal", "blue", "violet", "pink", "red", "orange", "amber", "green", "ink"] as const;

export type ThemeMode = (typeof THEME_MODES)[number];
export type ThemeRadius = (typeof THEME_RADII)[number];
export type ThemeAccentName = (typeof THEME_ACCENTS)[number];
/** A named highlight colour, or any colour as an OKLCH hue (0 to 360) and chroma (0 to about 0.25). */
export type ThemeAccent = ThemeAccentName | { hue: number; chroma: number };

export type Theme = { mode: ThemeMode; radius: ThemeRadius; accent: ThemeAccent };

const STORAGE_KEY = "rivier-ui:theme";
const BASE: Theme = { mode: "system", radius: "sm", accent: "teal" };

type ThemeContextValue = {
  theme: Theme;
  /** The mode in effect: "system" resolved to what the device asks for. */
  resolvedMode: "light" | "dark";
  setTheme: (change: Partial<Theme>) => void;
  /** Forget the visitor's choice and go back to the defaults. */
  resetTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Applies a theme to an element by setting the attributes and variables the stylesheet reads. */
function apply(element: HTMLElement, theme: Theme, systemDark: boolean): void {
  const dark = theme.mode === "dark" || (theme.mode === "system" && systemDark);
  element.dataset["theme"] = dark ? "dark" : "light";
  element.classList.toggle("dark", dark);
  element.dataset["radius"] = theme.radius;
  if (typeof theme.accent === "string") {
    element.dataset["accent"] = theme.accent;
    element.style.removeProperty("--accent-hue");
    element.style.removeProperty("--accent-chroma");
  } else {
    delete element.dataset["accent"];
    element.style.setProperty("--accent-hue", String(theme.accent.hue));
    element.style.setProperty("--accent-chroma", String(theme.accent.chroma));
  }
}

/** The stored choice, as text. Read through useSyncExternalStore, so it is compared by value and never set in an effect. */
function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage can be unavailable (private mode, a sandboxed frame).
    return null;
  }
}

function parseStored(raw: string | null): Partial<Theme> {
  if (!raw) return {};
  try {
    const value: unknown = JSON.parse(raw);
    return value !== null && typeof value === "object" ? (value as Partial<Theme>) : {};
  } catch {
    return {};
  }
}

/** Providers on this page that follow the stored choice. Another tab's change arrives as a "storage" event. */
const storedListeners = new Set<() => void>();

function subscribeStored(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent): void => {
    if (event.key === null || event.key === STORAGE_KEY) onChange();
  };
  storedListeners.add(onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    storedListeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** Writes (or, with null, forgets) the choice and tells every provider. False when storage is unavailable. */
function writeStored(theme: Theme | null): boolean {
  try {
    if (theme) localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    return false;
  }
  for (const listener of storedListeners) listener();
  return true;
}

const DARK_QUERY = "(prefers-color-scheme: dark)";

function subscribeSystemDark(onChange: () => void): () => void {
  const media = window.matchMedia(DARK_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

const systemDarkOnClient = (): boolean => window.matchMedia(DARK_QUERY).matches;
const systemDarkOnServer = (): boolean => false;
const noSubscription = (): (() => void) => () => {};
const nothingStored = (): null => null;

export type ThemeProviderProps = {
  children: ReactNode;
  /** The theme before the visitor chooses. Give ThemeScript the same value. */
  defaults?: Partial<Theme>;
  /** Set false to keep the theme for this visit only. */
  persist?: boolean;
};

export function ThemeProvider({ children, defaults, persist = true }: ThemeProviderProps) {
  const initial = useMemo<Theme>(() => ({ ...BASE, ...defaults }), [defaults]);

  // The device's preference and the stored choice live outside React and are only known in the browser:
  // they are read as external stores. The server and the hydration render see the defaults, then the page
  // renders again with the real values (ThemeScript has already set the attributes, so nothing flashes).
  const systemDark = useSyncExternalStore(subscribeSystemDark, systemDarkOnClient, systemDarkOnServer);
  const storedRaw = useSyncExternalStore(persist ? subscribeStored : noSubscription, persist ? readStored : nothingStored, nothingStored);
  // The choice for this visit only: used when persist is false, or when storage is unavailable.
  const [session, setSession] = useState<Partial<Theme>>({});

  const theme = useMemo<Theme>(() => ({ ...initial, ...parseStored(storedRaw), ...session }), [initial, storedRaw, session]);

  useEffect(() => {
    apply(document.documentElement, theme, systemDark);
  }, [theme, systemDark]);

  const setTheme = useCallback(
    (change: Partial<Theme>): void => {
      if (persist && writeStored({ ...initial, ...parseStored(readStored()), ...change })) return;
      setSession((current) => ({ ...current, ...change }));
    },
    [initial, persist],
  );

  const resetTheme = useCallback((): void => {
    writeStored(null);
    setSession({});
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolvedMode: theme.mode === "dark" || (theme.mode === "system" && systemDark) ? "dark" : "light", setTheme, resetTheme }),
    [theme, systemDark, setTheme, resetTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used inside <ThemeProvider>.");
  return value;
}

/**
 * Put in <head>. Applies the stored (or default) theme before the page paints, so there is no flash.
 * It is a small inline script; it reads only this library's own storage key.
 */
export function ThemeScript({ defaults }: { defaults?: Partial<Theme> }) {
  const code = `(function(){try{var d=${JSON.stringify({ ...BASE, ...defaults })},s={};try{s=JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEY)})||"{}")}catch(e){}var t=Object.assign({},d,s),e=document.documentElement,k=t.mode==="dark"||(t.mode==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);e.dataset.theme=k?"dark":"light";e.classList.toggle("dark",k);e.dataset.radius=t.radius;if(typeof t.accent==="string"){e.dataset.accent=t.accent}else if(t.accent){e.style.setProperty("--accent-hue",t.accent.hue);e.style.setProperty("--accent-chroma",t.accent.chroma)}}catch(e){}})()`;
  // "<" is escaped so that nothing in the defaults can close the script element.
  return <script dangerouslySetInnerHTML={{ __html: code.replace(/</g, "\\u003c") }} />;
}
