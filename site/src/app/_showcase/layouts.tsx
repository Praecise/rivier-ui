// Showcase: layout components, with the bento grid first.

import { Badge } from "@/components/ui/badge";
import { BentoCell, BentoCellDescription, BentoCellHeader, BentoCellTitle, BentoGrid } from "@/components/layout/bento-grid";
import { Grid } from "@/components/layout/grid";
import { Marquee } from "@/components/layout/marquee";
import { Split, SplitContent, SplitMedia } from "@/components/layout/split";
import { Stack } from "@/components/layout/stack";
import { Demo } from "./demo";

const WORDS = ["Controls", "Bento grids", "Motion", "Transitions", "3D", "Charts", "Themes", "Dark mode"];

export function Layouts() {
  return (
    <div className="grid gap-4">
      <Demo title="Bento grid">
        <BentoGrid columns={4}>
          <BentoCell span={2} rowSpan={2} interactive>
            <BentoCellHeader>
              <BentoCellTitle>One theme</BentoCellTitle>
              <BentoCellDescription>Mode, roundness and highlight colour reach every cell.</BentoCellDescription>
            </BentoCellHeader>
            <div className="m-5 mt-auto h-24 rounded-control bg-highlight-soft" aria-hidden="true" />
          </BentoCell>
          <BentoCell interactive>
            <BentoCellHeader>
              <BentoCellTitle>Copied in</BentoCellTitle>
              <BentoCellDescription>The source is yours.</BentoCellDescription>
            </BentoCellHeader>
          </BentoCell>
          <BentoCell interactive>
            <BentoCellHeader>
              <BentoCellTitle>Accessible</BentoCellTitle>
              <BentoCellDescription>Behaviour from Radix.</BentoCellDescription>
            </BentoCellHeader>
          </BentoCell>
          <BentoCell span={2} interactive>
            <BentoCellHeader>
              <BentoCellTitle>Any width</BentoCellTitle>
              <BentoCellDescription>The grid follows its container, not the screen: one column, then two, then four.</BentoCellDescription>
            </BentoCellHeader>
          </BentoCell>
        </BentoGrid>
      </Demo>

      <Demo title="Marquee" bodyClassName="px-0">
        <Marquee fade speed="slow">
          {WORDS.map((word) => (
            <Badge key={word} variant="outline" className="text-sm">
              {word}
            </Badge>
          ))}
        </Marquee>
      </Demo>

      <div className="grid gap-4 @3xl:grid-cols-2">
        <Demo title="Split">
          <Split ratio="1:1" gap="md">
            <SplitMedia>
              <div className="aspect-video rounded-surface bg-muted" aria-hidden="true" />
            </SplitMedia>
            <SplitContent>
              <p className="font-medium">Media beside text</p>
              <p className="mt-1 text-sm text-muted-foreground">Stacks when its container is narrow.</p>
            </SplitContent>
          </Split>
        </Demo>
        <Demo title="Grid and stack">
          <Stack gap="md">
            <Grid min="7rem" gap="sm">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="flex h-14 items-center justify-center rounded-control bg-muted text-sm text-muted-foreground">
                  {n}
                </div>
              ))}
            </Grid>
            <p className="text-sm text-muted-foreground">As many columns as fit, each at least 7rem wide.</p>
          </Stack>
        </Demo>
      </div>
    </div>
  );
}
