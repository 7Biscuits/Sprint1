import type { AnalyzeResponse } from "../types";
import { Badge, Card } from "./ui";

function signed(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function Metric({ label, value, note, tone = "text-slate-100" }: { label: string; value: string; note: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`mt-1 font-mono text-lg font-bold ${tone}`}>{value}</div>
      <div className="mt-0.5 text-[10px] text-slate-500">{note}</div>
    </div>
  );
}

/** A decision-oriented view of the actual OHLCV calculations, not a prediction. */
export function AnalyticsPanel({ r }: { r: AnalyzeResponse }) {
  const i = r.indicators;
  const completed = r.agents.filter((agent) => agent.status === "complete").length;
  const cited = r.agents.reduce((sum, agent) => sum + agent.citations.length, 0);
  const coverage = Math.round((completed / r.agents.length) * 100);
  const evidenceGradient = `conic-gradient(#38bdf8 0 ${coverage}%, #334155 ${coverage}% 100%)`;
  const trendTone = i.maRelation === "above_both" ? "text-emerald-300" : i.maRelation === "below_both" ? "text-rose-300" : "text-amber-300";
  const volatilityTone = i.volatility20dPct > 35 ? "text-rose-300" : i.volatility20dPct > 22 ? "text-amber-300" : "text-emerald-300";

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold">Price & risk lens</h3>
            <p className="text-[11px] text-slate-500">Calculated from the returned {i.pointsUsed}-session {r.snapshot.dataQuality === "close_only" ? "closing-price" : "OHLCV"} series.</p>
          </div>
          <Badge tone="sky">no price target · no execution</Badge>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
          <Metric label="90-day return" value={signed(i.return90dPct)} note="medium-term momentum" tone={i.return90dPct >= 0 ? "text-emerald-300" : "text-rose-300"} />
          <Metric label="20d volatility" value={`${i.volatility20dPct}%`} note="annualised daily swings" tone={volatilityTone} />
          <Metric label="6-month drawdown" value={signed(i.drawdownFromHighPct)} note={`high ₹${i.high6m.toLocaleString("en-IN")}`} tone={i.drawdownFromHighPct >= -8 ? "text-emerald-300" : "text-rose-300"} />
          <Metric label="Range position" value={`${i.rangePositionPct}%`} note={`low ₹${i.low6m.toLocaleString("en-IN")}`} tone={i.rangePositionPct >= 60 ? "text-emerald-300" : "text-amber-300"} />
        </div>
        <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
          <div className="flex justify-between text-[10px] uppercase tracking-wider text-slate-500"><span>6-month price range</span><span>₹{i.low6m.toLocaleString("en-IN")} — ₹{i.high6m.toLocaleString("en-IN")}</span></div>
          <div className="mt-2 h-2 rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 via-sky-500 to-emerald-400" style={{ width: `${Math.max(2, Math.min(100, i.rangePositionPct))}%` }} /></div>
          <div className="mt-2 flex flex-wrap justify-between gap-2 text-[11px] text-slate-400"><span>Trend: <b className={trendTone}>{i.maRelation.replace("_", " ")}</b></span><span>RSI 14: <b className="text-slate-200">{i.rsi14}</b></span><span>Volume: <b className="text-slate-200">{i.volumeAvailable ? `${i.volumeRatio}×` : "not supplied"}</b>{i.volumeAvailable ? " 20-day average" : ""}</span></div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between"><h3 className="text-sm font-bold">Evidence coverage</h3><Badge tone={coverage === 100 ? "green" : "amber"}>{coverage}% available</Badge></div>
        <div className="mt-4 flex items-center gap-4">
          <div className="grid h-24 w-24 shrink-0 place-items-center rounded-full" style={{ background: evidenceGradient }}>
            <div className="grid h-16 w-16 place-items-center rounded-full bg-slate-900 text-center"><span className="font-mono text-lg font-bold">{completed}/3</span><span className="-mt-1 text-[9px] text-slate-500">agents</span></div>
          </div>
          <div className="space-y-1 text-[11px] text-slate-400"><p><b className="text-sky-300">{cited}</b> linked sources</p><p><b className="text-slate-200">{r.synthesis.citedClaimCount}</b> cited claims</p><p>Confidence is automatically capped when an evidence stream is unavailable.</p></div>
        </div>
        <div className="mt-3 space-y-1.5">{r.agents.map((agent) => <div key={agent.agent} className="flex items-center justify-between text-[11px]"><span className="capitalize text-slate-400">{agent.agent}</span><span className={agent.status === "complete" ? "text-emerald-300" : "text-amber-300"}>{agent.status === "complete" ? `${agent.citations.length} sources` : "unavailable"}</span></div>)}</div>
      </Card>
    </div>
  );
}
