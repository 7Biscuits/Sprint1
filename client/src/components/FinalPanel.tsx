import confetti from "canvas-confetti";
import type { AnalyzeResponse, Decision } from "../types";
import { ACTION_STYLE, Badge, Card, ConfidenceBar, SignalPill } from "./ui";

export function ConflictBanner({ r }: { r: AnalyzeResponse }) {
  if (!r.synthesis.conflict.flag || !r.synthesis.conflict.bannerText) return null;
  return (
    <div
      className="mb-4 rounded-xl border border-rose-500/50 bg-rose-500/10 p-3.5 text-xs text-rose-200"
      role="alert"
    >
      <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-rose-400">
        <span>⚠️ Conflict Detected</span>
        <Badge tone="rose">CONFIDENCE CAPPED AT 60%</Badge>
      </div>
      <p className="mt-1 text-zinc-300 leading-relaxed">{r.synthesis.conflict.bannerText}</p>
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

  const handleReview = () => {
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.75 },
      colors: ["#38bdf8", "#34d399", "#ffffff", "#f59e0b"],
    });
    onDecide("will_review");
  };

  const handleDismiss = () => {
    onDecide("dismissed");
  };

  return (
    <Card className="p-5">
      <ConflictBanner r={r} />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Layer 1: Market Outlook (Factual Signal) */}
        <div className="flex flex-col justify-between rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-4.5">
          <div>
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                  Layer 1 · Factual Signal
                </span>
                <h3 className="mt-0.5 text-sm font-bold text-zinc-100">
                  Market Outlook
                </h3>
              </div>
              <Badge tone="slate">EVIDENCE WEIGHTED</Badge>
            </div>

            <div className="mt-3.5 flex items-center justify-between gap-2">
              <SignalPill signal={s.outlook.label} />
              <span className="font-mono text-xs font-bold text-zinc-300">
                Direction Score:{" "}
                <span
                  className={
                    s.outlook.directionScore > 0
                      ? "text-emerald-400"
                      : s.outlook.directionScore < 0
                      ? "text-rose-400"
                      : "text-amber-400"
                  }
                >
                  {s.outlook.directionScore >= 0 ? "+" : ""}
                  {s.outlook.directionScore.toFixed(2)}
                </span>
              </span>
            </div>

            <div className="mt-3">
              <ConfidenceBar
                value={s.outlook.confidence}
                tone={s.outlook.label === "bullish" ? "emerald" : s.outlook.label === "bearish" ? "rose" : "sky"}
                showValue
              />
            </div>

            {/* Agent Weight Contributions */}
            <div className="mt-4 space-y-1.5 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 font-mono text-[11px]">
              <div className="text-[9px] font-sans font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1">
                Multi-Agent Weight Distribution
              </div>
              {s.outlook.contributions.map((c) => (
                <div key={c.agent} className="flex items-center justify-between text-zinc-300">
                  <span className="capitalize">
                    {c.agent} <span className="text-zinc-500 font-sans">({c.weightPct}%)</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-400 uppercase">{c.signal}</span>
                    <span
                      className={`font-bold ${
                        c.contribution > 0
                          ? "text-emerald-400"
                          : c.contribution < 0
                          ? "text-rose-400"
                          : "text-zinc-500"
                      }`}
                    >
                      {c.contribution >= 0 ? "+" : ""}
                      {c.contribution.toFixed(2)}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 text-[10px] text-zinc-500">
            Technical 35%, Filing 45%, News 20%. Missing streams contribute zero.
          </div>
        </div>

        {/* Layer 2: Personalized Policy Action */}
        <div
          className={`flex flex-col justify-between rounded-xl border p-4.5 ${
            ACTION_STYLE[s.action.code] ?? "border-zinc-800"
          }`}
        >
          <div>
            <div className="flex items-center justify-between border-b border-current/20 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80">
                  Layer 2 · Investor Policy
                </span>
                <h3 className="mt-0.5 text-sm font-bold text-white">
                  Decision Recommendation
                </h3>
              </div>
              <Badge tone="violet">RULE {s.action.ruleId}</Badge>
            </div>

            <div className="mt-3.5">
              <div className="text-2xl font-black tracking-tight text-white">{s.action.label}</div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs opacity-80">
                <span>Final Confidence: <b className="font-mono">{s.action.confidence}%</b></span>
                <span>·</span>
                <span>Policy Code: <b className="font-mono">{s.action.code}</b></span>
              </div>
            </div>

            <p className="mt-3 rounded-xl bg-black/40 p-3.5 text-xs leading-relaxed text-zinc-200 border border-white/5">
              {s.action.reason}
            </p>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 text-[10px] opacity-75 font-mono">
            <span>Fingerprint: {r.rawSignalFingerprint}</span>
            <span>Deterministic Policy Output</span>
          </div>
        </div>
      </div>

      {/* Confidence Caps Section */}
      {s.capsApplied.length > 0 && (
        <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3.5">
          <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-400 mb-1.5">
            🛡️ Guardrail Confidence Caps Applied
          </div>
          <ul className="space-y-1.5 text-xs text-zinc-300">
            {s.capsApplied.map((c, i) => (
              <li key={i} className="flex items-center justify-between rounded-lg bg-zinc-900/60 px-3 py-1.5">
                <span>• {c.reason}</span>
                <Badge tone="amber">CAP {c.cap}%</Badge>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Decision Buttons */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800/80 pt-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-xs font-semibold text-zinc-300">Record Decision:</span>
          <button
            onClick={handleReview}
            disabled={decision !== null}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              decision === "will_review"
                ? "bg-white text-black shadow-lg shadow-white/10"
                : "border border-zinc-700 bg-zinc-800 text-zinc-200 hover:border-zinc-500 hover:bg-zinc-700"
            } disabled:cursor-not-allowed disabled:opacity-70`}
          >
            ✓ I Will Review
          </button>
          <button
            onClick={handleDismiss}
            disabled={decision !== null}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              decision === "dismissed"
                ? "bg-zinc-700 text-zinc-100"
                : "border border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
            } disabled:cursor-not-allowed disabled:opacity-70`}
          >
            ✕ Dismiss
          </button>
        </div>

        {decisionStatus && (
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-xs font-semibold text-emerald-400">{decisionStatus}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
