# SignalProof

## 🚀 LIVE DEMO: [HTTPS://SIGNALPROOF-PHI.VERCEL.APP/](https://signalproof-phi.vercel.app/)

**Hackverse: Into the Web — PS-01.** A single-screen, multi-agent equity-research briefing platform for an eight-stock NSE research universe. It turns one immutable market snapshot into **two different, policy-explained actions** for saved investor profiles — with every claim cited, every data mode labelled (`LIVE`/`CACHED`), an **interactive AI research copilot**, a **5-perspective tab switcher**, interactive technical charts, and graceful degradation across all failure modes.

> *"SignalProof turns the same market signal into two safer answers — because it can prove both the evidence and the investor context behind each one."*

---

## ✨ Key Features & Capabilities

### 1. 🤖 Grounded AI Support Copilot
- **Always-Available Floating Assistant**: An interactive AI research copilot positioned in the bottom-right corner with a sleek, compact glowing launcher.
- **Data-Grounded Answering**: Full awareness of the active stock ticker, price, RSI/MAs, parallel agent findings, verbatim filing citations, and portfolio concentration limits.
- **Quick-Inquiry Chips**: Instant queries for *"Why did the system choose this action?"*, *"Breakdown RSI & technicals"*, *"What do the filings say?"*, and *"Explain portfolio risk caps"*.
- **Interactive In-Chat Citations**: Clickable citation pills (`[rel-q3-fy25-01]`) inside chat responses that open the **Citation Inspector** modal directly.
- **Dual Engine (LLM + Deterministic Fallback)**: Powered by `POST /api/chat` with OpenRouter/OpenAI, backed by a robust offline deterministic reasoning engine with zero hallucinations.

### 2. 🗂️ 5-Perspective Segmented Tab Switcher
- **Interactive Perspective Control**: Recessed segmented rail with a smooth animated sliding pill indicator powered by Framer Motion.
- **5 Focused Perspectives**:
  1. **🎯 Overview & Decision**: Executive synthesis, action verdict, confidence score, and 3-agent parallel breakdown.
  2. **📈 Interactive Chart**: Real-time candlestick charts, 20/50 EMAs, RSI oscillator, volume bars, and technical metrics.
  3. **🤖 Agent Intelligence**: Deep dive into Technical, Grounded Filing RAG, and News sentiment agents.
  4. **💼 Portfolio & Risk**: Investor holdings, target concentration %, HHI score, and profile guardrail rules (`C1`, `G1`, `D1`, `F1`).
  5. **📋 Compare & Audit**: Multi-profile comparison (same raw snapshot, different policy) and 35-field session persistence audit trail.
- **Dynamic Context Badges**: Live action pills, price change, active agent counts, and persistence mode tags.
- **Keyboard Shortcuts**: Press **`1`**, **`2`**, **`3`**, **`4`**, or **`5`** anywhere on the screen to switch tabs instantly, or use arrow keys with full WAI-ARIA accessibility.

### 3. 📈 Interactive Technical & Candlestick Analysis
- Interactive charts with customizable candle/line views, 20-day & 50-day moving average overlays, and 14-period RSI indicator panel.
- Live market data fetched via Yahoo Finance chart API (`query2` → `query1` failover) with a 15-minute TTL cache and verified fallback snapshots.

### 4. 🔍 Verifiable Grounded RAG & Citation Inspector
- Top-3 chunk retrieval from curated, dated filings corpus via hashed-embedding vectors + lexical blend.
- Modal inspector for verbatim document excerpts, publisher, docType, dates, and direct links to original filings.
- Every claim cited; schema-validated and code-enforced to eliminate LLM hallucinations.

