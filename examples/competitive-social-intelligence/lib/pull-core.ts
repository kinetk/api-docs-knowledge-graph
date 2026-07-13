import type {
  EntityData,
  Narrative,
  Platform,
  Subject,
  TopPost,
  WhitespaceTag,
} from "./types";

const ENGAGEMENT_WEIGHTS = {
  views: 1,
  likes: 3,
  comments: 5,
  shares: 8,
} as const;

const DAY_MS = 24 * 60 * 60 * 1000;
const KNOWN_PLATFORMS: Platform[] = [
  "tiktok",
  "instagram",
  "x",
  "reddit",
  "pinterest",
];
const MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");

const MAX_NARRATIVES = 5;
const MAX_WHITESPACE = 5;
const MAX_POSTS = 3;

interface RawPost {
  platform?: unknown;
  description?: unknown;
  publishedAt?: unknown;
  viewCount?: unknown;
  likeCount?: unknown;
  commentCount?: unknown;
  shareCount?: unknown;
}

export interface InsightsResultRaw {
  content?: RawPost[];
  narratives?: unknown[];
  tagSignals?: unknown[];
  recordCount?: number;
}

const num = (v: unknown): number =>
  Number.isFinite(Number(v)) ? Number(v) : 0;

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toPlatform(v: unknown): Platform | null {
  const p = String(v ?? "").toLowerCase();
  return (KNOWN_PLATFORMS as string[]).includes(p) ? (p as Platform) : null;
}

function cleanCaption(v: unknown): string {
  const s = String(v ?? "")
    .replace(/\s+/g, " ")
    .trim();
  return s.length > 200 ? `${s.slice(0, 197)}...` : s;
}

function fmtDate(ms: number): string {
  const d = new Date(ms);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

function fmtRange(startMs: number, endMs: number): string {
  const a = new Date(startMs);
  const b = new Date(endMs);
  if (a.getUTCMonth() === b.getUTCMonth()) {
    return `${MONTHS[a.getUTCMonth()]} ${a.getUTCDate()}-${b.getUTCDate()}`;
  }
  return `${fmtDate(startMs)}-${fmtDate(endMs)}`;
}

export interface WeekBuckets {
  boundaries: number[];
  labels: string[];
}

export function computeWeekBuckets(
  window: "7d" | "30d" | "all",
  generatedAtMs: number,
  allContent: RawPost[],
  n = 5,
): WeekBuckets {
  let start: number;
  let end: number;
  if (window === "all") {
    const ts = allContent
      .map((c) => Date.parse(String(c.publishedAt ?? "")))
      .filter((t) => Number.isFinite(t));
    if (ts.length > 0) {
      start = Math.min(...ts);
      end = Math.max(...ts);
    } else {
      end = generatedAtMs;
      start = end - 30 * DAY_MS;
    }
  } else {
    end = generatedAtMs;
    start = end - (window === "7d" ? 7 : 30) * DAY_MS;
  }
  const step = Math.max((end - start) / n, 1);
  const boundaries = Array.from({ length: n + 1 }, (_, i) => start + i * step);
  const labels = Array.from({ length: n }, (_, i) =>
    fmtRange(boundaries[i], boundaries[i + 1] - DAY_MS),
  );
  return { boundaries, labels };
}

function toNarrative(v: unknown): Narrative | null {
  if (typeof v !== "object" || v === null) return null;
  const { label, summary, contentCount } = v as Record<string, unknown>;
  if (typeof label !== "string" || typeof summary !== "string") return null;
  return { label, description: summary, count: num(contentCount) };
}

function toRankedTag(v: unknown): (WhitespaceTag & { score: number }) | null {
  if (typeof v !== "object" || v === null) return null;
  const { tag, engagementPremiumPct, whitespaceScore } = v as Record<
    string,
    unknown
  >;
  if (typeof tag !== "string") return null;
  return {
    tag,
    premiumPct: Math.round(num(engagementPremiumPct) * 10) / 10,
    score: num(whitespaceScore),
  };
}

export function shapeEntity(
  subject: Subject,
  result: InsightsResultRaw,
  weeks: WeekBuckets,
): EntityData {
  const name = subject.name ?? subject.query;
  const content = Array.isArray(result.content) ? result.content : [];

  let views = 0;
  let likes = 0;
  let comments = 0;
  let shares = 0;
  const platforms: Record<Platform, number> = {
    tiktok: 0,
    instagram: 0,
    x: 0,
    reddit: 0,
    pinterest: 0,
  };
  const n = weeks.labels.length;
  const weekly = new Array<number>(n).fill(0);
  const step = weeks.boundaries[1] - weeks.boundaries[0];

  for (const c of content) {
    const v = num(c.viewCount);
    const l = num(c.likeCount);
    const cm = num(c.commentCount);
    const sh = num(c.shareCount);
    views += v;
    likes += l;
    comments += cm;
    shares += sh;

    const p = toPlatform(c.platform);
    if (p) platforms[p] += 1;

    const t = Date.parse(String(c.publishedAt ?? ""));
    if (Number.isFinite(t)) {
      const idx = Math.floor((t - weeks.boundaries[0]) / step);
      if (idx >= 0 && idx < n) {
        weekly[idx] +=
          v * ENGAGEMENT_WEIGHTS.views +
          l * ENGAGEMENT_WEIGHTS.likes +
          cm * ENGAGEMENT_WEIGHTS.comments +
          sh * ENGAGEMENT_WEIGHTS.shares;
      }
    }
  }

  const narratives = (result.narratives ?? [])
    .map(toNarrative)
    .filter((x): x is Narrative => x !== null)
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_NARRATIVES);

  const whitespace = (result.tagSignals ?? [])
    .map(toRankedTag)
    .filter((x): x is WhitespaceTag & { score: number } => x !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_WHITESPACE)
    .map(({ tag, premiumPct }) => ({ tag, premiumPct }));

  const posts: TopPost[] = content
    .map((c) => {
      const platform = toPlatform(c.platform);
      const description = cleanCaption(c.description);
      if (!platform || !description) return null;
      return {
        platform,
        description,
        views: num(c.viewCount),
        likes: num(c.likeCount),
      };
    })
    .filter((p): p is TopPost => p !== null)
    .sort((a, b) => b.views - a.views)
    .slice(0, MAX_POSTS);

  return {
    id: slugify(name),
    name,
    color: subject.color,
    query: subject.query,
    metrics: {
      records: num(result.recordCount) || content.length,
      views,
      likes,
      comments,
      shares,
    },
    platforms,
    weekly: weekly.map((w) => Math.round(w)),
    narratives,
    whitespace,
    posts,
  };
}
