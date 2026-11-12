#!/usr/bin/env node
// Rivier UI: drives the showcase site in a real browser and fails on what a type-check cannot see.
//
//   npm run site:build ; npm run site:start        (in one terminal)
//   npm run smoke -- http://localhost:3320 "<path to Edge or Chrome>"
//
// At desktop and phone widths, in light and dark, it checks: no page or console errors, no sideways
// overflow, the theme switches really change computed styles (mode, roundness, highlight), overlays open and
// close and return focus, and charts and 3D mount. Screenshots go to .smoke/.

import { mkdirSync } from "node:fs";
import { join } from "node:path";
import puppeteer, { type Browser, type ElementHandle, type Page } from "puppeteer-core";
import { libraryDir } from "./registry.ts";

const url = process.argv[2] ?? "http://localhost:3320";
const executablePath = process.argv[3] ?? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const outDir = join(libraryDir, ".smoke");
mkdirSync(outDir, { recursive: true });

const failures: string[] = [];
const passes: string[] = [];
const check = (ok: boolean, what: string): void => {
  (ok ? passes : failures).push(what);
  console.log(`  ${ok ? "ok  " : "FAIL"} ${what}`);
};
const sleep = (ms: number): Promise<void> => new Promise((done) => setTimeout(done, ms));

/** Scrolls through the whole page so content that waits for the viewport mounts. */
async function scrollThrough(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const step = Math.round(window.innerHeight * 0.8);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((done) => setTimeout(done, 120));
    }
    window.scrollTo(0, 0);
  });
  await sleep(400);
}

const computed = (page: Page, selector: string, property: string): Promise<string> =>
  page.evaluate((s, p) => getComputedStyle(document.querySelector(s) as Element).getPropertyValue(p), selector, property);

async function clickText(page: Page, selector: string, text: string): Promise<boolean> {
  const handle = await page.evaluateHandle(
    (s, t) => [...document.querySelectorAll<HTMLElement>(s)].find((element) => element.textContent?.trim() === t && element.offsetParent !== null) ?? null,
    selector,
    text,
  );
  const element = handle.asElement();
  if (!element) return false;
  await (element as ElementHandle<HTMLElement>).scrollIntoView();
  await sleep(250);
  await (element as ElementHandle<HTMLElement>).click();
  return true;
}

async function run(browser: Browser, width: number, height: number, label: string): Promise<void> {
  console.log(`\n${label} (${width}x${height})`);
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(`page error: ${(error as Error).message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  await page.setViewport({ width, height, deviceScaleFactor: 1, isMobile: width < 600, hasTouch: width < 600 });
  // Not "networkidle": 3D scenes keep a headless, software-rendered browser busy for good.
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForSelector("[data-slot=theme-panel]", { timeout: 60_000 });
  await sleep(2500);
  await scrollThrough(page);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(overflow <= 0, `no sideways overflow (${overflow}px)`);

  // Theme: mode.
  const press = async (text: string): Promise<void> => {
    check(await clickText(page, "[data-slot=theme-panel] button", text), `theme switch "${text}" found`);
    await sleep(350);
  };
  await press("light");
  const lightBg = await computed(page, "body", "background-color");
  await page.screenshot({ path: join(outDir, `${label}-light.png`), fullPage: true });
  await press("dark");
  const darkBg = await computed(page, "body", "background-color");
  check(lightBg !== darkBg, `dark mode changes the ground (${lightBg} -> ${darkBg})`);
  await scrollThrough(page);
  await page.screenshot({ path: join(outDir, `${label}-dark.png`), fullPage: true });

  // Theme: roundness.
  await press("none");
  const square = await computed(page, "[data-slot=button]", "border-radius");
  await press("full");
  const pill = await computed(page, "[data-slot=button]", "border-radius");
  const card = await computed(page, "[data-slot=card]", "border-radius");
  check(parseFloat(square) === 0 && parseFloat(pill) > 100, `roundness: button ${square} -> ${pill}`);
  check(parseFloat(card) > 0 && parseFloat(card) < 100, `roundness: a card stays a card at "full" (${card})`);
  await page.screenshot({ path: join(outDir, `${label}-dark-full.png`), fullPage: true });

  // Theme: highlight colour.
  // The theme is remembered between visits, so start from a known colour.
  await (await page.$('[data-slot=theme-panel] button[aria-label="teal"]'))?.click();
  await sleep(350);
  const before = await computed(page, "[data-slot=button]", "background-color");
  const violet = await page.$('[data-slot=theme-panel] button[aria-label="violet"]');
  await violet?.click();
  await sleep(350);
  const after = await computed(page, "[data-slot=button]", "background-color");
  check(before !== after, `highlight colour changes the solid button (${before} -> ${after})`);
  await press("md");
  await press("light");
  await page.screenshot({ path: join(outDir, `${label}-light-violet-md.png`), fullPage: true });

  // Overlays: dialog opens, closes with Escape, focus returns to the opener.
  check(await clickText(page, "button", "Open dialog"), "dialog opener found");
  await sleep(500);
  check((await page.$("[role=dialog]")) !== null, "dialog opens");
  await page.screenshot({ path: join(outDir, `${label}-dialog.png`) });
  await page.keyboard.press("Escape");
  await sleep(500);
  check((await page.$("[role=dialog]")) === null, "dialog closes with Escape");
  check(await page.evaluate(() => document.activeElement?.textContent?.trim() === "Open dialog"), "focus returns to the opener");

  check(await clickText(page, "button", "Open sheet"), "sheet opener found");
  await sleep(500);
  check((await page.$("[role=dialog]")) !== null, "sheet opens");
  await page.keyboard.press("Escape");
  await sleep(500);

  await (await page.$("[data-testid=palette]"))?.click();
  await sleep(500);
  check((await page.$("[cmdk-input]")) !== null, "command palette opens");
  await page.keyboard.type("sett");
  await sleep(200);
  check((await page.$$("[cmdk-item]")).length === 1, "command palette filters");
  await page.keyboard.press("Escape");
  await sleep(400);

  await (await page.$("[data-testid=toast]"))?.click();
  await sleep(600);
  check((await page.$("[data-sonner-toast]")) !== null, "toast appears");

  check(await clickText(page, "button", "Options"), "dropdown opener found");
  await sleep(400);
  check((await page.$("[role=menu]")) !== null, "dropdown menu opens");
  await page.keyboard.press("Escape");
  await sleep(300);

  // Charts and 3D.
  const charts = await page.$$eval("[data-slot=chart] svg, [data-slot=sparkline] svg, svg[data-slot=sparkline]", (nodes) => nodes.length);
  check(charts > 0, `charts draw (${charts} svg)`);
  const canvases = await page.$$eval("canvas", (nodes) => nodes.length);
  console.log(`  info ${canvases} 3D canvas${canvases === 1 ? "" : "es"} mounted (0 is expected where WebGL is unavailable: the fallback shows)`);

  const overflowEnd = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(overflowEnd <= 0, `still no sideways overflow after interaction (${overflowEnd}px)`);
  check(errors.length === 0, errors.length === 0 ? "no page or console errors" : `errors: ${[...new Set(errors)].slice(0, 6).join(" | ")}`);
  await page.close();
}

const browser = await puppeteer.launch({ executablePath, headless: true, args: ["--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
try {
  await run(browser, 1440, 900, "desktop");
  await run(browser, 390, 844, "phone");
} finally {
  await browser.close();
}
console.log(`\n${passes.length} passed, ${failures.length} failed. Screenshots: ${outDir}`);
process.exitCode = failures.length === 0 ? 0 : 1;
