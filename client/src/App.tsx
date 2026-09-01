import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api, localStore } from "./api";
import type { AnalyzeResponse, Citation, Decision, Profile, Scenario, Stock } from "./types";
import { Controls } from "./components/Controls";
import { MarketHeader } from "./components/MarketHeader";
import { AgentCard } from "./components/AgentCard";
import { PortfolioCard } from "./components/PortfolioCard";
import { AnalyticsPanel } from "./components/AnalyticsPanel";
import { FinalPanel } from "./components/FinalPanel";
import { ComparePanel } from "./components/ComparePanel";
import { SessionPanel } from "./components/SessionPanel";
import { HowItWorks } from "./components/HowItWorks";
import { AgentRunningVisualizer } from "./components/AgentRunningVisualizer";
import { CitationModal } from "./components/CitationModal";
import { TabSwitcher, type TabId } from "./components/TabSwitcher";
import { SupportChatbot } from "./components/SupportChatbot";
import { Badge, Card } from "./components/ui";

type Phase = "idle" | "running" | "done" | "error";

export default function App() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [symbol, setSymbol] = useState("RELIANCE.NS");
  const [profileId, setProfileId] = useState("profile_conservative_001");
  const [scenario, setScenario] = useState<Scenario>("normal");
  const [phase, setPhase] = useState<Phase>("idle");
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [offlineNotice, setOfflineNotice] = useState<string | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [decisionStatus, setDecisionStatus] = useState<string | null>(null);
  const [showHow, setShowHow] = useState(false);
  const [inspectCitation, setInspectCitation] = useState<Citation | null>(null);
  const [meta, setMeta] = useState<{
    llmMode: string;
    marketMode: string;
    persistenceConfigured: boolean;
  } | null>(null);
  const [lastSession, setLastSession] = useState<{
    session: import("./types").SessionRecord;
    storage: { mode: string; label: string };
  } | null>(null);

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
      .then((h) =>
        setMeta({
          llmMode: h.llmMode,
          marketMode: h.marketMode,
          persistenceConfigured: h.persistenceConfigured,
        })
      )
      .catch(() => undefined);

    api
      .lastSession()
      .then(({ session, storage }) => {
        if (session) setLastSession({ session, storage });
      })
      .catch(() => undefined);
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

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && e.target === document.body && phase !== "running") {
        e.preventDefault();
        run();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [run, phase]);

  const onDecide = useCallback(
    async (d: Decision) => {
      if (!result) return;
      setDecision(d);
      try {
        const { session, storage } = await api.decide(result.sessionId, d);
        setDecisionStatus(
          `Decision saved (${storage.mode === "supabase" ? "Supabase" : "Local store"}) at ${session.decision_at?.slice(11, 19)}`
        );
      } catch {
        setDecisionStatus("Decision recorded locally — API unreachable");
      }
    },
    [result]
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
    <div className="min-h-screen pb-16">
      {/* Top CRED Navbar */}
      <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-xs font-black text-black shadow-md">
              SP
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black tracking-tight text-white">
                  Signal<span className="text-sky-400">Proof</span>
                </h1>
                <span className="rounded border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider text-zinc-400">
                  PS-01
                </span>
              </div>
              <p className="text-[10px] text-zinc-400">
                Multi-agent cited equity research briefing
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {meta && (
              <div className="hidden items-center gap-1.5 text-xs text-zinc-400 sm:flex">
                <Badge tone={meta.marketMode === "live" ? "green" : "amber"} dot>
                  MARKET: {meta.marketMode.toUpperCase()}
                </Badge>
                <Badge tone="violet">LLM: {meta.llmMode.toUpperCase()}</Badge>
                <Badge tone={meta.persistenceConfigured ? "green" : "amber"} dot>
                  {meta.persistenceConfigured ? "SUPABASE" : "LOCAL"}
                </Badge>
              </div>
            )}
            <button
              onClick={() => setShowHow(true)}
              className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:border-zinc-500 hover:text-white"
            >
              How it works ↗
            </button>
            <button
              onClick={resetDemo}
              className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs font-medium text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-200"
            >
              Reset
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl space-y-4 px-4 py-5 sm:px-6">
        {offlineNotice && (
          <div className="rounded-xl border border-amber-600/50 bg-amber-500/10 p-3 text-xs text-amber-200" role="status">
            {offlineNotice}
          </div>
        )}

        {error && phase === "error" && (
          <div className="rounded-xl border border-rose-700/60 bg-rose-500/10 p-3 text-xs text-rose-200" role="alert">
            <b className="uppercase">Analysis Error:</b> {error} — No quote has been substituted from a different ticker.
          </div>
        )}

        {/* Modular Controls Bar */}
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

        {/* Idle Landing State */}
        {phase === "idle" && (
          <Card className="p-8 text-center">
            <div className="mx-auto max-w-md space-y-3">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-lg">
                ⚡
              </div>
              <h3 className="text-sm font-bold text-zinc-100">
                Ready for Multi-Agent Synthesis
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Select your company and investor profile, then launch parallel research across Technical, Filing RAG, and News agents.
              </p>
              <div className="pt-2">
                <button
                  onClick={run}
                  className="cred-button-primary rounded-xl px-5 py-2 text-xs uppercase tracking-wider"
                >
                  Launch Briefing (Space)
                </button>
              </div>
            </div>
          </Card>
        )}

        {/* Running Parallel Visualizer */}
        {phase === "running" && <AgentRunningVisualizer />}

        {/* Active Analysis: Modular Tabbed Layout */}
        {phase === "done" && result && profile && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* Quick Hero Banner */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/80 px-4 py-3 shadow-xl">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-lg font-black text-white">{result.snapshot.symbol}</span>
                <span className={`font-mono text-sm font-bold ${result.snapshot.changePct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  ₹{result.snapshot.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })} ({result.snapshot.changePct >= 0 ? "+" : ""}{result.snapshot.changePct}%)
                </span>
                <Badge tone={result.snapshot.mode === "live" ? "green" : "amber"} dot>
                  {result.snapshot.mode.toUpperCase()}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="sky">ACTION: {result.synthesis.action.label}</Badge>
                <Badge tone="violet">CONFIDENCE: {result.synthesis.action.confidence}%</Badge>
                <Badge tone="slate">LATENCY: {result.totalLatencyMs} ms</Badge>
              </div>
            </div>

            {/* Dynamic Interactive Tab Switcher */}
            <TabSwitcher
              activeTab={activeTab}
              onTabChange={setActiveTab}
              result={result}
              profile={profile}
            />

            {/* Tab Panels with Smooth Motion Transitions */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                role="tabpanel"
                id={`tabpanel-${activeTab}`}
                aria-labelledby={`tab-${activeTab}`}
                className="space-y-4 focus:outline-none"
              >
                {/* Tab 1: Overview & Decision */}
                {activeTab === "overview" && (
                  <div className="space-y-4">
                    <FinalPanel
                      r={result}
                      decision={decision}
                      decisionStatus={decisionStatus}
                      onDecide={onDecide}
                    />
                    <div className="grid gap-4 md:grid-cols-3">
                      {result.agents.map((a) => (
                        <AgentCard
                          key={a.agent}
                          a={a}
                          onCitationInspect={(c) => setInspectCitation(c)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Tab 2: Interactive Chart & Technicals */}
                {activeTab === "chart" && (
                  <div className="space-y-4">
                    <MarketHeader r={result} showChartDefault={true} />
                    <AnalyticsPanel r={result} />
                  </div>
                )}

                {/* Tab 3: Agent Intelligence */}
                {activeTab === "agents" && (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      {result.agents.map((a) => (
                        <AgentCard
                          key={a.agent}
                          a={a}
                          onCitationInspect={(c) => setInspectCitation(c)}
                        />
                      ))}
                    </div>
                    <AnalyticsPanel r={result} />
                  </div>
                )}

                {/* Tab 4: Portfolio & Risk */}
                {activeTab === "portfolio" && (
                  <div className="grid gap-4 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                      <PortfolioCard profile={profile} r={result} />
                    </div>
                    <AnalyticsPanel r={result} />
                  </div>
                )}

                {/* Tab 5: Compare & Audit */}
                {activeTab === "audit" && (
                  <div className="space-y-4">
                    <ComparePanel primary={result} />
                    <SessionPanel
                      session={result.session}
                      storageLabel={result.storage.label}
                    />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {/* Reloaded Last Session Fallback */}
        {phase !== "done" && lastSession && (
          <SessionPanel
            session={lastSession.session}
            storageLabel={`${lastSession.storage.label} — reloaded from last session (R8)`}
            title="Last Persisted Session Record"
          />
        )}

        <footer className="pt-6 text-center text-xs leading-relaxed text-zinc-500">
          <p>
            SignalProof is research decision support, not investment advice. No execution, no price prediction, no guarantees.
          </p>
          <p className="mt-0.5 text-[11px] text-zinc-600">
            Hackverse PS-01 · 3 Parallel Agents · Grounded RAG · Deterministic Concentration Policy
          </p>
        </footer>
      </main>

      {/* Global Modals & AI Copilot */}
      <HowItWorks open={showHow} onClose={() => setShowHow(false)} />
      <CitationModal
        citation={inspectCitation}
        claims={result?.agents.flatMap((a) => a.claims ?? [])}
        onClose={() => setInspectCitation(null)}
      />
      <SupportChatbot
        result={result}
        profile={profile}
        symbol={symbol}
        scenario={scenario}
        onCitationInspect={(c) => setInspectCitation(c)}
      />
    </div>
  );
}
