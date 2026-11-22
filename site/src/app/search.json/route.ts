// What the search palette lists: the pages of the documentation, the showcase pages and every component.

import { PAGES } from "../_showcase/pages";
import { DOCS, items } from "../_site/registry";

export const dynamic = "force-static";

export function GET(): Response {
  const entries = [
    ...DOCS.map((page) => ({ href: page.href, title: page.title, description: page.description, group: "Documentation" })),
    { href: "/components", title: "All components", description: "Every component and helper, by group.", group: "Documentation" },
    { href: "/showcase", title: "Showcase", description: "Everything working on one page, with the theme switches.", group: "Showcase" },
    ...PAGES.map((page) => ({ href: page.href, title: page.title, description: page.description, group: "Showcase" })),
    ...items().map((entry) => ({ href: `/components/${entry.name}`, title: entry.name, description: entry.description, group: "Components" })),
  ];
  return Response.json(entries);
}
