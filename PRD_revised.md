# SignalProof — Sprint 1 Revised PRD

**Hackverse: Into the Web — PS-01**  
**Delivery constraint:** 24-hour hackathon  
**Decision made:** Build one trustworthy, end-to-end equity-research decision for two saved retail-investor profiles. Do not attempt a general-purpose investing platform.

## 0. Source reconciliation

This plan treats `Problem_Statement.txt` as the authority. The original proposal has the right product direction, but its P0 scope is closer to a production platform than a 24-hour demonstrator.

| Problem-statement requirement / constraint | Status in proposed PRD | Revised decision |
| --- | --- | --- |
| Transform real/near-real-time market data, filings, and behavioral signals into personalized, explainable intelligence | Partly covered. It proposes a market API, filings, and risk/portfolio data, but never commits to a freshness policy or interaction history. | Use a live market attempt with a visibly timestamped cached snapshot fallback; use stored risk and holdings as the behavioral profile required by the minimum requirements. Interaction history is explicitly out of sprint scope. |
| An inexperienced retail investor should receive the result in under 60 seconds | The context states this bar; the PRD shows an illustrative 4.2 s latency but no target or acceptance test. | Set an analysis target of under 15 s live and under 5 s from cache; reject any flow that cannot complete under 60 s. |
| Three specialized agents run in parallel with defined roles and structured outputs consumed by synthesis | Covered conceptually, but the UI-only status list does not prove concurrency or contracts. | Show per-agent start/end timings and render validated structured results from the same analysis session. |
| Signal classification across at least three independent dimensions, with confidence and cited reasoning | Mostly covered, but the dimensions and evidence rule are dispersed across sections. | Make Technical, Filing/RAG, and News/Sentiment the three mandatory dimensions; each emits a label, confidence, evidence, provenance, and availability state. |
| RAG grounded in a document corpus, with visible attribution | Covered, but the proposed PDF ingestion, embeddings, storage, and pgvector build is over-scoped for 24 hours. | Pre-curate a small, dated disclosure corpus for the demo stock; retrieve via precomputed embeddings/cosine similarity, with lexical fallback. Every filing claim links to its document, date, and displayed excerpt. |
| Stored risk parameters or behavioral history must demonstrably change output on identical inputs | Covered well for risk and concentration; the broader dependency's historical interaction pattern is absent. | Demonstrate two persisted demo profiles against one immutable market snapshot. This meets the minimum requirement through stored risk parameters, while **not meeting the broader interaction-history dependency** this sprint. |
| Live UI: market labels, synthesis with attribution, portfolio/watchlist state, reasoning traces | Covered, but split across four pages and many components. | Build one analysis screen with all required proof visible. A watchlist is optional; a portfolio card is mandatory. |
| Persist agent outputs, decisions, and at least three session metrics across sessions | Metrics are listed, but storage, decision capture, and retrieval are not concretely planned. | Persist a compact session record (agent outputs, profile id, outcome label, latency, concentration, citation count, data mode) in Supabase. If it is unavailable, use device-local storage and label that fallback. Capture an explicit “I will review / dismiss” demo decision. |
| Gracefully handle missing data or conflicting signals; never produce uncited output | Covered, though the fallback policy is not operationally specific. | Use an explicit agent `unavailable` state and a deterministic confidence cap. A missing filing removes filing-derived claims; a missing news feed still returns a cited technical/filing result. |
| One raw-ingestion-to-recommendation scenario, visible reasoning chain, plus written architecture/decision summary for judges | Covered in the demo narrative, but no packaged judge artifact or checkable completion definition. | Ship a one-page `ARCHITECTURE.md`/in-app “How this decision was made” panel and a rehearsed demo scenario with a cached-data backup. |
| 24-hour deadline | Mentioned, but contradicted by a P0 list containing accounts, vector infrastructure, multiple pages, streaming-adjacent data, history, watchlists, and deployment choices. | Feature-freeze at hour 18; only the vertical slice is P0. Infrastructure and breadth are cuts, not unfinished promises. |

### Stated evaluation criteria and deliverables

