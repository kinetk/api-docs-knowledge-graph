import type { Metadata } from "next";
import { Bebas_Neue, Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-inter",
});

const bebasNeue = Bebas_Neue({
  weight: ["400"],
  subsets: ["latin"],
  variable: "--font-bebasNeue",
});

// Editorial voice — headlines + subheads (KINETK brand guide §04).
const spaceGrotesk = Space_Grotesk({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-spaceGrotesk",
});

// Infrastructure voice — code, labels, counters, [bracketed] accents.
const jetbrainsMono = JetBrains_Mono({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-jetbrainsMono",
});

export const metadata: Metadata = {
  title: "Growth Demo — KINETK API + MCP showcase",
  description:
    "Pass a product and watch an AI agent pull the live market signal from the KINETK IP Graph (the insights job), then have Gemini synthesize a grounded launch & growth plan.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${bebasNeue.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} antialiased min-h-dvh`}
      >
        {children}
      </body>
    </html>
  );
}
