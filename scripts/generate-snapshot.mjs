/**
 * Deterministic fixture generator for the versioned RELIANCE.NS snapshot.
 * Produces 130 trading days of OHLCV ending 2026-08-28 (last trading day
 * before the sprint demo). A seeded search picks the first RNG seed whose
 * price path satisfies all demo constraints (price ~₹2.9–3.1k, price>MA20>MA50,
 * RSI(14) 52–66, +2–7% 30-day return, last-day volume 1.2–1.3× the 20-day avg),
 * so the checked-in snapshot is reproducible AND lands in a credible
 * mild-uptrend band for the demo narrative.
 *
 * Run: npm run fixture:snapshot   (writes server/src/data/snapshot.reliance.json)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "../server/src/data/snapshot.reliance.json");

// ── seeded PRNG (mulberry32) for reproducibility ──
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gaussianFrom(rng) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// ── trading dates ending Friday 2026-08-28, skipping weekends ──
function tradingDates(n) {
  const dates = [];
  const d = new Date(Date.UTC(2026, 7, 28)); // 2026-08-28
  while (dates.length < n) {
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) dates.unshift(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return dates;
}

const TOTAL = 130;
const PHASE_B_START = 85; // last 45 days drift upward (mild uptrend)
const dates = tradingDates(TOTAL);

function sma(closes, n) {
  const s = closes.slice(-n);
  return s.reduce((a, b) => a + b, 0) / s.length;
}
function rsi(closes, period = 14) {
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gain += diff;
    else loss -= diff;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period;
  }
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

function generate(seed) {
  const rng = mulberry32(seed);
  const points = [];
  let close = 2740;
  const volumes = [];
  for (let i = 0; i < TOTAL; i++) {
    const inPhaseB = i >= PHASE_B_START;
    const mu = inPhaseB ? 0.0012 : 0.0002;
    const sigma = inPhaseB ? 0.007 : 0.008;
    const ret = mu + sigma * gaussianFrom(rng);
    const prev = close;
    close = prev * Math.exp(ret);
    const open = prev * (1 + 0.002 * gaussianFrom(rng));
    const spread = 0.003 + 0.004 * rng();
    const high = Math.max(open, close) * (1 + spread);
    const low = Math.min(open, close) * (1 - spread);
    const baseVolume = Math.max(4_000_000, Math.round(9_500_000 * Math.exp(0.18 * gaussianFrom(rng))));
    volumes.push(baseVolume);
    points.push({
      date: dates[i],
      open: Math.round(open * 10) / 10,
      high: Math.round(high * 10) / 10,
      low: Math.round(low * 10) / 10,
      close: Math.round(close * 10) / 10,
      volume: baseVolume,
    });
  }
  // Make the volume ratio exact: last day = 1.25 × the trailing 20-day average.
  const trailing = volumes.slice(-21, -1);
  const avg = trailing.reduce((a, b) => a + b, 0) / trailing.length;
  points[points.length - 1].volume = Math.round(avg * 1.25);
  return points;
}

function evaluate(points) {
  const closes = points.map((p) => p.close);
  const price = closes[closes.length - 1];
  const ma20 = sma(closes, 20);
  const ma50 = sma(closes, 50);
  const ret30 = ((price - closes[closes.length - 31]) / closes[closes.length - 31]) * 100;
  const volAvg = points.slice(-21, -1).reduce((a, b) => a + b.volume, 0) / 20;
  const volRatio = points[points.length - 1].volume / volAvg;
  const r = rsi(closes);
  const pass =
    price >= 2900 && price <= 3100 &&
    price > ma20 && ma20 > ma50 &&
    r >= 52 && r <= 66 &&
    ret30 >= 2 && ret30 <= 7 &&
    volRatio >= 1.2 && volRatio <= 1.3;
  return { price, ma20, ma50, ret30, volRatio, r, pass };
}

let chosen = null;
let chosenSeed = null;
for (let seed = 1; seed <= 5000; seed++) {
  const points = generate(seed);
  const ev = evaluate(points);
  if (ev.pass) {
    chosen = points;
    chosenSeed = seed;
    break;
  }
}
if (!chosen) {
  console.error("No seed satisfied the constraints — relax the bands.");
  process.exit(1);
}
const ev = evaluate(chosen);

const fixture = {
  version: "reliance-ohlcv-v1",
  symbol: "RELIANCE.NS",
  snapshotDate: dates[dates.length - 1],
  capturedAt: "2026-08-28T15:30:00+05:30",
  currency: "INR",
  note: "Deterministic demo fixture — daily OHLCV, NSE session dates, volumes in shares.",
  generatorSeed: chosenSeed,
  points: chosen,
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(fixture, null, 1));

console.log(`wrote ${OUT}`);
console.log(`seed=${chosenSeed} points=${chosen.length} snapshotDate=${fixture.snapshotDate}`);
console.log(`price=${ev.price.toFixed(1)} ma20=${ev.ma20.toFixed(1)} ma50=${ev.ma50.toFixed(1)}`);
console.log(`rsi14=${ev.r.toFixed(1)} ret30=${ev.ret30.toFixed(2)}% volRatio=${ev.volRatio.toFixed(2)}`);
console.log(`uptrend(price>ma20>ma50)=true (by constraint)`);
