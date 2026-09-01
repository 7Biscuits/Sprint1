/** Mirrors the server's AnalyzeResponse contract (server/src/types.ts). */

export type Signal = "bullish" | "neutral" | "bearish" | "unavailable";
export type AgentName = "technical" | "filing" | "news";
export type AgentStatus = "complete" | "unavailable";
export type Scenario = "normal" | "missing_news" | "missing_filing" | "conflict";
export type Decision = "will_review" | "dismissed";

export interface Citation {
  id: string;
  title: string;
  url?: string;
  date: string;
  docType: string;
  publisher: string;
  excerpt: string;
}

export interface Claim {
  claim: string;
  citationIds: string[];
}

export interface AgentResult {
  agent: AgentName;
  status: AgentStatus;
  signal: Signal;
  confidence: number;
  evidence: string[];
  claims?: Claim[];
  citations: Citation[];
  provenance: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  fallbackUsed: boolean;
  generatedBy?: "llm" | "rules";
  unavailableReason?: string;
}

export interface Profile {
  id: string;
  name: string;
  riskTolerance: "conservative" | "moderate" | "growth";
  description: string;
  horizon: string;
  monthlySurplusInr: number;
  portfolioValueInr: number;
  holdings: { symbol: string; name: string; weightPct: number; valueInr: number }[];
}

export interface Stock {
  symbol: string;
  name: string;
  sector: string;
}

export interface Indicators {
  price: number;
  prevClose: number;
  changePct: number;
  rsi14: number;
  ma20: number;
  ma50: number;
  maRelation: "above_both" | "between" | "below_both";
  return30dPct: number;
  return90dPct: number;
  volatility20dPct: number;
  high6m: number;
  low6m: number;
  distanceFromHighPct: number;
  drawdownFromHighPct: number;
  rangePositionPct: number;
  volumeRatio: number;
  volumeAvailable: boolean;
  pointsUsed: number;
  sufficientHistory: boolean;
}

export interface Synthesis {
  outlook: {
    label: Signal;
    confidence: number;
    directionScore: number;
    contributions: { agent: AgentName; weightPct: number; signal: Signal; contribution: number }[];
  };
  conflict: { flag: boolean; agents: AgentName[]; bannerText?: string };
  capsApplied: { reason: string; cap: number }[];
  action: { code: string; label: string; ruleId: string; reason: string; confidence: number };
  concentration: { symbolWeightPct: number; hhi: number; holdingValueInr: number; portfolioValueInr: number };
  citationCount: number;
  claimCount: number;
  citedClaimCount: number;
}

export interface SessionRecord {
  session_id: string;
  started_at: string;
  completed_at: string;
  total_latency_ms: number;
  symbol: string;
  profile_id: string;
  profile_name: string;
  risk_tolerance: string;
  scenario: string;
  data_mode: string;
  data_source: string;
  data_fetched_at: string;
  data_age_days: number;
  agent_summary: {
    agent: AgentName;
    status: AgentStatus;
    signal: Signal;
    confidence: number;
    latencyMs: number;
    fallbackUsed: boolean;
    unavailableReason?: string;
  }[];
  technical_latency_ms: number;
  filing_latency_ms: number;
  news_latency_ms: number;
  concentration_pct: number;
  concentration_hhi: number;
  citation_count: number;
  claim_count: number;
  cited_claim_count: number;
  conflict_flag: boolean;
  conflict_agents: AgentName[];
  caps_applied: string[];
  market_outlook: Signal;
  market_outlook_confidence: number;
  final_action: string;
  final_action_code: string;
  final_confidence: number;
  final_rule_id: string;
  raw_signal_fingerprint: string;
  storage_mode: string;
  decision: Decision | null;
  decision_at: string | null;
}

export interface AnalyzeResponse {
  sessionId: string;
  startedAt: string;
  completedAt: string;
  totalLatencyMs: number;
  symbol: string;
  scenario: Scenario;
  snapshot: {
    snapshotId: string;
    symbol: string;
    mode: "live" | "cached";
    source: string;
    fetchedAt: string;
    snapshotDate: string;
    currency: string;
    dataQuality: "ohlcv" | "close_only";
    price: number;
    prevClose: number;
    changePct: number;
    pointCount: number;
    closesPreview: number[];
    liveAttempted: boolean;
    liveError?: string;
    cacheHit?: boolean;
    cacheAgeMinutes?: number;
    identicalSnapshotReused: boolean;
  };
  indicators: Indicators;
  parallelProof: { launchAt: string; startSpreadMs: number; allStartedBeforeFirstResult: boolean };
  agents: AgentResult[];
  rawSignalFingerprint: string;
  synthesis: Synthesis;
  session: SessionRecord;
  storage: { mode: "supabase" | "local_file"; label: string };
}
