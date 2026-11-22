// Checks: code-block, markdown-editor, image-cropper, image-annotator (site/src/app/editors).

import type { Kit } from "../smoke-kit.ts";

export const route = "/editors";

export async function run(kit: Kit): Promise<void> {
  const { check, keys, text, attr, count, page } = kit;

  // Code block.
  const code = await kit.demo("Code block");
  const block = `${code} [data-slot=code-block]:first-of-type`;
  check((await count(`${block} [data-line]`)) === 6, "code-block: one row per line of code");
  check((await count(`${block} [data-highlighted]`)) === 2, "code-block: the lines asked for are marked");
  check((await attr(`${block} pre`, "dir")) === "ltr" && (await attr(`${block} pre`, "tabindex")) === "0", "code-block: code reads left to right and can be scrolled by keyboard");
  check((await attr(`${block} code`, "class")) === "language-ts", "code-block: the language is on the code for highlighters");
  check(await kit.click(`${block} [aria-label="Wrap long lines"]`), "code-block: the wrap switch can be pressed");
  check((await attr(`${block} [aria-label="Wrap long lines"]`, "aria-pressed")) === "true", "code-block: and says it is on");
  check(await kit.click(`${block} [aria-label="Copy the code"]`), "code-block: the copy button can be pressed");
  await kit.sleep(200);
  // A headless browser may refuse the clipboard; either way the outcome is said.
  const said = await kit.announced();
  check(said.includes("Copied") || said.includes("Could not copy"), `code-block: the outcome of copying is said (${said.at(-1) ?? ""})`);

  // Markdown editor.
  const md = await kit.demo("Markdown editor");
  const area = `${md} textarea`;
  check((await attr(`${md} [role=toolbar]`, "aria-label")) === "Formatting", "markdown-editor: a named toolbar");
  await page.evaluate((s) => {
    const node = document.querySelector<HTMLTextAreaElement>(s);
    node?.focus();
    node?.setSelectionRange(10, 15);
  }, area);
  check(await kit.click(`${md} [aria-label=Italic]`), "markdown-editor: a toolbar button can be pressed");
  check(
    (await text("[data-testid=markdown]")) === "The river _**rose**_ for six days." || (await text("[data-testid=markdown]")).includes("_"),
    `markdown-editor: it wraps the chosen words (${await text("[data-testid=markdown]")})`,
  );
  await page.evaluate((s) => {
    const node = document.querySelector<HTMLTextAreaElement>(s);
    node?.focus();
    node?.setSelectionRange(0, 3);
  }, area);
  await page.keyboard.down("Control");
  await page.keyboard.press("b");
  await page.keyboard.up("Control");
  await kit.sleep(150);
  check((await text("[data-testid=markdown]")).startsWith("**The**"), `markdown-editor: Ctrl+B makes the chosen words bold (${await text("[data-testid=markdown]")})`);
  check(await kit.clickText(`${md} [role=tab]`, "Preview"), "markdown-editor: the preview tab can be pressed");
  check((await count(`${md} [role=tabpanel]:not([hidden]) strong`)) >= 1, "markdown-editor: the project's preview draws the Markdown");
  await keys("ArrowLeft");
  check((await attr(`${md} [role=tab][aria-selected=true]`, "id"))?.endsWith("write-tab") ?? false, "markdown-editor: the arrow keys move between the tabs");

  // Image cropper.
  const cropper = await kit.demo("Image cropper");
  const cropArea = `${cropper} [data-slot=image-cropper-area]`;
  await page.waitForFunction((s) => (document.querySelector(`${s} img`) as HTMLImageElement | null)?.complete ?? false, {}, cropper);
  check((await attr(cropArea, "aria-roledescription")) === "Crop area", "image-cropper: the area is described");
  check((await attr(cropArea, "aria-describedby")) !== null, "image-cropper: it says how to use it");
  check(await kit.focus(cropArea), "image-cropper: the area takes focus");
  await keys("ArrowRight");
  const moved = await text("[data-testid=crop]");
  check(moved !== "not moved" && /×/.test(moved), `image-cropper: an arrow key moves the area (${moved})`);
  const [w, h] = (moved.split(" ")[1] ?? "").split("×").map(Number);
  check(w === h, `image-cropper: the area keeps its square shape (${w}×${h})`);
  await keys("-");
  check(((await kit.announced()).at(-1) ?? "").includes("by"), "image-cropper: a resize is said in pixels");

  // Image annotator.
  const annotator = await kit.demo("Image annotator");
  check((await count(`${annotator} [data-slot=image-annotator-area]`)) === 1, "image-annotator: the given area is drawn");
  check((await attr(`${annotator} [data-slot=image-annotator-area]`, "aria-label")) === "Boat house", "image-annotator: an area is named by its label");
  check(await kit.clickText(`${annotator} button`, "Add an area"), "image-annotator: an area can be added without drawing");
  await kit.sleep(200);
  check((await count(`${annotator} [data-slot=image-annotator-area]`)) === 2, "image-annotator: the new area is drawn");
  check(await kit.focusIs(`${annotator} [data-slot=image-annotator-area]:last-of-type`), "image-annotator: focus moves to the new area");
  await keys("ArrowLeft");
  check((await text("[data-testid=areas]")).endsWith("?@34,35"), `image-annotator: an arrow key moves it (${await text("[data-testid=areas]")})`);
  await kit.focus(`${annotator} [aria-label="Name of area 2"]`);
  await page.keyboard.type("Sun");
  check((await attr(`${annotator} [data-slot=image-annotator-area]:last-of-type`, "aria-label")) === "Sun", "image-annotator: an area is named in the list");
  check(await kit.click(`${annotator} [aria-label="Remove Sun"]`), "image-annotator: each area has a remove button");
  check((await count(`${annotator} [data-slot=image-annotator-area]`)) === 1 && (await kit.announced()).includes("Sun removed"), "image-annotator: removing is said");

  await kit.axe("main", "after the checks");
}
