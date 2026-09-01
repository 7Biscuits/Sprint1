import type { Indicators, MarketSnapshot, OhlcvPoint } from "./types.js";
import { round2 } from "./utils.js";

function sma(closes: number[], n: number): number {
  const slice = closes.slice(-n);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function percentReturn(closes: number[], sessions: number): number {
  const current = closes[closes.length - 1] ?? 0;
  const base = closes[Math.max(0, closes.length - 1 - sessions)] ?? current;
  return base > 0 ? ((current - base) / base) * 100 : 0;
}

function annualizedVolatility(closes: number[], sessions = 20): number {
  const slice = closes.slice(-(sessions + 1));
  if (slice.length < 3) return 0;
  const returns = slice.slice(1).map((close, i) => Math.log(close / slice[i]!));
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance = returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / returns.length;
  return Math.sqrt(variance) * Math.sqrt(252) * 100;
}

/** Wilder's RSI(14) — deterministic, code-calculated (PRD R4: no LLM arithmetic). */
export function rsi(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i]! - closes[i - 1]!;
    if (diff >= 0) gain += diff;
    else loss -= diff;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i]! - closes[i - 1]!;
    avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function computeIndicators(snapshot: MarketSnapshot): Indicators {
  const points: OhlcvPoint[] = snapshot.points;
  const closes = points.map((p) => p.close);
  const volumes = points.map((p) => p.volume);
  const price = snapshot.price;
  const prevClose = snapshot.prevClose;
  const ma20 = sma(closes, Math.min(20, closes.length));
  const ma50 = sma(closes, Math.min(50, closes.length));
  const return30dPct = percentReturn(closes, 30);
  const return90dPct = percentReturn(closes, 90);
  const high6m = Math.max(...points.map((p) => p.high));
  const low6m = Math.min(...points.map((p) => p.low));
  const rangePositionPct = high6m === low6m ? 50 : ((price - low6m) / (high6m - low6m)) * 100;
  const volSlice = volumes.slice(-21, -1);
  const volumeAvailable = volumes.every((v) => v > 0);
  const avgVolume = volSlice.length ? volSlice.reduce((a, b) => a + b, 0) / volSlice.length : 0;
  const volumeRatio = volumeAvailable && avgVolume > 0 ? volumes[volumes.length - 1]! / avgVolume : 0;
  const sufficientHistory = points.length >= 50;
  const maRelation: Indicators["maRelation"] =
    price > ma20 && price > ma50
      ? "above_both"
      : price < ma20 && price < ma50
        ? "below_both"
        : "between";
  return {
    price: round2(price),
    prevClose: round2(prevClose),
    changePct: round2(((price - prevClose) / prevClose) * 100),
    rsi14: round2(rsi(closes)),
    ma20: round2(ma20),
    ma50: round2(ma50),
    maRelation,
    return30dPct: round2(return30dPct),
    return90dPct: round2(return90dPct),
    volatility20dPct: round2(annualizedVolatility(closes)),
    high6m: round2(high6m),
    low6m: round2(low6m),
    distanceFromHighPct: round2(((price - high6m) / high6m) * 100),
    drawdownFromHighPct: round2(((price - high6m) / high6m) * 100),
    rangePositionPct: round2(rangePositionPct),
    volumeRatio: round2(volumeRatio),
    volumeAvailable,
    pointsUsed: points.length,
    sufficientHistory,
  };
}
