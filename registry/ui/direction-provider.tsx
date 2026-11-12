"use client";
/**
 * @name direction-provider
 * @category ui
 * @description Sets the reading direction (left to right, or right to left) for everything inside it: the `dir` attribute for layout and text, and the context Radix-based components read for arrow keys and placement.
 * @when Once around the app, with the direction of the current language, in any product that has or may get a right-to-left language (Arabic, Hebrew, Persian, Urdu, Dhivehi). Also around one part of a page in the other direction. A product in one left-to-right language does not need it. Put `dir` on <html> as well (the provider's own element covers only what is inside it; menus and dialogs are portalled to <body>). For people's own words in an unknown language use `dir="auto"` on that element instead.
 * @example
 * // app/layout.tsx
 * const dir = directionOf(locale); // "rtl" for "ar", "he", "fa", "ur", "dv" …
 * <html lang={locale} dir={dir}>
 *   <body>
 *     <DirectionProvider dir={dir}>{children}</DirectionProvider>
 *   </body>
 * </html>
 *
 * // anywhere below
 * const dir = useDirection();
 */
import { Direction as DirectionPrimitive, Slot } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export type Direction = "ltr" | "rtl";

/** Scripts that are written right to left, by ISO 15924 code. */
const RTL_SCRIPTS = new Set(["Arab", "Hebr", "Thaa", "Syrc", "Nkoo", "Adlm", "Rohg", "Samr", "Mand"]);
/** Languages written right to left when the tag names no script. */
const RTL_LANGUAGES = new Set(["ar", "he", "iw", "fa", "ur", "dv", "ps", "sd", "ug", "yi", "ckb", "syr", "nqo", "ks", "prs", "bal"]);

type LocaleWithTextInfo = Intl.Locale & { getTextInfo?: () => { direction?: string }; textInfo?: { direction?: string } };

/**
 * The reading direction of a language tag ("ar", "he-IL", "az-Arab", "en-GB"). It asks the runtime
 * (`Intl.Locale` text info) where that exists and falls back to the tag's script or language.
 */
export function directionOf(locale: string): Direction {
  try {
    const tag: LocaleWithTextInfo = new Intl.Locale(locale);
    const direction = tag.getTextInfo?.().direction ?? tag.textInfo?.direction;
    if (direction === "rtl" || direction === "ltr") return direction;
    const script = tag.script ?? tag.maximize().script;
    if (script) return RTL_SCRIPTS.has(script) ? "rtl" : "ltr";
    return RTL_LANGUAGES.has(tag.language) ? "rtl" : "ltr";
  } catch {
    return "ltr";
  }
}

export type DirectionProviderProps = Omit<ComponentProps<"div">, "dir"> & {
  /** "ltr" or "rtl". Use directionOf(locale) to get it from a language tag. */
  dir: Direction;
  /** Put `dir` on the child element instead of a wrapping div. */
  asChild?: boolean;
};

/** The wrapper is `display: contents`, so it adds no box: it only carries the `dir` attribute. */
export function DirectionProvider({ dir, asChild = false, className, children, ...props }: DirectionProviderProps) {
  const Comp = asChild ? Slot.Root : "div";
  return (
    <DirectionPrimitive.Provider dir={dir}>
      <Comp data-slot="direction-provider" dir={dir} className={cn(!asChild && "contents", className)} {...props}>
        {children}
      </Comp>
    </DirectionPrimitive.Provider>
  );
}

/** The direction set by the nearest DirectionProvider ("ltr" when there is none). Pass a component's own `dir` prop to let it win. */
export function useDirection(local?: Direction): Direction {
  return DirectionPrimitive.useDirection(local);
}
