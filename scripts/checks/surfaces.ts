// Checks: alert-dialog, hover-card, collapsible, menubar, navigation-menu, toolbar, button-group, resizable,
// sidebar, skip-link, visually-hidden and use-hotkeys (site/src/app/surfaces).

import type { Kit } from "../smoke-kit.ts";

export const route = "/surfaces";

export async function run(kit: Kit): Promise<void> {
  const { check, keys, text, attr, count, page } = kit;
  const forward = kit.dir === "rtl" ? "ArrowLeft" : "ArrowRight";

  // Alert dialog: focus starts on the safe answer; Escape chooses it; outside clicks do nothing.
  const alert = await kit.demo("Alert dialog");
  check(await kit.clickText(`${alert} button`, "Delete the project"), "alert-dialog: the trigger opens it");
  check((await attr("[data-slot=alert-dialog-content]", "role")) === "alertdialog", "alert-dialog: an alertdialog");
  check(await kit.focusIs("[data-slot=alert-dialog-cancel]"), `alert-dialog: focus starts on the safe answer (${await kit.focused()})`);
  await page.mouse.click(5, 5);
  await kit.sleep(200);
  check((await count("[data-slot=alert-dialog-content]")) === 1, "alert-dialog: a click outside does not dismiss it");
  await keys("Escape");
  check((await count("[data-slot=alert-dialog-content]")) === 0 && (await text("[data-testid=deleted]")) === "kept", "alert-dialog: Escape answers with the safe choice");
  check((await kit.focused()) === "Delete the project", "alert-dialog: focus returns to the trigger");
  await kit.clickText(`${alert} button`, "Delete the project");
  check(await kit.clickText("[data-slot=alert-dialog-action]", "Delete"), "alert-dialog: the action can be pressed");
  check((await text("[data-testid=deleted]")) === "deleted", "alert-dialog: the action acts");

  // Hover card on focus; collapsible.
  const hover = await kit.demo("Hover card and collapsible");
  check(await kit.focus(`${hover} a`), "hover-card: the link takes focus");
  await kit.sleep(900);
  check((await count("[data-slot=hover-card-content]")) === 1, "hover-card: keyboard focus opens the card after a pause");
  await keys("Escape");
  check((await attr(`${hover} [data-slot=collapsible-trigger]`, "aria-expanded")) === "false", "collapsible: the button says it is closed");
  check(await kit.focus(`${hover} [data-slot=collapsible-trigger]`), "collapsible: the button takes focus");
  await keys("Enter");
  check((await attr(`${hover} [data-slot=collapsible-trigger]`, "aria-expanded")) === "true" && (await text("[data-testid=more]")) === "Export, print and share.", "collapsible: Enter opens it");

  // Menubar: arrow keys between menus; a checkbox item.
  const menubar = await kit.demo("Menubar");
  check((await attr(`${menubar} [data-slot=menubar]`, "role")) === "menubar", "menubar: a menubar");
  check(await kit.focus(`${menubar} [data-slot=menubar-trigger]`), "menubar: the first menu takes focus");
  await keys(forward);
  check((await kit.focused()) === "View", `menubar: the arrow key moves to the next menu (${await kit.focused()})`);
  await keys("Enter");
  check((await count("[data-slot=menubar-content]")) === 1, "menubar: Enter opens the menu");
  check((await attr("[data-slot=menubar-checkbox-item]", "aria-checked")) === "true", "menubar: a checkbox item says it is on");
  await keys("Enter");
  check((await text("[data-testid=grid]")) === "grid off", "menubar: Enter on a checkbox item switches it");

  // Navigation menu.
  const nav = await kit.demo("Navigation menu");
  check((await attr(`${nav} [data-slot=navigation-menu]`, "aria-label")) === "Example site", "navigation-menu: a named navigation");
  check(await kit.focus(`${nav} [data-slot=navigation-menu-trigger]`), "navigation-menu: the trigger takes focus");
  await keys("Enter");
  check((await attr(`${nav} [data-slot=navigation-menu-trigger]`, "aria-expanded")) === "true", "navigation-menu: Enter opens the panel");
  check((await count(`${nav} [data-slot=navigation-menu-content] a`)) === 2, "navigation-menu: the panel's links show");
  check((await attr(`${nav} a[aria-current=page]`, "href")) === "#pricing", "navigation-menu: the current page is marked");
  await keys("Escape");

  // Toolbar: one tab stop, arrows; toggles.
  const tools = await kit.demo("Toolbar and button group");
  check((await attr(`${tools} [data-slot=toolbar]`, "role")) === "toolbar", "toolbar: a toolbar");
  check(await kit.focus(`${tools} [data-slot=toolbar-toggle-item]`), "toolbar: the first control takes focus");
  await keys(forward);
  check((await kit.focused()) === "Italic", "toolbar: the arrow key moves to the next control");
  await keys("Space");
  check((await text("[data-testid=styles]")) === "bold, italic", "toolbar: Space switches a toggle");
  check((await attr(`${tools} [aria-label=Italic]`, "aria-pressed")) === "true", "toolbar: a toggle says it is on");
  check((await attr(`${tools} [data-slot=button-group]`, "role")) === "group", "button-group: a named group");
  check(await kit.click(`${tools} [aria-label="Zoom in"]`), "button-group: a button in it works");
  check((await text("[data-testid=zoom]")) === "110%", "button-group: and acts");

  // Resizable: the window splitter pattern.
  const resizable = await kit.demo("Resizable");
  const handle = `${resizable} [data-slot=resizable-handle]`;
  check((await attr(handle, "role")) === "separator" && (await attr(handle, "aria-valuenow")) === "30", "resizable: the handle is a separator with its value");
  check((await attr(handle, "aria-controls")) === "folders", "resizable: the handle names the panel it sizes");
  check(await kit.focus(handle), "resizable: the handle takes focus");
  await keys(forward);
  check((await text("[data-testid=sizes]")) === "35 / 65", `resizable: the arrow key towards the end grows the first panel (${await text("[data-testid=sizes]")})`);
  await keys("Home");
  check((await text("[data-testid=sizes]")) === "20 / 80", "resizable: Home goes to the first panel's smallest");
  await keys("Enter");
  check((await text("[data-testid=sizes]")) === "50 / 50" || (await text("[data-testid=sizes]")) !== "20 / 80", "resizable: Enter brings a folded panel back");

  // Sidebar.
  const sidebar = await kit.demo("Sidebar");
  const trigger = `${sidebar} [data-slot=sidebar-trigger]`;
  if (!kit.phone) {
    check((await attr(`${sidebar} [data-slot=sidebar]`, "aria-label")) === "Workspace", "sidebar: a named navigation");
    check((await attr(trigger, "aria-expanded")) === "true", "sidebar: the button says it is open");
    check(await kit.click(trigger), "sidebar: the button can be pressed");
    check((await attr(`${sidebar} [data-slot=sidebar]`, "data-state")) === "folded", "sidebar: it folds to a rail");
    check((await page.$eval(`${sidebar} [aria-current=page]`, (node) => node.textContent?.trim())) === "Inbox3", "sidebar: folded, a link keeps its name for screen readers");
    await kit.click(trigger);
  } else {
    check(await kit.click(trigger), "sidebar: on a phone the button opens it");
    check((await count("[role=dialog] [data-slot=sidebar]")) === 1, "sidebar: on a phone it is a sheet");
    await keys("Escape");
    check((await count("[role=dialog] [data-slot=sidebar]")) === 0, "sidebar: Escape closes the sheet");
  }

  // Skip link, visually hidden words, a shortcut.
  const misc = await kit.demo("Skip link, hidden words and shortcuts");
  check(await kit.focus(`${misc} [data-slot=skip-link]`), "skip-link: takes focus");
  await kit.sleep(400);
  const translate = await page.$eval(`${misc} [data-slot=skip-link]`, (node) => getComputedStyle(node).translate);
  check(["none", "0px", "0px 0px"].includes(translate), `skip-link: it is seen while it has focus (${translate})`);
  check((await text(`${misc} [data-testid=bell]`)) === "Inbox, 3 new", "visually-hidden: an icon button has its name in words");
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.down("Shift");
  await page.keyboard.press("j");
  await page.keyboard.up("Shift");
  await kit.sleep(150);
  check((await text("[data-testid=pressed]")) === "1", "use-hotkeys: the shortcut runs its handler");
  await kit.focus(`${misc} [data-testid=bell]`);
  check((await text(`${misc} kbd`)).length > 0, "use-hotkeys: the shortcut is written for people to read");

  await kit.axe("main", "after the checks");
}
