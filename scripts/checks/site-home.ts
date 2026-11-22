// Checks: the site's landing page, its header, the light or dark switch and search (site/src/app/page.tsx).

import type { Kit } from "../smoke-kit.ts";

export const route = "/";

export async function run(kit: Kit): Promise<void> {
  const { check, keys, text, attr, count, page, sleep } = kit;

  check((await count("h1")) === 1 && (await text("h1")).startsWith("Components you own"), "one first-level heading, and it says what the library is");
  check((await attr("a[href='#main']", "href")) === "#main" && (await count("main#main")) === 1, "a skip link leads to the main region");
  if (!kit.phone) {
    const links = await page.$$eval("[data-slot=navbar-links] a", (nodes) => nodes.map((node) => node.textContent?.trim()));
    check(links.join(", ") === "Docs, Components, Showcase, Theming, Changelog", `the header names the sections (${links.join(", ")})`);
  } else {
    check((await attr("[data-slot=navbar-menu-button]", "aria-label")) === "Open menu", "at phone width the sections are behind a named menu button");
  }
  check((await count("[data-slot=collage] [data-slot=otp-input] input")) === 4 && (await count("[data-slot=collage] [data-slot=toolbar]")) === 1, "the opening shows components working");
  check((await count("[data-slot=code-block] button[aria-label=\"Copy the command\"]")) === 1, "the install command has a named copy button");
  check((await count("[data-slot=theme-panel]")) === 1, "the theme switches are on the page");

  // Light or dark: one press, and the button says what the next press does.
  const before = await attr("[data-slot=mode-switch]", "aria-label");
  check(before === "Switch to dark" || before === "Switch to light", `the mode switch is named (${before})`);
  const ground = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  check(await kit.click("[data-slot=mode-switch]"), "the mode switch can be pressed");
  await sleep(300);
  check((await page.evaluate(() => getComputedStyle(document.body).backgroundColor)) !== ground, "pressing it changes the ground");
  check((await attr("[data-slot=mode-switch]", "aria-label")) !== before, "and renames the button");
  await kit.click("[data-slot=mode-switch]");
  await sleep(300);
  await kit.axe("main", "the page in the mode it started in");

  // Search: Ctrl K opens it, typing narrows, Enter goes there.
  await page.keyboard.down("Control");
  await page.keyboard.press("k");
  await page.keyboard.up("Control");
  await sleep(900);
  check((await count("[role=dialog]")) === 1, "Ctrl K opens search");
  check(await kit.focusIs("[role=dialog] input"), "focus is in its field");
  check((await count("[role=dialog] [role=option]")) > 100, `it lists the pages and every component (${await count("[role=dialog] [role=option]")})`);
  await page.keyboard.type("otp-input", { delay: 20 });
  await sleep(300);
  const first = await text("[role=dialog] [role=option][aria-selected=true] span span");
  check(first === "otp-input", `typing narrows the list to what was asked for (${first})`);
  await keys("Escape");
  await sleep(400);
  check((await count("[role=dialog]")) === 0, "Escape closes it");
  check(await kit.click("[data-slot=search-button]"), "the search button opens it too");
  await sleep(500);
  await page.keyboard.type("otp-input", { delay: 20 });
  await sleep(300);
  await keys("Enter");
  await page.waitForFunction(() => location.pathname === "/components/otp-input", { timeout: 20_000 }).catch(() => undefined);
  await page.waitForSelector("[data-lab-ready]", { timeout: 20_000 }).catch(() => undefined);
  check((await page.evaluate(() => location.pathname)) === "/components/otp-input", "Enter goes to the page");
  await sleep(600);
}
