"use client";
// Showcase: the page header, with scroll progress under it. On the overview it links to the sections of
// that page; on a component page it links to the component pages.

import { usePathname } from "next/navigation";
import { Navbar, NavbarLink } from "@/components/ui/navbar";
import { ScrollProgress } from "@/components/motion/scroll-progress";
import { PAGES } from "./pages";

const SECTIONS = [
  ["Controls", "#controls"],
  ["Overlays", "#overlays"],
  ["Display", "#display"],
  ["Layout", "#layout"],
  ["Motion", "#motion"],
  ["3D", "#three"],
  ["Charts", "#charts"],
  ["More", "#more"],
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const overview = pathname === "/";
  return (
    <>
      <ScrollProgress />
      <div className="sticky top-0 z-40 border-b bg-background">
        <Navbar brand={<a href="/" className="font-medium tracking-tight">Rivier UI</a>} label={overview ? "Sections" : "Component pages"}>
          {overview
            ? SECTIONS.map(([label, href]) => (
                <NavbarLink key={href} href={href}>
                  {label}
                </NavbarLink>
              ))
            : PAGES.map((page) => (
                <NavbarLink key={page.href} href={page.href} current={pathname === page.href} className="px-2">
                  {page.title.split(" ")[0]}
                </NavbarLink>
              ))}
        </Navbar>
      </div>
    </>
  );
}
