import type { Metadata } from "next";
import {
  Bebas_Neue,
  Inter,
  Space_Grotesk,
  JetBrains_Mono,
} from "next/font/google";
import { brandStyle } from "@/config/brand";
import { content } from "@/config/content";
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
  title: content.meta.title,
  description: content.meta.description,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" style={brandStyle}>
      <body
        className={`${inter.variable} ${bebasNeue.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} antialiased min-h-dvh`}
      >
        {children}
      </body>
    </html>
  );
}
