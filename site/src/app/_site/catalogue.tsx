"use client";
// Site: every component, by group, with a field that narrows the list as you type.

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { announce } from "@/lib/announce";

export type CatalogueGroup = { id: string; title: string; description: string; items: { name: string; description: string }[] };

export function Catalogue({ groups }: { groups: CatalogueGroup[] }) {
  const [query, setQuery] = useState("");
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = groups
    .map((group) => ({ ...group, items: group.items.filter((entry) => words.every((word) => `${entry.name} ${entry.description}`.toLowerCase().includes(word))) }))
    .filter((group) => group.items.length > 0);
  const count = shown.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <div className="mt-8">
      <div className="flex max-w-xl flex-col gap-2">
        <label htmlFor="catalogue-filter" className="text-sm font-medium">
          Find a component
        </label>
        <Input
          id="catalogue-filter"
          type="search"
          value={query}
          placeholder="dialog, date, chart, upload…"
          autoComplete="off"
          onChange={(event) => {
            const next = event.target.value;
            setQuery(next);
            const terms = next.toLowerCase().split(/\s+/).filter(Boolean);
            const found = groups.reduce((sum, group) => sum + group.items.filter((entry) => terms.every((word) => `${entry.name} ${entry.description}`.toLowerCase().includes(word))).length, 0);
            announce(found === 1 ? "1 component" : `${found} components`);
          }}
        />
        <p data-testid="catalogue-count" className="text-sm text-muted-foreground">
          {count === 1 ? "1 component" : `${count} components`}
        </p>
      </div>
      {shown.length === 0 ? <p className="mt-10 text-muted-foreground">Nothing by that name. Try a word for what it does.</p> : null}
      {shown.map((group) => (
        <section key={group.id} id={group.id} aria-labelledby={`${group.id}-title`} className="mt-12 scroll-mt-24">
          <h2 id={`${group.id}-title`} className="text-xl font-medium tracking-tight">
            {group.title}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{group.description}</p>
          <ul className="mt-5 grid gap-3 @xl:grid-cols-2 @4xl:grid-cols-3">
            {group.items.map((entry) => (
              <li key={entry.name} className="flex">
                <a
                  href={`/components/${entry.name}`}
                  className="flex w-full flex-col gap-1 rounded-surface border bg-card p-4 transition-colors duration-instant ease-out hover:bg-accent motion-reduce:transition-none"
                >
                  <span className="font-mono text-sm font-medium">{entry.name}</span>
                  <span className="line-clamp-2 text-sm text-muted-foreground">{entry.description}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
