import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { MarketSnapshot } from "./types.js";
import { config } from "./config.js";
import { fetchWithTimeout, isoNow, sha256Short, round2 } from "./utils.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_FILE = path.resolve(__dirname, "data", "snapshot.reliance.json"); // checked-in fixture
// Runtime artifacts (gitignored). Override for hermetic tests (acceptance uses a temp dir).
const RUNTIME_DIR = process.env.SIGNALPROOF_CACHE_DIR ?? path.resolve(__dirname, "../data");
function cacheFileFor(symbol: string): string {
  // Keep each quote in its own cache entry. This prevents a cached Reliance
  // response from ever being returned as (for example) INFY.NS.
  const safeSymbol = symbol.replace(/[^A-Z0-9._-]/gi, "_").toUpperCase();
  return path.join(RUNTIME_DIR, "cache", `market-${safeSymbol}.json`);
}

interface FixtureFile {
  version: string;
  symbol: string;
  snapshotDate: string;
  capturedAt: string;
  currency: string;
  points: { date: string; open: number; high: number; low: number; close: number; volume: number }[];
}

function loadFixture(): FixtureFile {
  return JSON.parse(fs.readFileSync(FIXTURE_FILE, "utf8")) as FixtureFile;
}

function snapshotFromBars(
  bars: MarketSnapshot["points"],
  meta: { symbol: string; mode: "live" | "cached"; source: string; fetchedAt: string; snapshotDate: string; currency: string; dataQuality?: "ohlcv" | "close_only"; liveAttempted: boolean; liveError?: string; snapshotId: string },
): MarketSnapshot {
  const last = bars[bars.length - 1]!;
  const prev = bars[bars.length - 2] ?? last;
  return {
    ...meta,
    dataQuality: meta.dataQuality ?? "ohlcv",
    points: bars,
    price: last.close,
    prevClose: prev.close,
    changePct: round2(((last.close - prev.close) / prev.close) * 100),
  };
}

function fixtureSnapshot(symbol = "RELIANCE.NS"): MarketSnapshot {
  const fx = loadFixture();
  if (symbol !== fx.symbol) {
    throw new Error(`No bundled fallback exists for ${symbol}. The bundled snapshot is only for ${fx.symbol}.`);
  }
  return snapshotFromBars(fx.points, {
    snapshotId: `snap_fixture_${sha256Short(fx.version).slice(0, 8)}`,
    symbol: fx.symbol,
    mode: "cached",
    source: `Bundled versioned snapshot ${fx.version} (offline fixture)`,
    fetchedAt: fx.capturedAt,
    snapshotDate: fx.snapshotDate,
    currency: fx.currency,
    liveAttempted: false,
  });
}

function cacheFileSnapshot(symbol: string): MarketSnapshot | null {
  try {
    const raw = JSON.parse(fs.readFileSync(cacheFileFor(symbol), "utf8")) as MarketSnapshot;
    if (raw.symbol === symbol && raw.points.length >= 50 && raw.price > 0) {
      const ageMinutes = (Date.now() - Date.parse(raw.fetchedAt)) / 60_000;
      return {
        ...raw,
        dataQuality: raw.dataQuality ?? "ohlcv", // backwards compatible with pre-quality cache entries
        mode: "cached",
        snapshotId: `snap_cache_${sha256Short(raw.fetchedAt + raw.source).slice(0, 8)}`,
        cacheHit: true,
        cacheAgeMinutes: Math.max(0, Math.round(ageMinutes * 10) / 10),
      };
    }
    return null;
  } catch {
    return null;
  }
}

function writeCacheFile(snapshot: MarketSnapshot): void {
  try {
    const cacheFile = cacheFileFor(snapshot.symbol);
    fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
    fs.writeFileSync(cacheFile, JSON.stringify({ ...snapshot, points: snapshot.points }, null, 1));
  } catch {
    /* cache write is best-effort */
  }
}

