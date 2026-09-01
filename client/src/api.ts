import type { AnalyzeResponse, Decision, SessionRecord } from "./types";

const API = import.meta.env.VITE_API_BASE ?? "";
const LAST_KEY = "signalproof.lastSession.v1";

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}${detail ? ` — ${detail.slice(0, 160)}` : ""}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => jsonFetch<{ ok: boolean; marketMode: string; llmMode: string; persistenceConfigured: boolean }>("/api/health"),
  profiles: () =>
    jsonFetch<{ profiles: import("./types").Profile[]; demoSymbol: string; stocks: import("./types").Stock[] }>("/api/profiles"),
  analyze: (body: { profileId: string; scenario: string; symbol: string; snapshotId?: string }) =>
    jsonFetch<AnalyzeResponse>("/api/analyze", { method: "POST", body: JSON.stringify(body) }),
  lastSession: () => jsonFetch<{ session: SessionRecord | null; storage: { mode: string; label: string } }>("/api/sessions/last"),
  decide: (sessionId: string, decision: Decision) =>
    jsonFetch<{ session: SessionRecord; storage: { mode: string; label: string } }>(
      `/api/sessions/${sessionId}/decision`,
      { method: "POST", body: JSON.stringify({ decision }) },
    ),
};

/** Device-local fallback cache: the reload-proof backup when the server is unreachable. */
export const localStore = {
  save(result: AnalyzeResponse): void {
    try {
      localStorage.setItem(LAST_KEY, JSON.stringify({ savedAt: new Date().toISOString(), result }));
    } catch {
      /* storage full/blocked — non-fatal */
    }
  },
  load(): { savedAt: string; result: AnalyzeResponse } | null {
    try {
      const raw = localStorage.getItem(LAST_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  clear(): void {
    try {
      localStorage.removeItem(LAST_KEY);
    } catch {
      /* ignore */
    }
  },
};
