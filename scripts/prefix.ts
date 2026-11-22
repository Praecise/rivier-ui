// Rivier UI: writing a project's Tailwind prefix onto a component's classes.
//
// A project that sets a prefix (`@import "tailwindcss" prefix(tw)`) writes every utility as
// `tw:flex`, and a class without it makes no CSS at all: the part is simply unstyled, and nothing
// reports it. So the whole of a component has to be rewritten, not only the classes that are easy
// to find. Classes are found in two ways:
//
//   1. By where they are written: a `className` attribute, an argument of `cn`, `clsx` or `cva`,
//      a `class` or `className` property. Everything a string holds there is a class, one or many.
//   2. By what they look like: anywhere else, a string of two or more words that are all shaped
//      like utilities is a class list. That is how a list kept in a constant or chosen by a
//      condition is found (`const nav = "absolute top-3 z-10"`).
//
// What is deliberately left alone: comments, imports, the names of variants (`variant: "outline"`,
// `defaultVariants`), the name of a property, a string compared with `===`, and the arguments of
// any other function.
// A single utility kept outside those places is taken only when its value is one the theme or
// Tailwind's scale has (`"text-success"`, `"top-2"`): a lone word of any other kind cannot be told
// from an option of a prop. `unprefixed` lists what still looks like a class afterwards, for a check.

const CLASS_CALLS = new Set(["cn", "clsx", "cva"]);
const CLASS_KEY = /^class(Name|Names)?$/;
/** Single words that are utilities by themselves, for telling a class list from a phrase. */
const WORDS = new Set([
  "flex", "grid", "block", "inline", "hidden", "absolute", "relative", "fixed", "sticky", "static", "truncate",
  "underline", "uppercase", "lowercase", "capitalize", "italic", "contents", "group", "peer", "border", "rounded",
  "transition", "shrink", "grow", "outline", "ring", "invisible", "visible", "isolate", "container", "antialiased",
]);
const TOKEN = /^!?-?(\[[^\]]+\]|[a-z@*][a-z0-9@]*)([:/-](\[[^\]]+\]|\([^)]+\)|[a-z0-9.%@&>_*[\]()=,+#'~|^$-]+))*!?$/;

/** Text that reads as a list of utilities: two or more words, all shaped like classes, at least two of them unmistakably so. */
export function looksLikeClassList(text: string): boolean {
  const tokens = text.split(/\s+/).filter(Boolean);
  if (tokens.length < 2 || !tokens.every((token) => TOKEN.test(token))) return false;
  // `[data-day]` alone is a selector, not a utility: an arbitrary property has a colon inside its brackets.
  if (tokens.some((token) => /^\[[^\]:]*\]$/.test(token) || token.includes("${"))) return false;
  const sure = tokens.filter((token) => token.includes("-") || token.includes(":") || WORDS.has(token));
  return sure.length >= 2 && tokens.some((token) => (token.includes("-") && !token.startsWith("data-") && !token.startsWith("aria-")) || WORDS.has(token));
}

// One utility by itself, kept in a map or chosen by a condition (`{ good: "text-success" }`,
// `top ? "top-2" : "bottom-2"`). A lone word can be anything, so only a utility whose value is one
// the theme or Tailwind's scale has is taken: `top-2` is, `top-start` (an option of a prop) is not.
const COLOUR = /^(bg|text|fill|stroke|border|ring|outline|decoration|divide|from|via|to|accent|caret)-(background|foreground|card|popover|primary|secondary|muted|accent|highlight|destructive|success|warning|border|input|ring|overlay|chart-[1-5]|current|transparent|inherit|white|black)(-foreground|-soft|-strong)?(\/\d+)?$/;
const SCALE = /^-?(size|w|h|min-w|min-h|max-w|max-h|p|px|py|ps|pe|pt|pb|m|mx|my|ms|me|mt|mb|gap|gap-x|gap-y|inset|inset-x|inset-y|top|bottom|start|end|left|right|basis|translate-x|translate-y|space-x|space-y|rounded|z|opacity|order|col-span|row-span|grid-cols|grid-rows|line-clamp|duration|delay|border|ring|outline)-(\d+(\.\d+)?|px|full|auto|screen|fit|min|max|none|control|control-sm|control-lg|surface|instant|base|slow|\d+\/\d+|\[.+\]|\(.+\))$/;
const PLACING = /^(items|justify|self|content|place-items|place-content|text)-(start|center|end|stretch|between|around|evenly|baseline|left|right|justify)$/;
const TYPE = /^(text-(xs|sm|base|lg|xl|[2-9]xl)|font-(thin|light|normal|medium|semibold|bold|mono|sans|serif)|leading-(none|tight|snug|normal|relaxed|loose|\d+)|tracking-(tighter|tight|normal|wide|wider|widest))$/;

