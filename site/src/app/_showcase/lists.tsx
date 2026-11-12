"use client";
// Showcase: virtual-list (a list of rows of any height, a grid, going to an item, coming back to a place).
//
// Everything is made from the index, with no randomness, so the browser checks can say what row 5,000 holds.

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { VirtualGrid, VirtualList, type VirtualListHandle, type VirtualRange } from "@/components/ui/virtual-list";
import { Demo } from "./demo";

const ROWS = 10_000;
const CELLS = 5_000;
const PLACES = 2_000;
const SENTENCE = "Each row is measured once it is drawn, and the rows not yet seen are estimated.";
const number = new Intl.NumberFormat("en");

/** One to five sentences, by the index alone. */
const sentences = (index: number): number => ((index * 7) % 5) + 1;

export function Lists() {
  const list = useRef<VirtualListHandle>(null);
  const grid = useRef<VirtualListHandle>(null);
  const [range, setRange] = useState<VirtualRange>({ start: 0, end: 0 });
  const [marked, setMarked] = useState<number | null>(null);

  return (
    <div className="grid gap-6">
      <Demo title="Virtual list">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => list.current?.scrollToIndex(4999)}>
            Go to row 5,000
          </Button>
          <Button variant="outline" size="sm" onClick={() => list.current?.scrollToIndex(2499, { align: "center" })}>
            Centre row 2,500
          </Button>
          <Button variant="outline" size="sm" onClick={() => list.current?.scrollToIndex(ROWS - 1, { align: "end" })}>
            Go to the last row
          </Button>
          <Button variant="outline" size="sm" onClick={() => list.current?.scrollToIndex(0)}>
            Back to the top
          </Button>
        </div>
        <VirtualList
          handleRef={list}
          count={ROWS}
          estimateSize={88}
          onRangeChange={setRange}
          aria-label="Ten thousand rows"
          className="h-96 rounded-surface border bg-background"
        >
          {(index) => (
            <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">Row {number.format(index + 1)}</p>
                <p className="mt-1 text-sm text-muted-foreground">{Array.from({ length: sentences(index) }, () => SENTENCE).join(" ")}</p>
              </div>
              <Button variant="outline" size="sm" aria-pressed={marked === index} onClick={() => setMarked(marked === index ? null : index)}>
                Mark {number.format(index + 1)}
              </Button>
            </div>
          )}
        </VirtualList>
        <p className="mt-3 text-sm text-muted-foreground">
          In view: rows <span data-testid="list-start">{range.start + 1}</span> to <span data-testid="list-end">{range.end + 1}</span> of {number.format(ROWS)}. Marked:{" "}
          <span data-testid="list-marked">{marked === null ? "none" : marked + 1}</span>
        </p>
      </Demo>

      <Demo title="Virtual grid">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => grid.current?.scrollToIndex(2499)}>
            Go to cell 2,500
          </Button>
          <Button variant="outline" size="sm" onClick={() => grid.current?.scrollToIndex(CELLS - 1, { align: "end" })}>
            Go to the last cell
          </Button>
        </div>
        <VirtualGrid handleRef={grid} count={CELLS} columns={{ minWidth: 120 }} gap={8} estimateSize={96} aria-label="Five thousand cells" className="h-96 rounded-surface border bg-background p-2">
          {(index) => (
            <div className="flex h-24 items-center justify-center rounded-control border bg-card text-sm tabular-nums">
              {number.format(index + 1)}
            </div>
          )}
        </VirtualGrid>
        <VirtualGrid count={7} columns={3} gap={8} estimateSize={64} aria-label="Seven cells in three columns" className="mt-4 h-40 rounded-surface border bg-background p-2">
          {(index) => <div className="flex h-14 items-center justify-center rounded-control border bg-card text-sm tabular-nums">{index + 1}</div>}
        </VirtualGrid>
      </Demo>

      <Demo title="Scroll restoration">
        <p className="mb-3 max-w-prose text-sm text-muted-foreground">
          This list has a <code>restoreKey</code>: scroll it, reload the page or go away and come back, and it opens where it was left. The place is kept for the tab.
        </p>
        <VirtualList count={PLACES} estimateSize={60} restoreKey="showcase-places" aria-label="Two thousand places" className="h-72 rounded-surface border bg-background">
          {(index) => (
            <div className="border-b px-4 py-3 text-sm">
              <p className="font-medium">Place {number.format(index + 1)}</p>
              {index % 3 === 0 ? <p className="mt-1 text-muted-foreground">Every third place has a second line, so the rows are not all one height.</p> : null}
            </div>
          )}
        </VirtualList>
      </Demo>
    </div>
  );
}
