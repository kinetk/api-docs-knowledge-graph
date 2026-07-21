import type { Subject } from "@/lib/types";

/**
 * ============================================================================
 *  SUBJECTS  -  the pull INPUT
 * ============================================================================
 *  This is the list you edit to point the dashboard at a new topic. Each entry
 *  is one card on the page (one competitor). `query` is a plain KINETK search
 *  topic - any string works, no predefined set - and `color` is that subject's
 *  accent across the whole UI.
 *
 *  Two-step workflow:
 *    1. Edit the list below (or add a new topic).
 *    2. Run `npm run pull` to fetch the numbers into `data/<topic>.json`.
 *
 *  KINETK does NOT choose the competitor set for you - a category query returns
 *  content themes, not a ranked brand list. So you name the ~5 subjects here;
 *  the pull fills each one's data. Any count works, not just five.
 * ============================================================================
 */

export interface TopicSubjects {
  subjects: Subject[];
  /** Trailing window for the pull. */
  window: "7d" | "30d" | "all";
  /** Limit of records */
  limit: number;
}

export const TOPICS: Record<string, TopicSubjects> = {
  watches: {
    window: "30d",
    limit: 3000,
    subjects: [
      { query: "Rolex watches", name: "Rolex", color: "#cba135" },
      { query: "Patek Philippe", color: "#4c8a6e" },
      { query: "Audemars Piguet", color: "#6683f5" },
      { query: "Richard Mille", color: "#e0525c" },
      { query: "Omega watches", name: "Omega", color: "#34b3ac" },
    ],
  },
};

/**
 * Which topic the dashboard renders. Change this one line to switch the whole
 * page between any topic you have generated a `data/<topic>.json` for.
 */
export const ACTIVE_TOPIC: keyof typeof TOPICS & string = "watches";
