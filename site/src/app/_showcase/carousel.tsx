"use client";
// Showcase: carousel and media-row-list. Pictures are drawn in code, so the page needs no files and no network.

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselCount, CarouselDots, CarouselNext, CarouselPlayPause, CarouselPrevious, CarouselSlide, CarouselViewport } from "@/components/ui/carousel";
import { MediaRowList, type MediaRow } from "@/components/ui/media-row-list";
import { Demo } from "./demo";

const SHAPES = [
  '<circle cx="230" cy="80" r="34" fill="#d9d9d9"/><path d="M0 180 L0 130 Q80 80 160 140 Q230 100 320 150 L320 180Z" fill="#6f6f6f"/>',
  '<rect x="40" y="40" width="50" height="110" fill="#d9d9d9"/><rect x="135" y="40" width="50" height="110" fill="#c4c4c4"/><rect x="230" y="40" width="50" height="110" fill="#d9d9d9"/>',
  '<circle cx="160" cy="90" r="62" fill="#c4c4c4"/><circle cx="160" cy="90" r="18" fill="#6f6f6f"/>',
  '<rect x="0" y="118" width="320" height="62" fill="#7d7d7d"/><path d="M110 118 L210 118 L195 142 L125 142Z" fill="#d9d9d9"/><path d="M160 50 L160 112 L200 112Z" fill="#c4c4c4"/>',
  '<path d="M30 160 H90 V130 H140 V100 H190 V70 H240 V40 H290 V160Z" fill="#c4c4c4"/>',
  '<rect x="0" y="60" width="320" height="22" fill="#6f6f6f"/><path d="M20 180 V82 H300 V180 H260 A35 50 0 0 0 190 180 H130 A35 50 0 0 0 60 180Z" fill="#7d7d7d"/>',
];

const picture = (index: number): string =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180"><rect width="320" height="180" fill="#9a9a9a"/>${SHAPES[index % SHAPES.length] ?? ""}</svg>`)}`;

const PLACES = [
  { name: "The hills at dusk", alt: "A sun low over two hills" },
  { name: "The north wall", alt: "Three tall windows in a wall" },
  { name: "The round table", alt: "A round table seen from above" },
  { name: "The harbour", alt: "A boat on flat water" },
  { name: "The stairs", alt: "A staircase climbing to the right" },
  { name: "The bridge", alt: "A bridge with two arches" },
];

function Plain() {
  const [seen, setSeen] = useState<number[]>([]);
  return (
    <div className="flex flex-col gap-3">
      <Carousel aria-label="Places" onIndexChange={(index) => setSeen((all) => [...all, index])}>
        <CarouselViewport>
          {PLACES.slice(0, 5).map((place, index) => (
            <CarouselSlide key={place.name}>
              <figure className="flex flex-col gap-2">
                <img src={picture(index)} alt={place.alt} className="aspect-video w-full rounded-surface object-cover" />
                <figcaption className="text-sm">
                  <a href={`#place-${index + 1}`} className="underline underline-offset-4">
                    {place.name}
                  </a>
                </figcaption>
              </figure>
            </CarouselSlide>
          ))}
        </CarouselViewport>
        <div className="flex items-center justify-between gap-2">
          <CarouselPrevious />
          <CarouselDots />
          <CarouselNext />
        </div>
      </Carousel>
      <p className="text-sm text-muted-foreground">
        Came to rest on: <span data-testid="plain-seen">{seen.join(", ")}</span>
      </p>
    </div>
  );
}

function Several() {
  const [index, setIndex] = useState(0);
  return (
    <div className="flex flex-col gap-3">
      <Carousel index={index} onIndexChange={setIndex} aria-labelledby="several-title">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 id="several-title" className="text-sm font-medium">
            More places
          </h4>
          <div className="flex items-center gap-2">
            <CarouselCount />
            <CarouselPrevious />
            <CarouselNext />
          </div>
        </div>
        <CarouselViewport className="gap-3">
          {PLACES.map((place, at) => (
            <CarouselSlide key={place.name} className="basis-full md:basis-[calc((100%-1.5rem)/3)]">
              <div className="flex h-full flex-col gap-2 rounded-surface border bg-background p-3">
                <img src={picture(at)} alt="" className="aspect-video w-full rounded-control object-cover" />
                <p className="text-sm font-medium">{place.name}</p>
                <p className="text-sm text-muted-foreground">{place.alt}</p>
              </div>
            </CarouselSlide>
          ))}
        </CarouselViewport>
      </Carousel>
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <Button variant="outline" size="sm" onClick={() => setIndex(2)}>
          Show the third
        </Button>
        <Button variant="outline" size="sm" onClick={() => setIndex(0)}>
          Back to the first
        </Button>
        <span>
          index: <span data-testid="several-index">{index}</span>
        </span>
      </div>
    </div>
  );
}

