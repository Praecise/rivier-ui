"use client";
// Showcase: reading direction, the shared live region, and type that follows the script.

import { ArrowRight, BadgeCheck } from "lucide-react";
import { useState } from "react";
import { AccessibleIcon } from "@/components/ui/accessible-icon";
import { Button } from "@/components/ui/button";
import { DirectionProvider, directionOf, useDirection } from "@/components/ui/direction-provider";
import { Slider } from "@/components/ui/slider";
import { announce } from "@/lib/announce";
import { Demo } from "./demo";

const LOCALES = ["en-GB", "ar", "he-IL", "dv", "fa-IR", "ja", "az-Arab", "az-Latn"];

function DirectionReadout() {
  const dir = useDirection();
  return <span data-testid="inner-direction">{dir}</span>;
}

export function Foundations() {
  const [count, setCount] = useState(0);
  const outer = useDirection();

  return (
    <div className="grid gap-4 @3xl:grid-cols-2">
      <Demo title="Direction provider">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            This page reads <span data-testid="outer-direction">{outer}</span>. The block below is set the other way round; its slider and its
            arrow follow it.
          </p>
          <DirectionProvider dir={outer === "rtl" ? "ltr" : "rtl"} className="flex flex-col gap-3 rounded-surface border p-4" data-testid="inner">
            <p className="text-sm">
              Inside: <DirectionReadout />
            </p>
            <Slider defaultValue={[20]} max={100} step={10} aria-label="Amount" />
            <Button variant="outline" className="self-start">
              Continue <ArrowRight aria-hidden="true" strokeWidth={1.5} className="rtl:-scale-x-100" />
            </Button>
          </DirectionProvider>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm" aria-label="Direction by language">
            {LOCALES.map((locale) => (
              <li key={locale} className="flex justify-between gap-2">
                <code>{locale}</code>
                <span data-locale={locale}>{directionOf(locale)}</span>
              </li>
            ))}
          </ul>
        </div>
      </Demo>

      <Demo title="Announce">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Pressing the button changes a number elsewhere on the page. Focus does not move, so the change is said through the shared live region.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              onClick={() => {
                const next = count + 1;
                setCount(next);
                announce(`${next} item${next === 1 ? "" : "s"} in the basket`);
              }}
            >
              Add to basket
            </Button>
            <Button variant="ghost" onClick={() => announce("The connection was lost", "assertive")}>
              Lose the connection
            </Button>
          </div>
          <p className="text-sm">
            Basket: <span data-testid="basket">{count}</span>
          </p>
        </div>
      </Demo>

      <Demo title="An icon with a name">
        <p className="flex items-center gap-2 text-sm">
          Rosalind Franklin
          <AccessibleIcon label="Verified">
            <BadgeCheck strokeWidth={1.5} className="size-4" />
          </AccessibleIcon>
        </p>
        <p className="mt-3 text-sm text-muted-foreground">The tick is drawn for the eye and named for a screen reader.</p>
      </Demo>

      <Demo title="Type that follows the script" className="@3xl:col-span-2">
        <div className="grid gap-6 @2xl:grid-cols-3">
          <div lang="en" data-testid="script-en">
            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Latin</p>
            <p className="mt-2 text-3xl leading-tight font-medium tracking-tight">A quiet morning by the water</p>
          </div>
          <div lang="ar" dir="rtl" data-testid="script-ar">
            <p className="text-xs tracking-wider text-muted-foreground">العربية</p>
            <p className="mt-2 text-3xl leading-tight font-medium tracking-tight">صباحٌ هادئٌ على ضفّة الماء</p>
          </div>
          <div lang="ja" data-testid="script-ja">
            <p className="text-xs tracking-wider text-muted-foreground">日本語</p>
            <p className="mt-2 text-3xl leading-tight font-medium tracking-tight">水辺の静かな朝のひととき</p>
          </div>
        </div>
      </Demo>
    </div>
  );
}
