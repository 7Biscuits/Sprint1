import type { AgentResult, Citation, Indicators, MarketSnapshot, Signal } from "../types.js";
import { isoNow } from "../utils.js";

/**
 * Technical agent — 100% deterministic code (PRD R4: calculated indicators,
 * never LLM arithmetic). Citations point at the OHLCV snapshot itself so the
 * "no uncited output" rule holds uniformly.
 */
export function runTechnical(
  snapshot: MarketSnapshot,
  ind: Indicators,
  launchAt: string,
): AgentResult {
  const startedAt = isoNow();
  const base: AgentResult = {
    agent: "technical",
    status: "complete",
    signal: "neutral",
    confidence: 45,
    evidence: [],
    claims: [],
    citations: [],
    provenance: `Calculated server-side from ${ind.pointsUsed} daily OHLCV bars (source: ${snapshot.source}; snapshot date ${snapshot.snapshotDate}).`,
    startedAt: launchAt,
    completedAt: startedAt,
    durationMs: 0,
    fallbackUsed: snapshot.mode === "cached",
  };

  if (!ind.sufficientHistory) {
    return {
      ...base,
      status: "unavailable",
      signal: "unavailable",
      confidence: 0,
      generatedBy: "rules",
      unavailableReason: `Insufficient OHLCV history: ${ind.pointsUsed} bars with volume (need ≥50). Indicators were not invented (PRD R1).`,
      citations: [],
      claims: [],
    };
  }

  const citation: Citation = {
    id: "TECH-CALC-SNAPSHOT",
    title: `OHLCV market snapshot — ${snapshot.symbol} (${snapshot.snapshotDate})`,
    url: undefined,
    date: snapshot.snapshotDate,
    docType: "market_data",
    publisher: snapshot.source,
    excerpt: `${snapshot.points.length} daily bars ending ${snapshot.snapshotDate}; last close ₹${ind.price} (${ind.changePct >= 0 ? "+" : ""}${ind.changePct}% vs prev close ₹${ind.prevClose}). Retrieved via the market adapter in ${snapshot.mode} mode.`,
  };

  const subs: { name: string; ok: boolean }[] = [
    { name: "price > MA20", ok: ind.price > ind.ma20 },
    { name: "price > MA50", ok: ind.price > ind.ma50 },
    { name: "MA20 > MA50", ok: ind.ma20 > ind.ma50 },
    { name: "30-day return > 0", ok: ind.return30dPct > 0 },
    ...(ind.volumeAvailable ? [{ name: "volume ratio > 1", ok: ind.volumeRatio > 1 }] : []),
  ];
  const net = subs.reduce((acc, s) => acc + (s.ok ? 1 : -1), 0);
  let signal: Signal = "neutral";
  if (net >= 2) signal = "bullish";
  else if (net <= -2) signal = "bearish";
  const confidence = net === 0 ? 45 : Math.min(85, 50 + 8 * Math.abs(net));

  const evidence: string[] = [];
  if (ind.maRelation === "above_both") {
    evidence.push(
      `Close ₹${ind.price} sits above MA20 ₹${ind.ma20} and MA50 ₹${ind.ma50} — trend alignment is positive [TECH-CALC-SNAPSHOT]`,
    );
  } else if (ind.maRelation === "below_both") {
    evidence.push(
      `Close ₹${ind.price} sits below MA20 ₹${ind.ma20} and MA50 ₹${ind.ma50} — trend alignment is negative [TECH-CALC-SNAPSHOT]`,
    );
  } else {
    evidence.push(
      `Close ₹${ind.price} is between MA20 ₹${ind.ma20} and MA50 ₹${ind.ma50} — mixed trend signals [TECH-CALC-SNAPSHOT]`,
    );
  }
  const rsiBand =
    ind.rsi14 >= 70
      ? "overbought territory (>70)"
      : ind.rsi14 <= 30
        ? "oversold territory (<30)"
        : " constructive mid-range (30–70)";
  evidence.push(
    `RSI(14) = ${ind.rsi14} — ${rsiBand}; 30-day return ${ind.return30dPct >= 0 ? "+" : ""}${ind.return30dPct}% [TECH-CALC-SNAPSHOT]`,
  );
  evidence.push(ind.volumeAvailable
    ? `Last-session volume was ${ind.volumeRatio}× the 20-day average; 20-day annualised volatility is ${ind.volatility20dPct}% and price is ${Math.abs(ind.distanceFromHighPct)}% ${ind.distanceFromHighPct <= 0 ? "below" : "above"} the 6-month high [TECH-CALC-SNAPSHOT]`
    : `Close-only feed: volume and intraday range are unavailable; 20-day annualised volatility is ${ind.volatility20dPct}% and price is ${Math.abs(ind.distanceFromHighPct)}% below the 6-month closing-price high [TECH-CALC-SNAPSHOT]`,
  );

  return {
    ...base,
    signal,
    confidence,
    evidence: evidence.slice(0, 3),
    citations: [citation],
    claims: [
      {
        claim: `Price ₹${ind.price} with RSI ${ind.rsi14}, MA20 ₹${ind.ma20}, MA50 ₹${ind.ma50}, 30-day return ${ind.return30dPct}%, 90-day return ${ind.return90dPct}%, annualised volatility ${ind.volatility20dPct}%${ind.volumeAvailable ? `, volume ratio ${ind.volumeRatio}×` : ", volume unavailable"}`,
        citationIds: [citation.id],
      },
    ],
    generatedBy: "rules",
  };
}
