import { z } from "zod";

/**
 * Shared JSON-schema validation for agent results (PRD R2: every result is
 * validated against a shared schema before it is consumed by synthesis).
 * This is the machine-checkable form of the TypeScript contract in types.ts.
 */
export const agentResultSchema = z.object({
  agent: z.enum(["technical", "filing", "news"]),
  status: z.enum(["complete", "unavailable"]),
  signal: z.enum(["bullish", "neutral", "bearish", "unavailable"]),
  confidence: z.number().min(0).max(100),
  evidence: z.array(z.string()).max(3),
  claims: z
    .array(z.object({ claim: z.string().min(1), citationIds: z.array(z.string()).min(1) }))
    .optional(),
  citations: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      url: z.string().url().optional(),
      date: z.string().min(4),
      docType: z.string().min(1),
      publisher: z.string().min(1),
      excerpt: z.string().min(1),
    }),
  ),
  provenance: z.string().min(1),
  startedAt: z.string().min(4),
  completedAt: z.string().min(4),
  durationMs: z.number().min(0),
  fallbackUsed: z.boolean(),
  generatedBy: z.enum(["llm", "rules"]).optional(),
  unavailableReason: z.string().optional(),
});

export const analyzeRequestSchema = z.object({
  symbol: z.string().min(1).default("RELIANCE.NS"),
  profileId: z.string().min(1),
  scenario: z
    .enum(["normal", "missing_news", "missing_filing", "conflict"])
    .default("normal"),
  snapshotId: z.string().min(1).optional(),
});

export const decisionRequestSchema = z.object({
  decision: z.enum(["will_review", "dismissed"]),
});

/** Validates an agent result; returns null when the contract is violated. */
export function validateAgentResult(raw: unknown) {
  const parsed = agentResultSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
