// Checks: virtual-list (VirtualList and VirtualGrid) (site/src/app/lists).

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
