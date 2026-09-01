# SignalProof — Architecture & Decision Logic (judge summary)

**Stack:** React + TypeScript + Vite + Tailwind (one screen) · Fastify + TypeScript API (one analyze endpoint) · zod contracts · Supabase (optional, labelled local fallback). No agent framework — native `Promise.allSettled`.

## Data sources & fallback chain
- **Market:** Yahoo-Finance-compatible chart API — hosts `query2` then `query1` (both 10 s timeout; query1 is frequently 429-rate-limited, query2 is the workhorse) → TTL response cache (`MARKET_CACHE_TTL_MS`, default 15 min; fresh hits are served instantly and labelled CACHED with age) → bundled, versioned dated snapshot (`server/src/data/snapshot.reliance.json`, 130 daily OHLCV bars, seed 12). The response always carries `mode: LIVE|CACHED`, source, and timestamps; cached data is never presented as live, and provider errors are surfaced in the UI. **Verified live:** real RELIANCE.NS data fetched through this chain.
- **Filings (RAG):** curated, versioned 8-chunk Reliance corpus (`server/src/data/corpus.ts`, each with title, publisher, URL, date, docType, verbatim excerpt). Retrieval = deterministic hashed n-gram embedding cosine + lexical blend, top-3. Optional OpenAI embeddings (`EMBEDDINGS_MODE=openai`) fall back to the local vectors on any error.
- **News:** cached dated headline fixture. The agent can be `unavailable`; it is never replaced with invented sentiment.
- **LLM (live, verified):** OpenAI-compatible — works with OpenRouter/OpenAI/Groq (base URLs with or without `/chat/completions` both normalized). The Filing and News agents send ONLY bounded inputs (retrieved excerpts / cached headlines + citation ids) and must return JSON whose evidence bullets each carry a supplied citation id; `sanitizeAgentLlm` validates the contract and anything invalid is discarded in favour of the deterministic rules path (each agent card badges **LLM · cited** vs **rules**). Responses are cached by prompt hash → identical inputs give identical outputs (protects the R5 fingerprint proof) and warm runs are free/instant.

## Agents & contract
Technical (deterministic indicator code), Filing (RAG-grounded), News (lexicon sentiment) launch together from one `launchAt`; each returns `{agent, status: complete|unavailable, signal: bullish|neutral|bearish|unavailable, confidence 0–100, evidence ≤3, claims[], citations[], provenance, startedAt, completedAt, durationMs, fallbackUsed}` validated against one shared zod schema. Claims without a citation id are dropped server-side (no-fabrication rule). Parallelism proof: identical agent `startedAt` (0–2 ms spread), all starts before first completion.

## Decision policy (all deterministic, no model in this path)
- **Outlook:** weighted labels — Technical 35 %, Filing 45 %, News 20 %; unavailable agents contribute nothing. `score ≥ +0.20` bullish, `≤ −0.20` bearish, else neutral. `confidence = 40 + 55·|score|`.
- **Caps:** conflict (bullish+bearish among complete agents) → **60** · news unavailable → **65** · filings unavailable → **55** · technicals unavailable → **55**.
- **Concentration:** weight = holding / portfolio (shown % + HHI = Σ weight² ×10 000).
- **Actions:** `C1` conservative & ≥40 % → **DO NOT INCREASE** · `G1` growth & <20 % & bullish & unconflicted & filings+technicals complete & confidence ≥65 → **CONSIDER A SMALL, STAGED ADD** · `F1` filings unavailable → never stronger than **WAIT** · `D1` default **WAIT / REVIEW**. The action says what to investigate, not what to trade; the final panel separates the factual market outlook from the policy-based action.

## Fallback behavior
Market provider error/timeout → file cache → bundled snapshot, with the live error surfaced in the UI. Missing news → agent `unavailable` card, no news claims, 65 cap. Missing filings → no filing claims, 55 cap, action capped at WAIT. Supabase absent/failed → device-local session store, labelled `stored locally` everywhere; exportable JSON for judges.

## Persistence & data handling
`analysis_sessions` (35 fields; 12 measurable metrics incl. total + 3 agent latencies, concentration %, HHI, citation count, conflict flag, final action/confidence, review/dismiss decision). **Table live in the sprint Supabase project** (migration `supabase/migrations/0001_analysis_sessions.sql`, applied via `npx supabase db push`; verified insert + decision PATCH through the REST API). Service-role credentials are server-only; records are anonymous and non-PII; device-local fallback is labelled, never silent.

## Disclaimer
Research decision support only — not investment advice. No execution, no price prediction, no guaranteed/certain-profit language. Demo profiles are anonymous; stored risk parameters + holdings are the behavioral profile this sprint (historical interaction patterns explicitly not modelled). Demo session records should be deleted/exported after the event.
