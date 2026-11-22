"use client";
// Site: search. A button in the header and Ctrl or Cmd with K open a palette of every page and component.

import { Search as SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Kbd, KbdGroup } from "@/components/ui/kbd";

export type SearchEntry = { href: string; title: string; description: string; group: string };

export function Search() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<SearchEntry[] | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const asked = useRef(false);

  const show = (): void => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setOpen(true);
    if (asked.current) return;
    asked.current = true;
    fetch("/search.json")
      .then((answer) => answer.json() as Promise<SearchEntry[]>)
      .then(setEntries)
      .catch(() => {
        asked.current = false;
        setEntries([]);
      });
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key.toLowerCase() !== "k" || !(event.metaKey || event.ctrlKey) || event.altKey) return;
      event.preventDefault();
      show();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /** A name that is what was typed comes first, then names that begin with it, then names and descriptions that hold every word. */
  const rank = (value: string, typed: string): number => {
    const [name = "", about = ""] = value.toLowerCase().split(" · ");
    const wanted = typed.trim().toLowerCase();
    if (!wanted) return 1;
    if (name === wanted) return 1;
    if (name.startsWith(wanted)) return 0.9;
    if (name.includes(wanted)) return 0.7;
    return wanted.split(/\s+/).every((word) => name.includes(word) || about.includes(word)) ? 0.3 : 0;
  };

  const groups = [...new Set((entries ?? []).map((entry) => entry.group))];
  const go = (href: string): void => {
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      <Button type="button" data-slot="search-button" variant="outline" size="sm" onClick={show} className="gap-3 text-muted-foreground" aria-keyshortcuts="Control+K Meta+K">
        <SearchIcon aria-hidden="true" strokeWidth={1.5} />
        <span className="sr-only sm:not-sr-only">Search</span>
        <KbdGroup className="hidden sm:inline-flex" aria-hidden="true">
          <Kbd>Ctrl</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search Rivier UI"
        description="Pages and components"
        commandProps={{ filter: rank }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          opener.current?.focus();
        }}
      >
        <CommandInput placeholder="Search pages and components" />
        <CommandList>
          <CommandEmpty>{entries === null ? "Loading." : "Nothing by that name."}</CommandEmpty>
          {groups.map((group) => (
            <CommandGroup key={group} heading={group}>
              {(entries ?? [])
                .filter((entry) => entry.group === group)
                .map((entry) => (
                  <CommandItem key={entry.href} value={`${entry.title} · ${entry.description}`} onSelect={() => go(entry.href)}>
                    <span className="flex min-w-0 flex-col">
                      <span className="font-medium">{entry.title}</span>
                      <span className="truncate text-xs text-muted-foreground">{entry.description}</span>
                    </span>
                  </CommandItem>
                ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
