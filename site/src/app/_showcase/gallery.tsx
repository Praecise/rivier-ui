"use client";
// Showcase: gallery, lightbox, React view transitions, dropzone and upload rows.

import { startTransition, useEffect, useRef, useState, type ComponentProps } from "react";
import { SharedElement } from "@/components/motion/view-transition";
import { Button } from "@/components/ui/button";
import {
  Dropzone,
  DropzoneButton,
  DropzoneHint,
  UploadActions,
  UploadItem,
  UploadList,
  UploadPause,
  UploadProgress,
  UploadRemove,
  UploadResume,
  UploadRetry,
  type FileRejection,
  type UploadState,
} from "@/components/ui/dropzone";
import { Gallery, GalleryImage, GalleryItem, GalleryLightbox, type GalleryPicture } from "@/components/ui/gallery";
import {
  Lightbox,
  LightboxClose,
  LightboxContent,
  LightboxCounter,
  LightboxHeader,
  LightboxNext,
  LightboxPrevious,
  LightboxSlide,
  LightboxStage,
  LightboxTitle,
  LightboxTrigger,
  LightboxViewport,
} from "@/components/ui/lightbox";
import { announce } from "@/lib/announce";
import { Demo } from "./demo";

/** Pictures drawn in code, so the showcase needs no files and no network. Greys only: they sit in any theme. */
const SCENES: { alt: string; caption?: string; width: number; height: number; shapes: string }[] = [
  { alt: "A sun low over two hills", caption: "Evening, looking west", width: 1200, height: 800, shapes: '<circle cx="860" cy="300" r="120" fill="#d9d9d9"/><path d="M0 800 L0 560 Q300 340 620 600 Q900 420 1200 640 L1200 800Z" fill="#6f6f6f"/>' },
  { alt: "Three tall windows in a wall", caption: "The north wall", width: 800, height: 1100, shapes: '<rect x="110" y="200" width="150" height="620" fill="#d9d9d9"/><rect x="325" y="200" width="150" height="620" fill="#c4c4c4"/><rect x="540" y="200" width="150" height="620" fill="#d9d9d9"/>' },
  { alt: "A round table seen from above", width: 1000, height: 1000, shapes: '<circle cx="500" cy="500" r="330" fill="#c4c4c4"/><circle cx="500" cy="500" r="90" fill="#6f6f6f"/>' },
  { alt: "A path between two rows of trees", caption: "The way in", width: 1200, height: 700, shapes: '<path d="M520 700 L590 200 L610 200 L680 700Z" fill="#d9d9d9"/><circle cx="300" cy="330" r="130" fill="#6f6f6f"/><circle cx="900" cy="330" r="130" fill="#6f6f6f"/><circle cx="150" cy="450" r="110" fill="#7d7d7d"/><circle cx="1050" cy="450" r="110" fill="#7d7d7d"/>' },
  { alt: "A boat on flat water", width: 1200, height: 800, shapes: '<rect x="0" y="520" width="1200" height="280" fill="#7d7d7d"/><path d="M430 520 L770 520 L720 600 L480 600Z" fill="#d9d9d9"/><path d="M600 240 L600 500 L740 500Z" fill="#c4c4c4"/>' },
  { alt: "A staircase turning to the right", width: 900, height: 1200, shapes: '<path d="M100 1100 H300 V950 H450 V800 H600 V650 H750 V500 H850 V1100Z" fill="#c4c4c4"/>' },
  { alt: "A bridge with four arches", caption: "Low tide", width: 1400, height: 700, shapes: '<rect x="0" y="250" width="1400" height="90" fill="#6f6f6f"/><path d="M80 700 V340 H1320 V700 H1180 A130 180 0 0 0 920 700 H860 A130 180 0 0 0 600 700 H540 A130 180 0 0 0 280 700Z" fill="#7d7d7d"/>' },
  { alt: "A lamp over a desk", width: 1000, height: 800, shapes: '<rect x="150" y="600" width="700" height="40" fill="#6f6f6f"/><path d="M500 600 L500 300 L640 220" stroke="#6f6f6f" stroke-width="18" fill="none"/><path d="M580 180 L720 240 L650 330 L560 290Z" fill="#d9d9d9"/>' },
];

const picture = (index: number): GalleryPicture => {
  const scene = SCENES[index % SCENES.length] as (typeof SCENES)[number];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${scene.width} ${scene.height}" width="${scene.width}" height="${scene.height}"><rect width="100%" height="100%" fill="#9a9a9a"/>${scene.shapes}</svg>`;
  return { src: `data:image/svg+xml,${encodeURIComponent(svg)}`, alt: scene.alt, ...(scene.caption ? { caption: scene.caption } : {}) };
};

