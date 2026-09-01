import type { AnalyzeResponse, Decision } from "../types";
import { ACTION_STYLE, Badge, Card, ConfidenceBar, SignalPill } from "./ui";

export function ConflictBanner({ r }: { r: AnalyzeResponse }) {
  if (!r.synthesis.conflict.flag || !r.synthesis.conflict.bannerText) return null;
  return (
    <div className="rounded-xl border border-amber-600/60 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-200" role="alert">
      <span className="mr-2 font-bold uppercase">Conflict</span>
      {r.synthesis.conflict.bannerText}
    </div>
  );
}

export function FinalPanel({
  r,
  decision,
  decisionStatus,
  onDecide,
}: {
  r: AnalyzeResponse;
  decision: Decision | null;
  decisionStatus: string | null;
  onDecide: (d: Decision) => void;
}) {
  const s = r.synthesis;
  return (
    <Card className="border-slate-700">
      <ConflictBanner r={r} />

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        {/* Market outlook — the factual layer */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Market outlook · evidence-weighted</h3>
            <Badge tone="slate">factual layer</Badge>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <SignalPill signal={s.outlook.label} />
            <span className="font-mono text-xs text-slate-400">direction score {s.outlook.directionScore >= 0 ? "+" : ""}{s.outlook.directionScore}</span>
          </div>
          <div className="mt-2">
            <ConfidenceBar value={s.outlook.confidence} />
            <div className="mt-1 text-[10px] text-slate-500">{s.outlook.confidence}% confidence</div>
          </div>
          <div className="mt-2 space-y-1 font-mono text-[10px] text-slate-400">
            {s.outlook.contributions.map((c) => (
              <div key={c.agent} className="flex justify-between">
                <span>{c.agent.padEnd(10)} {String(c.weightPct).padStart(2)}% × {c.signal}</span>
                <span className={c.contribution > 0 ? "text-emerald-400" : c.contribution < 0 ? "text-rose-400" : ""}>
                  {c.contribution >= 0 ? "+" : ""}{c.contribution.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Profile action — the policy layer */}
        <div className={`rounded-xl border p-3 ${ACTION_STYLE[s.action.code] ?? "border-slate-800"}`}>
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider opacity-80">Your action · policy-based</h3>
            <Badge tone="slate">personalized layer</Badge>
          </div>
          <div className="mt-2 text-2xl font-black tracking-tight">{s.action.label}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
            <span className="rounded bg-slate-950/40 px-1.5 py-0.5 font-mono">rule {s.action.ruleId}</span>
            <span>final confidence {s.action.confidence}%</span>
            <span className="font-mono text-slate-400">fingerprint {r.rawSignalFingerprint}</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed opacity-90">{s.action.reason}</p>
        </div>
      </div>

      {s.capsApplied.length > 0 && (
        <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/60 p-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Confidence caps applied</div>
          <ul className="mt-1 space-y-0.5 text-[11px] text-slate-400">
            {s.capsApplied.map((c, i) => (
              <li key={i}>• {c.reason} <span className="font-mono text-slate-500">[cap {c.cap}]</span></li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-400">Demo decision:</span>
        <button
          onClick={() => onDecide("will_review")}
          disabled={decision !== null}
          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
            decision === "will_review" ? "border-sky-500 bg-sky-500/20 text-sky-200" : "border-slate-700 text-slate-300 hover:border-sky-500/60"
          } disabled:opacity-80`}
        >
          I will review
        </button>
        <button
          onClick={() => onDecide("dismissed")}
          disabled={decision !== null}
          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
            decision === "dismissed" ? "border-slate-500 bg-slate-700/40 text-slate-200" : "border-slate-700 text-slate-300 hover:border-slate-500"
          } disabled:opacity-80`}
        >
          Dismiss
        </button>
        {decisionStatus && <span className="text-[11px] text-emerald-400">{decisionStatus}</span>}
      </div>

      <div className="mt-3 space-y-1 border-t border-slate-800 pt-2 text-[10px] leading-relaxed text-slate-500">
        <p>
          <span className="font-bold uppercase text-slate-400">Research support only.</span> No trade execution, no price
          prediction, no guaranteed or certain-profit language, ever. The action says what to investigate — not what to trade.
        </p>
        <p>
          <span className="font-bold uppercase text-slate-400">No-fabrication rule:</span> agents reference only retrieved
          citation ids ({s.citedClaimCount}/{s.claimCount} claims cited; {s.citationCount} citations). Uncited claims are dropped
          server-side. Data freshness and source are always labelled above.
        </p>
      </div>
    </Card>
  );
}
