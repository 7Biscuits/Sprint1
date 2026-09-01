import type { Profile, Scenario, Stock } from "../types";
import { Badge, Card } from "./ui";

const SCENARIOS: { id: Scenario; label: string; hint: string }[] = [
  { id: "normal", label: "Normal", hint: "Primary happy path" },
  { id: "missing_news", label: "Missing news", hint: "Degraded: news feed unavailable → confidence ≤65" },
  { id: "missing_filing", label: "Missing filings", hint: "Degraded: corpus unavailable → action capped at WAIT" },
  { id: "conflict", label: "Conflicting signals", hint: "Prepared conflict → banner + confidence ≤60" },
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
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2"><Badge tone="sky">{symbol}</Badge><span className="text-xs text-slate-400">research universe</span></div>
        {lockedSnapshotId && (
          <Badge tone="violet">snapshot locked · {lockedSnapshotId}</Badge>
        )}
      </div>

      <div className="mt-3">
        <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Choose a company</div>
        <div className="flex flex-wrap gap-1.5">
          {stocks.map((stock) => (
            <button
              key={stock.symbol}
              onClick={() => onSymbolChange(stock.symbol)}
              aria-pressed={stock.symbol === symbol}
              title={`${stock.name} · ${stock.sector}`}
              className={`rounded-lg border px-2.5 py-1.5 text-left text-[11px] transition ${stock.symbol === symbol ? "border-sky-500/70 bg-sky-500/15 text-sky-200" : "border-slate-700 bg-slate-950/50 text-slate-400 hover:border-slate-500 hover:text-slate-200"}`}
            >
              <span className="font-mono font-semibold">{stock.symbol.replace(".NS", "")}</span><span className="ml-1 text-slate-500">{stock.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {profiles.map((p) => {
          const active = p.id === profileId;
          const reliance = p.holdings.find((h) => h.symbol === symbol)?.weightPct ?? 0;
          return (
            <button
              key={p.id}
              onClick={() => onProfileChange(p.id)}
              aria-pressed={active}
              className={`rounded-xl border p-3 text-left transition ${
                active
                  ? "border-sky-500/70 bg-sky-500/10 shadow shadow-sky-900/30"
                  : "border-slate-800 bg-slate-900/40 hover:border-slate-600"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{p.name}</span>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${p.riskTolerance === "conservative" ? "bg-amber-500/15 text-amber-300" : "bg-emerald-500/15 text-emerald-300"}`}>
                  {p.riskTolerance}
                </span>
              </div>
              <div className="mt-1 font-mono text-[11px] text-slate-400">
                {symbol}: <span className={reliance >= 40 ? "text-rose-300" : "text-emerald-300"}>{reliance}%</span> · ₹{p.portfolioValueInr.toLocaleString("en-IN")} · {p.horizon}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label htmlFor="scenario" className="text-xs text-slate-400">demo scenario</label>
        <select
          id="scenario"
          value={scenario}
          onChange={(e) => onScenarioChange(e.target.value as Scenario)}
          className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-200"
        >
          {SCENARIOS.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
        <span className="text-[11px] text-slate-500">{SCENARIOS.find((s) => s.id === scenario)?.hint}</span>
        <button
          onClick={onRun}
          disabled={running}
          className="ml-auto rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-wait disabled:opacity-60"
        >
          {running ? "Analyzing…" : lockedSnapshotId ? "Re-run on locked snapshot" : "Run analysis"}
        </button>
      </div>
    </Card>
  );
}