The problem statement does **not** publish weighted judging criteria or a numeric scoring rubric. Its minimum requirements are the effective pass/fail rubric, and are all mapped in this PRD. It also requires a brief written architecture/decision-logic summary for judges; that is now an explicit deliverable. The only stated deadline is the 24-hour hackathon.

### Significant scope and architecture changes

- **Cut:** email/password authentication, multi-page portfolio/profile/watchlist flows, live streaming, a broad stock search universe, PDF upload/extraction, full Supabase Storage + pgvector ingestion, a separate charting project, and analysis history UI. These make the demo less reliable without proving more of PS-01.
- **Changed:** use a curated, versioned corpus for one stock rather than live document ingestion. It makes citations inspectable and the RAG result repeatable. A live document pipeline is a post-sprint enhancement.
- **Changed:** use a cached market snapshot as a declared fallback, not hidden mock data. The system always shows `LIVE` or `CACHED`, source, and timestamp.
- **Kept:** native TypeScript `Promise.all` orchestration rather than an agent framework. It directly demonstrates parallelism and minimizes failure points.

## 1. Problem framing

Young Indian retail investors can see price charts, headlines, and filings, but cannot quickly reconcile their meaning with their own risk and concentrated holdings; an unexplained “buy” signal is especially unsafe when many F&O participants lose money. Existing screeners, news feeds, and trackers each cover one data source, not the personalized reasoning between them.

**Success is a first-time investor receiving, in under 60 seconds, a source-backed, profile-specific “increase / wait / do not increase” research action whose evidence chain remains visible even when one source fails.**

## 2. Solution overview

SignalProof is a single-screen research briefing for one Indian equity. A user selects a saved investor profile and runs an analysis. The backend fetches or loads a timestamped market snapshot, retrieves relevant filing excerpts, and runs Technical, Filing, and News agents concurrently. A deterministic risk layer then adjusts their synthesis for portfolio concentration and risk tolerance.

**Judge pitch:** “SignalProof turns the same market signal into two safer answers—because it can prove both the evidence and the investor context behind each one.”

The product offers research decision support only: no trade execution, price prediction, or guaranteed-return language.

## 3. Scope discipline

### Must-have — one demoable vertical slice

1. A single React analysis screen for `RELIANCE.NS` with saved **Conservative / 60% Reliance** and **Growth / 10% Reliance** profiles.
2. A market adapter that returns price, historical OHLCV, volume, freshness timestamp, and source mode (`live` or `cached`), followed by deterministic RSI, 20/50-day moving-average relation, 30-day return, and volume ratio calculation.
3. A curated, dated corpus of 6–10 Reliance filing/earnings excerpts with source URL, title, date, and exact displayed excerpt; semantic retrieval for the Filing agent.
4. Three concurrently launched, structured agents: Technical, Filing/RAG, and News/Sentiment. Each shows signal, confidence, concise evidence, sources, availability, and timing.
5. A deterministic risk/concentration adjustment and synthesis that changes the recommended action between the two profiles on the identical snapshot.
6. Visible citations, conflict banner, data-mode label, degraded-data state, informational disclaimer, and an explicit no-fabrication rule.
7. A persisted analysis-session log with at least five metrics and a simple “review / dismiss” user-decision capture.
8. One primary happy path and one rehearsed missing-news degradation path, plus a short architecture/decision-logic document.

### Should-have — only after the end-to-end slice is stable

- Static price mini-chart derived from the returned OHLCV.
- A “compare profiles” toggle that displays the two final actions side by side.
- A single, precomputed conflicting-signal scenario selectable in demo mode.
- A small 30-day historical-snapshot check reporting directional signal accuracy, clearly labelled as a limited retrospective sample rather than a performance claim.

### Won’t build this sprint

- Brokerage connections, order placement, F&O recommendations, or real-money execution.
- User registration, email login, password resets, or storage of real portfolios.
- A free-form stock universe, watchlist product, news feed, notifications, streaming prices, or a multi-page portfolio tracker.
- User PDF uploads, automatic SEBI filing crawling, general document ingestion, full vector-database operations, or model training.
- Historical interaction-pattern modeling. This is a conscious limitation against the broader dependency in the statement; stored risk parameters and holdings satisfy the minimum personalization requirement.
- Microservices, queues, Redis, Kubernetes, and a generic multi-agent framework.

