// Checks: the page of one component: its demonstration, the ways to add it, its source (site/src/app/components/[name]).

import type { Kit } from "../smoke-kit.ts";

export const route = "/components/alert-dialog";

export async function run(kit: Kit): Promise<void> {
  const { check, keys, text, attr, count, page, sleep } = kit;
  const forward = kit.dir === "rtl" ? "ArrowLeft" : "ArrowRight";

  check((await text("h1")) === "alert-dialog", "the page is named after the component");
  if (!kit.phone) check((await text("[data-slot=sidebar] a[aria-current=page]")) === "alert-dialog", "the sidebar marks the component");
  if (!kit.phone) {
    const seen = await page.evaluate(() => {
      const nav = document.querySelector("[data-slot=sidebar]")?.getBoundingClientRect();
      const link = document.querySelector("[data-slot=sidebar] a[aria-current=page]")?.getBoundingClientRect();
      return nav && link ? link.top >= nav.top && link.bottom <= nav.bottom : false;
    });
    check(seen, "and has it in view in the list");
  }
  check((await text("[data-slot=copy-button]")) === "Copy as Markdown", "the component can be copied as Markdown");

  // The demonstration: only what is about this component, and it works.
  await page.waitForSelector("[data-slot=live] [data-demo]", { timeout: 30_000 });
  const shown = await page.$$eval("[data-slot=live] [data-demo]", (nodes) => nodes.filter((node) => (node as HTMLElement).offsetParent !== null).map((node) => node.getAttribute("data-demo")));
  check(shown.join(", ") === "Alert dialog", `the page shows the demonstration about this component, and no other (${shown.join(", ")})`);
  check(await kit.click("[data-slot=live] [data-slot=alert-dialog-trigger]"), "the demonstration can be used");
  await sleep(400);
  check((await count("[role=alertdialog]")) === 1 && (await kit.focused()) === "Keep it", "it opens, with focus on the safe answer");
  await keys("Escape");
  await sleep(400);
  check((await count("[role=alertdialog]")) === 0, "and closes");

  // Ways to add it: tabs.
  check((await count("[role=tablist] [role=tab]")) === 3 && (await attr("[role=tablist]", "aria-label")) === "How to add it", "the ways to add it are tabs with a name");
  check((await text("[role=tabpanel] [data-slot=code-block] code")) === "npx shadcn@latest add @rivier-ui/alert-dialog", "the first is the shadcn command, for this component");
  check(await kit.focus("[role=tab][aria-selected=true]"), "the chosen tab takes focus");
  await keys(forward);
  check((await text("[role=tabpanel] [data-slot=code-block] code")) === "npm run ui -- add alert-dialog dir=<project>", "the arrow key shows the next way");
  await keys(forward);
  const install = await text("[role=tabpanel] [data-slot=code-block] code");
  check(install.startsWith("npm install ") && install.includes("radix-ui"), `by hand, the packages to install are named (${install})`);

  // Example and source.
  const source = await page.$$eval("[data-slot=code-block]", (nodes) => {
    const last = nodes[nodes.length - 1];
    return { title: last?.querySelector("figcaption")?.textContent ?? "", has: last?.textContent?.includes("AlertDialogPrimitive.Root") ?? false };
  });
  check(source.title === "src/components/ui/alert-dialog.tsx" && source.has, "the whole source is on the page, under the place it goes");
  check((await count("a[href='/components/button']")) >= 1 && (await count("a[href='/r/alert-dialog.json']")) === 1, "it links to what it imports and to its registry item");
  const more = await page.$$eval("nav[aria-label='More pages'] a", (links) => links.map((link) => link.querySelector("span:last-child")?.textContent));
  check(more.join(", ") === "alert, audio-player", `it links to the components before and after (${more.join(", ")})`);
}
