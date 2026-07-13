/**
 * Derived metrics.
 *
 * The source data stores only raw counts (views, likes, comments, shares,
 * records). Everything aggregate - the engagement score, share of voice and
 * comments-per-post - is computed here so the numbers can never drift out of
 * sync with the underlying counts.
 */

import type { Entity, EntityMetrics } from "./types";

/**
 * How each interaction is weighted into a single engagement score. A view is
 * cheap; a share is a strong signal. Tune these to change how the ranking
 * behaves across the whole dashboard.
 */
export const ENGAGEMENT_WEIGHTS = {
  views: 1,
  likes: 3,
  comments: 5,
  shares: 8,
} as const;

/** Weighted engagement score for a single entity. */
export function engagementScore(m: EntityMetrics): number {
  return (
    m.views * ENGAGEMENT_WEIGHTS.views +
    m.likes * ENGAGEMENT_WEIGHTS.likes +
    m.comments * ENGAGEMENT_WEIGHTS.comments +
    m.shares * ENGAGEMENT_WEIGHTS.shares
  );
}

/** Average comments per post - our best proxy for real conversation. */
export function commentsPerPost(m: EntityMetrics): number {
  return m.records === 0 ? 0 : m.comments / m.records;
}

/** Total engagement score across every entity. */
export function totalEngagementScore(entities: readonly Entity[]): number {
  return entities.reduce((sum, e) => sum + engagementScore(e.metrics), 0);
}

/** An entity's share of the total measured engagement, in percent. */
export function shareOfVoicePct(entity: Entity, total: number): number {
  return total === 0 ? 0 : (engagementScore(entity.metrics) / total) * 100;
}

/** Per-entity derived stats, keyed by entity id. */
export interface EntityStats {
  score: number;
  sharePct: number;
  commentsPerPost: number;
}

/** Compute every derived stat once, ready to hand to the render layer. */
export function computeStats(
  entities: readonly Entity[],
): Record<string, EntityStats> {
  const total = totalEngagementScore(entities);
  return Object.fromEntries(
    entities.map((e) => [
      e.id,
      {
        score: engagementScore(e.metrics),
        sharePct: shareOfVoicePct(e, total),
        commentsPerPost: commentsPerPost(e.metrics),
      },
    ]),
  );
}