**Why these cuts:** Judges can verify a complete causal chain—data → parallel evidence → personalized action → persistent metrics—far more readily than a wide interface with partial integrations.

## 4. Requirements and acceptance criteria

| ID | User story | Acceptance criteria |
| --- | --- | --- |
| R1 | As a retail investor, I can start an analysis and know whether the market data is current enough to trust. | The screen displays symbol, price, change, source, `LIVE` or `CACHED`, and ISO timestamp. The backend first attempts the market provider and falls back to a bundled dated snapshot on timeout/error. The response contains at least 50 OHLCV periods and volume; otherwise Technical is `unavailable`, not invented. |
| R2 | As a user, I can see three independent perspectives arrive in parallel. | One request launches Technical, Filing, and News agents with `Promise.allSettled`; each result validates against a shared JSON schema. The UI shows all three start/end durations and a common session id. In the normal path all begin before any result is awaited; the response has exactly one result or explicit unavailable state for each agent. |
| R3 | As a user, I can inspect the evidence behind a filing-based claim. | Filing retrieval returns the top 2–3 corpus chunks with title, source URL, date, document type, and excerpt. Every Filing-agent factual claim has at least one returned citation id. A citation opens or expands the exact excerpt; no citation means the claim is omitted. |
| R4 | As a user, I get a classified signal rather than opaque prose. | Each of Technical, Filing, and News returns `bullish`, `neutral`, `bearish`, or `unavailable`; confidence 0–100; no more than three evidence bullets; provenance; and latency. Technical evidence includes calculated indicators, not LLM arithmetic. |
| R5 | As two investors with different risk and holdings, we receive meaningfully different advice from the same evidence. | Running the same locked market snapshot for the two stored profile ids preserves the three raw agent outputs. The Conservative profile (60% Reliance concentration) returns `DO NOT INCREASE`; the Growth profile (10% Reliance concentration) may return `CONSIDER A SMALL, STAGED ADD` only if the evidence threshold is met. The UI states the concentration score and policy rule causing the difference. |
| R6 | As a user, I can understand uncertainty rather than be pushed to a false conclusion. | If agents disagree, the synthesis displays a conflict banner, names the disagreeing agents, and caps confidence at 60. If News is unavailable, the card states why, final confidence is capped at 65, and no news-derived statement appears. If Filing is unavailable, the action is never stronger than `WAIT FOR MORE EVIDENCE`. |
| R7 | As a judge, I can see that the product is personalized, safe, and traceable. | The final panel separates market outlook from profile-specific action; displays disclaimer, evidence cards, citations, data freshness, and confidence; never uses “guaranteed”, “certain profit”, or an execution CTA. |
| R8 | As the team, we can prove the system performed rather than merely show a screen. | On completion, persist session id, timestamp, profile id, data mode/freshness, total latency, three agent latencies, concentration score, citation count, agent availability, conflict flag, final confidence/action, and review/dismiss decision. A reload can show the last session record. |
| R9 | As a judge reviewing after the demo, I can understand the architecture and reasoning policy. | Repository includes a <=1-page architecture/decision-logic summary naming sources, agent contracts, concentration policy, confidence caps, fallback behavior, and disclaimer. It is available from the UI or printed beside the demo. |

## 5. Technical approach

### Architecture

```text
React + TypeScript single screen
        │ POST /api/analyze { symbol, profileId, scenario }
        ▼
Fastify TypeScript API
  ├─ Market adapter ── live Yahoo-compatible endpoint → 10 s timeout → versioned snapshot
  ├─ Indicator calculator (RSI, MA20/MA50, return, volume ratio)
  ├─ Retrieval service ── local curated chunks + precomputed embeddings → cosine top-k
  ├─ News adapter ── provider headlines → cached headlines / unavailable
  └─ Promise.allSettled([Technical, Filing, News])
                         │ structured, validated agent results
                         ▼
          Risk policy (deterministic) → synthesis policy/LLM → session log
                         │
                         ▼
           Supabase sessions + profiles (local-storage fallback) → UI
```

### Stack and data flow

