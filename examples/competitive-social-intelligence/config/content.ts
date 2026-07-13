import type { BaseContent, TopicContent } from "@/lib/types";

/**
 * ============================================================================
 *  CONTENT  -  the authored WORDS (all optional)
 * ============================================================================
 *  `DEFAULT_CONTENT` is generic copy that works for ANY topic, so a new subject
 *  renders with ZERO edits here - you only touch config/subjects.ts.
 *
 *  `CONTENT` holds per-topic OVERRIDES, and every field is optional: supply just
 *  the bits worth customizing (a sharper headline, hand-written playbooks) and
 *  the rest falls back to DEFAULT_CONTENT. A topic with nothing to customize
 *  needs no entry at all. `npm run pull` regenerates data/<topic>.json but never
 *  touches this file, so your copy survives a refresh.
 *
 *  Tokens filled in at render time from the active dataset:
 *    {brand}      -> your product name (config/brand.ts)
 *    {subjects}   -> the subject names, e.g. "Rolex, Patek Philippe and Omega"
 *    {platforms}  -> the platforms present, e.g. "TikTok, Instagram and X"
 *
 *  Playbooks are keyed by subject id (a slug of the name, e.g. "patek-philippe").
 *  Leave a subject out of `playbooks` (or omit playbooks entirely) and the page
 *  renders a plain, no-LLM summary built from that subject's own numbers.
 * ============================================================================
 */

/**
 * Generic copy used for any topic that doesn't override it in `CONTENT` below.
 * Neutral wording ("brand", "the field") so it reads fine for any subject -
 * watches, beers, anything.
 */
export const DEFAULT_CONTENT: BaseContent = {
  masthead: {
    eyebrow: "{brand} · Competitive Social Intelligence · Trailing 30 Days",
    headline: {
      lead: "The full field, one view.",
      emphasis: "Who's actually winning the room -",
      trail: "and why.",
    },
    description:
      "A cross-platform read on {subjects} - built from live {platforms} activity. Pick your brand to see who's pulling ahead, what they're doing differently, and the counter-move worth running this week.",
  },
  sections: {
    shareOfVoice: {
      num: "01",
      kicker: "Share of Voice",
      title: "Where the engagement is sitting right now",
      note: "Share of total measured engagement (views + weighted likes/comments/shares) across the full brand-relevant sample.",
    },
    position: {
      num: "02",
      kicker: "Your Position",
      title: "Tell us who you are",
      note: "Selecting a brand benchmarks it against the others and surfaces a counter-move for each rival.",
    },
    weeklyPulse: {
      num: "03",
      kicker: "Weekly Pulse",
      title: "Engagement trajectory, by week",
      note: "Dated posts only (a subset of the full sample - see note below). Undated evergreen content is excluded from this trend line but counted in Share of Voice.",
    },
    playbook: {
      num: "04",
      kicker: "The Playbook",
      title: "What each brand is doing - and the counter",
      note: "Built from each brand's own top-performing content and white-space tags over the last 30 days.",
    },
    summaryMetrics: {
      num: "05",
      kicker: "Summary Metrics",
      title: "The numbers behind the read",
      note: "Comments-per-post is the strongest proxy we have for real conversation vs. passive scrolling.",
    },
    narratives: {
      num: "06",
      kicker: "Content Narratives",
      title: "What each brand's audience is actually talking about",
      note: "Auto-clustered content themes, top performing posts and the highest-premium, still-uncrowded tags for each brand.",
    },
  },
  footer:
    "This page is fed by KINETK pulls, one per brand. Engagement metrics (Share of Voice, weekly trend, summary stats, top posts) are aggregated from the sampled posts across {platforms}, trailing 30 days, filtered to the on-topic set by keyword relevance. Off-topic viral bleed-through is down-weighted before scoring. Engagement score weights views x1, likes x3, comments x5, shares x8. Narratives and white-space tags (section 06) come from KINETK's insights and can be refreshed live via the button above. The weekly trend chart uses only posts with a recoverable publish date; Share of Voice and summary metrics use the full filtered sample. This is a directional read on a fixed sample, not a certified brand-tracking metric.",
};

