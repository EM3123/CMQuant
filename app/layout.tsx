import type { Metadata } from "next";
import { Open_Sans, JetBrains_Mono, Source_Serif_4 } from "next/font/google";
import "./globals.css";

// Three families, and only three. A fourth is a bug.
//
// Open Sans and Source Serif are the pair Carnegie Mellon publishes as its own
// typefaces, and both are open-licensed - Open Sans under Apache 2.0, Source
// Serif under the SIL Open Font License - so using them is a typography
// decision and not a claim on anybody's brand. They are also simply the better
// pairing for this: a humanist sans that survives being set at ten pixels next
// to a serif with enough range to be a light neon sign in one room and a
// bold broadsheet headline in the other.
//
// The old set was Geist, JetBrains Mono and Cormorant Garamond. Cormorant is
// gone because Source Serif covers the display job in both wings, and one face
// doing two jobs beats two faces doing one each.
const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
});

// Digits only. Never body text.
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

// The display face. Italics are loaded because the poker room uses them.
const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  style: ["normal", "italic"],
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
      className={`${openSans.variable} ${jetbrainsMono.variable} ${sourceSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-surface text-primary">{children}</body>
    </html>
  );
}
