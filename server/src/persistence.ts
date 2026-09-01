import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config, supabaseConfigured } from "./config.js";
import type { AnalysisSessionRecord, Decision, StorageInfo } from "./types.js";

/**
 * Session persistence (PRD R8): Supabase Postgres when configured, with an
 * honest, labelled local-file fallback (server/data/local-sessions.json).
 * Only anonymous, non-PII demo records are written, server-side only.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Module-relative so the store lands in server/data regardless of process cwd.
const LOCAL_FILE = path.resolve(__dirname, "..", "data", "local-sessions.json");

function readLocal(): AnalysisSessionRecord[] {
  try {
    return JSON.parse(fs.readFileSync(LOCAL_FILE, "utf8")) as AnalysisSessionRecord[];
  } catch {
    return [];
  }
}

function writeLocal(records: AnalysisSessionRecord[]): void {
  fs.mkdirSync(path.dirname(LOCAL_FILE), { recursive: true });
  fs.writeFileSync(LOCAL_FILE, JSON.stringify(records.slice(-50), null, 1));
}

async function supabaseRequest(pathSuffix: string, init: RequestInit): Promise<Response> {
  const url = `${config.supabase.url}/rest/v1/${pathSuffix}`;
  return fetch(url, {
    ...init,
    headers: {
      apikey: config.supabase.serviceRoleKey,
      Authorization: `Bearer ${config.supabase.serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

export async function saveSession(
  record: AnalysisSessionRecord,
): Promise<{ storage: StorageInfo; record: AnalysisSessionRecord }> {
  if (supabaseConfigured()) {
    try {
      const res = await supabaseRequest(config.supabase.table, {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ ...record, storage_mode: "supabase" }),
      });
      if (res.ok) {
        return {
          storage: { mode: "supabase", label: "Persisted to Supabase Postgres" },
          record: { ...record, storage_mode: "supabase" },
        };
      }
    } catch {
      /* fall through to local */
    }
  }
  const local = readLocal().filter((r) => r.session_id !== record.session_id);
  local.push({ ...record, storage_mode: "local_file" });
  writeLocal(local);
  return {
    storage: {
      mode: "local_file",
      label: supabaseConfigured()
        ? "Supabase write failed — stored locally (labelled fallback)"
        : "Supabase not configured — stored locally (labelled fallback)",
    },
    record,
  };
}

export async function attachDecision(
  sessionId: string,
  decision: Decision,
): Promise<{ record: AnalysisSessionRecord | null; storage: StorageInfo }> {
  const local = readLocal();
  const idx = local.findIndex((r) => r.session_id === sessionId);
  const decisionAt = new Date().toISOString();
  let record: AnalysisSessionRecord | null = idx >= 0 ? local[idx]! : null;
  if (record) {
    record = { ...record, decision, decision_at: decisionAt };
    local[idx] = record;
    writeLocal(local);
  }
  if (supabaseConfigured()) {
    try {
      await supabaseRequest(`${config.supabase.table}?session_id=eq.${sessionId}`, {
        method: "PATCH",
        body: JSON.stringify({ decision, decision_at: decisionAt }),
      });
      return {
        record,
        storage: { mode: "supabase", label: "Decision persisted to Supabase" },
      };
    } catch {
      /* local already updated */
    }
  }
  return { record, storage: { mode: "local_file", label: "Decision stored locally (labelled fallback)" } };
}

export async function getLastSession(): Promise<{
  record: AnalysisSessionRecord | null;
  storage: StorageInfo;
}> {
  if (supabaseConfigured()) {
    try {
      const res = await supabaseRequest(
        `${config.supabase.table}?select=*&order=started_at.desc&limit=1`,
        { method: "GET" },
      );
      if (res.ok) {
        const rows = (await res.json()) as AnalysisSessionRecord[];
        if (rows.length > 0) {
          return {
            record: rows[0]!,
            storage: { mode: "supabase", label: "Loaded from Supabase Postgres" },
          };
        }
      }
    } catch {
      /* fall through to local */
    }
  }
  const local = readLocal();
  const record = local.length > 0 ? local[local.length - 1]! : null;
  return {
    record,
    storage: {
      mode: "local_file",
      label: record
        ? supabaseConfigured()
          ? "Supabase read failed — loaded from device-local store (labelled fallback)"
          : "Loaded from device-local store (Supabase not configured; labelled fallback)"
        : "No session recorded yet",
    },
  };
}
