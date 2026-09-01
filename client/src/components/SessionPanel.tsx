import { useState } from "react";
import type { SessionRecord } from "../types";
import { Badge, Card } from "./ui";

export function SessionPanel({
  session: s,
  storageLabel,
  title = "Telemetry & Benchmark Log",
}: {
  session: SessionRecord;
  storageLabel: string;
  title?: string;
}) {
  const [copied, setCopied] = useState(false);

  const metrics: [string, string, string][] = [
    ["Total Latency", `${s.total_latency_ms} ms`, "Pipeline execution time"],
    ["Technical Agent", `${s.technical_latency_ms} ms`, "Indicator calculations"],
    ["Filing Agent", `${s.filing_latency_ms} ms`, "RAG vector retrieval"],
    ["News Agent", `${s.news_latency_ms} ms`, "Sentiment token scoring"],
    ["Concentration", `${s.concentration_pct}%`, `HHI score ${s.concentration_hhi}`],
    ["Citations & Claims", `${s.citation_count} cites`, `${s.cited_claim_count}/${s.claim_count} claims`],
    ["Data Freshness", `${s.data_mode.toUpperCase()}`, `Age ${s.data_age_days}d`],
    ["Conflict Flag", s.conflict_flag ? `YES (${s.conflict_agents.join(", ")})` : "NO", "Signal agreement"],
    ["Market Outlook", `${s.market_outlook.toUpperCase()}`, `${s.market_outlook_confidence}% conf`],
    ["Final Action", `${s.final_action}`, `Rule ${s.final_rule_id} (${s.final_confidence}%)`],
    ["Recorded Decision", s.decision ? s.decision.replace("_", " ").toUpperCase() : "PENDING", s.decision_at?.slice(11, 19) ?? "—"],
    ["Scenario Mode", s.scenario, "Execution route"],
  ];

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(s, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${s.session_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(s, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const maxAgentLatency = Math.max(
    1,
    s.technical_latency_ms,
    s.filing_latency_ms,
    s.news_latency_ms,
    s.total_latency_ms
  );

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-3.5">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
            Session Record · {s.session_id}
          </span>
          <h3 className="mt-0.5 text-sm font-bold text-zinc-100">{title}</h3>
          <p className="text-[11px] text-zinc-400">{storageLabel}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={s.storage_mode === "supabase" ? "green" : "amber"} dot>
            {s.storage_mode === "supabase" ? "SUPABASE PERSISTED" : "DEVICE-LOCAL STORE"}
          </Badge>
          <button
            onClick={copyJson}
            className="rounded-lg border border-zinc-700 bg-zinc-800/80 px-2.5 py-1 font-mono text-[11px] text-zinc-300 transition hover:border-zinc-500 hover:text-white"
          >
            {copied ? "✓ Copied" : "Copy JSON"}
          </button>
          <button
            onClick={exportJson}
            className="rounded-lg border border-zinc-700 bg-zinc-800/80 px-2.5 py-1 font-mono text-[11px] text-zinc-300 transition hover:border-zinc-500 hover:text-white"
          >
            Export JSON ↓
          </button>
        </div>
      </div>

      {/* Parallel Execution Gantt Chart */}
      <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
        <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-400 mb-2">
          <span>Multi-Agent Parallel Execution Timeline</span>
          <span className="font-mono text-zinc-500">Total Pipeline: {s.total_latency_ms} ms</span>
        </div>

        <div className="space-y-2">
          {[
            { name: "Technical Agent", ms: s.technical_latency_ms, color: "from-sky-500 to-cyan-400" },
            { name: "Filing Agent (RAG)", ms: s.filing_latency_ms, color: "from-violet-500 to-purple-400" },
            { name: "News Agent", ms: s.news_latency_ms, color: "from-emerald-500 to-teal-400" },
          ].map((agent) => (
            <div key={agent.name} className="flex items-center gap-3 text-xs">
              <span className="w-32 truncate text-zinc-300">{agent.name}</span>
              <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${agent.color}`}
                  style={{ width: `${Math.max(4, (agent.ms / maxAgentLatency) * 100)}%` }}
                />
              </div>
              <span className="w-16 text-right font-mono text-[11px] text-zinc-400">{agent.ms} ms</span>
            </div>
          ))}
        </div>
      </div>

      {/* 12 Measurable Metrics Grid */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {metrics.map(([label, val, sub]) => (
          <div
            key={label}
            className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-2.5 shadow-inner"
          >
            <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-500 truncate" title={label}>
              {label}
            </div>
            <div className="mt-0.5 truncate font-mono text-xs font-bold text-zinc-200" title={val}>
              {val}
            </div>
            <div className="text-[9px] text-zinc-500 truncate" title={sub}>
              {sub}
            </div>
          </div>
        ))}
      </div>

      {/* Agent Summary Table */}
      <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/40">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-zinc-800 bg-zinc-900/60 text-[9px] uppercase tracking-[0.15em] text-zinc-400">
            <tr>
              <th className="py-2.5 px-3.5 font-semibold">Agent</th>
              <th className="py-2.5 px-3.5 font-semibold">Status</th>
              <th className="py-2.5 px-3.5 font-semibold">Signal</th>
              <th className="py-2.5 px-3.5 font-semibold">Confidence</th>
              <th className="py-2.5 px-3.5 font-semibold">Latency</th>
              <th className="py-2.5 px-3.5 font-semibold">Fallback</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 font-mono text-zinc-300">
            {s.agent_summary.map((a) => (
              <tr key={a.agent} className="hover:bg-zinc-900/40 transition">
                <td className="py-2.5 px-3.5 capitalize text-zinc-200">{a.agent}</td>
                <td className="py-2.5 px-3.5">
                  <span className={`inline-flex items-center gap-1 ${a.status === "complete" ? "text-emerald-400" : "text-amber-400"}`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {a.status}
                  </span>
                </td>
                <td className="py-2.5 px-3.5 uppercase text-zinc-200">{a.signal}</td>
                <td className="py-2.5 px-3.5">{a.confidence}%</td>
                <td className="py-2.5 px-3.5">{a.latencyMs} ms</td>
                <td className="py-2.5 px-3.5 text-zinc-400">{a.fallbackUsed ? "cached" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
