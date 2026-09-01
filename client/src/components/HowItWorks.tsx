import { Card } from "./ui";

const POINTS: [string, string][] = [
  ["Data sources", "Yahoo-compatible chart API (10 s timeout) → validated file cache → bundled dated snapshot. Curated 8-doc dated Reliance corpus. Cached dated headlines. Data mode is always shown: LIVE or CACHED."],
  ["Agent contracts", "Technical / Filing / News return {agent, status, signal, confidence, evidence ≤3, claims[], citations[], provenance, startedAt, completedAt, durationMs, fallbackUsed}. Every result is validated against one shared zod schema before synthesis."],
  ["Orchestration", "Native Promise.allSettled over all three agents from one launch timestamp — no agent framework. Parallel proof = identical startedAt (spread 0–2 ms) with all starts before the first completion."],
  ["Market outlook", "Weighted labels: Technical 35% · Filing 45% · News 20%. Unavailable agents contribute nothing. score ≥ +0.20 → bullish; ≤ −0.20 → bearish; else neutral."],
  ["Confidence caps", "conflict (bullish+bearish among complete agents) → 60 · news unavailable → 65 · filings unavailable → 55 · technicals unavailable → 55."],
  ["Concentration policy", "weight = holding / portfolio; HHI = Σ weight² ×10,000. C1: conservative & ≥40% → DO NOT INCREASE. G1: growth & <20% & bullish & unconflicted & filings+technicals complete & conf ≥65 → CONSIDER A SMALL, STAGED ADD. F1: filings unavailable → never stronger than WAIT. D1: default WAIT / REVIEW."],
  ["No-fabrication rule", "Agents may only cite retrieved citation ids; claims without a citation are dropped server-side; excerpts are displayed verbatim from the checked-in corpus."],
  ["Persistence", "Session record (35 fields, 12 measurable metrics) → Supabase Postgres with service-role key server-side; on absence/failure, labelled device-local fallback. Explicit review/dismiss decision is captured."],
];

export function HowItWorks({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true" aria-label="How this decision was made">
      <Card className="mt-8 max-w-3xl bg-slate-900" >
        <div onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">How this decision was made</h2>
            <button onClick={onClose} className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-400 hover:text-slate-200">close ✕</button>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Condensed judge summary — full document in <span className="font-mono">ARCHITECTURE.md</span>; provenance per corpus
            item in <span className="font-mono">docs/PROVENANCE.md</span>; automated checks via <span className="font-mono">npm run acceptance</span>.
          </p>
          <div className="mt-3 space-y-2.5">
            {POINTS.map(([k, v]) => (
              <div key={k} className="rounded-lg border border-slate-800 bg-slate-950/50 p-2.5">
                <div className="text-xs font-bold text-sky-300">{k}</div>
                <div className="mt-0.5 text-[11px] leading-relaxed text-slate-300">{v}</div>
              </div>
            ))}
          </div>
          <p className="mt-3 border-t border-slate-800 pt-2 text-[10px] text-slate-500">
            Research support only — not investment advice; no execution, no performance claims. Demo data is dated and labelled;
            anonymous demo ids only.
          </p>
        </div>
      </Card>
    </div>
  );
}
