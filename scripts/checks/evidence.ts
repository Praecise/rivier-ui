// Checks: compare-slider, certainty-legend, provenance-label (site/src/app/evidence).

import type { Kit } from "../smoke-kit.ts";

export const route = "/evidence";

type Box = { left: number; top: number; right: number; bottom: number; width: number; height: number };

export async function run(kit: Kit): Promise<void> {
  const { check, keys, text, attr, count, page, sleep } = kit;
  const now = async (selector: string): Promise<number> => Number(await attr(selector, "aria-valuenow"));
  const near = (value: number, target: number, within = 2): boolean => Math.abs(value - target) <= within;
  /** Where an element is in the viewport, after bringing it to the middle of the screen. */
  const box = (selector: string, scroll = true): Promise<Box | null> =>
    page.evaluate(
      (s, move) => {
        const element = document.querySelector(s);
        if (!element) return null;
        if (move) element.scrollIntoView({ block: "center", behavior: "instant" });
        const rect = element.getBoundingClientRect();
        return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
      },
      selector,
      scroll,
    );
  const apart = (a: Box | null, b: Box | null): boolean => a !== null && b !== null && (a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
  /** Whether the element drawn at a point is inside (or is) what the selector matches. */
  const hit = (x: number, y: number, selector: string): Promise<boolean> => page.evaluate((px, py, s) => document.elementFromPoint(px, py)?.closest(s) !== null, x, y, selector);
  /** Whether the element drawn at the middle of `selector` belongs to it: nothing is drawn over it. */
  const onTop = async (selector: string): Promise<boolean> => {
    const rect = await box(selector);
    return rect !== null && (await hit(rect.left + rect.width / 2, rect.top + rect.height / 2, selector));
  };
  const style = (selector: string, property: string): Promise<string> => page.evaluate((s, p) => getComputedStyle(document.querySelector(s) as Element).getPropertyValue(p), selector, property);
  const withShift = async (key: "ArrowRight" | "ArrowLeft"): Promise<void> => {
    await page.keyboard.down("Shift");
    await keys(key);
    await page.keyboard.up("Shift");
  };
  /** Drags from one point to another: with the mouse, or with a finger at phone width. */
  const drag = async (from: { x: number; y: number }, to: { x: number; y: number }): Promise<void> => {
    const steps = 8;
    const at = (step: number): { x: number; y: number } => ({ x: from.x + ((to.x - from.x) * step) / steps, y: from.y + ((to.y - from.y) * step) / steps });
    if (kit.phone) {
      await page.touchscreen.touchStart(from.x, from.y);
      for (let step = 1; step <= steps; step += 1) await page.touchscreen.touchMove(at(step).x, at(step).y);
      await page.touchscreen.touchEnd();
    } else {
      await page.mouse.move(from.x, from.y);
      await page.mouse.down();
      for (let step = 1; step <= steps; step += 1) await page.mouse.move(at(step).x, at(step).y);
      await page.mouse.up();
    }
    await sleep(250);
  };

  // ---- Compare slider: uncontrolled, two pictures.
  const compare = await kit.demo("Compare slider");
  const frame = `${compare} [data-slot=compare-slider]`;
  const grip = `${compare} [role=slider]`;
  const handle = `${compare} [data-slot=compare-slider-handle]`;
  check((await attr(grip, "aria-label")) === "The street in 1930 and today", "the divider's grip is a slider with a name");
  check((await attr(grip, "aria-valuemin")) === "0" && (await attr(grip, "aria-valuemax")) === "100" && (await now(grip)) === 50, "it states its range and its value (uncontrolled start)");
  check((await attr(grip, "aria-valuetext")) === "50% 1930, 50% Today", `it says how much of each side shows, by name (${await attr(grip, "aria-valuetext")})`);
  check((await attr(grip, "aria-orientation")) === "horizontal", "it is a horizontal slider");
  check((await attr(frame, "dir")) === "ltr", "the frame is drawn left to right whatever the page's direction");
  check(
    (await attr(`${compare} [data-slot=compare-slider-first]`, "role")) === "group" &&
      (await attr(`${compare} [data-slot=compare-slider-first]`, "aria-label")) === "1930" &&
      (await attr(`${compare} [data-slot=compare-slider-second]`, "aria-label")) === "Today",
    "each layer is a group with its side's name",
  );
  check((await count(`${compare} img[alt]`)) === 2 && (await attr(`${compare} [data-slot=compare-slider-first] img`, "alt")) !== "", "the pictures keep their own text alternatives");
  check(
    (await text(`${compare} [data-slot=compare-slider-label][data-side=first]`)) === "1930" &&
      (await text(`${compare} [data-slot=compare-slider-label][data-side=second]`)) === "Today" &&
      (await attr(`${compare} [data-slot=compare-slider-labels]`, "aria-hidden")) === "true",
    "each side's name is written on the picture (and said once, not twice)",
  );
  const sides = await page.evaluate((s) => {
    const first = document.querySelector(`${s} [data-slot=compare-slider-label][data-side=first]`)?.getBoundingClientRect();
    const second = document.querySelector(`${s} [data-slot=compare-slider-label][data-side=second]`)?.getBoundingClientRect();
    return first && second ? first.right < second.left : false;
  }, compare);
  check(sides, "the first side's name is on the left and the second's on the right");

  check(await kit.focus(grip), "the grip takes focus");
  await keys("ArrowRight");
  check((await now(grip)) === 51 && (await text("[data-testid=compare-changed]")) === "51" && (await text("[data-testid=compare-committed]")) === "51", `Right shows one percent more of the first side, also in a right-to-left page (${await now(grip)})`);
  await keys("ArrowLeft", "ArrowLeft");
  check((await now(grip)) === 49, "Left shows less of it");
  await keys("ArrowUp");
  check((await now(grip)) === 50, "Up does what Right does");
  await keys("ArrowDown");
  check((await now(grip)) === 49, "Down does what Left does");
  await withShift("ArrowRight");
  check((await now(grip)) === 59, `Shift with an arrow moves by ten (${await now(grip)})`);
  await keys("PageUp");
  check((await now(grip)) === 69, "Page Up moves by ten");
  await keys("PageDown");
  check((await now(grip)) === 59, "Page Down moves back by ten");
  await keys("Home");
  check((await now(grip)) === 0 && (await attr(grip, "aria-valuetext")) === "0% 1930, 100% Today", "Home shows none of the first side");
  await keys("ArrowLeft");
  check((await now(grip)) === 0, "it stops there");
  await keys("End");
  check((await now(grip)) === 100 && (await text("[data-testid=compare-committed]")) === "100", "End shows all of it");
  await keys("ArrowRight");
  check((await now(grip)) === 100, "it stops at the end");
  check(await kit.focusIs(grip), "focus stays on the grip throughout");

  // Dragging the line (not the grip): the mouse, or a finger.
  check((await style(handle, "touch-action")) === "pan-y", "a touch moving up or down on the divider still scrolls the page");
  const handleBox = await box(handle);
  const gripBox = await box(grip);
  check((handleBox?.width ?? 0) >= 44 && Math.min(gripBox?.width ?? 0, gripBox?.height ?? 0) >= 40, `the divider can be caught on a strip 44px wide, and its grip is 40px (${handleBox?.width}px, ${gripBox?.width}px)`);
  const area = await box(frame);
  if (area && handleBox) {
    const scrollBefore = await page.evaluate(() => window.scrollY);
    const y = area.top + area.height * 0.2;
    await drag({ x: handleBox.left + handleBox.width / 2 - 4, y }, { x: area.left + area.width * 0.25, y });
    check(near(await now(grip), 25) && near(Number(await text("[data-testid=compare-committed]")), 25), `dragging the line moves the divider there and reports it once it is let go (${await now(grip)})`);
    check((await page.evaluate(() => window.scrollY)) === scrollBefore, "a sideways drag does not move the page");
    const moved = await box(handle, false);
    check(moved !== null && near(moved.left + moved.width / 2, area.left + area.width * 0.25, 4), "the divider is drawn where the value says");
    const middle = area.top + area.height / 2;
    check(await hit(area.left + area.width * 0.1, middle, "[data-slot=compare-slider-first]"), "left of the divider is the first layer");
    check(await hit(area.left + area.width * 0.6, middle, "[data-slot=compare-slider-second]"), "right of it is the second layer");
    check((await style(`${compare} [data-slot=compare-slider-first]`, "clip-path")).startsWith("inset("), "the layers are cut with clip-path, not resized");
    const layers = await page.evaluate((s) => [...document.querySelectorAll(`${s} [data-slot=compare-slider-first], ${s} [data-slot=compare-slider-second]`)].map((node) => Math.round(node.getBoundingClientRect().width)), compare);
    check(layers.length === 2 && layers[0] === layers[1] && near(layers[0] ?? 0, area.width, 3), `both layers keep the full width of the frame (${layers.join(", ")})`);
  } else check(false, "the frame and its divider are on the page");
  check(near((area?.width ?? 0) / (area?.height ?? 1), 16 / 9, 0.05), "the frame holds its aspect ratio");
  await kit.screenshot("compare");
  await kit.axe(compare, "the compare slider");

  // ---- Compare slider: controlled, with controls inside the layers.
  const any = await kit.demo("Compare slider: any two children");
  const second = `${any} [role=slider][aria-label="Survey and reconstruction"]`;
  check((await now(second)) === 30 && (await attr(second, "aria-valuetext")) === "Survey up to 30 percent", `a controlled slider shows its value, in the project's own words (${await attr(second, "aria-valuetext")})`);
  await kit.focus(second);
  await keys("ArrowRight", "ArrowRight");
  check((await text("[data-testid=compare-split]")) === "32" && (await now(second)) === 32, "it follows its value from the keyboard");
  check(await kit.clickText(`${any} button`, "All survey"), "the value can be set from outside");
  check((await now(second)) === 100, "and the divider follows");
  check((await kit.click(`${any} [data-slot=compare-slider-first] button`)) && (await text("[data-testid=compare-pressed]")) === "survey", "a control inside the first layer can be pressed");
  await kit.clickText(`${any} button`, "All reconstruction");
  check((await kit.click(`${any} [data-slot=compare-slider-second] button`)) && (await text("[data-testid=compare-pressed]")) === "reconstruction", "and one inside the second layer");
  const hidden = await box(`${any} [data-slot=compare-slider-first] button`);
  check(hidden !== null && !(await hit(hidden.left + hidden.width / 2, hidden.top + hidden.height / 2, "[data-slot=compare-slider-first]")), "a control in the part of a layer that is cut away cannot be pressed");
  const fixed = `${any} [role=slider][aria-label="Draft and final, fixed"]`;
  check((await attr(fixed, "aria-disabled")) === "true" && (await attr(fixed, "tabindex")) === "-1", "a disabled slider says so and leaves the Tab order");
  await kit.axe(any, "the compare slider around any children");

  // ---- Certainty legend: uncontrolled.
  const legend = await kit.demo("Certainty legend");
  const group = `${legend} [data-slot=certainty-legend]`;
  const item = `${group} [data-slot=certainty-legend-item]`;
  check((await attr(group, "role")) === "group" && (await attr(group, "aria-label")) === "How sure each part is", "the legend is a named group");
  check((await count(item)) === 3 && (await count(`${item}[aria-pressed=true]`)) === 3, "each class is a toggle button, on at the start");
  const patterns = await page.evaluate((s) => [...document.querySelectorAll(`${s} [data-slot=certainty-swatch]`)].map((node) => node.getAttribute("data-pattern")), group);
  check(patterns.join(",") === "solid,hatch,dots", `each class has its own pattern as well as its own colour (${patterns.join(", ")})`);
  const tones = await page.evaluate((s) => new Set([...document.querySelectorAll(`${s} [data-slot=certainty-swatch]`)].map((node) => getComputedStyle(node).color)).size, group);
  check(tones === 3, "and its own colour");
  check((await count(`${group} [data-slot=certainty-swatch][aria-hidden=true]`)) === 3, "the swatches are decoration: the name says what each stands for");
  check((await text(`${item} [data-slot=certainty-legend-label]`)) === "Recorded" && (await text(`${item} [data-slot=certainty-legend-description]`)) === "Measured on site", "a class shows its name and what it means");
  check((await count("[data-testid=plan] [data-part] svg")) === 3, "the scene draws every class");
  check(await kit.focus(item), "a class takes focus");
  await keys("Space");
  check((await attr(item, "aria-pressed")) === "false", "Space switches the class off (aria-pressed)");
  check((await text("[data-testid=legend-shown]")) === "inferred, imagined" && (await text("[data-testid=legend-last]")) === "recorded hidden", `the change is reported (${await text("[data-testid=legend-last]")})`);
  check((await count("[data-testid=plan] [data-part=recorded] svg")) === 0 && (await count("[data-testid=plan] [data-part] svg")) === 2, "and the project applies it to its scene");
  check((await style(`${item} [data-slot=certainty-legend-label]`, "text-decoration-line")).includes("line-through") && (await count(`${item}:first-child [data-slot=certainty-swatch]`)) === 1, "a class that is off has a line through its name and keeps its swatch: not told by colour alone");
  await keys("Enter");
  check((await attr(item, "aria-pressed")) === "true" && (await text("[data-testid=legend-shown]")) === "recorded, inferred, imagined", "Enter switches it on again, and the order is the legend's, not the order of the presses");
  await keys("Tab");
  check((await kit.focused()).startsWith("Inferred"), `Tab goes to the next class (${await kit.focused()})`);
  check(await kit.clickText(`${item} [data-slot=certainty-legend-label]`, "Imagined"), "a class can be pressed");
  check((await text("[data-testid=legend-shown]")) === "recorded, inferred" && (await count(`${item}[aria-pressed=false]`)) === 1, "pressing it switches it off");
  const height = await page.evaluate((s) => Math.min(...[...document.querySelectorAll(s)].map((node) => node.getBoundingClientRect().height)), item);
  check(height >= 40, `a class is at least 40px tall (${height}px)`);
  await kit.screenshot("legend");
  await kit.axe(legend, "the certainty legend");

  // ---- Certainty legend: four classes, controlled; and a key that cannot be switched.
  const four = await kit.demo("Certainty legend: four classes, controlled");
  const kinds = `${four} [aria-label="Kinds of evidence"] [data-slot=certainty-legend-item]`;
  const fourPatterns = await page.evaluate((s) => [...document.querySelectorAll(`${s} [data-slot=certainty-swatch]`)].map((node) => node.getAttribute("data-pattern")), `${four} [aria-label="Kinds of evidence"]`);
  check(fourPatterns.join(",") === "solid,hatch,dots,cross", "four classes have four patterns");
  check((await count(`${kinds}[aria-pressed=true]`)) === 2 && (await text("[data-testid=legend-four]")) === "standing, excavated", "a controlled legend shows its value");
  check(await kit.clickText(`${kinds} [data-slot=certainty-legend-label]`, "Guessed"), "a class can be switched on");
  check((await text("[data-testid=legend-four]")) === "standing, excavated, guessed" && (await count(`${kinds}[aria-pressed=true]`)) === 3, "and the value follows");
  await kit.clickText(`${four} button`, "Show every kind");
  check((await count(`${kinds}[aria-pressed=true]`)) === 4, "the value can be set from outside");
  check((await count(`${four} [aria-label="Key only"] button:disabled`)) === 3, "a key only: its classes cannot be switched");
  await kit.axe(four, "the controlled legend and the key");

  // ---- Provenance label: in a frame, outside the media's box.
  const framed = await kit.demo("Provenance label: in a frame");
  const label = `${framed} [data-slot=provenance-label]`;
  const trigger = `${label} button`;
  check((await text(`${label} [data-slot=provenance-label-text]`)) === "Imagined reconstruction", "the label states what the thing is, as text");
  check((await attr(`${framed} [data-slot=provenance-frame]`, "role")) === "group" && (await attr(`${framed} [data-slot=provenance-frame]`, "aria-label")) === "The mill, reconstructed", "the frame is a named group");
  check((await text(trigger)) === "Imagined reconstruction, sources and details" && (await attr(trigger, "aria-expanded")) === "false", `with details the label is a button whose name says what it opens (${await text(trigger)})`);
  const labelBox = await box(label);
  const playerBox = await box(`${framed} [data-slot=video-player]`, false);
  const controlsBox = await box(`${framed} [data-slot=video-player-controls]`, false);
  check((controlsBox?.height ?? 0) > 0 && apart(labelBox, controlsBox), "the label and the player's controls do not overlap");
  check(apart(labelBox, playerBox) && (labelBox?.bottom ?? 0) <= (playerBox?.top ?? 0) + 0.5, "the label has its own row above the media's box, where nothing the media draws can reach");
  check(await onTop(label), "nothing is drawn over the label");
  check(near(labelBox?.width ?? 0, playerBox?.width ?? -10, 2), "the label's row is as wide as the media");
  check(await kit.focus(trigger), "the label takes focus");
  await keys("Enter");
  const details = "[data-slot=provenance-label-details]";
  check((await text("[data-testid=provenance-open]")) === "open" && (await attr(trigger, "aria-expanded")) === "true", "Enter opens the details (controlled)");
  check((await text(details)).includes("The survey of 1890, sheet 14"), "the details list the sources");
  check(await page.evaluate((s) => document.querySelector(s)?.contains(document.activeElement) ?? false, details), "focus moves into the details");
  await kit.axe(details, "the details popover");
  await kit.screenshot("provenance-details");
  await keys("Escape");
  check((await text("[data-testid=provenance-open]")) === "closed" && (await count(details)) === 0, "Escape closes them");
  check(await kit.focusIs(trigger), "and focus returns to the label");
  check(await kit.click(trigger), "the label can be pressed");
  check((await count(details)) === 1, "pressing it opens the details");
  await keys("Escape");
  if (kit.phone) check((labelBox?.height ?? 0) >= 40, `on a touch screen the label is at least 40px tall (${labelBox?.height}px)`);
  await kit.axe(framed, "the label in a frame");

  // ---- Provenance label: over a top corner, above the controls.
  const over = await kit.demo("Provenance label: over the media");
  const inside = `${over} [data-slot=video-player] [data-slot=provenance-label]`;
  const overBox = await box(inside);
  const overPlayer = await box(`${over} [data-slot=video-player]`, false);
  const overControls = await box(`${over} [data-slot=video-player-controls]`, false);
  check((await attr(inside, "data-position")) === "top-start" && (await style(inside, "position")) === "absolute", "the label can sit over the media");
  check(overBox !== null && overPlayer !== null && overBox.top >= overPlayer.top && overBox.bottom <= overPlayer.bottom && overBox.left >= overPlayer.left && overBox.right <= overPlayer.right, "it is inside the media's box, so it goes to full screen with it");
  check((overControls?.height ?? 0) > 0 && apart(overBox, overControls), "the label and the controls do not overlap");
  check(Number(await style(inside, "z-index")) > Number(await style(`${over} [data-slot=video-player-controls]`, "z-index")), "and the label is above the controls in the stack");
  check(await onTop(inside), "nothing is drawn over the label");
  const startSide = overBox !== null && overPlayer !== null && (kit.dir === "rtl" ? overPlayer.right - overBox.right < 16 : overBox.left - overPlayer.left < 16);
  check(startSide, "top-start is the corner where the line begins");
  const ground = await page.evaluate((s) => {
    const style = getComputedStyle(document.querySelector(s) as Element);
    return { opaque: !/rgba?\([^)]*,\s*0\)|transparent|\/\s*0\)/.test(style.backgroundColor), opacity: style.opacity, border: style.borderTopWidth };
  }, inside);
  check(ground.opaque && ground.opacity === "1" && ground.border !== "0px", "it is on a solid ground with a border, at full opacity");
  check((await text(`${inside} button`)) === "Reconstruction, how it was made", "the words after the statement are the project's");
  const plain = `${over} [data-slot=provenance-label][data-position=top-end]`;
  check((await count(`${plain} button`)) === 0 && (await text(`${plain} p`)) === "Photograph, 1930", "without details the label is plain text");
  check(await onTop(plain), "nothing is drawn over it either");
  await kit.screenshot("provenance-over");
  await kit.axe(over, "the label over the media");
}
