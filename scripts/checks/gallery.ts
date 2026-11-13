// Checks: gallery, lightbox, view-transition (React's ViewTransition), dropzone (site/src/app/gallery).

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { libraryDir } from "../registry.ts";
import type { Kit } from "../smoke-kit.ts";

export const route = "/gallery";

export async function run(kit: Kit): Promise<void> {
  const { check, keys, text, attr, count, page, sleep } = kit;
  const forward = kit.dir === "rtl" ? "ArrowLeft" : "ArrowRight";
  const back = kit.dir === "rtl" ? "ArrowRight" : "ArrowLeft";
  const dialog = "[data-slot=lightbox-content]";
  const counter = (): Promise<string> => text(`${dialog} [data-slot=lightbox-counter]`);
  /** Waits for the track to come to rest on a slide. */
  const settled = async (): Promise<void> => {
    await sleep(700);
  };
  /** Whether the slide marked current is the one in the middle of the track. */
  const centred = (): Promise<boolean> =>
    page.evaluate((d) => {
      const viewport = document.querySelector(`${d} [data-slot=lightbox-viewport]`);
      const slide = document.querySelector(`${d} [data-slot=lightbox-slide][data-active]`);
      if (!viewport || !slide) return false;
      const a = viewport.getBoundingClientRect();
      const b = slide.getBoundingClientRect();
      return Math.abs(a.left + a.width / 2 - (b.left + b.width / 2)) < 2;
    }, dialog);
  const zoomLevel = (): Promise<string> => text(`${dialog} [data-slot=lightbox-zoom-level]`);
  const nameOf = (selector: string): Promise<string> =>
    page.evaluate((s) => {
      const element = document.querySelector(s);
      if (!element) return "";
      const label = element.getAttribute("aria-label");
      if (label) return label;
      return [...element.childNodes]
        .map((node) => (node instanceof HTMLImageElement ? node.alt : (node.textContent ?? "")))
        .join("")
        .replace(/\s+/g, " ")
        .trim();
    }, selector);
  const visibleCount = (selector: string): Promise<number> => page.evaluate((s) => [...document.querySelectorAll(s)].filter((node) => node.getClientRects().length > 0).length, selector);

  // ---- Gallery: mosaic -------------------------------------------------------------------------------------
  const mosaic = await kit.demo("Gallery: mosaic");
  await kit.screenshot("mosaic");
  check((await attr(`${mosaic} [data-slot=gallery]`, "role")) === "group" && (await attr(`${mosaic} [data-slot=gallery]`, "aria-label")) === "Eight drawings", "the gallery is a named group");
  check((await count(`${mosaic} [data-slot=gallery-item]`)) === 8 && (await visibleCount(`${mosaic} [data-slot=gallery-item]`)) === 5, "a mosaic shows five tiles of the eight pictures");
  check((await text(`${mosaic} [data-slot=gallery-more]`)) === "+3 more", "the last tile says how many more there are");
  check((await nameOf(`${mosaic} [data-slot=gallery-item]`)) === "Open picture: A sun low over two hills", `a tile is a button whose name says it opens the picture (${await nameOf(`${mosaic} [data-slot=gallery-item]`)})`);
  check((await attr(`${mosaic} [data-slot=gallery-item]`, "aria-haspopup")) === "dialog", "a tile says it opens a dialog");
  const ratios = await page.evaluate((s) => [...document.querySelectorAll(`${s} [data-slot=gallery-item]`)].slice(0, 5).map((node) => Math.round(node.getBoundingClientRect().width)), mosaic);
  check((ratios[0] ?? 0) > (ratios[1] ?? 0) * 1.5, `the first tile is the large one (${ratios.join(", ")})`);

  // Open with the keyboard from the second tile; the picture grows out of its thumbnail.
  check(await kit.focus(`${mosaic} [data-slot=gallery-item]:nth-child(2)`), "a tile takes focus");
  const groups = await page.evaluate(async () => {
    (document.activeElement as HTMLElement).click();
    await new Promise((done) => setTimeout(done, 150));
    return document
      .getAnimations()
      .map((animation) => (animation.effect as KeyframeEffect | null)?.pseudoElement ?? "")
      .filter((pseudo) => pseudo.includes("rui-lightbox"));
  });
  await sleep(600);
  check((await count(dialog)) === 1 && (await attr(dialog, "role")) === "dialog", "the tile opens the lightbox, a dialog");
  check(groups.length > 0, `opening is a shared-element view transition (${[...new Set(groups)].join(" ") || "no named group animated"})`);
  check((await attr(dialog, "data-transition")) === "shared", "the dialog's own fade is off while the view transition runs");
  check((await text(`${dialog} [data-slot=lightbox-title]`)) === "Eight drawings", "the lightbox has a title");
  check((await counter()) === "2 of 8", `it opens at the picture pressed (${await counter()})`);
  check(await centred(), "the track is on that slide");
  const fitted = await page.evaluate((d) => {
    const image = document.querySelector(`${d} [data-slot=lightbox-slide][data-active] img`) as HTMLImageElement;
    const a = image.getBoundingClientRect();
    const b = (image.closest("[data-slot=lightbox-slide]") as HTMLElement).getBoundingClientRect();
    return { inside: a.top >= b.top - 1 && a.bottom <= b.bottom + 1 && a.left >= b.left - 1 && a.right <= b.right + 1, shape: a.width / a.height, natural: image.naturalWidth / image.naturalHeight, sizes: `${Math.round(a.width)}x${Math.round(a.height)} in ${Math.round(b.width)}x${Math.round(b.height)}` };
  }, dialog);
  check(fitted.inside && Math.abs(fitted.shape - fitted.natural) < 0.03, `a picture taller than the slide is shown whole inside it, in its own proportions (${fitted.sizes})`);
  check((await attr(`${dialog} [data-slot=lightbox-counter]`, "aria-live")) === "polite", "the counter is a polite live region");
  check((await attr(`${dialog} [data-slot=lightbox-slide][data-active]`, "aria-roledescription")) === "slide" && (await attr(`${dialog} [data-slot=lightbox-slide][data-active]`, "aria-label")) === "2 of 8", "the slide is named by its position");
  check((await count(`${dialog} [data-slot=lightbox-slide][inert]`)) === 7, "slides out of view are inert");
  check((await text(`${dialog} [data-slot=lightbox-caption]`)) === "The north wall", "the caption of the current slide is shown");
  await kit.axe(dialog, "the lightbox, open");
  await kit.screenshot("lightbox");

  // Keys.
  await keys(forward);
  await settled();
  check((await counter()) === "3 of 8" && (await centred()), `the arrow key towards the end shows the next slide (${await counter()})`);
  await keys(back);
  await settled();
  check((await counter()) === "2 of 8" && (await centred()), "the arrow key towards the start goes back");
  await keys("End");
  await settled();
  check((await counter()) === "8 of 8" && (await centred()), "End shows the last slide");
  await keys(forward);
  await settled();
  check((await counter()) === "8 of 8", "without loop it stops at the last slide");
  check((await attr(`${dialog} [data-slot=lightbox-next]`, "aria-disabled")) === "true", "the next button is disabled at the end");
  await keys("Home");
  await settled();
  check((await counter()) === "1 of 8" && (await attr(`${dialog} [data-slot=lightbox-previous]`, "aria-disabled")) === "true", "Home shows the first slide, where the previous button is disabled");

  // Buttons and thumbnails.
  check((await attr(`${dialog} [data-slot=lightbox-next]`, "aria-label")) === "Next picture", "the next button has a name");
  await kit.click(`${dialog} [data-slot=lightbox-next]`);
  await settled();
  check((await counter()) === "2 of 8", "the next button shows the next slide");
  const nextSide = await page.evaluate((d) => {
    const next = document.querySelector(`${d} [data-slot=lightbox-next]`)?.getBoundingClientRect();
    const previous = document.querySelector(`${d} [data-slot=lightbox-previous]`)?.getBoundingClientRect();
    return next && previous ? next.left > previous.left : null;
  }, dialog);
  check(nextSide === (kit.dir === "ltr"), `the next button is at the end edge (${kit.dir})`);
  await kit.click(`${dialog} [data-slot=lightbox-thumbnail]:nth-child(5)`);
  await settled();
  check((await counter()) === "5 of 8" && (await centred()), "a thumbnail jumps to its slide");
  check((await count(`${dialog} [data-slot=lightbox-thumbnail][aria-current=true]`)) === 1 && (await attr(`${dialog} [data-slot=lightbox-thumbnail]:nth-child(5)`, "aria-current")) === "true", "the current thumbnail, and only it, has aria-current");
  check((await attr(`${dialog} [data-slot=lightbox-thumbnail]:nth-child(5)`, "aria-label")) === "Show picture 5: A boat on flat water", "a thumbnail has a name");

  // Swiping is scrolling: move the track one slide and the index follows.
  await page.evaluate(
    (d, sign) => {
      const viewport = document.querySelector(`${d} [data-slot=lightbox-viewport]`) as HTMLElement;
      viewport.scrollBy({ left: sign * viewport.clientWidth, behavior: "instant" });
    },
    dialog,
    kit.dir === "rtl" ? -1 : 1,
  );
  await settled();
  check((await counter()) === "6 of 8", `the index follows the track after a swipe (${await counter()})`);

  // Zoom: keys, buttons, double click, wheel, drag.
  await keys("+");
  await sleep(300);
  check((await zoomLevel()) === "150%", `+ zooms in (${await zoomLevel()})`);
  check((await kit.announced()).includes("Zoom 150%"), "the new zoom level is announced");
  check((await attr(`${dialog} [data-slot=lightbox-viewport]`, "data-zoomed")) === "", "the track is marked zoomed");
  check((await page.evaluate((d) => getComputedStyle(document.querySelector(`${d} [data-slot=lightbox-viewport]`) as Element).overflowX, dialog)) === "hidden", "the track does not scroll while a slide is zoomed");
  check((await page.evaluate((d) => (document.querySelector(`${d} [data-slot=lightbox-zoom-surface]`) as HTMLElement).style.transform, dialog)).includes("scale(1.5)"), "zoom is a transform");
  await kit.click(`${dialog} [data-slot=lightbox-zoom-in]`);
  check((await zoomLevel()) === "225%", "the zoom-in button zooms further");
  await keys("-");
  check((await zoomLevel()) === "150%", "- zooms out");
  await keys("0");
  check((await zoomLevel()) === "100%" && (await attr(`${dialog} [data-slot=lightbox-zoom-out]`, "aria-disabled")) === "true", "0 resets, and zoom out is disabled at 100%");

  const box = await page.evaluate((d) => {
    const rect = (document.querySelector(`${d} [data-slot=lightbox-slide][data-active]`) as HTMLElement).getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, width: rect.width, height: rect.height };
  }, dialog);
  if (!kit.phone) {
    await page.mouse.click(box.x, box.y, { count: 2 });
    await sleep(350);
    check((await zoomLevel()) === "250%", `a double click zooms in (${await zoomLevel()})`);
    // Drag far further than the picture reaches: it stops at its own edge.
    await page.mouse.move(box.x, box.y);
    await page.mouse.down();
    await page.mouse.move(box.x + 3000, box.y + 3000, { steps: 4 });
    await page.mouse.up();
    await sleep(300);
    const edges = await page.evaluate((d) => {
      const surface = (document.querySelector(`${d} [data-slot=lightbox-zoom-surface]`) as HTMLElement).getBoundingClientRect();
      const slide = (document.querySelector(`${d} [data-slot=lightbox-slide][data-active]`) as HTMLElement).getBoundingClientRect();
      return { moved: (document.querySelector(`${d} [data-slot=lightbox-zoom-surface]`) as HTMLElement).style.transform, gapX: surface.width >= slide.width ? surface.left - slide.left : 0, gapY: surface.height >= slide.height ? surface.top - slide.top : 0 };
    }, dialog);
    check(!edges.moved.startsWith("translate3d(0px, 0px") && edges.gapX <= 1 && edges.gapY <= 1, `a zoomed picture can be dragged, but not past its own edge (${edges.moved}; gaps ${Math.round(edges.gapX)}, ${Math.round(edges.gapY)})`);
    await page.mouse.click(box.x, box.y, { count: 2 });
    await sleep(350);
    check((await zoomLevel()) === "100%", "a second double click zooms back out");
    await page.mouse.move(box.x, box.y);
    await page.keyboard.down("Control");
    await page.mouse.wheel({ deltaY: -60 });
    await page.keyboard.up("Control");
    await sleep(350);
    check(Number.parseInt(await zoomLevel(), 10) > 100, `Ctrl and the wheel zoom (${await zoomLevel()})`);
  } else {
    // Two fingers moving apart.
    const a = await page.touchscreen.touchStart(box.x - 30, box.y);
    const b = await page.touchscreen.touchStart(box.x + 30, box.y);
    for (let step = 1; step <= 6; step++) {
      await a.move(box.x - 30 - step * 12, box.y);
      await b.move(box.x + 30 + step * 12, box.y);
      await sleep(30);
    }
    await a.end();
    await b.end();
    await sleep(350);
    check(Number.parseInt(await zoomLevel(), 10) > 150, `a pinch zooms (${await zoomLevel()})`);
    check((await page.evaluate((d) => getComputedStyle(document.querySelector(`${d} [data-slot=lightbox-zoom-surface]`) as Element).touchAction, dialog)) === "none", "a zoomed slide takes the touches itself");
  }
  await keys(forward);
  await settled();
  check((await counter()) === "7 of 8" && (await zoomLevel()) === "100%", `showing another slide drops the zoom (${await counter()}, ${await zoomLevel()})`);

  // Focus stays inside, Escape closes, focus goes back to a tile.
  for (let press = 0; press < 14; press++) await page.keyboard.press("Tab");
  check(await page.evaluate((d) => document.activeElement?.closest(d) !== null, dialog), "Tab stays inside the lightbox");
  // A button that reaches its limit while it has focus must not take the keyboard away with it.
  await keys("End");
  await settled();
  await kit.focus(`${dialog} [data-slot=lightbox-previous]`);
  await keys("Home");
  await settled();
  check(await kit.focusIs(`${dialog} [data-slot=lightbox-previous][aria-disabled=true]`), "a button that reaches its limit keeps focus");
  await keys("Enter");
  check((await counter()) === "1 of 8", "and does nothing when pressed");
  await keys(forward, forward);
  await settled();
  check((await counter()) === "3 of 8" && (await centred()), `keys still work from it, and quick presses are each a step (${await counter()})`);
  await keys("Escape");
  await sleep(700);
  check((await count(dialog)) === 0, "Escape closes the lightbox");
  check((await nameOf(":focus")) === "Open picture: A round table seen from above", `focus returns to the tile of the picture that was shown (${await nameOf(":focus")})`);

  // A picture with no visible tile: focus goes back to the tile that opened the lightbox.
  await keys("Enter");
  await sleep(700);
  await keys("End");
  await settled();
  await keys("Escape");
  await sleep(700);
  check((await nameOf(":focus")) === "Open picture: A round table seen from above", "when the shown picture has no tile on screen, focus returns to the tile that opened the lightbox");

  // Reduced motion: no view transition, no travel.
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await keys("Enter");
  await sleep(300);
  check((await attr(dialog, "data-transition")) === "fade", "under reduced motion there is no view transition");
  await keys(forward);
  await sleep(120);
  check((await counter()) === "4 of 8" && (await centred()), "under reduced motion a slide changes at once, without travel");
  await keys("Escape");
  await sleep(300);
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);

  // ---- Gallery: grid, controlled ---------------------------------------------------------------------------
  const grid = await kit.demo("Gallery: grid, controlled");
  check((await text(`${grid} [data-slot=gallery-image-unavailable]`)).startsWith("Picture unavailable"), "a picture that cannot be loaded shows a labelled placeholder");
  check((await nameOf(`${grid} [data-slot=gallery-item]:nth-child(4)`)).includes("A picture whose file is missing"), "the placeholder keeps the picture's description in the tile's name");
  const tiles = await page.evaluate((s) => [...document.querySelectorAll(`${s} [data-slot=gallery-item]`)].map((node) => { const rect = node.getBoundingClientRect(); return Math.round((rect.width / rect.height) * 100); }), grid);
  check(tiles.every((ratio) => Math.abs(ratio - 133) <= 2), `tiles keep their 4:3 shape with or without a picture (${tiles.join(", ")})`);
  check(await kit.clickText(`${grid} button`, "Open at the third picture"), "the lightbox can be opened from outside");
  await settled();
  check((await text("[data-testid=viewer-state]")) === "open at 3" && (await counter()) === "3 of 4" && (await centred()), `controlled: it opens at the index given (${await text("[data-testid=viewer-state]")}, ${await counter()})`);
  await keys(back);
  await settled();
  check((await text("[data-testid=viewer-state]")) === "open at 2", "controlled: the index is reported as it changes");
  await keys("Escape");
  await sleep(700);
  check((await text("[data-testid=viewer-state]")) === "closed, last at 2", "controlled: closing is reported");
  check((await nameOf(":focus")) === "Open picture: Three tall windows in a wall", `focus goes to the tile of the picture shown, though a plain button opened it (${await nameOf(":focus")})`);

  // ---- Gallery: row, own lightbox --------------------------------------------------------------------------
  const row = await kit.demo("Gallery: row, own lightbox");
  const scrolls = await page.evaluate((s) => {
    const tilesBox = document.querySelector(`${s} [data-slot=gallery-tiles]`) as HTMLElement;
    return tilesBox.scrollWidth > tilesBox.clientWidth;
  }, row);
  check(scrolls, "a row scrolls sideways inside itself");
  await kit.click(`${row} [data-slot=gallery-item]`);
  await sleep(500);
  check((await attr(dialog, "data-transition")) === "fade", "with sharedTransition off the lightbox fades in");
  check((await counter()) === "Drawing 1 of 5", "the position's words can be replaced");
  await keys(back);
  await settled();
  check((await counter()) === "Drawing 5 of 5" && (await centred()), "with loop, going back from the first slide shows the last");
  check((await attr(`${dialog} [data-slot=lightbox-next]`, "aria-disabled")) === null, "with loop the next button stays enabled at the end");
  await kit.axe(dialog, "a lightbox made from the parts");
  await kit.click(`${dialog} [data-slot=lightbox-close]`);
  await sleep(500);
  check((await count(dialog)) === 0, "the close button closes it");

  // ---- Gallery: the project's own image component ----------------------------------------------------------
  const own = await kit.demo("Gallery: the project's own image component");
  const ownTile = `${own} [data-slot=gallery]:not([data-testid]) [data-slot=gallery-item]`;
  await sleep(300);
  const drawnBy = await page.evaluate(
    (s) => [...document.querySelectorAll(`${s} img`)].map((image) => `${image.getAttribute("data-framework-image")}|${image.getAttribute("data-slot")}|${image.getAttribute("loading")}|${image.getAttribute("sizes") !== null}`),
    ownTile,
  );
  check(drawnBy.length === 3 && drawnBy.every((image) => image === "fill|gallery-image|null|true"), `given a component to draw with, each tile's picture is drawn by it, with the props passed on and its own way of loading (${drawnBy[0]})`);
  const fills = await page.evaluate((s) => {
    const tile = document.querySelector(s) as HTMLElement;
    const a = tile.getBoundingClientRect();
    const b = (tile.querySelector("img") as HTMLElement).getBoundingClientRect();
    return Math.abs(a.width - b.width) <= 1 && Math.abs(a.height - b.height) <= 1 && getComputedStyle(tile.querySelector("img") as Element).objectFit === "cover";
  }, ownTile);
  check(fills, "it fills its tile, cropped, as the plain picture does");
  check((await nameOf(ownTile)) === "Open picture: A sun low over two hills", `the tile keeps its name (${await nameOf(ownTile)})`);
  check((await text(`${ownTile}:nth-child(4) [data-slot=gallery-image-unavailable]`)).startsWith("Picture unavailable") && (await nameOf(`${ownTile}:nth-child(4)`)).includes("A picture whose file is missing"), "a picture it cannot load still gives way to the labelled placeholder");
  await kit.click(`${ownTile}:nth-child(2)`);
  await settled();
  const slide = `${dialog} [data-slot=lightbox-slide][data-active] img`;
  check((await counter()) === "2 of 4" && (await attr(slide, "data-framework-image")) === "sized" && (await attr(slide, "alt")) === "Three tall windows in a wall" && (await attr(slide, "width")) === "800" && (await attr(slide, "height")) === "1100", "in the viewer the slide is drawn by the same component, with the picture's description and its own size");
  const whole = await page.evaluate((s) => {
    const image = document.querySelector(s) as HTMLImageElement;
    const a = image.getBoundingClientRect();
    const b = (image.closest("[data-slot=lightbox-slide]") as HTMLElement).getBoundingClientRect();
    return { inside: a.width <= b.width + 1 && a.height <= b.height + 1 && a.width > 40, shape: a.width / a.height, fit: getComputedStyle(image).objectFit, sizes: `${Math.round(a.width)}x${Math.round(a.height)} in ${Math.round(b.width)}x${Math.round(b.height)}` };
  }, slide);
  check(whole.inside && whole.fit === "contain" && Math.abs(whole.shape - 800 / 1100) < 0.03, `shown whole, inside the slide, in its own proportions (${whole.sizes}, ${whole.fit})`);
  const strip = await page.evaluate((d) => [...document.querySelectorAll(`${d} [data-slot=lightbox-thumbnail] img`)].map((image) => `${image.getAttribute("data-framework-image")}|${image.getAttribute("alt")}`), dialog);
  check(strip.length === 4 && strip.every((image) => image === "sized|"), `and so are the thumbnails, which stay decoration: their buttons carry the names (${strip[0]})`);
  check((await attr(`${dialog} [data-slot=lightbox-thumbnail]:nth-child(2)`, "aria-label")) === "Show picture 2: Three tall windows in a wall", "each thumbnail's button is named after its picture");
  await kit.axe(dialog, "the viewer drawn by the project's component");
  await keys("Escape");
  await sleep(700);
  check((await count(dialog)) === 0 && (await nameOf(":focus")) === "Open picture: Three tall windows in a wall", "closing returns focus to the tile");
  const parts = "[data-testid=own-parts] [data-slot=gallery-item]";
  check((await attr(`${parts}:nth-child(1) img`, "data-framework-image")) === "fill" && (await attr(`${parts}:nth-child(1) img`, "loading")) === null, "GalleryImage takes the component as a part too");
  check((await attr(`${parts}:nth-child(2) img`, "data-framework-image")) === null && (await attr(`${parts}:nth-child(2) img`, "loading")) === "lazy" && (await attr(`${parts}:nth-child(2) img`, "decoding")) === "async", "left alone it is a plain picture, loaded lazily, as before");
  await kit.axe(own, "the gallery drawn by the project's component");

  // ---- React's ViewTransition ------------------------------------------------------------------------------
  const shared = await kit.demo("Shared element in a React transition");
  const reactGroups = await page.evaluate(async (s) => {
    [...document.querySelectorAll<HTMLButtonElement>(`${s} button`)].find((button) => button.textContent?.trim() === "Show it large")?.click();
    const seen = new Set<string>();
    for (let frame = 0; frame < 12; frame++) {
      await new Promise((done) => setTimeout(done, 30));
      for (const animation of document.getAnimations()) {
        const pseudo = (animation.effect as KeyframeEffect | null)?.pseudoElement ?? "";
        if (pseudo.includes("view-transition")) seen.add(pseudo);
      }
    }
    return [...seen];
  }, shared);
  await sleep(500);
  check((await count("[data-testid=shared-large]")) === 1 && (await count("[data-testid=shared-small]")) === 0, "a state change inside startTransition is applied");
  check(reactGroups.some((pseudo) => pseudo.includes("showcase-shared-picture")), `React animates the SharedElement as a named view-transition group (${reactGroups.join(" ") || "none"})`);
  await kit.clickText(`${shared} button`, "Back to the small picture");
  await sleep(600);
  check((await count("[data-testid=shared-small]")) === 1, "and back");

  // ---- Dropzone and uploads --------------------------------------------------------------------------------
  const zone = await kit.demo("Dropzone and uploads");
  const files = join(libraryDir, ".smoke", "files");
  mkdirSync(files, { recursive: true });
  const file = (name: string, bytes: number): string => {
    const path = join(files, name);
    writeFileSync(path, new Uint8Array(bytes));
    return path;
  };
  const rows = (): Promise<string[]> => page.evaluate((s) => [...document.querySelectorAll(`${s} [data-slot=upload-name]`)].map((node) => node.textContent ?? ""), zone);
  const stateOf = (name: string): Promise<string> =>
    page.evaluate(
      (s, n) => [...document.querySelectorAll(`${s} [data-slot=upload-item]`)].find((item) => item.querySelector("[data-slot=upload-name]")?.textContent === n)?.querySelector("[data-slot=upload-state]")?.textContent?.trim() ?? "(no row)",
      zone,
      name,
    );
  const waitState = async (name: string, wanted: string): Promise<boolean> => {
    for (let tries = 0; tries < 60; tries++) {
      if ((await stateOf(name)) === wanted) return true;
      await sleep(100);
    }
    return false;
  };

  check((await attr(`${zone} [data-slot=dropzone]`, "role")) === "group" && (await attr(`${zone} [data-slot=dropzone]`, "aria-label")) === "Add files", "the dropzone is a named group");
  check((await page.evaluate((s) => document.querySelector(`${s} [data-slot=dropzone-button]`)?.tagName, zone)) === "BUTTON", "it has a real button for the file dialog");

  // The file dialog, with one good file, one of the wrong type and one too large.
  const [chooser] = await Promise.all([page.waitForFileChooser({ timeout: 5000 }), kit.click(`${zone} [data-slot=dropzone-button]`)]);
  check(chooser.isMultiple(), "the button opens the file dialog, for several files");
  await chooser.accept([file("harbour.png", 4000), file("notes.txt", 100), file("survey.pdf", 2_500_000)]);
  await sleep(400);
  check((await rows()).join("|") === "harbour.png", `only the file that passes the rules is taken (${(await rows()).join(", ")})`);
  const rejections = await text("[data-testid=rejections]");
  check(rejections.includes("notes.txt was not added: only pictures") && rejections.includes("survey.pdf was not added: it is larger"), "rejected files come back with a reason the project words");
  check((await text(`${zone} [data-slot=upload-size]`)).replace(/\s/g, " ") === "4 kB", `the size is written for people (${await text(`${zone} [data-slot=upload-size]`)})`);
  check(await waitState("harbour.png", "Uploaded"), "the row follows the upload to the end, in words");
  check((await kit.announced()).includes("harbour.png: Uploaded"), "finishing is announced");
  check(!(await kit.announced()).some((message) => /\d+\s?%/.test(message) && !message.startsWith("Zoom")), "progress on the way is not announced");

  // No more than three at once.
  const [second] = await Promise.all([page.waitForFileChooser({ timeout: 5000 }), kit.click(`${zone} [data-slot=dropzone-button]`)]);
  await second.accept([file("a.png", 10), file("b.png", 10), file("c.png", 10), file("d.png", 10)]);
  await sleep(300);
  check((await rows()).length === 4 && (await text("[data-testid=rejections]")).includes("d.png was not added: no more than three"), "files beyond maxFiles are rejected with the reason");

  // Dragging files over it, dropping, and pasting.
  const dragged = await page.evaluate((s) => {
    const target = document.querySelector(`${s} [data-slot=dropzone]`) as HTMLElement;
    const data = new DataTransfer();
    data.items.add(new File(["x"], "dropped.png", { type: "image/png" }));
    target.dispatchEvent(new DragEvent("dragenter", { dataTransfer: data, bubbles: true }));
    target.dispatchEvent(new DragEvent("dragover", { dataTransfer: data, bubbles: true, cancelable: true }));
    return true;
  }, zone);
  await sleep(200);
  check(dragged && (await attr(`${zone} [data-slot=dropzone]`, "data-dragging")) === "" && (await text(`${zone} [data-slot=dropzone-hint]`)) === "Drop the files to add them", "while files are dragged over it, it says so in words as well as looks");
  await page.evaluate((s) => {
    const target = document.querySelector(`${s} [data-slot=dropzone]`) as HTMLElement;
    const data = new DataTransfer();
    data.items.add(new File(["x"], "dropped.png", { type: "image/png" }));
    target.dispatchEvent(new DragEvent("drop", { dataTransfer: data, bubbles: true, cancelable: true }));
  }, zone);
  await sleep(300);
  check((await rows()).includes("dropped.png") && (await attr(`${zone} [data-slot=dropzone]`, "data-dragging")) === null, "dropped files are taken");
  await page.evaluate((s) => {
    const button = document.querySelector(`${s} [data-slot=dropzone-button]`) as HTMLElement;
    button.focus();
    const data = new DataTransfer();
    data.items.add(new File(["x"], "pasted.png", { type: "image/png" }));
    button.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
  }, zone);
  await sleep(300);
  check((await rows()).includes("pasted.png"), "files pasted while focus is inside are taken");

  // Pause, resume, fail, retry, remove.
  check(await waitState("pasted.png", "Uploaded"), "the queue drains");
  await kit.clickText(`${zone} button`, "Add two samples");
  check(await waitState("plan.pdf", "Uploading"), "a new file starts uploading");
  check(await kit.click(`${zone} [aria-label="Pause: plan.pdf"]`), "the pause button is named with the file");
  check((await stateOf("plan.pdf")) === "Paused", "a paused row says so");
  const bar = `${zone} [data-slot=upload-item][data-state=paused] [role=progressbar]`;
  const held = await attr(bar, "aria-valuenow");
  await sleep(500);
  check(held !== null && held !== "0" && (await attr(bar, "aria-valuenow")) === held, `a paused row keeps the progress it reached (${held}%)`);
  check((await attr(bar, "aria-label")) === "plan.pdf" && (await attr(bar, "aria-valuetext")) === `${held}%`, "the bar is named after the file and says the percentage");
  check(await waitState("will-fail.png", "Failed"), "a failed row says so");
  check((await text(`${zone} [data-slot=upload-item][data-state=failed] [data-slot=upload-detail]`)) === "The connection dropped.", "and can say why");
  check((await kit.announced()).includes("will-fail.png: Failed"), "failing is announced");
  await kit.axe(zone, "the dropzone with rows in every state");
  await kit.screenshot("uploads");
  check(await kit.click(`${zone} [aria-label="Resume: plan.pdf"]`), "the resume button is named with the file");
  check(await waitState("plan.pdf", "Uploaded"), "a resumed upload carries on to the end");
  check(await kit.click(`${zone} [aria-label="Try again: will-fail.png"]`), "the retry button is named with the file");
  check(await waitState("will-fail.png", "Uploaded"), "a retried upload can succeed");
  const before = (await rows()).length;
  check(await kit.click(`${zone} [aria-label="Remove: plan.pdf"]`), "the remove button is named with the file");
  check((await rows()).length === before - 1 && !(await rows()).includes("plan.pdf"), "removing takes the row away");
  check((await kit.focused()) === "Choose files", `focus moves to a control that is still there (${await kit.focused()})`);
  if (kit.phone) {
    const size = await page.evaluate((s) => document.querySelector(`${s} [data-slot=upload-remove]`)?.getBoundingClientRect().width ?? 0, zone);
    check(size >= 40, `on a touch screen a row's buttons are at least 40px (${size}px)`);
  }

  await kit.axe("main", "after the checks");
}
