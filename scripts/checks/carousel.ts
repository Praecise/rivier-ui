// Checks: carousel, media-row-list (site/src/app/carousel).

import type { Kit } from "../smoke-kit.ts";

export const route = "/carousel";

export async function run(kit: Kit): Promise<void> {
  const { check, keys, text, attr, count, page, sleep } = kit;
  const rtl = kit.dir === "rtl";
  /** The arrow key that points towards the end of the line in this page. */
  const forward = rtl ? "ArrowLeft" : "ArrowRight";
  const back = rtl ? "ArrowRight" : "ArrowLeft";
  /** Long enough for a smooth scroll to finish and the carousel to notice it is at rest. */
  const rest = (): Promise<void> => sleep(1000);
  const rect = (selector: string): Promise<{ x: number; y: number; width: number; height: number } | null> =>
    page.evaluate((s) => {
      const box = document.querySelector(s)?.getBoundingClientRect();
      return box ? { x: box.x, y: box.y, width: box.width, height: box.height } : null;
    }, selector);
  const center = async (selector: string): Promise<{ x: number; y: number }> => {
    await page.evaluate((s) => document.querySelector(s)?.scrollIntoView({ block: "center", behavior: "instant" }), selector);
    await sleep(150);
    const box = await rect(selector);
    return box ? { x: box.x + box.width / 2, y: box.y + box.height / 2 } : { x: 0, y: 0 };
  };
  const lastAnnounced = (): Promise<string> => page.evaluate(() => [...document.querySelectorAll("#rui-announcer [data-politeness=polite] > div")].at(-1)?.textContent ?? "");
  /** What a carousel shows: the slides that are not inert, by their place, and how far the first of them is from the start edge of the view. */
  const shown = (carousel: string): Promise<{ places: number[]; gap: number }> =>
    page.evaluate((s) => {
      const viewport = document.querySelector(`${s} [data-slot=carousel-viewport]`) as HTMLElement;
      const slides = [...viewport.querySelectorAll<HTMLElement>("[data-slot=carousel-slide]")];
      const places = slides.flatMap((slide, index) => (slide.inert ? [] : [index]));
      const outer = viewport.getBoundingClientRect();
      const inner = slides[places[0] ?? 0]?.getBoundingClientRect();
      const gap = !inner ? 999 : getComputedStyle(viewport).direction === "rtl" ? outer.right - inner.right : inner.left - outer.left;
      return { places, gap: Math.round(Math.abs(gap)) };
    }, carousel);
  const current = (carousel: string): Promise<string> => page.evaluate((s) => document.querySelector(`${s} [data-slot=carousel-dot][aria-current=true]`)?.getAttribute("aria-label") ?? "", carousel);

  // ---------------------------------------------------------------- Carousel
  const plain = await kit.demo("Carousel");
  const root = `${plain} [data-slot=carousel]`;
  const viewport = `${plain} [data-slot=carousel-viewport]`;
  const next = `${plain} [data-slot=carousel-next]`;
  const previous = `${plain} [data-slot=carousel-previous]`;
  const seen = (): Promise<string> => text("[data-testid=plain-seen]");
  check((await attr(root, "role")) === "region" && (await attr(root, "aria-roledescription")) === "carousel" && (await attr(root, "aria-label")) === "Places", "the carousel is a named region that says it is a carousel");
  const slides = await page.evaluate((s) => [...document.querySelectorAll(`${s} [data-slot=carousel-slide]`)].map((node) => `${node.getAttribute("role")}|${node.getAttribute("aria-roledescription")}|${node.getAttribute("aria-label")}`), plain);
  check(slides.length === 5 && slides[0] === "group|slide|1 of 5" && slides[4] === "group|slide|5 of 5", `each slide is a group named by its place (${slides[0]})`);
  check((await shown(plain)).places.join() === "0", `only the slide in view can be reached: the others are inert (${(await shown(plain)).places.join()})`);
  check((await attr(viewport, "aria-live")) === "polite" && (await attr(viewport, "tabindex")) === "0", "the row of slides is a polite live region and a Tab stop");
  check((await attr(previous, "aria-label")) === "Previous slide" && (await attr(next, "aria-label")) === "Next slide", "the buttons have names");
  check((await attr(next, "aria-controls")) === (await attr(viewport, "id")) && (await attr(viewport, "id")) !== null, "and say what they control");
  check((await attr(previous, "aria-disabled")) === "true" && (await attr(next, "aria-disabled")) === null, "at the first slide Previous says it is unavailable");
  check((await count(`${plain} [data-slot=carousel-dot]`)) === 5 && (await attr(`${plain} [data-slot=carousel-dots]`, "role")) === "group" && (await attr(`${plain} [data-slot=carousel-dots]`, "aria-label")) === "Choose a slide", "the dots are a named group, one per slide");
  check((await current(plain)) === "Go to slide 1" && (await count(`${plain} [data-slot=carousel-dot][tabindex="0"]`)) === 1, "the dot of the slide in view is current and the only Tab stop among them");

  // Buttons.
  check(await kit.click(next), "Next can be pressed");
  await rest();
  let state = await shown(plain);
  check(state.places.join() === "1" && state.gap <= 2, `Next brings the second slide to the start of the view (slides ${state.places.join()}, ${state.gap}px off)`);
  check((await current(plain)) === "Go to slide 2" && (await seen()) === "1", `the dots follow and the change is reported once (${await seen()})`);
  check((await attr(previous, "aria-disabled")) === null, "Previous is available again");
  await kit.focus(next);
  await keys("Enter");
  await rest();
  await keys("Enter");
  await rest();
  await keys("Enter");
  await rest();
  check((await shown(plain)).places.join() === "4" && (await attr(next, "aria-disabled")) === "true", "at the last slide Next says it is unavailable");
  check(await kit.focusIs(next), "and keeps focus");
  await keys("Enter");
  await rest();
  check((await shown(plain)).places.join() === "4", "an unavailable button does nothing");
  await kit.click(previous);
  await rest();
  check((await shown(plain)).places.join() === "3", "Previous goes back one");

  // Keys on the row of slides.
  check(await kit.focus(viewport), "the row of slides takes focus");
  await keys("Home");
  await rest();
  check((await shown(plain)).places.join() === "0", "Home goes to the first slide");
  await keys(forward);
  await rest();
  state = await shown(plain);
  check(state.places.join() === "1" && state.gap <= 2, `${forward} goes to the next slide in a ${kit.dir} page (slides ${state.places.join()})`);
  await keys(back);
  await rest();
  check((await shown(plain)).places.join() === "0", `${back} goes to the one before`);
  await keys(back);
  await rest();
  check((await shown(plain)).places.join() === "0", "and stops at the first");
  await keys("End");
  await rest();
  check((await shown(plain)).places.join() === "4" && (await current(plain)) === "Go to slide 5", "End goes to the last slide");
  check(await kit.focusIs(viewport), "focus stays on the row while the keys move it");

  // Keys on the dots: focus goes with the choice.
  await kit.focus(`${plain} [data-slot=carousel-dot][aria-current=true]`);
  await keys(back);
  await rest();
  check((await kit.focused()) === "Go to slide 4" && (await current(plain)) === "Go to slide 4", `on the dots an arrow key moves the carousel and focus goes with it (${await kit.focused()})`);
  await keys("Home");
  await rest();
  check((await kit.focused()) === "Go to slide 1" && (await shown(plain)).places.join() === "0", "Home on the dots goes to the first");
  await kit.click(`${plain} [data-slot=carousel-dot][aria-label="Go to slide 3"]`);
  await rest();
  check((await shown(plain)).places.join() === "2", "pressing a dot goes to its slide");
  const dot = await rect(`${plain} [data-slot=carousel-dot]`);
  check(Math.min(dot?.width ?? 0, dot?.height ?? 0) >= (kit.phone ? 40 : 24), `a dot is large enough to press (${dot?.width}px)`);

  // Tab: a link in a slide out of view is not reached.
  await kit.focus(viewport);
  await keys("Tab");
  check((await kit.focused()) === "The round table", `Tab from the row goes to what is in the slide in view (${await kit.focused()})`);
  await keys("Tab");
  check((await kit.focused()) === "Previous slide", `and then past the hidden slides to the buttons (${await kit.focused()})`);

  // Scrolling by hand: a swipe on a phone, the browser's own scrolling on a desktop.
  await kit.click(`${plain} [data-slot=carousel-dot][aria-label="Go to slide 1"]`);
  await rest();
  const before = await seen();
  const box = await rect(viewport);
  if (kit.phone && box) {
    const y = box.y + box.height / 2;
    const from = rtl ? box.x + box.width * 0.2 : box.x + box.width * 0.8;
    const to = rtl ? box.x + box.width * 0.8 : box.x + box.width * 0.2;
    await page.touchscreen.touchStart(from, y);
    for (let step = 1; step <= 8; step++) {
      await page.touchscreen.touchMove(from + ((to - from) * step) / 8, y);
      await sleep(20);
    }
    await page.touchscreen.touchEnd();
  } else {
    await page.evaluate((s) => {
      const row = document.querySelector(s) as HTMLElement;
      row.scrollBy({ left: row.clientWidth * (getComputedStyle(row).direction === "rtl" ? -1 : 1), behavior: "instant" });
    }, viewport);
  }
  await rest();
  state = await shown(plain);
  check(state.places.join() === "1" && state.gap <= 2, `${kit.phone ? "a swipe" : "scrolling the row"} moves to the next slide and it snaps into place (slides ${state.places.join()}, ${state.gap}px off)`);
  check((await current(plain)) === "Go to slide 2" && (await seen()) === `${before}, 1`, `the carousel notices where it came to rest (${await seen()})`);
  await kit.axe(plain, "carousel");
  await kit.screenshot("carousel");

  // ---------------------------------------------------------------- Several to a view, controlled
  const several = await kit.demo("Carousel: several to a view, controlled");
  const perView = kit.phone ? 1 : 3;
  const places = kit.phone ? 6 : 4;
  const index = (): Promise<string> => text("[data-testid=several-index]");
  check((await attr(`${several} [data-slot=carousel]`, "aria-labelledby")) === "several-title", "a carousel can be named by its heading");
  check((await shown(several)).places.length === perView, `${perView} slide${perView === 1 ? "" : "s"} show at this width, and only they can be reached`);
  check((await text(`${several} [data-slot=carousel-count] [aria-hidden]`)) === `1 / ${places}` && (await text(`${several} [data-slot=carousel-count] .sr-only`)) === `Slide 1 of ${places}`, `the count says where it is, in figures and in words (${await text(`${several} [data-slot=carousel-count]`)})`);
  await kit.clickText(`${several} button`, "Show the third");
  await rest();
  state = await shown(several);
  check(state.places[0] === 2 && state.gap <= 2 && (await index()) === "2", `a controlled carousel follows its index (slides ${state.places.join()})`);
  check((await text(`${several} [data-slot=carousel-count] [aria-hidden]`)) === `3 / ${places}`, "and the count follows");
  await kit.click(`${several} [data-slot=carousel-next]`);
  await rest();
  check((await index()) === "3" && (await shown(several)).places[0] === 3, `Next reports the new index (${await index()})`);
  check(((await attr(`${several} [data-slot=carousel-next]`, "aria-disabled")) === "true") === !kit.phone, kit.phone ? "one to a view, there are more slides to come" : "three to a view, the fourth place is the last: Next is unavailable");
  await kit.clickText(`${several} button`, "Back to the first");
  await rest();
  check((await shown(several)).places[0] === 0 && (await index()) === "0", "and it goes back when the index does");
  await kit.axe(several, "carousel with several slides to a view");

  // ---------------------------------------------------------------- Autoplay
  const auto = await kit.demo("Carousel: autoplay");
  const autoRoot = `${auto} [data-slot=carousel]`;
  const toggle = `${auto} [data-slot=carousel-play-pause]`;
  const figures = (): Promise<string> => text(`${auto} [data-slot=carousel-count] [aria-hidden]`);
  // The checks' clicks are made with a mouse at every width: park it away from the carousel, which waits while a mouse is on it.
  await page.mouse.move(2, 2);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await sleep(300);
  check((await attr(toggle, "aria-label")) === "Stop the slides moving" && (await attr(toggle, "data-state")) === "playing", "autoplay comes with a button whose name says it will stop it");
  check((await page.evaluate((s) => document.querySelector(`${s} [data-slot=carousel] button`)?.getAttribute("data-slot"), auto)) === "carousel-play-pause", "and it is the first control in the carousel");
  check((await attr(autoRoot, "data-autoplay")) === "running" && (await attr(`${auto} [data-slot=carousel-viewport]`, "aria-live")) === "off", "while it plays by itself the slides are not read out");
  const first = await figures();
  // Watched, not sampled once: with three slides, a fixed wait can land on the same figure a whole round later.
  const moved = await page
    .waitForFunction((s, was) => document.querySelector(`${s} [data-slot=carousel-count] [aria-hidden]`)?.textContent !== was, { timeout: 4000 }, auto, first)
    .then(() => true)
    .catch(() => false);
  check(moved, `it moves to another slide by itself (${first} then ${await figures()})`);
  const wrapped = await page
    .waitForFunction((s) => document.querySelector(`${s} [data-slot=carousel-count] [aria-hidden]`)?.textContent === "1 / 3", { timeout: 8000 }, auto)
    .then(() => true)
    .catch(() => false);
  check(wrapped, "after the last slide it goes round to the first");
  check((await attr(`${auto} [data-slot=carousel-next]`, "aria-disabled")) === null && (await attr(`${auto} [data-slot=carousel-previous]`, "aria-disabled")) === null, "a carousel that loops has no unavailable button");

  if (!kit.phone) {
    const point = await center(`${auto} [data-slot=carousel-viewport]`);
    await page.mouse.move(point.x, point.y);
    await sleep(700);
    const held = await figures();
    check((await attr(autoRoot, "data-autoplay")) === "paused" && (await attr(`${auto} [data-slot=carousel-viewport]`, "aria-live")) === "polite", "it waits while the pointer is on it");
    await sleep(2600);
    check((await figures()) === held, "and does not move meanwhile");
    await page.mouse.move(2, 2);
    await sleep(300);
    check((await attr(autoRoot, "data-autoplay")) === "running", "and carries on when the pointer leaves");
  }

  await kit.focus(toggle);
  await sleep(700);
  const focusedAt = await figures();
  check((await attr(autoRoot, "data-autoplay")) === "paused", "it waits while focus is inside it");
  await sleep(2600);
  check((await figures()) === focusedAt, "and does not move under the keyboard");
  await keys("Enter");
  check((await attr(toggle, "aria-label")) === "Start the slides moving" && (await attr(toggle, "data-state")) === "stopped", "the button stops it, and its name becomes what it will do next");
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await sleep(2600);
  check((await figures()) === focusedAt && (await attr(autoRoot, "data-autoplay")) === "paused", "stopped, it stays stopped after focus has left");
  await kit.focus(`${auto} [data-slot=carousel-next]`);
  await keys("Enter");
  await rest();
  check((await figures()) !== focusedAt, "the buttons still work while it is stopped");
  await kit.focus(toggle);
  await keys("Enter");
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.mouse.move(2, 2);
  await sleep(300);
  check((await attr(autoRoot, "data-autoplay")) === "running", "and the button starts it again");

  // Reduced motion: nothing moves by itself, and a move is made at once.
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await sleep(400);
  check((await count(toggle)) === 0 && (await attr(autoRoot, "data-autoplay")) === null, "under reduced motion there is no autoplay, so no button for it");
  const still = await figures();
  await sleep(2600);
  check((await figures()) === still, "and the slides do not move by themselves");
  await kit.click(`${auto} [data-slot=carousel-next]`);
  await sleep(120);
  check((await shown(auto)).gap <= 2 && (await figures()) !== still, "a press moves to the next slide at once, without sliding");
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
  await sleep(300);
  // Stop it, so that nothing moves under the rest of the checks.
  await kit.click(toggle);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.mouse.move(2, 2);
  await kit.axe(auto, "carousel with autoplay");

  // ---------------------------------------------------------------- Media rows
  const rows = await kit.demo("Media rows");
  const order = (): Promise<string> => text("[data-testid=rows-order]");
  const cover = (): Promise<string> => text("[data-testid=rows-cover]");
  const row = (id: string): string => `${rows} [data-slot=media-row][data-row="${id}"]`;
  const START = "hills, wall, table, harbour";
  check((await page.$eval(`${rows} [data-slot=sortable-list]`, (node) => node.tagName)) === "OL" && (await attr(`${rows} [data-slot=sortable-list]`, "aria-label")) === "Pictures, in order", "the rows are a named ordered list");
  check((await count(`${rows} [data-slot=sortable-list] > li`)) === 4 && (await count(`${rows} [data-slot=upload-item]:not([role=presentation])`)) === 0, "one list item per row: the upload row inside it is layout only");
  const radios = await page.evaluate((s) => [...document.querySelectorAll<HTMLInputElement>(`${s} input[type=radio]`)].map((input) => `${input.getAttribute("aria-label")}|${input.checked}|${input.disabled}|${input.name}`), rows);
  check(radios.length === 4 && radios[0]?.startsWith("Cover: hills.jpg|true|false|") === true && new Set(radios.map((radio) => radio.split("|")[3])).size === 1, `the cover choices are radio buttons in one group, named by their file (${radios[0]})`);
  check(radios[2]?.startsWith("Cover: table.jpg|false|true|") === true, "a failed row cannot be the cover");
  check((await text(`${row("hills")} [data-slot=media-row-cover-mark]`)) === "Cover picture" && (await count(`${rows} [data-slot=media-row-cover-mark]`)) === 1, "the cover row says so in words");
  const bar = `${row("wall")} [role=progressbar]`;
  check((await attr(bar, "aria-label")) === "north-wall.jpg" && (await attr(bar, "aria-valuenow")) === "40", "a row on its way has a progress bar named after its file");
  check((await count(`${row("hills")} [role=progressbar]`)) === 0, "a finished row has none");
  check((await text(`${row("table")} [data-slot=upload-state]`)) === "Failed" && (await text(`${row("table")} [data-slot=upload-detail]`)) === "The connection dropped.", "a failed row says so and why");

  // Retry.
  check((await count(`${rows} [data-slot=upload-retry]`)) === 1 && (await attr(`${row("table")} [data-slot=upload-retry]`, "aria-label")) === "Try again: table.jpg", "only the failed row has a retry button, named after its file");
  await kit.click(`${row("table")} [data-slot=upload-retry]`);
  await sleep(300);
  check((await text("[data-testid=rows-retried]")) === "1" && (await text(`${row("table")} [data-slot=upload-state]`)) === "Uploaded", "retry tells the project, and the row shows its new state");
  check((await kit.announced()).includes("table.jpg: Uploaded"), "the row finishing is read out");
  check((await count(`${rows} input[type=radio]:disabled`)) === 0, "and it can now be the cover");

  // Description.
  const alt = `${row("hills")} [data-slot=media-row-alt]`;
  check((await attr(alt, "aria-label")) === "Description of hills.jpg" && (await page.evaluate((s) => (document.querySelector(s) as HTMLInputElement).labels?.[0]?.textContent, alt)) === "Description", "each row has a labelled description field, named after its file");
  check((await page.evaluate((s) => (document.querySelector(s) as HTMLInputElement).value, alt)) === "A sun low over two hills", "it shows the description the row has");
  await kit.focus(alt);
  await page.keyboard.down("Control");
  await page.keyboard.press("a");
  await page.keyboard.up("Control");
  await page.keyboard.type("Two hills at dusk");
  await sleep(150);
  check((await text("[data-testid=rows-alt]")) === "Two hills at dusk" && (await kit.focusIs(alt)), "typing reports the new description and the field keeps focus");
  await keys("ArrowLeft", "Home");
  check((await order()) === START, "keys pressed in the field do not move rows");

  // Cover.
  await kit.click(`${row("harbour")} input[type=radio]`);
  check((await cover()) === "harbour" && (await text(`${row("harbour")} [data-slot=media-row-cover-mark]`)) === "Cover picture" && (await count(`${rows} [data-slot=media-row-cover-mark]`)) === 1, "choosing another cover moves the mark: there is exactly one");
  check((await lastAnnounced()) === "مرفأ.jpg is now the cover.", `the new cover is read out (${await lastAnnounced()})`);
  await kit.focus(`${row("harbour")} input[type=radio]`);
  await keys("ArrowUp");
  check((await cover()) === "table" && (await kit.focused()) === "Cover: table.jpg", `as in any radio group, an arrow key moves the choice to the row before (${await cover()})`);

  // Reordering: keyboard, buttons, dragging. Each is read out.
  const handle = (name: string): string => `${rows} [aria-label="Reorder ${name}"]`;
  await kit.focus(handle("hills.jpg"));
  await keys("Space");
  check((await attr(handle("hills.jpg"), "aria-pressed")) === "true" && (await lastAnnounced()).startsWith("hills.jpg, lifted. Position 1 of 4."), "Space on the handle lifts the row, and says so");
  await keys("ArrowDown");
  check((await order()) === "wall, hills, table, harbour" && (await lastAnnounced()) === "hills.jpg, position 2 of 4.", `Down moves it and the move is read out (${await order()})`);
  await keys("Space");
  check((await lastAnnounced()) === "hills.jpg, dropped at position 2 of 4." && (await kit.focusIs(handle("hills.jpg"))), "Space drops it; focus stays on its handle");
  await kit.click(`${rows} [aria-label="Move hills.jpg up"]`);
  check((await order()) === START && (await lastAnnounced()) === "hills.jpg, position 1 of 4.", "the move buttons reorder without dragging");
  check((await cover()) === "table", "moving rows does not change the cover");

  const grip = await center(handle("hills.jpg"));
  const pitch = ((await rect(row("hills")))?.height ?? 120) + 8;
  if (kit.phone) {
    await page.touchscreen.touchStart(grip.x, grip.y);
    for (let step = 1; step <= 12; step++) {
      await page.touchscreen.touchMove(grip.x, grip.y + (pitch * 1.2 * step) / 12);
      await sleep(30);
    }
    await sleep(100);
    await page.touchscreen.touchEnd();
  } else {
    await page.mouse.move(grip.x, grip.y);
    await page.mouse.down();
    for (let step = 1; step <= 12; step++) {
      await page.mouse.move(grip.x, grip.y + (pitch * 1.2 * step) / 12);
      await sleep(30);
    }
    await sleep(100);
    await page.mouse.up();
  }
  await sleep(500);
  check((await order()) === "wall, hills, table, harbour", `dragging the handle with ${kit.phone ? "a finger" : "the mouse"} reorders (${await order()})`);
  check((await lastAnnounced()) === "hills.jpg, dropped at position 2 of 4.", "and the drop is read out");

  // Remove: focus goes to the row that took its place; removing the cover passes it on.
  const removeSize = await rect(`${row("table")} [data-slot=upload-remove]`);
  check(Math.min(removeSize?.width ?? 0, removeSize?.height ?? 0) >= (kit.phone ? 40 : 24), `the row buttons are large enough (${removeSize?.width}px)`);
  check((await attr(`${row("table")} [data-slot=upload-remove]`, "aria-label")) === "Remove: table.jpg", "the remove button is named after its file");
  await kit.focus(`${row("table")} [data-slot=upload-remove]`);
  await keys("Enter");
  await sleep(300);
  check((await order()) === "wall, hills, harbour" && (await lastAnnounced()) === "table.jpg removed.", "removing a row tells the project and is read out");
  check((await kit.focused()) === "Reorder مرفأ.jpg", `focus goes to the row that took its place (${await kit.focused()})`);
  check((await cover()) === "wall", `the cover was removed, so the first row left becomes the cover (${await cover()})`);
  await kit.click(`${row("harbour")} [data-slot=upload-remove]`);
  await sleep(300);
  check((await kit.focused()) === "Reorder hills.jpg", `after the last row is removed focus goes to the one before (${await kit.focused()})`);
  await kit.axe(rows, "media rows");
  await kit.screenshot("media-rows");
  await kit.click(`${row("hills")} [data-slot=upload-remove]`);
  await kit.click(`${row("wall")} [data-slot=upload-remove]`);
  await sleep(300);
  check((await text(`${rows} [data-slot=media-row-empty]`)) === "No pictures yet." && (await kit.focusIs(`${rows} [data-slot=media-row-list]`)) && (await cover()) === "none", "with no rows left it shows the empty words, holds focus, and there is no cover");
  await kit.clickText(`${rows} button`, "Start again");
  check((await order()) === START && (await cover()) === "hills", "the rows come back");

  // ---------------------------------------------------------------- Media rows: order only
  const bare = await kit.demo("Media rows: order only");
  check((await count(`${bare} input`)) === 0 && (await count(`${bare} [data-slot=upload-remove]`)) === 0, "without the handlers there is no description field, cover choice or remove button");
  check((await attr(`${bare} [role=progressbar]`, "aria-valuenow")) === "0" && (await text(`${bare} [data-slot=upload-state]`)) === "Waiting", "a waiting row shows its state and an empty bar");
  await kit.click(`${bare} [aria-label="Move opening.mp4 down"]`);
  check((await page.evaluate((s) => [...document.querySelectorAll(`${s} [data-slot=upload-name]`)].map((node) => node.textContent).join(), bare)) === "opening.mp4,closing.mp4", "a list given fixed rows stays as the project has it: the order is the project's to keep");
  await kit.axe(bare, "media rows, order only");
}
