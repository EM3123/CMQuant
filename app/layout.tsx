import type { Metadata } from "next";
import { Geist, JetBrains_Mono, Cormorant_Garamond } from "next/font/google";
import "./globals.css";

// Three families, and only three. Geist carries every piece of UI text in both
// wings, JetBrains Mono carries every digit anywhere on the site, and Cormorant
// exists solely so the poker room does not sound like the workbench. A fourth
// family is a bug.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  weight: ["300", "400", "600"],
  style: ["normal", "italic"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CMQuant",
  description:
    "Computational Mathematics. Short, timed, procedurally generated games for mental math, probability and decision-making.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${jetbrainsMono.variable} ${cormorant.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-surface text-primary">{children}</body>
    </html>
  );
}
