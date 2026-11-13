"use client";
// Showcase: reading code, writing Markdown, cropping and marking pictures. The pictures are SVG drawn here.

import { Fragment, useState, type ReactNode } from "react";
import { CodeBlock } from "@/components/ui/code-block";
import { ImageAnnotator, type ImageArea } from "@/components/ui/image-annotator";
import { ImageCropper, type CropRect } from "@/components/ui/image-cropper";
import { MarkdownEditor } from "@/components/ui/markdown-editor";
import { Demo } from "./demo";

const PICTURE = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400"><rect width="640" height="400" fill="#dfe6ec"/><rect y="260" width="640" height="140" fill="#9bb7cf"/><path d="M60 260V150l70-40 70 40v110z" fill="#8a949c"/><path d="M300 260V120h120v140z" fill="#a1a9b0"/><circle cx="520" cy="90" r="40" fill="#e9c46a"/><text x="320" y="380" font-family="sans-serif" font-size="18" text-anchor="middle" fill="#3a444c">An invented harbour</text></svg>`,
)}`;

const SOURCE = `import { formatNumber } from "@/components/viz/chart";

export function total(values: number[]): string {
  const sum = values.reduce((a, b) => a + b, 0);
  return formatNumber(sum, "en-US");
}`;

/** A small preview for the showcase: paragraphs, bold and italic only. A project uses its own renderer and sanitiser. */
function TinyMarkdown({ text }: { text: string }): ReactNode {
  return text.split(/\n{2,}/).map((block, b) => (
    <p key={b} className="mb-2">
      {block.split(/(\*\*[^*]+\*\*|_[^_]+_)/).map((part, i) =>
        part.startsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : part.startsWith("_") && part.endsWith("_") && part.length > 2 ? <em key={i}>{part.slice(1, -1)}</em> : <Fragment key={i}>{part}</Fragment>,
      )}
    </p>
  ));
}

export function Editors() {
  const [markdown, setMarkdown] = useState("The river **rose** for six days.");
  const [crop, setCrop] = useState<CropRect | null>(null);
  const [areas, setAreas] = useState<readonly ImageArea[]>([{ id: "house", x: 0.08, y: 0.27, width: 0.24, height: 0.4, label: "Boat house" }]);
  return (
    <div className="grid gap-6 @3xl:grid-cols-2">
      <Demo title="Code block">
        <div className="flex flex-col gap-4">
          <CodeBlock title="total.ts" language="ts" code={SOURCE} lineNumbers highlight={[4, 5]} />
          <CodeBlock title="Install" language="sh" code="npm run ui -- add code-block" />
        </div>
      </Demo>
      <Demo title="Markdown editor">
        <MarkdownEditor aria-label="Note" value={markdown} onValueChange={setMarkdown} renderPreview={(text) => <TinyMarkdown text={text} />} />
        <p className="mt-2 font-mono text-xs text-muted-foreground" data-testid="markdown">
          {markdown}
        </p>
      </Demo>
      <Demo title="Image cropper">
        <ImageCropper src={PICTURE} alt="An invented harbour with a boat house and a sun" aspect={1} onCropChange={(next) => setCrop(next.pixels)} />
        <p className="mt-2 text-sm text-muted-foreground" data-testid="crop">
          {crop ? `${crop.x},${crop.y} ${crop.width}×${crop.height}` : "not moved"}
        </p>
      </Demo>
      <Demo title="Image annotator">
        <ImageAnnotator src={PICTURE} alt="An invented harbour with a boat house and a sun" areas={areas} onAreasChange={setAreas} />
        <p className="mt-2 text-sm text-muted-foreground" data-testid="areas">
          {areas.map((a) => `${a.label || "?"}@${Math.round(a.x * 100)},${Math.round(a.y * 100)}`).join(" ")}
        </p>
      </Demo>
    </div>
  );
}
