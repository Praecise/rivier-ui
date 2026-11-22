"use client";
/**
 * @name code-block
 * @category ui
 * @description Code to read and copy: a title or file name, the language, optional line numbers and highlighted lines, a switch between wrapping and scrolling long lines, and a copy button that says when it has copied.
 * @when Showing code, commands or configuration in documentation and answers. Colouring by syntax comes from the project (pass `renderLine` with a highlighter's output); the block works without it. For code to edit, bring an editor (CodeMirror, Monaco); for a short word of code in a sentence use `<code>`.
 * @example
 * <CodeBlock title="Install" language="sh" code={"npm install\nnpm run dev"} />
 * <CodeBlock language="ts" code={source} lineNumbers highlight={[3, 4]} />
 */
import { Check, Copy, WrapText } from "lucide-react";
import { useState, type ComponentProps, type ReactNode } from "react";
import { announce } from "@/lib/announce";
import { cn } from "@/lib/cn";

export type CodeBlockLabels = { copy: string; copied: string; wrap: string; failed: string };
const LABELS: CodeBlockLabels = { copy: "Copy the code", copied: "Copied", wrap: "Wrap long lines", failed: "Could not copy" };

export type CodeBlockProps = Omit<ComponentProps<"figure">, "title"> & {
  /** The code as plain text. */
  code: string;
  /** Its language, shown as a word ("ts", "sh") and set as the class `language-…` for highlighters. */
  language?: string;
  /** A file name or a few words above the code. */
  title?: string;
  lineNumbers?: boolean;
  /** Line numbers (from 1) to mark, as for the lines a step talks about. */
  highlight?: readonly number[];
  /** Draws one line: return a highlighter's spans. Default: the plain text. */
  renderLine?: (line: string, index: number) => ReactNode;
  /** Start with long lines wrapped instead of scrolling. */
  defaultWrap?: boolean;
  labels?: Partial<CodeBlockLabels>;
};

export function CodeBlock({ code, language, title, lineNumbers = false, highlight = [], renderLine, defaultWrap = false, labels: given, className, ...props }: CodeBlockProps) {
  const labels = { ...LABELS, ...given };
  const [copied, setCopied] = useState(false);
  const [wrap, setWrap] = useState(defaultWrap);
  const lines = code.replace(/\n$/, "").split("\n");
  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      announce(labels.copied);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      announce(labels.failed, "assertive");
    }
  };
  return (
    <figure data-slot="code-block" className={cn("m-0 flex min-w-0 flex-col overflow-hidden rounded-surface border bg-muted", className)} {...props}>
      <div className="flex items-center gap-2 border-b bg-card px-3 py-1.5">
        {title ? <figcaption className="min-w-0 truncate font-mono text-xs">{title}</figcaption> : null}
        {language ? <span className="rounded-control bg-muted px-1.5 font-mono text-xs text-muted-foreground">{language}</span> : null}
        <span className="ms-auto flex gap-1">
          <button type="button" aria-pressed={wrap} aria-label={labels.wrap} onClick={() => setWrap(!wrap)} className="flex size-8 items-center justify-center rounded-control text-muted-foreground hover:bg-accent hover:text-foreground aria-pressed:bg-highlight-soft pointer-coarse:size-10">
            <WrapText aria-hidden="true" className="size-4" />
          </button>
          <button type="button" aria-label={copied ? labels.copied : labels.copy} onClick={() => void copy()} className="flex size-8 items-center justify-center rounded-control text-muted-foreground hover:bg-accent hover:text-foreground pointer-coarse:size-10">
            {copied ? <Check aria-hidden="true" className="size-4 text-success" /> : <Copy aria-hidden="true" className="size-4" />}
          </button>
        </span>
      </div>
      {/* Focusable so the keyboard can scroll it sideways; LTR whatever the page, as code reads. */}
      <pre tabIndex={0} dir="ltr" className={cn("m-0 overflow-x-auto py-3 font-mono text-sm leading-relaxed", wrap && "whitespace-pre-wrap break-words")}>
        <code className={language ? `language-${language}` : undefined}>
          {lines.map((line, index) => {
            const marked = highlight.includes(index + 1);
            return (
              <span key={index} data-line={index + 1} data-highlighted={marked ? "" : undefined} className={cn("flex px-3", marked && "bg-highlight-soft")}>
                {lineNumbers ? (
                  <span aria-hidden="true" className="me-4 inline-block w-8 shrink-0 text-end text-muted-foreground tabular-nums select-none">
                    {index + 1}
                  </span>
                ) : null}
                <span className="min-w-0 flex-1">{renderLine ? renderLine(line, index) : line || " "}</span>
                {"\n"}
              </span>
            );
          })}
        </code>
      </pre>
    </figure>
  );
}