/** Minimal Yahoo-Finance-compatible chart adapter behind the MarketProvider idea. */
async function yahooLive(symbol: string): Promise<MarketSnapshot> {
  const errors: string[] = [];
  for (const host of config.market.hosts) {
    try {
      const url = `${host}/v8/finance/chart/${encodeURIComponent(symbol)}?range=6mo&interval=1d`;
      const res = await fetchWithTimeout(
        url,
        {
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
            Accept: "application/json",
          },
        },
        config.market.liveTimeoutMs,
      );
      if (!res.ok) throw new Error(`${host} responded ${res.status}`);
      const json = (await res.json()) as any;
      const result = json?.chart?.result?.[0];
      if (!result) throw new Error("Yahoo chart payload missing result");
      const meta = result.meta ?? {};
      const ts: number[] = result.timestamp ?? [];
      const q = result.indicators?.quote?.[0] ?? {};
      const bars: MarketSnapshot["points"] = [];
      for (let i = 0; i < ts.length; i++) {
        const o = q.open?.[i];
        const h = q.high?.[i];
        const l = q.low?.[i];
        const c = q.close?.[i];
        const v = q.volume?.[i];
        if ([o, h, l, c, v].every((x) => typeof x === "number" && Number.isFinite(x) && x > 0)) {
          bars.push({
            date: new Date(ts[i]! * 1000).toISOString().slice(0, 10),
            open: o as number,
            high: h as number,
            low: l as number,
            close: c as number,
            volume: v as number,
          });
        }
      }
      if (bars.length < 50) throw new Error(`Insufficient OHLCV history (${bars.length} < 50 bars)`);
      const fetchedAt = isoNow();
      const snapshotDate = bars[bars.length - 1]!.date;
      return snapshotFromBars(bars, {
        snapshotId: `snap_live_${Date.now().toString(36)}`,
        symbol,
        mode: "live",
        source: `Yahoo Finance chart API (${new URL(host).hostname}), 6mo/1d`,
        fetchedAt,
        snapshotDate,
        currency: meta.currency ?? "INR",
        dataQuality: "ohlcv",
        liveAttempted: true,
      });
    } catch (err) {
      errors.push(`${new URL(host).hostname}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  throw new Error(errors.join(" | ") || "no market host configured");
}

/**
 * Yahoo's spark feed is a useful, independently served fallback when its full
 * chart route is rate-limited. It deliberately exposes closes only: no OHLC
 * or volume values are fabricated, and the UI labels its reduced coverage.
 */
async function yahooSparkLive(symbol: string): Promise<MarketSnapshot> {
  const errors: string[] = [];
  for (const host of config.market.hosts) {
    try {
      const url = `${host}/v7/finance/spark?symbols=${encodeURIComponent(symbol)}&range=6mo&interval=1d`;
      const res = await fetchWithTimeout(url, { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" } }, config.market.liveTimeoutMs);
      if (!res.ok) throw new Error(`${host} responded ${res.status}`);
      const json = (await res.json()) as any;
      const response = json?.spark?.result?.[0]?.response?.[0];
      const timestamps: number[] = response?.timestamp ?? [];
      const closes: number[] = response?.indicators?.quote?.[0]?.close ?? [];
      const bars: MarketSnapshot["points"] = [];
      for (let i = 0; i < timestamps.length; i++) {
        const close = closes[i];
        if (typeof close === "number" && Number.isFinite(close) && close > 0) {
          // The contract currently transports OHLCV-shaped points. Values other
          // than close are intentionally omitted from the interpretation; zero
          // volume makes volume-derived indicators explicitly unavailable.
          bars.push({ date: new Date(timestamps[i]! * 1000).toISOString().slice(0, 10), open: close, high: close, low: close, close, volume: 0 });
        }
      }
      if (bars.length < 50) throw new Error(`Insufficient close history (${bars.length} < 50 sessions)`);
      const last = bars[bars.length - 1]!;
      return snapshotFromBars(bars, {
        snapshotId: `snap_live_close_${Date.now().toString(36)}`,
        symbol,
        mode: "live",
        source: `Yahoo Finance spark API (${new URL(host).hostname}), 6mo/1d close-only`,
        fetchedAt: isoNow(),
        snapshotDate: last.date,
        currency: response?.meta?.currency ?? "INR",
        dataQuality: "close_only",
        liveAttempted: true,
      });
    } catch (err) {
      errors.push(`${new URL(host).hostname}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  throw new Error(errors.join(" | ") || "no market host configured");
}

/**
 * R1: attempt the live provider first; on timeout/error fall back to the
 * most-recent validated file cache, then the bundled versioned snapshot.
 * Responses are cached with a TTL (MARKET_CACHE_TTL_MS, default 15 min): a
 * fresh cache hit is served instantly instead of re-hitting the provider, and
 * is always labelled CACHED with its original fetch time + age. The returned
 * snapshot always carries mode + source + timestamps so the UI can never
 * present cached data as live.
 */
export async function resolveSnapshot(symbol: string): Promise<MarketSnapshot> {
  const normalized = symbol.trim().toUpperCase();
  const cached = cacheFileSnapshot(normalized);
  if (config.market.mode === "cached") {
    if (cached) return { ...cached, liveAttempted: false };
    return fixtureSnapshot(normalized);
  }
  // TTL-fresh cache: serve instantly, no provider call.
  if (cached && (cached.cacheAgeMinutes ?? 999) * 60_000 < config.market.cacheTtlMs) {
    return { ...cached, liveAttempted: false };
  }
  try {
    const live = await yahooLive(normalized);
    writeCacheFile(live);
    return { ...live, cacheHit: false, cacheAgeMinutes: 0 };
  } catch (err) {
    const liveError = err instanceof Error ? err.message : String(err);
    try {
      const closeOnly = await yahooSparkLive(normalized);
      writeCacheFile(closeOnly);
      return { ...closeOnly, cacheHit: false, cacheAgeMinutes: 0, liveError: `Full OHLCV route unavailable: ${liveError}` };
    } catch (sparkErr) {
      const sparkError = sparkErr instanceof Error ? sparkErr.message : String(sparkErr);
      const combinedError = `${liveError} | close-only fallback: ${sparkError}`;
      if (cached) {
        return { ...cached, liveAttempted: true, liveError: combinedError };
      }
      if (normalized === "RELIANCE.NS") {
        const fixture = fixtureSnapshot(normalized);
        return { ...fixture, liveAttempted: true, liveError: combinedError };
      }
      throw new Error(`Live quote unavailable for ${normalized}; no same-symbol cached quote exists. ${combinedError}`);
    }
  }
}

export { fixtureSnapshot };
