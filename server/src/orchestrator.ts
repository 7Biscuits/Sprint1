import { randomId, isoNow, sha256Short, daysBetween, round2 } from "./utils.js";
import type {
  AnalysisSessionRecord,
  AgentResult,
  AnalyzeResponse,
  Decision,
  Profile,
  Scenario,
} from "./types.js";
import { config, supabaseConfigured } from "./config.js";
import { resolveSnapshot } from "./market.js";
import { computeIndicators } from "./indicators.js";
import type { MarketSnapshot } from "./types.js";
import { topK } from "./rag.js";
import { runTechnical } from "./agents/technical.js";
import { runFiling } from "./agents/filing.js";
import { runNews } from "./agents/news.js";
import { synthesize } from "./synthesis.js";
import { concentrationHhi, concentrationPct, DEMO_SYMBOL } from "./data/profiles.js";
import { validateAgentResult } from "./schemas.js";
import { saveSession } from "./persistence.js";

/** In-memory registry of immutable snapshots so profile re-runs reuse identical inputs (R5). */
const snapshotRegistry = new Map<string, MarketSnapshot>();

function unavailableAgent(
  agent: AgentResult["agent"],
  reason: string,
  launchAt: string,
): AgentResult {
  const now = isoNow();
  return {
    agent,
    status: "unavailable",
    signal: "unavailable",
    confidence: 0,
    evidence: [],
    claims: [],
    citations: [],
    provenance: "No output — the agent failed or its result failed contract validation.",
    startedAt: launchAt,
    completedAt: now,
    durationMs: 0,
    fallbackUsed: false,
    unavailableReason: reason,
  };
}

