# SignalProof

## 🚀 LIVE DEMO: [HTTPS://SIGNALPROOF-PHI.VERCEL.APP/](https://signalproof-phi.vercel.app/)

**Hackverse: Into the Web — PS-01.** A single-screen, multi-agent equity-research briefing for an eight-stock NSE research universe. It turns one immutable market snapshot into **two different, policy-explained actions** for two saved investor profiles — with every claim cited, every data mode labelled (`LIVE`/`CACHED`), and every failure degraded gracefully instead of hidden.

> "SignalProof turns the same market signal into two safer answers — because it can prove both the evidence and the investor context behind each one."

## What the app does (one click, end-to-end)

```
"Run analysis" → POST /api/analyze {symbol, profileId, scenario, snapshotId?}
 1. Market adapter    live Yahoo chart API (query2 → query1 failover, 10 s timeout)
                      → Yahoo close-only fallback → same-symbol TTL cache (15 min)
                      → bundled dated Reliance snapshot only.
                      Always labelled LIVE or CACHED with source + timestamp.
 2. Indicators        RSI(14), MA20/MA50 relation, 30/90-day return, volatility,
                      drawdown, range position, and volume where supplied —
                      calculated in code, never by a model.
 3. RAG retrieval     top-3 excerpts from the curated 8-document dated corpus
                      (cosine over hashed-embedding vectors + lexical blend).
 4. THREE AGENTS IN PARALLEL (Promise.allSettled, shared launch timestamp)
    • Technical — pure deterministic indicator code
    • Filing    — LLM-phrased evidence constrained to retrieved citation ids
                  (validated after generation; deterministic rules fallback)
    • News      — sentiment over cached dated headlines (same LLM guard)
 5. Synthesis policy  outlook = 35% technical + 45% filing + 20% news;
                      conflict → 60 cap · news missing → 65 · filings missing → 55;
                      concentration rules C1/G1/D1/F1 pick the final action.
 6. Persistence       35-field session record (12 metrics) → Supabase Postgres
                      (live, verified) or labelled device-local fallback.
```

## Quick start

```bash
npm install                  # installs server + client workspaces
npm run build && npm start   # DETERMINISTIC DEMO → http://localhost:8787
npm run dev                  # LIVE MODE → UI :5173 (Vite) + API :8787, uses .env
npm start:live               # live mode with the built UI on :8787
```

The server **auto-loads `.env`** from the project root (no dotenv package needed; explicit shell env vars win). All credentials are optional — with none, the app runs on checked-in fixtures with honest labels.

| Mode | Command | Market data | LLM | Persistence |
| --- | --- | --- | --- | --- |
| **Deterministic demo** (stage-safe) | `npm run build && npm start` | bundled dated fixture (isolated demo cache) | off | Supabase if configured, else local file |
| **Live** | `npm run dev` / `npm start:live` | real Yahoo (query2→query1) + 15-min TTL cache | your key (OpenRouter/OpenAI), rules fallback | Supabase (verified working) |

| Env | Default | Meaning |
| --- | --- | --- |
| `MARKET_MODE` | `live` | `live` = try Yahoo chart API (10 s timeout) → file cache → bundled dated snapshot; `cached` = deterministic fixture only (demo mode) |
| `NEWS_MODE` | `cached` | cached dated headline set (no live provider this sprint, by PRD cut) |
| `LLM_MODE` / `OPENAI_API_KEY` / `OPENAI_MODEL` | `off` | optional structured-output LLM; deterministic templates otherwise |
| `EMBEDDINGS_MODE` | `local` | `local` = deterministic hashed-embedding cosine + lexical blend; `openai` uses real embeddings with automatic fallback |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | unset | session persistence; absent/failed → labelled device-local store (`supabase/schema.sql` has the table) |

## How to use the app (every control, top to bottom)

