// Checks: steps, wizard, sortable-list, combobox, skeleton (site/src/app/flows).

import type { Kit } from "../smoke-kit.ts";

export const route = "/flows";

export async function run(kit: Kit): Promise<void> {
  const { check, keys, text, attr, count, focusIs, page, sleep } = kit;

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
  /** The newest message in the polite (default) or the assertive live region. */
  const lastAnnounced = (politeness: "polite" | "assertive" = "polite"): Promise<string> =>
    page.evaluate((level) => [...document.querySelectorAll(`#rui-announcer [data-politeness=${level}] > div`)].at(-1)?.textContent ?? "", politeness);

  // ---------------------------------------------------------------- Steps
  const steps = await kit.demo("Steps");
  const segments = `${steps} [data-slot=steps][data-variant=segments]`;
  const labelled = `${steps} [data-slot=steps][data-variant=labelled]`;
  check((await text(`${steps} [data-slot=steps-count]`)) === "Step 3 of 6", "the count is in words");
  check((await page.$eval(`${segments} ol`, (node) => node.tagName)) === "OL" && (await attr(`${segments} ol`, "aria-label")) === "Progress, as segments", "the rail is a named ordered list");
  check((await count(`${segments} li`)) === 6, "one segment per step");
  check((await count(`${segments} li[aria-current=step]`)) === 1 && (await attr(`${segments} li[aria-current=step]`, "data-state")) === "current", "the current step, and only it, has aria-current=step");
  check((await text(`${segments} li:nth-child(2)`)) === "People, Filled in for you: Two adults, from your last visit", `a step is read as its title, its state and its note (${await text(`${segments} li:nth-child(2)`)})`);
  check((await text(`${segments} li:nth-child(4)`)) === "Extras, Skipped" && (await text(`${segments} li:nth-child(5)`)).startsWith("Payment, Blocked"), "skipped and blocked are said in words");
  const marks = await page.evaluate(
    (s) => ({
      dashes: document.querySelectorAll(`${s} li[data-state=skipped] [data-slot=step-segment] > span`).length,
      extra: document.querySelectorAll(`${s} [data-slot=step-mark]`).length,
      currentHeight: document.querySelector(`${s} li[data-state=current] [data-slot=step-segment]`)?.getBoundingClientRect().height ?? 0,
      doneHeight: document.querySelector(`${s} li[data-state=done] [data-slot=step-segment]`)?.getBoundingClientRect().height ?? 0,
    }),
    segments,
  );
  check(marks.dashes === 4 && marks.extra === 2 && marks.currentHeight > marks.doneHeight, "states differ by shape, not only colour (dashes, marks, a thicker current segment)");
  check((await count(`${segments} li[data-state=done] button`)) === 1 && (await count(`${segments} li[data-state=upcoming] button`)) === 0, "a step one can go back to is a button; the others are not");
  const hit = await rect(`${segments} li[data-state=done] button`);
  check((hit?.height ?? 0) >= (kit.phone ? 40 : 24), `the segment's pressable area is tall enough (${hit?.height}px)`);
  await kit.focus(`${segments} li[data-state=done] button`);
  check((await kit.focused()) === "Dates, Done", `the step button is named by its title and state (${await kit.focused()})`);

  check((await count(`${labelled} li`)) === 5 && (await count(`${labelled} li[aria-current=step]`)) === 1, "the labelled rail has its steps and one current");
  check((await text(`${labelled} li[data-state=assumed] [data-slot=step-state]`)) === "Filled in for you: Taken from the first row", "an assumed step shows its note");
  check((await count(`${labelled} li[data-state=done] svg`)) === 1 && (await count(`${labelled} li[data-state=skipped] svg`)) === 1, "done and skipped carry their own marks");
  const markers = await page.evaluate((s) => [...document.querySelectorAll(`${s} [data-slot=step-marker]`)].map((node) => node.getBoundingClientRect()).map((box) => [Math.round(box.x), Math.round(box.y)]), labelled);
  const sameRow = new Set(markers.map((marker) => marker[1])).size === 1;
  const sameColumn = new Set(markers.map((marker) => marker[0])).size === 1;
  check(kit.phone ? sameColumn : sameRow, kit.phone ? "in a narrow container the labelled rail is a column" : "in a wide container the labelled rail is a row");
  if (!kit.phone) {
    const xs = markers.map((marker) => marker[0] ?? 0);
    const ascending = xs.every((x, index) => index === 0 || x > (xs[index - 1] ?? 0));
    const descending = xs.every((x, index) => index === 0 || x < (xs[index - 1] ?? 0));
    check(kit.dir === "rtl" ? descending : ascending, "the row runs in the reading direction");
  }

  await kit.screenshot("steps");

  // ---------------------------------------------------------------- Wizard
  const wizard = await kit.demo("Wizard");
  const root = `${wizard} [data-slot=wizard]`;
  const heading = `${wizard} [data-slot=wizard-step-title]`;
  const next = `${wizard} [data-slot=wizard-next]`;
  const stepNow = (): Promise<string> => text("[data-testid=wizard-step]");
  const named = await page.evaluate((s) => {
    const element = document.querySelector(s);
    return element?.getAttribute("role") === "group" ? (document.getElementById(element.getAttribute("aria-labelledby") ?? "")?.textContent ?? "") : "";
  }, root);
  check(named === "Book a table", "the wizard is a group named by its header");
  check((await text(`${wizard} [data-slot=steps-count]`)) === "Step 1 of 4", "the header counts the steps");
  check((await count(`${wizard} [data-slot=wizard-rail] li`)) === 4, "the rail has one mark per real step");
  check((await count(`${wizard} [data-slot=wizard-step]`)) === 1, "only the current step is in the page");
  check((await attr(`${wizard} [data-slot=wizard-back]`, "disabled")) !== null, "Back is disabled on the first step");
  check((await count(`${wizard} [data-slot=wizard-skip]`)) === 0, "Skip is not offered on a step that must be answered");

  // A step that is not answered blocks the main button and says why.
  check((await attr(next, "aria-disabled")) === "true", "the main button says it is unavailable while the step is unanswered");
  const reason = await page.evaluate((s) => document.getElementById(document.querySelector(s)?.getAttribute("aria-describedby") ?? "")?.textContent ?? "", next);
  check(reason === "Choose a day to go on.", `the reason is shown and is the button's description (${reason})`);
  await kit.focus(next);
  await keys("Enter");
  check((await stepNow()) === "day", "pressing it does not go on");
  check((await lastAnnounced("assertive")) === "Choose a day to go on.", "and the reason is read out");
  await kit.clickText(`${wizard} [data-slot=chip-group-item]`, "Saturday");
  check((await attr(next, "aria-disabled")) === null && (await count(`${wizard} [data-slot=wizard-reason]`)) === 0, "answering the step frees the button");
  check((await text(next)) === "Choose people", "the main button is named after what the step does");

  // Going on moves focus to the new step's heading.
  await kit.focus(next);
  await keys("Enter");
  check((await stepNow()) === "people", "the main button goes to the next step (controlled)");
  check(await focusIs(heading), `focus moves to the new step's heading (${await kit.focused()})`);
  check((await text(heading)) === "Step 2 of 4: How many people?" && (await attr(heading, "tabindex")) === "-1", `the heading's name has the count and it is not a Tab stop (${await text(heading)})`);
  check((await attr(`${wizard} [data-slot=wizard-step]`, "data-travel")) === "forward", "the step knows it came forward");
  const travel = await page.evaluate((s) => getComputedStyle(document.querySelector(s) as Element).getPropertyValue("--tw-enter-translate-x"), `${wizard} [data-slot=wizard-step]`);
  check(travel.includes("-1") === (kit.dir === "rtl"), `it arrives from the end side, mirrored right to left (${travel.trim()})`);
  check((await attr(`${wizard} [data-slot=wizard-rail] li:nth-child(1)`, "data-state")) === "done" && (await attr(`${wizard} [data-slot=wizard-rail] li:nth-child(2)`, "aria-current")) === "step", "the rail follows");
  await kit.axe(root, "the wizard on its second step");
  await kit.screenshot("wizard");

  await kit.click(next);
  check((await stepNow()) === "notes" && (await count(`${wizard} [data-slot=wizard-skip]`)) === 1, "an optional step offers Skip");
  await kit.click(`${wizard} [data-slot=wizard-skip]`);
  check((await stepNow()) === "review" && (await attr(`${wizard} [data-slot=wizard-rail] li:nth-child(3)`, "data-state")) === "skipped", "skipping goes on and marks the step skipped on the rail");
  check((await text("[data-testid=wizard-summary]")) === "Saturday, 2 people.", "the steps' answers are the project's own state");
  await kit.click(`${wizard} [data-slot=wizard-back]`);
  check((await stepNow()) === "notes" && (await attr(`${wizard} [data-slot=wizard-step]`, "data-travel")) === "back" && (await focusIs(heading)), "Back goes back, from the other side, and focuses the heading");

  // Reduced motion: the step simply appears.
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await kit.click(next);
  const animation = await page.evaluate((s) => getComputedStyle(document.querySelector(s) as Element).animationName, `${wizard} [data-slot=wizard-step]`);
  check(animation === "none", `under reduced motion a step does not animate (${animation})`);
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);

  // The rail can take one back; the last step completes.
  await kit.focus(`${wizard} [data-slot=wizard-rail] li:nth-child(1) button`);
  await keys("Enter");
  check((await stepNow()) === "day" && (await focusIs(heading)), "a passed step on the rail is a button that goes back to it");
  await kit.click(next);
  await kit.click(next);
  await kit.click(next);
  check((await text(next)) === "Confirm" && (await text("[data-testid=wizard-done]")) === "no", "the last step's button has its own verb");
  await kit.click(next);
  check((await text("[data-testid=wizard-done]")) === "yes" && (await stepNow()) === "review", "pressing it on the last step completes");

  // ---------------------------------------------------------------- Sortable list
  const sortable = await kit.demo("Sortable list");
  const order = (): Promise<string> => text("[data-testid=order]");
  const handle = (label: string): string => `${sortable} [aria-label="Reorder ${label}"]`;
  const START = "market, lunch, museum, walk, concert";
  check((await page.$eval(`${sortable} [data-slot=sortable-list]`, (node) => node.tagName)) === "OL" && (await count(`${sortable} [data-slot=sortable-list] > li`)) === 5, "the list is an ordered list of rows");
  check((await attr(`${sortable} [data-slot=sortable-list]`, "aria-label")) === "Stops, in order", "it has a name");
  check((await count(`${sortable} [role]`)) === 0 && (await count(`${sortable} [aria-roledescription]`)) === 0, "plain list semantics: no invented roles");
  const described = await page.evaluate((s) => document.getElementById(document.querySelector(s)?.getAttribute("aria-describedby") ?? "")?.textContent ?? "", handle("Lunch"));
  check(described.startsWith("Press Space or Enter to lift"), "the handle is described by how the keyboard works");
  check((await attr(handle("Lunch"), "aria-pressed")) === "false", "the handle is a toggle that is not pressed");
  check((await attr(`${sortable} li`, "tabindex")) === null, "the row itself is not a Tab stop");

  // Keyboard: lift, move, cancel.
  await kit.focus(handle("Lunch"));
  await keys("ArrowDown");
  check((await order()) === START, "arrow keys do nothing until the row is lifted");
  await keys("Space");
  check((await attr(handle("Lunch"), "aria-pressed")) === "true" && (await attr(`${sortable} li[data-lifted]`, "data-lifted")) !== null, "Space lifts the row");
  check((await lastAnnounced()).startsWith("Lunch, lifted. Position 2 of 5."), `the lift is read out (${await lastAnnounced()})`);
  await keys("ArrowDown");
  check((await order()) === "market, museum, lunch, walk, concert", `Down moves the lifted row (${await order()})`);
  check(await focusIs(handle("Lunch")), `the handle keeps focus as its row moves (${await kit.focused()})`);
  check((await lastAnnounced()) === "Lunch, position 3 of 5.", `the move is read out (${await lastAnnounced()})`);
  await keys("ArrowUp", "ArrowUp", "ArrowUp");
  check((await order()) === "lunch, market, museum, walk, concert", "Up moves it and stops at the top");
  await keys("End");
  check((await order()) === "market, museum, walk, concert, lunch" && (await focusIs(handle("Lunch"))), "End sends it to the bottom");
  await keys("Home");
  check((await order()).startsWith("lunch,"), "Home sends it to the top");
  await keys("Escape");
  check((await order()) === START && (await attr(handle("Lunch"), "aria-pressed")) === "false", `Escape puts it back where it was lifted (${await order()})`);
  check((await lastAnnounced()) === "Lunch, put back at position 2 of 5.", `the cancel is read out (${await lastAnnounced()})`);
  check(await focusIs(handle("Lunch")), "focus stays on the handle after Escape");

  // Keyboard: lift with Enter, move, drop.
  await keys("Enter", "ArrowDown", "Enter");
  check((await order()) === "market, museum, lunch, walk, concert" && (await attr(handle("Lunch"), "aria-pressed")) === "false", "Enter lifts and drops too");
  check((await lastAnnounced()) === "Lunch, dropped at position 3 of 5.", `the drop is read out (${await lastAnnounced()})`);

  // Tab drops first.
  await keys("Space", "ArrowUp", "Tab");
  check((await order()) === START && (await count(`${sortable} li[data-lifted]`)) === 0, "Tab drops the row where it is");
  check((await kit.focused()) === "Move Lunch up", `and then moves on (${await kit.focused()})`);

  // Buttons: the alternative to dragging.
  await keys("Enter");
  check((await order()) === "lunch, market, museum, walk, concert", "Move up moves the row one place");
  check((await kit.focused()) === "Move Lunch up" && (await attr(`${sortable} [aria-label="Move Lunch up"]`, "aria-disabled")) === "true", "at the top the button says it is unavailable and keeps focus");
  check((await lastAnnounced()) === "Lunch, position 1 of 5.", "a button move is read out");
  await keys("Enter");
  check((await order()) === "lunch, market, museum, walk, concert", "an unavailable button does nothing");
  check(await kit.click(`${sortable} [aria-label="Move Lunch down"]`), "Move down can be pressed");
  check((await order()) === START, "Move down moves the row one place");
  const buttonSize = await rect(`${sortable} [aria-label="Move Lunch down"]`);
  check(Math.min(buttonSize?.width ?? 0, buttonSize?.height ?? 0) >= (kit.phone ? 40 : 24), `the buttons are large enough (${buttonSize?.width}px)`);

  // A disabled row.
  check((await attr(handle("Evening concert"), "disabled")) !== null && (await attr(`${sortable} [aria-label="Move Evening concert up"]`, "aria-disabled")) === "true", "a disabled row cannot be lifted or moved");

  // Dragging by the handle: mouse on desktop, a finger on the phone.
  const from = await center(handle("Morning market"));
  const rowHeight = (await rect(`${sortable} li`))?.height ?? 48;
  // Rows swap as the dragged row's middle passes the next row's: two pitches (row + gap) passes two rows.
  const travelBy = (rowHeight + 8) * 2;
  if (kit.phone) {
    check((await page.evaluate((s) => getComputedStyle(document.querySelector(s) as Element).touchAction, handle("Morning market"))) === "none", "the handle does not scroll the page under a finger");
    await page.touchscreen.touchStart(from.x, from.y);
    for (let step = 1; step <= 12; step++) {
      await page.touchscreen.touchMove(from.x, from.y + (travelBy * step) / 12);
      await sleep(30);
    }
    await sleep(100);
    await page.touchscreen.touchEnd();
  } else {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    for (let step = 1; step <= 12; step++) {
      await page.mouse.move(from.x, from.y + (travelBy * step) / 12);
      await sleep(30);
    }
    await sleep(100);
    await page.mouse.up();
  }
  await sleep(500);
  check((await order()) === "lunch, museum, market, walk, concert", `dragging the handle down two rows moves the row there (${await order()})`);
  check((await lastAnnounced()) === "Morning market, dropped at position 3 of 5.", `the drop is read out (${await lastAnnounced()})`);
  check((await count(`${sortable} li[data-dragging]`)) === 0, "the row is no longer marked as dragged");
  await kit.axe(sortable, "the sortable list after reordering");

  // Dragging by the whole row (uncontrolled list): at once with a mouse, after a long press with a finger.
  const rows = await kit.demo("Sortable list: whole row, uncontrolled");
  const rowOrder = (): Promise<string> => page.evaluate((s) => [...document.querySelectorAll(`${s} li`)].map((node) => node.textContent?.trim()).join(", "), rows);
  check((await rowOrder()) === "Priority one, Priority two, Priority three", "an uncontrolled list starts in its default order");
  const first = await center(`${rows} li:nth-child(1) span`);
  const rowTravel = ((await rect(`${rows} li`))?.height ?? 48) + 8;
  if (kit.phone) {
    // A quick swipe is a scroll, not a drag.
    await page.touchscreen.touchStart(first.x, first.y);
    for (let step = 1; step <= 6; step++) {
      await page.touchscreen.touchMove(first.x, first.y + (rowTravel * step) / 6);
      await sleep(20);
    }
    await page.touchscreen.touchEnd();
    await sleep(400);
    check((await rowOrder()) === "Priority one, Priority two, Priority three", "a quick swipe over a row does not reorder (it scrolls)");
    const again = await center(`${rows} li:nth-child(1) span`);
    await page.touchscreen.touchStart(again.x, again.y);
    await sleep(650);
    for (let step = 1; step <= 12; step++) {
      await page.touchscreen.touchMove(again.x, again.y + (rowTravel * step) / 12);
      await sleep(30);
    }
    await sleep(100);
    await page.touchscreen.touchEnd();
  } else {
    await page.mouse.move(first.x, first.y);
    await page.mouse.down();
    for (let step = 1; step <= 12; step++) {
      await page.mouse.move(first.x, first.y + (rowTravel * step) / 12);
      await sleep(30);
    }
    await sleep(100);
    await page.mouse.up();
  }
  await sleep(500);
  check((await rowOrder()) === "Priority two, Priority one, Priority three", `${kit.phone ? "a long press, then a drag," : "dragging the row"} reorders (${await rowOrder()})`);
  await kit.click(`${rows} [aria-label="Move Priority three up"]`);
  check((await rowOrder()) === "Priority two, Priority three, Priority one", "the buttons work in an uncontrolled list");

  // ---------------------------------------------------------------- Combobox
  const combobox = await kit.demo("Combobox");
  const content = "[data-slot=combobox-content]";
  const options = (): Promise<string[]> => page.evaluate(() => [...document.querySelectorAll("[data-slot=combobox-content] [role=option]")].map((node) => node.textContent?.trim() ?? ""));
  check((await attr("#city", "role")) === "combobox" && (await attr("#city", "aria-expanded")) === "false", "the trigger is a combobox that says it is closed");
  check((await text("#city")) === "Choose a city" && (await attr("#city", "data-placeholder")) !== null, "it shows the placeholder while nothing is chosen");
  await kit.focus("#city");
  await keys("Enter");
  await sleep(300);
  check((await attr("#city", "aria-expanded")) === "true", "Enter opens the list");
  const controls = await attr("#city", "aria-controls");
  check(controls !== null && (await count(`[id="${controls}"]`)) === 1, "aria-controls points at the panel");
  check(await focusIs(`${content} input[role=combobox]`), `focus is in the search field (${await kit.focused()})`);
  check((await count(`${content} [role=listbox]`)) === 1 && (await attr(`${content} [role=listbox]`, "aria-label")) === "Cities" && (await options()).length === 13, "the options are a named listbox");
  const panel = await rect(content);
  check((panel?.x ?? -1) >= 0 && (panel?.x ?? 0) + (panel?.width ?? 0) <= (kit.phone ? 390 : 1440), "the panel is inside the screen");
  await kit.axe(content, "the open combobox");
  await kit.screenshot("combobox-open");

  await page.keyboard.type("lis");
  await sleep(200);
  check((await options())[0] === "Lisbon" && (await options()).length < 13, `typing narrows the list by the items' text, best match first (${(await options()).join("|")})`);
  await page.keyboard.type("b");
  await sleep(200);
  check((await options()).join("|") === "Lisbon", "typing more narrows it further");
  await keys("Enter");
  await sleep(300);
  check((await text("[data-testid=city]")) === "lis", "Enter chooses the marked item: the value is the item's value");
  check((await count(content)) === 0 && (await focusIs("#city")), `the list closes and focus returns to the trigger (${await kit.focused()})`);
  check((await text("#city")) === "Lisbon" && (await attr(`${combobox} input[type=hidden][name=city]`, "value")) === "lis", "the trigger shows the choice and the form has the value");

  await keys("Space");
  await sleep(300);
  check((await text(`${content} [data-chosen]`)) === "Lisbon, selected" && (await count(`${content} [data-chosen] svg`)) === 1, `the chosen item has a tick and says it is selected (${await text(`${content} [data-chosen]`)})`);
  check((await attr(`${content} [data-chosen]`, "aria-selected")) === "true", "the chosen item is the one marked when the list opens");
  await page.keyboard.type("zzz");
  await sleep(200);
  check((await text(`${content} [data-slot=combobox-empty]`)) === "No city found." && (await options()).length === 0, "nothing found is said in words");
  await keys("Escape");
  await sleep(300);
  check((await count(content)) === 0 && (await focusIs("#city")) && (await text("[data-testid=city]")) === "lis", "Escape closes without changing the value, and focus returns");

  await keys("Enter");
  await sleep(300);
  await keys("ArrowDown", "Enter");
  await sleep(300);
  check((await text("[data-testid=city]")) === "mad", `the arrow keys move through the list (${await text("[data-testid=city]")})`);
  await keys("Enter");
  await sleep(300);
  await keys("Enter");
  await sleep(300);
  check((await text("[data-testid=city]")) === "none" && (await text("#city")) === "Choose a city", "a clearable combobox clears when the chosen item is chosen again");

  // Uncontrolled, grouped.
  check((await text("#unit")) === "Kilometres", "an uncontrolled combobox shows its default value");
  await kit.click("#unit");
  await sleep(300);
  check((await count(`${content} [role=group][aria-labelledby]`)) === 2, "groups are named by their headings");
  await kit.clickText(`${content} [role=option]`, "Miles");
  await sleep(300);
  check((await text("#unit")) === "Miles" && (await attr(`${combobox} input[type=hidden][name=unit]`, "value")) === "mi", "choosing with a press works uncontrolled, and the form has the value");

  // ---------------------------------------------------------------- Skeleton
  const skeleton = await kit.demo("Skeleton");
  const holder = `${skeleton} [data-slot=skeleton][data-loading]`;
  check((await attr("[data-testid=skeleton-region]", "aria-busy")) === "true", "the loading region is marked busy");
  check((await attr(holder, "aria-hidden")) === "true", "the placeholder is hidden from assistive technology");
  const hidden = await page.evaluate((s) => {
    const inner = document.querySelector(`${s} [data-slot=skeleton-content]`) as HTMLElement;
    const button = inner.querySelector("button") as HTMLButtonElement;
    button.focus();
    return { inert: inner.inert, visibility: getComputedStyle(inner).visibility, focused: document.activeElement === button };
  }, holder);
  check(hidden.inert && hidden.visibility === "hidden" && !hidden.focused, "the real content is laid out but invisible and inert");
  const before = await rect("[data-testid=skeleton-card]");
  const placeholder = await rect(holder);
  check(placeholder !== null && before !== null && Math.abs(placeholder.height - before.height) < 1 && Math.abs(placeholder.width - before.width) < 1, `the placeholder is exactly the size of the content (${placeholder?.width}x${placeholder?.height})`);
  const lines = await page.evaluate((s) => [...document.querySelectorAll(`${s} > [data-slot=skeleton-text] [data-slot=skeleton-line]`)].map((node) => Math.round(node.getBoundingClientRect().width)), "[data-testid=skeleton-region]");
  check(lines.length === 3 && (lines[2] ?? 0) < (lines[0] ?? 0), `text lines: the last is shorter (${lines.join(", ")})`);
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  check((await page.evaluate((s) => getComputedStyle(document.querySelector(s) as Element).animationName, holder)) === "none", "the pulse stops under reduced motion");
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
  await kit.clickText(`${skeleton} button`, "Finish loading");
  const after = await rect("[data-testid=skeleton-card]");
  check(after !== null && before !== null && Math.abs(after.height - before.height) < 1 && Math.abs(after.x - before.x) < 1 && Math.abs(after.width - before.width) < 1, "when loading ends the content is where and what size the placeholder was");
  check((await count(holder)) === 0 && (await attr("[data-testid=skeleton-region]", "aria-busy")) === "false", "and the placeholder is gone");
  check(await kit.focus("[data-testid=skeleton-card] button"), "the content can be used once loaded");

  await kit.axe("main", "after the checks");
}
