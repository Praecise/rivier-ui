// Checks: calendar, date-picker, slot-picker, time-picker (site/src/app/dates).

import type { Kit } from "../smoke-kit.ts";

export const route = "/dates";

export async function run(kit: Kit): Promise<void> {
  const { check, keys, text, attr, count, focusIs, page } = kit;
  /** The key that moves towards the end of the line: Right, or Left in a right-to-left page. */
  const forward = kit.dir === "rtl" ? "ArrowLeft" : "ArrowRight";
  const back = kit.dir === "rtl" ? "ArrowRight" : "ArrowLeft";
  /** The day the keyboard is on. */
  const day = (): Promise<string | null> => page.evaluate(() => document.activeElement?.getAttribute("data-day") ?? null);
  const label = (scope: string, date: string): Promise<string> => attr(`${scope} [data-day="${date}"]`, "aria-label").then((value) => value ?? "");
  const withShift = async (key: "PageUp" | "PageDown"): Promise<void> => {
    await page.keyboard.down("Shift");
    await keys(key);
    await page.keyboard.up("Shift");
  };
  const heading = (scope: string): Promise<string> => text(`${scope} [data-slot=calendar-heading]`);

  // Calendar, one day: the date grid pattern.
  const one = await kit.demo("Calendar: one day");
  check((await attr(`${one} [data-slot=calendar-grid]`, "role")) === "grid", "the month is a grid");
  check((await heading(one)) === "November 2026", `the grid is named by its month (${await heading(one)})`);
  check((await count(`${one} [role=columnheader], ${one} th[scope=col]`)) === 7 && (await attr(`${one} th`, "abbr")) === "Monday", "seven weekday headers, Monday first in en-GB, each with its full name");
  check((await count(`${one} [data-day][tabindex="0"]`)) === 1 && (await attr(`${one} [data-day][tabindex="0"]`, "data-day")) === "2026-11-14", "one day is in the Tab order: the chosen one");
  check(/14 November 2026, selected$/.test(await label(one, "2026-11-14")), `a chosen day says so in its name (${await label(one, "2026-11-14")})`);
  check((await attr(`${one} td:has([data-day="2026-11-14"])`, "aria-selected")) === "true", "the chosen cell is aria-selected");
  check((await attr(`${one} [data-day="2026-11-12"]`, "aria-current")) === "date" && (await label(one, "2026-11-12")).includes("today"), "today is aria-current and named");
  check((await attr(`${one} [data-day="2026-11-15"]`, "aria-disabled")) === "true" && /closed$/.test(await label(one, "2026-11-15")), "a day that cannot be chosen says why in its name");
  check((await label(one, "2026-11-17")).endsWith("busy") && (await count(`${one} [data-day="2026-11-17"] [data-slot=calendar-mark]`)) === 1, "a marked day has a dot and says its word");
  check((await attr(`${one} [data-slot=calendar-previous]`, "disabled")) !== null, "the previous-month button is off when the month before is out of range");

  check(await kit.focus(`${one} [data-day="2026-11-14"]`), "the chosen day takes focus");
  await keys(forward);
  check((await day()) === "2026-11-15", `the arrow towards the end goes to the next day (${await day()})`);
  await keys("Enter");
  check((await text("[data-testid=day]")) === "2026-11-14", "a day that cannot be chosen is not chosen, though it can be reached");
  await keys(back, back);
  check((await day()) === "2026-11-13", "the arrow towards the start goes back");
  await keys("ArrowDown");
  check((await day()) === "2026-11-20", "Down goes to the same weekday of the next week");
  await keys("Home");
  check((await day()) === "2026-11-16", `Home goes to the start of the week (${await day()})`);
  await keys("End");
  check((await day()) === "2026-11-22", `End goes to the end of the week (${await day()})`);
  await keys("PageDown");
  check((await day()) === "2026-12-22" && (await heading(one)) === "December 2026", `Page Down goes to the next month and focus follows (${await day()})`);
  await withShift("PageDown");
  check((await day()) === "2027-12-22" && (await heading(one)) === "December 2027", "Shift+Page Down goes on a year");
  await withShift("PageUp");
  await keys("PageUp");
  check((await day()) === "2026-11-22", "Shift+Page Up and Page Up come back");
  await keys("PageUp");
  check((await day()) === "2026-11-03", `the keyboard stops at the first day allowed (${await day()})`);
  await keys("ArrowUp");
  check((await day()) === "2026-11-03", "and does not go before it");
  await keys("Space");
  check((await text("[data-testid=day]")) === "2026-11-03", "Space chooses the day");
  check((await count(`${one} [data-day][tabindex="0"]`)) === 1, "there is still one Tab stop");
  check(await kit.click(`${one} [data-slot=calendar-next]`), "the next-month button can be pressed");
  check((await heading(one)) === "December 2026", "it shows the next month");
  check((await kit.announced()).some((message) => message.includes("December 2026")), "the new month is announced");
  check((await count(`${one} [data-day][tabindex="0"]`)) === 1, "a month with no chosen day still has one Tab stop");
  check(await kit.click(`${one} [data-slot=calendar-previous]`), "back a month");
  const rows = await count(`${one} tbody tr`);
  check(rows === 6, "the grid is always six rows, so its height does not change with the month");

  // Several days, and other locales.
  const many = await kit.demo("Calendar: several days, another language");
  check((await attr(`${many} th`, "abbr")) === "Sunday", "en-US starts the week on Sunday");
  check(await kit.click(`${many} [data-day="2026-11-10"]`), "a day can be pressed");
  check((await text("[data-testid=days]")) === "2026-11-03, 2026-11-05, 2026-11-10", "in multiple mode a press adds a day");
  await kit.click(`${many} [data-day="2026-11-03"]`);
  check((await text("[data-testid=days]")) === "2026-11-05, 2026-11-10", "and a second press takes it away");
  check((await count(`${many} td[aria-selected=true]`)) === 3, "every chosen day is aria-selected (two here, one in the Arabic calendar)");
  const arabic = "[data-testid=arabic]";
  check(/[٠-٩]/.test(await text(`${arabic} [data-day="2026-11-14"]`)), "numerals follow the locale");
  check((await attr(`${arabic} th`, "abbr")) === "السبت", `the week starts on Saturday in ar-EG (${await attr(`${arabic} th`, "abbr")})`);
  check((await attr(`${arabic} [data-slot=calendar-next]`, "aria-label")) === "الشهر التالي", "the calendar's own words can be translated");
  await kit.focus(`${arabic} [data-day="2026-11-14"]`);
  await keys("ArrowLeft");
  check((await day()) === "2026-11-15", "inside right-to-left content the Left arrow goes to the next day");

  // A range.
  const range = await kit.demo("Calendar: a range");
  const months = await page.evaluate((s) => [...document.querySelectorAll(`${s} [data-slot=calendar-month]`)].filter((month) => month.getClientRects().length > 0).length, range);
  check(months === (kit.phone ? 1 : 2), `two months where there is room, one on a phone (${months})`);
  check(await kit.click(`${range} [data-day="2026-11-10"]`), "the first press sets the start");
  check((await text("[data-testid=range-start]")) === "2026-11-10" && (await text("[data-testid=range-end]")) === "none", "the range has a start and no end yet");
  check((await label(range, "2026-11-10")).endsWith("start of the range"), "the start says what it is");
  await keys(forward, forward, forward);
  check((await count(`${range} td[data-preview]`)) === 4, `the days up to the one in focus are shown as a preview (${await count(`${range} td[data-preview]`)})`);
  await keys("Enter");
  check((await text("[data-testid=range-end]")) === "2026-11-13", "Enter sets the end");
  check((await count(`${range} td[aria-selected=true]`)) === 4 && (await count(`${range} td[data-preview]`)) === 0, "the whole range is selected");
  check((await attr(`${range} td:has([data-day="2026-11-11"])`, "data-range")) === "middle" && (await label(range, "2026-11-11")).endsWith("in the range"), "a day in between is marked and named as in the range");
  check((await label(range, "2026-11-13")).endsWith("end of the range"), "the end says what it is");
  await kit.click(`${range} [data-day="2026-11-20"]`);
  await kit.click(`${range} [data-day="2026-11-18"]`);
  check((await text("[data-testid=range-start]")) === "2026-11-18" && (await text("[data-testid=range-end]")) === "2026-11-20", "an end before the start turns the range round");
  await kit.focus(`${range} [data-day="2026-11-30"]`);
  await keys(forward);
  check((await day()) === "2026-12-01", "focus carries on into the next month");
  check((await heading(range)) === (kit.phone ? "December 2026" : "November 2026"), "the months only move when the day is not on screen");
  await kit.screenshot("range");

  // Date picker.
  const picker = await kit.demo("Date picker");
  const trigger = `${picker} [data-slot=date-picker-trigger]`;
  check((await text(trigger)) === "14 Nov 2026", `the button shows the date written for the locale (${await text(trigger)})`);
  check((await attr(trigger, "aria-labelledby"))?.split(" ").length === 2, "its name is its label and the date");
  check(await kit.click(trigger), "the button opens the calendar");
  await kit.sleep(300);
  const content = "[data-slot=date-picker-content]";
  check((await attr(content, "role")) === "dialog" && (await attr(content, "aria-label")) === "Calendar", "the popover is a named dialog");
  check((await day()) === "2026-11-14", `focus goes to the chosen day (${await day()})`);
  await kit.axe(content, "the open date picker");
  await kit.screenshot("picker");
  const inside = await page.evaluate((s) => {
    const rect = document.querySelector(s)?.getBoundingClientRect();
    return rect ? rect.left >= 0 && rect.right <= window.innerWidth : false;
  }, content);
  check(inside, "the popover is inside the screen");
  await keys("Escape");
  await kit.sleep(300);
  check((await count(content)) === 0 && (await focusIs(trigger)), "Escape closes it and focus returns to the button");
  await keys("Enter");
  await kit.sleep(300);
  await keys(forward, "Enter");
  await kit.sleep(300);
  check((await count(content)) === 0, "choosing a day closes it");
  check((await text(trigger)) === "15 Nov 2026" && (await focusIs(trigger)), `the button shows the new date and has focus (${await text(trigger)})`);
  check((await attr(`${picker} input[type=hidden][name=date]`, "value")) === "2026-11-15", "the value is in the form under its name");

  const stay = `${picker} [data-slot=date-picker-trigger][aria-labelledby^=stay-label]`;
  check((await text(stay)) === "Arrival – departure" && (await attr(stay, "data-placeholder")) === "", "with nothing chosen the button shows its placeholder");
  await kit.click(stay);
  await kit.sleep(300);
  check((await day()) === "2026-11-12", "with nothing chosen focus goes to today");
  await keys("Enter");
  check((await count(content)) === 1, "a range stays open after the start");
  await keys("ArrowDown", "Enter");
  await kit.sleep(300);
  check((await count(content)) === 0, "and closes after the end");
  check((await text("[data-testid=stay]")) === "2026-11-12 to 2026-11-19", `the range is set (${await text("[data-testid=stay]")})`);
  check(/12.*19 Nov 2026/.test(await text(stay)), `the button shows the range (${await text(stay)})`);
  check((await attr(`${picker} input[name=from]`, "value")) === "2026-11-12" && (await attr(`${picker} input[name=to]`, "value")) === "2026-11-19", "both ends are in the form");
  if (kit.phone) {
    await kit.click(stay);
    await kit.sleep(300);
    const fits = await page.evaluate((s) => {
      const rect = document.querySelector(s)?.getBoundingClientRect();
      const visible = [...document.querySelectorAll(`${s} [data-slot=calendar-month]`)].filter((month) => month.getClientRects().length > 0).length;
      return rect ? rect.left >= 0 && rect.right <= window.innerWidth && visible === 1 : false;
    }, content);
    check(fits, "on a phone the range picker shows one month, inside the screen");
    await keys("Escape");
    await kit.sleep(300);
  }

  // Date picker, typed: a text field whose value is the day, with the calendar beside it.
  const typed = await kit.demo("Date picker: typed");
  const field = `${typed} [data-slot=date-picker-input]`;
  const opener = `${typed} [data-slot=date-picker-open]`;
  const shown = (): Promise<string> => page.evaluate((s) => document.querySelector<HTMLInputElement>(s)?.value ?? "", field);
  const due = (): Promise<string> => text(`${typed} [data-testid=due]`);
  const sent = (): Promise<string | null> => attr(`${typed} input[type=hidden][name=due]`, "value");
  /** Replaces what is in the field with these keystrokes. */
  const enter = async (value: string): Promise<void> => {
    await kit.focus(field);
    await page.evaluate((s) => document.querySelector<HTMLInputElement>(s)?.select(), field);
    await page.keyboard.type(value);
    await kit.sleep(100);
  };
  check((await shown()) === "14/11/2026", `the field shows the day in the locale's order of digits (${await shown()})`);
  check((await attr(field, "placeholder")) === "DD/MM/YYYY", `its placeholder is the order to type in (${await attr(field, "placeholder")})`);
  check((await attr(field, "aria-labelledby")) === "due-label" && (await attr(field, "aria-invalid")) === null, "it is named by its label and not marked invalid");
  await enter("3/12/2026");
  check((await due()) === "2026-12-03" && (await sent()) === "2026-12-03", `a typed day is the value at once, and is in the form (${await due()})`);
  check((await shown()) === "3/12/2026", "the text is left as typed while the field has focus");
  await keys("Tab");
  check((await shown()) === "03/12/2026" && (await focusIs(opener)), `leaving the field writes the day out in full, and Tab goes to the calendar button (${await shown()})`);
  await enter("2026-12-24");
  check((await due()) === "2026-12-24", `the year first is read in every locale (${await due()})`);
  await enter("05012027");
  check((await due()) === "2027-01-05", `eight digits with no separators are read in the locale's order (${await due()})`);
  await enter("31/02/2027");
  check((await due()) === "none" && (await sent()) === "", "a day that does not exist is no value, in the form too");
  check((await attr(field, "aria-invalid")) === null, "the field is not marked while it is still being typed in");
  await keys("Enter");
  check((await attr(field, "aria-invalid")) === "true" && (await text(`${typed} [data-testid=refused]`)).startsWith("31/02/2027"), "Enter on something that is not a day marks the field and tells the project, which says why");
  await enter("15/10/2026");
  check((await due()) === "none", "a day before the first one allowed is not taken");
  await enter("22/11/2026");
  check((await due()) === "none", "nor is a day the calendar does not offer (a Sunday here)");
  await keys("Tab");
  check((await attr(field, "aria-invalid")) === "true" && (await shown()) === "22/11/2026", "leaving the field marks it and keeps what was typed");
  await enter("");
  await keys("Backspace", "Tab");
  check((await attr(field, "aria-invalid")) === null && (await due()) === "none", "an emptied field is no value and is not an error");
  await enter("16/11/2026");
  check((await attr(opener, "aria-label")) === "Open calendar" && (await attr(opener, "aria-expanded")) === "false", "the button beside it is named and says the calendar is closed");
  await page.keyboard.down("Alt");
  await keys("ArrowDown");
  await page.keyboard.up("Alt");
  await kit.sleep(300);
  check((await count(content)) === 1 && (await day()) === "2026-11-16", `Alt+ArrowDown in the field opens the calendar on the typed day (${await day()})`);
  await kit.axe(typed, "the typed date picker");
  await kit.axe(content, "its open calendar");
  await kit.screenshot("picker-typed");
  await keys(forward, "Enter");
  await kit.sleep(300);
  check((await count(content)) === 0 && (await shown()) === "17/11/2026" && (await due()) === "2026-11-17", `a day chosen in the calendar is written in the field (${await shown()})`);
  check(await focusIs(opener), "and focus returns to the calendar button");
  await enter("31/02/2027");
  await keys("Tab");
  check(await kit.click(opener), "the button opens the calendar");
  await kit.sleep(300);
  await keys("Enter");
  await kit.sleep(300);
  check((await attr(field, "aria-invalid")) === null && (await count(`${typed} [data-testid=refused]`)) === 0 && (await shown()) !== "31/02/2027", `choosing a day replaces refused text and clears the mark (${await shown()})`);

  // Slot picker: a radio group.
  const slots = await kit.demo("Slot picker");
  const group = `${slots} [data-slot=slot-picker][aria-label=Time]`;
  check((await attr(group, "role")) === "radiogroup", "the slots are a radio group");
  check((await count(`${group} [role=radio]`)) === 5 && (await count(`${group} [role=group]`)) === 2, "five slots in two named groups");
  check((await attr(`${group} [data-slot=slot-picker-group]`, "aria-labelledby")) !== null && (await text(`${group} [data-slot=slot-picker-group-label]`)) === "Morning", "a group is named by its label");
  check(await kit.focus(`${group} [role=radio][aria-checked=true]`), "the chosen slot takes focus");
  await keys(forward);
  check((await kit.focused()).includes("Full") && (await text("[data-testid=slot]")) === "10:00", `an unavailable slot can be reached and read, not chosen (${await kit.focused()})`);
  check((await attr(`${group} [data-unavailable]`, "aria-disabled")) === "true", "it is aria-disabled");
  await keys(forward);
  check((await text("[data-testid=slot]")) === "14:00", `the next arrow chooses the next slot (${await text("[data-testid=slot]")})`);
  await keys(back, back);
  check((await text("[data-testid=slot]")) === "10:00", "and the arrows back choose again");
  await kit.click(`${group} [data-unavailable]`);
  check((await text("[data-testid=slot]")) === "10:00", "pressing an unavailable slot does nothing");
  await kit.clickText(`${group} [role=radio]`, "09:30");
  check((await text("[data-testid=slot]")) === "09:30" && (await count(`${group} [aria-checked=true]`)) === 1, "a press chooses a slot, one at a time");
  const us = "[data-testid=slots-us]";
  check(/^9:30\sAM$/.test(await text(`${us} [role=radio]`)), `a time is written for the locale (${await text(`${us} [role=radio]`)})`);
  check((await text(`${us} [aria-checked=true]`)).startsWith("1:00"), "uncontrolled, it starts from its default");
  await kit.clickText(`${us} [role=radio]`, "Any time after six");
  check((await text(`${us} [aria-checked=true]`)) === "Any time after six", "and keeps its own choice; a slot can have its own words");
  check((await text(`${slots} [data-slot=slot-picker-empty]`)) === "Nothing is open on this day.", "an empty set says so");
  if (kit.phone) {
    const height = await page.evaluate((s) => document.querySelector(`${s} [role=radio]`)?.getBoundingClientRect().height ?? 0, group);
    check(height >= 40, `a slot is at least 40px tall (${height}px)`);
  }

  // Time picker: spin buttons.
  await kit.demo("Time picker");
  const t24 = "[data-testid=time24]";
  const hour = `${t24} [data-slot=time-picker-hour]`;
  const minute = `${t24} [data-slot=time-picker-minute]`;
  check((await attr(`${t24} [data-slot=time-picker]`, "role")) === "group" && (await count(`${t24} [role=spinbutton]`)) === 2, "a 24-hour field is a group of two spin buttons");
  check((await attr(hour, "aria-label")) === "Hour" && (await attr(hour, "aria-valuenow")) === "9" && (await attr(hour, "aria-valuemax")) === "23", "the hour is named and states its value and range");
  check((await attr(minute, "aria-label")) === "Minute" && (await attr(minute, "aria-valuetext")) === "30", "so does the minute");
  check(await kit.focus(hour), "the hour takes focus");
  await keys("ArrowUp");
  check((await text("[data-testid=time]")) === "10:30", "Up adds an hour");
  await page.keyboard.type("14", { delay: 60 });
  await kit.sleep(150);
  check((await text("[data-testid=time]")) === "14:30" && (await focusIs(minute)), `typing two digits sets the hour and moves on to the minutes (${await text("[data-testid=time]")})`);
  await page.keyboard.type("42", { delay: 60 });
  await kit.sleep(150);
  check((await text("[data-testid=time]")) === "14:42", "typing sets the minutes as typed");
  await keys("ArrowUp");
  check((await text("[data-testid=time]")) === "14:45", "Up goes to the next multiple of the step");
  await keys("ArrowDown", "ArrowDown");
  check((await text("[data-testid=time]")) === "14:35", "Down goes back by the step");
  await keys("End");
  check((await text("[data-testid=time]")) === "14:55", "End goes to the last step");
  await keys("ArrowUp");
  check((await text("[data-testid=time]")) === "14:00", "the minutes wrap round without touching the hour");
  await keys("ArrowLeft");
  check(await focusIs(hour), "Left goes to the hour in every reading direction: a time is written left to right");
  check((await page.evaluate((s) => getComputedStyle(document.querySelector(s) as Element).direction, hour)) === "ltr", "the parts are laid out left to right");
  await page.keyboard.type("7", { delay: 60 });
  await kit.sleep(150);
  check((await text("[data-testid=time]")) === "07:00" && (await focusIs(minute)), "a digit that cannot start a two-digit hour is the whole hour");
  check((await attr(`${t24} input[type=hidden][name=opens]`, "value")) === "07:00", "the value is in the form under its name");
  await keys("Backspace");
  check((await text("[data-testid=time]")) === "none" && (await attr(minute, "aria-valuetext")) === "Empty" && (await attr(minute, "aria-valuenow")) === null, "Backspace empties the field, and the parts say they are empty");
  await keys("ArrowUp");
  check((await text("[data-testid=time]")) === "00:00", "from empty, an arrow starts at the beginning");

  const t12 = "[data-testid=time12]";
  const period = `${t12} [data-slot=time-picker-period]`;
  check((await count(`${t12} [role=spinbutton]`)) === 3, "a 12-hour locale adds an AM/PM part");
  check((await page.$eval(period, (node) => (node as HTMLInputElement).value)) === "AM" && (await attr(period, "aria-valuetext")) === "AM", "it shows and says the locale's word");
  check((await attr(`${t12} [data-slot=time-picker-hour]`, "aria-valuetext")) === "9 AM" && (await attr(`${t12} [data-slot=time-picker-hour]`, "aria-valuemax")) === "12", "the hour runs from 1 to 12 and says which half of the day");
  await kit.focus(`${t12} [data-slot=time-picker-hour]`);
  await page.keyboard.type("11", { delay: 60 });
  await kit.sleep(150);
  check((await text("[data-testid=pickup]")) === "11:30", "typing 11 on a 12-hour clock is eleven in the morning");
  await keys("ArrowRight");
  check(await focusIs(period), "Right goes on to the AM/PM part");
  await keys("ArrowUp");
  check((await text("[data-testid=pickup]")) === "18:00", `a time after the latest allowed becomes the latest (${await text("[data-testid=pickup]")})`);
  await page.keyboard.type("a", { delay: 60 });
  await kit.sleep(150);
  check((await text("[data-testid=pickup]")) === "08:00", `typing "a" sets the morning, kept to the earliest allowed (${await text("[data-testid=pickup]")})`);
  await page.keyboard.type("p", { delay: 60 });
  await kit.sleep(150);
  check((await page.$eval(period, (node) => (node as HTMLInputElement).value)) === "PM", 'typing "p" sets the afternoon');

  await kit.axe("main", "after the checks");
}
