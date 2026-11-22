"use client";
/**
 * @name markdown-editor
 * @category ui
 * @description A field for writing Markdown with a toolbar that wraps the chosen words (bold, italic, code, link) or starts a line (heading, list, quote), the same as Ctrl/⌘ with B, I and K, and a tab that shows the project's own preview.
 * @when Comments, notes and descriptions where people write a little formatting. The preview is the project's (its Markdown renderer and its sanitiser); without one, leave `renderPreview` out and there is no preview tab. For rich text without markup bring an editor (Tiptap, Lexical); for plain text use textarea.
 * @example
 * <MarkdownEditor aria-label="Comment" defaultValue="**Hello**" renderPreview={(text) => <MyMarkdown source={text} />} name="comment" />
 */
import { Bold, Code, Heading2, Italic, Link, List, Quote } from "lucide-react";
import { useId, useRef, useState, type ComponentProps, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useControllableState } from "@/lib/use-controllable-state";

export type MarkdownEditorLabels = { toolbar: string; write: string; preview: string; bold: string; italic: string; code: string; link: string; heading: string; list: string; quote: string; linkText: string };

const LABELS: MarkdownEditorLabels = {
  toolbar: "Formatting",
  write: "Write",
  preview: "Preview",
  bold: "Bold",
  italic: "Italic",
  code: "Code",
  link: "Link",
  heading: "Heading",
  list: "List",
  quote: "Quote",
  linkText: "text",
};

export type MarkdownEditorProps = Omit<ComponentProps<"textarea">, "value" | "defaultValue"> & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Draws the preview: the project's Markdown renderer. Left out, there is no preview tab. */
  renderPreview?: (markdown: string) => ReactNode;
  labels?: Partial<MarkdownEditorLabels>;
};

type Action = "bold" | "italic" | "code" | "link" | "heading" | "list" | "quote";

export function MarkdownEditor({ value, defaultValue = "", onValueChange, renderPreview, labels: given, className, onKeyDown, rows = 8, ...props }: MarkdownEditorProps) {
  const labels = { ...LABELS, ...given };
  const [text, setText] = useControllableState<string>({ value, defaultValue, onChange: onValueChange });
  const [tab, setTab] = useState<"write" | "preview">("write");
  const area = useRef<HTMLTextAreaElement>(null);
  const id = useId();

  const apply = (action: Action): void => {
    const node = area.current;
    if (!node) return;
    const start = node.selectionStart;
    const end = node.selectionEnd;
    const chosen = text.slice(start, end);
    let next = text;
    let from = start;
    let to = end;
    const wrapWith = (before: string, after = before, placeholder = ""): void => {
      const inner = chosen || placeholder;
      next = text.slice(0, start) + before + inner + after + text.slice(end);
      from = start + before.length;
      to = from + inner.length;
    };
    const prefixLines = (prefix: string): void => {
      const lineStart = text.lastIndexOf("\n", start - 1) + 1;
      const block = text.slice(lineStart, end);
      const changed = block
        .split("\n")
        .map((line) => (line.startsWith(prefix) ? line.slice(prefix.length) : prefix + line))
        .join("\n");
      next = text.slice(0, lineStart) + changed + text.slice(end);
      from = lineStart;
      to = lineStart + changed.length;
    };
    if (action === "bold") wrapWith("**");
    else if (action === "italic") wrapWith("_");
    else if (action === "code") wrapWith(chosen.includes("\n") ? "```\n" : "`", chosen.includes("\n") ? "\n```" : "`");
    else if (action === "link") {
      wrapWith("[", "](https://)", labels.linkText);
    } else if (action === "heading") prefixLines("## ");
    else if (action === "list") prefixLines("- ");
    else prefixLines("> ");
    setText(next);
    requestAnimationFrame(() => {
      node.focus();
      node.setSelectionRange(from, to);
    });
  };
  const tools: { action: Action; label: string; icon: ReactNode }[] = [
    { action: "bold", label: labels.bold, icon: <Bold /> },
    { action: "italic", label: labels.italic, icon: <Italic /> },
    { action: "heading", label: labels.heading, icon: <Heading2 /> },
    { action: "link", label: labels.link, icon: <Link /> },
    { action: "code", label: labels.code, icon: <Code /> },
    { action: "list", label: labels.list, icon: <List /> },
    { action: "quote", label: labels.quote, icon: <Quote /> },
  ];

  return (
    <div data-slot="markdown-editor" className={cn("flex w-full min-w-0 flex-col overflow-hidden rounded-surface border border-input bg-background focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring", className)}>
      <div className="flex flex-wrap items-center gap-1 border-b bg-card p-1">
        {renderPreview ? (
          <div role="tablist" aria-label={labels.preview} className="me-2 flex gap-1">
            {(["write", "preview"] as const).map((name) => (
              <button
                key={name}
                type="button"
                role="tab"
                id={`${id}-${name}-tab`}
                aria-selected={tab === name}
                aria-controls={`${id}-${name}`}
                tabIndex={tab === name ? 0 : -1}
                onClick={() => setTab(name)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
                    event.preventDefault();
                    setTab(name === "write" ? "preview" : "write");
                    document.getElementById(`${id}-${name === "write" ? "preview" : "write"}-tab`)?.focus();
                  }
                }}
                className="h-control-sm rounded-control px-3 text-sm aria-selected:bg-highlight-soft aria-selected:font-medium hover:bg-accent"
              >
                {name === "write" ? labels.write : labels.preview}
              </button>
            ))}
          </div>
        ) : null}
        {tab === "write" ? (
          <div role="toolbar" aria-label={labels.toolbar} aria-controls={`${id}-write`} className="flex flex-wrap gap-0.5">
            {tools.map((tool) => (
              <button
                key={tool.action}
                type="button"
                aria-label={tool.label}
                onClick={() => apply(tool.action)}
                className="flex size-8 items-center justify-center rounded-control text-muted-foreground hover:bg-accent hover:text-foreground pointer-coarse:size-10 [&_svg]:size-4"
              >
                {tool.icon}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div id={`${id}-write`} role={renderPreview ? "tabpanel" : undefined} aria-labelledby={renderPreview ? `${id}-write-tab` : undefined} hidden={tab !== "write"}>
        <textarea
          ref={area}
          value={text}
          rows={rows}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => {
            onKeyDown?.(event);
            if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
            const keys: Record<string, Action> = { KeyB: "bold", KeyI: "italic", KeyK: "link" };
            const action = keys[event.code];
            if (action) {
              event.preventDefault();
              apply(action);
            }
          }}
          className="block w-full resize-y bg-transparent p-3 font-mono text-sm outline-none"
          {...props}
        />
      </div>
      {renderPreview ? (
        <div id={`${id}-preview`} role="tabpanel" aria-labelledby={`${id}-preview-tab`} hidden={tab !== "preview"} tabIndex={0} className="min-h-40 p-3 text-base">
          {tab === "preview" ? renderPreview(text) : null}
        </div>
      ) : null}
    </div>
  );
}
