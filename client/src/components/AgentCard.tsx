import { useState } from "react";
import type { AgentResult, Citation } from "../types";
import { Badge, Card, ConfidenceBar, EvidenceLine, Expandable, fmtTime, SignalPill } from "./ui";
import { CitationModal } from "./CitationModal";

const ROLE_INFO: Record<string, { role: string; icon: string; desc: string }> = {
  technical: {
    role: "Technical Agent",
    icon: "📈",
    desc: "Deterministic indicator code over OHLCV series",
  },
  filing: {
    role: "Filing Agent",
    icon: "📑",
    desc: "Retrieval-grounded RAG over 8-chunk filing corpus",
  },
  news: {
    role: "News Agent",
    icon: "📰",
    desc: "Lexicon sentiment analysis over dated headlines",
  },
};

export function AgentCard({
  a,
  onCitationInspect,
}: {
  a: AgentResult;
  onCitationInspect?: (citation: Citation) => void;
}) {
  const [openCites, setOpenCites] = useState<Set<string>>(new Set());
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);

  const toggle = (id: string) => {
    const found = a.citations.find((c) => c.id === id);
    if (found && onCitationInspect) {
      onCitationInspect(found);
    } else if (found) {
      setSelectedCitation(found);
    } else {
      setOpenCites((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    }
  };

  const unavailable = a.status === "unavailable";
  const meta = ROLE_INFO[a.agent] ?? { role: a.agent, icon: "🤖", desc: a.provenance };

  return (
    <>
      <Card className={`flex flex-col justify-between ${unavailable ? "border-amber-700/40 bg-amber-950/10" : ""}`}>
        <div>
          {/* Header */}
          <div className="flex items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">{meta.icon}</span>
              <div>
                <h3 className="text-sm font-bold capitalize text-zinc-100">{a.agent} Agent</h3>
                <p className="text-[10px] text-zinc-500">{meta.desc}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1">
              {a.generatedBy && (
                <Badge tone={a.generatedBy === "llm" ? "violet" : "slate"}>
                  {a.generatedBy === "llm" ? "LLM · CITED" : "RULES"}
                </Badge>
              )}
              {a.fallbackUsed && <Badge tone="amber">FALLBACK</Badge>}
              <Badge tone={unavailable ? "amber" : "slate"} dot={!unavailable}>
                {a.status}
              </Badge>
            </div>
          </div>

          {unavailable ? (
            <div className="mt-4 rounded-xl border border-amber-700/40 bg-amber-500/10 p-3.5 text-xs text-amber-200">
              <div className="font-bold uppercase tracking-wider text-amber-400">
                ⚠️ Stream Unavailable
              </div>
              <p className="mt-1 leading-relaxed text-zinc-300">{a.unavailableReason}</p>
            </div>
          ) : (
            <>
              {/* Signal & Latency */}
              <div className="mt-3.5 flex items-center justify-between gap-3">
                <SignalPill signal={a.signal} confidence={a.confidence} />
                <span className="font-mono text-xs font-semibold text-zinc-400">
                  {a.durationMs} ms
                </span>
              </div>

              <div className="mt-2.5">
                <ConfidenceBar
                  value={a.confidence}
                  tone={a.signal === "bullish" ? "emerald" : a.signal === "bearish" ? "rose" : "sky"}
                  showValue
                />
              </div>

              {/* Evidence Bullets */}
              <div className="mt-4 space-y-2">
                <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-400">
                  Synthesized Evidence
                </div>
                <ul className="space-y-2 text-xs leading-relaxed text-zinc-300">
                  {a.evidence.map((e, i) => (
                    <li key={i} className="flex items-start gap-2 rounded-xl bg-zinc-950/60 p-2.5 border border-zinc-850">
                      <span className="text-sky-400 font-bold mt-0.5">▸</span>
                      <EvidenceLine text={e} onCitationClick={toggle} />
                    </li>
                  ))}
                </ul>
              </div>

              {/* Claims to Citations */}
              {a.claims && a.claims.length > 0 && (
                <div className="mt-3">
                  <Expandable title={`Claims Grounding (${a.claims.length} claims)`}>
                    <ul className="space-y-2 text-[11px] text-zinc-400">
                      {a.claims.map((c, i) => (
                        <li key={i} className="rounded-lg bg-zinc-900/60 p-2 border border-zinc-800/60">
                          <div className="text-zinc-200">“{c.claim}”</div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] text-zinc-500">Cites:</span>
                            {c.citationIds.map((id) => (
                              <button
                                key={id}
                                onClick={() => toggle(id)}
                                className="rounded bg-sky-500/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-sky-400 transition hover:bg-sky-500/30 hover:text-sky-200"
                              >
                                {id} ↗
                              </button>
                            ))}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </Expandable>
                </div>
              )}

              {/* Citations List */}
              {a.citations.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-400">
                    Source Citations ({a.citations.length})
                  </div>
                  {a.citations.map((c) => {
                    const open = openCites.has(c.id);
                    return (
                      <div
                        key={c.id}
                        className={`rounded-xl border p-2.5 text-xs transition-all ${
                          open
                            ? "border-sky-500/40 bg-sky-500/5"
                            : "border-zinc-800/80 bg-zinc-950/40 hover:border-zinc-700"
                        }`}
                      >
                        <button
                          onClick={() => toggle(c.id)}
                          className="flex w-full items-center justify-between gap-2 text-left"
                          aria-expanded={open}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${open ? "bg-sky-400 shadow-[0_0_6px_#38bdf8]" : "bg-zinc-600"}`} />
                            <span className="truncate font-mono text-[11px] font-semibold text-sky-400">{c.id}</span>
                            <span className="truncate text-zinc-300 text-[11px]">{c.title}</span>
                          </span>
                          <span className="shrink-0 font-mono text-[10px] text-zinc-500">{open ? "▲ hide" : "▼ read"}</span>
                        </button>
                        {open && (
                          <div className="mt-2.5 border-t border-zinc-800/80 pt-2 space-y-2">
                            <div className="text-[10px] text-zinc-400">
                              {c.publisher} · {c.docType} · <span className="font-mono text-zinc-300">{c.date}</span>
                              {c.url && (
                                <>
                                  {" · "}
                                  <a href={c.url} target="_blank" rel="noreferrer" className="text-sky-400 underline decoration-dotted hover:text-sky-300">
                                    open source ↗
                                  </a>
                                </>
                              )}
                            </div>
                            <blockquote className="rounded-lg border-l-2 border-sky-500 bg-zinc-900/90 p-2.5 font-serif text-[11px] leading-relaxed text-zinc-200">
                              “{c.excerpt}”
                            </blockquote>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 border-t border-zinc-800/80 pt-2.5 text-[10px] text-zinc-500 font-mono">
          <div>
            {fmtTime(a.startedAt)} → {fmtTime(a.completedAt)} ({a.durationMs} ms)
          </div>
          <div className="mt-0.5 italic text-zinc-500 truncate" title={a.provenance}>{a.provenance}</div>
        </div>
      </Card>

      <CitationModal
        citation={selectedCitation}
        claims={a.claims}
        onClose={() => setSelectedCitation(null)}
      />
    </>
  );
}