/** Whether one word is a utility beyond doubt, variants (`hover:`) aside. */
export function isUtility(token: string): boolean {
  const name = token.slice(token.lastIndexOf(":") + 1).replace(/^!|!$/g, "");
  return COLOUR.test(name) || SCALE.test(name) || PLACING.test(name) || TYPE.test(name);
}

/** Theme variables Tailwind writes itself, and so writes with the prefix (`--tw-spacing`): a class that reads one by name has to follow. */
const TAILWIND_VARIABLE = /var\(--(spacing(?![\w-])|color-|radius-(?:control|surface|sm|md|lg|xl)(?![\w-])|container-|text-|leading-|tracking-|font-|breakpoint-)/g;

/** Classes a selector in the same file names (`[.dark_&]:…`, `group-[.toaster]:…`): they are marks on an element, not utilities, and keep their name. */
function marksIn(source: string): Set<string> {
  const marks = new Set<string>(["dark"]);
  for (const match of source.matchAll(/\[[^\]\s"'`]*?\.([A-Za-z][A-Za-z0-9-]*)/g)) marks.add(match[1]!);
  return marks;
}

/** One class list with the prefix on every class. `${…}` in a template is carried as it is; a class that begins with one is left alone. */
function prefixList(text: string, prefix: string, marks: Set<string>): string {
  let out = "";
  let token = "";
  let depth = 0;
  const flush = (): void => {
    // `language-ts` is the class a highlighter looks for, by a convention that is not Tailwind's.
    const kept = token.startsWith("${") || token.startsWith(`${prefix}:`) || token.startsWith("language-") || marks.has(token);
    if (token) out += kept ? token : `${prefix}:${token.replace(TAILWIND_VARIABLE, `var(--${prefix}-$1`)}`;
    token = "";
  };
  for (let at = 0; at < text.length; at++) {
    const char = text[at]!;
    if (depth === 0 && char === "$" && text[at + 1] === "{") {
      depth = 1;
      token += "${";
      at++;
    } else if (depth > 0) {
      if (char === "{") depth++;
      if (char === "}") depth--;
      token += char;
    } else if (/\s/.test(char)) {
      flush();
      out += char;
    } else {
      token += char;
    }
  }
  flush();
  return out;
}

type Frame = { open: string; call: string; key: string; attr: boolean };
type Literal = { start: number; end: number; quote: string; text: string; inClass: boolean; compared: boolean; key: boolean };

/** Every string in the code (not in comments), with where it stands. */
function literals(source: string): Literal[] {
  const found: Literal[] = [];
  const stack: Frame[] = [];
  let at = 0;
  /** The code before a position, with trailing space removed, for reading what a bracket or a string follows. */
  const before = (position: number): string => source.slice(Math.max(0, position - 80), position).trimEnd();

  const inClass = (keyHere: string): boolean => {
    if (CLASS_KEY.test(keyHere)) return true;
    for (let depth = stack.length - 1; depth >= 0; depth--) {
      const frame = stack[depth]!;
      if (frame.attr || CLASS_KEY.test(frame.key)) return true;
      if (frame.key === "defaultVariants") return false;
      if (frame.key === "compoundVariants") return false;
      if (frame.open === "(" && frame.call) return CLASS_CALLS.has(frame.call);
    }
    return false;
  };

  while (at < source.length) {
    const char = source[at]!;
    const next = source[at + 1];
    if (char === "/" && next === "/") {
      const end = source.indexOf("\n", at);
      at = end === -1 ? source.length : end;
    } else if (char === "/" && next === "*") {
      const end = source.indexOf("*/", at + 2);
      at = end === -1 ? source.length : end + 2;
    } else if (char === '"' || char === "'" || char === "`") {
      let end = at + 1;
      let depth = 0;
      while (end < source.length) {
        const c = source[end]!;
        if (c === "\\") end++;
        else if (char === "`" && c === "$" && source[end + 1] === "{") depth++;
        else if (char === "`" && depth > 0 && c === "}") depth--;
        else if (c === char && depth === 0) break;
        else if (c === "\n" && char !== "`") break;
        end++;
      }
      const lead = before(at);
      const keyHere = /([A-Za-z_$][\w$]*)\s*:$/.exec(lead)?.[1] ?? (/className=$/.test(lead) ? "className" : "");
      const after = source.slice(end + 1, end + 12).trimStart();
      found.push({
        start: at,
        end,
        quote: char,
        text: source.slice(at + 1, end),
        inClass: inClass(keyHere),
        compared: /[!=]==?$/.test(lead) || /^[!=]==?/.test(after) || /\bcase$/.test(lead),
        // The name of a property, as in `{ "aria-label": … }`: it opens an object or follows a comma, and a colon follows it.
        key: after.startsWith(":") && /[{,]$/.test(lead),
      });
      at = end + 1;
    } else if (char === "(" || char === "{" || char === "[") {
      const lead = before(at);
      stack.push({
        open: char,
        call: char === "(" ? (/([A-Za-z_$][\w$.]*)$/.exec(lead)?.[1]?.split(".").pop() ?? "") : "",
        key: /([A-Za-z_$][\w$]*)\s*:$/.exec(lead)?.[1] ?? "",
        attr: char === "{" && /className=$/.test(lead),
      });
      at++;
    } else if (char === ")" || char === "}" || char === "]") {
      stack.pop();
      at++;
    } else {
      at++;
    }
  }
  return found;
}

const isImport = (source: string, literal: Literal): boolean => {
  const line = source.slice(source.lastIndexOf("\n", literal.start) + 1, literal.start);
  return /^\s*(import\b|export\b.*\bfrom\s*$|}\s*from\s*$)/.test(line) || /\bfrom\s*$/.test(line) || /\bimport\(\s*$/.test(line);
};

/** Whether a string is a class list, by where it stands or by what it looks like. */
function isClasses(source: string, literal: Literal): boolean {
  if (!literal.text.trim() || literal.compared || isImport(source, literal)) return false;
  if (literal.key) return false;
  const text = literal.text.trim();
  return literal.inClass || looksLikeClassList(text) || (!/\s/.test(text) && isUtility(text));
}

/** The source of a component with the prefix on every class found. */
export function prefixClasses(source: string, prefix: string): string {
  let out = "";
  let from = 0;
  const marks = marksIn(source);
  for (const literal of literals(source)) {
    if (!isClasses(source, literal)) continue;
    out += source.slice(from, literal.start + 1) + prefixList(literal.text, prefix, marks);
    from = literal.end;
  }
  return out + source.slice(from);
}

/** Class lists that do not carry the prefix, as "line: text": what a check reports after prefixing. */
export function unprefixed(source: string, prefix: string): string[] {
  const missed: string[] = [];
  for (const literal of literals(source)) {
    if (literal.compared || literal.key || isImport(source, literal)) continue;
    const bare = literal.text.split(/\s+/).filter((token) => token && !token.startsWith(`${prefix}:`) && !token.startsWith("${"));
    if ((bare.length >= 2 && looksLikeClassList(bare.join(" "))) || (bare.length === 1 && literal.text.trim() === bare[0] && isUtility(bare[0]!))) {
      missed.push(`${source.slice(0, literal.start).split("\n").length}: ${literal.text.slice(0, 80)}`);
    }
  }
  return missed;
}

/** `cn` for a project with a prefix: tailwind-merge has to know it to tell which classes replace which. */
export function prefixMerge(source: string, prefix: string): string {
  return source.replace("extendTailwindMerge({", `extendTailwindMerge({\n  prefix: "${prefix}",`);
}

/**
 * The theme for a project with a prefix. Tailwind then writes its own theme variables with the prefix
 * (`--tw-tracking-tight`), so the rules that change them by language have to name them the same way.
 * What the theme declares inside `@theme` is Tailwind's to rename, and is left as it is.
 */
export function prefixTheme(css: string, prefix: string): string {
  let depth = 0;
  let themeAt = -1;
  return css
    .split("\n")
    .map((line) => {
      const inTheme = themeAt !== -1;
      if (!inTheme && /^\s*@theme\b/.test(line)) themeAt = depth;
      const renamed = inTheme || themeAt !== -1 ? line : line.replace(/^(\s*)--(tracking|leading|text)-/, `$1--${prefix}-$2-`);
      depth += (line.match(/{/g) ?? []).length - (line.match(/}/g) ?? []).length;
      if (themeAt !== -1 && depth <= themeAt) themeAt = -1;
      return renamed;
    })
    .join("\n");
}
