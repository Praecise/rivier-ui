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
// One thing cannot be found: a single utility kept outside those places (`const gap = "gap-2"`).
// `unprefixed` lists what still looks like a class list afterwards, for a check.

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

/** One class list with the prefix on every class. `${…}` in a template is carried as it is; a class that begins with one is left alone. */
function prefixList(text: string, prefix: string): string {
  let out = "";
  let token = "";
  let depth = 0;
  const flush = (): void => {
    if (token) out += token.startsWith("${") || token.startsWith(`${prefix}:`) ? token : `${prefix}:${token}`;
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
  return literal.inClass || looksLikeClassList(literal.text);
}

/** The source of a component with the prefix on every class found. */
export function prefixClasses(source: string, prefix: string): string {
  let out = "";
  let from = 0;
  for (const literal of literals(source)) {
    if (!isClasses(source, literal)) continue;
    out += source.slice(from, literal.start + 1) + prefixList(literal.text, prefix);
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
    if (bare.length >= 2 && looksLikeClassList(bare.join(" "))) {
      missed.push(`${source.slice(0, literal.start).split("\n").length}: ${literal.text.slice(0, 80)}`);
    }
  }
  return missed;
}

/** `cn` for a project with a prefix: tailwind-merge has to know it to tell which classes replace which. */
export function prefixMerge(source: string, prefix: string): string {
  return source.replace("extendTailwindMerge({", `extendTailwindMerge({\n  prefix: "${prefix}",`);
}
