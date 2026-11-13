// Checks: tree-view, kanban, flow-diagram, tour and notification-list (site/src/app/boards).

import type { Kit } from "../smoke-kit.ts";

export const route = "/boards";

export async function run(kit: Kit): Promise<void> {
  const { check, keys, text, attr, count } = kit;
  const forward = kit.dir === "rtl" ? "ArrowLeft" : "ArrowRight";
  const back = kit.dir === "rtl" ? "ArrowRight" : "ArrowLeft";

  // Tree view: the WAI-ARIA tree pattern.
  const tree = await kit.demo("Tree view");
  check((await attr(`${tree} [role=tree]`, "aria-label")) === "Files", "tree-view: a named tree");
  check((await count(`${tree} [role=treeitem][tabindex="0"]`)) === 1, "tree-view: one item in the Tab order");
  check((await attr(`${tree} [role=treeitem]`, "aria-expanded")) === "true" && (await attr(`${tree} [role=treeitem]`, "aria-level")) === "1", "tree-view: an open folder says so, with its level");
  check(await kit.focus(`${tree} [role=treeitem][tabindex="0"]`), "tree-view: the tree takes focus");
  await keys("ArrowDown");
  check((await kit.focused()).startsWith("app.tsx"), `tree-view: Down goes to the next visible item (${await kit.focused()})`);
  await keys("ArrowDown", forward);
  check((await attr(`${tree} [role=treeitem][aria-level="2"][aria-expanded]`, "aria-expanded")) === "true", "tree-view: the arrow towards the end opens a folder");
  await keys(forward);
  check((await kit.focused()).startsWith("cn.ts"), "tree-view: again, it goes into the folder");
  await keys(back);
  check((await kit.focused()).startsWith("lib"), "tree-view: the arrow towards the start goes up to the parent");
  await keys("End");
  check((await kit.focused()).startsWith("README.md"), "tree-view: End goes to the last item");
  await keys("Enter");
  check((await text("[data-testid=tree-selected]")) === "readme", "tree-view: Enter chooses an item");
  check((await attr(`${tree} [role=treeitem][aria-selected=true]`, "aria-level")) === "1", "tree-view: the chosen item says so");
  await keys("d");
  check((await kit.focused()).startsWith("dates.ts"), `tree-view: typing a letter jumps to the next item that starts with it (${await kit.focused()})`);
  await keys("End", "d", "o");
  check((await kit.focused()).startsWith("docs"), `tree-view: letters typed together find the item that starts with them (${await kit.focused()})`);
  await keys("*");
  check((await count(`${tree} [role=treeitem][aria-expanded=true]`)) >= 3, "tree-view: * opens every sibling folder");

  // Notifications.
  const inbox = await kit.demo("Notifications");
  check((await count(`${inbox} [data-slot=notification]`)) === 3, "notification-list: every notice");
  check((await text(`${inbox} [data-slot=notification]:first-child h3`)).startsWith("Unread"), "notification-list: an unread notice says so in words");
  check(
    (await text(`${inbox} [data-slot=notification]:first-child time`)) === "5 min. ago",
    `notification-list: the time in words from the given moment (${await text(`${inbox} [data-slot=notification]:first-child time`)})`,
  );
  check(await kit.clickText(`${inbox} button`, "Unread2"), "notification-list: the unread filter can be pressed");
  check((await count(`${inbox} [data-slot=notification]`)) === 2, "notification-list: it shows the unread ones");
  check(await kit.clickText(`${inbox} button`, "Mark all as read"), "notification-list: all can be marked read");
  check((await kit.announced()).includes("All marked as read"), "notification-list: and it is said");
  check((await text(inbox)).includes("Nothing unread."), "notification-list: the empty filter says so");

  // Kanban: lift with Space, carry with arrows, drop; and the menu.
  const board = await kit.demo("Kanban");
  check(await kit.focus(`${board} [data-slot=kanban-card]`), "kanban: a card takes focus");
  check((await attr(`${board} [data-slot=kanban-card]`, "aria-roledescription")) === "card", "kanban: a card is described as a card");
  await keys("Space");
  check(((await kit.announced()).at(-1) ?? "").startsWith("Write the brief lifted, in To do, 1 of 2"), "kanban: Space lifts a card and says where it is");
  await keys("ArrowDown");
  check((await text("[data-testid=cards]")).startsWith("To do: Plan the survey, Write the brief"), "kanban: Down moves the lifted card down its column");
  await keys(forward);
  check((await text("[data-testid=cards]")).includes("Doing: Draw the map, Write the brief"), `kanban: the arrow towards the end carries it to the next column (${await text("[data-testid=cards]")})`);
  check(((await kit.announced()).at(-1) ?? "") === "Write the brief: Doing, 2 of 2", "kanban: every move is said");
  await keys("Space");
  check(((await kit.announced()).at(-1) ?? "").startsWith("Write the brief dropped in Doing"), "kanban: Space drops it");
  await keys("Space", forward, "Escape");
  check((await text("[data-testid=cards]")).includes("Doing: Draw the map, Write the brief"), "kanban: Escape puts a lifted card back");
  check(await kit.click(`${board} [aria-label="Move Draw the map"]`), "kanban: each card has a move menu");
  check(await kit.clickText("[role=menuitem]", "Done"), "kanban: the menu lists the other columns");
  check((await text("[data-testid=cards]")).endsWith("Done: Print the posters, Draw the map"), "kanban: the menu moves the card without dragging");

  // Flow diagram.
  const flow = await kit.demo("Flow diagram");
  const svg = `${flow} svg[role=application]`;
  check((await attr(svg, "aria-label")) === "Order flow" && (await attr(svg, "aria-roledescription")) === "diagram", "flow-diagram: a named diagram");
  check((await count(`${flow} [data-slot=flow-diagram-node][tabindex="0"]`)) === 4, "flow-diagram: every step is reached with Tab");
  check(await kit.focus(`${flow} [data-slot=flow-diagram-node][aria-label=Packed]`), "flow-diagram: a step takes focus");
  await keys("c");
  check(((await kit.announced()).at(-1) ?? "").startsWith("Linking from Packed"), "flow-diagram: C starts a link and says how to finish it");
  await kit.focus(`${flow} [data-slot=flow-diagram-node][aria-label=Sent]`);
  await keys("Enter");
  check((await text("[data-testid=edges]")).includes("packed>sent"), "flow-diagram: Enter on another step ends the link");
  check(((await kit.announced()).at(-1) ?? "") === "Packed now leads to Sent", "flow-diagram: the new link is said");
  const before = await attr(`${flow} [data-slot=flow-diagram-node][aria-label=Sent]`, "transform");
  await keys("ArrowRight");
  check((await attr(`${flow} [data-slot=flow-diagram-node][aria-label=Sent]`, "transform")) !== before, "flow-diagram: an arrow key moves a step");
  check(((await kit.announced()).at(-1) ?? "").startsWith("Sent moved to"), "flow-diagram: the move is said");
  check((await text(`${flow} [data-slot=flow-diagram-list]`)).includes("Packed leads to Sent"), "flow-diagram: the links are also a list");
  await keys("Delete");
  check((await count(`${flow} [data-slot=flow-diagram-node]`)) === 3 && !(await text("[data-testid=edges]")).includes("sent"), "flow-diagram: Delete removes a step and its links");

  // Tour.
  const tour = await kit.demo("Tour");
  check(await kit.clickText(`${tour} button`, "Show me around"), "tour: it can be started");
  await kit.sleep(300);
  check((await attr("[data-slot=tour]", "role")) === "dialog" && (await text("[data-slot=tour] h2")) === "Search", "tour: a dialog for the first step");
  check(await kit.focusIs("[data-slot=tour]"), "tour: focus moves into it");
  check((await count("[data-slot=tour-ring]")) === 1, "tour: the element is ringed");
  check((await text("[data-slot=tour]")).includes("1 of 2"), "tour: it says which step");
  check(await kit.clickText("[data-slot=tour] button", "Next"), "tour: Next");
  check((await text("[data-slot=tour] h2")) === "Share", "tour: goes to the next step");
  await kit.focus("[data-slot=tour]");
  await keys("Escape");
  check((await count("[data-slot=tour]")) === 0, "tour: Escape ends it");
  await kit.clickText(`${tour} button`, "Show me around");
  await kit.sleep(300);
  await kit.clickText("[data-slot=tour] button", "Next");
  check(await kit.clickText("[data-slot=tour] button", "Done"), "tour: the last step's button is Done");
  check((await text("[data-testid=toured]")) === "completed", "tour: finishing is reported");

  await kit.axe("main", "after the checks");
}
