import { CORPUS } from "./data/corpus.js";
import { config } from "./config.js";
import { fetchWithTimeout } from "./utils.js";

/**
 * RAG retrieval (PRD §5): semantic top-k over the curated corpus using
 * precomputed vectors + cosine similarity, with a lexical ranking fallback.
 * Default vectors are deterministic hashed n-gram embeddings (no key needed);
 * if EMBEDDINGS_MODE=openai and a key exists, real embeddings are used with
 * automatic fallback to the local vectors on any error.
 */

const DIM = 256;
const STOPWORDS = new Set(
  "the a an and or of to in for on with by at from as is are was were be been this that these those it its their our your his her not no but if then than so such per cent crore year years quarter months month up down will would can could may might has have had".split(
    " ",
  ),
);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9₹%.\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Deterministic local embedding: hashed unigram+bigram term vector, L2-normalized. */
export function localEmbed(text: string): number[] {
  const tokens = tokenize(text);
  const vec = new Array<number>(DIM).fill(0);
  for (let i = 0; i < tokens.length; i++) {
    const idx1 = fnv1a(tokens[i]!) % DIM;
    vec[idx1] = (vec[idx1] ?? 0) + 1;
    if (i + 1 < tokens.length) {
      const idx2 = fnv1a(`${tokens[i]}_${tokens[i + 1]!}`) % DIM;
      vec[idx2] = (vec[idx2] ?? 0) + 0.7;
    }
  }
  const norm = Math.sqrt(vec.reduce((a, b) => a + b * b, 0)) || 1;
  return vec.map((v) => v / norm);
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i]! * b[i]!;
  return dot;
}

async function openaiEmbed(texts: string[]): Promise<number[][] | null> {
  if (config.embeddings.mode !== "openai" || !config.llm.apiKey) return null;
  try {
    const res = await fetchWithTimeout(
      `${config.llm.baseUrl}/embeddings`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.llm.apiKey}` },
        body: JSON.stringify({ model: config.embeddings.model, input: texts }),
      },
      8000,
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: { embedding: number[] }[] };
    if (!json.data || json.data.length !== texts.length) return null;
    return json.data.map((d) => d.embedding);
  } catch {
    return null;
  }
}

const corpusVectors: number[][] = CORPUS.map((doc) => localEmbed(`${doc.title} ${doc.excerpt} ${doc.keywords.join(" ")}`));
let openaiVectors: number[][] | null = null;
let openaiTried = false;

function lexicalScore(queryTokens: string[], doc: { title: string; excerpt: string; keywords: string[] }): number {
  const docTokens = new Set(tokenize(`${doc.title} ${doc.title} ${doc.excerpt} ${doc.keywords.join(" ")}`));
  let hits = 0;
  for (const t of queryTokens) if (docTokens.has(t)) hits += 1;
  return hits / Math.max(1, queryTokens.length);
}

export interface RetrievedChunk {
  doc: (typeof CORPUS)[number];
  score: number;
  method: "embedding_cosine" | "lexical_fallback";
}

/** Top-k retrieval over the curated corpus; cosine on embeddings with lexical fallback. */
export async function topK(query: string, k: number): Promise<RetrievedChunk[]> {
  const queryTokens = tokenize(query);
  if (config.embeddings.mode === "openai") {
    if (!openaiTried) {
      openaiTried = true;
      openaiVectors = await openaiEmbed(CORPUS.map((d) => `${d.title} ${d.excerpt}`));
    }
    if (openaiVectors) {
      const qv = (await openaiEmbed([query]))?.[0];
      if (qv) {
        return CORPUS.map((doc, i) => ({
          doc,
          score: cosine(qv, openaiVectors![i]!),
          method: "embedding_cosine" as const,
        }))
          .sort((a, b) => b.score - a.score)
          .slice(0, k);
      }
    }
  }
  // Blend deterministic hashed-embedding cosine with lexical overlap.
  const qv = localEmbed(query);
  const blended = CORPUS.map((doc, i) => ({
    doc,
    score: cosine(qv, corpusVectors[i]!) + lexicalScore(queryTokens, doc) * 0.6,
    method:
      config.embeddings.mode === "openai"
        ? ("lexical_fallback" as const)
        : ("embedding_cosine" as const),
  }));
  return blended.sort((a, b) => b.score - a.score).slice(0, k);
}