const ALL = SCENES.map((_, index) => picture(index));
const FEW: GalleryPicture[] = [...ALL.slice(0, 3), { src: "data:image/png;base64,AAAA", alt: "A picture whose file is missing" }];

/** Pictures that carry their own size as well, which a framework's image component asks for. */
type SizedPicture = GalleryPicture & { width: number; height: number };
const SIZED: SizedPicture[] = [
  ...SCENES.slice(0, 3).map((scene, index) => ({ ...picture(index), width: scene.width, height: scene.height })),
  { src: "data:image/png;base64,AAAA", alt: "A picture whose file is missing", width: 800, height: 600 },
];

/**
 * A stand-in for a framework's image component (the kind that takes `fill` and `sizes` and loads the
 * picture its own way). It marks what it draws, so the checks can tell it from a plain `<img>`.
 */
function FrameworkImage({ fill = false, alt, ...props }: ComponentProps<"img"> & { fill?: boolean }) {
  return <img data-framework-image={fill ? "fill" : "sized"} alt={alt} {...props} />;
}

type Upload = { id: number; name: string; size: number; state: UploadState; percent: number; attempts: number };

const REASONS: Record<FileRejection["reason"], string> = {
  type: "only pictures and PDF files can be added",
  size: "it is larger than 2 MB",
  count: "no more than three files can be added at once",
};

