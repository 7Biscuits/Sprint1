import type { AgentResult, Claim, Citation, MarketSnapshot } from "../types.js";
import { HEADLINES_CONFLICT, HEADLINES_NORMAL, type HeadlineItem } from "../data/headlines.js";
import { config } from "../config.js";
import { llmJson, sanitizeAgentLlm } from "../llm.js";
import { isoNow } from "../utils.js";

/**
 * News/Sentiment agent over the cached dated headline set (PRD §5: the news
 * agent may be unavailable and is never replaced with invented sentiment).
 * Sentiment is deterministic lexicon scoring per headline; every evidence
 * bullet cites its headline id.
 */
export async function runNews(
  snapshot: MarketSnapshot,
  launchAt: string,
  scenario: "normal" | "conflict" | "unavailable",
  unavailableReason?: string,
): Promise<AgentResult> {
  const completedAt = isoNow();
  const base: AgentResult = {
    agent: "news",
    status: "complete",
    signal: "neutral",
    confidence: 45,
    evidence: [],
    claims: [],
    citations: [],
    provenance: "Cached dated headline set (demo fixture); no live news provider this sprint.",
    startedAt: launchAt,
    completedAt,
    durationMs: 0,
    fallbackUsed: snapshot.mode === "cached",
  };

  if (scenario === "unavailable") {
    return {
      ...base,
      status: "unavailable",
      signal: "unavailable",
      confidence: 0,
      unavailableReason:
        unavailableReason ?? "News feed unavailable (prepared degraded scenario). No news-derived statement is emitted; synthesis confidence is capped at 65.",
    };
  }

  const headlines: HeadlineItem[] = scenario === "conflict" ? HEADLINES_CONFLICT : HEADLINES_NORMAL;
  const citations: Citation[] = headlines.map((h) => ({
    id: h.id,
    title: h.title,
    url: h.url,
    date: h.date,
    docType: h.docType,
    publisher: h.publisher,
    excerpt: h.excerpt,
  }));

  let score = 0;
  for (const h of headlines) {
    for (const s of h.sentimentLexicon) {
      if (s === "positive") score += 1;
      else if (s === "negative") score -= 1;
    }
  }
  let signal: AgentResult["signal"] = "neutral";
  if (score >= 2) signal = "bullish";
  else if (score <= -2) signal = "bearish";
  const confidence = Math.min(80, 45 + 10 * Math.min(Math.abs(score), 4));

  const evidence: string[] = headlines.slice(0, 3).map((h) => `${h.title} [${h.id}]`);
  const claims: Claim[] = headlines.slice(0, 3).map((h) => ({
    claim: `${h.date}: ${h.title}`,
    citationIds: [h.id],
  }));

  // ── Optional LLM phrasing (same bounded headline set; ids validated after).
  const llmEnabled = config.llm.mode === "openai" && Boolean(config.llm.apiKey);
  if (llmEnabled) {
    const suppliedIds = citations.map((c) => c.id);
    const system =
      "You are the News/Sentiment analyst in a multi-agent equity-research system. " +
      "Use ONLY the supplied dated headlines; never add outside knowledge. " +
      "Every evidence bullet MUST end with a [headline-id] in square brackets using ONLY the supplied ids. " +
      "Max 3 bullets. " +
      'Reply with ONLY this JSON: {"signal":"bullish|neutral|bearish","confidence":0-100,' +
      '"evidence":["... [id]"],"claims":[{"claim":"...","citationIds":["id"]}]}.';
    const user =
      `Stock: ${snapshot.symbol}.\n` +
      `Headlines:\n` +
      headlines.map((h) => `[${h.id}] (${h.date}) ${h.title} — ${h.excerpt}`).join("\n") +
      `\nClassify aggregate news sentiment and cite every bullet.`;
    const raw = await llmJson(system, user);
    const sanitized = sanitizeAgentLlm(raw, suppliedIds);
    if (sanitized) {
      return {
        ...base,
        signal: sanitized.signal,
        confidence: sanitized.confidence,
        evidence: sanitized.evidence,
        claims: sanitized.claims.length > 0 ? sanitized.claims : claims,
        citations,
        generatedBy: "llm",
        fallbackUsed: false,
        provenance: `LLM (${config.llm.model}) sentiment over ${headlines.length} cached dated headlines (fixture set ${scenario === "conflict" ? "B — conflicting" : "A — normal"}); headline ids validated post-generation.`,
      };
    }
    return {
      ...base,
      signal,
      confidence,
      evidence,
      claims,
      citations,
      generatedBy: "rules",
      fallbackUsed: true,
      provenance: `Deterministic lexicon sentiment over ${headlines.length} cached dated headlines (LLM output failed contract validation and was discarded).`,
    };
  }

  return {
    ...base,
    signal,
    confidence,
    evidence,
    claims,
    citations,
    generatedBy: "rules",
    provenance: `Deterministic lexicon sentiment over ${headlines.length} cached, dated headlines (fixture set ${scenario === "conflict" ? "B — conflicting" : "A — normal"}); no live news provider this sprint.`,
  };
}
