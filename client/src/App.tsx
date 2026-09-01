import { useCallback, useEffect, useState } from "react";
import { api, localStore } from "./api";
import type { AnalyzeResponse, Decision, Profile, Scenario, Stock } from "./types";
import { Controls } from "./components/Controls";
import { MarketHeader } from "./components/MarketHeader";
import { AgentCard } from "./components/AgentCard";
import { PortfolioCard } from "./components/PortfolioCard";
import { AnalyticsPanel } from "./components/AnalyticsPanel";
import { FinalPanel } from "./components/FinalPanel";
import { ComparePanel } from "./components/ComparePanel";
import { SessionPanel } from "./components/SessionPanel";
import { HowItWorks } from "./components/HowItWorks";
import { Badge, Card } from "./components/ui";

type Phase = "idle" | "running" | "done" | "error";

export default function App() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [symbol, setSymbol] = useState("RELIANCE.NS");
  const [profileId, setProfileId] = useState("profile_conservative_001");
  const [scenario, setScenario] = useState<Scenario>("normal");
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [offlineNotice, setOfflineNotice] = useState<string | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [decisionStatus, setDecisionStatus] = useState<string | null>(null);
  const [showHow, setShowHow] = useState(false);
  const [meta, setMeta] = useState<{ llmMode: string; marketMode: string } | null>(null);
  const [lastSession, setLastSession] = useState<{ session: import("./types").SessionRecord; storage: { mode: string; label: string } } | null>(null);

  const profile = profiles.find((p) => p.id === profileId) ?? profiles[0];

  useEffect(() => {
    api
      .profiles()
      .then((r) => {
        setProfiles(r.profiles);
        setStocks(r.stocks);
        setSymbol(r.demoSymbol);
        setProfileId(r.profiles[0]?.id ?? profileId);
      })
      .catch(() => {
        setOfflineNotice("API unreachable — loaded the last device-local session as a labelled fallback.");
        const local = localStore.load();
        if (local) {
          setResult(local.result);
          setPhase("done");
          setProfileId(local.result.session.profile_id);
        }
      });
    api
      .health()
      .then((h) => setMeta({ llmMode: h.llmMode, marketMode: h.marketMode }))
      .catch(() => undefined);
    // R8: a reload can show the last persisted session record.
    api
      .lastSession()
      .then(({ session, storage }) => {
        if (session) setLastSession({ session, storage });
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = useCallback(async () => {
    setPhase("running");
    setError(null);
    setDecision(null);
    setDecisionStatus(null);
    try {
      const r = await api.analyze({
        profileId,
        scenario,
        symbol,
        snapshotId: result?.snapshot.snapshotId,
      });
      setResult(r);
      setPhase("done");
      setLastSession({ session: r.session, storage: r.storage });
      localStore.save(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("error");
    }
  }, [profileId, scenario, symbol, result]);

  const onDecide = useCallback(
    async (d: Decision) => {
      if (!result) return;
      setDecision(d);
      try {
        const { session, storage } = await api.decide(result.sessionId, d);
        setDecisionStatus(
          `saved (${storage.mode === "supabase" ? "Supabase" : "local fallback"}) at ${session.decision_at?.slice(11, 19)}`,
        );
      } catch {
        setDecisionStatus("decision shown locally — API unreachable");
      }
    },
    [result],
  );

  const resetDemo = useCallback(() => {
    localStore.clear();
    setResult(null);
    setPhase("idle");
    setDecision(null);
    setDecisionStatus(null);
    setError(null);
    setOfflineNotice(null);
  }, []);

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <h1 className="text-lg font-black tracking-tight">
              Signal<span className="text-sky-400">Proof</span>
              <span className="ml-2 text-xs font-medium text-slate-400">personalized, cited equity research briefing</span>
            </h1>
            <p className="text-[11px] text-slate-500">
              Hackverse PS-01 · one decision, three parallel agents, two investor profiles ·{" "}
              {meta ? `market:${meta.marketMode} llm:${meta.llmMode}` : "connecting…"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHow(true)}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-sky-500/60 hover:text-sky-300"
            >
              How this decision was made
            </button>
            <button onClick={resetDemo} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200">
              Reset demo
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-3 px-4 py-4">
        {offlineNotice && (
          <div className="rounded-xl border border-amber-600/60 bg-amber-500/10 px-4 py-2 text-xs text-amber-200" role="status">
            {offlineNotice}
          </div>
        )}
        {error && phase === "error" && (
          <div className="rounded-xl border border-rose-700/60 bg-rose-500/10 px-4 py-2 text-xs text-rose-200" role="alert">
            Analysis failed: {error} — no quote has been substituted from a different ticker. Try again when a same-symbol live or cached quote is available.
          </div>
        )}

        <Controls
          profiles={profiles}
          stocks={stocks}
          profileId={profileId}
          scenario={scenario}
          running={phase === "running"}
          symbol={symbol}
          lockedSnapshotId={result?.snapshot.snapshotId}
          onProfileChange={(id) => {
            setProfileId(id);
            setResult(null);
            setPhase("idle");
          }}
          onSymbolChange={(nextSymbol) => {
            setSymbol(nextSymbol);
            setResult(null);
            setPhase("idle");
            setDecision(null);
            setDecisionStatus(null);
          }}
          onScenarioChange={(s) => {
            setScenario(s);
            setResult(null);
            setPhase("idle");
          }}
          onRun={run}
        />

        {phase === "idle" && (
          <Card className="text-center text-sm text-slate-400">
            <p className="py-8">
              Choose a company and investor profile, then run an evidence-labelled briefing.<br />
              <span className="text-[11px] text-slate-500">
                Quotes are isolated by ticker. Company-specific evidence is only used where it is actually available; every data mode stays labelled.
              </span>
            </p>
          </Card>
        )}

        {phase === "running" && (
          <Card className="text-center text-sm text-slate-400" aria-live="polite">
            <p className="py-8">
              <span className="inline-block animate-pulse font-mono">launching technical + filing + news agents in parallel…</span>
            </p>
          </Card>
        )}

        {phase === "done" && result && profile && (
          <>
            <MarketHeader r={result} />

            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-[10px] text-slate-400">
              <Badge tone="sky">session {result.sessionId}</Badge>
              <Badge tone={result.parallelProof.allStartedBeforeFirstResult ? "green" : "amber"}>
                parallel proof: all 3 launched before first result · start spread {result.parallelProof.startSpreadMs} ms
              </Badge>
              <Badge tone="violet">raw-evidence fingerprint {result.rawSignalFingerprint}</Badge>
              <Badge tone="slate">total {result.totalLatencyMs} ms</Badge>
              <span className="ml-auto">same fingerprint across profiles ⇒ identical raw evidence (R5)</span>
            </div>

            <div className="grid gap-3 lg:grid-cols-3">
              <div className="grid gap-3 md:grid-cols-2 lg:col-span-2 xl:grid-cols-3">
                {result.agents.map((a) => (
                  <AgentCard key={a.agent} a={a} />
                ))}
              </div>
              <PortfolioCard profile={profile} r={result} />
            </div>

            <AnalyticsPanel r={result} />

            <FinalPanel r={result} decision={decision} decisionStatus={decisionStatus} onDecide={onDecide} />
            <ComparePanel primary={result} />
            <SessionPanel session={result.session} storageLabel={result.storage.label} />
          </>
        )}

        {phase !== "done" && lastSession && (
          <SessionPanel
            session={lastSession.session}
            storageLabel={`${lastSession.storage.label} — reloaded from the last session (R8)`}
            title="Last session log"
          />
        )}

        <footer className="pb-6 pt-2 text-center text-[10px] leading-relaxed text-slate-600">
          SignalProof is research decision support, not investment advice. No execution, no performance claims, no real
          financial data. Demo profiles are anonymous; sessions store no PII.
        </footer>
      </main>

      <HowItWorks open={showHow} onClose={() => setShowHow(false)} />
    </div>
  );
}
