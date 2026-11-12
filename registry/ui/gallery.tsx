"use client";
/**
 * @name gallery
 * @category ui
 * @description A set of picture tiles that open a full-screen viewer: a mosaic of one large and several small, an even grid, or a row that scrolls sideways.
 * @when Showing several pictures of one thing where each can be looked at closely: a place, a product, a piece of work. GalleryLightbox takes a list of pictures and does everything; Gallery, GalleryItem and GalleryImage are the parts, to put inside your own Lightbox or to use with no viewer at all. For pictures that are decoration, use plain images in a grid; for one picture use aspect.
 * @example
 * <GalleryLightbox
 *   title="Photos of the studio"
 *   layout="mosaic"
 *   items={[
 *     { src: "/studio-1.jpg", alt: "The studio from the street" },
 *     { src: "/studio-2.jpg", alt: "The workbench", caption: "The workbench, built in 1962" },
 *   ]}
 * />
 *
 * // The parts, in your own lightbox
 * <Lightbox count={photos.length}>
 *   <Gallery layout="grid" aria-label="Photos">
 *     {photos.map((photo, index) => (
 *       <LightboxTrigger key={photo.src} index={index} asChild>
 *         <GalleryItem><GalleryImage src={photo.src} alt={photo.alt} /></GalleryItem>
 *       </LightboxTrigger>
 *     ))}
 *   </Gallery>
 *   <LightboxContent>…</LightboxContent>
 * </Lightbox>
 */
import { ImageOff } from "lucide-react";
import { Children, createContext, use, useState, type ComponentProps, type ReactNode } from "react";
import {
  Lightbox,
  LightboxCaption,
  LightboxClose,
  LightboxContent,
  LightboxCounter,
  LightboxFooter,
  LightboxHeader,
  LightboxNext,
  LightboxPrevious,
  LightboxSlide,
  LightboxStage,
  LightboxThumbnail,
  LightboxThumbnails,
  LightboxTitle,
  LightboxTrigger,
  LightboxViewport,
  LightboxZoom,
  useLightbox,
  type LightboxProps,
} from "@/components/ui/lightbox";
import { cn } from "@/lib/cn";

export type GalleryLayout = "mosaic" | "grid" | "row";

/** How many tiles a mosaic shows: one large and four small. */
const MOSAIC_TILES = 5;

const GalleryContext = createContext<{ layout: GalleryLayout }>({ layout: "grid" });

export type GalleryProps = ComponentProps<"div"> & {
  /**
   * "mosaic": the first picture large and four small beside it (below it on phones); pictures beyond the
   * fifth are not shown as tiles, and their number is written on the last tile. "grid": even tiles, two to
   * four across by the gallery's own width. "row": one line that scrolls sideways and snaps, for phones.
   */
  layout?: GalleryLayout;
  /** The words on the last tile of a mosaic when there are more pictures than tiles. Default "+4 more". */
  moreLabel?: (count: number) => string;
};

/**
 * The tiles' layout. Its children are GalleryItems (each may be wrapped in a LightboxTrigger). It is a
 * group: name it with `aria-label` or `aria-labelledby`.
 */
