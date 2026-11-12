"use client";
// Showcase: the page header, with scroll progress under it.

import { Navbar, NavbarLink } from "@/components/ui/navbar";
import { ScrollProgress } from "@/components/motion/scroll-progress";

const LINKS = [
  ["Controls", "#controls"],
  ["Overlays", "#overlays"],
  ["Display", "#display"],
  ["Layout", "#layout"],
  ["Motion", "#motion"],
  ["3D", "#three"],
  ["Charts", "#charts"],
] as const;

export function SiteHeader() {
  return (
    <>
      <ScrollProgress />
      <div className="sticky top-0 z-40 border-b bg-background">
        <Navbar brand={<a href="#" className="font-medium tracking-tight">Rivier UI</a>} label="Sections">
          {LINKS.map(([label, href]) => (
            <NavbarLink key={href} href={href}>
              {label}
            </NavbarLink>
          ))}
        </Navbar>
      </div>
    </>
  );
}
