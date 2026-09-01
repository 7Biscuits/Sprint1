import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import { analyzeRequestSchema, decisionRequestSchema } from "./schemas.js";
import { runAnalysis, decide, meta } from "./orchestrator.js";
import { PROFILES, getProfile } from "./data/profiles.js";
import { getLastSession } from "./persistence.js";
import { CORPUS, CORPUS_VERSION } from "./data/corpus.js";
import { config } from "./config.js";
import { STOCK_UNIVERSE, SUPPORTED_SYMBOLS } from "./data/universe.js";
import { handleChat, type ChatRequest } from "./chat.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = Fastify({ logger: { level: "warn" }, bodyLimit: 1_000_000 });
await app.register(cors, { origin: true });

const validate = undefined; // (removed — safeParse narrowing is used directly)
void validate;

app.get("/api/health", async () => ({
  ok: true,
  service: "signalproof-server",
  time: new Date().toISOString(),
  ...meta(),
}));

app.get("/api/profiles", async () => ({
  profiles: PROFILES,
  demoSymbol: "RELIANCE.NS",
  stocks: STOCK_UNIVERSE,
}));

app.get("/api/corpus", async () => ({
  version: CORPUS_VERSION,
  documents: CORPUS.map(({ id, title, url, date, docType, publisher, excerpt }) => ({
    id,
    title,
    url,
    date,
    docType,
    publisher,
    excerpt,
  })),
}));

app.get("/api/sessions/last", async () => {
  const { record, storage } = await getLastSession();
  return { session: record, storage };
});

app.post("/api/analyze", async (request, reply) => {
  const parsed = analyzeRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply
      .code(400)
      .send({ error: "Invalid request", issues: parsed.error.issues.map((i) => i.message) });
  }
  const body = parsed.data;
  const profile = getProfile(body.profileId);
  if (!profile) {
    return reply.code(404).send({ error: `Unknown profileId: ${body.profileId}` });
  }
  const symbol = (body.symbol || "RELIANCE.NS").trim().toUpperCase();
  if (!SUPPORTED_SYMBOLS.has(symbol)) {
    return reply.code(400).send({ error: `Unsupported stock '${symbol}'. Select a ticker from the research universe.` });
  }
  try {
    return await runAnalysis(symbol, profile, body.scenario, body.snapshotId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Market analysis could not be completed.";
    return reply.code(503).send({
      error: "Market data unavailable for selected symbol",
      detail: message.slice(0, 360),
    });
  }
});

app.post("/api/sessions/:sessionId/decision", async (request, reply) => {
  const { sessionId } = request.params as { sessionId: string };
  const parsed = decisionRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.code(400).send({ error: "decision must be 'will_review' or 'dismissed'" });
  }
  const { decision } = parsed.data;
  const { record, storage } = await decide(sessionId, decision);
  if (!record) return reply.code(404).send({ error: `Unknown session: ${sessionId}` });
  return { session: record, storage };
});

app.post("/api/chat", async (request, reply) => {
  const body = request.body as ChatRequest;
  if (!body || typeof body.message !== "string" || !body.message.trim()) {
    return reply.code(400).send({ error: "message is required" });
  }
  try {
    return await handleChat(body);
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Chat failed";
    return reply.code(500).send({ error: "Chat service error", detail });
  }
});

// Serve the built client when present (single-command demo mode).
const clientDist = path.resolve(__dirname, "../../client/dist");
if (fs.existsSync(clientDist)) {
  await app.register(fastifyStatic, { root: clientDist });
  app.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith("/api")) return reply.code(404).send({ error: "Not found" });
    return reply.sendFile("index.html");
  });
}

const port = config.port;
await app.listen({ port, host: config.host });
app.log.warn(`SignalProof API listening on http://localhost:${port}`);
