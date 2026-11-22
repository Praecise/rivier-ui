// Site: the library's own Markdown files (the conventions, the changelog) drawn as pages. It reads the Markdown
// those two files use: headings, paragraphs, lists with wrapped lines, fenced code, bold, code and links.

import type { ReactNode } from "react";
import { C, Code } from "./code";

const slug = (text: string): string =>
  text
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** A line of text with its code words, bold and links drawn. */
export function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const match of text.matchAll(/`([^`]+)`|\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)/g)) {
    if (match.index > last) out.push(text.slice(last, match.index));
    if (match[1] !== undefined) out.push(<C key={key++}>{match[1]}</C>);
    else if (match[2] !== undefined) out.push(<strong key={key++}>{inline(match[2])}</strong>);
    else out.push(<a key={key++} href={match[4]}>{match[3]}</a>);
    last = match.index + match[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export type Heading = { id: string; title: string };

/** The second-level headings of a Markdown file, for the list of what is on the page. */
export const headingsOf = (source: string): Heading[] =>
  [...source.matchAll(/^## (.+)$/gm)].map((match) => ({ id: slug(match[1] ?? ""), title: (match[1] ?? "").replace(/`/g, "") }));

/** `skipTitle` leaves out the first-level heading, which the page writes itself. */
export function Markdown({ source, skipTitle = true }: { source: string; skipTitle?: boolean }) {
  const lines = source.split("\n");
  const out: ReactNode[] = [];
  let key = 0;
  let index = 0;
  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (!line.trim()) {
      index += 1;
      continue;
    }
    const fence = /^```(\w*)/.exec(line);
    if (fence) {
      const body: string[] = [];
      index += 1;
      while (index < lines.length && !(lines[index] ?? "").startsWith("```")) body.push(lines[index++] ?? "");
      index += 1;
      const language = fence[1] === "sh" || fence[1] === "tsx" || fence[1] === "css" || fence[1] === "html" || fence[1] === "json" ? fence[1] : "text";
      out.push(<Code key={key++} code={body.join("\n")} language={language} />);
      continue;
    }
    const heading = /^(#{1,3}) (.+)$/.exec(line);
    if (heading) {
      const title = heading[2] ?? "";
      index += 1;
      if (heading[1] === "#") {
        if (!skipTitle) out.push(<h1 key={key++}>{inline(title)}</h1>);
      } else if (heading[1] === "##") out.push(<h2 key={key++} id={slug(title)}>{inline(title)}</h2>);
      else out.push(<h3 key={key++}>{inline(title)}</h3>);
      continue;
    }
    if (/^- /.test(line)) {
      const entries: string[] = [];
      while (index < lines.length && (/^- /.test(lines[index] ?? "") || /^ {2,}\S/.test(lines[index] ?? ""))) {
        const current = lines[index++] ?? "";
        if (/^- /.test(current)) entries.push(current.slice(2));
        else entries[entries.length - 1] += ` ${current.trim()}`;
      }
      out.push(
        <ul key={key++}>
          {entries.map((entry, at) => (
            <li key={at}>{inline(entry)}</li>
          ))}
        </ul>,
      );
      continue;
    }
    const paragraph: string[] = [];
    while (index < lines.length && (lines[index] ?? "").trim() && !/^(#{1,3} |- |```)/.test(lines[index] ?? "")) paragraph.push((lines[index++] ?? "").trim());
    out.push(<p key={key++}>{inline(paragraph.join(" "))}</p>);
  }
  return <>{out}</>;
}
