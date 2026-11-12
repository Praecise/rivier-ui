import type { Metadata } from "next";
import { Geist_Mono, Instrument_Sans } from "next/font/google";
import type { ReactNode } from "react";
import { ThemeProvider, ThemeScript, type Theme } from "@/components/ui/theme-provider";
import "./globals.css";

const sans = Instrument_Sans({ subsets: ["latin"], variable: "--font-instrument" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "Rivier UI",
  description: "A component library for AI-native development: controls, layout, motion, 3D and charts from one theme.",
};

const defaults: Partial<Theme> = { mode: "system", radius: "sm", accent: "teal" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <ThemeScript defaults={defaults} />
      </head>
      <body>
        <ThemeProvider defaults={defaults}>{children}</ThemeProvider>
      </body>
    </html>
  );
}
