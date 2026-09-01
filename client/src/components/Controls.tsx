import type { Profile, Scenario, Stock } from "../types";
import { Badge, Card } from "./ui";

const SCENARIOS: { id: Scenario; label: string; icon: string; hint: string }[] = [
  { id: "normal", label: "Happy Path", icon: "✨", hint: "Full 3-agent parallel synthesis" },
  { id: "missing_news", label: "Missing News", icon: "📰", hint: "News unavailable → confidence capped ≤65%" },
  { id: "missing_filing", label: "Missing Filings", icon: "📑", hint: "Filings unavailable → action capped at WAIT" },
  { id: "conflict", label: "Signal Conflict", icon: "⚡", hint: "Bullish vs Bearish conflict → confidence capped ≤60%" },
];

export function Controls({
  profiles,
  stocks,
  profileId,
  symbol,
  scenario,
  running,
  lockedSnapshotId,
  onProfileChange,
  onSymbolChange,
  onScenarioChange,
  onRun,
}: {
  profiles: Profile[];
  stocks: Stock[];
  profileId: string;
  scenario: Scenario;
  running: boolean;
  symbol: string;
  lockedSnapshotId?: string;
  onProfileChange: (id: string) => void;
  onSymbolChange: (symbol: string) => void;
  onScenarioChange: (s: Scenario) => void;
  onRun: () => void;
}) {
  return (
    <Card className="p-5">
      {/* 1. Ticker Selection Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-3.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
            Research Universe
          </span>
          <Badge tone="sky" dot>
            {symbol}
          </Badge>
        </div>
        {lockedSnapshotId && (
          <Badge tone="violet" dot>
            LOCKED SNAPSHOT: {lockedSnapshotId}
          </Badge>
        )}
      </div>

      <div className="mt-3.5 flex flex-wrap gap-2">
        {stocks.map((stock) => {
          const isSelected = stock.symbol === symbol;
          return (
            <button
              key={stock.symbol}
              onClick={() => onSymbolChange(stock.symbol)}
              aria-pressed={isSelected}
              className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-left text-xs transition-all duration-200 ${
                isSelected
                  ? "border-zinc-300 bg-white text-black font-bold shadow-lg shadow-white/10"
                  : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
              }`}
            >
              <span className="font-mono">{stock.symbol.replace(".NS", "")}</span>
              <span className={`text-[10px] ${isSelected ? "text-zinc-700" : "text-zinc-500"}`}>
                {stock.sector}
              </span>
            </button>
          );
        })}
      </div>

      {/* 2. Investor Profiles */}
      <div className="mt-4">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
          Investor Profile & Behavioral Rules
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {profiles.map((p) => {
            const isSelected = p.id === profileId;
            const targetHoldingPct = p.holdings.find((h) => h.symbol === symbol)?.weightPct ?? 0;
            const isHighConcentration = targetHoldingPct >= 40;

            return (
              <button
                key={p.id}
                onClick={() => onProfileChange(p.id)}
                aria-pressed={isSelected}
                className={`relative flex flex-col justify-between rounded-xl border p-4 text-left transition-all duration-200 ${
                  isSelected
                    ? "border-sky-500/80 bg-zinc-900/90 shadow-xl shadow-sky-950/20 ring-1 ring-sky-500/40"
                    : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-zinc-100">{p.name}</span>
                    <Badge tone={p.riskTolerance === "conservative" ? "amber" : "green"}>
                      {p.riskTolerance} · {p.horizon}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-zinc-400 leading-relaxed line-clamp-2">
                    {p.description}
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between border-t border-zinc-800/80 pt-2.5 text-xs font-mono">
                  <span className="text-zinc-400">
                    Portfolio: <b className="text-zinc-200">₹{(p.portfolioValueInr / 1e5).toFixed(1)} L</b>
                  </span>
                  <span className="text-zinc-400">
                    {symbol.replace(".NS", "")} Weight:{" "}
                    <b className={isHighConcentration ? "text-rose-400" : "text-emerald-400"}>
                      {targetHoldingPct}%
                    </b>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Scenario & CTA */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800/80 pt-3.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mr-1">
            Scenario:
          </span>
          {SCENARIOS.map((s) => {
            const isSelected = scenario === s.id;
            return (
              <button
                key={s.id}
                onClick={() => onScenarioChange(s.id)}
                aria-pressed={isSelected}
                title={s.hint}
                className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
                  isSelected
                    ? "border-zinc-400 bg-zinc-200 text-black shadow-sm"
                    : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Hero CTA Button */}
        <button
          onClick={onRun}
          disabled={running}
          className="cred-button-primary inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs uppercase tracking-wider disabled:cursor-wait disabled:opacity-60"
        >
          <span>⚡</span>
          <span>
            {running
              ? "Synthesizing in Parallel…"
              : lockedSnapshotId
              ? "Re-Run Locked Snapshot"
              : "Synthesize Briefing"}
          </span>
          <span className="hidden rounded bg-black/10 px-1 py-0.5 text-[9px] font-mono sm:inline">
            Space
          </span>
        </button>
      </div>
    </Card>
  );
}