export function Gallery({ layout = "grid", moreLabel = (count) => `+${count} more`, className, children, ...props }: GalleryProps) {
  const more = layout === "mosaic" ? Children.count(children) - MOSAIC_TILES : 0;
  return (
    <div data-slot="gallery" data-layout={layout} role="group" className={cn("@container w-full min-w-0", className)} {...props}>
      <GalleryContext value={{ layout }}>
        <div
          data-slot="gallery-tiles"
          className={cn(
            layout === "grid" && "grid grid-cols-2 gap-2 @md:grid-cols-3 @3xl:grid-cols-4",
            layout === "mosaic" &&
              "relative grid grid-cols-2 gap-2 @xl:aspect-[2/1] @xl:grid-cols-4 @xl:grid-rows-2 [&>[data-slot=gallery-item]:first-child]:col-span-2 @xl:[&>[data-slot=gallery-item]:first-child]:row-span-2 [&>[data-slot=gallery-item]:nth-child(n+6)]:hidden",
            layout === "row" && "flex snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:thin]",
          )}
        >
          {children}
          {more > 0 ? (
            <span
              data-slot="gallery-more"
              className="pointer-events-none absolute end-0 bottom-0 flex aspect-[4/3] w-[calc(50%-0.25rem)] items-center justify-center rounded-control bg-overlay text-sm font-medium text-background @xl:aspect-auto @xl:h-[calc(50%-0.25rem)] @xl:w-[calc(25%-0.375rem)] dark:text-foreground"
            >
              <bdi>{moreLabel(more)}</bdi>
            </span>
          ) : null}
        </div>
      </GalleryContext>
    </div>
  );
}

export type GalleryItemProps = ComponentProps<"button"> & {
  /** Read before the picture's own description, so that the button says what it does. Default "Open picture:". */
  openLabel?: string;
};

/**
 * One tile: a button that holds a GalleryImage. It keeps its shape (4:3, or the cell of a mosaic) before
 * the picture arrives, with the theme's flat muted ground showing until then, so nothing moves as pictures
 * load. Its name is `openLabel` and the picture's `alt` together ("Open picture: The workbench").
 */
export function GalleryItem({ className, children, openLabel = "Open picture:", type = "button", ...props }: GalleryItemProps) {
  const { layout } = use(GalleryContext);
  return (
    <button
      type={type}
      className={cn(
        "relative block min-w-0 overflow-hidden rounded-control bg-muted transition-opacity duration-instant ease-out hover:opacity-90 motion-reduce:transition-none",
        layout === "grid" && "aspect-[4/3]",
        layout === "mosaic" && "aspect-[4/3] @xl:aspect-auto",
        layout === "row" && "aspect-[4/3] w-[72%] max-w-80 shrink-0 snap-start",
        className,
      )}
      {...props}
      // After the spread: as the child of a LightboxTrigger it is given that part's data-slot, and the layout selects tiles by this one.
      data-slot="gallery-item"
    >
      <span className="sr-only">{openLabel} </span>
      {children}
    </button>
  );
}

export type GalleryImageProps = ComponentProps<"img"> & {
  /** What the picture shows. Required: it is also the tile's name. */
  alt: string;
  /** The words shown in place of a picture that cannot be loaded. Default "Picture unavailable". */
  unavailableLabel?: string;
};

/**
 * The picture, cropped to fill its tile. A picture that fails to load is replaced by a labelled placeholder
 * that keeps the description, never the browser's broken-image icon.
 */
export function GalleryImage({ className, alt, unavailableLabel = "Picture unavailable", loading = "lazy", decoding = "async", onError, ...props }: GalleryImageProps) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span data-slot="gallery-image-unavailable" className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-2 text-center text-xs text-muted-foreground">
        <ImageOff aria-hidden="true" strokeWidth={1.5} className="size-5" />
        <span>{unavailableLabel}</span>
        <span className="sr-only">: {alt}</span>
      </span>
    );
  }
  return (
    <img
      data-slot="gallery-image"
      alt={alt}
      loading={loading}
      decoding={decoding}
      // A picture that failed before the page became interactive never fires onError: look at it once.
      ref={(node) => {
        if (node?.complete && node.naturalWidth === 0 && node.currentSrc !== "") setFailed(true);
      }}
      onError={(event) => {
        onError?.(event);
        setFailed(true);
      }}
      className={cn("absolute inset-0 size-full object-cover", className)}
      {...props}
    />
  );
}

export type GalleryPicture = {
  src: string;
  /** What the picture shows. */
  alt: string;
  /** A smaller file for the tile and the thumbnail strip. Default: `src`. */
  thumbnail?: string;
  /** Words shown under the picture in the viewer. */
  caption?: ReactNode;
};

