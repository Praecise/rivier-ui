"use client";
// Site: code on a page is the library's own code-block. This adds the colouring, line by line, with the
// theme's tokens: there is no highlighting package.

import type { ReactNode } from "react";
import { CodeBlock } from "@/components/ui/code-block";
import { cn } from "@/lib/cn";

type Language = "tsx" | "sh" | "css" | "json" | "html" | "text";

const KEYWORDS =
  "import|export|from|const|let|function|return|type|interface|extends|if|else|for|of|in|new|await|async|default|as|typeof|null|undefined|true|false";

/** What a piece of a line is, by the first pattern that matches: comment, string, tag or component, keyword. */
const PATTERNS: Record<Language, RegExp | null> = {
  tsx: new RegExp(
    ["(\\/\\/[^\\n]*|\\{\\/\\*.*?\\*\\/\\})", "(\"(?:[^\"\\\\]|\\\\.)*\"|'(?:[^'\\\\]|\\\\.)*'|`(?:[^`\\\\]|\\\\.)*`)", "(<\\/?[A-Za-z][\\w.-]*|\\/?>)", `\\b(${KEYWORDS})\\b`].join("|"),
    "g",
  ),
  sh: /(#.*)|("(?:[^"\\]|\\.)*"|'[^']*')|()()/g,
  css: /(\/\*.*?\*\/)|("(?:[^"\\]|\\.)*")|(@[\w-]+)|(--[\w-]+)/g,
  json: /()("(?:[^"\\]|\\.)*"(?=\s*:))|()()/g,
  html: /(<!--.*?-->)|("(?:[^"\\]|\\.)*")|(<\/?[A-Za-z][\w-]*|\/?>)|()/g,
  text: null,
};

const TONES = ["", "text-muted-foreground", "", "text-primary", "font-medium"] as const;

/** A line inside a block comment: it opens one, continues one with a star, or closes one. */
const inComment = (line: string): boolean => /^\s*(\/\*|\*\/|\*(\s|$))/.test(line);

function colour(line: string, language: Language): ReactNode {
  if (!line) return " ";
  const pattern = PATTERNS[language];
  if (!pattern) return line;
  if ((language === "tsx" || language === "css") && inComment(line)) return <span className="text-muted-foreground">{line}</span>;
  const out: ReactNode[] = [];
  let last = 0;
  for (const match of line.matchAll(pattern)) {
    const kind = match.slice(1).findIndex((group) => group !== undefined && group !== "") + 1;
    if (kind === 0) continue;
    if (match.index > last) out.push(line.slice(last, match.index));
    const tone = TONES[kind];
    out.push(
      tone ? (
        <span key={match.index} className={tone}>
          {match[0]}
        </span>
      ) : (
        match[0]
      ),
    );
    last = match.index + match[0].length;
  }
  if (last < line.length) out.push(line.slice(last));
  return out;
}

export type CodeProps = {
  code: string;
  language?: Language;
  /** A name above the code: a file, or what the code is. */
  title?: string;
  /** What the copy button is called. */
  copyLabel?: string;
  className?: string;
  /** Tall code scrolls inside the block from about thirty lines. */
  tall?: boolean;
};

export function Code({ code, language = "tsx", title, copyLabel = "Copy the code", className, tall = false }: CodeProps) {
  return (
    <CodeBlock
      code={code.replace(/\n+$/, "")}
      title={title}
      labels={{ copy: copyLabel }}
      renderLine={(line) => colour(line, language)}
      className={cn("my-4", tall && "[&_pre]:max-h-[34rem] [&_pre]:overflow-y-auto", className)}
    />
  );
}

/** A word of code inside a sentence. */
export function C({ children }: { children: ReactNode }) {
  return <code className="rounded-control bg-muted px-1.5 py-0.5 font-mono text-[0.875em]">{children}</code>;
}
