"use client";
// Site: the header of every page, with scroll progress under it: the sections of the site, search and the
// light or dark switch.

import { usePathname } from "next/navigation";
import { Navbar, NavbarLink } from "@/components/ui/navbar";
import { SkipLink } from "@/components/ui/skip-link";
import { ScrollProgress } from "@/components/motion/scroll-progress";
import { ModeSwitch } from "../_site/parts";
import { Search } from "../_site/search";
import { PAGES } from "./pages";

const SECTIONS = [
  { href: "/docs", title: "Docs", under: ["/docs"] },
  { href: "/components", title: "Components", under: ["/components"] },
  { href: "/showcase", title: "Showcase", under: ["/showcase", ...PAGES.map((page) => page.href)] },
  { href: "/docs/theming", title: "Theming", under: [] },
  { href: "/docs/changelog", title: "Changelog", under: [] },
];

export function SiteHeader() {
  const pathname = usePathname();
  const exact = SECTIONS.find((section) => section.href === pathname);
  const current = exact ?? SECTIONS.find((section) => section.under.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)));
  return (
    <>
      <SkipLink href="#main">Skip to the content</SkipLink>
      <ScrollProgress />
      <div className="sticky top-0 z-40 border-b bg-background">
        <Navbar
          brand={
            <a href="/" className="font-medium tracking-tight">
              Rivier UI
            </a>
          }
          label="Site"
          actions={
            <>
              <Search />
              <ModeSwitch />
            </>
          }
        >
          {SECTIONS.map((section) => (
            <NavbarLink key={section.href} href={section.href} current={section === current}>
              {section.title}
            </NavbarLink>
          ))}
        </Navbar>
      </div>
    </>
  );
}