export type GalleryLightboxProps = Omit<LightboxProps, "count" | "children"> & {
  items: GalleryPicture[];
  /** The viewer's name for screen readers, and the gallery's: "Photos of the studio". */
  title: string;
  layout?: GalleryLayout;
  /** Show the strip of small pictures in the viewer. Default: when there are more than one. */
  thumbnails?: boolean;
  /** Words for the interface, to translate. */
  labels?: {
    open?: string;
    close?: string;
    previous?: string;
    next?: string;
    zoomIn?: string;
    zoomOut?: string;
    zoomReset?: string;
    zoom?: string;
    pictures?: string;
    allPictures?: string;
    unavailable?: string;
    more?: (count: number) => string;
    /** The name of a thumbnail in the strip. Default "Show picture 3: The workbench". */
    show?: (position: number, alt: string) => string;
  };
  className?: string;
};

function CurrentCaption({ items }: { items: GalleryPicture[] }) {
  const { index } = useLightbox("GalleryLightbox");
  const caption = items[index]?.caption;
  return caption ? <LightboxCaption>{caption}</LightboxCaption> : null;
}

/**
 * A gallery and its viewer from a list of pictures. Every option of Lightbox passes through (`open`,
 * `index`, `loop`, `sharedTransition`, `formatPosition` and the rest), so it can be controlled.
 */
export function GalleryLightbox({ items, title, layout = "grid", thumbnails, labels = {}, className, ...lightbox }: GalleryLightboxProps) {
  const strip = thumbnails ?? items.length > 1;
  return (
    <Lightbox count={items.length} {...lightbox}>
      <Gallery layout={layout} aria-label={title} className={className} {...(labels.more ? { moreLabel: labels.more } : {})}>
        {items.map((item, index) => (
          <LightboxTrigger key={`${index}-${item.src}`} index={index} asChild>
            <GalleryItem {...(labels.open ? { openLabel: labels.open } : {})}>
              <GalleryImage src={item.thumbnail ?? item.src} alt={item.alt} {...(labels.unavailable ? { unavailableLabel: labels.unavailable } : {})} />
            </GalleryItem>
          </LightboxTrigger>
        ))}
      </Gallery>
      <LightboxContent>
        <LightboxHeader>
          <LightboxCounter />
          <LightboxTitle className="sr-only">{title}</LightboxTitle>
          <LightboxZoom className="ms-auto" aria-label={labels.zoom} zoomInLabel={labels.zoomIn} zoomOutLabel={labels.zoomOut} resetLabel={labels.zoomReset} />
          <LightboxClose aria-label={labels.close} />
        </LightboxHeader>
        <LightboxStage>
          <LightboxViewport aria-label={labels.pictures}>
            {items.map((item, index) => (
              <LightboxSlide key={`${index}-${item.src}`} index={index}>
                <img src={item.src} alt={item.alt} draggable={false} className="max-h-full max-w-full object-contain" />
              </LightboxSlide>
            ))}
          </LightboxViewport>
          <LightboxPrevious aria-label={labels.previous} />
          <LightboxNext aria-label={labels.next} />
        </LightboxStage>
        {strip || items.some((item) => item.caption) ? (
          <LightboxFooter>
            <CurrentCaption items={items} />
            {strip ? (
              <LightboxThumbnails aria-label={labels.allPictures}>
                {items.map((item, index) => (
                  <LightboxThumbnail key={`${index}-${item.src}`} index={index} aria-label={(labels.show ?? ((position, alt) => `Show picture ${position}: ${alt}`))(index + 1, item.alt)}>
                    <img src={item.thumbnail ?? item.src} alt="" draggable={false} />
                  </LightboxThumbnail>
                ))}
              </LightboxThumbnails>
            ) : null}
          </LightboxFooter>
        ) : null}
      </LightboxContent>
    </Lightbox>
  );
}
