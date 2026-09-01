import type { AnalyzeResponse, Profile } from "../types";
import { Badge, Card } from "./ui";

export function PortfolioCard({ profile, r }: { profile: Profile; r: AnalyzeResponse }) {
  const c = r.synthesis.concentration;
  let cursor = 0;
  const colors = ["#38bdf8", "#8b5cf6", "#34d399", "#f59e0b", "#fb7185", "#64748b"];
  const allocationGradient = `conic-gradient(${profile.holdings.map((h, index) => {
    const start = cursor;
    cursor += h.weightPct;
    return `${colors[index % colors.length]} ${start}% ${cursor}%`;
  }).join(", ")})`;
  return (
    <Card>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold">Portfolio state</h3>
        <Badge tone={profile.riskTolerance === "conservative" ? "amber" : "green"}>{profile.riskTolerance} · {profile.horizon}</Badge>
      </div>
      <p className="mt-0.5 text-[11px] text-slate-500">{profile.description}</p>

      <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-2.5">
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full" style={{ background: allocationGradient }}><div className="h-10 w-10 rounded-full bg-slate-900" /></div>
        <div><div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Allocation mix</div><p className="mt-1 text-[11px] leading-relaxed text-slate-400">{profile.holdings.length} holdings · largest position <span className="font-semibold text-slate-200">{Math.max(...profile.holdings.map((h) => h.weightPct))}%</span>. The highlighted slice is the company under review.</p></div>
      </div>

      <div className="mt-3 space-y-1.5">
        {profile.holdings.map((h) => {
          const focus = h.symbol === r.symbol;
          return (
            <div key={h.symbol} className={focus ? "rounded-lg bg-sky-500/5 p-1" : "p-1"}>
              <div className="flex items-baseline justify-between text-[11px]">
                <span className={focus ? "font-semibold text-sky-300" : "text-slate-300"}>{h.name} <span className="font-mono text-slate-500">{h.symbol}</span></span>
                <span className={`font-mono ${focus ? "text-sky-300" : "text-slate-400"}`}>{h.weightPct}% · ₹{h.valueInr.toLocaleString("en-IN")}</span>
              </div>
              <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-slate-800">
                <div className={`h-full rounded-full ${focus ? "bg-sky-500" : "bg-slate-600"}`} style={{ width: `${h.weightPct}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2">
          <div className="text-[10px] uppercase text-slate-500">{r.symbol}</div>
          <div className={`font-mono text-sm font-bold ${c.symbolWeightPct >= 40 ? "text-rose-300" : "text-emerald-300"}`}>{c.symbolWeightPct}%</div>
          <div className="text-[9px] text-slate-500">concentration</div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2">
          <div className="text-[10px] uppercase text-slate-500">HHI score</div>
          <div className="font-mono text-sm font-bold text-slate-200">{c.hhi}</div>
          <div className="text-[9px] text-slate-500">of 10,000 max</div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2">
          <div className="text-[10px] uppercase text-slate-500">Portfolio</div>
          <div className="font-mono text-sm font-bold text-slate-200">₹{(c.portfolioValueInr / 100000).toFixed(1)} L</div>
          <div className="text-[9px] text-slate-500">total value</div>
        </div>
      </div>
      <p className="mt-2 text-[10px] text-slate-500">
        Stored risk parameters + holdings are the behavioral profile this sprint; historical interaction patterns are explicitly
        not modelled (disclosed per PRD §9). Anonymous demo ids only — no real holdings or PII.
      </p>
    </Card>
  );
}
