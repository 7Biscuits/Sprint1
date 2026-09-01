// ── Shared domain types (superset of the PRD §5 AgentResult contract) ──
// The PRD contract is extended with `claims`, `provenance` and `durationMs`
// so that "every factual claim has a citation id" (R3/R4) is machine-checkable.

export type Signal = "bullish" | "neutral" | "bearish" | "unavailable";
export type AgentName = "technical" | "filing" | "news";
export type AgentStatus = "complete" | "unavailable";
export type Scenario = "normal" | "missing_news" | "missing_filing" | "conflict";
export type DataMode = "live" | "cached";
export type ActionCode = "DO_NOT_INCREASE" | "CONSIDER_SMALL_STAGED_ADD" | "WAIT_REVIEW";
export type RiskTolerance = "conservative" | "moderate" | "growth";
export type Decision = "will_review" | "dismissed";

export interface Citation {
  id: string;
  title: string;
  url?: string;
  date: string; // ISO date of the document
  docType: string;
  publisher: string;
  excerpt: string; // exact displayed excerpt, checked in verbatim
}

export interface Claim {
  claim: string;
  citationIds: string[]; // must be non-empty after validation
}

/** PRD §5 contract + documented extensions (claims/provenance/durationMs/generatedBy). */
export interface AgentResult {
  agent: AgentName;
  status: AgentStatus;
  signal: Signal;
  confidence: number; // 0–100
  evidence: string[]; // max 3
  claims?: Claim[];
  citations: Citation[];
  provenance: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  fallbackUsed: boolean;
  /** Which path produced this result: "llm" (citation-constrained model output) or "rules" (deterministic). */
  generatedBy?: "llm" | "rules";
  unavailableReason?: string;
}

export interface OhlcvPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketSnapshot {
  snapshotId: string;
  symbol: string;
  mode: DataMode;
  source: string;
  fetchedAt: string; // when the data was actually fetched (live) or originally captured (cached)
  snapshotDate: string; // trading date of the last bar
  currency: string;
  dataQuality: "ohlcv" | "close_only";
  points: OhlcvPoint[];
  price: number;
  prevClose: number;
  changePct: number;
  liveAttempted: boolean;
  liveError?: string;
  /** true when the snapshot was served from the TTL response cache instead of a fresh provider call. */
  cacheHit?: boolean;
  cacheAgeMinutes?: number;
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
  volumeRatio: number; // last day vs 20-day average
  volumeAvailable: boolean;
  pointsUsed: number;
  sufficientHistory: boolean;
}

export interface ProfileHolding {
  symbol: string;
  name: string;
  weightPct: number;
  valueInr: number;
}

export interface Profile {
  id: string;
  name: string;
  riskTolerance: RiskTolerance;
  description: string;
  horizon: string;
  monthlySurplusInr: number;
  holdings: ProfileHolding[];
  portfolioValueInr: number;
}

export interface OutlookContribution {
  agent: AgentName;
  weightPct: number;
  signal: Signal;
  contribution: number;
}

export interface Cap {
  reason: string;
  cap: number;
}

export interface Synthesis {
  outlook: {
    label: Signal;
    confidence: number;
    directionScore: number;
    contributions: OutlookContribution[];
  };
  conflict: { flag: boolean; agents: AgentName[]; bannerText?: string };
  capsApplied: Cap[];
  action: {
    code: ActionCode;
    label: string;
    ruleId: string;
    reason: string;
    confidence: number;
  };
  concentration: {
    symbolWeightPct: number;
    hhi: number;
    holdingValueInr: number;
    portfolioValueInr: number;
  };
  citationCount: number;
  claimCount: number;
  citedClaimCount: number;
}

export interface AgentSessionMetric {
  agent: AgentName;
  status: AgentStatus;
  signal: Signal;
  confidence: number;
  latencyMs: number;
  fallbackUsed: boolean;
  unavailableReason?: string;
}

export interface AnalysisSessionRecord {
  session_id: string;
  started_at: string;
  completed_at: string;
  total_latency_ms: number;
  symbol: string;
  profile_id: string;
  profile_name: string;
  risk_tolerance: RiskTolerance;
  scenario: Scenario;
  data_mode: DataMode;
  data_source: string;
  data_fetched_at: string;
  data_age_days: number;
  agent_summary: AgentSessionMetric[];
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
  final_action_code: ActionCode;
  final_confidence: number;
  final_rule_id: string;
  raw_signal_fingerprint: string;
  storage_mode: "supabase" | "local_file";
  decision: Decision | null;
  decision_at: string | null;
}

export interface StorageInfo {
  mode: "supabase" | "local_file";
  label: string;
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
    mode: DataMode;
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
  parallelProof: {
    launchAt: string;
    startSpreadMs: number;
    allStartedBeforeFirstResult: boolean;
  };
  agents: AgentResult[];
  rawSignalFingerprint: string;
  synthesis: Synthesis;
  session: AnalysisSessionRecord;
  storage: StorageInfo;
}
