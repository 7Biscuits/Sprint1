import type { AnalyzeResponse, Profile } from "./types.js";
import { llmTextChat } from "./llm.js";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  message: string;
  history?: ChatMessage[];
  context?: {
    result?: AnalyzeResponse | null;
    profile?: Profile | null;
    symbol?: string;
    scenario?: string;
  };
}

export interface ChatResponse {
  reply: string;
  generatedBy: "llm" | "deterministic";
  suggestions: string[];
  citations?: { id: string; title: string; excerpt: string }[];
}

/**
 * Deterministic grounding engine that answers specific domain queries
 * when LLM is unavailable or as reliable fast fallback.
 */
export function generateDeterministicReply(
  query: string,
  result?: AnalyzeResponse | null,
  profile?: Profile | null,
  symbol = "RELIANCE.NS",
): { reply: string; suggestions: string[] } {
  const q = query.toLowerCase();

  // If no analysis result is loaded yet
  if (!result) {
    if (q.includes("hi") || q.includes("hello") || q.includes("who are you") || q.includes("help")) {
      return {
        reply: `👋 Hello! I am the **SignalProof AI Research Assistant**.\n\nI have full access to real-time market data, 3 parallel agents (Technical, Filing RAG, News), concentration risk policies, and citation audits.\n\nSelect a stock (e.g. **${symbol}**) and click **Launch Briefing** to analyze it, then ask me anything about the signals, citations, or rules!`,
        suggestions: [
          `What stocks can I research?`,
          `How do the 3 agents work?`,
          `Explain concentration risk policies`,
        ],
      };
    }
    return {
      reply: `Currently no research briefing is active for **${symbol}**. Please select an investor profile and launch the briefing to see real-time synthesis, indicators, and cited filings.`,
      suggestions: [
        `How does the multi-agent pipeline work?`,
        `What investor profiles are supported?`,
      ],
    };
  }

  const s = result.snapshot;
  const ind = result.indicators;
  const syn = result.synthesis;
  const tech = result.agents.find((a) => a.agent === "technical");
  const filing = result.agents.find((a) => a.agent === "filing");
  const news = result.agents.find((a) => a.agent === "news");

  // 1. Action / Verdict / Decision rationale
  if (
    q.includes("why") ||
    q.includes("action") ||
    q.includes("decision") ||
    q.includes("verdict") ||
    q.includes("recommend") ||
    q.includes("rule")
  ) {
    const actionLabel = syn.action.label;
    const ruleId = syn.action.ruleId;
    const reason = syn.action.reason;
    const conf = syn.action.confidence;

    let explanation = `### 🎯 Research Action: **${actionLabel}**\n\n`;
    explanation += `- **Applied Rule**: \`${ruleId}\`\n`;
    explanation += `- **Confidence**: **${conf}%** (Outlook: ${syn.outlook.label.toUpperCase()})\n`;
    explanation += `- **Deterministic Rationale**: ${reason}\n\n`;

    if (syn.capsApplied.length > 0) {
      explanation += `#### ⚠️ Risk Caps Applied:\n`;
      syn.capsApplied.forEach((cap) => {
        explanation += `- **${cap.reason}** (Capped at ${cap.cap}%)\n`;
      });
      explanation += `\n`;
    }

    if (syn.concentration) {
      explanation += `#### 💼 Concentration Status:\n`;
      explanation += `- Current Weight: **${syn.concentration.symbolWeightPct.toFixed(1)}%** of portfolio\n`;
      explanation += `- Portfolio HHI: **${syn.concentration.hhi}**\n`;
    }

    return {
      reply: explanation,
      suggestions: [
        `Show technical indicator breakdown`,
        `What do company filings say?`,
        `Explain the news sentiment`,
      ],
    };
  }

  // 2. Technical Indicators (RSI, MA20, MA50, 30D Return)
  if (
    q.includes("technical") ||
    q.includes("indicator") ||
    q.includes("rsi") ||
    q.includes("moving average") ||
    q.includes("ma20") ||
    q.includes("ma50") ||
    q.includes("chart") ||
    q.includes("price")
  ) {
    let reply = `### 📈 Technical Agent Analysis for **${s.symbol}**\n\n`;
    reply += `- **Current Price**: ₹${s.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })} (${s.changePct >= 0 ? "+" : ""}${s.changePct}%)\n`;
    reply += `- **Signal**: **${tech?.signal.toUpperCase() ?? "UNAVAILABLE"}** (Confidence: ${tech?.confidence ?? 0}%)\n`;
    reply += `- **RSI (14-period)**: **${ind.rsi14}** (${ind.rsi14 >= 70 ? "Overbought" : ind.rsi14 <= 30 ? "Oversold" : "Neutral Zone"})\n`;
    reply += `- **20-day MA**: ₹${ind.ma20} (${ind.price >= ind.ma20 ? "Price above MA20" : "Price below MA20"})\n`;
    reply += `- **50-day MA**: ₹${ind.ma50} (${ind.price >= ind.ma50 ? "Price above MA50" : "Price below MA50"})\n`;
    reply += `- **30-Day Momentum**: **${ind.return30dPct >= 0 ? "+" : ""}${ind.return30dPct}%**\n`;
    reply += `- **Data Quality**: ${s.dataQuality.toUpperCase()} over ${ind.pointsUsed} trading periods.\n\n`;
    if (tech?.evidence && tech.evidence.length > 0) {
      reply += `**Computed Evidence:**\n` + tech.evidence.map((e) => `- ${e}`).join("\n");
    }
    return {
      reply,
      suggestions: [
        `What do company filings say?`,
        `Why was this action chosen?`,
        `What is the portfolio risk?`,
      ],
    };
  }

  // 3. Filings & RAG Claims & Citations
  if (
    q.includes("filing") ||
    q.includes("rag") ||
    q.includes("sec") ||
    q.includes("bse") ||
    q.includes("annual report") ||
    q.includes("quarterly") ||
    q.includes("claim") ||
    q.includes("revenue") ||
    q.includes("margin")
  ) {
    if (!filing || filing.status === "unavailable") {
      return {
        reply: `📑 **Filing Agent**: Currently unavailable for this scenario (${filing?.unavailableReason ?? "No filings retrieved"}). Per policy rule \`F1\`, confidence is downgraded and action cannot exceed WAIT.`,
        suggestions: [`Why was action capped at WAIT?`, `Show technical indicators`],
      };
    }

    let reply = `### 📑 Grounded Filing Agent Analysis (RAG Corpus)\n\n`;
    reply += `- **Signal**: **${filing.signal.toUpperCase()}** (${filing.confidence}% confidence)\n`;
    reply += `- **Provenance**: ${filing.provenance}\n\n`;

    if (filing.claims && filing.claims.length > 0) {
      reply += `#### Key Grounded Claims:\n`;
      filing.claims.forEach((c) => {
        const citeStr = c.citationIds.map((id) => `[\`${id}\`]`).join(" ");
        reply += `- ${c.claim} ${citeStr}\n`;
      });
      reply += `\n`;
    }

    if (filing.citations.length > 0) {
      reply += `#### Citations in Scope:\n`;
      filing.citations.forEach((cite) => {
        reply += `- **[\`${cite.id}\`] ${cite.title}** (${cite.docType}, ${cite.date})\n  > *"${cite.excerpt}"*\n`;
      });
    }

    return {
      reply,
      suggestions: [
        `Explain technical indicators`,
        `What is the news sentiment?`,
        `Why did you recommend ${syn.action.label}?`,
      ],
    };
  }

  // 4. News & Sentiment
  if (
    q.includes("news") ||
    q.includes("sentiment") ||
    q.includes("headline") ||
    q.includes("media")
  ) {
    if (!news || news.status === "unavailable") {
      return {
        reply: `📰 **News Agent**: Unavailable (${news?.unavailableReason ?? "Prepared degraded scenario"}). Under policy rule \`N1\`, synthesis confidence is capped at ≤65% and no fabricated news claims are emitted.`,
        suggestions: [`Why did missing news cap confidence?`, `Show filing analysis`],
      };
    }

    let reply = `### 📰 News & Sentiment Agent\n\n`;
    reply += `- **Signal**: **${news.signal.toUpperCase()}** (${news.confidence}% confidence)\n`;
    reply += `- **Provenance**: ${news.provenance}\n\n`;
    if (news.evidence.length > 0) {
      reply += `#### Verified Headlines & Evidence:\n`;
      news.evidence.forEach((e) => {
        reply += `- ${e}\n`;
      });
    }

    return {
      reply,
      suggestions: [
        `What do filings say?`,
        `What is the final action verdict?`,
      ],
    };
  }

  // 5. Portfolio & Concentration Risk / Profile
  if (
    q.includes("portfolio") ||
    q.includes("risk") ||
    q.includes("profile") ||
    q.includes("concentration") ||
    q.includes("hhi") ||
    q.includes("allocation") ||
    q.includes("conservative") ||
    q.includes("growth")
  ) {
    const profName = profile?.name ?? "Investor Profile";
    const profTol = profile?.riskTolerance ?? "conservative";
    let reply = `### 💼 Portfolio & Concentration Analysis\n\n`;
    reply += `- **Active Profile**: **${profName}** (${profTol.toUpperCase()})\n`;
    reply += `- **Total Portfolio Value**: ₹${(profile?.portfolioValueInr ?? 0).toLocaleString("en-IN")}\n`;
    reply += `- **Target Stock Holding**: ₹${syn.concentration.holdingValueInr.toLocaleString("en-IN")} (**${syn.concentration.symbolWeightPct.toFixed(1)}%** of portfolio)\n`;
    reply += `- **Concentration HHI**: **${syn.concentration.hhi}**\n\n`;

    if (profTol === "conservative" && syn.concentration.symbolWeightPct > 50) {
      reply += `⚠️ **Policy Guard**: Conservative profile has heavy weight (>50%) in ${s.symbol}. Under rule \`C1\`, action is capped at **DO NOT INCREASE** regardless of bullish market signals to prevent over-concentration.`;
    } else if (profTol === "growth" && syn.concentration.symbolWeightPct <= 15) {
      reply += `✅ **Policy Guard**: Growth profile with low concentration (<15%) permits staged additions under rule \`G1\` when synthesis outlook is bullish.`;
    }

    return {
      reply,
      suggestions: [
        `Why is the action ${syn.action.label}?`,
        `Show Technical Agent analysis`,
      ],
    };
  }

  // 6. Citations & Audits
  if (
    q.includes("citation") ||
    q.includes("audit") ||
    q.includes("evidence") ||
    q.includes("provenance") ||
    q.includes("source")
  ) {
    const allCites = result.agents.flatMap((a) => a.citations);
    let reply = `### 📋 Verification & Citation Audit\n\n`;
    reply += `- **Total Citations**: ${allCites.length} verified documents\n`;
    reply += `- **Total Grounded Claims**: ${syn.citedClaimCount} cited claims\n`;
    reply += `- **Deterministic Rules**: Enforced in code with 0% LLM hallucination\n\n`;
    reply += `#### Available Source Citations:\n`;
    allCites.slice(0, 5).forEach((c) => {
      reply += `- **[\`${c.id}\`] ${c.title}** (${c.publisher}, ${c.date})\n`;
    });

    return {
      reply,
      suggestions: [
        `Show filing claims`,
        `Show technical indicators`,
      ],
    };
  }

  // Default synthesis summary
  let reply = `### 📊 Research Briefing Summary for **${s.symbol}**\n\n`;
  reply += `- **Price**: ₹${s.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })} (${s.changePct >= 0 ? "+" : ""}${s.changePct}%)\n`;
  reply += `- **Synthesis Action**: **${syn.action.label}** (\`${syn.action.ruleId}\`)\n`;
  reply += `- **Confidence**: **${syn.action.confidence}%** (Outlook: ${syn.outlook.label.toUpperCase()})\n`;
  reply += `- **Agents**: Technical (${tech?.signal ?? "N/A"}), Filing (${filing?.signal ?? "N/A"}), News (${news?.signal ?? "N/A"})\n`;
  reply += `- **Risk Profile**: ${profile?.name ?? "Investor"} (${syn.concentration.symbolWeightPct.toFixed(1)}% concentration)\n\n`;
  reply += `Ask me about specific technical indicators, filing citations, news sentiment, or concentration risk rules!`;

  return {
    reply,
    suggestions: [
      `Why did you recommend ${syn.action.label}?`,
      `Explain technical RSI & Moving Averages`,
      `What do SEC/BSE filings say?`,
      `How does my portfolio risk affect this?`,
    ],
  };
}