- **Frontend:** React, TypeScript, Vite, Tailwind; one route, no router required. Recharts only if the mini-chart is completed after P0.
- **API:** Node.js, TypeScript, Fastify. One endpoint prevents client-side API-key exposure and ensures all agents use the same immutable snapshot.
- **Market data:** a Yahoo Finance-compatible chart endpoint behind a `MarketProvider` interface. Cache the most recent validated Reliance response plus a versioned bundled snapshot. Display source/timestamp, never claim cached data is live.
- **Documents/RAG:** a checked-in JSON corpus of verified Reliance results/annual-report excerpts. Generate embeddings before the demo (OpenAI embeddings if available); retrieve top-k with local cosine similarity. A lexical title/keyword ranking fallback keeps citations working without the embeddings call. Do not fabricate a live filing feed.
- **News:** one provider/API or a small cached dated headline set for the demo. The news agent can be unavailable; it is not silently replaced with invented sentiment.
- **Agent logic:** indicators and concentration are calculated code. An OpenAI-compatible structured-output model may turn bounded inputs into evidence phrasing and a signal, but schema validation, citation linking, and safety rules are code-enforced. A deterministic rules-based response is the fallback when the LLM is unavailable.
- **Persistence:** Supabase Postgres holds only anonymous demo profile ids and session records. Use service credentials only on the server. Local storage is a clearly labelled demo fallback, not a substitute for production persistence.

### Agent output contract

```ts
type AgentResult = {
  agent: "technical" | "filing" | "news";
  status: "complete" | "unavailable";
  signal: "bullish" | "neutral" | "bearish" | "unavailable";
  confidence: number; // 0–100
  evidence: string[]; // maximum 3
  citations: { id: string; title: string; url?: string; excerpt: string }[];
  startedAt: string;
  completedAt: string;
  fallbackUsed: boolean;
  unavailableReason?: string;
};
```

### Decision policy (concrete choice)

1. The raw market outlook is determined from the three agent labels, weighted Technical 35%, Filing 45%, News 20%; unavailable agents receive no positive contribution.
2. A conflict exists when complete agents include both bullish and bearish labels. It visibly reduces confidence and triggers the 60 cap.
3. Portfolio concentration is holding value / total portfolio value; show both percentage and HHI-style concentration score.
4. If the selected stock is >=40% of a Conservative profile, action is `DO NOT INCREASE` regardless of bullish outlook. If concentration is <20% and risk is Growth, an otherwise bullish, non-conflicted, cited analysis may say `CONSIDER A SMALL, STAGED ADD`. All remaining cases are `WAIT / REVIEW`.
5. The action says what to investigate, not what to trade. The final panel differentiates the factual market outlook from the policy-based investor action.

### Risks, mitigations, and fallbacks

| Risk | Mitigation / fallback |
| --- | --- |
| Market API rate-limit, delay, or outage | Cache one validated snapshot and bundle a dated fixture. Enforce a 10-second timeout and make the data mode prominent. |
| News API unavailable or ambiguous | Exercise the required degraded scenario: News becomes `unavailable`, no claim is emitted, and synthesis confidence caps at 65. |
| RAG hallucination or citation mismatch | Retrieve first; agents can reference only supplied citation ids; validate ids after generation; omit unsupported claims. Use exact visible excerpts. |
| LLM quota, malformed JSON, or latency | Set a short timeout; validate structured output; use deterministic indicator/rules templates and preserve the same evidence/citations. Do not block the pipeline. |
| Insufficient/dirty OHLCV history | Validate 50 periods and volume. Mark Technical unavailable and downgrade the recommendation, rather than calculate partial indicators. |
| Supabase configuration or network failure | Queue the compact session locally and display `stored locally`; prepare an exportable JSON session record for judge inspection. |
| Scope/integration failure near deadline | Build the entire flow on fixtures first. Add live providers only behind adapters after the deterministic slice works. Freeze features at hour 18. |

### Authentication, access control, and data handling

