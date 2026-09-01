import type { AnalyzeResponse } from "../types";
import { Badge, Card, RadialGauge } from "./ui";

function signed(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function Metric({
  label,
  value,
  note,
  tone = "text-zinc-100",
}: {
  label: string;
  value: string;
  note: string;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3.5 shadow-inner">
      <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-500">{label}</div>
      <div className={`mt-1 font-mono text-lg font-black ${tone}`}>{value}</div>
      <div className="mt-0.5 text-[10px] text-zinc-400">{note}</div>
    </div>
  );
}

export function AnalyticsPanel({ r }: { r: AnalyzeResponse }) {
  const i = r.indicators;
  const completed = r.agents.filter((agent) => agent.status === "complete").length;
  const cited = r.agents.reduce((sum, agent) => sum + agent.citations.length, 0);
  const coverage = Math.round((completed / r.agents.length) * 100);

  const trendTone =
    i.maRelation === "above_both"
      ? "text-emerald-400"
      : i.maRelation === "below_both"
      ? "text-rose-400"
      : "text-amber-400";

  const volatilityTone =
    i.volatility20dPct > 35
      ? "text-rose-400"
      : i.volatility20dPct > 22
      ? "text-amber-400"
      : "text-emerald-400";

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Price & Risk Lens */}
      <Card className="lg:col-span-2 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
              Quantitative Metrics
            </span>
            <h3 className="text-sm font-bold text-zinc-100">Deterministic Price & Risk Lens</h3>
          </div>
          <Badge tone="sky">NO PRICE TARGET · NO EXECUTION</Badge>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Metric
            label="90-Day Return"
            value={signed(i.return90dPct)}
            note="Medium-term swing"
            tone={i.return90dPct >= 0 ? "text-emerald-400" : "text-rose-400"}
          />
          <Metric
            label="20D Volatility"
            value={`${i.volatility20dPct}%`}
            note="Annualized daily swings"
            tone={volatilityTone}
          />
          <Metric
            label="6M Drawdown"
            value={signed(i.drawdownFromHighPct)}
            note={`Peak ₹${i.high6m.toLocaleString("en-IN")}`}
            tone={i.drawdownFromHighPct >= -8 ? "text-emerald-400" : "text-rose-400"}
          />
          <Metric
            label="Range Position"
            value={`${i.rangePositionPct}%`}
            note={`Trough ₹${i.low6m.toLocaleString("en-IN")}`}
            tone={i.rangePositionPct >= 60 ? "text-emerald-400" : "text-amber-400"}
          />
        </div>

        {/* 6-Month Range Slider */}
        <div className="mt-4 rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-3.5">
          <div className="flex justify-between text-[9px] uppercase tracking-[0.15em] text-zinc-500 font-bold">
            <span>6-Month Price Corridor</span>
            <span className="font-mono text-zinc-400">₹{i.low6m.toLocaleString("en-IN")} — ₹{i.high6m.toLocaleString("en-IN")}</span>
          </div>
          <div className="mt-2.5 relative h-2 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 via-sky-400 to-emerald-400"
              style={{ width: `${Math.max(3, Math.min(100, i.rangePositionPct))}%` }}
            />
          </div>
          <div className="mt-2.5 flex flex-wrap justify-between gap-2 text-xs text-zinc-400">
            <span>Trend: <b className={`font-mono ${trendTone}`}>{i.maRelation.replace("_", " ").toUpperCase()}</b></span>
            <span>RSI(14): <b className="font-mono text-zinc-200">{i.rsi14}</b></span>
            <span>Volume: <b className="font-mono text-zinc-200">{i.volumeAvailable ? `${i.volumeRatio}×` : "N/A"}</b> {i.volumeAvailable ? "(20d avg)" : ""}</span>
          </div>
        </div>
      </Card>

      {/* Multi-Agent Coverage */}
      <Card className="flex flex-col justify-between p-5">
        <div>
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                Grounding Quality
              </span>
              <h3 className="text-sm font-bold text-zinc-100">Evidence Coverage</h3>
            </div>
            <Badge tone={coverage === 100 ? "green" : "amber"} dot>
              {coverage}% ACTIVE
            </Badge>
          </div>

          <div className="mt-4 flex items-center gap-4 rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-3.5">
            <RadialGauge
              value={coverage}
              size={60}
              strokeWidth={5}
              tone={coverage === 100 ? "emerald" : "amber"}
              label="Active"
            />
            <div className="space-y-1 text-xs text-zinc-300">
              <div>
                <b className="text-sky-400 font-mono text-sm">{completed}/3</b> Agents Active
              </div>
              <div className="text-[11px] text-zinc-400">
                <b className="text-zinc-200">{cited}</b> source citations
              </div>
              <div className="text-[11px] text-zinc-400">
                <b className="text-zinc-200">{r.synthesis.citedClaimCount}</b> verified claims
              </div>
            </div>
          </div>

          <div className="mt-3.5 space-y-2">
            {r.agents.map((agent) => (
              <div
                key={agent.agent}
                className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-1.5 text-xs"
              >
                <span className="capitalize font-medium text-zinc-300">{agent.agent}</span>
                <span
                  className={`font-mono text-[11px] font-semibold ${
                    agent.status === "complete" ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {agent.status === "complete" ? `${agent.citations.length} citations` : "unavailable"}
                </span>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-3 border-t border-zinc-800/80 pt-2 text-[10px] text-zinc-500">
          Strict confidence caps are automatically enforced when an evidence stream is unavailable.
        </p>
      </Card>
    </div>
  );
}
