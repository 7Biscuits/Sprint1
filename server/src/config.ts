import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Tiny .env loader (no dependency): reads the project-root .env and fills any
 * variables not already present in process.env, so `npm run dev` / `npm start`
 * pick up credentials without extra tooling. Explicit env vars always win.
 */
function loadDotEnv(): void {
  const candidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(__dirname, "../../", ".env"), // project root regardless of cwd
  ];
  for (const file of candidates) {
    try {
      if (!fs.existsSync(file)) continue;
      const text = fs.readFileSync(file, "utf8");
      for (const rawLine of text.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) continue;
        const eq = line.indexOf("=");
        if (eq <= 0) continue;
        const key = line.slice(0, eq).trim();
        let value = line.slice(eq + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (process.env[key] === undefined && value !== "") process.env[key] = value;
      }
      return; // first existing file wins
    } catch {
      /* ignore unreadable .env */
    }
  }
}
loadDotEnv();

function num(name: string, def: number): number {
  const v = process.env[name];
  const n = v === undefined ? NaN : Number(v);
  return Number.isFinite(n) ? n : def;
}

function boolish(v: string | undefined): boolean {
  return ["1", "true", "yes", "on"].includes((v ?? "").toLowerCase());
}

export const config = {
  port: num("PORT", 8787),
  host: process.env.HOST ?? "0.0.0.0",
  market: {
    mode: (process.env.MARKET_MODE ?? "live") as "live" | "cached",
    liveTimeoutMs: num("MARKET_LIVE_TIMEOUT_MS", 10_000),
    /** query2 works where query1 is frequently rate-limited (429); both are tried in order. */
    hosts: (process.env.YAHOO_BASE_URL
      ? [process.env.YAHOO_BASE_URL]
      : ["https://query2.finance.yahoo.com", "https://query1.finance.yahoo.com"]
    ).map((h) => h.replace(/\/$/, "")),
    cacheTtlMs: num("MARKET_CACHE_TTL_MS", 15 * 60_000),
  },
  news: {
    mode: (process.env.NEWS_MODE ?? "cached") as "cached" | "live",
  },
  llm: {
    /** Accepts on/off/openai/true/false/1/0 so `.env` values like LLM_MODE=on work. */
    mode: (boolish(process.env.LLM_MODE) || process.env.LLM_MODE === "openai" ? "openai" : "off") as
      | "off"
      | "openai",
    apiKey: process.env.OPENAI_API_KEY ?? "",
    baseUrl: (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1")
      .replace(/\/$/, "")
      .replace(/\/chat\/completions$/, ""), // tolerate providers pasted with the full path (e.g. OpenRouter)
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    timeoutMs: num("LLM_TIMEOUT_MS", 8_000),
  },
  embeddings: {
    mode: (boolish(process.env.EMBEDDINGS_MODE) && process.env.EMBEDDINGS_MODE !== "local"
      ? "openai"
      : (process.env.EMBEDDINGS_MODE ?? "local") === "openai"
        ? "openai"
        : "local") as "local" | "openai",
    model: process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small",
  },
  supabase: {
    url: (process.env.SUPABASE_URL ?? "").replace(/\/$/, ""),
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    table: process.env.SUPABASE_SESSIONS_TABLE ?? "analysis_sessions",
  },
  dataDir: process.env.SIGNALPROOF_DATA_DIR ?? new URL("../data/", import.meta.url).pathname,
};

export function supabaseConfigured(): boolean {
  return Boolean(config.supabase.url && config.supabase.serviceRoleKey);
}

export const HOSTINFO = os.hostname();
