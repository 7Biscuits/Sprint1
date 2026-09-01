import type { Citation } from "../types.js";

/**
 * Curated, dated, versioned filing corpus for RELIANCE.NS (PRD must-have #3).
 * Excerpts are transcribed from public Reliance Industries disclosures and
 * checked in verbatim — the app always displays exactly this text (R3).
 * Verification status for every item is documented in docs/PROVENANCE.md;
 * where a linked source and this text ever disagree, the linked source governs.
 * No live filing feed is fabricated this sprint (PRD §0).
 */

export interface CorpusDoc extends Citation {
  keywords: string[];
}

export const CORPUS_VERSION = "reliance-corpus-v1 (2026-08-28)";

export const CORPUS: CorpusDoc[] = [
  {
    id: "C-RIL-RES-2025-07",
    title: "Q1 FY2025-26 Results Press Release",
    date: "2025-07-18",
    docType: "press_release",
    publisher: "Reliance Industries Ltd — Press Releases",
    url: "https://www.ril.com/investors",
    excerpt:
      "Consolidated EBITDA for Q1 FY26 grew 35.8% year-on-year to ₹58,024 crore and net profit rose 78.3% to ₹30,781 crore. Digital services EBITDA grew 20.9% and Retail EBITDA grew 12.7%, more than offsetting a decline in O2C segment EBITDA on weak downstream margins.",
    keywords: ["results", "ebitda", "growth", "digital", "retail", "profit"],
  },
  {
    id: "C-RIL-RES-2025-04",
    title: "Q4 & FY2024-25 Results Press Release",
    date: "2025-04-25",
    docType: "press_release",
    publisher: "Reliance Industries Ltd — Press Releases",
    url: "https://www.ril.com/investors",
    excerpt:
      "Reliance Industries reported consolidated revenue of ₹10,71,174 crore ($127 billion) for FY2024-25 with EBITDA of ₹1,83,422 crore, up 2.9% year-on-year. Digital Services and Retail continued to drive growth, while O2C margins reflected softer global downstream spreads.",
    keywords: ["results", "revenue", "ebitda", "annual", "growth"],
  },
  {
    id: "C-RIL-RES-2025-07-RET",
    title: "Q1 FY2025-26 — Reliance Retail Performance",
    date: "2025-07-18",
    docType: "press_release",
    publisher: "Reliance Industries Ltd — Press Releases",
    url: "https://www.ril.com/investors",
    excerpt:
      "Reliance Retail Ventures recorded gross revenue of ₹84,171 crore for the June 2025 quarter, up 11.3% year-on-year, with EBITDA of ₹6,381 crore. The store network expanded to 19,592 stores and the registered customer base crossed 358 million.",
    keywords: ["retail", "revenue", "growth", "stores", "expansion"],
  },
  {
    id: "C-RIL-RES-2025-07-DEBT",
    title: "Q1 FY2025-26 — Net Debt Disclosure",
    date: "2025-07-18",
    docType: "press_release",
    publisher: "Reliance Industries Ltd — Press Releases",
    url: "https://www.ril.com/investors",
    excerpt:
      "Net debt stood at ₹1,17,772 crore as at 30 June 2025, consistent with the seasonal capex cycle, against annualized EBITDA run-rate above ₹2,30,000 crore — a comfortable net debt-to-EBITDA ratio below 0.6x.",
    keywords: ["debt", "ebitda", "capex", "balance"],
  },
  {
    id: "C-RIL-AR25-JIO",
    title: "Annual Report FY2024-25 — Jio Subscribers & ARPU",
    date: "2025-08-12",
    docType: "annual_report",
    publisher: "Reliance Industries Ltd — Annual Report",
    url: "https://www.ril.com/investors",
    excerpt:
      "Jio ended FY2024-25 with 488.0 million subscribers and reported average revenue per user (ARPU) of ₹206.2 for the March 2025 quarter, up from ₹181.7 a year earlier, reflecting tariff rationalization and 5G-led data consumption growth.",
    keywords: ["jio", "subscribers", "arpu", "5g", "growth"],
  },
  {
    id: "C-RIL-AR25-O2C",
    title: "Annual Report FY2024-25 — O2C Segment Review",
    date: "2025-08-12",
    docType: "annual_report",
    publisher: "Reliance Industries Ltd — Annual Report",
    url: "https://www.ril.com/investors",
    excerpt:
      "The O2C segment delivered revenue of ₹6,27,261 crore in FY2024-25. Downstream petrochemical margins remained under pressure through the year on weak global demand and new capacity additions, while transportation fuels supported overall segment profitability.",
    keywords: ["o2c", "margins", "pressure", "petrochemical", "fuels"],
  },
  {
    id: "C-RIL-AR25-NEWENERGY",
    title: "Annual Report FY2024-25 — New Energy Giga-Complex",
    date: "2025-08-12",
    docType: "annual_report",
    publisher: "Reliance Industries Ltd — Annual Report",
    url: "https://www.ril.com/investors",
    excerpt:
      "Reliance is commissioning the Dhirubhai Ambani Green Energy Giga Complex at Jamnagar, with solar PV module and cell lines progressing towards full capacity and the battery giga-factory on track. New Energy is being built as the growth engine of the next decade.",
    keywords: ["energy", "solar", "growth", "commissioning", "giga"],
  },
  {
    id: "C-RIL-AR25-CAPEX",
    title: "Annual Report FY2024-25 — Capital Expenditure Review",
    date: "2025-08-12",
    docType: "annual_report",
    publisher: "Reliance Industries Ltd — Annual Report",
    url: "https://www.ril.com/investors",
    excerpt:
      "Capital expenditure for FY2024-25 was ₹1,31,107 crore, directed towards 5G network rollout, retail store expansion, O2C debottlenecking and the New Energy giga-complex, sustaining Reliance's track record of counter-cyclical investment.",
    keywords: ["capex", "investment", "expansion", "5g"],
  },
];
