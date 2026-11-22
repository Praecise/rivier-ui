"use client";
// Site: the opening of the landing page shows the library itself, working: a few components side by side.

import { Bold, Italic, Underline } from "lucide-react";
import { useState } from "react";
import { Orb } from "@/components/three/orb";
import { Scene } from "@/components/three/scene";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OtpInput } from "@/components/ui/otp-input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toolbar, ToolbarButton, ToolbarSeparator, ToolbarToggleGroup, ToolbarToggleItem } from "@/components/ui/toolbar";

const cell = "flex min-w-0 flex-col gap-3 rounded-surface border bg-card p-4";
const label = "font-mono text-xs uppercase tracking-wider text-muted-foreground";

export function Collage() {
  const [styles, setStyles] = useState<string[]>(["bold"]);
  return (
    <div data-slot="collage" className="grid min-w-0 gap-3 sm:grid-cols-2">
      <div className={`${cell} sm:row-span-2`}>
        <p className={label}>3D, in the highlight colour</p>
        <Scene aspect={1} className="w-full" label="A slowly morphing sphere in the highlight colour">
          <Orb />
        </Scene>
      </div>
      <div className={cell}>
        <p className={label}>Buttons</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm">Save</Button>
          <Button size="sm" variant="outline">
            Preview
          </Button>
          <Button size="sm" variant="soft">
            Share
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>New</Badge>
          <Badge variant="soft">Beta</Badge>
          <Badge variant="success" dot>
            Live
          </Badge>
        </div>
      </div>
      <div className={cell}>
        <p className={label}>A one-time code</p>
        <OtpInput length={4} aria-label="Example code" defaultValue="48" />
      </div>
      <div className={`${cell} sm:col-span-2`}>
        <p className={label}>A toolbar and tabs</p>
        <Toolbar aria-label="Formatting">
          <ToolbarToggleGroup type="multiple" aria-label="Text style" value={styles} onValueChange={setStyles}>
            <ToolbarToggleItem value="bold" aria-label="Bold">
              <Bold aria-hidden="true" strokeWidth={1.5} />
            </ToolbarToggleItem>
            <ToolbarToggleItem value="italic" aria-label="Italic">
              <Italic aria-hidden="true" strokeWidth={1.5} />
            </ToolbarToggleItem>
            <ToolbarToggleItem value="underline" aria-label="Underline">
              <Underline aria-hidden="true" strokeWidth={1.5} />
            </ToolbarToggleItem>
          </ToolbarToggleGroup>
          <ToolbarSeparator />
          <ToolbarButton className="ms-auto">Publish</ToolbarButton>
        </Toolbar>
        <Tabs defaultValue="month">
          <TabsList variant="pill" aria-label="Billing period">
            <TabsTrigger value="month">Monthly</TabsTrigger>
            <TabsTrigger value="year">Yearly</TabsTrigger>
          </TabsList>
          <TabsContent value="month" className="text-sm text-muted-foreground">
            Billed every month.
          </TabsContent>
          <TabsContent value="year" className="text-sm text-muted-foreground">
            Billed once a year.
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
