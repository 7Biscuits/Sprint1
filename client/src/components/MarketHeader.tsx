import { useState } from "react";
import type { AnalyzeResponse } from "../types";
import { Badge, Card } from "./ui";
import { InteractiveMarketChart } from "./InteractiveMarketChart";

export function MarketHeader({ r, showChartDefault = true }: { r: AnalyzeResponse; showChartDefault?: boolean }) {
  const [showChart, setShowChart] = useState(showChartDefault);
  const s = r.snapshot;
  const live = s.mode === "live";
  const ind = r.indicators;

  const chips = [
    { label: "RSI (14)", value: String(ind.rsi14), note: ind.rsi14 >= 70 ? "Overbought" : ind.rsi14 <= 30 ? "Oversold" : "Neutral", tone: ind.rsi14 >= 70 ? "text-amber-400" : ind.rsi14 <= 30 ? "text-sky-400" : "text-zinc-100" },
    { label: "MA 20", value: `₹${ind.ma20}`, note: ind.price >= ind.ma20 ? "Above MA20" : "Below MA20", tone: ind.price >= ind.ma20 ? "text-emerald-400" : "text-rose-400" },
    { label: "MA 50", value: `₹${ind.ma50}`, note: ind.price >= ind.ma50 ? "Above MA50" : "Below MA50", tone: ind.price >= ind.ma50 ? "text-emerald-400" : "text-rose-400" },
    { label: "30D Return", value: `${ind.return30dPct >= 0 ? "+" : ""}${ind.return30dPct}%`, note: "Momentum", tone: ind.return30dPct >= 0 ? "text-emerald-400" : "text-rose-400" },
    { label: "Volume Ratio", value: ind.volumeAvailable ? `${ind.volumeRatio}×` : "N/A", note: ind.volumeAvailable ? "vs 20d avg" : "Close only", tone: "text-zinc-100" },
    { label: "Bars Count", value: `${ind.pointsUsed}`, note: "Trading days", tone: "text-zinc-100" },
  ];

  return (
    <Card className="p-5">
      {/* Top Banner: Price + Status */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-baseline gap-3">
            <h2 className="text-2xl font-black tracking-tight text-white">{s.symbol}</h2>
            <span
              className={`inline-flex items-center gap-1.5 font-mono text-xl font-bold ${
                s.changePct >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              ₹{s.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              <span className="text-xs font-semibold">
                {s.changePct >= 0 ? "▲" : "▼"} {Math.abs(s.changePct)}%
              </span>
            </span>
            <button
              onClick={() => setShowChart(!showChart)}
              className="rounded-lg border border-zinc-700 bg-zinc-800/80 px-2.5 py-1 text-xs font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-white"
            >
              {showChart ? "Hide Chart" : "Show Chart"}
            </button>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
            <Badge tone={live ? "green" : "amber"} dot>
              {live ? "LIVE DATA" : "CACHED SNAPSHOT"}
            </Badge>
            {s.dataQuality === "close_only" && <Badge tone="amber">CLOSE-ONLY</Badge>}
            <span>{s.source}</span>
            <span>·</span>
            <span>Fetched <span className="font-mono text-zinc-300">{s.fetchedAt.slice(11, 19)}</span></span>
            <span>·</span>
            <span>Last bar <span className="font-mono text-zinc-300">{s.snapshotDate}</span></span>
          </div>

          {!live && s.liveAttempted && s.liveError && (
            <div className="mt-2 text-xs text-amber-300/90">
              Live provider timed out ({s.liveError.slice(0, 80)}) — served from verified fallback snapshot.
            </div>
          )}
          {!live && s.cacheHit && typeof s.cacheAgeMinutes === "number" && (
            <div className="mt-2 text-xs text-zinc-400">
              Response cache hit ({s.cacheAgeMinutes < 1 ? "<1" : s.cacheAgeMinutes} min old, TTL 15 min).
            </div>
          )}
        </div>

        {/* 6 Key Technical Chips */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
          {chips.map((c) => (
            <div
              key={c.label}
              className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-2.5 text-right shadow-inner"
            >
              <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-500">{c.label}</div>
              <div className={`mt-0.5 font-mono text-sm font-bold ${c.tone}`}>{c.value}</div>
              <div className="text-[9px] text-zinc-500 truncate">{c.note}</div>
            </div>
          ))}
        </div>
      </div>

      {showChart && (
        <div className="mt-4">
          <InteractiveMarketChart r={r} />
        </div>
      )}
    </Card>
  );
}
