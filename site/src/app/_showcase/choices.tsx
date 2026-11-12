"use client";
// Showcase: chips, segmented control, number stepper.

import { Leaf, Music, Soup, Telescope } from "lucide-react";
import { useRef, useState } from "react";
import { Chip, ChipButton, ChipGroup, ChipGroupItem, ChipRemove } from "@/components/ui/chip";
import { Label } from "@/components/ui/label";
import { NumberStepper, NumberStepperDecrement, NumberStepperIncrement, NumberStepperInput } from "@/components/ui/number-stepper";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import { Tile, TileDescription, TileGroup, TileLabel, TileMedia } from "@/components/ui/tile-group";
import { Demo } from "./demo";

const FILTERS = ["Under 50", "This weekend", "Outdoors"];

export function Choices() {
  const [filters, setFilters] = useState(FILTERS);
  const [asked, setAsked] = useState("nothing yet");
  const [moods, setMoods] = useState<string[]>(["calm"]);
  const [view, setView] = useState("list");
  const [nights, setNights] = useState(2);
  const [days, setDays] = useState<string[]>(["quiet"]);
  const reset = useRef<HTMLButtonElement>(null);

  return (
    <div className="grid gap-4 @3xl:grid-cols-2">
      <Demo title="Chips: filters and suggestions">
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filters in effect">
            {filters.map((filter) => (
              <Chip key={filter}>
                {filter}
                <ChipRemove
                  aria-label={`Remove the filter: ${filter}`}
                  onClick={() => {
                    setFilters((current) => current.filter((item) => item !== filter));
                    reset.current?.focus();
                  }}
                />
              </Chip>
            ))}
            <ChipButton ref={reset} variant="muted" onClick={() => setFilters(FILTERS)}>
              Reset filters
            </ChipButton>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Suggestions">
            {["Only this weekend", "Closer to me", "Something quieter"].map((suggestion) => (
              <ChipButton key={suggestion} variant="soft" onClick={() => setAsked(suggestion)}>
                {suggestion}
              </ChipButton>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Asked: <span data-testid="asked">{asked}</span>
          </p>
        </div>
      </Demo>

      <Demo title="Chips: choosing">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <p id="mood-label" className="text-sm font-medium">
              Mood (several)
            </p>
            <ChipGroup type="multiple" value={moods} onValueChange={setMoods} aria-labelledby="mood-label">
              {["calm", "lively", "curious", "hungry", "outdoors"].map((mood) => (
                <ChipGroupItem key={mood} value={mood} className="capitalize">
                  {mood}
                </ChipGroupItem>
              ))}
            </ChipGroup>
            <p className="text-sm text-muted-foreground">
              Chosen: <span data-testid="moods">{moods.join(", ") || "none"}</span>
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <p id="time-label" className="text-sm font-medium">
              Time of day (one, uncontrolled)
            </p>
            <ChipGroup type="single" defaultValue="morning" aria-labelledby="time-label">
              <ChipGroupItem value="morning">Morning</ChipGroupItem>
              <ChipGroupItem value="afternoon">Afternoon</ChipGroupItem>
              <ChipGroupItem value="evening">Evening</ChipGroupItem>
            </ChipGroup>
          </div>
        </div>
      </Demo>

      <Demo title="Segmented control">
        <div className="flex flex-col gap-5">
          <SegmentedControl value={view} onValueChange={setView} aria-label="View">
            <SegmentedControlItem value="list">List</SegmentedControlItem>
            <SegmentedControlItem value="grid">Grid</SegmentedControlItem>
            <SegmentedControlItem value="map">Map</SegmentedControlItem>
          </SegmentedControl>
          <p className="text-sm text-muted-foreground">
            View: <span data-testid="view">{view}</span>
          </p>
          <SegmentedControl defaultValue="week" aria-label="Period" size="sm" className="w-full">
            <SegmentedControlItem value="day">Day</SegmentedControlItem>
            <SegmentedControlItem value="week">Week</SegmentedControlItem>
            <SegmentedControlItem value="month">Month</SegmentedControlItem>
            <SegmentedControlItem value="year" disabled>
              Year
            </SegmentedControlItem>
          </SegmentedControl>
        </div>
      </Demo>

      <Demo title="Number stepper">
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="adults">Adults</Label>
            <NumberStepper id="adults" defaultValue={2} min={1} max={12} name="adults" valueText={(value) => `${value} adult${value === 1 ? "" : "s"}`} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="nights">Nights (controlled)</Label>
            <NumberStepper id="nights" value={nights} onValueChange={setNights} min={1} max={30}>
              <NumberStepperDecrement aria-label="One night fewer" />
              <NumberStepperInput />
              <NumberStepperIncrement aria-label="One night more" />
            </NumberStepper>
          </div>
          <p className="text-sm text-muted-foreground">
            Nights: <span data-testid="nights">{nights}</span>
          </p>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="weight">Weight in kg (step 0.5)</Label>
            <NumberStepper id="weight" defaultValue={1.5} min={0} max={10} step={0.5} />
          </div>
        </div>
      </Demo>
      <Demo title="Tiles" className="@3xl:col-span-2">
        <div className="flex flex-col gap-3">
          <p id="day-label" className="text-sm font-medium">
            What kind of day? (several)
          </p>
          <TileGroup type="multiple" value={days} onValueChange={setDays} aria-labelledby="day-label">
            <Tile value="quiet">
              <TileMedia>
                <Leaf aria-hidden="true" strokeWidth={1.5} />
              </TileMedia>
              <TileLabel>Quiet</TileLabel>
              <TileDescription>Gardens and slow walks</TileDescription>
            </Tile>
            <Tile value="lively">
              <TileMedia>
                <Music aria-hidden="true" strokeWidth={1.5} />
              </TileMedia>
              <TileLabel>Lively</TileLabel>
              <TileDescription>Music and markets</TileDescription>
            </Tile>
            <Tile value="curious">
              <TileMedia>
                <Telescope aria-hidden="true" strokeWidth={1.5} />
              </TileMedia>
              <TileLabel>Curious</TileLabel>
              <TileDescription>Workshops and museums</TileDescription>
            </Tile>
            <Tile value="hungry" disabled>
              <TileMedia>
                <Soup aria-hidden="true" strokeWidth={1.5} />
              </TileMedia>
              <TileLabel>Hungry</TileLabel>
              <TileDescription>Not offered this week</TileDescription>
            </Tile>
          </TileGroup>
          <p className="text-sm text-muted-foreground">
            Chosen: <span data-testid="days">{days.join(", ") || "none"}</span>
          </p>
        </div>
      </Demo>
    </div>
  );
}
