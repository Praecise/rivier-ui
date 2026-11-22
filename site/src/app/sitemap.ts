import type { MetadataRoute } from "next";
import { PAGES } from "./_showcase/pages";
import { DOCS, SITE, items } from "./_site/registry";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ["/", "/components", "/showcase", ...DOCS.map((page) => page.href), ...PAGES.map((page) => page.href), ...items().map((entry) => `/components/${entry.name}`)];
  return paths.map((path) => ({ url: `${SITE}${path === "/" ? "" : path}` }));
}
