// Checks: chip, segmented-control, number-stepper (site/src/app/choices).

import type { Kit } from "../smoke-kit.ts";

export const route = "/choices";

export async function run(kit: Kit): Promise<void> {
  const { check, keys, text, attr, count, focusIs, page } = kit;
  /** The key that moves towards the end of the line: Right, or Left in a right-to-left page. */
  const forward = kit.dir === "rtl" ? "ArrowLeft" : "ArrowRight";
  const back = kit.dir === "rtl" ? "ArrowRight" : "ArrowLeft";

  // Chips: a removable filter, and focus is not lost with it.
  const filters = await kit.demo("Chips: filters and suggestions");
  check((await count(`${filters} [data-slot=chip]`)) === 3, "three filter chips");
  check(await kit.click(`${filters} [aria-label="Remove the filter: This weekend"]`), "the remove button has a name that says what it removes");
  check((await count(`${filters} [data-slot=chip]`)) === 2, "removing a chip removes it");
  check((await kit.focused()) === "Reset filters", `focus moves to a control that is still there (${await kit.focused()})`);
  await keys("Enter");
  check((await count(`${filters} [data-slot=chip]`)) === 3, "a chip button works from the keyboard");
  check(await kit.clickText(`${filters} [data-slot=chip-button]`, "Closer to me"), "a suggestion chip is a button");
  check((await text("[data-testid=asked]")) === "Closer to me", "pressing a suggestion acts");
  const removeSize = await page.evaluate((s) => {
    const rect = document.querySelector(`${s} [data-slot=chip-remove]`)?.getBoundingClientRect();
    return rect ? Math.min(rect.width, rect.height) : 0;
  }, filters);
  check(removeSize >= 24, `the remove button is at least 24px (${removeSize}px)`);

  // Chips: choosing several, with the keyboard.
  const choosing = await kit.demo("Chips: choosing");
  check((await attr(`${choosing} [data-slot=chip-group]`, "role")) === "group", "a chip group is a group");
  check(await kit.focus(`${choosing} [data-slot=chip-group-item]`), "a chip can take focus");
  check((await attr(`${choosing} [data-slot=chip-group-item]`, "aria-pressed")) === "true", "a chip that is on says so (aria-pressed)");
  await keys(forward);
  check((await kit.focused()) === "lively", `the arrow key moves to the next chip (${await kit.focused()})`);
  await keys("Space");
  check((await text("[data-testid=moods]")) === "calm, lively", `Space switches a chip on (${await text("[data-testid=moods]")})`);
  await keys(back, "Enter");
  check((await text("[data-testid=moods]")) === "lively", "Enter switches a chip off");
  await keys("End");
  check((await kit.focused()) === "outdoors", "End goes to the last chip");

  // Chips: choosing one (uncontrolled).
  const single = `${choosing} [data-slot=chip-group][aria-labelledby=time-label]`;
  check(await kit.clickText(`${single} [data-slot=chip-group-item]`, "Evening"), "a single-choice chip can be pressed");
  check((await count(`${single} [data-state=on]`)) === 1 && (await text(`${single} [data-state=on]`)) === "Evening", "one chip is on at a time");
  check((await attr(`${single} [data-state=on]`, "role")) === "radio" && (await attr(`${single} [data-state=on]`, "aria-checked")) === "true", "single-choice chips are radios");
  if (kit.phone) {
    const height = await page.evaluate((s) => document.querySelector(`${s} [data-slot=chip-group-item]`)?.getBoundingClientRect().height ?? 0, choosing);
    check(height >= 40, `on a touch screen a chip is at least 40px tall (${height}px)`);
  }

  // Segmented control: a radio group.
  const segmented = await kit.demo("Segmented control");
  check((await attr(`${segmented} [data-slot=segmented-control]`, "role")) === "radiogroup", "the segmented control is a radio group");
  check((await attr(`${segmented} [data-slot=segmented-control]`, "aria-label")) === "View", "it has a name");
  check((await count(`${segmented} [data-slot=segmented-control] [role=radio]`)) === 7, "segments are radios");
  check(await kit.focus(`${segmented} [role=radio][aria-checked=true]`), "the chosen segment takes focus");
  await keys(forward);
  check((await text("[data-testid=view]")) === "grid", `the arrow key towards the end chooses the next segment (${await text("[data-testid=view]")})`);
  await keys(forward, forward);
  check((await text("[data-testid=view]")) === "list", "the choice wraps round");
  await keys(back);
  check((await text("[data-testid=view]")) === "map", "the arrow key towards the start goes back");
  check((await count(`${segmented} [data-slot=segmented-control]:first-of-type [data-slot=segmented-control-marker]`)) === 1, "one marker, on the chosen segment");
  await keys("Tab");
  check(await focusIs(`${segmented} [data-slot=segmented-control].w-full [role=radio][aria-checked=true]`), "Tab leaves the control in one step");
  await keys(forward, forward);
  check((await kit.focused()) === "Day", `a disabled segment is skipped (${await kit.focused()})`);
  const widths = await page.evaluate(
    (s) => [...document.querySelectorAll(`${s} [data-slot=segmented-control].w-full [role=radio]`)].map((node) => Math.round(node.getBoundingClientRect().width)),
    segmented,
  );
  check(new Set(widths).size === 1, `segments share the width equally (${widths.join(", ")})`);

  // Number stepper: the spin button pattern.
  const stepper = await kit.demo("Number stepper");
  check((await attr("#adults", "role")) === "spinbutton", "the field is a spin button");
  check((await attr("#adults", "aria-valuenow")) === "2" && (await attr("#adults", "aria-valuemin")) === "1" && (await attr("#adults", "aria-valuemax")) === "12", "it states its value and range");
  check((await attr("#adults", "aria-valuetext")) === "2 adults", "it can say the value in words");
  check(await kit.focus("#adults"), "the field takes focus");
  await keys("ArrowUp", "ArrowUp");
  check((await attr("#adults", "aria-valuenow")) === "4", "Up adds a step");
  await keys("ArrowDown");
  check((await attr("#adults", "aria-valuenow")) === "3", "Down takes a step away");
  await keys("End");
  check((await attr("#adults", "aria-valuenow")) === "12", "End goes to the maximum");
  await keys("ArrowUp");
  check((await attr("#adults", "aria-valuenow")) === "12", "it stops at the maximum");
  check((await attr(`${stepper} [data-slot=number-stepper-increment]`, "disabled")) !== null, "the add button is disabled at the maximum");
  await keys("Home");
  check((await attr("#adults", "aria-valuenow")) === "1", "Home goes to the minimum");
  await keys("PageUp");
  check((await attr("#adults", "aria-valuenow")) === "11", "Page Up adds a large step");
  check((await attr(`${stepper} input[type=hidden][name=adults]`, "value")) === "11", "the value is in the form under its name");

  // Typing, committed on Enter and clamped.
  await kit.focus("#nights");
  await page.keyboard.down("Control");
  await page.keyboard.press("a");
  await page.keyboard.up("Control");
  await page.keyboard.type("45");
  await keys("Enter");
  check((await text("[data-testid=nights]")) === "30", `a typed number is clamped to the range (${await text("[data-testid=nights]")})`);
  await page.keyboard.down("Control");
  await page.keyboard.press("a");
  await page.keyboard.up("Control");
  await page.keyboard.type("abc");
  await keys("Tab");
  check((await text("[data-testid=nights]")) === "30" && (await page.$eval("#nights", (node) => (node as HTMLInputElement).value)) === "30", "text that is not a number is dropped");

  // Buttons: named, out of the Tab order, working by pointer.
  check((await attr(`${stepper} [aria-label="One night fewer"]`, "tabindex")) === "-1", "the buttons are named and out of the Tab order");
  check(await kit.click(`${stepper} [aria-label="One night fewer"]`), "the take-away button can be pressed");
  check((await text("[data-testid=nights]")) === "29", `one press is one step (${await text("[data-testid=nights]")})`);

  // Decimal steps.
  await kit.focus("#weight");
  await keys("ArrowUp", "ArrowUp", "ArrowUp");
  check((await page.$eval("#weight", (node) => (node as HTMLInputElement).value)) === "3", "decimal steps add up without rounding errors");

  await kit.axe("main", "after the checks");
}
