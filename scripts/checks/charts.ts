// Checks: the charts added on 2026-11-13 (site/src/app/charts): every chart names itself, carries its data as
// a table, is read by arrow keys with what it reads said through its live region and shown in a tooltip, and
// lets go on Escape. Then what is particular to each: zooming a hierarchy, a calendar's day and week keys,
// a brush's handles, a bullet list's roving focus.

import type { KeyInput } from "puppeteer-core";
import type { Kit } from "../smoke-kit.ts";

export const route = "/charts";

export async function run(kit: Kit): Promise<void> {
  const { check, keys, text, attr, count, page } = kit;

  /** The common pattern of a chart: name, table, keys, live region, tooltip, Escape. */
  const chart = async (title: string, slot: string, rows: number | null, first: KeyInput = "ArrowRight"): Promise<string> => {
    const demo = await kit.demo(title);
    const root = `${demo} [data-slot=${slot}]`;
    const svg = `${root} [data-slot=chart-svg]`;
    check((await attr(svg, "role")) === "application" && Boolean(await attr(svg, "aria-label")), `${slot}: the chart is named (${await attr(svg, "aria-label")})`);
    // The first chart of the demonstration: some show two.
    const tableRows = await page.evaluate((r) => document.querySelector(r)?.querySelectorAll("[data-slot=chart-table] tbody tr").length ?? 0, root);
    check(rows === null ? tableRows > 0 : tableRows === rows, `${slot}: its data is a table for screen readers (${tableRows} rows)`);
    // The pointer rests in a corner, so a chart scrolled under it does not take the reading from the keys.
    await page.mouse.move(1, 1);
    check(await kit.focus(svg), `${slot}: the chart takes focus`);
    await keys(first);
    const said = await text(`${root} [data-slot=chart] > span[aria-live]`);
    check(said.length > 0, `${slot}: the first key reads an item aloud (${said.slice(0, 80)})`);
    check((await count(`${root} [data-slot=chart-tooltip]`)) === 1, `${slot}: the item read is shown in a tooltip`);
    await keys("End");
    const end = await text(`${root} [data-slot=chart] > span[aria-live]`);
    check(end.length > 0 && end !== said, `${slot}: End reads the last item (${end.slice(0, 80)})`);
    await keys("Escape");
    check((await count(`${root} [data-slot=chart-tooltip]`)) === 0, `${slot}: Escape lets go`);
    return root;
  };

  await chart("Scatter and bubble", "scatter-chart", 36);
  await chart("Histogram", "histogram", null);
  await chart("Box plot and violin", "box-plot", 4);
  const fan = await chart("Fan chart", "fan-chart", 24);
  check((await count(`${fan} [data-slot=fan-chart-legend] li`)) === 4, "fan-chart: its legend names observed, median and both intervals");

  const multiples = await kit.demo("Small multiples");
  check((await count(`${multiples} [data-slot=small-multiples-panel]`)) === 6, "small-multiples: one panel per region");
  check((await count(`${multiples} [data-slot=chart-table] tbody tr`)) === 72, "small-multiples: one table holds every panel's data");
  check(await kit.focus(`${multiples} [data-slot=small-multiples-panel] [data-slot=chart-svg]`), "small-multiples: a panel takes focus");
  await keys("ArrowRight");
  check((await text(`${multiples} [data-slot=small-multiples-panel] [data-slot=chart] > span[aria-live]`)).startsWith("North"), "small-multiples: a panel reads its own name with the value");

  const shares = await chart("Bars to 100 percent", "bar-chart", 4);
  check(
    (await text(`${shares} [data-slot=chart-table] tbody tr td`)).includes("%"),
    `bar-chart normalize: the table keeps the amount and adds the share (${await text(`${shares} [data-slot=chart-table] tbody tr td`)})`,
  );

  // Treemap: Enter opens the group of the part being read; the trail and Backspace go back.
  const treemap = await chart("Treemap", "treemap", 14);
  await kit.focus(`${treemap} [data-slot=chart-svg]`);
  await keys("ArrowRight", "Enter");
  check((await text("[data-testid=treemap-path]")) === "Housing", `treemap: Enter opens the part's group (${await text("[data-testid=treemap-path]")})`);
  check((await attr(`${treemap} [data-slot=chart-trail] [aria-current=location]`, "aria-current")) === "location", "treemap: the trail marks where one is");
  await keys("Backspace");
  check((await text("[data-testid=treemap-path]")) === "Top", "treemap: Backspace goes back out");
  await keys("ArrowRight", "Enter");
  check(await kit.clickText(`${treemap} [data-slot=chart-trail] button`, "All spending"), "treemap: the trail's first step is a button");
  check((await text("[data-testid=treemap-path]")) === "Top", "treemap: the trail goes back out");

  const sunburst = await chart("Sunburst", "sunburst", 14);
  await kit.focus(`${sunburst} [data-slot=chart-svg]`);
  await keys("ArrowRight", "Enter");
  check((await text(`${sunburst} [data-slot=chart-trail] [aria-current=location]`)) === "Housing", "sunburst: Enter opens the ring being read");
  check(await kit.clickText(`${sunburst} button`, "Back one level"), "sunburst: a button goes back one level");

  await chart("Circle packing", "circle-pack", 14);
  await chart("Sankey", "sankey-chart", 6);
  const network = await chart("Network graph", "network-graph", 12);
  check((await text(`${network} [data-slot=chart-table] tbody tr td:last-child`)).length > 0, "network-graph: the table lists each node's links");

  // Calendar heatmap: Down is the next day, Right a week on.
  const calendar = await chart("Calendar heatmap", "calendar-heatmap", null);
  await kit.focus(`${calendar} [data-slot=chart-svg]`);
  await keys("ArrowRight", "ArrowDown");
  const day = await text(`${calendar} [data-slot=chart] > span[aria-live]`);
  check(day.includes("January 2, 2026"), `calendar-heatmap: Down goes to the next day (${day})`);
  await keys("ArrowRight");
  check((await text(`${calendar} [data-slot=chart] > span[aria-live]`)).includes("January 9, 2026"), "calendar-heatmap: Right goes a week on");
  await keys("Escape");

  const gantt = await chart("Gantt chart", "gantt-chart", 7, "ArrowDown");
  await kit.focus(`${gantt} [data-slot=chart-svg]`);
  await keys("ArrowDown", "ArrowDown");
  check((await text(`${gantt} [data-slot=chart] > span[aria-live]`)).startsWith("Design"), "gantt-chart: Down reads the next task");
  check((await text(`${gantt} [data-slot=chart] > span[aria-live]`)).includes("After Research"), "gantt-chart: a task says what it waits for");

  await chart("Density", "density-chart", 340);
  await chart("Radar", "radar-chart", 6);
  const waterfall = await chart("Waterfall", "waterfall-chart", 6);
  check((await text(`${waterfall} [data-slot=chart-table] tbody tr:nth-child(2) td`)).includes("Fall"), "waterfall-chart: a fall is said in words, not only by colour");
  await chart("Funnel", "funnel-chart", 4);
  await chart("Candlestick", "candlestick-chart", 30);
  await chart("Chord diagram", "chord-diagram", 20);
  await chart("Parallel coordinates", "parallel-coordinates", 14);
  await chart("Dot plot", "dot-plot", 5);
  await chart("Stream", "stream-chart", 12);
  await chart("Slope", "slope-chart", 4);

  // Bullet: a list with one tab stop; arrows move between rows.
  const bullet = await kit.demo("Bullet");
  check((await count(`${bullet} [data-slot=bullet-chart] li[tabindex="0"]`)) === 1, "bullet-chart: one row is in the Tab order");
  check(await kit.focus(`${bullet} [data-slot=bullet-chart] li[tabindex="0"]`), "bullet-chart: a row takes focus");
  check((await kit.focused()).startsWith("Revenue: Value 270, Target 250"), `bullet-chart: a row says its value and target (${await kit.focused()})`);
  await keys("ArrowDown");
  check((await kit.focused()).startsWith("New customers"), "bullet-chart: Down moves to the next row");
  await keys("End");
  check((await kit.focused()).startsWith("Satisfaction"), "bullet-chart: End moves to the last row");

  // Brush: two named handles with the dates in words; moving one changes the range.
  const brush = await kit.demo("Brush");
  check((await count(`${brush} [data-slot=chart-brush] [role=slider]`)) === 2, "chart-brush: two handles");
  check((await attr(`${brush} [data-slot=chart-brush] [role=slider]`, "aria-label")) === "From", "chart-brush: a handle is named");
  check((await attr(`${brush} [data-slot=chart-brush] [role=slider]`, "aria-valuetext"))?.includes("2026") ?? false, "chart-brush: a handle says its date in words");
  check(await kit.focus(`${brush} [data-slot=chart-brush] [role=slider]`), "chart-brush: a handle takes focus");
  await keys("ArrowLeft");
  check((await text("[data-testid=brush-range]")) === "119–179", `chart-brush: the arrow key moves the window's start (${await text("[data-testid=brush-range]")})`);
  check((await count(`${brush} [data-slot=line-chart] [data-slot=chart-table] tbody tr`)) === 61, "chart-brush: the chart shows the rows in the window");

  // Reduced motion: nothing in the charts animates.
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  const animated = await page.evaluate(() => [...document.querySelectorAll("main [data-slot=chart-svg]")].filter((node) => getComputedStyle(node).animationName !== "none").length);
  check(animated === 0, `under reduced motion no chart animates (${animated})`);
  await page.emulateMediaFeatures([]);

  await kit.axe("main", "after the checks");
}
