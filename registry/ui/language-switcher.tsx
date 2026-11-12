"use client";
/**
 * @name language-switcher
 * @category ui
 * @description A menu for choosing the interface language: each language under its own name in its own script, the current one marked, no flags.
 * @when A product in more than one language: in the header or footer, and in settings. It only reports the choice (`onValueChange`): the project navigates to the translated page or stores the preference. A flag stands for a country, not a language, so none is shown. It is a menu of radio items and not a select, because choosing a language is an action that reloads or navigates: a select that changes the page as its value changes surprises keyboard and screen-reader users. For choosing a language as data in a form (a document's language) use select.
 * @example
 * <LanguageSwitcher value={locale} onValueChange={(next) => router.replace(pathname, { locale: next })} label="Language" languages={["en", "fr", "ar", "ja"]} />
 *
 * // With its own parts: names in the current language as a second line, and a name the project supplies
 * <LanguageSwitcher defaultValue="en" label="Language" displayLocale="en">
 *   <LanguageSwitcherTrigger />
 *   <LanguageSwitcherContent align="end">
 *     <LanguageSwitcherItem value="en" />
 *     <LanguageSwitcherItem value="ar" />
 *     <LanguageSwitcherItem value="dv" name="ދިވެހި" />
 *   </LanguageSwitcherContent>
 * </LanguageSwitcher>
 */
import { Globe } from "lucide-react";
import { createContext, use, type ComponentProps, type ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import { directionOf } from "@/components/ui/direction-provider";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/cn";
import { useControllableState } from "@/lib/use-controllable-state";

/**
 * The name of a language: in that language itself by default ("français", "العربية"), or in another
 * (`languageName("fr", "en")` is "French"). The first letter is capitalised by the rules of the language it
 * is written in. Falls back to the tag when the runtime does not know the language. Server and browser can
 * differ for rare languages: pass `name` to LanguageSwitcherItem for those.
 */
export function languageName(tag: string, inLocale: string = tag): string {
  try {
    const name = new Intl.DisplayNames([inLocale], { type: "language", fallback: "none" }).of(tag);
    if (!name) return tag;
    const first = name.codePointAt(0);
    if (first === undefined) return tag;
    const head = String.fromCodePoint(first);
    return head.toLocaleUpperCase(inLocale) + name.slice(head.length);
  } catch {
    return tag;
  }
}

type LanguageContextValue = {
  value: string;
  setValue: (value: string) => void;
  label: string;
  displayLocale: string | undefined;
  names: Record<string, string>;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function useLanguage(part: string): LanguageContextValue {
  const context = use(LanguageContext);
  if (!context) throw new Error(`<${part}> must be used inside <LanguageSwitcher>.`);
  return context;
}

export type LanguageSwitcherProps = Omit<ComponentProps<typeof DropdownMenu>, "children"> & {
  /** The current language, as a tag ("en", "pt-BR") (controlled). */
  value?: string;
  /** The language to begin with when uncontrolled. */
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /**
   * The control's name, in the current interface language ("Language"). It is read out before the current
   * language's own name, and is not shown: the globe and the language's name are.
   */
  label: string;
  /** The tags to offer, for the default parts. Order them the same way everywhere (not by popularity). */
  languages?: string[];
  /** Also show each language's name in this language, as a second line ("French" under "Français"). Usually the current interface language. */
  displayLocale?: string;
  /** Names to use instead of the runtime's, by tag, for languages it does not know or names the product prefers. */
  names?: Record<string, string>;
  /** The parts, when the default trigger and list are not what is wanted. */
  children?: ReactNode;
};

export function LanguageSwitcher({ value, defaultValue = "en", onValueChange, label, languages = [], displayLocale, names = {}, children, ...props }: LanguageSwitcherProps) {
  const [current, setCurrent] = useControllableState({ value, defaultValue, onChange: onValueChange });
  return (
    <LanguageContext value={{ value: current, setValue: setCurrent, label, displayLocale, names }}>
      <DropdownMenu {...props}>
        {children ?? (
          <>
            <LanguageSwitcherTrigger />
            <LanguageSwitcherContent>
              {languages.map((tag) => (
                <LanguageSwitcherItem key={tag} value={tag} />
              ))}
            </LanguageSwitcherContent>
          </>
        )}
      </DropdownMenu>
    </LanguageContext>
  );
}

export type LanguageSwitcherTriggerProps = ComponentProps<typeof DropdownMenuTrigger> & {
  /** "outline" (default) or "ghost", as on button. */
  variant?: "outline" | "ghost";
  size?: "sm" | "md";
};

/** A globe and the current language's own name. Its accessible name is the label, then that name: "Language: Français". */
export function LanguageSwitcherTrigger({ className, variant = "outline", size = "md", children, ...props }: LanguageSwitcherTriggerProps) {
  const { value, label, names } = useLanguage("LanguageSwitcherTrigger");
  return (
    <DropdownMenuTrigger data-slot="language-switcher-trigger" className={cn(buttonVariants({ variant, size }), "max-w-full", className)} {...props}>
      {children ?? (
        <>
          <Globe aria-hidden="true" strokeWidth={1.5} />
          <span className="sr-only">{label}: </span>
          <span lang={value} className="min-w-0 truncate">
            {names[value] ?? languageName(value)}
          </span>
        </>
      )}
    </DropdownMenuTrigger>
  );
}

/** The list. It scrolls when there are many languages. */
export function LanguageSwitcherContent({ className, children, align = "end", ...props }: ComponentProps<typeof DropdownMenuContent>) {
  const { value, setValue, label } = useLanguage("LanguageSwitcherContent");
  return (
    <DropdownMenuContent data-slot="language-switcher-content" align={align} className={cn("min-w-48", className)} {...props}>
      <DropdownMenuRadioGroup value={value} onValueChange={setValue} aria-label={label}>
        {children}
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  );
}

export type LanguageSwitcherItemProps = Omit<ComponentProps<typeof DropdownMenuRadioItem>, "children"> & {
  /** The language tag ("en", "ar", "zh-Hant"). */
  value: string;
  /** The language's name in itself, when the runtime's is missing or not the one wanted. */
  name?: string;
  /** Replaces the second line (the name in `displayLocale`). */
  secondary?: ReactNode;
};

/**
 * One language. Its own name carries `lang` and `dir`, so it is pronounced and shaped as that language; the
 * second line, in the interface language, is for people looking for a language they cannot read. Typing a
 * letter jumps to a language by the name in the interface language when that line is shown (so "J" finds
 * 日本語), otherwise by its own name.
 */
export function LanguageSwitcherItem({ value, name, secondary, className, textValue, ...props }: LanguageSwitcherItemProps) {
  const { displayLocale, names } = useLanguage("LanguageSwitcherItem");
  const own = name ?? names[value] ?? languageName(value);
  const translated = secondary ?? (displayLocale && displayLocale !== value ? languageName(value, displayLocale) : null);
  return (
    <DropdownMenuRadioItem
      data-slot="language-switcher-item"
      value={value}
      textValue={textValue ?? (typeof translated === "string" ? translated : own)}
      className={cn("min-h-10", className)}
      {...props}
    >
      <span className="flex min-w-0 flex-col text-start">
        {/* Sized to its words and placed by the menu's direction, so a right-to-left name still lines up with the rest. */}
        <span lang={value} dir={directionOf(value)} className="max-w-full self-start truncate">
          {own}
        </span>
        {translated && translated !== own ? <span className="truncate text-xs text-muted-foreground">{translated}</span> : null}
      </span>
    </DropdownMenuRadioItem>
  );
}