function Uploads() {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [rejected, setRejected] = useState<string[]>([]);
  const nextId = useRef(1);
  const chooser = useRef<HTMLButtonElement>(null);

  // A pretend uploader: two files at a time, ten per cent a tick. A file with "fail" in its name stops at
  // forty per cent the first time and goes through when tried again.
  useEffect(() => {
    const timer = window.setInterval(() => {
      setUploads((current) => {
        if (!current.some((upload) => upload.state === "uploading" || upload.state === "queued")) return current;
        let running = current.filter((upload) => upload.state === "uploading").length;
        return current.map((upload) => {
          if (upload.state === "queued" && running < 2) {
            running += 1;
            return { ...upload, state: "uploading" };
          }
          if (upload.state !== "uploading") return upload;
          const percent = Math.min(100, upload.percent + 10);
          if (upload.name.includes("fail") && upload.attempts === 0 && percent >= 40) return { ...upload, percent: 40, state: "failed", attempts: 1 };
          return percent >= 100 ? { ...upload, percent: 100, state: "done" } : { ...upload, percent };
        });
      });
    }, 150);
    return () => window.clearInterval(timer);
  }, []);

  const add = (files: File[]): void => {
    setRejected([]);
    setUploads((current) => [...current, ...files.map((file) => ({ id: nextId.current++, name: file.name, size: file.size, state: "queued" as const, percent: 0, attempts: 0 }))]);
  };
  const reject = (rejections: FileRejection[]): void => {
    const lines = rejections.map(({ file, reason }) => `${file.name} was not added: ${REASONS[reason]}.`);
    setRejected(lines);
    announce(lines.join(" "));
  };
  const change = (id: number, state: UploadState): void => setUploads((current) => current.map((upload) => (upload.id === id ? { ...upload, state } : upload)));

  return (
    <div className="flex flex-col gap-4">
      <Dropzone accept="image/*,.pdf" maxSize={2_000_000} maxFiles={3} onFiles={add} onReject={reject} aria-label="Add files">
        <DropzoneHint>Drop pictures or PDF files here (up to 2 MB each, three at a time), paste them, or</DropzoneHint>
        <div className="flex flex-wrap justify-center gap-2">
          <DropzoneButton ref={chooser}>Choose files</DropzoneButton>
          <Button
            variant="ghost"
            onClick={() =>
              add([
                new File([new Uint8Array(340_000)], "plan.pdf", { type: "application/pdf" }),
                new File([new Uint8Array(1_250_000)], "will-fail.png", { type: "image/png" }),
              ])
            }
          >
            Add two samples
          </Button>
        </div>
      </Dropzone>
      {rejected.length > 0 ? (
        <ul data-testid="rejections" className="flex flex-col gap-1 text-sm text-destructive">
          {rejected.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
      <UploadList aria-label="Files being added">
        {uploads.map((upload) => (
          <UploadItem
            key={upload.id}
            name={upload.name}
            size={upload.size}
            state={upload.state}
            {...(upload.state === "failed" ? { detail: "The connection dropped." } : {})}
          >
            <UploadProgress value={upload.percent} />
            <UploadActions>
              {upload.state === "uploading" ? <UploadPause onClick={() => change(upload.id, "paused")} /> : null}
              {upload.state === "paused" ? <UploadResume onClick={() => change(upload.id, "uploading")} /> : null}
              {upload.state === "failed" ? <UploadRetry onClick={() => change(upload.id, "uploading")} /> : null}
              <UploadRemove
                onClick={() => {
                  setUploads((current) => current.filter((item) => item.id !== upload.id));
                  chooser.current?.focus();
                }}
              />
            </UploadActions>
          </UploadItem>
        ))}
      </UploadList>
    </div>
  );
}

function SharedDemo() {
  const [open, setOpen] = useState(false);
  const first = ALL[0] as GalleryPicture;
  return (
    <div className="flex min-h-64 flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        React&apos;s own ViewTransition: the update runs in <code>startTransition</code>, and the small picture becomes the large one.
      </p>
      {open ? (
        <div className="flex flex-col gap-3">
          <SharedElement name="showcase-shared-picture">
            <img data-testid="shared-large" src={first.src} alt={first.alt} className="aspect-[3/2] w-full rounded-control object-cover" />
          </SharedElement>
          <Button variant="outline" className="self-start" onClick={() => startTransition(() => setOpen(false))}>
            Back to the small picture
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <SharedElement name="showcase-shared-picture">
            <img data-testid="shared-small" src={first.src} alt={first.alt} className="size-20 rounded-control object-cover" />
          </SharedElement>
          <Button variant="outline" onClick={() => startTransition(() => setOpen(true))}>
            Show it large
          </Button>
        </div>
      )}
    </div>
  );
}

export function GalleryShowcase() {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  return (
    <div className="grid gap-4 @3xl:grid-cols-2">
      <Demo title="Gallery: mosaic" className="@3xl:col-span-2">
        <GalleryLightbox title="Eight drawings" layout="mosaic" items={ALL} />
      </Demo>

      <Demo title="Gallery: grid, controlled">
        <div className="flex flex-col gap-4">
          <GalleryLightbox title="Four drawings" layout="grid" items={FEW} open={open} onOpenChange={setOpen} index={index} onIndexChange={setIndex} />
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIndex(2);
                setOpen(true);
              }}
            >
              Open at the third picture
            </Button>
            <p className="text-sm text-muted-foreground">
              Viewer: <span data-testid="viewer-state">{open ? `open at ${index + 1}` : `closed, last at ${index + 1}`}</span>
            </p>
          </div>
        </div>
      </Demo>

      <Demo title="Gallery: row, own lightbox">
        <Lightbox count={5} loop sharedTransition={false} formatPosition={(current, total) => `Drawing ${current} of ${total}`}>
          <Gallery layout="row" aria-label="Five drawings in a row">
            {ALL.slice(0, 5).map((item, at) => (
              <LightboxTrigger key={item.src} index={at} asChild>
                <GalleryItem>
                  <GalleryImage src={item.src} alt={item.alt} />
                </GalleryItem>
              </LightboxTrigger>
            ))}
          </Gallery>
          <LightboxContent>
            <LightboxHeader>
              <LightboxTitle>Five drawings</LightboxTitle>
              <LightboxCounter className="ms-auto" />
              <LightboxClose />
            </LightboxHeader>
            <LightboxStage>
              <LightboxViewport aria-label="Drawings">
                {ALL.slice(0, 5).map((item, at) => (
                  <LightboxSlide key={item.src} index={at}>
                    <img src={item.src} alt={item.alt} draggable={false} className="max-h-full max-w-full object-contain" />
                  </LightboxSlide>
                ))}
              </LightboxViewport>
              <LightboxPrevious />
              <LightboxNext />
            </LightboxStage>
          </LightboxContent>
        </Lightbox>
      </Demo>

      <Demo title="Gallery: the project's own image component">
        <div className="flex flex-col gap-4">
          <GalleryLightbox
            title="Four drawings, drawn by the project's component"
            items={SIZED}
            sharedTransition={false}
            renderImage={({ use, picture: item, props }) =>
              use === "tile" ? (
                <GalleryImage as={FrameworkImage} fill sizes="(min-width: 48rem) 25vw, 50vw" {...props} />
              ) : (
                <FrameworkImage {...props} width={use === "slide" ? item.width : 96} height={use === "slide" ? item.height : 72} />
              )
            }
          />
          <Gallery layout="grid" aria-label="Two tiles with no viewer" data-testid="own-parts">
            <GalleryItem openLabel="Picture:">
              <GalleryImage as={FrameworkImage} fill src={SIZED[1]?.src} alt="Three tall windows, as a part" />
            </GalleryItem>
            <GalleryItem openLabel="Picture:">
              <GalleryImage src={SIZED[2]?.src} alt="A round table, as a plain picture" />
            </GalleryItem>
          </Gallery>
        </div>
      </Demo>

      <Demo title="Shared element in a React transition">
        <SharedDemo />
      </Demo>

      <Demo title="Dropzone and uploads">
        <Uploads />
      </Demo>
    </div>
  );
}
