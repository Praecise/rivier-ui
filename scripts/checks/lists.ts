// Checks: virtual-list (VirtualList and VirtualGrid; in a box, and scrolling with the page) (site/src/app/lists).

import type { Kit } from "../smoke-kit.ts";

export const route = "/lists";

/** What a windowed box holds at this moment. */
type Shape = {
  /** Items in the page. */
  rendered: number;
  /** aria-posinset of every rendered item, in document order. */
  positions: number[];
  /** aria-setsize values found (one, when they agree). */
  sizes: number[];
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  /** The largest distance, in pixels, between the bottom of a rendered row and the top of the next one (0 is right). */
  seam: number;
  /** Different row heights among the rendered rows. */
  heights: number;
  /** Whether the rendered rows cover the whole of the box's view. */
  covers: boolean;
  /** The bottom of the last rendered row against the bottom of the content, in pixels. */
  tail: number;
};

export async function run(kit: Kit): Promise<void> {
  const { check, keys, text, attr, count, page, sleep } = kit;

  const shape = (box: string): Promise<Shape> =>
    page.evaluate((s) => {
      const element = document.querySelector(s) as HTMLElement;
      const sizer = element.firstElementChild as HTMLElement;
      const items = [...element.querySelectorAll<HTMLElement>("[role=listitem]")];
      const rows = [...sizer.children].map((row) => ({ index: Number((row as HTMLElement).dataset["row"]), rect: row.getBoundingClientRect() }));
      let seam = 0;
      for (let at = 1; at < rows.length; at += 1) {
        const before = rows[at - 1];
        const after = rows[at];
        if (!before || !after || after.index !== before.index + 1) continue;
        seam = Math.max(seam, Math.abs(after.rect.top - before.rect.bottom - 0));
      }
      const view = element.getBoundingClientRect();
      const top = view.top + element.clientTop;
      const firstRow = rows[0];
      const lastRow = rows.at(-1);
      return {
        rendered: items.length,
        positions: items.map((item) => Number(item.getAttribute("aria-posinset"))),
        sizes: [...new Set(items.map((item) => Number(item.getAttribute("aria-setsize"))))],
        scrollTop: element.scrollTop,
        scrollHeight: element.scrollHeight,
        clientHeight: element.clientHeight,
        seam,
        heights: new Set(rows.map((row) => Math.round(row.rect.height))).size,
        covers: Boolean(firstRow && lastRow && firstRow.rect.top <= top + 1 && lastRow.rect.bottom >= Math.min(top + element.clientHeight, sizer.getBoundingClientRect().bottom) - 1),
        tail: lastRow ? Math.abs(lastRow.rect.bottom - sizer.getBoundingClientRect().bottom) : -1,
      };
    }, box);
  const scrollTo = async (box: string, top: number): Promise<void> => {
    await page.evaluate((s, t) => document.querySelector(s)?.scrollTo({ top: t, behavior: "instant" }), box, top);
    await sleep(250);
  };
  /** Where an item's row sits against the top of the box's view, in pixels (not a number when it is not rendered). */
  const offsetOf = (box: string, position: number): Promise<{ top: number; bottom: number; height: number }> =>
    page.evaluate(
      (s, p) => {
        const element = document.querySelector(s) as HTMLElement;
        const item = element.querySelector<HTMLElement>(`[role=listitem][aria-posinset="${p}"]`);
        const row = item?.closest<HTMLElement>("[data-row]");
        if (!row) return { top: Number.NaN, bottom: Number.NaN, height: 0 };
        const view = element.getBoundingClientRect().top + element.clientTop;
        const rect = row.getBoundingClientRect();
        return { top: rect.top - view, bottom: rect.bottom - view, height: element.clientHeight };
      },
      box,
      position,
    );
  const atEnd = (now: Shape): boolean => now.scrollTop + now.clientHeight >= now.scrollHeight - 1.5;

  // ---- A list of ten thousand rows of different heights.
  const demo = await kit.demo("Virtual list");
  const list = `${demo} [data-slot=virtual-list]`;
  check((await attr(list, "role")) === "list" && (await attr(list, "aria-label")) === "Ten thousand rows" && (await attr(list, "tabindex")) === "0", "the list is a named list whose box takes focus");
  let now = await shape(list);
  check(now.rendered > 3 && now.rendered < 40, `only a window of the ten thousand rows is in the page (${now.rendered})`);
  check(now.positions[0] === 1 && now.sizes.length === 1 && now.sizes[0] === 10_000, `the first row says it is 1 of 10,000 (${now.positions[0]} of ${now.sizes.join("/")})`);
  check(now.positions.every((position, index) => index === 0 || position === (now.positions[index - 1] ?? 0) + 1), "the rendered rows are in order, each with its own position");
  check(now.heights > 1, `rows have different heights (${now.heights} among those rendered)`);
  check(now.seam <= 1 && now.covers, `measured rows sit one under another with no gap or overlap (${now.seam.toFixed(2)}px)`);
  check((await count(`${list} [role=listitem]:not([aria-setsize])`)) === 0, "every rendered row carries aria-setsize and aria-posinset");
  await kit.axe(demo, "the virtual list");

  // Keyboard: the box scrolls like any region.
  check(await kit.focus(list), "the box takes focus");
  await keys("PageDown");
  await sleep(500);
  now = await shape(list);
  check(now.scrollTop > 200 && (now.positions[0] ?? 0) >= 1 && now.covers, `Page Down scrolls the list (${Math.round(now.scrollTop)}px)`);
  await keys("ArrowDown");
  await sleep(300);
  check((await shape(list)).scrollTop > now.scrollTop, "Down scrolls a little further");
  await keys("End");
  await sleep(900);
  now = await shape(list);
  check(now.positions.at(-1) === 10_000 && atEnd(now), `End goes to the last row (last rendered: ${now.positions.at(-1)}, ${Math.round(now.scrollHeight - now.scrollTop - now.clientHeight)}px short)`);
  check(now.tail <= 1 && now.seam <= 1 && now.covers, `the last row ends where the content ends: the height is consistent once rows are measured (${now.tail.toFixed(2)}px)`);
  check(now.rendered < 40, `still only a window is rendered (${now.rendered})`);
  check((await text("[data-testid=list-end]")) === "10000", `the range in view is reported (${await text("[data-testid=list-start]")} to ${await text("[data-testid=list-end]")})`);
  await keys("Home");
  await sleep(900);
  now = await shape(list);
  check(now.scrollTop === 0 && now.positions[0] === 1, "Home goes back to the first row");

  // The middle, reached by the scrollbar.
  await scrollTo(list, (await shape(list)).scrollHeight / 2);
  now = await shape(list);
  check((now.positions[0] ?? 0) > 3000 && (now.positions[0] ?? 0) < 7000 && now.sizes[0] === 10_000, `dragged to the middle, the rows there say their own positions (${now.positions[0]} of ${now.sizes[0]})`);
  check(now.rendered < 40 && now.seam <= 1 && now.covers, `and fill the view with no gap (${now.rendered} rows, ${now.seam.toFixed(2)}px)`);

  // Going to a row.
  check(await kit.clickText(`${demo} button`, "Go to row 5,000"), "there is a control that goes to a row");
  await sleep(500);
  let place = await offsetOf(list, 5000);
  check(Math.abs(place.top) <= 2, `scrollToIndex puts row 5,000 at the top of the view (${place.top.toFixed(1)}px)`);
  await sleep(500);
  place = await offsetOf(list, 5000);
  check(Math.abs(place.top) <= 2, "and it stays there once the rows around it are measured");

  // Scrolling up into rows that were never measured: the row being read does not jump.
  const before = await offsetOf(list, 5000);
  await page.evaluate((s) => document.querySelector(s)?.scrollBy({ top: -260, behavior: "instant" }), list);
  await sleep(400);
  const after = await offsetOf(list, 5000);
  check(Math.abs(after.top - before.top - 260) <= 2, `scrolling up over rows of unknown height moves the view by exactly what was scrolled (${(after.top - before.top).toFixed(1)}px of 260)`);
  now = await shape(list);
  check(now.seam <= 1 && now.covers, "with no gap above");

  check(await kit.clickText(`${demo} button`, "Centre row 2,500"), "a row can be centred");
  await sleep(700);
  place = await offsetOf(list, 2500);
  check(Math.abs((place.top + place.bottom) / 2 - place.height / 2) <= 3, `align "center" puts the row in the middle (${((place.top + place.bottom) / 2).toFixed(1)} of ${place.height})`);
  check(await kit.clickText(`${demo} button`, "Go to the last row"), "the last row can be gone to");
  await sleep(700);
  now = await shape(list);
  place = await offsetOf(list, 10_000);
  check(now.positions.at(-1) === 10_000 && atEnd(now) && Math.abs(place.bottom - place.height) <= 2, `align "end" puts the last row at the bottom (${place.bottom.toFixed(1)} of ${place.height})`);

  // Focus inside a row survives scrolling it out of view.
  check(await kit.clickText(`${demo} button`, "Back to the top"), "and the first");
  await sleep(500);
  const mark = `${list} [aria-posinset="3"] button`;
  check(await kit.focus(mark), "a button inside a row takes focus");
  await scrollTo(list, 40_000);
  now = await shape(list);
  check((now.positions.at(-1) ?? 0) > 100 && now.positions[0] === 3, `scrolled far away, the focused row stays in the page, in order (${now.positions.slice(0, 3).join(", ")}…)`);
  check(await kit.focusIs(mark), "and focus is still on its button");
  await keys("Enter");
  check((await text("[data-testid=list-marked]")) === "3" && (await attr(mark, "aria-pressed")) === "true", "which still works");
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await sleep(200);
  now = await shape(list);
  check(now.positions[0] !== 3, "once focus leaves, the row is let go");
  await scrollTo(list, 0);

  // ---- A grid of five thousand cells.
  const gridDemo = await kit.demo("Virtual grid");
  const grid = `${gridDemo} [aria-label="Five thousand cells"]`;
  const columns = Number(await attr(grid, "data-columns"));
  const layout = await page.evaluate((s) => {
    const element = document.querySelector(s) as HTMLElement;
    const sizer = element.firstElementChild as HTMLElement;
    const cells = [...(sizer.firstElementChild?.children ?? [])].map((cell) => cell.getBoundingClientRect());
    return {
      width: sizer.clientWidth,
      inFirstRow: cells.length,
      sameTop: cells.every((cell) => Math.abs(cell.top - (cells[0]?.top ?? 0)) < 1),
      sameWidth: cells.every((cell) => Math.abs(cell.width - (cells[0]?.width ?? 0)) < 1),
      firstLeft: cells[0]?.left ?? 0,
      secondLeft: cells[1]?.left ?? 0,
      inside: cells.every((cell) => cell.left >= sizer.getBoundingClientRect().left - 1 && cell.right <= sizer.getBoundingClientRect().right + 1),
    };
  }, grid);
  check(columns === Math.floor((layout.width + 8) / 128) && layout.inFirstRow === columns, `as many columns as fit the box (${columns} in ${layout.width}px)`);
  check(kit.phone ? columns === 2 : columns >= 5, `${kit.phone ? "two columns at 390 px" : "five or more at 1440 px"} (${columns})`);
  check(layout.sameTop && layout.sameWidth && layout.inside, "the cells of a row share a line and a width, inside the box");
  check(kit.dir === "rtl" ? layout.firstLeft > layout.secondLeft : layout.firstLeft < layout.secondLeft, `the first cell is at the ${kit.dir === "rtl" ? "right" : "left"}: the grid follows the page's direction`);
  now = await shape(grid);
  check((await attr(grid, "role")) === "list" && now.positions[0] === 1 && now.sizes.length === 1 && now.sizes[0] === 5000, "it is one list: the first cell is 1 of 5,000");
  check(now.rendered < columns * 14 && now.rendered >= columns * 3, `only a window of the cells is in the page (${now.rendered})`);
  check(now.positions.every((position, index) => index === 0 || position === (now.positions[index - 1] ?? 0) + 1), "the cells are in reading order");
  await kit.axe(gridDemo, "the virtual grid");
  check(await kit.clickText(`${gridDemo} button`, "Go to cell 2,500"), "a cell can be gone to");
  await sleep(500);
  place = await offsetOf(grid, 2500);
  check(Math.abs(place.top) <= 2, `its row comes to the top of the view (${place.top.toFixed(1)}px)`);
  check(await kit.focus(grid), "the grid's box takes focus");
  const gridTop = (await shape(grid)).scrollTop;
  await keys("PageDown");
  await sleep(500);
  check((await shape(grid)).scrollTop > gridTop + 100, `and scrolls from the keyboard (${Math.round((await shape(grid)).scrollTop - gridTop)}px)`);
  await keys("End");
  await sleep(400);
  now = await shape(grid);
  check(now.positions.at(-1) === 5000 && atEnd(now), "End goes to the last cell");
  await keys("Home");
  await sleep(400);
  now = await shape(grid);
  check(now.scrollTop === 0 && now.positions[0] === 1, "Home to the first");
  check(await kit.clickText(`${gridDemo} button`, "Go to the last cell"), "the last cell can be gone to");
  await sleep(600);
  now = await shape(grid);
  check(now.positions.at(-1) === 5000 && atEnd(now) && now.tail <= 1, `the last cell is 5,000 of 5,000, at the end of the content (${now.tail.toFixed(2)}px)`);
  const lines = await page.evaluate((s) => {
    const rows = [...((document.querySelector(s) as HTMLElement).firstElementChild?.children ?? [])].map((row) => ({ index: Number((row as HTMLElement).dataset["row"]), rect: row.getBoundingClientRect() }));
    return rows.every((row, at) => at === 0 || rows[at - 1]?.index !== row.index - 1 || Math.abs(row.rect.top - (rows[at - 1]?.rect.bottom ?? 0) - 8) <= 1);
  }, grid);
  check(lines, "lines of cells are one gap apart");
  await scrollTo(grid, 0);
  const small = `${gridDemo} [aria-label="Seven cells in three columns"]`;
  const smallRows = await page.evaluate((s) => [...((document.querySelector(s) as HTMLElement).firstElementChild?.children ?? [])].map((row) => row.children.length), small);
  check((await attr(small, "data-columns")) === "3" && smallRows.join(",") === "3,3,1", `a fixed number of columns, with a short last line (${smallRows.join(",")})`);

  // ---- A count that changes, and rows that move: heights are kept by key.
  const changing = await kit.demo("Virtual list: rows that come, go and move");
  const notes = `${changing} [data-slot=virtual-list]`;
  const ESTIMATE = 72;
  /** The notes in the page, in order, and how far their heights are from the estimate, taken together. */
  const drawnNotes = (): Promise<{ ids: string[]; extra: number; heights: Record<string, number> }> =>
    page.evaluate(
      (s, estimate) => {
        const rows = [...document.querySelectorAll<HTMLElement>(`${s} [data-row]`)].map((row) => ({ id: row.querySelector<HTMLElement>("[data-note]")?.dataset["note"] ?? "", height: row.getBoundingClientRect().height }));
        return { ids: rows.map((row) => row.id), extra: rows.reduce((sum, row) => sum + row.height - estimate, 0), heights: Object.fromEntries(rows.map((row) => [row.id, row.height])) };
      },
      notes,
      ESTIMATE,
    );
  /** The position (aria-posinset) a note says it has; 0 when it is not in the page. */
  const placeOf = (id: string): Promise<number> => page.evaluate((s, note) => Number(document.querySelector(`${s} [data-note="${note}"]`)?.closest("[role=listitem]")?.getAttribute("aria-posinset") ?? 0), notes, id);
  const noteCount = (): Promise<string> => text("[data-testid=notes-count]");
  /**
   * Every note that has been in the page since this was first called, with the height it had: a row that
   * was drawn has been measured, also one that was drawn for a moment and let go. Returns how far those
   * heights are from the estimate, taken together.
   */
  const everDrawn = (): Promise<number> =>
    page.evaluate(
      (s, estimate) => {
        const host = window as unknown as { __notes?: Map<string, number> };
        const sizer = (document.querySelector(s) as HTMLElement).firstElementChild as HTMLElement;
        const look = (): void => {
          for (const row of sizer.children) {
            const id = row.querySelector<HTMLElement>("[data-note]")?.dataset["note"];
            if (id) host.__notes?.set(id, row.getBoundingClientRect().height);
          }
        };
        if (!host.__notes) {
          host.__notes = new Map();
          new MutationObserver(look).observe(sizer, { childList: true, subtree: true });
        }
        look();
        return [...host.__notes.values()].reduce((sum, height) => sum + height - estimate, 0);
      },
      notes,
      ESTIMATE,
    );
  await sleep(300);
  await everDrawn();
  now = await shape(notes);
  const start = await drawnNotes();
  check(now.positions[0] === 1 && now.sizes.length === 1 && now.sizes[0] === 300 && start.ids[0] === "n1", `a list of rows known by a key starts at its first (${start.ids[0]}, 1 of ${now.sizes[0]})`);
  check(Math.abs(now.scrollHeight - (300 * ESTIMATE + start.extra)) <= 3 && Math.abs(start.extra) > 20, `its length is the estimate for rows not yet seen plus what the drawn rows measure (${now.scrollHeight}px, ${Math.round(start.extra)}px from the estimate)`);

  // Reordering: the rows drawn before keep their measured heights although they are now somewhere else.
  check(await kit.clickText(`${changing} button`, "Reverse the order"), "the order can be reversed");
  await sleep(400);
  const turned = await drawnNotes();
  const after1 = await shape(notes);
  check(turned.ids[0] === "n300" && after1.positions[0] === 1 && after1.sizes[0] === 300, `after a reorder the row now first says it is 1 of 300 (${turned.ids[0]})`);
  const known = await everDrawn();
  check(!turned.ids.includes("n1") && Math.abs(after1.scrollHeight - (300 * ESTIMATE + known)) <= 3, `rows that moved keep the heights measured for them: the length is the estimate plus what every row drawn so far measures, before the reorder or after (${after1.scrollHeight}px, expected ${Math.round(300 * ESTIMATE + known)}px)`);
  check(after1.seam <= 1 && after1.covers, "with no gap or overlap");
  await scrollTo(notes, 1_000_000);
  await sleep(300);
  const ended = await drawnNotes();
  const after2 = await shape(notes);
  check(ended.ids.at(-1) === "n1" && after2.positions.at(-1) === 300 && atEnd(after2) && after2.tail <= 1, `the row that was first is now last, at the end of the content (${ended.ids.at(-1)}, ${after2.tail.toFixed(2)}px)`);
  check(Math.abs((ended.heights["n1"] ?? 0) - (start.heights["n1"] ?? -1)) <= 0.5, `and is as tall there as it was (${ended.heights["n1"]}px)`);
  await kit.clickText(`${changing} button`, "Reverse the order");
  await sleep(400);
  check((await drawnNotes()).ids.at(-1) === "n300" && (await placeOf("n300")) === 300, "reversed again, the rows are back in their first order");

  // The count grows: the rows being read stay where they are.
  await scrollTo(notes, 6000);
  await sleep(300);
  now = await shape(notes);
  const held = now.positions[5] ?? 0;
  const heldId = (await drawnNotes()).ids[5] ?? "";
  const heldAt = await offsetOf(notes, held);
  check(await kit.clickText(`${changing} button`, "Add 100 at the end"), "rows can be added at the end");
  await sleep(400);
  const grown = await shape(notes);
  check((await noteCount()) === "400" && grown.sizes.length === 1 && grown.sizes[0] === 400, `when the count grows every row says the new total (${grown.sizes.join("/")})`);
  check(grown.scrollTop === now.scrollTop && Math.abs((await offsetOf(notes, held)).top - heldAt.top) <= 1 && (await placeOf(heldId)) === held, "and the rows in view have not moved");
  check(Math.abs(grown.scrollHeight - now.scrollHeight - 100 * ESTIMATE) <= 1, `the content is longer by the estimate for the new rows (${grown.scrollHeight - now.scrollHeight}px)`);

  // A row added before the others: every row after it is one further on, and keeps its own height.
  check(await kit.clickText(`${changing} button`, "Add one at the start"), "a row can be added at the start");
  await sleep(400);
  const shifted = await shape(notes);
  check((await text("[data-testid=notes-first]")) === "n401" && shifted.sizes[0] === 401, "the list has a new first row");
  check((await placeOf(heldId)) === held + 1,`a row that was ${held} of 400 is now ${held + 1} of 401`);
  const sofar = await everDrawn();
  check(shifted.seam <= 1 && shifted.covers && Math.abs(shifted.scrollHeight - (401 * ESTIMATE + sofar)) <= 4, `measured heights went with their rows: nothing overlaps, and the length is still the estimate plus what the rows drawn so far measure (${shifted.scrollHeight}px, expected ${Math.round(401 * ESTIMATE + sofar)}px)`);
  await kit.axe(changing, "the list whose rows change");

  // The count shrinks below where the view was.
  await scrollTo(notes, 1_000_000);
  check(await kit.clickText(`${changing} button`, "Keep only three"), "the list can be cut short");
  await sleep(500);
  const cut = await shape(notes);
  check((await noteCount()) === "3" && cut.rendered === 3 && cut.positions.join() === "1,2,3" && cut.sizes.join() === "3", `cut to three rows while scrolled to the end, the three are drawn: no blank (${cut.positions.join()} of ${cut.sizes.join()})`);
  check(cut.scrollTop <= Math.max(0, cut.scrollHeight - cut.clientHeight) + 1 && cut.covers && cut.seam <= 1 && cut.tail <= 1, `and the view is inside the shorter content (${Math.round(cut.scrollTop)}px of ${cut.scrollHeight}px)`);
  check(await kit.clickText(`${changing} button`, "Remove them all"), "the list can be emptied");
  await sleep(300);
  check((await noteCount()) === "0" && (await count(`${notes} [role=listitem]`)) === 0 && (await page.evaluate((s) => (document.querySelector(s)?.firstElementChild as HTMLElement).offsetHeight, notes)) === 0, "an empty list draws nothing and has no length");

  // ---- A list that scrolls with the page.
  const paged = await kit.demo("Virtual list: the page scrolls");
  const results = `${paged} [data-slot=virtual-list]`;
  type PageShape = { rendered: number; positions: number[]; sizes: number[]; seam: number; covers: boolean; length: number; inner: boolean; scrollY: number; view: number; atBottom: boolean };
  const pageShape = (): Promise<PageShape> =>
    page.evaluate((s) => {
      const element = document.querySelector(s) as HTMLElement;
      const sizer = element.firstElementChild as HTMLElement;
      const items = [...element.querySelectorAll<HTMLElement>("[role=listitem]")];
      const rows = [...sizer.children].map((row) => ({ index: Number((row as HTMLElement).dataset["row"]), rect: row.getBoundingClientRect() }));
      let seam = 0;
      for (let at = 1; at < rows.length; at += 1) {
        const before = rows[at - 1];
        const after = rows[at];
        if (!before || !after || after.index !== before.index + 1) continue;
        seam = Math.max(seam, Math.abs(after.rect.top - before.rect.bottom));
      }
      const view = document.documentElement.clientHeight;
      const box = sizer.getBoundingClientRect();
      const from = Math.max(0, box.top);
      const to = Math.min(view, box.bottom);
      // Of the rows that follow one another (a row kept for its focus may stand apart), the first and the last.
      const run = rows.filter((row, at) => at === 0 || row.index === (rows[at - 1]?.index ?? -2) + 1 || row.index === (rows[at + 1]?.index ?? -2) - 1);
      const firstRow = run[0];
      const lastRow = run.at(-1);
      return {
        rendered: items.length,
        positions: items.map((item) => Number(item.getAttribute("aria-posinset"))),
        sizes: [...new Set(items.map((item) => Number(item.getAttribute("aria-setsize"))))],
        seam,
        covers: to <= from || Boolean(firstRow && lastRow && firstRow.rect.top <= from + 1 && lastRow.rect.bottom >= to - 1),
        length: element.offsetHeight,
        inner: element.scrollHeight > element.clientHeight + 1 || getComputedStyle(element).overflowY !== "visible",
        scrollY: window.scrollY,
        view,
        atBottom: window.scrollY + view >= document.documentElement.scrollHeight - 2,
      };
    }, results);
  /** Where a result's row is in the window (not numbers when it is not in the page). */
  const resultAt = (position: number): Promise<{ top: number; bottom: number }> =>
    page.evaluate(
      (s, p) => {
        const row = document.querySelector(`${s} [role=listitem][aria-posinset="${p}"]`)?.closest("[data-row]");
        const rect = row?.getBoundingClientRect();
        return rect ? { top: rect.top, bottom: rect.bottom } : { top: Number.NaN, bottom: Number.NaN };
      },
      results,
      position,
    );
  const scrollPage = async (by: number): Promise<void> => {
    await page.evaluate((amount) => window.scrollBy({ top: amount, behavior: "instant" }), by);
    await sleep(300);
  };
  check((await attr(results, "role")) === "list" && (await attr(results, "aria-label")) === "Two thousand results" && (await attr(results, "data-scroll")) === "window", "a list that scrolls with the page is still a named list");
  check((await attr(results, "tabindex")) === null, "it is not a Tab stop: the page already scrolls from the keyboard");
  let whole = await pageShape();
  check(!whole.inner && whole.length > 2000 * 60, `it has no box of its own: it is as long as its rows (${whole.length}px)`);
  check(whole.rendered > 3 && whole.rendered < 40 && whole.positions[0] === 1 && whole.sizes.join() === "2000", `yet only a window of the two thousand is in the page (${whole.rendered}), the first saying 1 of 2,000`);
  await scrollPage(5000);
  whole = await pageShape();
  check((whole.positions[0] ?? 0) > 20 && whole.rendered < 40 && whole.covers && whole.seam <= 1, `scrolling the page brings other rows, which fill the window with no gap (${whole.positions[0]} to ${whole.positions.at(-1)})`);
  check(Number(await text("[data-testid=results-start]")) > 20 && Number(await text("[data-testid=results-end]")) > Number(await text("[data-testid=results-start]")), `the range in view is reported (${await text("[data-testid=results-start]")} to ${await text("[data-testid=results-end]")})`);

  // Going to a row scrolls the page, and stops under the sticky header.
  const headroom = await page.evaluate((s) => Number.parseFloat(getComputedStyle(document.querySelector(s) as Element).scrollMarginTop), results);
  const header = await page.evaluate(() => [...document.querySelectorAll("body div")].find((node) => getComputedStyle(node).position === "sticky")?.getBoundingClientRect().bottom ?? -1);
  check(headroom > 0 && header > 0 && header <= headroom, `the list leaves room for the page's sticky header (${headroom}px for a header of ${Math.round(header)}px)`);
  check(await kit.click("[data-testid=results-go]"), "there is a control that goes to a result");
  await sleep(600);
  let spot = await resultAt(1000);
  check(Math.abs(spot.top - headroom) <= 2, `scrollToIndex scrolls the page until result 1,000 is just under the header (${spot.top.toFixed(1)}px)`);
  await sleep(500);
  spot = await resultAt(1000);
  whole = await pageShape();
  check(Math.abs(spot.top - headroom) <= 2 && whole.covers && whole.seam <= 1, "and it stays there once the rows around it are measured");
  await scrollPage(-260);
  const moved = await resultAt(1000);
  check(Math.abs(moved.top - spot.top - 260) <= 2 && (await pageShape()).covers, `scrolling up over rows of unknown height moves the page by exactly what was scrolled (${(moved.top - spot.top).toFixed(1)}px of 260)`);
  check(await kit.click("[data-testid=results-centre]"), "a result can be centred");
  await sleep(800);
  spot = await resultAt(500);
  whole = await pageShape();
  check(Math.abs((spot.top + spot.bottom) / 2 - (headroom + (whole.view - headroom) / 2)) <= 3, `align "center" puts it in the middle of what the header leaves (${((spot.top + spot.bottom) / 2).toFixed(1)} in ${whole.view})`);
  check(await kit.click("[data-testid=results-last]"), "the last result can be gone to");
  await sleep(800);
  spot = await resultAt(2000);
  whole = await pageShape();
  check(whole.positions.at(-1) === 2000 && Math.abs(spot.bottom - whole.view) <= 2, `align "end" puts the last result at the bottom of the window (${spot.bottom.toFixed(1)} of ${whole.view})`);
  check(await kit.click("[data-testid=results-back]"), "a control inside a row can go to the first");
  await sleep(800);
  spot = await resultAt(1);
  whole = await pageShape();
  check(whole.positions[0] === 1 && Math.abs(spot.top - headroom) <= 2, `the first result comes back under the header (${spot.top.toFixed(1)}px)`);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await sleep(200);

  // The keys are the page's.
  await keys("End");
  await sleep(700);
  whole = await pageShape();
  check(whole.atBottom && whole.positions.at(-1) === 2000 && whole.covers, `End goes to the end of the page, where the last results are drawn (${whole.positions.at(-1)})`);
  await keys("Home");
  await sleep(700);
  whole = await pageShape();
  check(whole.scrollY === 0, `and Home to its top (${Math.round(whole.scrollY)}px)`);
  await kit.demo("Virtual list: the page scrolls");
  whole = await pageShape();
  check(whole.positions[0] === 1 && whole.rendered < 40, "where the list starts again at its first rows");
  await kit.axe(paged, "the list that scrolls with the page");

  // ---- Restoration: the place survives a reload.
  const restore = await kit.demo("Scroll restoration");
  const places = `${restore} [data-slot=virtual-list]`;
  now = await shape(places);
  check(now.scrollTop === 0 && now.positions[0] === 1, "with nothing saved the list starts at the top");
  await kit.axe(restore, "the list with a restore key");
  await scrollTo(places, 31_337);
  await sleep(400);
  now = await shape(places);
  const anchor = (now.positions[0] ?? 0) + 6;
  const left = await offsetOf(places, anchor);
  const saved = await page.evaluate(() => window.sessionStorage.getItem("rui-virtual:showcase-places"));
  check(saved !== null && saved.includes("index"), `the place is saved for the tab (${saved})`);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-lab-ready]", { timeout: 60_000 });
  await sleep(900);
  await kit.demo("Scroll restoration");
  const back = await offsetOf(places, anchor);
  check(Math.abs(back.top - left.top) <= 2, `after a reload the same row is at the same place (row ${anchor}: ${left.top.toFixed(1)}px before, ${back.top.toFixed(1)}px after)`);
  now = await shape(places);
  check(now.seam <= 1 && now.covers && now.rendered < 40, "with the rows around it rendered and measured");
  await page.evaluate(() => window.sessionStorage.removeItem("rui-virtual:showcase-places"));
}
