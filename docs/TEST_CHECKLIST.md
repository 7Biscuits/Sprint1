# Test Checklist — SignalProof must-haves (R1–R9)

**Automated (all 38 checks passing):** `npm run acceptance` (cached deterministic) and `MARKET_MODE=live npm run acceptance` (live path with fallback). The script boots the API, drives normal / profile-switch / missing-news / missing-filing / conflict scenarios, and asserts persistence + decision capture.

## Manual click-path in a fresh browser (`npm run dev` or `npm run build && npm start` → http://localhost:8787)

| # | Criterion | Click path | Expected proof on screen |
| --- | --- | --- | --- |
| 3b | R4 generation path | Agent card badges | Filing + News show `LLM · cited` (model phrased evidence from the retrieved inputs; ids validated post-generation) or `rules` + `fallback` when the LLM failed — either way the evidence stays citation-bound. Technical always shows calculated code. |
| 4b | R1 response cache | Run analysis twice in live mode | Second run: `CACHED` + "Response cache hit … X min old (TTL 15 min)" + much lower total latency; mode stays honestly labelled. |
| 1 | R1 freshness | Conservative card → Run analysis | Symbol, ₹ price, change %, `LIVE`/`CACHED` badge, source, ISO fetched-at, last-bar date, 130 bars, indicator chips (RSI/MA/30-day/volume). If live fails, the fallback error is shown and mode stays `CACHED`. |
| 2 | R2 parallelism | Same run | Proof strip: `parallel proof: all 3 launched before first result · start spread 0 ms`; each agent card shows started hh:mm:ss.mmm → completed + duration; common session id. |
| 3 | R4 contracts | Agent cards | Signal pill (bullish/neutral/bearish), confidence bar 0–100, ≤3 evidence bullets, provenance line; Technical evidence contains the exact RSI/MA/return numbers from the header chips. |
| 4 | R3 citations | Filing card → expand a claim/citation chip | Exact dated excerpt block with publisher, docType, date, open-source link; every claim chip resolves to a returned citation id. |
| 5 | R5 personalization | Note fingerprint → Growth card (auto re-run on locked snapshot) | `identical snapshot reused` note; **same** raw-evidence fingerprint; Conservative = DO NOT INCREASE (rule C1, 60 %, HHI 4450); Growth = CONSIDER A SMALL, STAGED ADD (rule G1, 10 %, HHI 2950). |
| 6 | R5 compare (should-have) | Compare profiles card → Run other profile | Both actions side by side + "the policy layer alone changed the answer" fingerprint note. |
| 7 | R6 missing news | Scenario → Missing news → Run | News card amber "Unavailable" with reason, zero news evidence/citations; caps list shows the 65 cap; result still cited (technical + filing). |
| 8 | R6 conflict | Scenario → Conflicting signals → Run | Conflict banner names disagreeing agents; confidence ≤ 60; action downgraded to WAIT / REVIEW. |
| 9 | R6 missing filings | Scenario → Missing filings → Run | Filing card unavailable; action never stronger than WAIT (rule F1); confidence ≤ 55. |
| 10 | R7 safety | Final panel | Market outlook (evidence-weighted, with per-agent contributions) separated from Your action (policy-based); disclaimer + no-fabrication rule; no execution CTA anywhere. |
| 11 | R8 persistence | Click "I will review" → reload page | Session log (12 metrics + agent table) shows the decision saved; after reload the last session is re-fetched; storage badge says Supabase or `stored locally (fallback)`. Export JSON downloads the record. |
| 12 | R8 local fallback | Stop API → reload | Amber notice "API unreachable — loaded the last device-local session"; device-local badge. |
| 13 | R9 judges | "How this decision was made" button | In-app summary mirroring `ARCHITECTURE.md`; full docs in repo. |
| 14 | Reset | "Reset demo" | Clears device-local session and returns to idle state. |

## Not built (declared, per PRD scope cuts)
30-day retrospective signal-accuracy check (optional should-have), live news provider, authentication, watchlists, PDF ingestion, interaction-history modeling.
