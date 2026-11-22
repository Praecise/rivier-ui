// Checks: the list of every component and the field that narrows it (site/src/app/components).

import type { Kit } from "../smoke-kit.ts";

export const route = "/components";

export async function run(kit: Kit): Promise<void> {
  const { check, text, count, page, sleep } = kit;
  const cards = "main ul a[href^='/components/']";

  const all = await count(cards);
  check(all > 130 && (await text("[data-testid=catalogue-count]")) === `${all} components`, `every component is listed, and counted (${all})`);
  check((await count("main section[aria-labelledby]")) === 6, "in six named groups");
  check((await page.$$eval("main section[id]", (nodes) => nodes.map((node) => node.id).join(","))) === "ui,layout,motion,three,viz,lib", "each group has an address");
  check((await page.$eval("#catalogue-filter", (node) => (node as HTMLInputElement).labels?.[0]?.textContent?.trim())) === "Find a component", "the field has a label");

  await kit.focus("#catalogue-filter");
  await page.keyboard.type("date", { delay: 20 });
  await sleep(300);
  const some = await count(cards);
  check(some > 1 && some < all / 4 && (await text("[data-testid=catalogue-count]")) === `${some} components`, `typing narrows the list (${some})`);
  check((await count("main ul a[href='/components/date-picker']")) === 1, "to what was asked for");
  check((await kit.announced()).includes(`${some} components`), `the new count is announced (${(await kit.announced()).join(" | ")})`);
  await page.keyboard.type("zzz", { delay: 20 });
  await sleep(300);
  check((await count(cards)) === 0 && (await text("main")).includes("Nothing by that name"), "a word that matches nothing says so");
  await page.$eval("#catalogue-filter", (node) => (node as HTMLInputElement).select());
  await page.keyboard.press("Backspace");
  await sleep(300);
  check((await count(cards)) === all, "clearing the field brings everything back");
}
