import { ImageResponse } from "next/og";

/**
 * Open Graph / Twitter image generator (next/og + Satori), ported from
 * kinetk-main-website so the demo's social card matches the brand. Renders a
 * 1200×630 card with the knowledge-graph constellation backdrop + Bebas Neue.
 */

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const SITE_NAME = "KINETK";

// Brand palette.
const ACCENT = "#26AEC0";
const BRAND = { cyan: "#00F5FF", teal: "#26AEC0", amber: "#EEB248" };

// Static knowledge-graph constellation, weighted to the right so the headline
// stays readable on the left. Coordinates are in the 1200×630 OG space.
const GRAPH_NODES: Array<{ x: number; y: number; r: number; c: string }> = [
  { x: 980, y: 140, r: 26, c: BRAND.cyan },
  { x: 1140, y: 120, r: 12, c: BRAND.cyan },
  { x: 1090, y: 255, r: 16, c: BRAND.teal },
  { x: 855, y: 225, r: 18, c: BRAND.cyan },
  { x: 1015, y: 360, r: 21, c: BRAND.amber },
  { x: 760, y: 360, r: 22, c: BRAND.cyan },
  { x: 925, y: 475, r: 15, c: BRAND.teal },
  { x: 1130, y: 430, r: 13, c: BRAND.amber },
  { x: 700, y: 200, r: 13, c: BRAND.teal },
  { x: 660, y: 480, r: 14, c: BRAND.amber },
  { x: 845, y: 545, r: 12, c: BRAND.teal },
];

const GRAPH_EDGES: Array<[number, number]> = [
  [0, 3], [0, 2], [0, 1], [3, 5], [3, 8], [5, 9], [5, 6],
  [4, 2], [4, 6], [4, 7], [6, 10], [4, 5], [2, 7], [8, 3], [9, 10],
];

function buildGraphSvg(): string {
  const edges = GRAPH_EDGES.map(([a, b]) => {
    const n1 = GRAPH_NODES[a];
    const n2 = GRAPH_NODES[b];
    return `<line x1="${n1.x}" y1="${n1.y}" x2="${n2.x}" y2="${n2.y}" stroke="${n1.c}" stroke-width="1.4" stroke-opacity="0.3" />`;
  }).join("");

  const nodes = GRAPH_NODES.map((n) =>
    `<circle cx="${n.x}" cy="${n.y}" r="${n.r + 9}" fill="${n.c}" fill-opacity="0.08" />` +
    `<circle cx="${n.x}" cy="${n.y}" r="${n.r}" fill="${n.c}" fill-opacity="0.14" stroke="${n.c}" stroke-width="1.5" />` +
    `<circle cx="${n.x}" cy="${n.y}" r="${n.r * 0.34}" fill="${n.c}" />`,
  ).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">${edges}${nodes}</svg>`;
}

/**
 * Bebas Neue is the brand display font, fetched at render time. If the fetch
 * fails we fall back to the default Satori font so builds never break.
 */
async function loadDisplayFont(): Promise<
  { name: string; data: ArrayBuffer; style: "normal"; weight: 400 }[]
> {
  try {
    const res = await fetch(
      "https://github.com/google/fonts/raw/main/ofl/bebasneue/BebasNeue-Regular.ttf",
    );
    if (!res.ok) return [];
    const data = await res.arrayBuffer();
    return [{ name: "Bebas Neue", data, style: "normal", weight: 400 }];
  } catch {
    return [];
  }
}

export async function renderOgImage({
  title,
  eyebrow,
}: {
  title: string;
  eyebrow?: string;
}) {
  const fonts = await loadDisplayFont();
  const fontFamily = fonts.length ? "Bebas Neue" : "sans-serif";
  const graphUri = `data:image/svg+xml,${encodeURIComponent(buildGraphSvg())}`;

  const len = title.length;
  const titleSize = len > 44 ? 60 : len > 32 ? 78 : 96;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "#0A0A0A",
          fontFamily,
        }}
      >
        {/* Knowledge-graph constellation backdrop (Satori render, not DOM) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt=""
          width={1200}
          height={630}
          src={graphUri}
          style={{ position: "absolute", top: 0, left: 0 }}
        />

        {/* Left-to-right dark gradient so the headline stays legible */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 1200,
            height: 630,
            display: "flex",
            background:
              "linear-gradient(90deg, #0A0A0A 26%, rgba(10,10,10,0.65) 56%, rgba(10,10,10,0.05) 100%)",
          }}
        />

        {/* Content */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            height: "100%",
            padding: "80px",
          }}
        >
          {/* Header row: wordmark + eyebrow */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              width: "100%",
            }}
          >
            <div style={{ fontFamily, fontSize: 40, letterSpacing: 6, color: "#FFFFFF" }}>
              {SITE_NAME}
            </div>
            {eyebrow ? (
              <div
                style={{
                  fontSize: 24,
                  letterSpacing: 4,
                  textTransform: "uppercase",
                  color: ACCENT,
                }}
              >
                {eyebrow}
              </div>
            ) : null}
          </div>

          {/* Headline */}
          <div
            style={{
              display: "flex",
              fontFamily,
              fontSize: titleSize,
              lineHeight: 1.0,
              letterSpacing: 2,
              color: "#FFFFFF",
              maxWidth: "820px",
            }}
          >
            {title}
          </div>

          {/* Accent footer bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 24, width: "100%" }}>
            <div style={{ width: 120, height: 6, background: ACCENT }} />
            <div style={{ fontSize: 28, letterSpacing: 2, color: "#8A8F98" }}>kinetk.ai</div>
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: fonts.length ? fonts : undefined },
  );
}
