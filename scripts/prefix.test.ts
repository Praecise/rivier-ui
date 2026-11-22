// What the prefix writer finds, leaves alone, and reports. Run with `npm run unit`.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { looksLikeClassList, prefixClasses, prefixMerge, unprefixed } from "./prefix.ts";
import { libraryDir } from "./registry.ts";

const tw = (source: string): string => prefixClasses(source, "tw");

test("classes in a className are prefixed, one or many, variants and all", () => {
  assert.equal(tw(`<div className="flex" />`), `<div className="tw:flex" />`);
  assert.equal(tw(`<div className="hover:bg-accent [&_svg]:size-4 -mt-1" />`), `<div className="tw:hover:bg-accent tw:[&_svg]:size-4 tw:-mt-1" />`);
  assert.equal(tw(`<div className={cn("p-0", wide ? "w-full" : "w-auto", className)} />`), `<div className={cn("tw:p-0", wide ? "tw:w-full" : "tw:w-auto", className)} />`);
});

test("a class list kept in a constant or chosen by a condition is found by its shape", () => {
  assert.equal(tw(`const nav = "absolute top-3 z-10 inline-flex";`), `const nav = "tw:absolute tw:top-3 tw:z-10 tw:inline-flex";`);
  assert.equal(tw(`const size = big ? "size-9 pointer-coarse:size-10" : "size-6 text-xs";`), `const size = big ? "tw:size-9 tw:pointer-coarse:size-10" : "tw:size-6 tw:text-xs";`);
  assert.equal(tw(`const TONE = { good: "bg-success text-success-foreground" };`), `const TONE = { good: "tw:bg-success tw:text-success-foreground" };`);
});

test("cva: the base, the variants and a compound variant's class; never the names of variants", () => {
  const source = `cva("inline-flex gap-2", {
  variants: { variant: { solid: "bg-primary", link: "underline" } },
  compoundVariants: [{ variant: "link", class: "h-auto px-0" }, { variant: "solid", className: "px-3" }],
  defaultVariants: { variant: "solid", size: "md" },
})`;
  assert.equal(tw(source), `cva("tw:inline-flex tw:gap-2", {
  variants: { variant: { solid: "tw:bg-primary", link: "tw:underline" } },
  compoundVariants: [{ variant: "link", class: "tw:h-auto tw:px-0" }, { variant: "solid", className: "tw:px-3" }],
  defaultVariants: { variant: "solid", size: "md" },
})`);
});

test("what is not a class is left alone", () => {
  for (const source of [
    `import { cn } from "@/lib/cn";`,
    `<button data-slot="date-picker-open" aria-label="Open calendar" type="button" />`,
    `cn(buttonVariants({ variant: "outline", size: "icon" }))`,
    `cn(side === "top" && other)`,
    `root.querySelector('[data-day][tabindex="0"]')`,
    `root.querySelector(\`[data-month="\${month}"] [data-day="\${day}"]\`)`,
    `const labels = { rangeStart: "start of the range", close: "Close the dialog" };`,
    `// className="flex gap-2" in a comment`,
    `/** @example <Button className="w-full flex" /> */`,
    `style={{ transition: "transform 200ms ease-out" }}`,
    `const props = { "aria-label": label, "data-state": state };`,
  ]) assert.equal(tw(source), source, source);
  assert.equal(tw(`cn(side === "top" && "mb-2")`), `cn(side === "top" && "tw:mb-2")`);
});

test("a template keeps what it interpolates", () => {
  assert.equal(tw("<div className={`flex ${gap} w-[${width}px]`} />"), "<div className={`tw:flex ${gap} tw:w-[${width}px]`} />");
});

test("prefixing twice changes nothing more", () => {
  const once = tw(`<div className={cn("flex gap-2", on && "font-medium")} />`);
  assert.equal(tw(once), once);
});

test("cn is told the prefix", () => {
  assert.match(prefixMerge(`const merge = extendTailwindMerge({\n  extend: {} });`, "tw"), /extendTailwindMerge\(\{\n {2}prefix: "tw",\n {2}extend/);
});

test("a phrase is not a class list", () => {
  assert.equal(looksLikeClassList("absolute top-3 z-10"), true);
  assert.equal(looksLikeClassList("start of the range"), false);
  assert.equal(looksLikeClassList("date-picker-trigger"), false);
  assert.equal(looksLikeClassList("width height"), false);
});

test("every component in the library is prefixed whole: nothing that looks like a class list is left without it", () => {
  const left: string[] = [];
  for (const category of ["ui", "layout", "motion", "three", "viz"]) {
    const dir = join(libraryDir, "registry", category);
    for (const file of readdirSync(dir).filter((name) => name.endsWith(".tsx"))) {
      const source = readFileSync(join(dir, file), "utf8");
      const out = tw(source);
      assert.equal(tw(out), out, `${category}/${file} is stable`);
      assert.ok(!/(data-slot|role|type|id|name|href)="tw:/.test(out), `${category}/${file}: an attribute was prefixed`);
      for (const missed of unprefixed(out, "tw")) left.push(`${category}/${file}:${missed}`);
    }
  }
  assert.deepEqual(left, []);
});
