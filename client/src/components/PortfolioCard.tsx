import type { AnalyzeResponse, Profile } from "../types";
import { Badge, Card } from "./ui";
import { PortfolioDonutChart } from "./PortfolioDonutChart";

export function PortfolioCard({ profile, r }: { profile: Profile; r: AnalyzeResponse }) {
  const c = r.synthesis.concentration;
  const isHighConcentration = c.symbolWeightPct >= 40;
  const isModerateConcentration = c.symbolWeightPct >= 20 && c.symbolWeightPct < 40;

  return (
    <Card className="flex flex-col justify-between p-5">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
              Investor Context
            </span>
            <h3 className="text-sm font-bold text-zinc-100">{profile.name}</h3>
          </div>
          <Badge tone={profile.riskTolerance === "conservative" ? "amber" : "green"}>
            {profile.riskTolerance} · {profile.horizon}
          </Badge>
        </div>

        {/* Donut Allocation Chart */}
        <div className="mt-4 rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-400">
              Asset Mix
            </span>
            <span className="font-mono text-xs font-semibold text-zinc-300">
              ₹{(profile.portfolioValueInr / 1e5).toFixed(1)} L Total
            </span>
          </div>
          <PortfolioDonutChart profile={profile} activeSymbol={r.symbol} />
        </div>

        {/* Holdings Breakdown */}
        <div className="mt-4 space-y-2">
          <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-400">
            Current Holdings ({profile.holdings.length} Assets)
          </div>
          <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
            {profile.holdings.map((h) => {
              const isFocus = h.symbol === r.symbol;
              return (
                <div
                  key={h.symbol}
                  className={`rounded-lg p-2 transition-all ${
                    isFocus
                      ? "border border-sky-500/40 bg-sky-500/10"
                      : "border border-zinc-800/60 bg-zinc-950/30"
                  }`}
                >
                  <div className="flex items-baseline justify-between text-xs">
                    <span className={isFocus ? "font-bold text-sky-300" : "text-zinc-300"}>
                      {h.name}{" "}
                      <span className="font-mono text-[10px] text-zinc-500">({h.symbol})</span>
                    </span>
                    <span className={`font-mono text-[11px] ${isFocus ? "font-bold text-sky-300" : "text-zinc-400"}`}>
                      {h.weightPct}% · ₹{h.valueInr.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className={`h-full rounded-full ${
                        isFocus ? "bg-sky-400 shadow-[0_0_8px_#38bdf8]" : "bg-zinc-600"
                      }`}
                      style={{ width: `${h.weightPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Concentration Stats */}
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div
            className={`rounded-xl border p-2.5 ${
              isHighConcentration
                ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
                : isModerateConcentration
                ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
            }`}
          >
            <div className="text-[9px] font-bold uppercase tracking-[0.15em] opacity-80">{r.symbol.replace(".NS", "")}</div>
            <div className="font-mono text-base font-black">{c.symbolWeightPct}%</div>
            <div className="text-[9px] opacity-75">
              {isHighConcentration ? "High Concentration" : "Within Cap"}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-2.5">
            <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-500">HHI Score</div>
            <div className="font-mono text-base font-black text-zinc-100">{c.hhi}</div>
            <div className="text-[9px] text-zinc-500">
              {c.hhi > 2500 ? "Concentrated" : c.hhi > 1500 ? "Moderate" : "Diversified"}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-2.5">
            <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-500">Surplus</div>
            <div className="font-mono text-base font-black text-zinc-100">
              ₹{(profile.monthlySurplusInr / 1e3).toFixed(0)}k
            </div>
            <div className="text-[9px] text-zinc-500">monthly flow</div>
          </div>
        </div>
      </div>

      <p className="mt-3 border-t border-zinc-800/80 pt-2 text-[10px] text-zinc-500">
        Stored risk parameters and holdings represent the behavioral profile. Anonymous demo IDs only.
      </p>
    </Card>
  );
}
