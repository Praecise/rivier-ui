"use client";
// Showcase: virtual-list (a list of rows of any height, a grid, going to an item, coming back to a place,
// a count that changes, rows that move, and a list that scrolls with the page).
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

type Note = { id: string; lines: number };
const NOTE_SIZE = 72;
/** Notes numbered from `from`, each one to five sentences long by its own number: a note keeps its height wherever it goes. */
const notesFrom = (from: number, count: number): Note[] => Array.from({ length: count }, (_, at) => ({ id: `n${from + at}`, lines: sentences(from + at) }));

/** A list whose count changes and whose rows move: rows are known by `getKey`, not by where they are. */
function Changing() {
  const [notes, setNotes] = useState<Note[]>(() => notesFrom(1, 300));
  const [made, setMade] = useState(300);
  const add = (count: number, where: "start" | "end"): void => {
    const more = notesFrom(made + 1, count);
    setMade(made + count);
    setNotes((all) => (where === "start" ? [...more, ...all] : [...all, ...more]));
  };
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => add(100, "end")}>
          Add 100 at the end
        </Button>
        <Button variant="outline" size="sm" onClick={() => add(1, "start")}>
          Add one at the start
        </Button>
        <Button variant="outline" size="sm" onClick={() => setNotes((all) => [...all].reverse())}>
          Reverse the order
        </Button>
        <Button variant="outline" size="sm" onClick={() => setNotes((all) => all.slice(0, 3))}>
          Keep only three
        </Button>
        <Button variant="outline" size="sm" onClick={() => setNotes([])}>
          Remove them all
        </Button>
      </div>
      <VirtualList count={notes.length} estimateSize={NOTE_SIZE} getKey={(index) => notes[index]?.id ?? index} aria-label="Notes" className="h-80 rounded-surface border bg-background">
        {(index) => {
          const note = notes[index];
          return note ? (
            <div data-note={note.id} className="border-b px-4 py-3">
              <p className="text-sm font-medium">Note {note.id.slice(1)}</p>
              <p className="mt-1 text-sm text-muted-foreground">{Array.from({ length: note.lines }, () => SENTENCE).join(" ")}</p>
            </div>
          ) : null;
        }}
      </VirtualList>
      <p className="mt-3 text-sm text-muted-foreground">
        Notes: <span data-testid="notes-count">{notes.length}</span>. First: <span data-testid="notes-first">{notes[0]?.id ?? "none"}</span>
      </p>
    </>
  );
}

const RESULTS = 2_000;

/** A list that is as long as its rows and scrolls with the page, not in a box of its own. */
function WithThePage() {
  const results = useRef<VirtualListHandle>(null);
  const [range, setRange] = useState<VirtualRange>({ start: 0, end: 0 });
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" data-testid="results-go" onClick={() => results.current?.scrollToIndex(999)}>
          Go to result 1,000
        </Button>
        <Button variant="outline" size="sm" data-testid="results-centre" onClick={() => results.current?.scrollToIndex(499, { align: "center" })}>
          Centre result 500
        </Button>
        <Button variant="outline" size="sm" data-testid="results-last" onClick={() => results.current?.scrollToIndex(RESULTS - 1, { align: "end" })}>
          Go to the last result
        </Button>
      </div>
      <p className="mb-3 truncate text-sm text-muted-foreground tabular-nums">
        In view: <span data-testid="results-start">{range.start + 1}</span> to <span data-testid="results-end">{range.end + 1}</span> of {number.format(RESULTS)}
      </p>
      {/* The room the page's sticky header takes: a result that is gone to stops under it, not behind it. */}
      <VirtualList scroll="window" handleRef={results} count={RESULTS} estimateSize={76} onRangeChange={setRange} aria-label="Two thousand results" className="scroll-mt-24 rounded-surface border bg-background">
        {(index) => (
          <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">Result {number.format(index + 1)}</p>
              <p className="mt-1 text-sm text-muted-foreground">{Array.from({ length: sentences(index) }, () => SENTENCE).join(" ")}</p>
            </div>
            <Button variant="outline" size="sm" data-testid={index === RESULTS - 1 ? "results-back" : undefined} onClick={() => results.current?.scrollToIndex(0)}>
              To the first
            </Button>
          </div>
        )}
      </VirtualList>
    </>
  );
}

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

      <Demo title="Virtual list: rows that come, go and move">
        <Changing />
      </Demo>

      <Demo title="Virtual list: the page scrolls">
        <WithThePage />
      </Demo>
    </div>
  );
}
