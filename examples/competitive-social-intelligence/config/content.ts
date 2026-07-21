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
          `#2 at 29.0% on the deepest sample here (1,534 posts) - and the only house whose content actually gets passed on.`,
        drivers: [
          `29.0% share of voice on 76.8M views, second to Richard Mille. It has the largest 30-day footprint of the five - 1,534 eligible posts against RM's 929 - so its position rests on sustained volume and reach rather than one breakout moment.`,
          `It is the only house being shared at any real rate: 2,111 shares, or 1.4 per post, against Patek's 0.9, RM's 0.4 and AP's and Omega's 0.1. Shares carry the heaviest weight in the engagement score (x8), and nothing else is close.`,
          `One format carries it - matching couples' Datejusts. "The perfect couples set" pulled 8.62M views (11% of Rolex's entire view count) and both remaining top posts are "his and hers chocolate dial Datejusts", matching its 199-post "Couples Rolex Datejust Matching Sets" cluster.`,
        ],
        counters: [
          `The his-and-hers Datejust format is Rolex's engine this month and is trivially reproducible against any two-watch catalog - it needs styling, not budget.`,
          `Conversation is its soft spot: 3.8 comments per post and 75 comments per million views, well behind Patek's 201 and AP's 141. Reply-driven formats are where it's thinnest.`,
          `Its whitespace is retailer- and materials-coded (#diamonds +89.5%, #trottersjewellers +89.4%, #royalwindsorwatches +80.7%) - dealer partnerships reach that audience more cheaply than paid media.`,
        ],
        caveat:
          `Two of Rolex's three top posts are the same "his and hers chocolate dial Datejust" clip uploaded twice (2,585,259 and 2,585,243 views, identical 190,172 likes), so its top-content slot is two videos, not three. Its third-largest cluster ("Men's Fashion And Accessory Watches", 183 posts) is largely about budget brands like Poedagar and Zeroone rather than Rolex.`,
      },
      "patek-philippe": {
        headline:
          `Last at 7.8% - under a quarter of Richard Mille's share - yet it draws more comment per view than anyone here.`,
        drivers: [
          `7.8% share of voice, a distant fifth: the lowest views (20.6M), lowest likes (615K) and lowest like rate (3.0%) in the set. The gap up to fourth place (Omega, 12.4%) is wider than the gap between second and third.`,
          `The one axis it wins outright: 201 comments per million views, more than four times Richard Mille's 49 and ahead of AP's 141. Its 1,111-post sample is small but unusually argumentative.`,
          `Its content skews to resale and comparison rather than product. The dominant cluster is "Patek Philippe Luxury Watch Sales" (397 posts, 36% of its sample, much of it pre-owned dealers), followed by vintage Patek-vs-Rolex (167) and a Calatrava-vs-A. Lange debate cluster (125).`,
        ],
        counters: [
          `Patek is the most exposed house on reach - no viral post of its own and the smallest view base - so ordinary publishing volume closes real ground against it.`,
          `Its audience argues rather than scrolls (201 comments/M views). Comparison and debate formats meet it where it already sits, and its own Lange cluster proves the appetite.`,
          `#timelessdesign (+97.0%) and #marcgebauer (+94.2%) are the highest-premium open tags in its audience, and both are creator- and dealer-led rather than paid.`,
        ],
        caveat:
          `Neither of Patek's two biggest posts is Patek content. Its top post is a "Jewelry Boxes - up to 25% Off" ad (1.7M views, 246 likes - a 0.01% like rate) that also appears in Omega's top three, and its second is a generic "shes stunninggg" viral clip (1.31M). Only the third, a 5711/1R vs 5712R comparison (779K), is actually Patek. A further 116-post cluster in its sample is Rolex Daytona content.`,
      },
      "audemars-piguet": {
        headline:
          `Third at 15.6% with the best conversation rate of the five (4.7 comments/post) - on a sample that keeps duplicating itself.`,
        drivers: [
          `15.6% share of voice on 40.4M views, third. It leads the field on conversation at 4.7 comments per post - ahead of RM's 4.5, Rolex's 3.8 and Omega's 2.4 - and runs the second-highest like rate at 4.1%.`,
          `Royal Oak, and almost nothing else. Skeletonised and openworked references dominate at 364 posts, followed by Anant Ambani's 25-piece custom wedding commission (121), iconic Royal Oak models (111) and AP x Swatch "Royal Pop" speculation (110).`,
          `It is effectively unshared: 79 shares across 1,220 posts, or 0.1 per post, level with Omega and the lowest here. Its content gets liked and discussed where it sits, but almost never travels.`,
        ],
        counters: [
          `AP is beatable on distribution, not engagement. Its per-post response is the strongest in the set, but 79 total shares means nothing escapes its original audience.`,
          `It has exactly one icon. A house with genuine model range can out-cover it - even AP's own sample can't get past the Royal Oak.`,
          `Its whitespace is geographic and marketplace-coded (#toronto +94.4%, #chrono24 +82.3%) - regional dealer content is where its audience is least served.`,
        ],
        caveat:
          `All three of AP's top posts are the same "Royal Oak Chronograph 41mm unboxing" clip (2,748,189 / 2,748,186 / 2,748,185 views, identical 102,658 likes) - one video triplicated, not three hits. The same triplication appeared in the previous pull, so it is a persistent duplicate in the corpus rather than a one-off. A 105-post cluster in its sample is Vacheron Constantin Overseas content.`,
      },
      "richard-mille": {
        headline:
          `#1 at 35.2% on the smallest sample here (929 posts) - and its two biggest posts are Jacob & Co, not Richard Mille.`,
        drivers: [
          `35.2% share of voice, six points clear of Rolex, achieved on the fewest eligible posts of any house - 929 against Rolex's 1,534. It leads on views (85.4M), likes (5.56M) and like rate (6.5%, nearly double the field).`,
          `That intensity is borrowed. Its two biggest posts are Jacob & Co Bugatti Chiron pieces - the Baguette build at 20.4M views and the sapphire-case Chiron at 15.7M - together 42% of its entire view count. Its largest narrative cluster is named "Richard Mille and Jacob & Co. Bugatti Watches" (363 posts, 39% of its sample).`,
          `Conversation is its weakest axis by a distance: 49 comments per million views, against Patek's 201, AP's 141, Omega's 88 and Rolex's 75. Enormous reach, very little reply.`,
        ],
        counters: [
          `Read the mechanism, not the ranking. RM's number rests on hyper-luxury spectacle content it doesn't own - a house with genuinely owned viral product can claim that lane instead of ceding it.`,
          `Its earned layer is celebrity-led - J Balvin's RM12-01 at 6.2M views, plus a 99-post cluster covering Sylvester Stallone and others - which is seeded through relationships and gifting rather than bought.`,
          `#jacobandco (+88.5%) ranking as its highest-premium tag is the tell: that audience turns up for extreme jewelled watches in general, not for the marque.`,
        ],
        caveat:
          `RM's lead is inflated by other brands' content. Its two biggest posts are Jacob & Co Bugatti watches (36.1M of its 85.4M views), its top cluster is explicitly Jacob & Co-mixed, and a further 87-post cluster covers Cartier and Bvlgari. Strip the borrowed reach and the RM-specific base is the thinnest of the five at 929 posts.`,
      },
      omega: {
        headline:
          `Fourth at 12.4% on the most on-brand content set of the five - and the quietest audience (2.4 comments/post).`,
        drivers: [
          `12.4% share of voice on 32.6M views, fourth. Its weakness is response depth: 2.4 comments per post, the lowest here, and 125 total shares across 1,184 posts.`,
          `It has the cleanest narrative set in the field - four of its five clusters are specific Omega product lines: Seamaster unboxings (186), Speedmaster Snoopy and MoonSwatch (171), Seamaster Blue Dial Professional (140) and Seamaster Diver 300M including the No Time To Die edition (125). No rival's sample is that consistently about itself.`,
          `Its genuinely owned hit is heritage-led: the 007 On Her Majesty's Secret Service 50th-anniversary presentation box at 2.65M views and a 6.6% like rate, the strongest-converting post in its set.`,
        ],
        counters: [
          `Omega's coherence is hard to attack; its silence isn't. At 2.4 comments per post the audience watches rather than talks, so any reply-driven format takes conversation share cheaply.`,
          `The MoonSwatch lane (Moonshine Gold at 2.24M views) is an accessible-price collectible play and the most directly copyable move in this pull.`,
          `Its whitespace is unusually local - #notts and #nottingham both at +75.7%, alongside #goldwatch (+82.2%) - pointing at a regional retail audience nobody else is addressing.`,
        ],
        caveat:
          `Omega's third-biggest post is a "Jewelry Boxes - up to 25% Off" ad (1.7M views, 246 likes), the same clip that tops Patek's list - unrelated commerce content surfacing in both samples. Its fifth cluster (99 posts) is generic luxury-watch and budget-brand content rather than Omega.`,
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
