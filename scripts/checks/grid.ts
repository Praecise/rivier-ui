// Checks: data-grid (site/src/app/grid): the grid pattern (one tab stop, arrow keys, controls in cells),
// sorting said aloud, a filter and the search, pages, choosing rows, editing a cell, hiding a column, groups
// that open and close, and two thousand rows drawn only where they are seen.

import type { Kit } from "../smoke-kit.ts";

export const route = "/grid";

export async function run(kit: Kit): Promise<void> {
  const { check, keys, text, attr, count, page } = kit;
  const forward = kit.dir === "rtl" ? "ArrowLeft" : "ArrowRight";

  const orders = await kit.demo("Orders");
  const grid = `${orders} [role=grid]`;
  check((await attr(grid, "aria-label")) === "Orders", "data-grid: the grid is named");
  check(
    (await attr(grid, "aria-rowcount")) === "59" && (await attr(grid, "aria-colcount")) === "8",
    `data-grid: it states its rows and columns (${await attr(grid, "aria-rowcount")}, ${await attr(grid, "aria-colcount")})`,
  );
  check((await count(`${grid} [tabindex="0"]`)) === 1, "data-grid: one cell is in the Tab order");
  check(await kit.focus(`${grid} [tabindex="0"]`), "data-grid: the grid takes focus at its first cell");
  await keys(forward);
  check((await kit.focused()) === "Sort by Order", `data-grid: an arrow key moves to the next cell's control (${await kit.focused()})`);
  await keys("Enter");
  check((await attr(`${grid} th:nth-child(2)`, "aria-sort")) === "ascending", "data-grid: Enter on a header sorts by it");
  check(((await kit.announced()).at(-1) ?? "") === "Sorted by Order, ascending", "data-grid: the sort is said");
  await keys(forward, "Enter");
  check((await text(`${grid} tbody tr:first-child td:nth-child(3)`)) === "Alder & Co", `data-grid: rows follow the sort (${await text(`${grid} tbody tr:first-child td:nth-child(3)`)})`);
  await keys("Enter");
  check((await attr(`${grid} th:nth-child(3)`, "aria-sort")) === "descending", "data-grid: a second press sorts the other way");
  await keys("ArrowDown");
  check((await kit.focused()) === "Filter Customer", "data-grid: Down from a header reaches its filter");
  await page.keyboard.type("Fern");
  await kit.sleep(200);
  const filtered = await text(`${orders} [data-slot=data-grid-status]`);
  check(/^\d+ of 57$/.test(filtered) && filtered !== "57 of 57", `data-grid: the filter narrows the rows (${filtered})`);
  await page.keyboard.down("Control");
  await page.keyboard.press("a");
  await page.keyboard.up("Control");
  await page.keyboard.press("Backspace");
  await kit.sleep(150);
  check((await text(`${orders} [data-slot=data-grid-status]`)) === "57 of 57", "data-grid: clearing the filter brings every row back");
  check((await text(`${orders} [data-slot=data-grid-footer]`)).includes("Page 1 of 6"), "data-grid: pages are counted");
  check(await kit.click(`${orders} [aria-label="Next page"]`), "data-grid: the next-page button can be pressed");
  check((await text(`${orders} [data-slot=data-grid-footer]`)).includes("Page 2 of 6"), "data-grid: the next page is shown");
  await kit.click(`${orders} [aria-label="Previous page"]`);

  check(await kit.click(`${orders} [aria-label="Choose row 1"]`), "data-grid: a row's checkbox is named");
  check((await text("[data-testid=grid-selected]")).length > 0 && (await text("[data-testid=grid-selected]")) !== "none", "data-grid: choosing a row reports its id");
  check((await attr(`${grid} tbody tr:first-child`, "aria-selected")) === "true", "data-grid: the chosen row says so");

  // Editing the first total.
  check(await kit.focus(`${grid} [data-cell="2:6"]`), "data-grid: a cell can be focused");
  await keys("Enter");
  check(await kit.focusIs(`${grid} [data-cell="2:6"] input`), "data-grid: Enter on an editable cell opens a field");
  await page.keyboard.down("Control");
  await page.keyboard.press("a");
  await page.keyboard.up("Control");
  await page.keyboard.type("99");
  await keys("Enter");
  check((await text(`${grid} [data-cell="2:6"]`)) === "$99.00", `data-grid: Enter keeps the new value (${await text(`${grid} [data-cell="2:6"]`)})`);
  check(await kit.focusIs(`${grid} [data-cell="2:6"]`), "data-grid: focus goes back to the cell");

  // Hiding a column.
  check(await kit.clickText(`${orders} button`, "Columns"), "data-grid: the columns menu opens");
  check(await kit.clickText("[role=menuitemcheckbox]", "City"), "data-grid: a column can be hidden");
  await keys("Escape");
  check((await count(`${grid} thead tr:first-child th`)) === 7, "data-grid: the hidden column is gone");

  // Groups.
  const grouped = await kit.demo("Grouped by status");
  const groups = `${grouped} [role=grid] tr[data-group] button[aria-expanded]`;
  check((await count(groups)) === 4, "data-grid: one row per group");
  check((await text(`${grouped} [role=grid] tr[data-group] td:nth-child(5)`)).length > 0, "data-grid: a group row shows its total");
  const before = await count(`${grouped} [role=grid] tbody tr`);
  check(await kit.click(groups), "data-grid: a group can be closed");
  check((await attr(groups, "aria-expanded")) === "false" && (await count(`${grouped} [role=grid] tbody tr`)) < before, "data-grid: a closed group hides its rows and says so");

  // Many rows.
  const many = await kit.demo("Two thousand rows");
  check((await attr(`${many} [role=grid]`, "aria-rowcount")) === "2002", "data-grid: two thousand rows are counted");
  const drawn = await count(`${many} [role=grid] tbody tr[aria-rowindex]`);
  check(drawn < 120, `data-grid: only the rows in view are drawn (${drawn})`);
  await page.evaluate((s) => {
    const scroller = document.querySelector(`${s} [data-slot=data-grid-scroller]`);
    if (scroller) scroller.scrollTop = scroller.scrollHeight;
  }, many);
  await kit.sleep(300);
  check(
    (await text(`${many} [role=grid] tbody tr:nth-last-child(1) td:first-child, ${many} [role=grid] tbody tr[aria-rowindex="2002"] td:first-child`)).length >= 0 &&
      (await count(`${many} [role=grid] tbody tr[aria-rowindex="2002"]`)) === 1,
    "data-grid: scrolling to the end draws the last row",
  );

  await kit.axe("main", "after the checks");
}
