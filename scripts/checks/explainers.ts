// Checks: explainer and explainer-spec (site/src/app/explainers): a spec becomes a named film with a scene
// for each entry; renderAt draws any moment the same way every time, with that scene's captions and
// provenance label; the map's camera moves with the scene's time; the label's sources open in a popover;
// the film plays and is scrubbed by keys; a spec with faults shows them in words.

import type { Kit } from "../smoke-kit.ts";

export const route = "/explainers";

export async function run(kit: Kit): Promise<void> {
  const { check, keys, text, attr, count, page } = kit;

  const first = await kit.demo("From a spec");
  const stage = `${first} [data-slot=explainer]`;
  check((await attr(stage, "role")) === "group" && (await attr(stage, "aria-label")) === "How the river rose", "explainer: the film is a group named by the spec's title");
  check((await attr(stage, "lang")) === "en", "explainer: the film carries the spec's language");
  check((await count(`${first} [data-slot=scene-strip-item]`)) === 7, `explainer: one scene per entry of the spec (${await count(`${first} [data-slot=scene-strip-item]`)})`);

  // Playing and scrubbing.
  const time = (): Promise<string> => text(`${first} [data-slot=film-stage-time]`);
  const start = await time();
  check(await kit.click(`${first} [data-slot=film-stage-controls] button[aria-label=Play]`), "explainer: the play button can be pressed");
  await kit.sleep(1500);
  check((await time()) !== start, `explainer: the film plays (${start} → ${await time()})`);
  check(await kit.click(`${first} [data-slot=film-stage-controls] button[aria-label=Pause]`), "explainer: the film can be paused");
  check(await kit.focus(`${first} [data-slot=scrubber] [role=slider]`), "explainer: the time bar takes focus");
  const before = await attr(`${first} [data-slot=scrubber] [role=slider]`, "aria-valuenow");
  await keys("ArrowRight");
  check((await attr(`${first} [data-slot=scrubber] [role=slider]`, "aria-valuenow")) !== before, "explainer: an arrow key moves through the film");

  // The film drawn for export: renderAt(t) draws the moment, the same each time.
  const exported = await kit.demo("Drawn for export");
  const frame = `${exported} [data-slot=film-stage-frame]`;
  check((await page.evaluate(() => typeof (window as unknown as { __filmStage?: Record<string, unknown> }).__filmStage?.["demo"])) === "object", "explainer: exportName puts the handle on the page");
  const at = async (seconds: number): Promise<void> => {
    await page.evaluate((t) => (window as unknown as { __filmStage: Record<string, { renderAt: (t: number) => Promise<number> }> }).__filmStage["demo"]?.renderAt(t), seconds);
    await kit.sleep(150);
  };
  const provenance = (): Promise<string> => text(`${frame} [data-slot=provenance-label-text]`);
  const caption = (): Promise<string> => text(`${frame} [data-slot=captions-text]`);

  await at(1);
  check((await text(`${frame} [data-slot=explainer-title] h2`)) === "How the river rose", "title scene: the title is drawn");
  check((await caption()) === "Two weeks in an invented town.", `title scene: its caption shows (${await caption()})`);
  check((await count(`${frame} [data-slot=provenance-label]`)) === 0, "title scene: no provenance label where none is given");

  await at(4);
  check((await count(`${frame} [data-slot=explainer-chart] [data-slot=line-chart]`)) === 1, "chart scene: the chart named in the spec is drawn from its data");
  check((await provenance()) === "Measured: gauge readings", `chart scene: the provenance label says how it was made (${await provenance()})`);
  check((await caption()) === "The river rose for six days.", "chart scene: its caption shows on the film's clock");
  const early = await page.evaluate((f) => (document.querySelector(`${f} [data-slot=explainer-chart] > div`) as HTMLElement | null)?.style.opacity ?? "", frame);
  await at(3.1);
  const sameA = await page.evaluate((f) => (document.querySelector(`${f} [data-slot=explainer-chart] > div`) as HTMLElement | null)?.style.opacity ?? "", frame);
  await at(5);
  await at(3.1);
  const sameB = await page.evaluate((f) => (document.querySelector(`${f} [data-slot=explainer-chart] > div`) as HTMLElement | null)?.style.opacity ?? "", frame);
  check(sameA === sameB && Number(sameA) < 1 && early === "1", `renderAt: a moment is drawn the same every time (${sameA}, ${sameB}; settled ${early})`);

  // The label's sources.
  await at(4);
  check(await kit.click(`${frame} [data-slot=provenance-label] button`), "provenance: the label with sources is a button");
  check((await text("[data-slot=provenance-label-details]")).includes("Gauge at the old bridge"), "provenance: its sources open in a popover");
  await keys("Escape");

  await at(8.2);
  check((await count(`${frame} [data-slot=explainer-map] [data-slot=geo-map-svg]`)) === 1, "map scene: a geo-map is drawn from the spec's GeoJSON");
  check((await provenance()) === "Reconstruction: from photographs and reports", "map scene: its provenance label");
  const startPath = await attr(`${frame} [data-slot=choropleth] path`, "d");
  await at(12.8);
  check((await attr(`${frame} [data-slot=choropleth] path`, "d")) !== startPath, "map scene: the camera moves with the scene's time");

  await at(14);
  check(
    (await count(`${frame} [data-slot=explainer-compare] [data-slot=compare-slider-first]`)) === 1 || (await count(`${frame} [data-slot=explainer-compare]`)) === 1,
    "compare scene: a then-and-now slider",
  );
  check((await provenance()) === "Invented for illustration: drawn for this example", "compare scene: its provenance label");
  await at(18);
  check((await count(`${frame} [data-slot=explainer-model] [data-slot=model-viewer]`)) === 1, "model scene: a model viewer");
  check((await provenance()) === "Made by a model: a computed model", "model scene: its provenance label");
  await at(21);
  check((await text(`${frame} [data-slot=explainer-quote] blockquote`)).includes("We moved everything upstairs"), "quote scene: the words");
  await at(26);
  check((await text(`${frame} [data-slot=explainer-caption] p`)).startsWith("The level is back to normal"), "caption scene: the words over the picture");

  // Reduced motion: the entrance is final at once.
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await kit.sleep(200);
  await at(3.1);
  const still = await page.evaluate((f) => (document.querySelector(`${f} [data-slot=explainer-chart] > div`) as HTMLElement | null)?.style.opacity ?? "", frame);
  check(still === "1", `reduced motion: a scene's entrance is drawn in its final state (${still})`);
  await page.emulateMediaFeatures([]);
  // Left on a settled moment: mid-entrance, text is faint by design.
  await at(4);

  // A spec to edit: faults in words.
  const write = await kit.demo("Write a spec");
  check((await count(`${write} [data-slot=explainer]`)) === 1, "editor: a sound spec plays");
  check(await kit.clickText(`${write} button`, "Load a spec with faults"), "editor: a broken spec can be loaded");
  const faults = await text(`${write} [data-slot=explainer-faults]`);
  check((await attr(`${write} [data-slot=explainer-faults]`, "role")) === "alert", "faults: shown as an alert");
  check(faults.includes("not milliseconds"), "faults: a duration in milliseconds is caught and explained");
  check(faults.includes("same id as an earlier scene"), "faults: a repeated id is caught");
  check(faults.includes('chart must be one of "line-chart"'), "faults: an unknown chart lists the known ones");
  check(faults.includes("provenance.kind must be one of"), "faults: an unknown provenance kind lists the four");
  check(faults.includes("geojson must be a GeoJSON FeatureCollection"), "faults: a map without GeoJSON is caught");
  check((await count(`${write} [data-slot=explainer]`)) === 0, "faults: no film is played from a broken spec");

  await kit.axe("main", "after the checks");
}
