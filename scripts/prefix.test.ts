// What the prefix writer finds, leaves alone, and reports. Run with `npm run unit`.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { isUtility, looksLikeClassList, prefixClasses, prefixMerge, prefixTheme, unprefixed } from "./prefix.ts";
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

test("one utility in a map or chosen by a condition is found when its value is a real one", () => {
  assert.equal(tw(`const TONE = { good: "text-success", bad: "text-destructive", none: "" };`), `const TONE = { good: "tw:text-success", bad: "tw:text-destructive", none: "" };`);
  assert.equal(tw(`const edge = side === "top" ? "top-2" : "bottom-2";`), `const edge = side === "top" ? "tw:top-2" : "tw:bottom-2";`);
  assert.equal(tw(`const SIZES = { sm: "size-4", md: "size-6" } as const;`), `const SIZES = { sm: "tw:size-4", md: "tw:size-6" } as const;`);
  assert.equal(tw(`{ fill: "fill-chart-1", stroke: "stroke-chart-1" }`), `{ fill: "tw:fill-chart-1", stroke: "tw:stroke-chart-1" }`);
  for (const option of [`position?: "top-start" | "top-end";`, `side = "bottom"`, `align: "start"`, `type: "text-reveal"`]) assert.equal(tw(option), option);
  assert.equal(isUtility("hover:bg-accent"), true);
  assert.equal(isUtility("top-start"), false);
});

test("a class that is a mark keeps its name: a highlighter's, and one a selector in the file names", () => {
  assert.equal(tw("<code className={language ? `language-${language}` : undefined} />"), "<code className={language ? `language-${language}` : undefined} />");
  assert.equal(tw(`<div className="toaster group [.toaster_&]:p-2" />`), `<div className="toaster tw:group tw:[.toaster_&]:p-2" />`);
  assert.equal(tw(`const INVERSE = "bg-background [.dark_&]:bg-card";`), `const INVERSE = "tw:bg-background tw:[.dark_&]:bg-card";`);
});

test("a class that reads one of Tailwind's own variables reads the prefixed one", () => {
  assert.equal(tw(`<i className="ps-[calc(var(--spacing)*3)] rounded-[calc(var(--radius-control)-2px)] h-(--control-h) text-[var(--radius-control-override)]" />`),
    `<i className="tw:ps-[calc(var(--tw-spacing)*3)] tw:rounded-[calc(var(--tw-radius-control)-2px)] tw:h-(--control-h) tw:text-[var(--radius-control-override)]" />`);
});

test("the theme's rules by language name Tailwind's variables with the prefix; what is inside @theme is left", () => {
  const css = `:root {\n  --radius: 4px;\n}\n@theme inline {\n  --text-huge: 4rem;\n  --color-card: var(--card);\n}\n:lang(ar) {\n  --tracking-tight: 0em;\n  --leading-tight: 1.5;\n  --text-3xl--line-height: 1.45;\n}`;
  assert.equal(prefixTheme(css, "tw"), `:root {\n  --radius: 4px;\n}\n@theme inline {\n  --text-huge: 4rem;\n  --color-card: var(--card);\n}\n:lang(ar) {\n  --tw-tracking-tight: 0em;\n  --tw-leading-tight: 1.5;\n  --tw-text-3xl--line-height: 1.45;\n}`);
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