- There is no user account or real financial account connection in Sprint 1. Profiles are anonymous demo ids; do not enter real holdings, PAN, broker, or contact information.
- The Fastify server owns all provider/LLM/Supabase secrets; the browser receives only sanitized results and public citations.
- Supabase tables use row-level policies in a production path. For the demo, a server-side service role writes only anonymous, non-PII records; never expose that key to the client.
- Retain demo session records only for the event, then delete/export them. A real release requires consent, authenticated ownership, encrypted storage, retention controls, and a financial-compliance review.

## 6. Sprint execution plan (24 hours)

| Time | Milestone and dependency | Exit condition |
| --- | --- | --- |
| 0:00–0:45 | Lock decisions; choose demo symbol, exact two profiles, one bullish/neutral data snapshot, corpus sources, and ownership. | A written scenario card and data files exist; no team member begins an optional feature. |
| 0:45–2:30 | Build fixtures and schemas first: OHLCV snapshot, 6–10 cited chunks, cached headlines, profile records, `AgentResult`, `AnalysisSession`. | `POST /api/analyze` can return deterministic sample data with validated contracts. |
| 2:30–5:00 | Implement indicator calculator, retrieval top-k, and deterministic Technical/Filing/News results. | Three complete evidence cards render from a single session. |
| 5:00–7:00 | Add native parallel orchestration, timings, risk policy, synthesis, conflict and unavailable states. | Browser network trace/session log demonstrates concurrent starts; Conservative and Growth actions differ on same input. |
| 7:00–9:00 | Build the one-screen UI, source expansion, portfolio card, final action, disclaimer, and data-mode label. | A judge can complete R1–R7 without navigating elsewhere. |
| 9:00–10:30 | Add Supabase persistence and local fallback; persist five-plus metrics and last session. | Reload retrieves a session record; a forced persistence failure labels local fallback. |
| 10:30–12:30 | Integrate live market adapter and optional news provider behind already-working fixtures. | Live success and timeout fallback both render correctly; no provider is a single point of failure. |
| 12:30–14:00 | Assemble `ARCHITECTURE.md`, data provenance list, test checklist, and a clean demo reset control. | Written judge deliverable is complete; source URLs/date labels are checked. |
| 14:00–16:00 | Integration test against the required normal, profile-change, conflict, and missing-news scenarios. Fix correctness and readability only. | All must-have acceptance checks pass in a fresh browser. |
| 16:00–18:00 | **Feature freeze at hour 18.** Package deploy/local run, record a 60–90 second backup video, and capture screenshots. | Team can launch the stable build and reset the demo without an internet connection. |
| 18:00–21:00 | Rehearse the exact judge narrative; tighten copy, accessibility, and visual hierarchy. | Two consecutive rehearsals finish in <3 minutes. |
| 21:00–24:00 | Buffer for deployment/demo hardware, final smoke test, and rest. | No new features; only break-fix changes with a re-test. |

Dependencies are deliberately ordered: trustworthy fixtures/contracts precede agents; agents precede UI; the fixture path precedes every external integration; persistence and failure demos precede feature freeze.

## 7. Demo strategy

### Three-minute judge narrative and happy path

1. **Hook (0:00–0:20):** “A chart may look bullish, but that does not mean every investor should buy more. SignalProof shows the proof and adapts the action to the investor.”
2. **Run analysis (0:20–0:50):** Select Reliance and the Conservative profile. Start the analysis; point to the `LIVE`/`CACHED` freshness label and the three agent cards starting together.
3. **Prove reasoning (0:50–1:25):** Show the Technical indicators, expand one Filing citation to its dated source excerpt, and show News evidence. Explain that agents see bounded data and cannot invent citations.
4. **Prove personalization (1:25–1:55):** Highlight bullish/neutral market outlook but `DO NOT INCREASE`: Reliance is 60% of this conservative portfolio. Switch only to Growth / 10% Reliance and rerun the identical locked snapshot. The raw evidence stays unchanged; the action changes to a staged/conditional consideration.
5. **Prove safety and resilience (1:55–2:25):** Toggle the prepared missing-news scenario. The card becomes unavailable, confidence drops to its cap, and the system remains cited and functional. Optionally show the prepared conflict banner.
6. **Close (2:25–3:00):** Open the persisted session metrics and architecture summary: latency, agent timings, citations, concentration, availability. “We did not build another stock picker; we built an auditable decision layer that knows when not to recommend increasing exposure.”

