import { useState } from "react";
import type { AnalyzeResponse } from "../types";
import { api } from "../api";
import { ACTION_STYLE, Badge, Card } from "./ui";

/**
 * Should-have: "compare profiles" — re-runs the OTHER saved profile on the
 * identical locked snapshot and shows both final actions side by side,
 * proving the difference comes from the policy layer, not the evidence.
 */
export function ComparePanel({ primary }: { primary: AnalyzeResponse }) {
  const [comparison, setComparison] = useState<AnalyzeResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const otherProfileId = primary.session.profile_id === "profile_conservative_001" ? "profile_growth_002" : "profile_conservative_001";

  const run = async () => {
    setBusy(true);
    setErr(null);
    try {
      const other = await api.analyze({
        profileId: otherProfileId,
        scenario: primary.scenario,
        symbol: primary.symbol,
        snapshotId: primary.snapshot.snapshotId,
      });
      setComparison(other);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold">Compare profiles on this snapshot</h3>
        <button
          onClick={run}
          disabled={busy}
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-sky-500/60 hover:text-sky-300 disabled:opacity-50"
        >
          {busy ? "Re-running…" : comparison ? "Refresh" : "Run other profile"}
        </button>
      </div>
      {err && <p className="mt-2 text-[11px] text-rose-300">{err}</p>}
      {comparison ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {[primary, comparison].map((r, i) => (
            <div key={i} className={`rounded-xl border p-3 ${ACTION_STYLE[r.synthesis.action.code] ?? "border-slate-800"}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">{r.session.profile_name}</span>
                <Badge tone="slate">{r.synthesis.concentration.symbolWeightPct}% · HHI {r.synthesis.concentration.hhi}</Badge>
              </div>
              <div className="mt-1.5 text-lg font-black">{r.synthesis.action.label}</div>
              <div className="mt-0.5 flex items-center gap-2 text-[10px] font-mono opacity-80">
                rule {r.synthesis.action.ruleId} · conf {r.synthesis.action.confidence}% · {r.session.risk_tolerance}
              </div>
              <p className="mt-1 text-[10px] leading-relaxed opacity-80">{r.synthesis.action.reason.split(". ").slice(0, 2).join(". ")}.</p>
            </div>
          ))}
          <div className="sm:col-span-2 text-[11px] text-slate-400">
            {primary.rawSignalFingerprint === comparison.rawSignalFingerprint ? (
              <span className="text-emerald-400">
                Identical raw-evidence fingerprint <span className="font-mono">{primary.rawSignalFingerprint}</span> and snapshot{" "}
                <span className="font-mono">{primary.snapshot.snapshotId}</span> — the only thing that changed is the investor
                context, so the policy layer alone changed the answer.
              </span>
            ) : (
              <span className="text-amber-400">Fingerprints differ — the snapshot moved between runs; re-run for the R5 proof.</span>
            )}
          </div>
        </div>
      ) : (
        <p className="mt-2 text-[11px] text-slate-500">
          Runs the other saved profile ({otherProfileId === "profile_conservative_001" ? "Conservative / 60%" : "Growth / 10%"}) on
          the same locked snapshot — same evidence, different action.
        </p>
      )}
    </Card>
  );
}
