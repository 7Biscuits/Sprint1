import { useState } from "react";
import type { AnalyzeResponse } from "../types";
import { api } from "../api";
import { ACTION_STYLE, Badge, Card } from "./ui";

export function ComparePanel({ primary }: { primary: AnalyzeResponse }) {
  const [comparison, setComparison] = useState<AnalyzeResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const otherProfileId =
    primary.session.profile_id === "profile_conservative_001"
      ? "profile_growth_002"
      : "profile_conservative_001";

  const otherProfileName =
    otherProfileId === "profile_conservative_001"
      ? "Conservative (60% Holding)"
      : "Growth (10% Holding)";

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

  const isFingerprintIdentical = comparison && primary.rawSignalFingerprint === comparison.rawSignalFingerprint;

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-3.5">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
            Policy Divergence Simulation
          </span>
          <h3 className="mt-0.5 text-sm font-bold text-zinc-100">
            Cross-Profile Policy Comparison (Locked Snapshot Proof)
          </h3>
        </div>

        <button
          onClick={run}
          disabled={busy}
          className="rounded-xl border border-zinc-700 bg-zinc-800/90 px-3.5 py-1.5 text-xs font-bold text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-700 disabled:cursor-wait disabled:opacity-50"
        >
          {busy ? "Running Comparison…" : comparison ? "↻ Refresh Comparison" : `Simulate ${otherProfileName}`}
        </button>
      </div>

      {err && (
        <div className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 p-2.5 text-xs text-rose-300">
          {err}
        </div>
      )}

      {comparison ? (
        <div className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            {[primary, comparison].map((r, i) => {
              const isPrimary = i === 0;
              return (
                <div
                  key={i}
                  className={`rounded-xl border p-4 shadow-lg ${
                    ACTION_STYLE[r.synthesis.action.code] ?? "border-zinc-800"
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-current/20 pb-2.5">
                    <div>
                      <span className="text-xs font-bold text-white">{r.session.profile_name}</span>
                      <span className="ml-2 font-mono text-[10px] opacity-75">
                        ({r.session.risk_tolerance.toUpperCase()})
                      </span>
                    </div>
                    <Badge tone="slate">
                      {r.synthesis.concentration.symbolWeightPct}% Weight · HHI {r.synthesis.concentration.hhi}
                    </Badge>
                  </div>

                  <div className="mt-3">
                    <div className="text-lg font-black tracking-tight text-white">{r.synthesis.action.label}</div>
                    <div className="mt-1 flex items-center gap-2 font-mono text-[11px] opacity-80">
                      <span>Rule {r.synthesis.action.ruleId}</span>
                      <span>·</span>
                      <span>Confidence {r.synthesis.action.confidence}%</span>
                      {isPrimary && <Badge tone="sky">ACTIVE</Badge>}
                    </div>
                  </div>

                  <p className="mt-2 text-xs leading-relaxed opacity-90 line-clamp-3">
                    {r.synthesis.action.reason}
                  </p>
                </div>
              );
            })}
          </div>

          {/* R5 Verification Banner */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3.5">
            {isFingerprintIdentical ? (
              <div className="flex items-start gap-2.5 text-xs text-emerald-300">
                <span className="text-base">✓</span>
                <div>
                  <b className="font-semibold">R5 Verification Passed:</b> Identical raw-evidence fingerprint{" "}
                  <code className="font-mono text-emerald-200">{primary.rawSignalFingerprint}</code> on snapshot{" "}
                  <code className="font-mono text-emerald-200">{primary.snapshot.snapshotId}</code>.
                  <p className="mt-0.5 text-[11px] text-zinc-400">
                    The evidence was identical down to the last digit; the divergence in action was driven solely by the investor's concentration and risk policy.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-xs text-amber-300">
                Snapshot moved between runs. Re-run comparison to lock identical snapshot.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4 text-center text-xs text-zinc-400">
          Click <b className="text-zinc-200 font-semibold">Simulate</b> above to see how Conservative (60% holding) and Growth (10% holding) react to the exact same market signal under their respective concentration policies.
        </div>
      )}
    </Card>
  );
}