### Prepared versus live

- **Prepared:** two anonymous profiles, validated cited corpus, cached OHLCV/headline fixtures, forced degraded/conflict scenarios, metric records, reset button, architecture summary, and backup video/screenshots.
- **Run live when available:** a fresh market-data call and (optional) news call. The demo remains honest: the UI calls out the source and timestamp, and switches to its prepared dated snapshot on failure.

### On-stage failure plan

1. If network/provider fails, use the built-in cached scenario and say so; its source and timestamp remain on screen.
2. If the LLM fails, run the deterministic structured-output fallback; indicators, retrieved citations, risk policy, and session logging still work.
3. If deployment fails, use the tested local build and backup video as evidence, then show the architecture and saved results.
4. If a citation link cannot open externally, expand the checked-in excerpt in the app and identify its document title/date.

## 8. Differentiation and proof metrics

### Why this can win

Most submissions will likely stop at a chatbot, a chart signal, or a generic recommendation. SignalProof makes four observable claims in one short interaction:

1. **Parallel, independent analysis:** timing makes the multi-agent architecture visible rather than decorative.
2. **Grounded explainability:** claims lead to an exact dated filing excerpt, not a hidden prompt or opaque confidence score.
3. **True personalization:** one input yields two different, policy-explained actions because holdings and risk matter.
4. **Safe failure behavior:** the system calls out missing/conflicting evidence and becomes less certain instead of becoming more persuasive.

### Numbers/evidence shown to judges

| Proof | Target / presentation |
| --- | --- |
| End-to-end time | Target <15 s live and <5 s cached; hard usability ceiling <60 s. Show total session latency. |
| Parallelism | Three agent start/end timings from one session; demonstrate all launched before aggregation. |
| Citation coverage | 100% of Filing factual claims have a visible citation; display number of retrieved chunks and cited claims. |
| Personalization | Same snapshot, same raw agent results; 60% Conservative profile → `DO NOT INCREASE`, 10% Growth profile → differentiated conditional action. |
| Risk evidence | Display concentration percentage and HHI-style score for each profile. |
| Resilience | Forced missing-news run returns a complete cited result with confidence <=65 and a clear unavailable card. |
| Persistence | Session log stores at least 10 fields, including three-plus measurable metrics, and survives reload or labels local fallback. |
| Optional retrospective check | If completed only after P0, report results for a fixed 30-snapshot sample with dates and methodology. Never claim investment performance from a tiny sample. |

## 9. Open questions and assumptions

| Item | Current assumption / decision | Needed action |
| --- | --- | --- |
| Exact demo stock and source permissions | `RELIANCE.NS` and publicly accessible, attributable financial disclosures are usable for the event. | Verify titles, dates, URLs, and allowed access before hour 2; replace with another liquid NSE stock only once, before corpus work starts. |
| Market/news provider quota | A free or existing provider is accessible; it may fail during the event. | Implement and test fixture fallback before connecting the provider. |
| LLM/embedding credentials | An OpenAI-compatible endpoint is available. | Keep all model calls optional behind deterministic templates and lexical/cosine retrieval fallback. |
| Team size and deployment host | Not specified. | Assign one owner each for data/backend, UI/integration, and demo/provenance; use one tested host or local build, not a new deployment platform late in the sprint. |
| Definition of “behavioral signals” | Stored risk tolerance and holdings satisfy the stated *minimum* requirement. | Explicitly disclose that historical click/trade behavior is not implemented; do not imply it is. |
| Financial advice posture | The project is education/research support, not regulated personalized financial advice or execution. | Keep predefined action language, show disclaimer, avoid return claims, and collect no real financial data. |
| Judging rubric | No weighted rubric was supplied in the problem statement. | Optimize evidence against every minimum requirement and make each one visible in the demo, rather than guessing point weights. |

## 10. Definition of done

The sprint is done only when a fresh browser can run the primary scenario, switch profiles on the same snapshot, inspect a dated filing excerpt, view three parallel structured results, force the missing-news fallback, and reload a session log—all within the rehearsed demo—while the written architecture/decision-logic summary is ready for judges.
