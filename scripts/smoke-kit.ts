// Rivier UI: what the browser checks share. A check drives the showcase in a real browser (Edge or Chrome,
// through puppeteer-core) and tests what a type-check cannot: keyboard patterns, focus, roles and names,
// right-to-left, phone width, and the accessibility rules of axe-core.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Browser, ElementHandle, KeyInput, Page } from "puppeteer-core";
import { libraryDir } from "./registry.ts";

export const sleep = (ms: number): Promise<void> => new Promise((done) => setTimeout(done, ms));

export type Tally = { passes: string[]; failures: string[] };

export const SIZES = { desktop: { width: 1440, height: 900 }, phone: { width: 390, height: 844 } } as const;
export type SizeName = keyof typeof SIZES;
export type Direction = "ltr" | "rtl";

/** What a group of component checks is given. */
export type Kit = {
  page: Page;
  size: SizeName;
  dir: Direction;
  /** True at phone width, where the device is touch. */
  phone: boolean;
  check: (ok: boolean, what: string) => void;
  sleep: (ms: number) => Promise<void>;
  /** Scrolls the demonstration with this title into view and returns a selector for it. */
  demo: (title: string) => Promise<string>;
  /** Runs axe-core (WCAG 2.2 A and AA rules) on what the selector matches and fails on any violation. */
  axe: (selector: string, what: string) => Promise<void>;
  /** Presses keys one after another, with a short pause for the interface to follow. */
  keys: (...keys: KeyInput[]) => Promise<void>;
  /** The text of the first match, trimmed ("" when there is none). */
  text: (selector: string) => Promise<string>;
  /** An attribute of the first match (null when missing). */
  attr: (selector: string, name: string) => Promise<string | null>;
  count: (selector: string) => Promise<number>;
  /** Clicks the first visible match; false when there is none. */
  click: (selector: string) => Promise<boolean>;
  /** Clicks the first visible element matching the selector whose trimmed text is exactly `text`. */
  clickText: (selector: string, text: string) => Promise<boolean>;
  /** Moves focus to the first match. */
  focus: (selector: string) => Promise<boolean>;
  /** Describes the focused element: its aria-label, else its text, else its tag and data-slot. */
  focused: () => Promise<string>;
  /** Whether the focused element matches the selector. */
  focusIs: (selector: string) => Promise<boolean>;
  /** The polite and assertive messages now in the shared live region (lib/announce). */
  announced: () => Promise<string[]>;
  /** Sideways overflow of the page in pixels (0 or less is right). */
  overflow: () => Promise<number>;
  screenshot: (name: string) => Promise<void>;
};

const AXE_SOURCE = readFileSync(join(libraryDir, "node_modules", "axe-core", "axe.min.js"), "utf8");

type AxeResult = { violations: { id: string; help: string; nodes: { target: string[] }[] }[] };

export async function runAxe(page: Page, selector: string): Promise<string[]> {
  const loaded = await page.evaluate(() => typeof (window as unknown as { axe?: unknown }).axe !== "undefined");
  if (!loaded) await page.evaluate(AXE_SOURCE);
  const result = (await page.evaluate(async (target) => {
    const axe = (window as unknown as { axe: { run: (context: unknown, options: unknown) => Promise<unknown> } }).axe;
    const context = { include: [...document.querySelectorAll(target)] };
    if (context.include.length === 0) return { violations: [{ id: "no-match", help: `nothing matches ${target}`, nodes: [] }] };
    // What the sticky header covers depends on how far the page has been scrolled, and a control that is half
    // under it reads as a target that is too small. The page is scanned from the top, where the header covers
    // nothing, and put back where it was.
    const scrolled = window.scrollY;
    window.scrollTo({ top: 0, behavior: "instant" });
    try {
      return await axe.run(context, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] } });
    } finally {
      window.scrollTo({ top: scrolled, behavior: "instant" });
    }
  }, selector)) as AxeResult;
  return result.violations.map(
    (violation) =>
      `${violation.id} (${violation.help}): ${violation.nodes
        .slice(0, 3)
        .map((node) => node.target.join(" "))
        .join(" ; ")}`,
  );
}

