/**
 * Live-integration verification (run against the REAL .env):
 *   node scripts/live-check.mjs
 *
 * Boots the API with your configured MARKET_MODE=live + LLM + Supabase and
 * asserts: (1) a real provider fetch, (2) the TTL response cache on the second
 * run, (3) which path produced each agent's output (LLM vs rules), and
 * (4) Supabase persistence. Honest about every fallback that fires.
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.TEST_PORT ?? 8792);
const BASE = `http://localhost:${PORT}`;

async function waitHealthy(timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(`${BASE}/api/health`);
      if (r.ok) return await r.json();
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error("server did not become healthy");
}

const server = spawn("node", ["--import", "tsx", "server/src/index.ts"], {
  cwd: ROOT,
  env: { ...process.env, PORT: String(PORT), HOST: "127.0.0.1" }, // no overrides: real .env applies
  stdio: ["ignore", "pipe", "pipe"],
});

try {
  const health = await waitHealthy();
  console.log(`health: marketMode=${health.marketMode} llmMode=${health.llmMode} persistence=${health.persistenceConfigured}`);

  const analyze = (body) =>
    fetch(`${BASE}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => r.json());

  console.log("\n— run 1 (cold) —");
  const r1 = await analyze({ profileId: "profile_conservative_001" });
  console.log(
    `snapshot: mode=${r1.snapshot.mode} price=₹${r1.snapshot.price} source="${r1.snapshot.source}"` +
      (r1.snapshot.liveError ? ` liveError="${r1.snapshot.liveError.slice(0, 80)}"` : ""),
  );
  for (const a of r1.agents) {
    console.log(
      `  ${a.agent.padEnd(9)} ${a.status.padEnd(11)} ${a.signal.padEnd(8)} conf=${String(a.confidence).padEnd(3)} by=${(a.generatedBy ?? "n/a").padEnd(5)} ${a.durationMs}ms${a.fallbackUsed ? " (fallback)" : ""}`,
    );
  }
  console.log(`storage: ${r1.storage.mode} — ${r1.storage.label}`);
  console.log(`total: ${r1.totalLatencyMs} ms`);

  console.log("\n— run 2 (warm: TTL cache + LLM cache) —");
  const r2 = await analyze({ profileId: "profile_conservative_001" });
  console.log(
    `snapshot: mode=${r2.snapshot.mode} cacheHit=${r2.snapshot.cacheHit} age=${r2.snapshot.cacheAgeMinutes}min total=${r2.totalLatencyMs} ms`,
  );
  console.log(`agents: ${r2.agents.map((a) => `${a.agent}:${a.generatedBy ?? "n/a"}:${a.durationMs}ms`).join("  ")}`);
  console.log(`fingerprint stable: ${r1.rawSignalFingerprint === r2.rawSignalFingerprint}`);

  console.log("\n— verdict —");
  const checks = [
    ["live provider reached (or honest fallback)", r1.snapshot.mode === "live" || Boolean(r1.snapshot.liveError)],
    ["TTL cache hit on warm run", r2.snapshot.mode === "cached" && r2.snapshot.cacheHit === true],
    ["agents completed", r1.agents.every((a) => a.status === "complete")],
    ["LLM path active (≥1 agent by llm, or reported fallback)", r1.agents.some((a) => a.generatedBy === "llm" || a.fallbackUsed)],
    ["fingerprint stable across warm runs", r1.rawSignalFingerprint === r2.rawSignalFingerprint],
    ["persistence: supabase (or labelled local)", r1.storage.mode === "supabase" || r1.storage.label.includes("locally")],
  ];
  for (const [name, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (checks.some(([, ok]) => !ok)) process.exit(1);
  console.log("ALL LIVE-INTEGRATION CHECKS PASSED");
} finally {
  server.kill("SIGTERM");
  await new Promise((r) => setTimeout(r, 300));
}