/**
 * Primary chat entrypoint. Uses LLM with full context when available,
 * and falls back gracefully to deterministic grounded responder.
 */
export async function handleChat(req: ChatRequest): Promise<ChatResponse> {
  const message = req.message.trim();
  const history = req.history ?? [];
  const result = req.context?.result;
  const profile = req.context?.profile;
  const symbol = req.context?.symbol ?? result?.snapshot.symbol ?? "RELIANCE.NS";

  // Build grounding context prompt if LLM is enabled
  if (result) {
    const s = result.snapshot;
    const ind = result.indicators;
    const syn = result.synthesis;
    const agentsSummary = result.agents
      .map(
        (a) =>
          `Agent ${a.agent.toUpperCase()}: status=${a.status}, signal=${a.signal}, confidence=${a.confidence}%, evidence=[${a.evidence.join("; ")}]`,
      )
      .join("\n");

    const citationsList = result.agents
      .flatMap((a) => a.citations)
      .map((c) => `[${c.id}] "${c.title}" (${c.docType}, ${c.date}): ${c.excerpt}`)
      .join("\n");

    const systemPrompt = `You are SignalProof AI Copilot, an institutional equity research assistant for Indian equities.
You have access to the active research session:
- Stock: ${s.symbol} at ₹${s.price} (${s.changePct >= 0 ? "+" : ""}${s.changePct}%)
- Technical Indicators: RSI(14)=${ind.rsi14}, MA20=₹${ind.ma20}, MA50=₹${ind.ma50}, 30d Return=${ind.return30dPct}%
- Synthesis Action: ${syn.action.label} (Rule: ${syn.action.ruleId}, Confidence: ${syn.action.confidence}%)
- Synthesis Reason: ${syn.action.reason}
- Risk Caps: ${syn.capsApplied.map((c) => `${c.reason} (cap: ${c.cap}%)`).join(", ") || "None"}
- Investor Profile: ${profile?.name ?? "General"} (Risk: ${profile?.riskTolerance ?? "conservative"}, Holding: ${syn.concentration.symbolWeightPct.toFixed(1)}% of portfolio, HHI: ${syn.concentration.hhi})
- Parallel Agents:
${agentsSummary}
- Grounded Citations:
${citationsList}

CRITICAL RULES:
1. Ground every statement in the data above. Do not hallucinate prices or fake claims.
2. Format your response cleanly in GitHub Markdown with bold headers, bullet points, and citation tags like [citation-id].
3. Emphasize that SignalProof provides research decision support, not financial execution or guaranteed returns.
4. Keep answers concise, authoritative, and direct.`;

    const chatHistory = [
      ...history.slice(-6).map((h) => ({ role: h.role, content: h.content })),
      { role: "user" as const, content: message },
    ];

    try {
      const llmReply = await llmTextChat(systemPrompt, chatHistory);
      if (llmReply && llmReply.trim().length > 0) {
        return {
          reply: llmReply.trim(),
          generatedBy: "llm",
          suggestions: [
            `Why this action recommendation?`,
            `Breakdown RSI & Technical signals`,
            `What do the filings say?`,
          ],
          citations: result.agents.flatMap((a) =>
            a.citations.map((c) => ({ id: c.id, title: c.title, excerpt: c.excerpt })),
          ),
        };
      }
    } catch {
      // LLM failed or timed out — fall through to deterministic responder
    }
  }

  // Deterministic grounded response
  const fallback = generateDeterministicReply(message, result, profile, symbol);
  return {
    reply: fallback.reply,
    generatedBy: "deterministic",
    suggestions: fallback.suggestions,
    citations: result?.agents.flatMap((a) =>
      a.citations.map((c) => ({ id: c.id, title: c.title, excerpt: c.excerpt })),
    ),
  };
}
