import { useState } from "react";
import type { AgentResult } from "../types";
import { Badge, ConfidenceBar, EvidenceLine, Expandable, fmtTime, SignalPill, Card, SIGNAL_STYLE } from "./ui";

const ROLE: Record<string, string> = {
  technical: "Price/volume technicals — deterministic indicator code",
  filing: "RAG over the curated filing corpus — retrieval-grounded",
  news: "Sentiment over cached dated headlines",
};

export function AgentCard({ a }: { a: AgentResult }) {
  const [openCites, setOpenCites] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setOpenCites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const unavailable = a.status === "unavailable";
  return (
    <Card className={unavailable ? "border-amber-700/50" : ""}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold capitalize tracking-wide">{a.agent}</h3>
        <div className="flex items-center gap-1">
          {a.generatedBy && <Badge tone={a.generatedBy === "llm" ? "violet" : "slate"}>{a.generatedBy === "llm" ? "LLM · cited" : "rules"}</Badge>}
          {a.fallbackUsed && <Badge tone="amber">fallback</Badge>}
          <Badge tone={unavailable ? "amber" : "slate"}>{a.status}</Badge>
        </div>
      </div>
      <p className="mt-0.5 text-[11px] text-slate-500">{ROLE[a.agent]}</p>

      {unavailable ? (
        <div className="mt-3 rounded-lg border border-amber-700/40 bg-amber-500/10 p-3 text-xs text-amber-200">
          <span className="font-semibold uppercase">Unavailable —</span> {a.unavailableReason}
        </div>
      ) : (
        <>
          <div className="mt-3 flex items-center justify-between gap-2">
            <SignalPill signal={a.signal} confidence={a.confidence} />
            <span className="font-mono text-[11px] text-slate-500">{a.durationMs} ms</span>
          </div>
          <div className="mt-2">
            <ConfidenceBar value={a.confidence} tone={a.signal === "bullish" ? "emerald" : a.signal === "bearish" ? "amber" : "sky"} />
          </div>

          <ul className="mt-3 space-y-1.5 text-xs leading-relaxed text-slate-300">
            {a.evidence.map((e, i) => (
              <li key={i} className="flex gap-1.5">
                <span className="text-slate-600">▸</span>
                <span><EvidenceLine text={e} onCitationClick={toggle} /></span>
              </li>
            ))}
          </ul>

          {a.claims && a.claims.length > 0 && (
            <div className="mt-3">
              <Expandable title={`Claims → citations (${a.claims.length} claims, all cited)`}>
                <ul className="space-y-1.5 text-[11px] text-slate-400">
                  {a.claims.map((c, i) => (
                    <li key={i} className="flex flex-wrap items-baseline gap-1">
                      <span>“{c.claim}”</span>
                      {c.citationIds.map((id) => (
                        <button key={id} onClick={() => toggle(id)} className="rounded bg-sky-500/15 px-1 font-mono text-[10px] text-sky-300 hover:bg-sky-500/30">
                          {id}
                        </button>
                      ))}
                    </li>
                  ))}
                </ul>
              </Expandable>
            </div>
          )}
        </>
      )}

      <div className="mt-3 border-t border-slate-800 pt-2">
        <div className="font-mono text-[10px] text-slate-500">
          started {fmtTime(a.startedAt)} → completed {fmtTime(a.completedAt)} ({a.durationMs} ms)
        </div>
        <div className="mt-1 text-[10px] italic text-slate-500">{a.provenance}</div>
      </div>

      {a.citations.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {a.citations.map((c) => {
            const open = openCites.has(c.id);
            return (
              <div key={c.id} className={`rounded-lg border p-2 text-[11px] ${open ? "border-sky-600/60 bg-sky-500/5" : "border-slate-800 bg-slate-950/40"}`}>
                <button onClick={() => toggle(c.id)} className="flex w-full items-center justify-between gap-2 text-left" aria-expanded={open}>
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${open ? "bg-sky-400" : "bg-slate-600"}`} />
                    <span className="truncate font-mono text-[10px] text-sky-300">{c.id}</span>
                    <span className="truncate text-slate-300">{c.title}</span>
                  </span>
                  <span className="shrink-0 font-mono text-slate-500">{open ? "[-]" : "[+]"}</span>
                </button>
                {open && (
                  <div className="mt-1.5 space-y-1">
                    <div className="text-[10px] text-slate-400">
                      {c.publisher} · {c.docType} · <span className="font-mono">{c.date}</span>
                      {c.url && (
                        <>
                          {" · "}
                          <a href={c.url} target="_blank" rel="noreferrer" className="text-sky-400 underline decoration-dotted">open source ↗</a>
                        </>
                      )}
                    </div>
                    <blockquote className="rounded border-l-2 border-sky-600/60 bg-slate-900/80 p-2 font-serif text-[11px] leading-relaxed text-slate-200">
                      “{c.excerpt}”
                    </blockquote>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!unavailable && (
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-500">
          <span className={`h-1.5 w-1.5 rounded-full ${SIGNAL_STYLE[a.signal].split(" ")[0]}`} />
          bounded inputs only — the agent cannot invent citations beyond those shown
        </div>
      )}
    </Card>
  );
}
