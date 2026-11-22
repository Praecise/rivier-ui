// Checks: direction-provider, announce, the theme's per-script type resets, theme-provider (site/src/app/foundations).

import type { Kit } from "../smoke-kit.ts";

export const route = "/foundations";

export async function run(kit: Kit): Promise<void> {
  const { check, keys, text, attr, page } = kit;
  const other = kit.dir === "rtl" ? "ltr" : "rtl";

  // Direction provider: the attribute, the context, and a Radix control inside following it.
  const direction = await kit.demo("Direction provider");
  check((await text("[data-testid=outer-direction]")) === kit.dir, "useDirection gives the page's direction");
  check((await attr("[data-testid=inner]", "dir")) === other, "a nested provider sets dir on its element");
  check((await text("[data-testid=inner-direction]")) === other, "and its context wins inside");
  check((await page.evaluate(() => getComputedStyle(document.querySelector("[data-testid=inner]") as Element).direction)) === other, "layout inside follows it");
  check(await kit.focus(`${direction} [role=slider]`), "the slider inside takes focus");
  // In a right-to-left block the Left arrow moves towards the end, so the value grows.
  await keys(other === "rtl" ? "ArrowLeft" : "ArrowRight");
  check((await attr(`${direction} [role=slider]`, "aria-valuenow")) === "30", `the arrow that points towards the end raises the value (${await attr(`${direction} [role=slider]`, "aria-valuenow")})`);
  const expected: Record<string, string> = { "en-GB": "ltr", ar: "rtl", "he-IL": "rtl", dv: "rtl", "fa-IR": "rtl", ja: "ltr", "az-Arab": "rtl", "az-Latn": "ltr" };
  const got = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll("[data-locale]")].map((node) => [node.getAttribute("data-locale"), node.textContent])));
  const wrong = Object.entries(expected).filter(([locale, dir]) => got[locale] !== dir);
  check(wrong.length === 0, wrong.length === 0 ? "directionOf knows the direction of each language tag" : `directionOf is wrong for ${wrong.map(([locale]) => `${locale} (${got[locale]})`).join(", ")}`);

  // Announce: one shared region, polite and assertive, and focus stays put.
  await kit.demo("Announce");
  check((await kit.announced()).length === 0, "nothing is announced before anything happens");
  check(await kit.clickText("button", "Add to basket"), "the button is there");
  await keys("Enter");
  const messages = await kit.announced();
  check(messages.includes("1 item in the basket") && messages.includes("2 items in the basket"), `each change is announced (${messages.join(" | ")})`);
  check((await kit.focused()) === "Add to basket", "focus does not move");
  check((await page.evaluate(() => document.querySelectorAll("#rui-announcer").length)) === 1, "there is one live region on the page");
  check(
    await page.evaluate(() => {
      const polite = document.querySelector('#rui-announcer [data-politeness="polite"]');
      return polite?.getAttribute("aria-live") === "polite" && polite.getAttribute("role") === "log";
    }),
    "the polite region is a log that waits its turn",
  );
  await kit.clickText("button", "Lose the connection");
  check(
    await page.evaluate(() => document.querySelector('#rui-announcer [data-politeness="assertive"]')?.textContent === "The connection was lost"),
    "an urgent message goes to the assertive region",
  );
  const box = await page.evaluate(() => {
    const rect = document.getElementById("rui-announcer")?.getBoundingClientRect();
    return rect ? rect.width * rect.height : -1;
  });
  check(box >= 0 && box <= 1, "the region is visually hidden but in the page");

  // Scripts: tracking is dropped and leading opened where the script needs it.
  await kit.demo("Type that follows the script");
  const type = (testid: string): Promise<{ spacing: string; ratio: number; label: string }> =>
    page.evaluate((id) => {
      const heading = document.querySelector(`[data-testid=${id}] p:last-child`) as HTMLElement;
      const label = document.querySelector(`[data-testid=${id}] p:first-child`) as HTMLElement;
      const style = getComputedStyle(heading);
      return { spacing: style.letterSpacing, ratio: parseFloat(style.lineHeight) / parseFloat(style.fontSize), label: getComputedStyle(label).letterSpacing };
    }, testid);
  const latin = await type("script-en");
  const arabic = await type("script-ar");
  const japanese = await type("script-ja");
  check(parseFloat(latin.spacing) < 0 && Math.abs(latin.ratio - 1.25) < 0.01, `Latin keeps its tight tracking and leading (${latin.spacing}, ${latin.ratio.toFixed(2)})`);
  check((arabic.spacing === "normal" || parseFloat(arabic.spacing) === 0) && (arabic.label === "normal" || parseFloat(arabic.label) === 0), `Arabic has no letter-spacing, so its letters join (${arabic.spacing}, ${arabic.label})`);
  check(arabic.ratio >= 1.45, `Arabic has room for its marks (line height ${arabic.ratio.toFixed(2)})`);
  check((japanese.spacing === "normal" || parseFloat(japanese.spacing) === 0) && japanese.ratio > latin.ratio, `Japanese drops tight tracking and opens the leading (${japanese.spacing}, ${japanese.ratio.toFixed(2)})`);
  check((await page.evaluate(() => getComputedStyle(document.querySelector("[data-testid=script-ja] p") as Element).lineBreak)) === "strict", "Japanese breaks lines strictly");

  // Theme provider: the choice is stored, survives a reload, and is read without a flash or a hydration error.
  check(await kit.clickText("[data-slot=theme-panel] button", "dark"), "the theme switch is there");
  check((await page.evaluate(() => document.documentElement.dataset["theme"])) === "dark", "choosing dark sets the page dark");
  check((await page.evaluate(() => JSON.parse(localStorage.getItem("rivier-ui:theme") ?? "{}").mode)) === "dark", "the choice is stored");
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-lab-ready]");
  await kit.sleep(400);
  check((await page.evaluate(() => document.documentElement.dataset["theme"])) === "dark", "the stored choice is applied after a reload");
  // A change made in another tab arrives as a storage event.
  await page.evaluate(() => {
    const next = JSON.stringify({ ...JSON.parse(localStorage.getItem("rivier-ui:theme") ?? "{}"), mode: "light" });
    localStorage.setItem("rivier-ui:theme", next);
    window.dispatchEvent(new StorageEvent("storage", { key: "rivier-ui:theme", newValue: next }));
  });
  await kit.sleep(300);
  check((await page.evaluate(() => document.documentElement.dataset["theme"])) === "light", "a change in another tab is followed");
  await kit.clickText("[data-slot=theme-panel] button", "system");

  // An icon that stands alone: hidden as a drawing, named in words.
  const named = await kit.demo("An icon with a name");
  const icon = await page.evaluate((s) => {
    const svg = document.querySelector(`${s} svg`);
    return { hidden: svg?.getAttribute("aria-hidden"), label: svg?.nextElementSibling?.textContent ?? "" };
  }, named);
  check(icon.hidden === "true" && icon.label === "Verified", "an accessible icon hides the drawing and says its label");

  await kit.axe("main", "after the checks");
}
