import { useState, useEffect } from "react";
import { Badge } from "./ui";

const SECTIONS = [
  {
    id: "pipeline",
    title: "1. Data Chain",
    icon: "📡",
    points: [
      { h: "Multi-Tier Fallback", t: "Live Yahoo chart API (10s timeout) → validated TTL response cache (15 min) → bundled versioned dated snapshot (130 OHLCV bars)." },
      { h: "Strict Truth-in-Labeling", t: "Cached data is never disguised as live; provider errors are surfaced explicitly in the UI." },
      { h: "Ticker Isolation", t: "Quotes are isolated by ticker in the cache. Reliance filings/news are never assigned to other tickers." },
    ],
  },
  {
    id: "orchestration",
    title: "2. Parallel Proof",
    icon: "⚡",
    points: [
      { h: "Zero Agent Framework Lag", t: "Dispatched using native Promise.allSettled across Technical, Filing, and News agents from a single launch timestamp." },
      { h: "Cryptographic Parallel Proof", t: "Identical startedAt timestamps (0–2ms spread); all starts recorded before the first completion." },
      { h: "Shared Zod Contract", t: "Each agent validates against one strict schema: {status, signal, confidence, evidence ≤3, claims, citations, provenance}." },
    ],
  },
  {
    id: "rag",
    title: "3. Grounded RAG",
    icon: "📑",
    points: [
      { h: "Curated Corpuses", t: "8 versioned filing chunks and dated headlines with full publication metadata (title, publisher, URL, date, docType, verbatim excerpt)." },
      { h: "Deterministic Retrieval", t: "Hashed n-gram vector cosine + lexical blend retrieves the top 3 relevant chunks." },
      { h: "No-Fabrication Server Rule", t: "Claims without a verified citation ID are purged server-side before delivery." },
    ],
  },
  {
    id: "policy",
    title: "4. Policy & Caps",
    icon: "🛡️",
    points: [
      { h: "Factual vs Policy Split", t: "Market outlook (Technical 35%, Filing 45%, News 20%) is calculated independently from personalized action." },
      { h: "Concentration Policy", t: "Policy C1: Conservative & ≥40% holding → DO NOT INCREASE. Policy G1: Growth & <20% & Bullish → CONSIDER SMALL STAGED ADD." },
      { h: "Automated Confidence Caps", t: "Signal conflict → cap 60. News unavailable → cap 65. Filings unavailable → cap 55 + action capped at WAIT." },
    ],
  },
  {
    id: "audit",
    title: "5. Telemetry & DB",
    icon: "💾",
    points: [
      { h: "35 Persisted Fields", t: "12 telemetry metrics including agent latencies, concentration %, HHI score, citation count, conflict flag, and review decision." },
      { h: "Supabase + Local Fallback", t: "Persisted to PostgreSQL in Supabase. On disconnect, seamlessly falls back to device-local store with clear label." },
      { h: "R5 Reproducibility", t: "Identical raw-evidence fingerprint across profiles confirms that policy layer alone drove different actions." },
    ],
  },
];

export function HowItWorks({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState("pipeline");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const currentSection = SECTIONS.find((s) => s.id === activeTab) || SECTIONS[0]!;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="how-title"
    >
      <div
        className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-700/80 bg-slate-900/95 p-6 shadow-2xl shadow-sky-950/40"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Badge tone="sky">ARCHITECTURE & VERIFICATION</Badge>
              <Badge tone="violet">PS-01 SPEC</Badge>
            </div>
            <h2 id="how-title" className="mt-2 text-xl font-bold text-slate-100">
              How SignalProof Decisions Are Synthesized
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Deterministic rules, parallel agents, grounded RAG, and profile-based concentration policy
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white"
          >
            Esc ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="mt-4 flex flex-wrap gap-1.5 border-b border-slate-800/80 pb-3">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveTab(s.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === s.id
                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm"
                  : "bg-slate-950/50 text-slate-400 border border-slate-800 hover:text-slate-200"
              }`}
            >
              <span>{s.icon}</span>
              <span>{s.title}</span>
            </button>
          ))}
        </div>

        {/* Tab Content Cards */}
        <div className="mt-4 space-y-3">
          {currentSection.points.map((p, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 shadow-inner"
            >
              <div className="text-xs font-bold text-sky-300">{p.h}</div>
              <p className="mt-1 text-xs leading-relaxed text-slate-300">{p.t}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-3 text-[11px] text-slate-500">
          <span>Benchmarked with 38 automated acceptance checks (`npm run acceptance`)</span>
          <span className="font-mono text-slate-400">Zero fabrication · No black-box advice</span>
        </div>
      </div>
    </div>
  );
}
