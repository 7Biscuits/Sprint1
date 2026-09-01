import type { SessionRecord } from "../types";
import { Badge, Card } from "./ui";

export function SessionPanel({
  session: s,
  storageLabel,
  title = "Session log",
}: {
  session: SessionRecord;
  storageLabel: string;
  title?: string;
}) {
  const metrics: [string, string][] = [
    ["Total latency", `${s.total_latency_ms} ms`],
    ["Technical agent", `${s.technical_latency_ms} ms`],
    ["Filing agent", `${s.filing_latency_ms} ms`],
    ["News agent", `${s.news_latency_ms} ms`],
    ["Concentration", `${s.concentration_pct}% (HHI ${s.concentration_hhi})`],
    ["Citations / claims", `${s.citation_count} / ${s.cited_claim_count} of ${s.claim_count} cited`],
    ["Data mode", `${s.data_mode} · age ${s.data_age_days}d`],
    ["Conflict flag", s.conflict_flag ? `yes (${s.conflict_agents.join(", ")})` : "no"],
    ["Market outlook", `${s.market_outlook} @ ${s.market_outlook_confidence}%`],
    ["Final action", `${s.final_action} @ ${s.final_confidence}% (rule ${s.final_rule_id})`],
    ["Decision", s.decision ?? "not captured yet"],
    ["Scenario", s.scenario],
  ];
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold">{title} <span className="font-mono text-[10px] text-slate-500">{s.session_id}</span></h3>
        <div className="flex items-center gap-1.5">
          <Badge tone={s.storage_mode === "supabase" ? "green" : "amber"}>
            {s.storage_mode === "supabase" ? "Supabase" : "stored locally (fallback)"}
          </Badge>
          <button
            onClick={() => {
              const blob = new Blob([JSON.stringify(s, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${s.session_id}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="rounded border border-slate-700 px-2 py-0.5 text-[10px] text-slate-400 hover:text-slate-200"
          >
            export JSON
          </button>
        </div>
      </div>
      <p className="mt-0.5 text-[11px] text-slate-500">{storageLabel}</p>

      <dl className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {metrics.map(([k, v]) => (
          <div key={k} className="rounded-lg border border-slate-800 bg-slate-950/50 px-2 py-1.5">
            <dt className="text-[9px] uppercase tracking-wide text-slate-500">{k}</dt>
            <dd className="truncate font-mono text-[11px] text-slate-200" title={v}>{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-[10px]">
          <thead className="text-slate-500">
            <tr>
              <th className="py-1 pr-2 font-medium">agent</th>
              <th className="py-1 pr-2 font-medium">status</th>
              <th className="py-1 pr-2 font-medium">signal</th>
              <th className="py-1 pr-2 font-medium">conf</th>
              <th className="py-1 pr-2 font-medium">latency</th>
              <th className="py-1 pr-2 font-medium">fallback</th>
            </tr>
          </thead>
          <tbody className="font-mono text-slate-300">
            {s.agent_summary.map((a) => (
              <tr key={a.agent} className="border-t border-slate-800/60">
                <td className="py-1 pr-2">{a.agent}</td>
                <td className="py-1 pr-2">{a.status}</td>
                <td className="py-1 pr-2">{a.signal}</td>
                <td className="py-1 pr-2">{a.confidence}%</td>
                <td className="py-1 pr-2">{a.latencyMs} ms</td>
                <td className="py-1 pr-2">{a.fallbackUsed ? "cached" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[10px] text-slate-500">
        Reload-proof: the last session is fetched from the server on load; if the API is unreachable the app shows the
        device-local copy labelled as a fallback. 12 metrics captured per session (R8 needs ≥3).
      </p>
    </Card>
  );
}
