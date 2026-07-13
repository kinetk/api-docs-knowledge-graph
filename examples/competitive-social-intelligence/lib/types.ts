export type Platform = "tiktok" | "instagram" | "x" | "reddit" | "pinterest";

export interface EntityMetrics {
  records: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
}

export interface Narrative {
  label: string;
  description: string;
  count: number;
}

export interface WhitespaceTag {
  tag: string;
  premiumPct: number;
}

export interface TopPost {
  platform: Platform;
  description: string;
  views: number;
  likes: number;
}

export interface Playbook {
  headline: string;
  drivers: string[];
  counters: string[];
  caveat: string | null;
}

export interface Entity {
  id: string;
  name: string;
  color: string;
  query?: string;
  metrics: EntityMetrics;
  platforms: Record<Platform, number>;
  weekly: number[];
  narratives: Narrative[];
  whitespace: WhitespaceTag[];
  posts: TopPost[];
  playbook: Playbook;
}

export interface InsightsResult {
  narratives: Narrative[];
  whitespace: WhitespaceTag[];
}

export type InsightsJobState =
  | { status: "running" }
  | { status: "succeeded"; result: InsightsResult }
  | { status: "failed" };

export interface Subject {
  query: string;
  name?: string;
  color: string;
}

export type EntityData = Omit<Entity, "playbook">;

export interface Dataset {
  topic: string;
  generatedAt: string;
  window: "7d" | "30d" | "all";
  weekLabels: string[];
  entities: EntityData[];
}

export interface SectionCopy {
  num: string;
  kicker: string;
  title: string;
  note: string;
}

export interface TopicContent {
  masthead: {
    eyebrow: string;
    headline: { lead: string; emphasis: string; trail: string };
    description: string;
  };
  sections: {
    shareOfVoice: SectionCopy;
    position: SectionCopy;
    weeklyPulse: SectionCopy;
    playbook: SectionCopy;
    summaryMetrics: SectionCopy;
    narratives: SectionCopy;
  };
  footer: string;
  playbooks: Record<string, Playbook>;
}

export type BaseContent = Omit<TopicContent, "playbooks">;
