import { createHash } from "node:crypto";
import { config } from "./config.js";
import { fetchWithTimeout } from "./utils.js";

/**
 * Optional LLM helper (OpenAI-compatible, structured output) — works with
 * OpenAI, OpenRouter, Groq, Together, etc. Responses are cached in-memory by
 * prompt hash so identical inputs (e.g. profile re-runs on a locked snapshot)
 * are byte-identical, free, and instant.
 *
 * Robustness rules (PRD §5): short timeout; tolerate providers that reject
 * response_format; tolerate markdown-fenced JSON; any failure returns null and
 * the caller falls back to deterministic templates. Never blocks the pipeline.
 */

const responseCache = new Map<string, unknown>();

export function llmCacheSize(): number {
  return responseCache.size;
}

function extractJson(content: string): unknown | null {
  const cleaned = content.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

async function chatOnce(
  messages: { role: string; content: string }[],
  useJsonMode: boolean,
): Promise<{ ok: boolean; content?: string; status?: number }> {
  const body: Record<string, unknown> = {
    model: config.llm.model,
    temperature: 0,
    messages,
  };
  if (useJsonMode) body.response_format = { type: "json_object" };
  try {
    const res = await fetchWithTimeout(
      `${config.llm.baseUrl}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // OpenRouter wants the models list attribution; harmless elsewhere.
          "HTTP-Referer": "https://signalproof.demo",
          "X-Title": "SignalProof",
          Authorization: `Bearer ${config.llm.apiKey}`,
        },
        body: JSON.stringify(body),
      },
      config.llm.timeoutMs,
    );
    if (!res.ok) return { ok: false, status: res.status };
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content;
    return content ? { ok: true, content } : { ok: false, status: 200 };
  } catch {
    return { ok: false };
  }
}

/** Returns parsed JSON or null on any failure. Cached by prompt hash. */
export async function llmJson(system: string, user: string): Promise<unknown | null> {
  if (config.llm.mode !== "openai" || !config.llm.apiKey) return null;
  const cacheKey = createHash("sha256")
    .update(`${config.llm.model}\u0000${system}\u0000${user}`)
    .digest("hex")
    .slice(0, 24);
  if (responseCache.has(cacheKey)) return responseCache.get(cacheKey) ?? null;

  const messages = [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
  // Some providers (and many free models) reject response_format — retry without it.
  let attempt = await chatOnce(messages, true);
  if (!attempt.ok || !attempt.content) attempt = await chatOnce(messages, false);
  if (!attempt.ok || !attempt.content) return null;

  const parsed = extractJson(attempt.content);
  if (parsed === null || typeof parsed !== "object") return null;
  responseCache.set(cacheKey, parsed);
  return parsed;
}

/** Free-form grounded text chat completion for copilot support. */
export async function llmTextChat(
  system: string,
  history: { role: "user" | "assistant"; content: string }[],
): Promise<string | null> {
  if (config.llm.mode !== "openai" || !config.llm.apiKey) return null;
  const messages = [
    { role: "system", content: system },
    ...history,
  ];
  const attempt = await chatOnce(messages, false);
  return attempt.ok && attempt.content ? attempt.content : null;
}

// ── Shared guard: sanitize + validate a model's agent output against the
//    citation contract. Anything that fails becomes null → deterministic
//    fallback (PRD: schema validation & citation linking are code-enforced). ──

export interface SanitizedAgentOutput {
  signal: "bullish" | "neutral" | "bearish";
  confidence: number;
  evidence: string[];
  claims: { claim: string; citationIds: string[] }[];
}

export function sanitizeAgentLlm(raw: unknown, suppliedIds: string[]): SanitizedAgentOutput | null {
  if (typeof raw !== "object" || raw === null) return null;
  const o = raw as Record<string, unknown>;
  const signal = o.signal;
  if (signal !== "bullish" && signal !== "neutral" && signal !== "bearish") return null;
  const confidenceRaw = typeof o.confidence === "number" ? o.confidence : Number(o.confidence);
  if (!Number.isFinite(confidenceRaw)) return null;
  const confidence = Math.round(Math.min(100, Math.max(0, confidenceRaw)));
  const supplied = new Set(suppliedIds);
  const idPattern = /\[([A-Za-z0-9][A-Za-z0-9-]*)\]/g;

  const evidenceRaw = Array.isArray(o.evidence) ? o.evidence : [];
  const evidence = evidenceRaw
    .filter((e): e is string => typeof e === "string" && e.trim().length > 0)
    .map((e) => e.trim())
    .filter((e) => {
      for (const m of e.matchAll(idPattern)) if (supplied.has(m[1]!)) return true;
      return false;
    })
    .slice(0, 3);
  if (evidence.length === 0) return null;

  const claimsRaw = Array.isArray(o.claims) ? o.claims : [];
  const claims = claimsRaw
    .filter(
      (c): c is { claim: string; citationIds: string[] } =>
        typeof c?.claim === "string" &&
        Array.isArray(c.citationIds) &&
        c.citationIds.length > 0 &&
        c.citationIds.every((id: string) => supplied.has(id)),
    )
    .slice(0, 6);
  return { signal, confidence, evidence, claims };
}
