import type {
  ActionCode,
  AgentName,
  AgentResult,
  Cap,
  Profile,
  Signal,
  Synthesis,
} from "./types.js";
import { clamp } from "./utils.js";

/**
 * Deterministic synthesis + risk policy (PRD §5 "Decision policy").
 * No model output can override these rules; the LLM is never in this path.
 */

const WEIGHTS: Record<AgentName, number> = { technical: 0.35, filing: 0.45, news: 0.2 };
const SIGNAL_VALUE: Record<Exclude<Signal, "unavailable">, number> = {
  bullish: 1,
  neutral: 0,
  bearish: -1,
};

const ACTION_LABEL: Record<ActionCode, string> = {
  DO_NOT_INCREASE: "DO NOT INCREASE",
  CONSIDER_SMALL_STAGED_ADD: "CONSIDER A SMALL, STAGED ADD",
  WAIT_REVIEW: "WAIT / REVIEW EXISTING POSITION",
};

function formatAgents(names: AgentName[]): string {
  return names.length <= 1
    ? names.join("")
    : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]!}`;
}

export function synthesize(
  agents: AgentResult[],
  profile: Profile,
  symbol: string,
  symbolWeightPct: number,
  hhi: number,
  holdingValueInr: number,
  portfolioValueInr: number,
): Synthesis {
  const complete = agents.filter((a) => a.status === "complete");
  const capsApplied: Cap[] = [];

  // 1) Weighted market outlook; unavailable agents get no positive contribution.
  const contributions = agents.map((a) => ({
    agent: a.agent,
    weightPct: Math.round((WEIGHTS[a.agent] ?? 0) * 100),
    signal: a.signal,
    contribution:
      a.status === "complete"
        ? (WEIGHTS[a.agent] ?? 0) *
          (SIGNAL_VALUE[a.signal as Exclude<Signal, "unavailable">] ?? 0)
        : 0,
  }));
  const directionScore = contributions.reduce((acc, c) => acc + c.contribution, 0);
  let outlook: Signal = "neutral";
  if (directionScore >= 0.2) outlook = "bullish";
  else if (directionScore <= -0.2) outlook = "bearish";
  let outlookConfidence = Math.round(clamp(40 + 55 * Math.abs(directionScore), 35, 95));

  // 2) Conflict: complete agents include both bullish and bearish → 60 cap.
  const bullish = complete.filter((a) => a.signal === "bullish").map((a) => a.agent);
  const bearish = complete.filter((a) => a.signal === "bearish").map((a) => a.agent);
  const conflictAgents = [...bullish, ...bearish];
  const conflict = bullish.length > 0 && bearish.length > 0;
  if (conflict) {
    capsApplied.push({
      reason: `Conflicting signals between ${formatAgents(conflictAgents)} — confidence capped at 60`,
      cap: 60,
    });
  }

  // 3) Unavailable-agent caps (PRD R6).
  const newsAgent = agents.find((a) => a.agent === "news");
  const filingAgent = agents.find((a) => a.agent === "filing");
  const technicalAgent = agents.find((a) => a.agent === "technical");
  if (newsAgent?.status === "unavailable") {
    capsApplied.push({
      reason: "News feed unavailable — no news-derived statement; confidence capped at 65",
      cap: 65,
    });
  }
  if (filingAgent?.status === "unavailable") {
    capsApplied.push({
      reason: "Filing corpus unavailable — confidence capped at 55 and action capped at WAIT",
      cap: 55,
    });
  }
  if (technicalAgent?.status === "unavailable") {
    capsApplied.push({
      reason: "Insufficient OHLCV for technicals — confidence capped at 55",
      cap: 55,
    });
  }
  let finalConfidence = outlookConfidence;
  for (const cap of capsApplied) finalConfidence = Math.min(finalConfidence, cap.cap);
  outlookConfidence = Math.min(outlookConfidence, finalConfidence);

  // 4) Deterministic action rules (C1 / G1 / D1 / F1).
  const filingComplete = filingAgent?.status === "complete";
  const technicalComplete = technicalAgent?.status === "complete";
  const citationCount = agents.reduce((acc, a) => acc + a.citations.length, 0);

  let ruleId: string;
  let code: ActionCode;
  let reason: string;
  if (profile.riskTolerance === "conservative" && symbolWeightPct >= 40) {
    ruleId = "C1";
    code = "DO_NOT_INCREASE";
    reason =
      `Policy C1: ${symbol} is ${symbolWeightPct}% of this conservative portfolio (HHI ${hhi}), above the 40% concentration threshold. ` +
      `Regardless of the ${outlook} market outlook, adding would increase single-stock concentration risk, so the action is DO NOT INCREASE.`;
  } else if (
    profile.riskTolerance === "growth" &&
    symbolWeightPct < 20 &&
    outlook === "bullish" &&
    !conflict &&
    filingComplete &&
    technicalComplete &&
    finalConfidence >= 65 &&
    citationCount >= 1
  ) {
    ruleId = "G1";
    code = "CONSIDER_SMALL_STAGED_ADD";
    reason =
      `Policy G1: growth profile with only ${symbolWeightPct}% in ${symbol} (HHI ${hhi}); the market outlook is bullish and unconflicted, ` +
      `filings and technicals are both complete and cited, and final confidence ${finalConfidence} ≥ 65. ` +
      `The policy permits considering a small, staged add — staged, because position-building risk is lower but not zero.`;
  } else if (!filingComplete) {
    ruleId = "F1";
    code = "WAIT_REVIEW";
    reason =
      "Policy F1: the filing corpus is unavailable, so the action can never be stronger than WAIT FOR MORE EVIDENCE (PRD R6). " +
      "Re-run once filings are retrievable to see whether the evidence supports more.";
  } else {
    ruleId = "D1";
    code = "WAIT_REVIEW";
    reason =
      `Policy D1: default action. The outlook is ${outlook} at ${finalConfidence}% confidence for a ${profile.riskTolerance} profile ` +
      `holding ${symbolWeightPct}% in ${symbol} (HHI ${hhi}). Evidence does not meet the G1 threshold for a staged add; investigate the flagged questions before any change.`;
  }

  const citedClaims = agents.flatMap((a) => a.claims ?? []);
  const conflictBanner = conflict
    ? `Conflicting signals: ${formatAgents(conflictAgents)} disagree (bullish vs bearish). Confidence is capped at 60 and the answer says what to investigate — not what to do.`
    : undefined;

  return {
    outlook: {
      label: outlook,
      confidence: outlookConfidence,
      directionScore: Math.round(directionScore * 1000) / 1000,
      contributions,
    },
    conflict: { flag: conflict, agents: conflictAgents, bannerText: conflictBanner },
    capsApplied,
    action: {
      code,
      label: ACTION_LABEL[code],
      ruleId,
      reason,
      confidence: finalConfidence,
    },
    concentration: {
      symbolWeightPct,
      hhi,
      holdingValueInr,
      portfolioValueInr,
    },
    citationCount,
    claimCount: citedClaims.length,
    citedClaimCount: citedClaims.filter((c) => c.citationIds.length > 0).length,
  };
}

