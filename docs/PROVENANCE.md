# Data Provenance (what is real, what is fixture)

SignalProof is honest by construction: every payload and screen labels `LIVE` vs `CACHED`, source, and timestamps. This page lists every data input and its verification status. **Where a linked public source ever disagrees with checked-in text, the linked source governs.**

## 1. Market OHLCV snapshot
- File: `server/src/data/snapshot.reliance.json` — `reliance-ohlcv-v1`, 130 NSE session dates ending **2026-08-28**, INR.
- Status: **synthetic demo fixture**, generated deterministically (`scripts/generate-snapshot.mjs`, mulberry32 seed **12**) and constraint-checked (price ₹2 902; price > MA20 ₹2 877 > MA50 ₹2 786; RSI(14) 60.0; 30-day return +5.61 %; last-day volume 1.25× the 20-day average).
- **Live path (working, verified):** `MARKET_MODE=live` calls Yahoo's chart endpoint (`query2.finance.yahoo.com` first, then `query1`) with a browser UA and a 10 s timeout. Successful responses are validated (≥50 bars) and cached with a 15-min TTL (`server/data/cache/`); fresh cache hits are served instantly and labelled CACHED with their age; failures fall back to stale cache → bundled fixture with the error surfaced in the UI and payload. `npm run live-check` verifies this chain against the real network.

## 2. Filing corpus (8 chunks, `server/src/data/corpus.ts`, `reliance-corpus-v1`)
Excerpts transcribed at build time from widely published Reliance Industries disclosures; URLs point to RIL's investor pages (`https://www.ril.com/investors`). During the build, ril.com deep links were not machine-verifiable (404 on the press-releases path from this environment), so the table below is the provenance record judges should spot-check:

| id | docType | date | content |
| --- | --- | --- | --- |
| C-RIL-RES-2025-07 | press_release | 2025-07-18 | Q1 FY26 EBITDA ₹58 024 Cr (+35.8 % YoY), net profit ₹30 781 Cr (+78.3 %); Digital +20.9 %, Retail +12.7 %, O2C decline |
| C-RIL-RES-2025-04 | press_release | 2025-04-25 | FY25 revenue ₹10 71 174 Cr, EBITDA ₹1 83 422 Cr (+2.9 %) |
| C-RIL-RES-2025-07-RET | press_release | 2025-07-18 | Retail Q1 FY26 gross revenue ₹84 171 Cr (+11.3 %), 19 592 stores, 358 M customers |
| C-RIL-RES-2025-07-DEBT | press_release | 2025-07-18 | Net debt ₹1 17 772 Cr, net debt/EBITDA < 0.6× |
| C-RIL-AR25-JIO | annual_report | 2025-08-12 | Jio 488.0 M subscribers; ARPU ₹206.2 (Mar-25 qtr) vs ₹181.7 YoY |
| C-RIL-AR25-O2C | annual_report | 2025-08-12 | O2C revenue ₹6 27 261 Cr; petchem margin pressure |
| C-RIL-AR25-NEWENERGY | annual_report | 2025-08-12 | Jamnagar giga-complex commissioning progress |
| C-RIL-AR25-CAPEX | annual_report | 2025-08-12 | FY25 capex ₹1 31 107 Cr across 5G/retail/O2C/new energy |
- The app displays each excerpt **verbatim** from this file (R3 holds by construction). If any figure cannot be verified against the linked source before the demo, delete/replace that chunk — retrieval and citations degrade gracefully.
- No live filing feed is crawled or fabricated (PRD §0).

## 3. News headlines
`server/src/data/headlines.ts` — two cached, dated fixture sets (normal, 2026-08-25→28; conflict set for the prepared scenario). Publishers are labelled `Cached demo feed · …` on screen. Status: **synthetic demo fixture**; no live news provider is wired this sprint.

## 4. Profiles
`server/src/data/profiles.ts` — two anonymous demo ids (Conservative 60 % / Growth 10 % Reliance). Not real people; no PII.

## 5. Verification commands
- `npm run acceptance` — 38 hermetic checks across R1–R8 (fixture data, LLM off, isolated temp cache).
- `npm run live-check` — boots with the real `.env`: verifies a live provider fetch (or honest fallback), the TTL cache hit on the warm run, the LLM path (`by=llm` badges) and Supabase persistence.
- `npm run fixture:snapshot` — regenerates the fixture deterministically and re-prints the indicator constraints.
