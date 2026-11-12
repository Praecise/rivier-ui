"use client";
// The showcase's theme switches: mode, roundness, highlight colour (named, or any hue).

import { THEME_ACCENTS, THEME_MODES, THEME_RADII, useTheme, type ThemeAccentName } from "@/components/ui/theme-provider";
import { cn } from "@/lib/cn";

const HUES: Record<ThemeAccentName, { hue: number; chroma: number }> = {
  teal: { hue: 200, chroma: 0.105 },
  blue: { hue: 262, chroma: 0.19 },
  violet: { hue: 295, chroma: 0.2 },
  pink: { hue: 355, chroma: 0.2 },
  red: { hue: 27, chroma: 0.2 },
  orange: { hue: 50, chroma: 0.17 },
  amber: { hue: 78, chroma: 0.13 },
  green: { hue: 148, chroma: 0.15 },
  ink: { hue: 0, chroma: 0 },
};

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-2">
      <legend className="mb-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">{label}</legend>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </fieldset>
  );
}

function Choice({ pressed, onPress, children, label }: { pressed: boolean; onPress: () => void; children: React.ReactNode; label?: string }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      onClick={onPress}
      className={cn(
        "inline-flex h-control-sm min-w-10 items-center justify-center rounded-control border px-3 text-sm capitalize transition-colors duration-instant",
        pressed ? "border-primary bg-primary text-primary-foreground" : "border-border-strong bg-background hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}

export function ThemePanel({ className }: { className?: string }) {
  const { theme, setTheme, resetTheme } = useTheme();
  const custom = typeof theme.accent === "string" ? null : theme.accent;

  return (
    <div data-slot="theme-panel" className={cn("grid gap-6 rounded-surface border bg-card p-5 sm:grid-cols-2 lg:grid-cols-[auto_auto_1fr]", className)}>
      <Group label="Mode">
        {THEME_MODES.map((mode) => (
          <Choice key={mode} pressed={theme.mode === mode} onPress={() => setTheme({ mode })}>
            {mode}
          </Choice>
        ))}
      </Group>
      <Group label="Roundness">
        {THEME_RADII.map((radius) => (
          <Choice key={radius} pressed={theme.radius === radius} onPress={() => setTheme({ radius })}>
            {radius}
          </Choice>
        ))}
      </Group>
      <Group label="Highlight">
        {THEME_ACCENTS.map((accent) => (
          <button
            key={accent}
            type="button"
            aria-pressed={theme.accent === accent}
            aria-label={accent}
            title={accent}
            onClick={() => setTheme({ accent })}
            className={cn(
              "size-8 rounded-full border-2 transition-transform duration-instant hover:scale-110 motion-reduce:hover:scale-100",
              theme.accent === accent ? "border-foreground" : "border-transparent",
            )}
            style={{ background: accent === "ink" ? "var(--foreground)" : `oklch(var(--accent-lightness) ${HUES[accent].chroma} ${HUES[accent].hue})` }}
          />
        ))}
        <label className="flex h-8 min-w-48 flex-1 items-center gap-3 text-sm text-muted-foreground">
          <span className="shrink-0">Any hue</span>
          <input
            type="range"
            min={0}
            max={360}
            value={custom?.hue ?? HUES[typeof theme.accent === "string" ? theme.accent : "teal"].hue}
            onChange={(event) => setTheme({ accent: { hue: Number(event.target.value), chroma: custom?.chroma ?? 0.17 } })}
            className="h-2 w-full min-w-0 cursor-pointer appearance-none rounded-full"
            style={{ background: "linear-gradient(to right in oklch longer hue, oklch(0.7 0.17 0), oklch(0.7 0.17 360))" }}
            aria-label="Highlight hue"
          />
        </label>
        <button type="button" onClick={resetTheme} className="h-8 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
          Reset
        </button>
      </Group>
    </div>
  );
}
