#!/usr/bin/env node
// Rivier UI: interaction and accessibility checks for the components, one group per file in scripts/checks/.
//
//   npm run site:build ; npm run site:start        (in one terminal; or npm run site:dev)
//   npm run check                                  every group
//   npm run check -- dates flows                   some groups
//   npm run check -- url=http://localhost:3320 browser="<path to Edge or Chrome>"
//
// Each group has a page in the showcase (site/src/app/<group>/page.tsx) and a file here that exports
// `route` and `run(kit)`. Every group is run three times: desktop, phone (390 px, touch), and phone
// right-to-left. Around the group's own checks the runner tests, each time: axe-core finds no WCAG 2.2 A or
// AA violation, nothing overflows sideways, and the page and console report no errors.

import { mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import puppeteer from "puppeteer-core";
import { libraryDir } from "./registry.ts";
import { DEFAULT_BROWSER, makeKit, openPage, sleep, type Direction, type Kit, type SizeName, type Tally } from "./smoke-kit.ts";

type Group = { route: string; run: (kit: Kit) => Promise<void> };

const args = process.argv.slice(2);
const option = (name: string): string => args.find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1) ?? "";
const url = option("url") || "http://localhost:3320";
const executablePath = option("browser") || DEFAULT_BROWSER;
const wanted = args.filter((arg) => !arg.includes("="));

const checksDir = join(libraryDir, "scripts", "checks");
const available = readdirSync(checksDir)
  .filter((file) => file.endsWith(".ts"))
  .map((file) => file.replace(/\.ts$/, ""))
  .sort();
const names = wanted.length > 0 ? wanted : available;
const unknown = names.filter((name) => !available.includes(name));
if (unknown.length > 0) {
  console.error(`No checks named ${unknown.join(", ")}. There are: ${available.join(", ")}.`);
  process.exit(1);
}

const outDir = join(libraryDir, ".smoke");
mkdirSync(outDir, { recursive: true });
const tally: Tally = { passes: [], failures: [] };
const PASSES: { size: SizeName; dir: Direction }[] = [
  { size: "desktop", dir: "ltr" },
  { size: "phone", dir: "ltr" },
  { size: "phone", dir: "rtl" },
];

const browser = await puppeteer.launch({ executablePath, headless: true, args: ["--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
try {
  for (const name of names) {
    const group = (await import(pathToFileURL(join(checksDir, `${name}.ts`)).href)) as Group;
    for (const { size, dir } of PASSES) {
      console.log(`\n${name}: ${size}, ${dir}`);
      const { page, errors } = await openPage(browser, size);
      const kit = makeKit(page, size, dir, tally, outDir, name);
      try {
        await page.goto(`${url}${group.route}${dir === "rtl" ? "?dir=rtl" : ""}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
        await page.waitForSelector("[data-lab-ready]", { timeout: 60_000 });
        await sleep(600);
        kit.check((await page.evaluate(() => document.documentElement.dir || "ltr")) === dir, `the page is ${dir}`);
        kit.check((await kit.overflow()) <= 0, `no sideways overflow on load (${await kit.overflow()}px)`);
        await kit.axe("main", "the page as it loads");
        await group.run(kit);
        kit.check((await kit.overflow()) <= 0, `no sideways overflow after the checks (${await kit.overflow()}px)`);
        await kit.screenshot("end");
      } catch (error) {
        kit.check(false, `the checks ran to the end (${error instanceof Error ? error.message : String(error)})`);
      }
      kit.check(errors.length === 0, errors.length === 0 ? "no page or console errors" : `errors: ${[...new Set(errors)].slice(0, 5).join(" | ")}`);
      await page.close();
    }
  }
} finally {
  await browser.close();
}
console.log(`\n${tally.passes.length} passed, ${tally.failures.length} failed.`);
for (const failure of tally.failures) console.log(`  FAIL ${failure}`);
process.exitCode = tally.failures.length === 0 ? 0 : 1;