export async function runAnalysis(
  symbol: string,
  profile: Profile,
  scenario: Scenario,
  reuseSnapshotId?: string,
): Promise<AnalyzeResponse> {
  const startedAt = isoNow();

  // ── R1: resolve the immutable market snapshot (live attempt → cache → fixture) ──
  let identicalSnapshotReused = false;
  let snapshot: MarketSnapshot;
  if (reuseSnapshotId && snapshotRegistry.has(reuseSnapshotId) && snapshotRegistry.get(reuseSnapshotId)!.symbol === symbol) {
    snapshot = snapshotRegistry.get(reuseSnapshotId)!;
    identicalSnapshotReused = true;
  } else {
    snapshot = await resolveSnapshot(symbol);
    snapshotRegistry.set(snapshot.snapshotId, snapshot);
    if (snapshotRegistry.size > 20) {
      const first = snapshotRegistry.keys().next().value;
      if (first) snapshotRegistry.delete(first);
    }
  }
  const indicators = computeIndicators(snapshot);

  // ── R3: retrieval for the Filing agent (top-3) ──
  // The checked-in filing/news corpus is Reliance-specific. Other stocks stay
  // useful through their real OHLCV risk analysis, but never inherit Reliance
  // evidence under a different ticker.
  const companyEvidenceAvailable = symbol === "RELIANCE.NS";
  const filingQuery =
    "Reliance quarterly results revenue EBITDA growth Jio ARPU retail stores net profit margin debt capex new energy outlook";
  const retrieved = companyEvidenceAvailable ? await topK(filingQuery, 3) : [];

  // ── R2: all three agents launch together; nothing is awaited between launches ──
  const launchAt = isoNow();
  const newsScenario =
    scenario === "missing_news" ? "unavailable" : scenario === "conflict" ? "conflict" : "normal";
  const settled = await Promise.allSettled([
    Promise.resolve().then(() => runTechnical(snapshot, indicators, launchAt)),
    Promise.resolve().then(() =>
      runFiling(
        snapshot,
        retrieved,
        launchAt,
        scenario === "missing_filing" || !companyEvidenceAvailable,
        !companyEvidenceAvailable ? `No company filing corpus is loaded for ${symbol}; Reliance documents are intentionally not reused.` : undefined,
      ),
    ),
    Promise.resolve().then(() => runNews(
      snapshot,
      launchAt,
      companyEvidenceAvailable ? newsScenario : "unavailable",
      !companyEvidenceAvailable ? `No company news dataset is loaded for ${symbol}; Reliance headlines are intentionally not reused.` : undefined,
    )),
  ]);

  const agents: AgentResult[] = settled.map((r, i) => {
    const names: AgentResult["agent"][] = ["technical", "filing", "news"];
    if (r.status === "fulfilled") {
      const validated = validateAgentResult(r.value);
      if (!validated) {
        return unavailableAgent(names[i]!, "Agent result failed shared-schema validation.", launchAt);
      }
      return validated;
    }
    return unavailableAgent(names[i]!, `Agent crashed: ${String(r.reason).slice(0, 160)}`, launchAt);
  });

  // Defensive drop: any claim without a citation id is removed server-side (PRD R3).
  for (const a of agents) {
    if (a.claims) a.claims = a.claims.filter((c) => c.citationIds.length > 0);
  }

  const completedAt = isoNow();
  const totalLatencyMs = Math.max(1, Date.parse(completedAt) - Date.parse(startedAt));
  const agentStarts = agents.map((a) => Date.parse(a.startedAt));
  const agentEnds = agents.map((a) => Date.parse(a.completedAt));
  const parallelProof = {
    launchAt,
    startSpreadMs: Math.max(...agentStarts) - Math.min(...agentStarts),
    allStartedBeforeFirstResult:
      Math.max(...agentStarts) <= Math.min(...agentEnds) &&
      agentStarts.every((s) => Math.abs(s - Date.parse(launchAt)) < 50),
  };

  // R5 proof: fingerprint of the raw agent outputs, independent of profile.
  const rawSignalFingerprint = sha256Short(
    JSON.stringify(
      agents.map((a) => ({
        agent: a.agent,
        signal: a.signal,
        confidence: a.confidence,
        evidence: a.evidence,
        status: a.status,
      })),
    ),
  );

  const symbolWeightPct = concentrationPct(profile, symbol);
  const hhi = concentrationHhi(profile);
  const holding = profile.holdings.find((h) => h.symbol === symbol);
  const synthesis = synthesize(
    agents,
    profile,
    symbol,
    symbolWeightPct,
    hhi,
    holding?.valueInr ?? 0,
    profile.portfolioValueInr,
  );

  const sessionId = randomId("sess");
  const record: AnalysisSessionRecord = {
    session_id: sessionId,
    started_at: startedAt,
    completed_at: completedAt,
    total_latency_ms: totalLatencyMs,
    symbol,
    profile_id: profile.id,
    profile_name: profile.name,
    risk_tolerance: profile.riskTolerance,
    scenario,
    data_mode: snapshot.mode,
    data_source: snapshot.source,
    data_fetched_at: snapshot.fetchedAt,
    data_age_days: daysBetween(snapshot.snapshotDate, completedAt),
    agent_summary: agents.map((a) => ({
      agent: a.agent,
      status: a.status,
      signal: a.signal,
      confidence: a.confidence,
      latencyMs: a.durationMs,
      fallbackUsed: a.fallbackUsed,
      unavailableReason: a.unavailableReason,
    })),
    technical_latency_ms: agents.find((a) => a.agent === "technical")?.durationMs ?? 0,
    filing_latency_ms: agents.find((a) => a.agent === "filing")?.durationMs ?? 0,
    news_latency_ms: agents.find((a) => a.agent === "news")?.durationMs ?? 0,
    concentration_pct: symbolWeightPct,
    concentration_hhi: hhi,
    citation_count: synthesis.citationCount,
    claim_count: synthesis.claimCount,
    cited_claim_count: synthesis.citedClaimCount,
    conflict_flag: synthesis.conflict.flag,
    conflict_agents: synthesis.conflict.agents,
    caps_applied: synthesis.capsApplied.map((c) => c.reason),
    market_outlook: synthesis.outlook.label,
    market_outlook_confidence: synthesis.outlook.confidence,
    final_action: synthesis.action.label,
    final_action_code: synthesis.action.code,
    final_confidence: synthesis.action.confidence,
    final_rule_id: synthesis.action.ruleId,
    raw_signal_fingerprint: rawSignalFingerprint,
    storage_mode: "local_file",
    decision: null,
    decision_at: null,
  };

  let storage;
  let stored = record;
  try {
    const result = await saveSession(record);
    storage = result.storage;
    stored = result.record;
  } catch (err) {
    storage = {
      mode: "local_file" as const,
      label: `Persistence error (${String(err).slice(0, 80)}) — session not durably stored`,
    };
  }

  return {
    sessionId,
    startedAt,
    completedAt,
    totalLatencyMs,
    symbol,
    scenario,
    snapshot: {
      snapshotId: snapshot.snapshotId,
      symbol: snapshot.symbol,
      mode: snapshot.mode,
      source: snapshot.source,
      fetchedAt: snapshot.fetchedAt,
      snapshotDate: snapshot.snapshotDate,
      currency: snapshot.currency,
      dataQuality: snapshot.dataQuality,
      price: round2(snapshot.price),
      prevClose: round2(snapshot.prevClose),
      changePct: round2(snapshot.changePct),
      pointCount: snapshot.points.length,
      closesPreview: snapshot.points.slice(-90).map((p) => p.close),
      liveAttempted: snapshot.liveAttempted,
      liveError: snapshot.liveError,
      cacheHit: snapshot.cacheHit,
      cacheAgeMinutes: snapshot.cacheAgeMinutes,
      identicalSnapshotReused,
    },
    indicators,
    parallelProof,
    agents,
    rawSignalFingerprint,
    synthesis,
    session: stored,
    storage,
  };
}

export async function decide(sessionId: string, decision: Decision) {
  const { attachDecision } = await import("./persistence.js");
  return attachDecision(sessionId, decision);
}

export function meta() {
  return {
    marketMode: config.market.mode,
    newsMode: config.news.mode,
    llmMode: config.llm.mode,
    embeddingsMode: config.embeddings.mode,
    persistenceConfigured: supabaseConfigured(),
    demoSymbol: DEMO_SYMBOL,
  };
}
