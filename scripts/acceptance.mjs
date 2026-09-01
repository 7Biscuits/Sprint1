/**
 * SignalProof automated acceptance run (PRD R1–R8).
 * Boots the API on a test port, drives every required scenario, and asserts
 * the must-have acceptance criteria. Exit code 0 = all checks passed.
 *
 *   npm run acceptance                 # deterministic cached run
 *   MARKET_MODE=live npm run acceptance
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.TEST_PORT ?? 8791);
const BASE = `http://localhost:${PORT}`;
const results = [];

function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function waitHealthy(timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(`${BASE}/api/health`);
      if (r.ok) return await r.json();
    } catch {
      /* not up yet */
    }
    await new Promise((res) => setTimeout(res, 300));
  }
  throw new Error("server did not become healthy");
}

async function analyze(body) {
  const res = await fetch(`${BASE}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`analyze failed ${res.status}: ${await res.text()}`);
  return res.json();
}

const CONSERVATIVE = "profile_conservative_001";
const GROWTH = "profile_growth_002";

async function main() {
  fs.rmSync(path.join(ROOT, "server/data/local-sessions.json"), { force: true });

  const server = spawn("node", ["--import", "tsx", "server/src/index.ts"], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(PORT),
      MARKET_MODE: process.env.MARKET_MODE ?? "cached",
      // Keep the acceptance suite deterministic + hermetic regardless of .env:
      LLM_MODE: "off",
      SUPABASE_URL: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
      // Isolate the market response cache so a stale real-data cache can never
      // change the fixture-backed expectations below.
      SIGNALPROOF_CACHE_DIR: fs.mkdtempSync(path.join(os.tmpdir(), "sp-accept-")),
      HOST: "127.0.0.1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stderr.on("data", (d) => process.env.ACCEPTANCE_DEBUG && process.stderr.write(d));

  try {
    const health = await waitHealthy();
    check("R0 health", health.ok === true, `marketMode=${health.marketMode} persistence=${health.persistenceConfigured}`);

    // ── R1: normal analysis, honest data mode, ≥50 OHLCV ──
    const cons = await analyze({ profileId: CONSERVATIVE, scenario: "normal" });
    check(
      "R1 snapshot freshness fields",
      Boolean(
        cons.snapshot.symbol &&
          typeof cons.snapshot.price === "number" &&
          typeof cons.snapshot.changePct === "number" &&
          cons.snapshot.source &&
          ["live", "cached"].includes(cons.snapshot.mode) &&
          cons.snapshot.fetchedAt &&
          cons.snapshot.snapshotDate,
      ),
      `${cons.snapshot.mode} ₹${cons.snapshot.price} from "${cons.snapshot.source.slice(0, 44)}"`,
    );
    check("R1 >=50 OHLCV periods", cons.snapshot.pointCount >= 50, `${cons.snapshot.pointCount} points`);
    const tech = cons.agents.find((a) => a.agent === "technical");
    check(
      "R1 technical tied to history (unavailable, not invented, if <50)",
      cons.snapshot.pointCount >= 50 ? tech.status === "complete" : tech.status === "unavailable",
    );

    // ── R2: three parallel agents, shared session, schema-validated ──
    check("R2 exactly three agents", cons.agents.length === 3, cons.agents.map((a) => a.agent).join(","));
    check(
      "R2 one result or explicit unavailable per agent",
      cons.agents.every((a) => a.status === "complete" || (a.status === "unavailable" && Boolean(a.unavailableReason))),
    );
    check(
      "R2 all launched before any result (parallel proof)",
      cons.parallelProof.allStartedBeforeFirstResult === true,
      `startSpread=${cons.parallelProof.startSpreadMs}ms`,
    );
    const maxStart = Math.max(...cons.agents.map((a) => Date.parse(a.startedAt)));
    const minEnd = Math.min(...cons.agents.map((a) => Date.parse(a.completedAt)));
    check(
      "R2 per-agent start/end timings present",
      cons.agents.every((a) => a.startedAt && a.completedAt && typeof a.durationMs === "number") && maxStart <= minEnd,
    );
    check("R2 common session id", typeof cons.sessionId === "string" && cons.sessionId.startsWith("sess_"), cons.sessionId);

    // ── R4: structured signal contract ──
    const signalsOk = cons.agents.every(
      (a) =>
        ["bullish", "neutral", "bearish", "unavailable"].includes(a.signal) &&
        a.confidence >= 0 &&
        a.confidence <= 100 &&
        a.evidence.length <= 3 &&
        typeof a.provenance === "string" &&
        a.provenance.length > 0,
    );
    check("R4 signal/confidence<=3 evidence/provenance contract", signalsOk);
    check(
      "R4 technical evidence carries calculated indicators",
      tech.evidence.some((e) => e.includes(`RSI(14) = ${cons.indicators.rsi14}`)) && cons.indicators.rsi14 > 0,
      `RSI=${cons.indicators.rsi14} MA20=${cons.indicators.ma20} ret30=${cons.indicators.return30dPct}%`,
    );

    // ── R3: filing citations ──
    const filing = cons.agents.find((a) => a.agent === "filing");
    const citeCount = filing.citations.length;
    check("R3 filing returns top 2–3 chunks", citeCount >= 2 && citeCount <= 3, `${citeCount} chunks`);
    check(
      "R3 citations carry title/url/date/docType/excerpt",
      filing.citations.every((c) => c.title && c.date && c.docType && c.excerpt && (c.url === undefined || c.url.startsWith("http"))),
    );
    const citeIds = new Set(filing.citations.map((c) => c.id));
    check(
      "R3 every filing claim cites a returned id",
      (filing.claims ?? []).length >= 2 &&
        (filing.claims ?? []).every((cl) => cl.citationIds.length > 0 && cl.citationIds.every((id) => citeIds.has(id))),
    );

    // ── R5: two profiles, identical snapshot, different actions ──
    const growth = await analyze({ profileId: GROWTH, scenario: "normal", snapshotId: cons.snapshot.snapshotId });
    check("R5 identical snapshot reused for profile switch", growth.snapshot.identicalSnapshotReused === true);
    check(
      "R5 raw agent outputs preserved across profiles",
      growth.rawSignalFingerprint === cons.rawSignalFingerprint,
      `fp=${cons.rawSignalFingerprint}`,
    );
    const rawEqual = cons.agents.every((a, i) => {
      const g = growth.agents[i];
      return g.agent === a.agent && g.signal === a.signal && g.confidence === a.confidence && JSON.stringify(g.evidence) === JSON.stringify(a.evidence);
    });
    check("R5 raw evidence identical", rawEqual);
    check("R5 conservative 60% → DO NOT INCREASE", cons.synthesis.action.code === "DO_NOT_INCREASE", `rule ${cons.synthesis.action.ruleId}`);
    check(
      "R5 growth 10% → CONSIDER A SMALL, STAGED ADD (threshold met)",
      growth.synthesis.action.code === "CONSIDER_SMALL_STAGED_ADD",
      `rule ${growth.synthesis.action.ruleId}, outlook=${growth.synthesis.outlook.label}, conf=${growth.synthesis.action.confidence}`,
    );
    check(
      "R5 concentration % + HHI shown and policy rules named",
      cons.synthesis.concentration.symbolWeightPct === 60 &&
        cons.synthesis.concentration.hhi === 4450 &&
        growth.synthesis.concentration.symbolWeightPct === 10 &&
        growth.synthesis.concentration.hhi === 2950 &&
        cons.synthesis.action.reason.includes("Policy C1") &&
        growth.synthesis.action.reason.includes("Policy G1"),
    );

    // ── R6: degraded scenarios ──
    const mn = await analyze({ profileId: GROWTH, scenario: "missing_news" });
    const newsA = mn.agents.find((a) => a.agent === "news");
    check(
      "R6 missing-news: news explicitly unavailable with reason",
      newsA.status === "unavailable" && Boolean(newsA.unavailableReason),
      newsA.unavailableReason ?? "",
    );
    check("R6 missing-news: no news-derived statement", newsA.evidence.length === 0 && (newsA.claims ?? []).length === 0 && newsA.citations.length === 0);
    check("R6 missing-news: final confidence capped at 65", mn.synthesis.action.confidence <= 65, `conf=${mn.synthesis.action.confidence}`);
    check("R6 missing-news: capsApplied names the reason", mn.synthesis.capsApplied.some((c) => c.cap === 65));
    check(
      "R6 missing-news: still complete & cited",
      mn.agents.filter((a) => a.status === "complete").length === 2 && mn.synthesis.citationCount >= 2,
    );

    const cf = await analyze({ profileId: GROWTH, scenario: "conflict" });
    check(
      "R6 conflict: flag + disagreeing agents named",
      cf.synthesis.conflict.flag === true && cf.synthesis.conflict.agents.length >= 2,
      cf.synthesis.conflict.agents.join(","),
    );
    check("R6 conflict: confidence capped at 60", cf.synthesis.action.confidence <= 60, `conf=${cf.synthesis.action.confidence}`);
    check("R6 conflict: banner text present", typeof cf.synthesis.conflict.bannerText === "string" && cf.synthesis.conflict.bannerText.length > 10);
    check("R6 conflict: action downgraded to WAIT/REVIEW", cf.synthesis.action.code === "WAIT_REVIEW");

    const mf = await analyze({ profileId: GROWTH, scenario: "missing_filing" });
    check(
      "R6 missing-filing: action never stronger than WAIT",
      mf.synthesis.action.code !== "CONSIDER_SMALL_STAGED_ADD",
      `code=${mf.synthesis.action.code} rule=${mf.synthesis.action.ruleId}`,
    );

    // ── R7: safety language ──
    const banned = ["guaranteed", "certain profit", "buy now", "place order"];
    const allText = JSON.stringify({ cons, growth, mn, cf }).toLowerCase();
    check("R7 no banned execution/guarantee language", banned.every((b) => !allText.includes(b)));

    // ── R8: persistence + decision + reload ──
    const last = await (await fetch(`${BASE}/api/sessions/last`)).json();
    const s = last.session;
    check("R8 last session retrievable", Boolean(s && s.session_id));
    const requiredFields = [
      "session_id", "started_at", "completed_at", "total_latency_ms", "symbol", "profile_id",
      "data_mode", "data_fetched_at", "technical_latency_ms", "filing_latency_ms", "news_latency_ms",
      "concentration_pct", "concentration_hhi", "citation_count", "conflict_flag", "final_action",
      "final_confidence", "raw_signal_fingerprint", "storage_mode",
    ];
    check("R8 >=10 persisted fields incl. 3+ metrics", requiredFields.every((f) => f in s), `${Object.keys(s).length} fields`);
    check("R8 agent availability + scenario in record", Array.isArray(s.agent_summary) && s.agent_summary.length === 3 && typeof s.scenario === "string");
    check("R8 storage mode labelled", typeof last.storage.mode === "string" && last.storage.label.length > 3, last.storage.label);
    const dec = await (
      await fetch(`${BASE}/api/sessions/${s.session_id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: "will_review" }),
      })
    ).json();
    check("R8 review/dismiss decision captured", dec.session.decision === "will_review" && Boolean(dec.session.decision_at));
    const last2 = await (await fetch(`${BASE}/api/sessions/last`)).json();
    check("R8 decision survives reload", last2.session.decision === "will_review");
    check("R8 cached latency < 5s target", cons.totalLatencyMs < 5000, `${cons.totalLatencyMs}ms`);
  } finally {
    server.kill("SIGTERM");
    await new Promise((r) => setTimeout(r, 300));
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length > 0) {
    console.log("FAILED:", failed.map((f) => f.name).join(" | "));
    process.exit(1);
  }
  console.log("ALL MUST-HAVE ACCEPTANCE CHECKS PASSED");
}

main().catch((err) => {
  console.error("Acceptance run crashed:", err);
  process.exit(1);
});