/**
 * Per-topic overrides. Each entry is a Partial - include only what you want to
 * change; everything else comes from DEFAULT_CONTENT above.
 */
export const CONTENT: Record<string, Partial<TopicContent>> = {
  watches: {
    masthead: {
      eyebrow: "{brand} · Competitive Social Intelligence · Trailing 30 Days",
      headline: {
        lead: "Five houses, one dial.",
        emphasis: "Who's actually winning the room -",
        trail: "and why.",
      },
      description:
        "A cross-platform read on {subjects} - built from live {platforms} activity. Pick your house to see who's pulling ahead, what they're doing differently, and the counter-move worth running this week.",
    },
    sections: {
      shareOfVoice: {
        num: "01",
        kicker: "Share of Voice",
        title: "Where the engagement is sitting right now",
        note: "Share of total measured engagement (views + weighted likes/comments/shares) across the full brand-relevant sample.",
      },
      position: {
        num: "02",
        kicker: "Your Position",
        title: "Tell us who you are",
        note: "Selecting a house benchmarks it against the others and surfaces a counter-move for each rival.",
      },
      weeklyPulse: {
        num: "03",
        kicker: "Weekly Pulse",
        title: "Engagement trajectory, by week",
        note: "Dated posts only (a subset of the full sample - see note below). Undated evergreen and collector content is excluded from this trend line but counted in Share of Voice.",
      },
      playbook: {
        num: "04",
        kicker: "The Playbook",
        title: "What each house is doing - and the counter",
        note: "Grounded in the actual top-performing content from each house's last 30 days, not category assumptions.",
      },
      summaryMetrics: {
        num: "05",
        kicker: "Summary Metrics",
        title: "The numbers behind the read",
        note: "Comments-per-post is the strongest proxy we have for real conversation vs. passive scrolling.",
      },
      narratives: {
        num: "06",
        kicker: "Content Narratives",
        title: "What each house's audience is actually talking about",
        note: "Auto-clustered content themes, top performing posts and the highest-premium, still-uncrowded tags for each house.",
      },
    },
    footer:
      "This page is fed by KINETK pulls, one per house. Engagement metrics (Share of Voice, weekly trend, summary stats, top posts) are aggregated from the sampled posts across {platforms}, trailing 30 days, filtered to the on-topic set by keyword relevance. Off-topic viral bleed-through common in broad social pulls (meme audio, unrelated trending clips) is down-weighted before scoring. Engagement score weights views x1, likes x3, comments x5, shares x8. Narratives and white-space tags (section 06) come from KINETK's insights and can be refreshed live via the button above. The weekly trend chart uses only posts with a recoverable publish date (a minority of the sample); Share of Voice and summary metrics use the full filtered sample. This is a directional read on a fixed sample, not a certified brand-tracking metric.",
    playbooks: {
      rolex: {
        headline:
          `Slips to #2 at 2,500 records - the second-most views of any house, but the weakest conversation (28.8 comments/post, lowest of the five).`,
        drivers: [
          `18.4% share of voice - second to Richard Mille and effectively tied with Omega (18.3%). Rolex pulls the second-highest view count (124M) yet the lowest likes (11.5M) and lowest comments-per-post (28.8) here: heavy passive reach, comparatively little engagement per post.`,
          `Its base is genuinely broad and model-driven - five well-distributed clusters with no single dominant theme: "Diverse Rolex Models" (173 posts), "Vintage Day-Date 36" (166), "Submariner collector culture" (121), "GMT-Master styles" (112) and "Daytona John Mayer" (110).`,
          `Its biggest posts are off-topic viral bleed-through, not Rolex campaigns: a "luxury diaper" meme (9.1M views, ~7% of Rolex's views and shared across all five houses) and an epoxy-floor clip (2.6M). The one on-brand hit is a watch-styling "perfect couples set" (8.6M). Whitespace points to #johnmayerdaytona (+77%) and Zenith cross-shopping (#zenith +49%).`,
        ],
        counters: [
          `Rolex's soft spot is conversation - most reach, least discussion per post. A reply-bait format (rankings, hot takes, "which one wins") is where it's most beatable.`,
          `The highest-premium open tags in its audience - #258chronoco (+106%) and #johnmayerdaytona (+77%) - are largely unclaimed and cheap to test first.`,
          `The "perfect couples set" styling format clearly resonated (8.6M views) and is easy to copy - run a version against your own catalog.`,
        ],
        caveat:
          `Two of Rolex's three biggest posts (a luxury-diaper meme and an epoxy-floor clip) aren't Rolex content at all, and that diaper clip shows up in every house's top three. Read its position as reach-heavy and conversation-light, not broad brand momentum.`,
      },
      "patek-philippe": {
        headline:
          `Still last by engagement (17.1%) - but only just, and it quietly runs the second-strongest conversation of the five.`,
        drivers: [
          `Lowest share of voice at 17.1%, yet only fractionally behind AP (17.4%) and Omega (18.3%) - "smallest footprint" is now a hair, not a gap. It over-delivers on conversation: 50.1 comments-per-post, second only to Richard Mille.`,
          `Content is heavily Nautilus-concentrated - its three surfaced clusters are "Nautilus gold models" (109 posts), the steel-blue "Nautilus 5711/1A-010" (86) and general "craftsmanship & quality" (78). Fewer distinct themes than any other house.`,
          `No Patek-specific post cracked its own top three - all three are cross-brand virals (the 9.1M diaper clip, a 2.8M pet clip, a 2.6M epoxy-floor clip). Its engagement is broad and steady rather than driven by a breakout moment. Whitespace leans enthusiast: #watchnerd (+70%), #watchgeek (+52%).`,
        ],
        counters: [
          `Patek is the most exposed house on raw reach - it has no viral hit carrying it, so simply publishing more breakout-friendly content in its Nautilus lane closes real ground fast.`,
          `The enthusiast tags its audience over-indexes on (#watchnerd +70%, #watchgeek +52%) are wide open - a specs/collector-depth series meets that audience where it already leans.`,
          `Its Nautilus-vs-Nautilus comparison format (steel 5711 vs. gold references) is cheap to replicate against your own catalog.`,
        ],
        caveat:
          `Everyone except Richard Mille sits within 1.3 points of share of voice (18.4% down to 17.1%) - the bottom four are effectively a four-way tie, so Patek's "last place" is noise, not a real gap this period.`,
      },
      "audemars-piguet": {
        headline:
          `Mid-pack and Royal Oak-bound - but it has the one thing Patek lacks: a genuinely on-brand top post.`,
        drivers: [
          `17.4% share of voice, fourth of five and tightly bunched with Omega and Patek. Middle-of-the-pack on conversation too (44.6 comments-per-post).`,
          `Content is almost entirely Royal Oak / hashtag-cluster driven - its narrative clusters are all #audemarspiguet + #royaloak tag groupings (122, 107 and 101 posts), with little thematic variety beyond the Royal Oak itself.`,
          `Unlike Patek, AP has a clearly on-brand top post - a "Royal Oak Chronograph 41mm unboxing" (2.75M views) - sitting alongside the same cross-brand virals everyone has (the 9.1M diaper clip, a 2.8M pet clip). Whitespace is enthusiast/regional: #horlogerie (+51%), #instawatch (+46%), #ukwatchcollection (+45%).`,
        ],
        counters: [
          `AP leans on a single icon, the Royal Oak. A house with more model range can out-cover it simply by showing breadth AP structurally can't.`,
          `The unboxing is AP's one native hit and cheap for anyone to produce - match the format directly against your own references.`,
          `#horlogerie (+51%) and #instawatch (+46%) are the open, higher-premium tags in its audience and underused by AP itself.`,
        ],
        caveat: null,
      },
      "richard-mille": {
        headline:
          `The new clear #1 at this depth - 28.8% share of voice, and the highest conversation rate of the five too.`,
        drivers: [
          `Runs away with it: 28.8% share of voice, a full 10 points clear of #2 (Rolex, 18.4%). It leads on both reach (179M views, most of any house) and conversation (56.5 comments-per-post, highest here) - the old "reach without discussion" read no longer holds.`,
          `Its narrative base is genuinely RM-specific: "RM67-02" (140 posts), "RM collection" showcases (99), "RM11-03 sales" (92), the "Bubba Watson RM-055" (70) and "limited-edition RM11-02 Le Mans" (50) - real model-level distribution, not one recycled clip.`,
          `But its two biggest posts aren't Richard Mille at all - they're Jacob & Co Bugatti Chiron jeweled watches (20.4M and 15.7M views), off-brand luxury bleed-through that together are ~20% of RM's entire view count. Whitespace is celebrity/aspiration-coded: #sylvesterstallone, #millionaire and #vacheronconstantin all at +108%.`,
        ],
        counters: [
          `RM's lead is real but partly borrowed - study the mechanism, not the number. Its momentum runs on third-party creators and celebrity/HNW pieces shown off on personal accounts; that's seedable through relationships and gifting, not buyable like a media plan.`,
          `Its top-of-funnel is dominated by other brands' viral watches (Jacob & Co Bugatti) - a house with genuinely owned viral content can claim that "insane jeweled watch" lane instead of ceding it to bleed-through.`,
          `The celebrity/net-worth tags carrying its audience (#sylvesterstallone, #millionaire, +108%) point to aspiration content any house can produce - RM benefits from that lane but doesn't own it.`,
        ],
        caveat:
          `RM's view lead is inflated by off-brand content: its two biggest posts are Jacob & Co Bugatti pieces, not Richard Mille, and account for roughly a fifth of its views. The RM-specific base underneath is real, but treat the raw #1 as flattered by luxury-watch bleed-through.`,
      },
      omega: {
        headline:
          `Holds #3 on the most coherent, on-brand content set of the five - Speedmaster, Seamaster and Bond.`,
        drivers: [
          `18.3% share of voice, third and effectively tied with Rolex (18.4%) - but on a healthier mix: 46.9 comments-per-post against Rolex's 28.8 on comparable reach.`,
          `The richest, most model-specific narrative set here - four deep, distinct heritage lanes where rivals mostly have hashtag clusters: "The Beauty of Omega" (171 posts), "Speedmaster Chronograph" (126), "Seamaster Diver 300M" (115) and "Speedmaster Moonwatch heritage" (106).`,
          `Its whitespace is unusually on-brand and coherent - #bond (+68%), #goldwatch (+68%), #seamasterdiver300m (+68%), #danielcraig (+59%) - and it has a genuinely owned top post, the 007 50th-anniversary presentation-box set (2.65M views), not just bleed-through.`,
        ],
        counters: [
          `Omega's edge is a tight story-to-tag fit (Bond / Seamaster / Speedmaster) that's hard to attack head-on. The move is to pick a heritage lane it doesn't own and go as deep as it goes on Speedmaster.`,
          `The Bond / #danielcraig association does real work (+59-68% premiums) - you can't copy Bond, but the "cinematic heritage moment" format behind it is reusable.`,
          `Its Seamaster Diver 300M content (115 posts, +68% tag premium) is the most repeatable, creator-friendly lane - test the dive-heritage format against your own catalog.`,
        ],
        caveat:
          `The "highest comments-per-post" crown Omega held at shallower pulls is gone at 2,500 records - Richard Mille (56.5) and Patek (50.1) now both out-converse it (46.9). Its strength here is content coherence, not a conversation lead.`,
      },
    },
  },

  // A topic with nothing to customize needs no entry here - it renders entirely
  // from DEFAULT_CONTENT with auto-generated playbooks. To hand-write just the
  // playbooks (the one genuinely per-subject bit), override only that key:
  //
  //   "my-topic": {
  //     playbooks: {
  //       "subject-id": { headline: "...", drivers: ["..."], counters: ["..."], caveat: null },
  //     },
  //   },
};
