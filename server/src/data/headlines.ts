import type { Citation } from "../types.js";

/**
 * Cached, dated headline fixture (PRD: "a small cached dated headline set").
 * These are demo fixtures — the UI labels the news source and timestamp
 * honestly and the missing-news degraded scenario removes them entirely.
 * A live news provider is deliberately NOT wired this sprint.
 */

export interface HeadlineItem extends Citation {
  sentimentLexicon: ("positive" | "negative" | "neutral")[];
}

export const HEADLINES_NORMAL: HeadlineItem[] = [
  {
    id: "N-2026-08-28-1",
    title: "Reliance Retail revenue up 11% YoY in June quarter; store additions accelerate",
    date: "2026-08-28",
    docType: "news_headline",
    publisher: "Cached demo feed · Economic Bureau",
    excerpt:
      "Reliance Retail's June-quarter revenue rose 11% year-on-year with accelerating store additions; management reiterated its new-commerce scale-up.",
    sentimentLexicon: ["positive", "positive"],
  },
  {
    id: "N-2026-08-27-1",
    title: "Jio adds 4.2 million subscribers in June quarter; ARPU steady at ₹208.6",
    date: "2026-08-27",
    docType: "news_headline",
    publisher: "Cached demo feed · Telecom Desk",
    excerpt:
      "Jio reported 4.2 million net subscriber additions with ARPU steady at ₹208.6, keeping pace with full tariff pass-through.",
    sentimentLexicon: ["positive", "neutral"],
  },
  {
    id: "N-2026-08-26-1",
    title: "Brokerages raise Reliance target prices after O2C margin recovery",
    date: "2026-08-26",
    docType: "news_headline",
    publisher: "Cached demo feed · Markets Wire",
    excerpt:
      "Several brokerages raised target prices for Reliance Industries, citing recovering refining spreads and steady retail momentum.",
    sentimentLexicon: ["positive"],
  },
  {
    id: "N-2026-08-25-1",
    title: "RIL new-energy giga-factory receives first module orders; commissioning on track",
    date: "2026-08-25",
    docType: "news_headline",
    publisher: "Cached demo feed · Energy desk",
    excerpt:
      "Reliance's solar giga-factory received its first commercial module orders; commissioning timelines were reaffirmed for FY27.",
    sentimentLexicon: ["positive", "neutral"],
  },
];

export const HEADLINES_CONFLICT: HeadlineItem[] = [
  {
    id: "N-2026-08-28-2",
    title: "Weak global refining spreads squeeze O2C margins; analysts flag earnings risk",
    date: "2026-08-28",
    docType: "news_headline",
    publisher: "Cached demo feed · Markets Wire",
    excerpt:
      "Soft gasoline cracks and new Asian capacity are compressing O2C margins; analysts flagged near-term earnings risk for Reliance.",
    sentimentLexicon: ["negative", "negative"],
  },
  {
    id: "N-2026-08-27-2",
    title: "Retail growth slows to single digits as urban demand cools",
    date: "2026-08-27",
    docType: "news_headline",
    publisher: "Cached demo feed · Retail desk",
    excerpt:
      "Urban consumption cooled and store productivity dipped, slowing retail revenue growth to single digits for the second straight quarter.",
    sentimentLexicon: ["negative", "negative"],
  },
  {
    id: "N-2026-08-26-2",
    title: "KG-D6 gas migration dispute hearing adds regulatory overhang",
    date: "2026-08-26",
    docType: "news_headline",
    publisher: "Cached demo feed · Legal desk",
    excerpt:
      "A fresh hearing in the gas migration dispute adds a regulatory overhang with a potential contingent liability for the O2C segment.",
    sentimentLexicon: ["negative", "neutral"],
  },
  {
    id: "N-2026-08-25-2",
    title: "New-energy commissioning timeline extended; capex burn to stay elevated",
    date: "2026-08-25",
    docType: "news_headline",
    publisher: "Cached demo feed · Energy desk",
    excerpt:
      "Commissioning of the solar giga-factory slipped by two quarters, keeping capex elevated and delaying free-cash-flow inflection.",
    sentimentLexicon: ["negative", "neutral"],
  },
];
