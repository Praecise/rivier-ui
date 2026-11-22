// Checks: a page of documentation: its sidebar, its code and its neighbours (site/src/app/docs).

import type { Kit } from "../smoke-kit.ts";

export const route = "/docs/installation";

export async function run(kit: Kit): Promise<void> {
  const { check, keys, text, attr, count, page, sleep } = kit;

  check((await text("h1")) === "Installation", "the page has its title");
  if (kit.phone) {
    const opener = "[data-slot=collapsible-trigger]";
    check((await attr(opener, "aria-expanded")) === "false", "at phone width the section's pages are behind a button");
    check(await kit.focus(opener), "the button takes focus");
    await keys("Enter");
    await sleep(300);
    check((await attr(opener, "aria-expanded")) === "true" && (await count("[data-slot=collapsible-content] nav[aria-label=Documentation] a")) > 8, "Enter opens them");
    check((await text("[data-slot=collapsible-content] a[aria-current=page]")) === "Installation", "the page being read is marked");
    await keys("Enter");
  } else {
    check((await text("[data-slot=sidebar] a[aria-current=page]")) === "Installation", "the sidebar marks the page being read (aria-current)");
    check((await attr("[data-slot=sidebar]", "aria-label")) === "Documentation", "the sidebar is a named landmark");
    check((await count("nav[aria-label='On this page'] a")) === 5, "the page lists its own sections");
  }
  const targets = await page.$$eval("nav[aria-label='On this page'] a", (links) => links.every((link) => document.getElementById(link.getAttribute("href")?.slice(1) ?? "") !== null));
  check(targets, "every section link has its section");

  const blocks = await page.$$eval("[data-slot=code-block] pre", (nodes) => nodes.map((node) => node.getAttribute("tabindex")));
  check(blocks.length >= 4 && blocks.every((stop) => stop === "0"), `code can be reached and scrolled with the keyboard (${blocks.length} blocks)`);
  check((await count("[data-slot=code-block] button[aria-label^=Copy]")) === blocks.length, "every block has a named copy button");
  check((await count("[data-slot=code-block] code span.text-primary")) > 0, "code is coloured from the theme");
  const fits = await page.$$eval("[data-slot=code-block]", (nodes) => nodes.every((node) => node.getBoundingClientRect().right <= window.innerWidth + 1 && node.getBoundingClientRect().left >= -1));
  check(fits, "code scrolls inside its block, not the page");
  check((await text("[data-slot=code-block] figcaption")) === "components.json", "a block can name its file");

  const more = await page.$$eval("nav[aria-label='More pages'] a", (links) => links.map((link) => link.querySelector("span:last-child")?.textContent));
  check(more.join(", ") === "Introduction, Theming", `the page links to its neighbours (${more.join(", ")})`);
  check((await count("footer nav")) === 3, "the footer has its three lists");
}
