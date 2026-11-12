// Checks: bottom-sheet, dock, map-frame (site/src/app/panels).

import type { Kit } from "../smoke-kit.ts";

export const route = "/panels";

export async function run(kit: Kit): Promise<void> {
  const { check, keys, text, attr, count, focusIs, page, sleep } = kit;
  const near = (a: number, b: number, tolerance = 4): boolean => Math.abs(a - b) <= tolerance;
  const viewport = await page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight }));
  /** The height of a sheet that shows above the bottom edge. */
  const showing = (selector: string): Promise<number> => page.evaluate((s) => window.innerHeight - (document.querySelector(s)?.getBoundingClientRect().top ?? window.innerHeight), selector);
  const rect = (selector: string): Promise<{ x: number; y: number; width: number; height: number }> =>
    page.evaluate((s) => {
      const box = document.querySelector(s)?.getBoundingClientRect();
      return box ? { x: box.x, y: box.y, width: box.width, height: box.height } : { x: 0, y: 0, width: 0, height: 0 };
    }, selector);
  const shown = (selector: string): Promise<boolean> =>
    page.evaluate((s) => {
      const box = document.querySelector(s)?.getBoundingClientRect();
      return Boolean(box && box.width > 0 && box.height > 0);
    }, selector);
  /** Drags with the mouse from the middle of an element by a distance, in steps so that speed stays low. */
  const mouseDrag = async (selector: string, dx: number, dy: number): Promise<void> => {
    const box = await rect(selector);
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    for (let step = 1; step <= 10; step++) {
      await page.mouse.move(x + (dx * step) / 10, y + (dy * step) / 10);
      await sleep(30);
    }
    await sleep(150);
    await page.mouse.up();
    await sleep(500);
  };
  /** Drags with a finger from a point inside an element by a vertical distance. */
  const touchDrag = async (selector: string, dy: number, offsetY = 0.5): Promise<void> => {
    const box = await rect(selector);
    const x = box.x + box.width / 2;
    const y = box.y + Math.min(box.height * offsetY, 200);
    await page.touchscreen.touchStart(x, y);
    for (let step = 1; step <= 10; step++) {
      await page.touchscreen.touchMove(x, y + (dy * step) / 10);
      await sleep(30);
    }
    await sleep(150);
    await page.touchscreen.touchEnd();
    await sleep(500);
  };

  // Bottom sheet with snap points: a modal dialog with a slider for a handle.
  const sheets = await kit.demo("Bottom sheet");
  const details = "[data-testid=details-sheet]";
  const handle = `${details} [data-slot=bottom-sheet-handle]`;
  check(await kit.clickText(`${sheets} button`, "Open details"), "the trigger opens the sheet");
  await sleep(500);
  check((await attr(details, "role")) === "dialog", "the sheet is a dialog");
  check((await page.evaluate((s) => document.getElementById(document.querySelector(s)?.getAttribute("aria-labelledby") ?? "")?.textContent, details)) === "Saturday by the sea", "it is named by its title");
  check((await count("[data-slot=bottom-sheet-overlay]")) === 1, "a modal sheet has a veil");
  check(await page.evaluate((s) => document.querySelector(s)?.contains(document.activeElement) ?? false, details), "focus moves into the sheet");
  check(near(await showing(details), viewport.height * 0.4), `it opens at the first snap point (${Math.round(await showing(details))}px of ${viewport.height})`);
  check((await attr(handle, "role")) === "slider" && (await attr(handle, "aria-orientation")) === "vertical", "the handle is a vertical slider");
  check((await attr(handle, "aria-label")) === "Sheet height" && (await attr(handle, "aria-valuetext")) === "Position 1 of 2", "the handle has a name and says its position");
  check((await page.evaluate((s) => getComputedStyle(document.querySelector(`${s} [data-slot=bottom-sheet-body]`) as Element).overflowY, details)) === "hidden", "below the top position the body does not scroll");
  await kit.axe(`${details}, [data-slot=bottom-sheet-overlay]`, "the open bottom sheet");

  check(await kit.focus(handle), "the handle takes focus");
  await keys("ArrowUp");
  await sleep(700);
  check((await attr(handle, "aria-valuenow")) === "1" && near(await showing(details), viewport.height * 0.9), `Up goes to the next snap point (${Math.round(await showing(details))}px)`);
  check((await page.evaluate((s) => getComputedStyle(document.querySelector(`${s} [data-slot=bottom-sheet-body]`) as Element).overflowY, details)) === "auto", "at the top position the body scrolls");
  await kit.screenshot("sheet-top");
  await keys("ArrowDown");
  check((await attr(handle, "aria-valuenow")) === "0", "Down goes back");
  await keys("End");
  check((await attr(handle, "aria-valuenow")) === "1", "End goes to the highest position");
  await keys("Home");
  check((await attr(handle, "aria-valuenow")) === "0", "Home goes to the lowest position");
  await keys("Enter");
  check((await attr(handle, "aria-valuenow")) === "1", "Enter goes to the next position");
  await sleep(700);

  // Dragging: the handle with a pointer, the body with a finger.
  if (kit.phone) {
    await touchDrag(`${details} [data-slot=bottom-sheet-body]`, viewport.height * 0.4, 0.2);
    check((await attr(handle, "aria-valuenow")) === "0", "at the top, pulling the body down from the start of its scroll lowers the sheet");
    await touchDrag(`${details} [data-slot=bottom-sheet-body]`, -viewport.height * 0.4, 0.3);
    check((await attr(handle, "aria-valuenow")) === "1", "lower down, a finger on the body raises the sheet");
    await page.evaluate((s) => document.querySelector(`${s} [data-slot=bottom-sheet-body]`)?.scrollTo(0, 120), details);
    await touchDrag(`${details} [data-slot=bottom-sheet-body]`, viewport.height * 0.3, 0.3);
    check((await attr(handle, "aria-valuenow")) === "1", "a scrolled body scrolls instead of moving the sheet");
    await touchDrag(handle, viewport.height * 0.45);
    check((await attr(handle, "aria-valuenow")) === "0", "a finger on the handle moves the sheet");
    await touchDrag(handle, viewport.height * 0.35);
  } else {
    await mouseDrag(handle, 0, viewport.height * 0.45);
    check((await attr(handle, "aria-valuenow")) === "0" && near(await showing(details), viewport.height * 0.4), "dragging the handle down snaps to the lower point");
    await mouseDrag(handle, 0, -viewport.height * 0.3);
    check((await attr(handle, "aria-valuenow")) === "1", "dragging the handle up snaps to the higher point");
    await mouseDrag(handle, 0, viewport.height * 0.45);
    const box = await rect(handle);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await sleep(700);
    check((await attr(handle, "aria-valuenow")) === "1", "a press on the handle goes to the next position");
    await mouseDrag(handle, 0, viewport.height * 0.45);
    await mouseDrag(handle, 0, viewport.height * 0.35);
  }
  await sleep(400);
  check((await count(details)) === 0, "dragging down past the lowest point dismisses the sheet");
  check((await kit.focused()) === "Open details", `focus returns to the trigger (${await kit.focused()})`);

  await keys("Enter");
  await sleep(700);
  check((await count(details)) === 1, "the trigger works from the keyboard");
  await keys("Escape");
  await sleep(700);
  check((await count(details)) === 0 && (await kit.focused()) === "Open details", "Escape closes it and focus returns");

  // Without snap points: as tall as its content, one position.
  const simple = "[data-testid=simple-sheet]";
  check(await kit.clickText(`${sheets} button`, "Open simple sheet"), "a sheet without snap points opens");
  await sleep(500);
  const simpleBox = await rect(simple);
  check(near(simpleBox.y + simpleBox.height, viewport.height) && simpleBox.height < viewport.height * 0.6, `it is as tall as its content, at the bottom edge (${Math.round(simpleBox.height)}px)`);
  check((await attr(`${simple} [data-slot=bottom-sheet-handle]`, "aria-hidden")) === "true" && (await attr(`${simple} [data-slot=bottom-sheet-handle]`, "role")) === null, "with one position the handle is only a grab bar");
  check(simpleBox.width <= viewport.width, "it is no wider than the viewport");
  await kit.axe(simple, "the simple sheet");
  check(await kit.clickText(`${simple} button`, "Copy the link"), "a close button closes it");
  await sleep(700);
  check((await count(simple)) === 0 && (await kit.focused()) === "Open simple sheet", "focus returns to its trigger");

  // Controlled, not modal, not dismissible, in rem and px.
  const player = "[data-testid=player-sheet]";
  const playerHandle = `${player} [data-slot=bottom-sheet-handle]`;
  check(await kit.clickText(`${sheets} button`, "Toggle player"), "a controlled sheet opens from state");
  await sleep(500);
  check((await text("[data-testid=player-state]")) === "8rem" && near(await showing(player), 128), `it rests at a length in rem (${Math.round(await showing(player))}px)`);
  check((await count("[data-slot=bottom-sheet-overlay]")) === 0, "a sheet that is not modal has no veil");
  check((await kit.focused()) === "Toggle player", "it does not take focus when asked not to");
  check((await attr(playerHandle, "aria-label")) === "Player height" && (await attr(playerHandle, "aria-valuetext")) === "Small", "the handle's name and positions can be worded");
  await kit.focus(playerHandle);
  await keys("ArrowUp");
  await sleep(700);
  check((await text("[data-testid=player-state]")) === "320px" && near(await showing(player), 320), "the controlled snap point follows the handle, in pixels");
  await keys("Escape");
  await sleep(300);
  check((await count(player)) === 1, "Escape does not close a sheet that is not dismissible");
  await page.mouse.click(viewport.width / 2, 120);
  await sleep(300);
  check((await count(player)) === 1, "a press outside does not close it");
  await kit.focus(playerHandle);
  await keys("End");
  await sleep(700);
  check((await text("[data-testid=player-state]")) === "1" && near(await showing(player), viewport.height), "a snap point of 1 fills the viewport and no more");
  await kit.axe(player, "the sheet that is not modal");
  await kit.screenshot("player-full");
  check(await kit.clickText(`${player} button`, "Stop and close"), "its close button closes it");
  await sleep(700);
  check((await text("[data-testid=player-state]")) === "closed", "the state follows");

  // Dock.
  const dock = "[data-testid=dock]";
  await kit.demo("Dock");
  const resizer = `${dock} [data-slot=dock-resizer]`;
  const panel = `${dock} [data-slot=dock-panel]`;
  const bar = `${dock} [data-slot=dock-bar]`;
  check((await page.evaluate((s) => document.querySelector(s)?.tagName, panel)) === "ASIDE" && (await attr(panel, "aria-label")) === "Plan", "the panel is a named complementary landmark");
  if (kit.phone) {
    check(!(await shown(panel)) && !(await shown(resizer)), "on a narrow dock the panel and the splitter are not shown");
    check((await shown(bar)) && (await text(bar)) === "Plan · 3 stops", "the bar says what the panel holds");
    check((await attr(bar, "aria-haspopup")) === "dialog", "the bar says it opens a dialog");
    const barBox = await rect(bar);
    check(barBox.height >= 40, `the bar is a touch target (${barBox.height}px)`);
    check(await kit.click(bar), "the bar can be pressed");
    await sleep(500);
    check((await count("[data-testid=plan-sheet]")) === 1, "pressing it opens the panel's content in a bottom sheet");
    await kit.axe("[data-testid=plan-sheet]", "the panel's content in a sheet");
    await kit.screenshot("dock-sheet");
    await keys("Escape");
    await sleep(700);
    check((await count("[data-testid=plan-sheet]")) === 0 && (await focusIs(bar)), "Escape closes the sheet and focus returns to the bar");
  } else {
    const grow = kit.dir === "rtl" ? "ArrowRight" : "ArrowLeft";
    const shrink = kit.dir === "rtl" ? "ArrowLeft" : "ArrowRight";
    const dockWidth = (await rect(dock)).width;
    check((await attr(resizer, "role")) === "separator" && (await attr(resizer, "tabindex")) === "0", "the splitter is a focusable separator");
    check((await attr(resizer, "aria-valuenow")) === "32" && (await attr(resizer, "aria-valuemin")) === "24" && (await attr(resizer, "aria-valuemax")) === "50", "it states its value and range");
    check((await attr(resizer, "aria-controls")) === (await attr(panel, "id")) && (await attr(resizer, "aria-label")) === "Resize the plan", "it names itself and the panel it sizes");
    check(near((await rect(panel)).width, dockWidth * 0.32, 3), `the panel takes its share of the width (${Math.round((await rect(panel)).width)} of ${Math.round(dockWidth)})`);
    check(!(await shown(bar)), "the bar is not shown while the panel is");
    check(await kit.focus(resizer), "the splitter takes focus");
    await keys(grow);
    check((await attr(resizer, "aria-valuenow")) === "34", "the arrow that points at the content makes the panel larger");
    await keys(shrink, shrink);
    check((await attr(resizer, "aria-valuenow")) === "30", "the other arrow makes it smaller");
    await keys("Home");
    check((await attr(resizer, "aria-valuenow")) === "24" && near((await rect(panel)).width, dockWidth * 0.24, 3), "Home makes the panel as small as it may be");
    await keys("End");
    check((await attr(resizer, "aria-valuenow")) === "50", "End makes it as large as it may be");
    await keys("Home");
    await mouseDrag(resizer, kit.dir === "rtl" ? 120 : -120, 0);
    check(near((await rect(panel)).width, dockWidth * 0.24 + 120, 6), `dragging the splitter resizes the panel (${Math.round((await rect(panel)).width)}px)`);
    await mouseDrag(resizer, kit.dir === "rtl" ? 900 : -900, 0);
    check((await attr(resizer, "aria-valuenow")) === "50", "a drag stops at the limit");
    const line = await rect(resizer);
    await page.mouse.click(line.x + 8, line.y + line.height / 2, { count: 2 });
    await sleep(200);
    check((await attr(resizer, "aria-valuenow")) === "32", "a double-click goes back to the default size, on a target wider than the line");
    await kit.focus(resizer);
    await keys("Enter");
    await sleep(200);
    check(!(await shown(panel)) && (await shown(bar)), "Enter on the splitter collapses the panel to a bar");
    check((await focusIs(bar)) && (await attr(bar, "aria-expanded")) === "false", "focus moves to the bar, which says the panel is collapsed");
    await kit.screenshot("dock-collapsed");
    await keys("Enter");
    await sleep(200);
    check((await shown(panel)) && (await focusIs(resizer)), "Enter on the bar restores the panel and returns to the splitter");
    check(await kit.click(`${dock} [aria-label="Hide the plan"]`), "the collapse button has a name");
    check(!(await shown(panel)) && (await focusIs(bar)), "the collapse button collapses and focus moves to the bar");
    check(await kit.click(bar), "the bar can be pressed");
    check((await shown(panel)) && (await focusIs(panel)), "the bar restores the panel and focus moves into it");

    // Controlled, in pixels, at the start.
    const start = "[data-testid=dock-start]";
    await kit.demo("Dock: controlled, at the start");
    check((await text("[data-testid=dock-width]")) === "280" && near((await rect(`${start} [data-slot=dock-panel]`)).width, 280, 2), "a controlled size in pixels is applied");
    const first = await page.evaluate((s) => document.querySelector(`${s} [data-slot=dock-layout]`)?.firstElementChild?.getAttribute("data-slot"), start);
    check(first === "dock-panel", "at the start the panel comes first");
    await kit.focus(`${start} [data-slot=dock-resizer]`);
    await keys(shrink);
    check((await text("[data-testid=dock-width]")) === "300", "at the start the arrows are the other way round");
    await keys("End");
    check((await text("[data-testid=dock-width]")) === "360", "the limits hold in pixels");
    check(await kit.clickText(`${start} button`, "Hide filters"), "a collapse button with text works");
    check((await text("[data-testid=dock-hidden]")) === "hidden" && (await focusIs(`${start} [data-slot=dock-bar]`)), "the controlled collapsed state follows");
    const strip = await rect(`${start} [data-slot=dock-bar]`);
    const layout = await rect(start);
    // "Start" is the left edge, or the right edge in a right-to-left page.
    const atStart = kit.dir === "rtl" ? near(strip.x + strip.width, layout.x + layout.width, 2) : near(strip.x, layout.x, 2);
    check(atStart && strip.width < 60 && near(strip.height, layout.height, 2), "collapsed, the bar is a slim strip where the panel was");
    await keys("Enter");
    check((await text("[data-testid=dock-hidden]")) === "shown", "the bar restores it");
  }
  await kit.axe(`${dock}, [data-testid=dock-start]`, "the docks");

  // Map frame.
  const map = await kit.demo("Map frame");
  const stage = `${map} [data-slot=map-frame-stage]`;
  check((await attr(`${map} [data-slot=map-frame]`, "aria-label")) === "Map of the three stops" && (await page.evaluate((s) => document.querySelector(`${s} [data-slot=map-frame]`)?.tagName, map)) === "SECTION", "the frame is a named region");
  check((await count("[data-testid=fake-map]")) === 0 && (await count(`${map} [data-slot=map-frame-toolbar]`)) === 0, "nothing of the map exists before it is asked for");
  check((await count(`${map} [data-slot=map-frame-list] li`)) === 3, "the text list is there without the map");
  const describedBy = await attr(`${map} [data-slot=map-frame-activate]`, "aria-describedby");
  check(describedBy !== null && (await attr(`${map} [data-slot=map-frame-notice]`, "id")) === describedBy, "the button is described by the notice beside it");
  const before = await rect(stage);
  check(await kit.focus(`${map} [data-slot=map-frame-activate]`), "the button takes focus");
  await keys("Enter");
  await sleep(300);
  check((await text("[data-testid=map-state]")) === "on" && (await count("[data-testid=fake-map]")) === 1, "pressing it turns the map on");
  check(await focusIs(`${map} [data-slot=map-frame-canvas]`), `focus moves to the map (${await kit.focused()})`);
  const after = await rect(stage);
  check(near(before.height, after.height, 1) && near(before.width, after.width, 1), "the stage keeps its size: nothing shifts");
  check((await attr(`${map} [data-slot=map-frame-canvas]`, "role")) === "group" && (await attr(`${map} [data-slot=map-frame-canvas]`, "aria-label")) === "Map", "the canvas is a named group");

  // The skip link.
  check(await kit.focus(`${map} [data-slot=map-frame-skip]`), "there is a link to skip the map");
  check((await rect(`${map} [data-slot=map-frame-skip]`)).height >= 24, "the skip link shows when it has focus");
  await keys("Enter");
  check(await focusIs(`${map} [data-slot=map-frame-after]`), "it moves focus past the map");
  await keys("Tab");
  check(!(await page.evaluate((s) => document.querySelector(s)?.contains(document.activeElement) ?? false, stage)), "the next Tab is outside the map");

  // The toolbar and full screen.
  check((await attr(`${map} [data-slot=map-frame-toolbar]`, "role")) === "group" && (await attr(`${map} [data-slot=map-frame-toolbar]`, "aria-label")) === "Map controls", "the controls are a named group");
  check(await kit.click(`${map} [aria-label="Zoom in"]`), "the project's own control works");
  await page.evaluate(() => ((document.querySelector("[data-testid=fake-map]") as HTMLElement).dataset["mark"] = "kept"));
  const full = `${map} [data-slot=map-frame-fullscreen]`;
  check((await attr(full, "aria-label")) === "Full screen", "the full-screen button says what it does");
  check(await kit.focus(full), "the full-screen button takes focus");
  await keys("Enter");
  await sleep(300);
  const filled = await rect(stage);
  check(near(filled.x, 0, 1) && near(filled.y, 0, 1) && near(filled.width, viewport.width, 1) && near(filled.height, viewport.height, 1), `full screen fills the viewport (${Math.round(filled.width)}x${Math.round(filled.height)})`);
  check(await page.evaluate((s) => document.querySelector(s)?.contains(document.elementFromPoint(6, 6)) ?? false, stage), "it is above everything else, the page header included");
  check((await attr(stage, "role")) === "dialog" && (await attr(stage, "aria-modal")) === "true" && (await attr(stage, "aria-label")) === "Map of the three stops", "in full screen the stage is a named modal dialog");
  check((await attr(full, "aria-label")) === "Leave full screen" && (await focusIs(full)), "the button now says the way back, and keeps focus");
  check(await page.evaluate((s) => document.querySelector(`${s} [data-slot=map-frame-list]`)?.matches("[inert], [inert] *") ?? false, map), "the rest of the page is inert");
  check((await attr("[data-testid=fake-map]", "data-mark")) === "kept" && (await text("[data-testid=fake-map] > span:last-child")) === "zoom 1.2", "the map engine was not mounted again");
  check((await kit.announced()).some((message) => message.includes("fills the screen")), "going to full screen is announced");
  await keys("Tab", "Tab", "Tab", "Tab");
  check(await page.evaluate((s) => (document.querySelector(s)?.contains(document.activeElement) ?? false) || document.activeElement === document.body, stage), "Tab does not reach the page behind");
  await kit.axe(stage, "the map in full screen");
  await kit.screenshot("map-fullscreen");
  await kit.focus(`${map} [aria-label="Zoom in"]`);
  await keys("Escape");
  await sleep(300);
  const back = await rect(stage);
  check(near(back.width, after.width, 1) && near(back.height, after.height, 1), "Escape leaves full screen and the stage is back at its size");
  check(await focusIs(full), "focus is on the full-screen button");
  check(!(await page.evaluate((s) => document.querySelector(`${s} [data-slot=map-frame-list]`)?.matches("[inert], [inert] *") ?? true, map)), "the page is usable again");
  check((await attr("[data-testid=fake-map]", "data-mark")) === "kept", "the map engine is still the same one");
  check((await kit.announced()).some((message) => message.includes("back in the page")), "leaving full screen is announced");

  await kit.axe("main", "after the checks");
}
