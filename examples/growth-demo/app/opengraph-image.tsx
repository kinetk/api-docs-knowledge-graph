import { renderOgImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

// Next.js auto-wires this file as og:image / twitter:image for the route.
export const alt =
  "KINETK Growth Demo — watch an AI agent build a go-to-market strategy from the live social web";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return renderOgImage({
    eyebrow: "Growth Demo",
    title: "Watch an agent build a go-to-market strategy.",
  });
}
