/**
 * @name section
 * @category layout
 * @description A band of a page with consistent vertical rhythm, an optional eyebrow, title and description, and three tones: default, muted, inverse.
 * @when Every top-level block of a marketing or content page. "inverse" makes a dark band on a light page and re-themes everything inside it. Inside an app screen use stack and card instead.
 * @example
 * <Section eyebrow="Features" title="Everything in one place" description="Built on the same tokens.">
 *   <BentoGrid>…</BentoGrid>
 * </Section>
 * <Section tone="inverse" align="center" title="Ready to start?">
 *   <Button>Get in touch</Button>
 * </Section>
 * <Section tone="muted" spacing="sm" container="narrow">Plain content, no header.</Section>
 */
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Container, type ContainerProps } from "@/components/layout/container";

/*
 * Inverse sets data-theme="dark" on the section, which is how the theme scopes dark to part of a page: the
 * theme works its tokens out again on any element that carries data-theme, so everything inside re-themes.
 * When the page is already dark the band is the card colour, so it still reads as a band.
 */
const INVERSE = "bg-background text-foreground [.dark_&]:bg-card [[data-theme=dark]_&]:bg-card";

export const sectionVariants = cva("w-full", {
  variants: {
    tone: {
      default: "bg-background text-foreground",
      muted: "bg-muted text-foreground",
      inverse: INVERSE,
    },
    spacing: {
      none: "",
      sm: "py-10 md:py-14",
      md: "py-16 md:py-24",
      lg: "py-20 md:py-32",
    },
  },
  defaultVariants: { tone: "default", spacing: "md" },
});

export type SectionProps = Omit<ComponentProps<"section">, "title"> &
  VariantProps<typeof sectionVariants> & {
    /** A short line above the title. */
    eyebrow?: ReactNode;
    /** The section's heading, rendered as an h2. */
    title?: ReactNode;
    description?: ReactNode;
    /** Where the header sits. Defaults to "start". */
    align?: "start" | "center";
    /** The width of the inner container, or `false` to place children edge to edge. Defaults to "page". */
    container?: ContainerProps["size"] | false;
  };

export function Section({ className, tone, spacing, eyebrow, title, description, align = "start", container = "page", children, ...props }: SectionProps) {
  const kind = tone ?? "default";
  const header =
    eyebrow || title || description ? (
      <header data-slot="section-header" className={cn("mb-10 flex max-w-2xl flex-col gap-3 md:mb-14", align === "center" && "mx-auto items-center text-center")}>
        {eyebrow ? (
          <p data-slot="section-eyebrow" className="text-sm font-medium text-muted-foreground">
            {eyebrow}
          </p>
        ) : null}
        {title ? (
          <h2 data-slot="section-title" className="text-3xl leading-tight font-medium tracking-tight text-balance md:text-4xl">
            {title}
          </h2>
        ) : null}
        {description ? (
          <p data-slot="section-description" className="text-base text-pretty text-muted-foreground md:text-lg">
            {description}
          </p>
        ) : null}
      </header>
    ) : null;

  return (
    <section
      data-slot="section"
      data-tone={kind}
      data-theme={kind === "inverse" ? "dark" : undefined}
      className={cn(sectionVariants({ tone: kind, spacing }), className)}
      {...props}
    >
      {container === false ? (
        <>
          {header ? <Container>{header}</Container> : null}
          {children}
        </>
      ) : (
        <Container size={container}>
          {header}
          {children}
        </Container>
      )}
    </section>
  );
}
