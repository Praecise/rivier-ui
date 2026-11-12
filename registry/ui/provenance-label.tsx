"use client";
/**
 * @name provenance-label
 * @category ui
 * @description A label that stays on a picture, a video or a 3D view and says what it is (a photograph, a reconstruction, made by a model), with a popover for its sources, placed so the media's own controls can never cover it.
 * @when A reader must not mistake what they are looking at: a reconstruction beside a photograph, a generated picture, an artist's impression, archive footage. Two placements. ProvenanceFrame puts the label in its own strip above the media, outside the media's box, where nothing the media draws can reach it: use this by default. `position` puts it over a top corner inside the media's box, above its controls and on a solid ground: use this when the label must also stay in full screen, with the label inside the element that goes full screen. The bottom edge is left to controls and captions. For the source of one fact in text use fact-row's SourceChip; for a key of classes inside a scene use certainty-legend.
 * @example
 * // In its own strip above the media
 * <ProvenanceFrame>
 *   <ProvenanceLabel details={<p>Drawn from the 1890 survey and two photographs. The roof is a guess.</p>}>Imagined reconstruction</ProvenanceLabel>
 *   <img src="/mill.jpg" alt="The mill as it may have looked" />
 * </ProvenanceFrame>
 *
 * // Over a corner of a player, so it stays in full screen
 * <VideoPlayer aria-label="The mill, reconstructed">
 *   <VideoPlayerVideo src="/mill.mp4" />
 *   <ProvenanceLabel position="top-start">Imagined reconstruction</ProvenanceLabel>
 *   <VideoPlayerControls>…</VideoPlayerControls>
 * </VideoPlayer>
 */
import { Info } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/cn";

/**
 * A box around a ProvenanceLabel and the media it describes. The label is the first row, in the normal
 * flow, and the media comes after it in a box of its own: controls, captions and hotspots are positioned
 * inside the media's box, so they cannot be drawn over the label, at any width. The frame is a named group
 * when given `aria-label`.
 */
export function ProvenanceFrame({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="provenance-frame"
      role={props["aria-label"] || props["aria-labelledby"] ? "group" : undefined}
      className={cn(
        "flex w-full min-w-0 flex-col overflow-hidden rounded-surface border bg-background *:data-[slot=provenance-label]:border-x-0 *:data-[slot=provenance-label]:border-t-0 *:data-[slot=provenance-label]:rounded-none [&>img]:w-full",
        className,
      )}
      {...props}
    />
  );
}

export type ProvenanceLabelProps = Omit<ComponentProps<"div">, "children"> & {
  /** What the thing is, in a few words: "Imagined reconstruction", "Photograph, 1931". */
  children: ReactNode;
  /** The sources and anything else worth knowing, shown in a popover. With it the label is a button. */
  details?: ReactNode;
  /** Said after the statement in the button's name, so it is clear what pressing it shows. Translate it with the interface. */
  detailsLabel?: string;
  /** Over a top corner of the media's box (which must be `relative`), above its controls. Left out, the label is a row in the flow, as inside ProvenanceFrame. */
  position?: "top-start" | "top-end";
  /** The popover's open state: controlled. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** A mark before the statement (an icon), hidden from assistive technology. */
  icon?: ReactNode;
};

/**
 * The statement, always in the markup and always visible: it is text on the theme's own solid ground with
 * a border, so it reads on any picture in light and dark, and it does not fade, move or hide with the
 * media's controls. With `details` it is a button that opens a popover (Enter or Space; Escape closes it
 * and focus comes back). Positioned, it sits at `z-30`, above a player's controls and overlays. The
 * popover is rendered at the end of the page, so it is not shown while an element is in the browser's
 * full screen: the statement itself still is.
 */
export function ProvenanceLabel({ className, children, details, detailsLabel = "sources and details", position, open, defaultOpen, onOpenChange, icon, ...props }: ProvenanceLabelProps) {
  const statement = (
    <>
      {icon ? (
        <span aria-hidden="true" className="inline-flex shrink-0 [&_svg]:size-4">
          {icon}
        </span>
      ) : null}
      <span data-slot="provenance-label-text" dir="auto" className="min-w-0">
        {children}
      </span>
    </>
  );
  const content = "flex min-h-8 w-full min-w-0 items-center gap-2 px-2.5 py-1 text-start pointer-coarse:min-h-(--control-h)";
  return (
    <div
      data-slot="provenance-label"
      data-position={position ?? "flow"}
      className={cn(
        "flex min-w-0 rounded-control border border-border-strong bg-background text-sm font-medium text-foreground",
        position ? "absolute top-2 z-30 max-w-[calc(100%-1rem)]" : "w-full",
        position === "top-start" && "start-2",
        position === "top-end" && "end-2",
        className,
      )}
      {...props}
    >
      {details === undefined ? (
        <p className={content}>{statement}</p>
      ) : (
        <Popover {...(open === undefined ? {} : { open })} {...(defaultOpen === undefined ? {} : { defaultOpen })} {...(onOpenChange ? { onOpenChange } : {})}>
          <PopoverTrigger className={cn(content, "rounded-control transition-colors duration-instant ease-out hover:bg-accent motion-reduce:transition-none")}>
            {statement}
            <span className="sr-only">, {detailsLabel}</span>
            <Info aria-hidden="true" strokeWidth={1.5} className="ms-auto size-4 shrink-0 text-muted-foreground" />
          </PopoverTrigger>
          <PopoverContent data-slot="provenance-label-details" align="start" className="flex flex-col gap-2">
            {details}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
