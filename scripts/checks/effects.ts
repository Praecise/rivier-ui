// Checks: word-rotate, pattern, animated-beam, orbit, confetti, point-cloud, model-annotations
// (site/src/app/effects).

import type { Kit } from "../smoke-kit.ts";

export const route = "/effects";

export async function run(kit: Kit): Promise<void> {
  const { check, text, attr, count, page } = kit;

  const words = await kit.demo("Word rotate and pattern");
  check((await text(`${words} [data-slot=word-rotate] .sr-only`)) === "teams, schools, or newsrooms", "word-rotate: screen readers hear the whole list once");
  check((await attr(`${words} [data-slot=pattern]`, "aria-hidden")) === "true", "pattern: hidden from screen readers");
  await kit.sleep(2600);
  const settled = await page.evaluate((s) => document.querySelector(`${s} [data-slot=word-rotate] > span:last-child`)?.textContent ?? "", words);
  check(settled === "newsrooms", `word-rotate: once through the list, it rests on the last word (${settled})`);

  const beam = await kit.demo("Animated beam");
  await kit.sleep(200);
  check((await attr(`${beam} [data-slot=animated-beam]`, "aria-hidden")) === "true", "animated-beam: decoration, hidden from screen readers");
  check((await count(`${beam} [data-slot=animated-beam] circle`)) === 8, "animated-beam: a row of dots along the line");

  const orbit = await kit.demo("Orbit");
  check((await count(`${orbit} [data-slot=orbit] .sr-only li`)) === 4, "orbit: every item is named in a list");

  const party = await kit.demo("Confetti");
  check((await attr("[data-slot=confetti]", "aria-hidden")) === "true", "confetti: hidden from screen readers");
  check((await page.$eval("[data-slot=confetti]", (node) => getComputedStyle(node).pointerEvents)) === "none", "confetti: it never takes a click");
  check(await kit.clickText(`${party} button`, "Publish the report"), "confetti: the button can be pressed");
  check((await text("[data-testid=cheered]")) === "Published.", "confetti: the success is said in words too");

  const cloud = await kit.demo("Point cloud");
  check((await page.evaluate((s) => document.querySelector(s)?.querySelectorAll("[data-slot=chart-table] caption").length ?? 0, cloud)) >= 1, "point-cloud: a table beside the scene");
  const tables = await page.evaluate(
    (s) => [...document.querySelectorAll(`${s} [data-slot=chart-table]`)].map((t) => `${t.querySelector("caption")?.textContent}:${t.querySelectorAll("tbody tr").length}`),
    cloud,
  );
  check(tables.includes("Ninety finds:90"), `point-cloud: every point is a row (${tables.join(", ")})`);

  const notes = await kit.demo("Model annotations");
  check((await count(`${notes} [data-slot=model-annotations-list] li`)) === 3, "model-annotations: every note is in a list as well");
  check((await count(`${notes} [data-slot=model-annotations] button`)) === 3, "model-annotations: a label for each point over the scene");

  // Reduced motion: the orbit and the beam stand still.
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  const moving = await page.evaluate(
    () => [...document.querySelectorAll("[data-slot=orbit] div, [data-slot=animated-beam] circle")].filter((node) => getComputedStyle(node).animationName !== "none").length,
  );
  check(moving === 0, `under reduced motion nothing turns or pulses (${moving})`);
  await page.emulateMediaFeatures([]);

  await kit.axe("main", "after the checks");
}