function Auto() {
  return (
    <Carousel autoplay={1200} loop aria-label="Highlights" className="max-w-md">
      <div className="flex items-center gap-2">
        <CarouselPlayPause />
        <CarouselPrevious />
        <CarouselNext />
        <CarouselCount className="ms-auto" />
      </div>
      <CarouselViewport>
        {PLACES.slice(0, 3).map((place, index) => (
          <CarouselSlide key={place.name}>
            <img src={picture(index + 3)} alt={place.alt} className="aspect-video w-full rounded-surface object-cover" />
          </CarouselSlide>
        ))}
      </CarouselViewport>
    </Carousel>
  );
}

const START: MediaRow[] = [
  { id: "hills", name: "hills.jpg", size: 1_240_000, state: "done", alt: "A sun low over two hills", thumbnail: <img src={picture(0)} alt="" /> },
  { id: "wall", name: "north-wall.jpg", size: 2_400_000, state: "uploading", progress: 40, thumbnail: <img src={picture(1)} alt="" /> },
  { id: "table", name: "table.jpg", size: 860_000, state: "failed", progress: 15, error: "The connection dropped.", thumbnail: <img src={picture(2)} alt="" /> },
  { id: "harbour", name: "مرفأ.jpg", size: 3_100_000, state: "done", thumbnail: <img src={picture(3)} alt="" /> },
];

function Rows() {
  const [rows, setRows] = useState<MediaRow[]>(START);
  const [cover, setCover] = useState<string | null>("hills");
  const [retried, setRetried] = useState(0);
  return (
    <div className="flex flex-col gap-3">
      <MediaRowList
        aria-label="Pictures, in order"
        items={rows}
        onItemsChange={setRows}
        cover={cover}
        onCoverChange={setCover}
        onAltChange={(id, alt) => setRows((all) => all.map((row) => (row.id === id ? { ...row, alt } : row)))}
        onRemove={(id) => setRows((all) => all.filter((row) => row.id !== id))}
        onRetry={(id) => {
          setRetried((count) => count + 1);
          setRows((all) => all.map((row) => (row.id === id ? { ...row, state: "done", progress: 100 } : row)));
        }}
        empty="No pictures yet."
      />
      <p className="text-sm text-muted-foreground">
        order: <span data-testid="rows-order">{rows.map((row) => row.id).join(", ")}</span> · cover: <span data-testid="rows-cover">{cover ?? "none"}</span> · retried:{" "}
        <span data-testid="rows-retried">{retried}</span> · first description: <span data-testid="rows-alt">{rows[0]?.alt ?? ""}</span>
      </p>
      <Button
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => {
          setRows(START);
          setCover("hills");
        }}
      >
        Start again
      </Button>
    </div>
  );
}

function Bare() {
  return (
    <MediaRowList
      aria-label="Clips"
      hideCover
      defaultCover={null}
      items={[
        { id: "one", name: "opening.mp4", size: 12_000_000, state: "queued", progress: 0 },
        { id: "two", name: "closing.mp4", size: 9_000_000, state: "done" },
      ]}
    />
  );
}

export function CarouselShowcase() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Demo title="Carousel">
          <Plain />
        </Demo>
        <Demo title="Carousel: autoplay">
          <Auto />
        </Demo>
      </div>
      <Demo title="Carousel: several to a view, controlled">
        <Several />
      </Demo>
      <div className="grid gap-6 lg:grid-cols-2">
        <Demo title="Media rows">
          <Rows />
        </Demo>
        <Demo title="Media rows: order only">
          <Bare />
        </Demo>
      </div>
    </div>
  );
}
