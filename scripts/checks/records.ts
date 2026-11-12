// Checks: compare-table, fact-row, consent, language-switcher, price-breakdown, countdown, undo-line,
// timeline (site/src/app/records).

import type { Kit } from "../smoke-kit.ts";

export const route = "/records";

export async function run(kit: Kit): Promise<void> {
  const { check, keys, text, attr, count, focusIs, page, sleep } = kit;
  const rtl = kit.dir === "rtl";
  const forward = rtl ? "ArrowLeft" : "ArrowRight";
  const said = async (words: string): Promise<boolean> => (await kit.announced()).some((message) => message.includes(words));
  /** Whether the first match is laid out (not display: none, and not inside something that is). */
  const shown = (selector: string): Promise<boolean> =>
    page.evaluate((s) => {
      const element = document.querySelector<HTMLElement>(s);
      return element !== null && element.getClientRects().length > 0;
    }, selector);

  // ---------------------------------------------------------------- Compare table
  const compare = await kit.demo("Compare table");
  const scroll = `${compare} [data-slot=compare-table-scroll]`;
  check((await count(`${compare} table`)) === 1 && (await attr(`${compare} table`, "aria-label")) === "Compare the three plans", "the comparison is a named table");
  check((await count(`${compare} thead th[scope=col]`)) === 4, "each thing is a column header");
  check((await count(`${compare} tbody tr[data-slot=compare-row] > th[scope=row]`)) === 5, "each attribute is a row header");
  check((await count(`${compare} th[scope=rowgroup]`)) === 3, "each band has a heading for its rows");
  check((await attr(scroll, "role")) === "region" && (await attr(scroll, "tabindex")) === "0" && (await attr(scroll, "aria-label")) === "Compare the three plans", "the scroll area is a named region that takes focus");
  check((await text(`${compare} [data-best] [data-slot=compare-best]`)) === "Best", "the best cell says so in a word");
  check((await count(`${compare} tr[data-same]`)) === 2, "rows whose cells are all equal are marked");

  const geometry = (): Promise<{ scrollWidth: number; clientWidth: number; scrollLeft: number; headerStart: number; frameStart: number; snap: string }> =>
    page.evaluate(
      (s, isRtl) => {
        const area = document.querySelector<HTMLElement>(s) as HTMLElement;
        const header = area.querySelector("tbody th[scope=row]") as HTMLElement;
        const a = area.getBoundingClientRect();
        const h = header.getBoundingClientRect();
        return {
          scrollWidth: area.scrollWidth,
          clientWidth: area.clientWidth,
          scrollLeft: Math.round(area.scrollLeft),
          headerStart: Math.round(isRtl ? a.right - h.right : h.left - a.left),
          frameStart: 0,
          snap: getComputedStyle(area).scrollSnapType,
        };
      },
      scroll,
      rtl,
    );
  await kit.screenshot("compare");
  const before = await geometry();
  if (kit.phone) {
    check(before.scrollWidth > before.clientWidth + 40, `on a narrow frame the things scroll inside the table (${before.scrollWidth} in ${before.clientWidth})`);
    check(before.snap.includes("x"), `the things snap into place (${before.snap})`);
    const columnWidth = await page.evaluate((s) => Math.round((document.querySelector(`${s} [data-slot=compare-column]`) as HTMLElement).getBoundingClientRect().width), compare);
    const room = before.clientWidth - 112;
    check(columnWidth < room && columnWidth > room * 0.6, `a little over one thing fits in view (${columnWidth}px of ${room}px)`);
    await kit.focus(scroll);
    await keys(forward, forward, forward);
    await sleep(500);
    const after = await geometry();
    check(after.scrollLeft !== before.scrollLeft, `the arrow keys scroll the focused area (${before.scrollLeft} -> ${after.scrollLeft})`);
    check(rtl ? after.scrollLeft < 0 : after.scrollLeft > 0, "it scrolls towards the end of the line");
    check(Math.abs(after.headerStart) <= 1, `the attribute names stay at the start while the things scroll (${after.headerStart}px from the edge)`);
    const covered = await page.evaluate((s) => {
      const header = document.querySelector(`${s} tbody th[scope=row]`) as HTMLElement;
      const rect = header.getBoundingClientRect();
      const top = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return top !== null && header.contains(top) && getComputedStyle(header).backgroundColor !== "rgba(0, 0, 0, 0)";
    }, scroll);
    check(covered, "the held column is opaque and on top of what scrolls under it");
    check((await kit.overflow()) <= 0, "the page itself does not scroll sideways");
    await kit.screenshot("compare-scrolled");
  } else {
    check(before.scrollWidth <= before.clientWidth, `with room, every thing is in view (${before.scrollWidth} in ${before.clientWidth})`);
  }

  check(await kit.click("#only-differences"), "the project's own switch for differences");
  check(!(await shown(`${compare} tr[data-same]`)), "with only differences, equal rows are hidden");
  const bands = await page.evaluate((s) => [...document.querySelectorAll<HTMLElement>(`${s} tbody[data-slot=compare-group]`)].map((band) => band.getClientRects().length > 0), compare);
  check(bands.join() === "true,false,true", `a band with nothing left to show is hidden with its heading (${bands.join()})`);
  await kit.click("#only-differences");
  check(await shown(`${compare} tr[data-same]`), "and shown again");

  // ---------------------------------------------------------------- Fact rows
  const facts = await kit.demo("Fact rows");
  const first = `${facts} [data-slot=fact-row]:first-child`;
  const second = `${facts} [data-slot=fact-row]:nth-child(2)`;
  check((await count(`${facts} ul[data-slot=fact-list] > li`)) === 2 && (await attr(`${facts} ul`, "aria-label")) !== null, "facts are a named list");
  check((await attr(`${first} [data-slot=fact-actions]`, "role")) === "group" && (await attr(`${first} [data-slot=fact-actions]`, "aria-label")) === "Diet", "the actions are a group named after the fact");
  check((await text(`${first} [data-slot=source-chip]`)) === "You said this on 3 May", "the source is said in words");

  check(await kit.clickText(`${first} button`, "Edit"), "the edit action");
  check(await focusIs(`${first} [data-slot=fact-editor-input]`), "editing puts focus in the field");
  check((await page.$eval(`${first} [data-slot=fact-editor-input]`, (node) => (node as HTMLInputElement).value)) === "Vegetarian", "the field starts from the value");
  check((await attr(`${first} [data-slot=fact-editor-input]`, "aria-label")) === "Diet", "the field has a name");
  check((await count(`${first} [data-slot=fact-actions]`)) === 0 && (await count(`${first} [data-slot=fact-value]`)) === 0, "the value and its actions give way to the editor");
  await kit.axe(facts, "a fact being edited");
  await kit.screenshot("fact-editing");
  await page.keyboard.type(" for now");
  await keys("Escape");
  check((await count(`${first} [data-slot=fact-editor]`)) === 0 && (await text("[data-testid=diet]")) === "Vegetarian", "Escape cancels and keeps the value");
  check(await focusIs(`${first} [data-slot=fact-edit-trigger]`), `focus returns to the edit action (${await kit.focused()})`);

  await keys("Enter");
  check(await focusIs(`${first} [data-slot=fact-editor-input]`), "the edit action works from the keyboard");
  await page.keyboard.type("Vegan");
  await keys("Enter");
  check((await text("[data-testid=diet]")) === "Vegan", `Enter saves the new value (${await text("[data-testid=diet]")})`);
  check(await focusIs(`${first} [data-slot=fact-edit-trigger]`), "focus returns to the edit action after saving");
  check(await said("Diet was changed"), "saving is announced");

  await keys("Enter");
  await keys("Backspace");
  check((await attr(`${first} [data-slot=fact-editor-save]`, "disabled")) !== null, "an empty value cannot be saved");
  await keys("Enter");
  check((await count(`${first} [data-slot=fact-editor]`)) === 1, "Enter on an empty field does nothing");
  check(await kit.click(`${first} [data-slot=fact-editor-cancel]`), "the cancel button");
  check((await text("[data-testid=diet]")) === "Vegan", "cancelling keeps the value");

  check(await kit.clickText(`${first} button`, "Forget this"), "the remove action, in the project's words");
  check((await count(`${first} [data-slot=fact-removed]`)) === 1 && (await count(`${first} [data-slot=fact-value]`)) === 0, "a removed fact leaves a one-line stub");
  check(await focusIs(`${first} [data-slot=fact-undo]`), `focus moves to the way back (${await kit.focused()})`);
  check(await said("Diet was forgotten"), "the removal is announced");
  await kit.screenshot("fact-removed");
  await keys("Enter");
  check((await count(`${first} [data-slot=fact-value]`)) === 1 && (await count(`${first} [data-slot=fact-removed]`)) === 0, "undo brings the fact back");
  check(await focusIs(`${first} [data-slot=fact-actions] button`), `focus moves to the fact's first action (${await kit.focused()})`);
  check(await said("Diet was restored"), "the return is announced");

  check(await kit.clickText(`${second} button`, "Edit"), "a second fact, with editing controlled by the project");
  check((await text("[data-testid=airport-editing]")) === "yes", "the project is told that editing started");
  await page.keyboard.type("Porto");
  await keys("Enter");
  check((await text("[data-testid=airport]")) === "Porto" && (await text("[data-testid=airport-editing]")) === "no", "saving ends controlled editing");
  check((await count(`${second} a[data-slot=source-chip]`)) === 1 && (await count(`${second} button[data-slot=source-chip]`)) === 1, "a source can be a link or a button");
  const chipTarget = await page.evaluate((s) => {
    const chip = document.querySelector(`${s} button[data-slot=source-chip]`) as HTMLElement;
    const after = getComputedStyle(chip, "::after");
    return chip.getBoundingClientRect().height - parseFloat(after.top) - parseFloat(after.bottom);
  }, second);
  check(chipTarget >= 40, `a source that opens has a touch target of at least 40px (${chipTarget}px)`);
  if (kit.phone) {
    const stacked = await page.evaluate((s) => {
      const row = document.querySelector(s) as HTMLElement;
      const value = row.querySelector("[data-slot=fact-value]") as HTMLElement;
      const actions = row.querySelector("[data-slot=fact-actions]") as HTMLElement;
      return actions.getBoundingClientRect().top >= value.getBoundingClientRect().bottom;
    }, first);
    check(stacked, "in a narrow list the actions sit under the fact");
  }

  // ---------------------------------------------------------------- Consent sheet
  const consent = await kit.demo("Consent sheet");
  const dialog = "[role=dialog][data-slot=consent-content]";
  const open = async (): Promise<void> => {
    await kit.clickText(`${consent} button`, "Connect calendar");
    await sleep(450);
  };
  await open();
  check((await count(dialog)) === 1, "the consent opens as a dialog");
  const named = await page.evaluate((s) => {
    const element = document.querySelector(s) as HTMLElement;
    const title = document.getElementById(element.getAttribute("aria-labelledby") ?? "");
    const description = document.getElementById(element.getAttribute("aria-describedby") ?? "");
    return `${title?.textContent ?? ""} | ${description?.textContent?.slice(0, 10) ?? ""}`;
  }, dialog);
  check(named.startsWith("Let the planner see your calendar? | It is used"), `the question names the dialog and the explanation describes it (${named})`);
  check((await count(`${dialog} [role=switch]`)) === 2 && (await count(`${dialog} [role=switch][aria-checked=true]`)) === 0, "optional scopes have switches, and none is on to begin with");
  check((await text(`${dialog} [data-slot=consent-scope-required]`)) === "Always needed", "a required scope says so in words and has no switch");
  const switchName = await page.evaluate((s) => {
    const control = document.querySelector(`${s} [role=switch]`) as HTMLElement;
    return `${document.querySelector(`label[for="${control.id}"]`)?.textContent ?? ""} | ${document.getElementById(control.getAttribute("aria-describedby") ?? "")?.textContent?.slice(0, 7) ?? ""}`;
  }, dialog);
  check(switchName === "Event names | So that", `a switch is named by its scope and described by what is shared (${switchName})`);
  const pair = await page.evaluate((s) => {
    const look = (slot: string): string => {
      const button = document.querySelector(`${s} [data-slot=${slot}]`) as HTMLElement;
      const rect = button.getBoundingClientRect();
      const style = getComputedStyle(button);
      return [Math.round(rect.width), Math.round(rect.height), style.backgroundColor, style.color, style.borderColor, style.fontWeight, style.fontSize].join(" ");
    };
    return { accept: look("consent-accept"), decline: look("consent-decline") };
  }, dialog);
  check(pair.accept === pair.decline, `allowing and declining have the same size and look (${pair.accept})`);
  const order = await page.evaluate((s) => [...document.querySelectorAll(`${s} [data-slot=consent-footer] button`)].map((button) => button.textContent), dialog);
  check(order.join(" / ") === "Do not allow / Allow / Not now", "declining comes first in reading order");
  check(await page.evaluate((s) => document.querySelector(s)?.contains(document.activeElement) ?? false, dialog), "focus is inside the sheet");
  for (let index = 0; index < 9; index++) await page.keyboard.press("Tab");
  check(await page.evaluate((s) => document.querySelector(s)?.contains(document.activeElement) ?? false, dialog), "Tab stays inside the sheet");
  check((await attr(`${dialog} [data-slot=consent-details] button`, "aria-expanded")) === "false", "the longer text is closed until asked for");
  await kit.click(`${dialog} [data-slot=consent-details] button`);
  check((await attr(`${dialog} [data-slot=consent-details] button`, "aria-expanded")) === "true" && (await text(`${dialog} [data-slot=consent-details] [data-state=open]:not(button)`)).startsWith("Kept for 30 days"), "and opens in place");
  await kit.axe(dialog, "the consent sheet, open");
  await kit.screenshot("consent-open");
  if (kit.phone) {
    const box = await page.evaluate((s) => {
      const rect = (document.querySelector(s) as HTMLElement).getBoundingClientRect();
      return { bottom: Math.round(window.innerHeight - rect.bottom), width: Math.round(rect.width), top: Math.round(rect.top) };
    }, dialog);
    check(box.bottom === 0 && box.width === 390 && box.top > 0, `on a phone it rises from the bottom edge (${JSON.stringify(box)})`);
  }
  await keys("Escape");
  await sleep(450);
  check((await count(dialog)) === 0 && (await text("[data-testid=decision]")) === "dismissed", `Escape closes it without deciding (${await text("[data-testid=decision]")})`);
  check((await kit.focused()) === "Connect calendar", `focus returns to what opened it (${await kit.focused()})`);

  await open();
  check(await kit.clickText(`${dialog} label`, "Event names"), "pressing a scope's name switches it");
  check((await attr(`${dialog} [role=switch]`, "aria-checked")) === "true", "the switch is on");
  await kit.clickText(`${dialog} button`, "Allow");
  await sleep(450);
  check((await count(dialog)) === 0 && (await text("[data-testid=decision]")) === "allowed: titles", `allowing reports the scopes that were switched on (${await text("[data-testid=decision]")})`);
  check((await kit.focused()) === "Connect calendar", "focus returns after deciding");

  await open();
  await kit.clickText(`${dialog} button`, "Do not allow");
  await sleep(450);
  check((await count(dialog)) === 0 && (await text("[data-testid=decision]")) === "declined", "declining takes one press, like allowing");
  await open();
  await kit.clickText(`${dialog} button`, "Not now");
  await sleep(450);
  check((await count(dialog)) === 0 && (await text("[data-testid=decision]")) === "dismissed", "not now puts the question off without an answer");

  // ---------------------------------------------------------------- Consent panel (inline, controlled)
  const panel = await kit.demo("Consent panel");
  check((await count(`${panel} section[data-slot=consent-panel] h2#panel-title`)) === 1 && (await attr(`${panel} section[data-slot=consent-panel]`, "aria-labelledby")) === "panel-title", "inline, the consent is a section named by its question");
  check((await text(`${panel} [data-slot=consent-scope-required]`)) === "Required", "the word for a required scope has a default");
  await kit.focus(`${panel} [role=switch]`);
  await keys("Space");
  check((await text("[data-testid=panel-granted]")) === "needs", "Space switches a scope on, and the project holds the value");
  await kit.clickText(`${panel} button`, "Share");
  check((await text("[data-testid=panel-decision]")) === "allowed: needs", "allowing in a panel reports the scopes");
  await kit.clickText(`${panel} button`, "Do not share");
  check((await text("[data-testid=panel-decision]")) === "declined", "declining in a panel");

  // ---------------------------------------------------------------- Language switcher
  const languages = await kit.demo("Language switcher");
  const trigger = `${languages} [data-slot=language-switcher-trigger]`;
  check((await text(trigger)) === "Language: English", `the trigger is named by the label and the language's own name (${await text(trigger)})`);
  check((await attr(trigger, "aria-haspopup")) === "menu" && (await attr(`${trigger} span[lang]`, "lang")) === "en", "it opens a menu, and the name carries its language");
  await kit.focus(trigger);
  await keys("Enter");
  await sleep(300);
  const menu = "[role=menu][data-slot=language-switcher-content]";
  check((await count(`${menu} [role=menuitemradio]`)) === 5, "each language is a radio item in a menu");
  check((await count(`${menu} [role=menuitemradio][aria-checked=true]`)) === 1 && (await text(`${menu} [role=menuitemradio][aria-checked=true] span[lang]`)) === "English", "the current language is the checked one");
  const arabic = await page.evaluate((s) => {
    const label = document.querySelector(`${s} span[lang=ar]`) as HTMLElement;
    const item = label.closest("[role=menuitemradio]") as HTMLElement;
    const english = document.querySelector(`${s} span[lang=en]`) as HTMLElement;
    return {
      own: label.textContent,
      dir: label.dir,
      second: item.querySelector("span.text-xs")?.textContent,
      aligned: Math.abs(getComputedStyle(item).direction === "rtl" ? label.getBoundingClientRect().right - english.getBoundingClientRect().right : label.getBoundingClientRect().left - english.getBoundingClientRect().left) < 1,
    };
  }, menu);
  check(arabic.own === "العربية" && arabic.dir === "rtl", `a language is shown under its own name, in its own direction (${arabic.own}, ${arabic.dir})`);
  check(arabic.second === "Arabic", "with its name in the interface language as a second line");
  check(arabic.aligned, "names in either direction line up at the menu's start");
  check((await text(`${menu} span[lang=dv]`)) === "ދިވެހި", "the project can supply a name the runtime lacks");
  check((await count(`${menu} img, ${menu} svg:not([aria-hidden=true] svg):not([data-slot] svg)`)) === 0, "there are no flags");
  await kit.axe(menu, "the language menu, open");
  await kit.screenshot("language-open");
  await keys("ArrowDown", "Enter");
  await sleep(300);
  check((await text("[data-testid=language]")) === "fr", `the arrow keys and Enter choose a language (${await text("[data-testid=language]")})`);
  check((await count(menu)) === 0 && (await focusIs(trigger)), "the menu closes and focus returns to the trigger");
  check((await text(trigger)) === "Language: Français", `the trigger shows the new language's own name (${await text(trigger)})`);
  await keys("Enter");
  await sleep(300);
  await keys("j");
  check((await text(`${menu} [data-highlighted] span[lang]`)) === "日本語" || (await kit.focused()).includes("日本語") || (await kit.focused()).includes("Japanese"), `typing jumps by the name in the interface language or its own (${await kit.focused()})`);
  await keys("Escape");
  await sleep(300);
  check((await text("[data-testid=language]")) === "fr", "Escape leaves the language as it was");

  const plain = "[data-testid=uncontrolled-language] [data-slot=language-switcher-trigger]";
  check((await text(plain)).startsWith("Language: Português"), `uncontrolled, it starts from its default (${await text(plain)})`);
  await kit.click(plain);
  await sleep(300);
  await kit.clickText(`${menu} [role=menuitemradio]`, "Español");
  await sleep(300);
  check((await text(plain)) === "Language: Español", `and keeps the choice itself (${await text(plain)})`);

  // ---------------------------------------------------------------- Price breakdown
  const price = await kit.demo("Price breakdown and countdown");
  check((await count(`${price} dl[data-slot=price-breakdown] dt`)) === 5 && (await count(`${price} dl[data-slot=price-breakdown] dd`)) === 5, "each line is a term and its amount");
  check((await text(`${price} [data-slot=price-total] dd`)) === "€88.00", `the total is formatted for its currency and locale (${await text(`${price} [data-slot=price-total] dd`)})`);
  check((await text(`${price} [data-discount] dd`)) === "-€10.00", "a discount carries a minus sign, not only a colour");
  check((await text(`${price} [data-slot=price-line]:nth-child(4) dd`)) === "Included", "a line can say something other than an amount");
  const amounts = await page.evaluate(
    (s, isRtl) => {
      const list = document.querySelector(`${s} dl`) as HTMLElement;
      const edge = isRtl ? list.getBoundingClientRect().left : list.getBoundingClientRect().right;
      return [...list.querySelectorAll("dd")].map((amount) => ({
        off: Math.round(Math.abs((isRtl ? amount.getBoundingClientRect().left : amount.getBoundingClientRect().right) - edge)),
        tabular: getComputedStyle(amount).fontVariantNumeric.includes("tabular-nums"),
      }));
    },
    price,
    rtl,
  );
  check(amounts.every((amount) => amount.off === 0 && amount.tabular), "amounts line up at the end in tabular figures");
  check(!(await said("Total is now")), "the total is not announced when it first appears");
  await kit.focus("#people");
  await keys("ArrowUp");
  check((await text(`${price} [data-slot=price-total] dd`)) === "€134.00", "the total follows its lines");
  check(await said("Total is now €134.00 for 3"), `a changed total is announced in full (${(await kit.announced()).at(-1)})`);

  // ---------------------------------------------------------------- Countdown
  check(await kit.clickText(`${price} button`, "Hold for 63 seconds"), "start a hold");
  await sleep(400);
  const timer = `${price} [data-slot=countdown]`;
  check((await attr(timer, "role")) === "timer" && (await attr(timer, "aria-live")) === null, "the countdown is a timer that does not speak every second");
  const started = await text(timer);
  check(/^1 min 0\d sec$/.test(started), `the time left is text, with two digits of seconds beside minutes (${started})`);
  check(!(await said("left at this price")), "nothing is announced before a threshold");
  await sleep(4200);
  const later = await text(timer);
  check(/^5\d sec$/.test(later), `it counts down (${later})`);
  check(await said("sec left at this price"), `crossing a threshold is announced once, in the project's words (${(await kit.announced()).filter((message) => message.includes("left at this price")).join(" / ")})`);
  check((await kit.announced()).filter((message) => message.includes("left at this price")).length === 1, "and only once");
  await kit.clickText(`${price} button`, "Hold for 3 seconds");
  await sleep(4300);
  check((await text(timer)) === "no longer: the hold has ended" && (await attr(timer, "data-state")) === "expired", `at the end it says so (${await text(timer)})`);
  check((await text("[data-testid=expired]")) === "1", `the project is told once that it ended (${await text("[data-testid=expired]")})`);
  check(await said("no longer: the hold has ended"), "the end is announced");

  // ---------------------------------------------------------------- Undo line
  const undo = await kit.demo("Undo line");
  check(await kit.click(`${undo} [aria-label="Remove Lunch"]`), "remove a row");
  check((await count(`${undo} ul > li`)) === 2 && (await text(`${undo} [data-slot=undo-line-message]`)) === "Lunch was removed from Saturday.", "the line says what was done, where it was done");
  check(await said("Lunch was removed from Saturday."), "the line is announced when it appears");
  check(await focusIs(`${undo} [data-slot=undo-line-action]`), `focus is not lost with the row (${await kit.focused()})`);
  await sleep(1500);
  check((await count(`${undo} [data-slot=undo-line]`)) === 1, "the line stays");
  await kit.axe(undo, "the undo line");
  await keys("Enter");
  const rows = await page.evaluate((s) => [...document.querySelectorAll(`${s} ul > li`)].map((row) => row.firstChild?.textContent), undo);
  check(rows.join(", ") === "Market walk, Lunch, Pottery class", `undo puts the row back where it was (${rows.join(", ")})`);
  check((await count(`${undo} [data-slot=undo-line]`)) === 0 && (await kit.focused()) === "Remove Lunch", `the line goes and focus moves to what came back (${await kit.focused()})`);
  await kit.click(`${undo} [aria-label="Remove Market walk"]`);
  check(await said("Market walk was removed from Saturday."), "a new action replaces the line and is announced");
  check((await attr(`${undo} [data-slot=undo-line-dismiss]`, "aria-label")) === "Dismiss", "the dismiss button has a name");
  await kit.click(`${undo} [data-slot=undo-line-dismiss]`);
  check((await count(`${undo} [data-slot=undo-line]`)) === 0 && (await count(`${undo} ul > li`)) === 2, "dismissing keeps the change");

  // ---------------------------------------------------------------- Timeline
  const timeline = await kit.demo("Timeline");
  check((await count(`${timeline} ol[data-slot=timeline] > li`)) === 4 && (await attr(`${timeline} ol`, "aria-label")) === "Order 1042", "the timeline is a named ordered list");
  check((await count(`${timeline} li[aria-current=step]`)) === 1 && (await text(`${timeline} li[aria-current=step] [data-slot=timeline-title]`)) === "On its way", "the current row is marked as current");
  const words = await page.evaluate((s) => [...document.querySelectorAll(`${s} li [data-slot=timeline-marker] .sr-only`)].map((word) => word.textContent?.trim()), timeline);
  check(words.join(" ") === "Done: Done: Now: Upcoming:", `every row's state is in words (${words.join(" ")})`);
  check((await text(`${timeline} li[aria-current=step] [data-slot=timeline-state]`)) === "Now", "the current row shows its word");
  const marker = await page.evaluate(
    (s, isRtl) => {
      const row = document.querySelector(`${s} li:nth-child(4)`) as HTMLElement;
      const dot = row.querySelector("[data-slot=timeline-marker]") as HTMLElement;
      const line = getComputedStyle(document.querySelector(`${s} li:first-child`) as HTMLElement, "::before");
      const r = row.getBoundingClientRect();
      const d = dot.getBoundingClientRect();
      return { number: getComputedStyle(dot, "::before").content, start: Math.round(isRtl ? r.right - d.right : d.left - r.left), line: line.width, done: document.querySelectorAll(`${s} li[data-state=done] svg`).length };
    },
    timeline,
    rtl,
  );
  check(marker.start === 0, `markers sit at the start of the line (${marker.start}px)`);
  check(marker.number.includes("counter(rui-timeline") && marker.done === 2, `rows are numbered from the list's counter, and done rows show a tick (${marker.number})`);
  check(marker.line === "1px", "a hairline joins a row to the next");

  await kit.axe("main", "after the checks");
}
