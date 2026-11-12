"use client";
/**
 * @name tile-group
 * @category ui
 * @description A grid of large tiles, each a picture or an icon with a word, where one or several are chosen.
 * @when A choice that is easier to make by looking than by reading: moods, styles, room types, plans. Each tile must carry a visible word; the picture alone is never the label. For short text-only options use chip (ChipGroup); for a compact switch between a few views use segmented-control; for a long list use select or combobox.
 * @example
 * <TileGroup type="multiple" defaultValue={["quiet"]} aria-label="What kind of day?">
 *   <Tile value="quiet">
 *     <TileMedia><img src="/quiet.jpg" alt="" /></TileMedia>
 *     <TileLabel>Quiet</TileLabel>
 *     <TileDescription>Gardens, reading rooms, slow walks</TileDescription>
 *   </Tile>
 *   <Tile value="lively">
 *     <TileMedia><img src="/lively.jpg" alt="" /></TileMedia>
 *     <TileLabel>Lively</TileLabel>
 *   </Tile>
 * </TileGroup>
 */
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import { Check } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export type TileGroupProps = ComponentProps<typeof ToggleGroupPrimitive.Root>;

/**
 * `type="multiple"` lets several tiles be on (each is a toggle button in a group); `type="single"` lets one
 * be on (each is a radio in a radio group). Arrow keys move between tiles, Space or Enter switches one. The
 * tiles sit in a grid that follows the width of its container: two columns when narrow, more as it widens
 * (override with a `grid-cols-*` class). Name the group with `aria-label` or `aria-labelledby`. `value`,
 * `defaultValue` and `onValueChange` control it: a string for "single", an array for "multiple".
 */
export function TileGroup({ className, ...props }: TileGroupProps) {
  // Radix calls a set of toggles a toolbar; a set of choices is a plain group.
  const role = props.role ?? (props.type === "multiple" ? "group" : "radiogroup");
  return (
    <div data-slot="tile-group-container" className="@container w-full">
      <ToggleGroupPrimitive.Root
        data-slot="tile-group"
        className={cn("grid grid-cols-2 gap-3 @md:grid-cols-3 @2xl:grid-cols-4", className)}
        {...props}
        role={role}
      />
    </div>
  );
}

export type TileProps = ComponentProps<typeof ToggleGroupPrimitive.Item>;

/**
 * One tile. When on it takes a strong edge in the highlight colour and shows a tick in its corner, so the
 * state is not carried by colour alone. Pictures inside are decoration (`alt=""`): the TileLabel names the tile.
 */
export function Tile({ className, children, ...props }: TileProps) {
  return (
    <ToggleGroupPrimitive.Item
      data-slot="tile"
      className={cn(
        "group/tile relative flex min-w-0 flex-col overflow-hidden rounded-surface border border-border-strong bg-card text-start text-card-foreground transition-[background-color,border-color,opacity,scale] duration-instant ease-out select-none hover:bg-accent active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50 data-[state=on]:border-primary data-[state=on]:bg-highlight-soft data-[state=on]:outline-1 data-[state=on]:-outline-offset-1 data-[state=on]:outline-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none motion-reduce:active:scale-100",
        className,
      )}
      {...props}
    >
      {children}
      <span
        aria-hidden="true"
        data-slot="tile-check"
        className="absolute end-2 top-2 hidden size-6 items-center justify-center rounded-full bg-primary text-primary-foreground group-data-[state=on]/tile:inline-flex"
      >
        <Check strokeWidth={2} className="size-3.5" />
      </span>
    </ToggleGroupPrimitive.Item>
  );
}

export type TileMediaProps = ComponentProps<"span"> & {
  /** Width / height of the picture area. Default 4 / 3. The box keeps it, so nothing shifts while a picture loads. */
  aspect?: number;
};

/** The picture or icon area. A picture fills and is cropped to it; an icon is centred on a muted ground. */
export function TileMedia({ className, aspect = 4 / 3, style, ...props }: TileMediaProps) {
  return (
    <span
      data-slot="tile-media"
      className={cn(
        "flex w-full items-center justify-center overflow-hidden bg-muted text-muted-foreground [&>img]:size-full [&>img]:object-cover [&>svg]:size-8",
        className,
      )}
      style={{ aspectRatio: String(aspect), ...style }}
      {...props}
    />
  );
}

/** The tile's word: its accessible name. */
export function TileLabel({ className, ...props }: ComponentProps<"span">) {
  return <span data-slot="tile-label" className={cn("px-3 pt-2.5 text-sm font-medium last:pb-2.5", className)} {...props} />;
}

/** A line under the word. */
export function TileDescription({ className, ...props }: ComponentProps<"span">) {
  return <span data-slot="tile-description" className={cn("px-3 pt-0.5 pb-2.5 text-sm text-muted-foreground", className)} {...props} />;
}
