import { useState } from "react";
import type { Citation, Claim } from "../types";
import { Badge } from "./ui";

export function CitationModal({
  citation,
  claims = [],
  onClose,
}: {
  citation: Citation | null;
  claims?: Claim[];
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  if (!citation) return null;

  const relevantClaims = claims.filter((cl) => cl.citationIds.includes(citation.id));

  const copyQuote = () => {
    navigator.clipboard.writeText(`"${citation.excerpt}" — ${citation.title} (${citation.date})`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="citation-title"
    >
      <div
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700/80 bg-slate-900/95 p-6 shadow-2xl shadow-sky-950/40"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="sky" dot>{citation.id}</Badge>
              <Badge tone="slate">{citation.docType}</Badge>
              <span className="text-xs text-slate-400">{citation.publisher}</span>
            </div>
            <h3 id="citation-title" className="mt-2 text-base font-bold text-slate-100">
              {citation.title}
            </h3>
            <p className="mt-0.5 font-mono text-xs text-slate-400">Published {citation.date}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white"
          >
            Esc ✕
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Verbatim Document Excerpt
              </div>
              <button
                onClick={copyQuote}
                className="text-[11px] font-medium text-sky-400 transition hover:text-sky-300"
              >
                {copied ? "✓ Copied to clipboard" : "📋 Copy excerpt"}
              </button>
            </div>
            <blockquote className="mt-1.5 rounded-xl border-l-4 border-sky-500 bg-slate-950/80 p-4 font-serif text-sm leading-relaxed text-slate-200 shadow-inner">
              “{citation.excerpt}”
            </blockquote>
          </div>

          {relevantClaims.length > 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Grounding: Claims Linked to This Document ({relevantClaims.length})
              </div>
              <ul className="mt-2 space-y-2 text-xs text-slate-300">
                {relevantClaims.map((cl, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-sky-400 font-bold">▸</span>
                    <span>“{cl.claim}”</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-4 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span>Grounded in immutable RAG corpus (no LLM hallucination)</span>
            </div>
            {citation.url && (
              <a
                href={citation.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-sky-400 underline decoration-dotted hover:text-sky-300"
              >
                Open source document ↗
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
