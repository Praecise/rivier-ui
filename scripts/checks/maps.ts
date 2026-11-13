// Checks: geo-map and its layers (site/src/app/maps): the map's name and keys (pan, zoom, reset), its buttons,
// the wheel that zooms only with Ctrl, each layer's name, table and arrow-key reading, the legend in words, the
// scale bar, tiles from the project's address with their attribution, and the map inside map-frame.

import type { Kit } from "../smoke-kit.ts";

export const route = "/maps";

export async function run(kit: Kit): Promise<void> {
  const { check, keys, text, attr, count, page } = kit;
  const zoom = (): Promise<string> => text("[data-testid=map-zoom]");

  /** A layer: named, focusable, with a table, read by arrow keys and shown in a tooltip. */
  const layer = async (demo: string, name: string, rows: number | null, first: string): Promise<void> => {
    const selector = `${demo} [data-slot=geo-layer][aria-label="${name}"]`;
    check((await count(selector)) === 1 && (await attr(selector, "tabindex")) === "0", `layer "${name}": a named group in the Tab order`);
    const tables = await page.evaluate(
      (d, n) => [...document.querySelectorAll(`${d} [data-slot=chart-table]`)].filter((t) => t.querySelector("caption")?.textContent === n).map((t) => t.querySelectorAll("tbody tr").length),
      demo,
      name,
    );
    check(tables.length === 1 && (rows === null ? (tables[0] ?? 0) > 0 : tables[0] === rows), `layer "${name}": its data is a table (${tables.join(", ")} rows)`);
    await page.mouse.move(1, 1);
    check(await kit.focus(selector), `layer "${name}": takes focus`);
    await keys("ArrowRight");
    const said = (await kit.announced()).at(-1) ?? "";
    check(said.startsWith(first), `layer "${name}": the first arrow reads the first item (${said})`);
    check((await count(`${demo} [data-slot=geo-map-overlay] [data-slot=chart-tooltip]`)) === 1, `layer "${name}": the item is shown in a tooltip`);
    await keys("End");
    check(((await kit.announced()).at(-1) ?? "") !== said, `layer "${name}": End reads the last item`);
    await keys("Escape");
    check((await count(`${demo} [data-slot=geo-map-overlay] [data-slot=chart-tooltip]`)) === 0, `layer "${name}": Escape lets go`);
  };

  // The map itself.
  const classes = await kit.demo("Choropleth in classes");
  const svg = `${classes} [data-slot=geo-map-svg]`;
  check((await attr(svg, "role")) === "application" && (await attr(svg, "aria-roledescription")) === "map", "geo-map: the map is an application described as a map");
  check((await attr(svg, "aria-label")) === "Invented coast: rate by district", "geo-map: the map is named");
  const help = await attr(svg, "aria-describedby");
  check(Boolean(help) && (await text(`[id="${help}"]`)).includes("Arrow keys"), "geo-map: the map says how to use it");
  check(await kit.focus(svg), "geo-map: the map takes focus");
  await keys("+");
  check((await zoom()).startsWith("1.50"), `geo-map: + zooms in (${await zoom()})`);
  check(((await kit.announced()).at(-1) ?? "") === "Zoom 1.5×", "geo-map: the zoom is said");
  const before = await zoom();
  await keys("ArrowLeft");
  check((await zoom()) !== before, `geo-map: an arrow key moves the map (${await zoom()})`);
  await keys("-");
  check((await zoom()).startsWith("1.00"), "geo-map: - zooms out");
  await keys("0");
  check((await zoom()) === "1.00 0 0", "geo-map: 0 resets the view");
  check((await attr(`${classes} [aria-label="Reset the view"]`, "disabled")) !== null, "geo-map: reset is disabled when there is nothing to reset");
  check(await kit.click(`${classes} [aria-label="Zoom in"]`), "geo-map: the zoom-in button can be pressed");
  check((await zoom()).startsWith("1.50"), "geo-map: the button zooms in");
  check(await kit.click(`${classes} [aria-label="Reset the view"]`), "geo-map: the reset button can be pressed");
  check((await zoom()) === "1.00 0 0", "geo-map: the button resets");

  // The wheel zooms only with Ctrl, so the page still scrolls over a map.
  if (!kit.phone) {
    const box = await page.evaluate((s) => {
      const r = document.querySelector(s)?.getBoundingClientRect();
      return r ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null;
    }, svg);
    if (box) {
      await page.mouse.move(box.x, box.y);
      await page.mouse.wheel({ deltaY: -200 });
      await kit.sleep(200);
      check((await zoom()).startsWith("1.00"), "geo-map: the wheel alone does not zoom");
      await page.keyboard.down("Control");
      await page.mouse.wheel({ deltaY: -200 });
      await page.keyboard.up("Control");
      await kit.sleep(200);
      check(Number((await zoom()).split(" ")[0]) > 1, `geo-map: the wheel with Ctrl zooms (${await zoom()})`);
      await kit.click(`${classes} [aria-label="Reset the view"]`);
    }
  }

  await layer(classes, "Rate by district", 21, "District A1: Rate (%)");
  check((await count(`${classes} [data-slot=choropleth-legend] li`)) === 4, "choropleth-legend: one step per class");
  check((await text(`${classes} [data-slot=choropleth-legend] li:first-child`)) === "Below 15", "choropleth-legend: a class's range is in words");
  check((await text(`${classes} [data-slot=choropleth-legend] li:last-child`)) === "35 and above", "choropleth-legend: the top class is open");
  check((await text(`${classes} [data-slot=geo-scale-bar]`)).includes("km"), `geo-scale-bar: a distance in words (${await text(`${classes} [data-slot=geo-scale-bar]`)})`);

  const markers = await kit.demo("Markers and bubbles");
  await layer(markers, "Towns", 7, "Harbour");
  const routes = await kit.demo("Routes");
  await layer(routes, "Sailings", 6, "Harbour to Millford");
  check(
    (await kit.announced()).some((said) => said.includes("Sailings a week")),
    "geo-routes: a route says its amount",
  );
  const hexbin = await kit.demo("Hexagon bins");
  check((await count(`${hexbin} [data-slot=geo-hexbin] polygon`)) > 4, "geo-hexbin: the points are gathered into cells");
  await layer(hexbin, "Sightings", null, "");

  const tiles = await kit.demo("Tiles");
  const images = await page.evaluate((d) => [...document.querySelectorAll(`${d} [data-slot=geo-tiles] image`)].map((i) => i.getAttribute("href") ?? ""), tiles);
  check(images.length > 0 && images.every((href) => /^\/tiles\/\d+\/\d+\/\d+$/.test(href)), `geo-tiles: tiles from the project's address (${images.length}, ${images[0] ?? ""})`);
  check((await text(`${tiles} [data-slot=geo-tiles-attribution]`)) === "Tiles drawn by this site", "geo-tiles: the attribution is shown");

  // In map-frame: nothing until asked, then the map, which works as before.
  const frame = await kit.demo("In a map frame");
  check((await count(`${frame} [data-slot=geo-map]`)) === 0, "map-frame: the map is not drawn before it is asked for");
  check(await kit.clickText(`${frame} button`, "Show the map"), "map-frame: the map can be asked for");
  await kit.sleep(400);
  check((await count(`${frame} [data-slot=geo-map-svg]`)) === 1, "map-frame: the geo-map is drawn inside the frame");
  await layer(frame, "Rate by district", 21, "District A1");

  await kit.axe("main", "after the checks");
}