### 5. 🛡️ Deterministic Concentration & Risk Policy
- **Rule C1 (Conservative)**: Concentration >50% caps action at **DO NOT INCREASE** regardless of bullish market signals.
- **Rule G1 (Growth)**: Concentration ≤15% allows **CONSIDER A SMALL, STAGED ADD** when evidence thresholds are satisfied.
- **Degraded Scenarios**: Gracefully handles missing news (confidence capped ≤65%), missing filings (action capped at `WAIT_REVIEW`), and signal conflicts (banner + cap ≤60%).

---

## ⚡ Architecture & Pipeline (One Click, End-to-End)

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
 7. AI Copilot Chat   POST /api/chat with full grounding in snapshot + citations.
```

---

## 🚀 Quick Start & Local Development

```bash
# 1. Install dependencies across monorepo workspaces
npm install

# 2. Start full-stack in Live mode (Vite UI :5173 + Fastify API :8787)
npm run dev

# 3. Or run deterministic demo mode (:8787)
npm run build && npm start
```

### Environment Configuration (`.env`)

The server auto-loads `.env` from the project root. All variables are optional with honest fallbacks:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `8787` | Server listening port |
| `HOST` | `0.0.0.0` | Host binding interface |
| `MARKET_MODE` | `live` | `live` (Yahoo Finance with TTL cache) or `cached` (deterministic snapshot) |
| `LLM_MODE` | `openai` | `openai` (active LLM phrasing) or `off` (deterministic templates) |
| `OPENAI_API_KEY` | *(your key)* | API key for OpenRouter / OpenAI / Groq |
| `OPENAI_BASE_URL` | `https://openrouter.ai/api/v1` | OpenAI-compatible endpoint |
| `OPENAI_MODEL` | `minimax/minimax-m3:free` | LLM model identifier |
| `EMBEDDINGS_MODE` | `local` | `local` (fast deterministic hashed vectors) or `openai` |
| `SUPABASE_URL` | *(optional)* | Supabase project URL for remote Postgres persistence |
| `SUPABASE_SERVICE_ROLE_KEY` | *(optional)* | Supabase service role secret |

---

## 🧪 Verification & Acceptance Suite

```bash
# Run 38 automated hermetic acceptance checks (R1–R8)
npm run acceptance

# Test live integrations (Yahoo Live + OpenRouter LLM + Supabase Postgres)
npm run live-check

# Run TypeScript typechecks across server & client
npm run typecheck

# Build production bundles
npm run build
```

---

## 🌐 Production Deployment

- **Frontend (Vercel)**: Configured in [`client/vercel.json`](file:///Users/alshahriah/Programming/Hackathons/Hackverse/Sprint%201/client/vercel.json) with `VITE_API_BASE` pointing to the backend.
- **Backend (Heroku / Render / Railway)**: Configured with [`Procfile`](file:///Users/alshahriah/Programming/Hackathons/Hackverse/Sprint%201/Procfile) (`web: npm --workspace server run start`).
- **Docker Container**: Production multi-stage [`Dockerfile`](file:///Users/alshahriah/Programming/Hackathons/Hackverse/Sprint%201/Dockerfile) included.

---

## 📡 API Reference

| Endpoint | Method | Purpose |
| :--- | :--- | :--- |
| `/api/analyze` | `POST` | Execute 3-agent parallel briefing for a symbol & investor profile |
| `/api/chat` | `POST` | Ask questions to the grounded AI Copilot with session context |
| `/api/profiles` | `GET` | Retrieve saved investor risk profiles and stock universe |
| `/api/sessions/last`| `GET` | Fetch the last persisted research session |
| `/api/sessions/:id/decision` | `POST` | Record investor decision (`will_review` or `dismissed`) |
| `/api/corpus` | `GET` | List verified regulatory filings and citations |
| `/api/health` | `GET` | System health, market provider status, and persistence mode |

---

## ⚖️ Disclaimer & Honest Limitations
SignalProof provides research decision support, not financial execution, trading automation, or price prediction. Market and news fixtures are dated (`docs/PROVENANCE.md`). Behavioral personalization is bounded by declared risk profiles and portfolio holdings. No PII is collected or stored.
