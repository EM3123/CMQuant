import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

// One family. design.md is explicit: strictly no sans-serif, one typeface for
// labels, prose, digits and headings alike. This is a terminal, and a terminal
// has one face.
//
// It was three for a while - Geist, then Open Sans, with Cormorant and later
// Source Serif carrying display. A serif masthead over a page of monospace
// numbers reads as a newspaper about a terminal rather than as the terminal.
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CMQuant",
  description:
    "Computational Mathematics. Sixty-second games for mental arithmetic and probability, generated from a seed so anyone can play the run you played.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-surface text-primary">{children}</body>
    </html>
  );
}