1. **Pick a company and saved profile** (top cards): choose from eight NSE tickers, then select *Meera · Conservative* or *Arjun · Growth*. A new company/profile selection clears the prior board so the next run is always explicit.
2. **Pick a demo scenario**: *Normal* (primary path), *Missing news* (degraded: news card unavailable, confidence ≤65), *Missing filings* (degraded: action capped at WAIT, confidence ≤55), *Conflicting signals* (prepared conflict: banner, cap 60). Changing the scenario resets the board.
3. **Run analysis**: watch the proof strip fill in — session id, *parallel proof* (all 3 launched before any result, 0 ms start spread), the *raw-evidence fingerprint*, total latency.
4. **Market header + risk lens**: price, change, `LIVE`/`CACHED` badge, source host, fetch timestamp, indicator chips, sparkline, allocation/evidence pies, 90-day return, volatility, drawdown, and range position. `CLOSE-ONLY` visibly withholds volume/OHLC claims when Yahoo's main endpoint is rate-limited.
5. **Agent cards** (Technical / Filing / News): signal pill + confidence bar, ≤3 evidence bullets with clickable `[citation-id]` chips, expandable dated excerpts (publisher · docType · date · source link), a **`LLM · cited` or `rules` badge** showing which path produced the output, per-agent timings, and provenance lines. Unavailable agents state why — they never invent content.
6. **Portfolio card**: holdings with weight bars, the analysed stock's concentration %, HHI score, risk tolerance, and the disclosed modeling limitation.
7. **Final panel**: *Market outlook* (evidence-weighted, with each agent's weighted contribution) is deliberately separated from *Your action* (policy-based, rule id + plain-language reason + caps applied). Then capture the demo decision: **"I will review"** or **"Dismiss"** (persisted with a timestamp).
8. **Compare profiles** card: runs the *other* profile on the same snapshot and shows both actions side by side with the fingerprint proof that only the policy changed.
9. **Session log**: 12 metrics + per-agent table + storage badge (`Supabase` or `stored locally (fallback)`), **export JSON** for judge inspection. Reload the page — the last session re-appears labelled as reloaded (R8).
10. **Top bar**: "How this decision was made" (in-app architecture summary) and "Reset demo" (clears the device-local copy).

## Run the proof

```bash
npm run acceptance      # 38 hermetic checks across R1–R8 (own API, own temp cache, LLM/Supabase off)
npm run live-check      # boots with your real .env: live fetch, TTL cache hit, LLM-by badge, Supabase write
npm run fixture:snapshot  # regenerate the deterministic OHLCV fixture (seeded, constraint-checked)
```

Last verified live run: Yahoo snapshot fetched (fallback labelled honestly when Yahoo 429s), Filing+News `by=llm` via `minimax/minimax-m3:free` on OpenRouter, storage `supabase`, warm run 1.1 s vs 7.7 s cold. Manual R1–R9 click-path: `docs/TEST_CHECKLIST.md`. Provenance per corpus item: `docs/PROVENANCE.md`. Judge architecture summary: `ARCHITECTURE.md` (also in-app).

## API reference (all server-side; keys never reach the browser)

| Endpoint | Purpose |
| --- | --- |
| `POST /api/analyze` | `{profileId, scenario?, snapshotId?, symbol?}` → full briefing (snapshot, indicators, 3 agent results, synthesis, session, storage info) |
| `GET /api/profiles` | the two saved demo profiles with holdings |
| `GET /api/sessions/last` | last persisted session (Supabase first, local fallback) |
| `POST /api/sessions/:id/decision` | `{decision: "will_review"\|"dismissed"}` |
| `GET /api/corpus` | the cited corpus (id, title, url, date, docType, excerpt) |
| `GET /api/health` | modes + persistence status |

```bash
curl -s localhost:8787/api/analyze -H 'Content-Type: application/json' \
  -d '{"profileId":"profile_growth_002","scenario":"missing_news"}' | jq '.synthesis.action, .agents[] | {agent,signal,confidence}'
```

## What to demo (3 minutes)

1. **Run** Conservative → `LIVE`/`CACHED` badge + three agent cards starting together (0 ms spread).
2. **Inspect** Technical indicators (calculated code, not LLM), expand a Filing citation to its dated verbatim excerpt, read News evidence. Point at the `LLM · cited` badge — the model only phrased evidence from the retrieved excerpts; ids were validated after generation.
3. **Switch** to Growth on the locked snapshot → same raw-evidence fingerprint, different action: 60 % Conservative → **DO NOT INCREASE** (rule C1); 10 % Growth → **CONSIDER A SMALL, STAGED ADD** when the evidence threshold is met on the fixture, else WAIT/REVIEW with the threshold named (rule D1) — the policy explains whichever way it lands.
4. **Break it safely** → Missing news: card goes `unavailable`, confidence capped at 65, result stays cited. Optional: Conflicting signals banner (cap 60).
5. **Prove it performed** → Session log (12 metrics), "I will review" decision, reload, export JSON.

**Demo-day tips:** warm the caches once (run one analysis before the judges arrive) — warm runs are ~1 s. Yahoo occasionally 429s both hosts; then the UI says so and serves the cached real snapshot — that *is* the resilience story, tell it proudly. For a fully deterministic narrative use `npm start` (fixture-backed).

## Troubleshooting

| Symptom | Meaning / fix |
| --- | --- |
| Header says CACHED with a `query2/query1 responded 429` note | Yahoo rate-limited that host; the TTL cache (≤15 min) or last good snapshot is served honestly. Wait or `rm server/data/cache/*.json` to retry live. |
| Agent badge shows `rules` + `fallback` | The LLM failed or returned invalid/uncited JSON — the deterministic path took over by design. Check `OPENAI_*` in `.env`; free OpenRouter models are rate-limited. |
| Session log says `stored locally` | Supabase env missing/failed. Re-run `npx supabase db push`, check `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`. |
| Port already in use | `PORT` in `.env`, or kill the old process (`pkill -f 'server/src/index.ts'`). |

## Layout

```
server/src/        Fastify API — one /api/analyze; market adapter chain; deterministic
                   indicators; hashed-embedding RAG; three agents (Promise.allSettled);
                   policy synthesis (C1/G1/D1/F1 + 60/65/55 caps); persistence w/ fallback
server/src/data/   checked-in fixtures: versioned OHLCV snapshot, 8-chunk cited corpus,
                   cached headlines, two demo profiles
client/src/        one-screen React UI — proof strip, agent cards with expandable citations,
                   portfolio card (concentration + HHI), outlook-vs-action final panel,
                   session log, sparkline, compare-profiles
scripts/           acceptance.mjs (38 checks) · generate-snapshot.mjs
docs/              PROVENANCE.md · TEST_CHECKLIST.md      supabase/schema.sql
```

## Honest limitations (declared, not hidden)

Market/news fixtures are synthetic and dated (`docs/PROVENANCE.md`); corpus URLs point to RIL's investor pages and were not machine-verified at build time — spot-check before demoing, the linked source governs. Behavioral personalization = stored risk parameters + holdings only; historical interaction patterns are explicitly **not** modelled. Research decision support only — no execution, no performance claims, no PII.
