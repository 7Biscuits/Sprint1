import type { Profile } from "../types.js";

/**
 * Two anonymous, persisted demo profiles (PRD must-have #1, R5).
 * No real PII: ids are fixed demo identifiers. Stored risk parameters and
 * holdings are the "behavioral profile" dependency for this sprint —
 * historical interaction patterns are explicitly NOT modelled (PRD §9).
 */
export const DEMO_SYMBOL = "RELIANCE.NS";

export const PROFILES: Profile[] = [
  {
    id: "profile_conservative_001",
    name: "Meera · Conservative",
    riskTolerance: "conservative",
    description:
      "Preserves capital first. Large existing stake in the analysed stock makes further concentration the key risk.",
    horizon: "3–5 years",
    monthlySurplusInr: 15000,
    portfolioValueInr: 1000000,
    holdings: [
      { symbol: "RELIANCE.NS", name: "Reliance Industries", weightPct: 60, valueInr: 600000 },
      { symbol: "HDFCBANK.NS", name: "HDFC Bank", weightPct: 25, valueInr: 250000 },
      { symbol: "ITC.NS", name: "ITC Ltd", weightPct: 15, valueInr: 150000 },
    ],
  },
  {
    id: "profile_growth_002",
    name: "Arjun · Growth",
    riskTolerance: "growth",
    description:
      "Accepts volatility for growth. The analysed stock is a small starter position with room to stage in.",
    horizon: "7–10 years",
    monthlySurplusInr: 25000,
    portfolioValueInr: 400000,
    holdings: [
      { symbol: "NIFTYBEES.NS", name: "Nifty 50 ETF", weightPct: 45, valueInr: 180000 },
      { symbol: "TATAMOTORS.NS", name: "Tata Motors", weightPct: 25, valueInr: 100000 },
      { symbol: "RELIANCE.NS", name: "Reliance Industries", weightPct: 10, valueInr: 40000 },
      { symbol: "INFY.NS", name: "Infosys", weightPct: 10, valueInr: 40000 },
      { symbol: "CASH", name: "Cash & equivalents", weightPct: 10, valueInr: 40000 },
    ],
  },
];

export function getProfile(id: string): Profile | undefined {
  return PROFILES.find((p) => p.id === id);
}

/** Holdings weight of the analysed symbol as a percentage of portfolio value. */
export function concentrationPct(profile: Profile, symbol: string): number {
  return profile.holdings.find((h) => h.symbol === symbol)?.weightPct ?? 0;
}

/** HHI-style concentration score: sum of squared portfolio weights (0–10,000). */
export function concentrationHhi(profile: Profile): number {
  return Math.round(
    profile.holdings.reduce((sum, h) => sum + (h.weightPct / 100) ** 2 * 10000, 0),
  );
}
