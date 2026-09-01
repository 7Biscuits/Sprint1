import type { AnalyzeResponse } from "../types";
import { Badge, Card } from "./ui";
import { Sparkline } from "./Sparkline";

export function MarketHeader({ r }: { r: AnalyzeResponse }) {
  const s = r.snapshot;
  const live = s.mode === "live";
  const ind = r.indicators;
  const chips = [
    ["RSI(14)", String(ind.rsi14)],
    ["MA20", `₹${ind.ma20}`],
    ["MA50", `₹${ind.ma50}`],
    ["30-day return", `${ind.return30dPct >= 0 ? "+" : ""}${ind.return30dPct}%`],
    ["Volume vs 20d avg", ind.volumeAvailable ? `${ind.volumeRatio}×` : "not supplied"],
    ["Bars", `${ind.pointsUsed}`],
  ] as const;
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-baseline gap-2">
            <h2 className="text-xl font-bold tracking-tight">{s.symbol}</h2>
            <span className={`text-lg font-semibold ${s.changePct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              ₹{s.price.toLocaleString("en-IN")}{" "}
              <span className="text-sm">{s.changePct >= 0 ? "▲" : "▼"} {Math.abs(s.changePct)}%</span>
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
            <Badge tone={live ? "green" : "amber"}>{live ? "● LIVE" : "⏻ CACHED"}</Badge>
            {s.dataQuality === "close_only" && <Badge tone="amber">CLOSE-ONLY</Badge>}
            <span>{s.source}</span>
            <span>· fetched/frozen</span>
            <span className="font-mono text-slate-300">{s.fetchedAt}</span>
            <span>· last bar</span>
            <span className="font-mono text-slate-300">{s.snapshotDate}</span>
          </div>
          {!live && s.liveAttempted && s.liveError && (
            <div className="mt-1 text-[11px] text-amber-400/90">
              Live provider attempt failed ({s.liveError.slice(0, 90)}) — served from declared fallback; never shown as live.
            </div>
          )}
          {!live && s.cacheHit && typeof s.cacheAgeMinutes === "number" && (
            <div className="mt-1 text-[11px] text-slate-400">
              Response cache hit — provider not re-called; snapshot is {s.cacheAgeMinutes < 1 ? "<1" : s.cacheAgeMinutes} min old (TTL 15 min).
            </div>
          )}
          {s.identicalSnapshotReused && (
            <div className="mt-1 text-[11px] text-violet-300">
              Identical locked snapshot reused for this profile run — same inputs as the previous analysis (id {s.snapshotId}).
            </div>
          )}
        </div>
        <div className="min-w-[220px] flex-1">
          <Sparkline closes={s.closesPreview} />
        </div>
        <div className="grid grid-cols-3 gap-1.5 text-right">
          {chips.map(([k, v]) => (
            <div key={k} className="rounded-lg border border-slate-800 bg-slate-950/60 px-2 py-1">
              <div className="text-[10px] uppercase tracking-wide text-slate-500">{k}</div>
              <div className="font-mono text-xs text-slate-200">{v}</div>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-2 text-[10px] text-slate-500">
        Indicators are calculated server-side from the returned market series (no model arithmetic). Close-only fallback supports trend and risk calculations but intentionally withholds volume/OHLC claims.
      </p>
    </Card>
  );
}
