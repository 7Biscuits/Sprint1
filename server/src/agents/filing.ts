import type { AgentResult, Claim, Citation, MarketSnapshot } from "../types.js";
import type { RetrievedChunk } from "../rag.js";
import { config } from "../config.js";
import { llmJson, sanitizeAgentLlm } from "../llm.js";
import { isoNow } from "../utils.js";

const POSITIVE = [
  "growth", "grew", "up", "higher", "record", "strong", "increase", "exceeds",
  "expansion", "recovery", "recovering", "milestone", "steady", "on track", "progressing",
  "comfortable", "supported", "drive", "rose", "crossing", "accelerate",
];
const NEGATIVE = [
  "decline", "declined", "down", "lower", "loss", "weak", "decrease", "pressure",
  "soft", "softer", "slip", "slipped", "delay", "risk", "overhang", "cooled", "slowing",
];

/**
 * Filing/RAG agent (PRD R3): evidence may only reference the retrieved
 * citation ids; every factual claim must carry ≥1 citation id or the claim
 * is dropped before it ever leaves the server. Signal is deterministic
 * lexicon scoring over retrieved excerpts (rank-weighted).
 */
export async function runFiling(
  snapshot: MarketSnapshot,
  retrieved: RetrievedChunk[],
  launchAt: string,
  unavailable: boolean,
  unavailableReason?: string,
): Promise<AgentResult> {
  const completedAt = isoNow();
  const base: AgentResult = {
    agent: "filing",
    status: "complete",
    signal: "neutral",
    confidence: 45,
    evidence: [],
    claims: [],
    citations: [],
    provenance: "Retrieval over the curated, dated filing corpus (versioned fixture).",
    startedAt: launchAt,
    completedAt,
    durationMs: 0,
    fallbackUsed: false,
  };

  if (unavailable) {
    return {
      ...base,
      status: "unavailable",
      signal: "unavailable",
      confidence: 0,
      unavailableReason:
        unavailableReason ?? "Filing corpus retrieval unavailable (prepared degraded scenario). Filing-derived claims are removed entirely — none are invented.",
    };
  }
  if (retrieved.length === 0) {
    return {
      ...base,
      status: "unavailable",
      signal: "unavailable",
      confidence: 0,
      unavailableReason: "No corpus chunks retrieved; the filing agent cannot speak without sources.",
    };
  }

  const citations: Citation[] = retrieved.map((r) => ({
    id: r.doc.id,
    title: r.doc.title,
    url: r.doc.url,
    date: r.doc.date,
    docType: r.doc.docType,
    publisher: r.doc.publisher,
    excerpt: r.doc.excerpt,
  }));

  const rankWeight = [3, 2, 1];
  let score = 0;
  retrieved.forEach((r, i) => {
    const text = `${r.doc.title} ${r.doc.excerpt}`.toLowerCase();
    const w = rankWeight[i] ?? 1;
    for (const term of POSITIVE) if (text.includes(term)) score += w;
    for (const term of NEGATIVE) if (text.includes(term)) score -= w;
  });
  let signal: AgentResult["signal"] = "neutral";
  if (score >= 3) signal = "bullish";
  else if (score <= -3) signal = "bearish";
  const confidence = Math.min(88, 55 + 8 * Math.min(Math.abs(score), 4));

  const evidence: string[] = [];
  const claims: Claim[] = [];
  retrieved.forEach((r, i) => {
    const firstSentence = r.doc.excerpt.split(/(?<=\.)\s/)[0] ?? r.doc.excerpt;
    const trimmed = firstSentence.length > 180 ? `${firstSentence.slice(0, 177)}…` : firstSentence;
    evidence.push(`${trimmed} [${r.doc.id}]`);
    claims.push({
      claim: `${r.doc.docType === "annual_report" ? "Annual report" : "Results press release"} dated ${r.doc.date}: ${trimmed}`,
      citationIds: [r.doc.id],
    });
  });

  // ── Optional LLM phrasing (PRD §5): the model may re-phrase evidence from the
  //    SAME retrieved excerpts only; citation ids are validated after generation
  //    and unsupported claims are dropped. Deterministic result is the fallback.
  const llmEnabled = config.llm.mode === "openai" && Boolean(config.llm.apiKey);
  if (llmEnabled) {
    const suppliedIds = citations.map((c) => c.id);
    const system =
      "You are the Filing analyst in a multi-agent equity-research system. " +
      "Use ONLY the supplied excerpts; never add outside knowledge or numbers. " +
      "Every evidence bullet MUST end with a [citation-id] in square brackets using ONLY the supplied ids. " +
      "Max 3 evidence bullets, each one sentence. " +
      'Reply with ONLY this JSON: {"signal":"bullish|neutral|bearish","confidence":0-100,' +
      '"evidence":["... [id]"],"claims":[{"claim":"...","citationIds":["id"]}]}.';
    const user =
      `Stock: ${snapshot.symbol}. Snapshot date: ${snapshot.snapshotDate}.\n` +
      `Retrieved excerpts (citation ids):\n` +
      citations.map((c) => `[${c.id}] ${c.title} (${c.docType}, ${c.date})\n"${c.excerpt}"`).join("\n\n") +
      `\nClassify the filing signal and cite responsibly.`;
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
        provenance: `LLM (${config.llm.model}) phrasing grounded ONLY on the ${citations.length} retrieved excerpts; citation ids validated post-generation.`,
      };
    }
    return {
      ...base,
      signal,
      confidence,
      evidence: evidence.slice(0, 3),
      claims,
      citations,
      generatedBy: "rules",
      fallbackUsed: true, // LLM was configured but failed validation/unavailable → deterministic fallback used
      provenance: `Deterministic lexicon scoring over the retrieved excerpts (LLM output failed contract validation and was discarded).`,
    };
  }

  return {
    ...base,
    signal,
    confidence,
    evidence: evidence.slice(0, 3),
    claims,
    citations,
    generatedBy: "rules",
    provenance: `Retrieval top-${retrieved.length} over the 8-chunk curated corpus (cosine similarity + lexical blend); deterministic lexicon scoring; excerpts are checked in verbatim.`,
  };
}