export function makeKit(page: Page, size: SizeName, dir: Direction, tally: Tally, outDir: string, group: string): Kit {
  const check = (ok: boolean, what: string): void => {
    (ok ? tally.passes : tally.failures).push(`${group} ${size} ${dir}: ${what}`);
    console.log(`  ${ok ? "ok  " : "FAIL"} ${what}`);
  };
  const visible = async (selector: string, text?: string): Promise<ElementHandle<HTMLElement> | null> => {
    const handle = await page.evaluateHandle(
      (s, t) =>
        [...document.querySelectorAll<HTMLElement>(s)].find((element) => {
          if (t !== null && element.textContent?.trim() !== t) return false;
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && getComputedStyle(element).visibility !== "hidden";
        }) ?? null,
      selector,
      text ?? null,
    );
    return handle.asElement() as ElementHandle<HTMLElement> | null;
  };
  const clickHandle = async (element: ElementHandle<HTMLElement> | null): Promise<boolean> => {
    if (!element) return false;
    await element.evaluate((node) => node.scrollIntoView({ block: "center", behavior: "instant" }));
    await sleep(150);
    await element.click();
    await sleep(250);
    return true;
  };
  return {
    page,
    size,
    dir,
    phone: size === "phone",
    check,
    sleep,
    async demo(title) {
      const selector = `[data-demo="${title}"]`;
      const found = await page.evaluate((s) => {
        const element = document.querySelector(s);
        element?.scrollIntoView({ block: "start", behavior: "instant" });
        return element !== null;
      }, selector);
      if (!found) check(false, `demonstration "${title}" is on the page`);
      await sleep(200);
      return selector;
    },
    async axe(selector, what) {
      const violations = await runAxe(page, selector);
      check(violations.length === 0, violations.length === 0 ? `axe: ${what}` : `axe: ${what}: ${violations.join(" | ")}`);
    },
    async keys(...keys) {
      for (const key of keys) {
        // Held for a moment, as a finger holds it: some components act on focus that arrives while the key is down.
        await page.keyboard.press(key, { delay: 50 });
        await sleep(60);
      }
      await sleep(120);
    },
    text: (selector) => page.evaluate((s) => document.querySelector(s)?.textContent?.trim() ?? "", selector),
    attr: (selector, name) => page.evaluate((s, n) => document.querySelector(s)?.getAttribute(n) ?? null, selector, name),
    count: (selector) => page.evaluate((s) => document.querySelectorAll(s).length, selector),
    click: async (selector) => clickHandle(await visible(selector)),
    clickText: async (selector, text) => clickHandle(await visible(selector, text)),
    async focus(selector) {
      const ok = await page.evaluate((s) => {
        const element = document.querySelector<HTMLElement>(s);
        element?.scrollIntoView({ block: "center", behavior: "instant" });
        element?.focus();
        return element !== null && document.activeElement === element;
      }, selector);
      await sleep(100);
      return ok;
    },
    focused: () =>
      page.evaluate(() => {
        const element = document.activeElement as HTMLElement | null;
        if (!element || element === document.body) return "(nothing)";
        return element.getAttribute("aria-label") ?? (element.textContent?.trim().slice(0, 80) || `${element.tagName.toLowerCase()}[${element.dataset["slot"] ?? ""}]`);
      }),
    focusIs: (selector) => page.evaluate((s) => document.activeElement?.matches(s) ?? false, selector),
    announced: () => page.evaluate(() => [...document.querySelectorAll("#rui-announcer [role=log] > div")].map((node) => node.textContent ?? "")),
    // Measured against the width the device was given, not the page's own client width: a phone browser
    // widens its layout viewport to fit content that overflows, which would hide the overflow.
    overflow: () => page.evaluate((width) => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - width, SIZES[size].width),
    async screenshot(name) {
      await page.screenshot({ path: join(outDir, `${group}-${size}-${dir}-${name}.png`) as `${string}.png` });
    },
  };
}

/** Opens a page at a size, collecting page and console errors. */
export async function openPage(browser: Browser, size: SizeName): Promise<{ page: Page; errors: string[] }> {
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(`page error: ${(error as Error).message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  const { width, height } = SIZES[size];
  await page.setViewport({ width, height, deviceScaleFactor: 1, isMobile: size === "phone", hasTouch: size === "phone" });
  return { page, errors };
}

export const DEFAULT_BROWSER = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
