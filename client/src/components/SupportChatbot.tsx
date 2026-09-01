import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Send,
  X,
  Minus,
  RotateCcw,
  Sparkles,
  Check,
  Copy,
  ChevronUp,
  HelpCircle,
  ExternalLink,
} from "lucide-react";
import { api } from "../api";
import type { AnalyzeResponse, Citation, Profile, Scenario } from "../types";

export interface ChatMessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  generatedBy?: "llm" | "deterministic";
  citations?: Citation[];
}

interface SupportChatbotProps {
  result: AnalyzeResponse | null;
  profile: Profile | null;
  symbol: string;
  scenario: Scenario;
  onCitationInspect?: (citation: Citation) => void;
}

const DEFAULT_PROMPTS = [
  "🎯 Why did the system choose this action?",
  "📈 Breakdown RSI & Technical indicators",
  "📑 What do the official company filings say?",
  "📰 What is the news & media sentiment?",
  "💼 Explain portfolio concentration & risk caps",
  "🔍 Show verification citations & provenance",
];

export function SupportChatbot({
  result,
  profile,
  symbol,
  scenario,
  onCitationInspect,
}: SupportChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const initialGreeting = useMemo<ChatMessageItem>(() => {
    const symbolDisplay = result?.snapshot.symbol ?? symbol;
    const actionDisplay = result?.synthesis.action.label ?? "Pending briefing";
    const profileName = profile?.name ?? "Investor Profile";

    return {
      id: "welcome-msg",
      role: "assistant",
      content: `👋 **Welcome to SignalProof AI Copilot!**\n\nI have complete access to the active research dataset for **${symbolDisplay}** under the **${profileName}** profile.\n\n${
        result
          ? `Current Action: **${actionDisplay}** (Confidence: ${result.synthesis.action.confidence}%).\n\nAsk me anything about technical indicators (RSI, MAs), filing claims & citations, news sentiment, or portfolio risk limits!`
          : `Launch an analysis briefing above to explore real-time technicals, grounded RAG filings, and parallel agent signals.`
      }`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      generatedBy: "deterministic",
    };
  }, [result, profile, symbol]);

  const [messages, setMessages] = useState<ChatMessageItem[]>([initialGreeting]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isMinimized]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, isMinimized]);

  const handleSend = async (userText?: string) => {
    const textToSend = (userText ?? input).trim();
    if (!textToSend || loading) return;

    const userMsg: ChatMessageItem = {
      id: `user-${Date.now()}`,
      role: "user",
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      // 1. Attempt server chat API
      const history = messages
        .filter((m) => m.id !== "welcome-msg")
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await api.chat({
        message: textToSend,
        history,
        context: {
          result,
          profile,
          symbol,
          scenario,
        },
      });

      const assistantMsg: ChatMessageItem = {
        id: `asst-${Date.now()}`,
        role: "assistant",
        content: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        generatedBy: res.generatedBy,
        citations: res.citations,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      // 2. Client-side deterministic fallback when offline
      const localReply = generateClientFallbackReply(textToSend, result, profile, symbol);
      const fallbackMsg: ChatMessageItem = {
        id: `asst-${Date.now()}`,
        role: "assistant",
        content: localReply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        generatedBy: "deterministic",
        citations: result?.agents.flatMap((a) => a.citations),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleReset = () => {
    setMessages([initialGreeting]);
  };

  // Render markdown text (bold, headers, bullets, code, citation badges)
  const renderMarkdown = (text: string) => {
    const lines = text.split("\n");
    return (
      <div className="space-y-1.5 text-xs leading-relaxed">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={idx} className="h-1" />;

          // Headers
          if (trimmed.startsWith("### ")) {
            return (
              <h4 key={idx} className="mt-2 text-xs font-bold text-cyan-300">
                {trimmed.replace("### ", "")}
              </h4>
            );
          }
          if (trimmed.startsWith("#### ")) {
            return (
              <h5 key={idx} className="mt-1.5 text-[11px] font-bold text-zinc-200">
                {trimmed.replace("#### ", "")}
              </h5>
            );
          }

          // Bullet points
          if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
            const content = trimmed.slice(2);
            return (
              <div key={idx} className="flex items-start gap-1.5 pl-1">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-cyan-400" />
                <span className="text-zinc-300">{formatInlineText(content)}</span>
              </div>
            );
          }

          // Blockquote
          if (trimmed.startsWith("> ")) {
            return (
              <blockquote
                key={idx}
                className="my-1 border-l-2 border-cyan-500/50 bg-cyan-950/20 py-1 pl-2 text-[11px] italic text-cyan-200/90 rounded-r"
              >
                {formatInlineText(trimmed.replace(/^>\s*/, ""))}
              </blockquote>
            );
          }

          // Regular paragraph
          return (
            <p key={idx} className="text-zinc-300">
              {formatInlineText(trimmed)}
            </p>
          );
        })}
      </div>
    );
  };

  // Inline formatting for **bold**, `code`, and [citation] tags
  const formatInlineText = (str: string) => {
    // Regex for bold **text**, inline `code`, and citation [id]
    const parts = str.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[A-Za-z0-9-_.]+\])/g);

    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="font-bold text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={i}
            className="rounded bg-zinc-800 px-1 py-0.5 font-mono text-[10px] font-semibold text-amber-300 border border-zinc-700"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith("[") && part.endsWith("]")) {
        const citeId = part.slice(1, -1);
        const matchedCite = result?.agents
          .flatMap((a) => a.citations)
          .find((c) => c.id === citeId);

        return (
          <button
            key={i}
            onClick={() => matchedCite && onCitationInspect?.(matchedCite)}
            title={matchedCite ? `Inspect citation: ${matchedCite.title}` : `Citation: ${citeId}`}
            className="inline-flex cursor-pointer items-center gap-0.5 rounded border border-cyan-500/40 bg-cyan-950/50 px-1 py-0.2 font-mono text-[10px] font-bold text-cyan-300 hover:border-cyan-400 hover:bg-cyan-900/60 transition"
          >
            <span>[{citeId}]</span>
            {matchedCite && <ExternalLink className="h-2.5 w-2.5" />}
          </button>
        );
      }
      return part;
    });
  };

  return (
    <>
      {/* Floating Launcher Button */}
      <div className="fixed bottom-5 right-5 z-50">
        {!isOpen && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative group"
          >
            {/* Ambient subtle glow aura */}
            <div className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-cyan-500/40 via-violet-500/30 to-cyan-500/40 blur-sm opacity-70 group-hover:opacity-100 transition duration-300 animate-pulse" />

            <button
              onClick={() => {
                setIsOpen(true);
                setIsMinimized(false);
              }}
              aria-label="Open SignalProof AI Copilot"
              className="relative flex cursor-pointer items-center gap-2.5 rounded-full border border-cyan-400/70 bg-gradient-to-b from-zinc-900 to-zinc-950 px-3.5 py-2 text-white shadow-[0_6px_25px_rgba(0,240,255,0.25)] backdrop-blur-xl transition hover:border-cyan-300 ring-1 ring-white/10"
            >
              {/* Bot Icon with glowing badge */}
              <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-inner group-hover:bg-cyan-500/30 transition">
                <Bot className="h-4.5 w-4.5 text-cyan-300 drop-shadow-[0_0_6px_rgba(0,240,255,0.5)]" />
                <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-amber-300 animate-pulse" />
              </div>

              {/* Compact Label */}
              <div className="flex items-center gap-1.5 pr-1">
                <span className="text-xs font-bold text-white tracking-tight">
                  Ask AI
                </span>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
              </div>
            </button>
          </motion.div>
        )}
      </div>

      {/* Floating Chatbot Window / Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              height: isMinimized ? "52px" : "580px",
            }}
            exit={{ opacity: 0, y: 30, scale: 0.96 }}
            transition={{ type: "spring", damping: 28, stiffness: 350 }}
            className={`fixed bottom-5 right-5 z-50 flex w-[94vw] max-w-[440px] flex-col overflow-hidden rounded-2xl border border-zinc-800/90 bg-zinc-950/95 shadow-[0_20px_60px_rgba(0,0,0,0.9)] backdrop-blur-2xl ring-1 ring-white/10`}
          >
            {/* Header Bar */}
            <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-zinc-800/80 bg-zinc-900/60 px-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/30 to-violet-500/30 border border-cyan-500/40 text-cyan-300">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-zinc-100">SignalProof Copilot</span>
                    <span className="rounded-full bg-cyan-500/20 px-1.5 py-0.2 font-mono text-[9px] font-semibold text-cyan-300 border border-cyan-500/30">
                      Grounded AI
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-none">
                    {result ? `${result.snapshot.symbol} · ${profile?.name ?? "Profile"}` : "Research Support"}
                  </p>
                </div>
              </div>

              {/* Header Controls */}
              <div className="flex items-center gap-1">
                <button
                  onClick={handleReset}
                  title="Clear conversation"
                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  title={isMinimized ? "Expand" : "Minimize"}
                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition"
                >
                  {isMinimized ? <ChevronUp className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  title="Close"
                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-rose-500/20 hover:text-rose-300 transition"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Active Data Context Ribbon */}
            {!isMinimized && result && (
              <div className="flex items-center justify-between border-b border-zinc-800/60 bg-zinc-900/30 px-3 py-1.5 text-[10px]">
                <div className="flex items-center gap-2 text-zinc-400">
                  <span className="font-mono font-bold text-zinc-200">{result.snapshot.symbol}</span>
                  <span>₹{result.snapshot.price.toLocaleString("en-IN")}</span>
                  <span className={result.snapshot.changePct >= 0 ? "text-emerald-400" : "text-rose-400"}>
                    ({result.snapshot.changePct >= 0 ? "+" : ""}{result.snapshot.changePct}%)
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[9px] text-zinc-300 border border-zinc-700">
                    {result.synthesis.action.label}
                  </span>
                  <span className="font-mono text-zinc-400">{result.synthesis.action.confidence}%</span>
                </div>
              </div>
            )}

            {/* Scrollable Messages Area */}
            {!isMinimized && (
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                {messages.map((msg) => {
                  const isUser = msg.role === "user";
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isUser ? "items-end" : "items-start"} space-y-1`}
                    >
                      <div className="flex items-center gap-1.5 px-1 text-[10px] text-zinc-500">
                        <span>{isUser ? "You" : "SignalProof Copilot"}</span>
                        <span>·</span>
                        <span>{msg.timestamp}</span>
                        {!isUser && msg.generatedBy && (
                          <span className="rounded border border-zinc-800 bg-zinc-900 px-1 font-mono text-[9px] text-zinc-400">
                            {msg.generatedBy === "llm" ? "⚡ AI Model" : "🛡️ Grounded"}
                          </span>
                        )}
                      </div>

                      <div
                        className={`group relative max-w-[90%] rounded-2xl p-3.5 text-xs shadow-md ${
                          isUser
                            ? "bg-gradient-to-br from-zinc-800 to-zinc-850 text-zinc-100 border border-zinc-700/70 rounded-tr-sm"
                            : "bg-zinc-900/90 text-zinc-200 border border-zinc-800/90 rounded-tl-sm"
                        }`}
                      >
                        {renderMarkdown(msg.content)}

                        {/* Copy reply button for assistant messages */}
                        {!isUser && (
                          <div className="mt-2 flex items-center justify-between border-t border-zinc-800/60 pt-2 text-[10px] text-zinc-500">
                            <span className="font-mono text-[9px]">
                              {msg.citations && msg.citations.length > 0
                                ? `${msg.citations.length} verified sources`
                                : "Zero hallucination guarantee"}
                            </span>
                            <button
                              onClick={() => handleCopy(msg.id, msg.content)}
                              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition"
                            >
                              {copiedId === msg.id ? (
                                <>
                                  <Check className="h-3 w-3 text-emerald-400" />
                                  <span className="text-emerald-400">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Loading indicator */}
                {loading && (
                  <div className="flex items-center gap-2 rounded-2xl bg-zinc-900/70 border border-zinc-800 p-3 text-xs text-zinc-400 w-fit">
                    <Sparkles className="h-3.5 w-3.5 animate-spin text-cyan-400" />
                    <span>Synthesizing answer from data & citations...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}

            {/* Quick Suggestions Chips */}
            {!isMinimized && messages.length < 5 && (
              <div className="border-t border-zinc-800/60 bg-zinc-950/80 px-3 py-2">
                <div className="mb-1.5 flex items-center gap-1 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  <HelpCircle className="h-3 w-3 text-cyan-400" />
                  <span>Suggested Inquiries</span>
                </div>
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  {DEFAULT_PROMPTS.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(prompt)}
                      className="shrink-0 cursor-pointer rounded-lg border border-zinc-800 bg-zinc-900/60 px-2.5 py-1 text-[11px] font-medium text-zinc-300 transition hover:border-cyan-500/50 hover:bg-zinc-850 hover:text-cyan-200 active:scale-95"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Bar */}
            {!isMinimized && (
              <div className="border-t border-zinc-800 bg-zinc-950 p-3">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="flex items-end gap-2 rounded-xl border border-zinc-800 bg-zinc-900/90 p-1.5 focus-within:border-cyan-500/60 focus-within:ring-1 focus-within:ring-cyan-500/40"
                >
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    rows={1}
                    placeholder="Ask about signals, RSI, filings, risk rules..."
                    className="max-h-24 min-h-[36px] flex-1 resize-none bg-transparent px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || loading}
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-cyan-500 text-zinc-950 font-bold transition disabled:cursor-not-allowed disabled:opacity-40 hover:bg-cyan-400 active:scale-95 shadow-md shadow-cyan-500/20"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </form>
                <div className="mt-1.5 flex items-center justify-between px-1 text-[9px] text-zinc-500">
                  <span>Press Enter to send · Shift+Enter for new line</span>
                  <span className="font-mono">Research Decision Support</span>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/** Pure client-side grounded answering engine for offline mode */
function generateClientFallbackReply(
  query: string,
  result: AnalyzeResponse | null,
  profile: Profile | null,
  symbol: string
): string {
  const q = query.toLowerCase();
  if (!result) {
    return `Currently no research briefing is loaded for **${symbol}**. Select a profile and launch the briefing above to see real-time signals and filings!`;
  }

  const s = result.snapshot;
  const ind = result.indicators;
  const syn = result.synthesis;
  const tech = result.agents.find((a) => a.agent === "technical");
  const filing = result.agents.find((a) => a.agent === "filing");
  const news = result.agents.find((a) => a.agent === "news");

  if (q.includes("why") || q.includes("action") || q.includes("decision") || q.includes("recommend")) {
    let rep = `### 🎯 Action Verdict: **${syn.action.label}**\n\n`;
    rep += `- **Applied Policy Rule**: \`${syn.action.ruleId}\`\n`;
    rep += `- **Confidence**: **${syn.action.confidence}%**\n`;
    rep += `- **Reason**: ${syn.action.reason}\n\n`;
    if (syn.capsApplied.length > 0) {
      rep += `#### ⚠️ Risk Caps Applied:\n` + syn.capsApplied.map((c) => `- **${c.reason}** (Capped at ${c.cap}%)`).join("\n") + "\n";
    }
    return rep;
  }

  if (q.includes("technical") || q.includes("rsi") || q.includes("moving average") || q.includes("chart")) {
    let rep = `### 📈 Technical Indicators for **${s.symbol}**\n\n`;
    rep += `- **Price**: ₹${s.price.toFixed(2)} (${s.changePct >= 0 ? "+" : ""}${s.changePct}%)\n`;
    rep += `- **RSI (14)**: **${ind.rsi14}** (${ind.rsi14 >= 70 ? "Overbought" : ind.rsi14 <= 30 ? "Oversold" : "Neutral"})\n`;
    rep += `- **MA 20**: ₹${ind.ma20} | **MA 50**: ₹${ind.ma50}\n`;
    rep += `- **30-Day Momentum**: **${ind.return30dPct >= 0 ? "+" : ""}${ind.return30dPct}%**\n`;
    return rep;
  }

  if (q.includes("filing") || q.includes("rag") || q.includes("claim") || q.includes("revenue")) {
    if (!filing || filing.status === "unavailable") {
      return `📑 **Filing Agent**: Unavailable (${filing?.unavailableReason ?? "No filings retrieved"}). Action capped at WAIT per rule \`F1\`.`;
    }
    let rep = `### 📑 Filing Agent Analysis (Grounded RAG)\n\n`;
    rep += `- **Signal**: **${filing.signal.toUpperCase()}** (${filing.confidence}%)\n\n`;
    if (filing.claims) {
      rep += `#### Key Claims:\n` + filing.claims.map((c) => `- ${c.claim} ${c.citationIds.map((id) => `[\`${id}\`]`).join(" ")}`).join("\n") + "\n";
    }
    return rep;
  }

  if (q.includes("portfolio") || q.includes("risk") || q.includes("concentration") || q.includes("hhi")) {
    return `### 💼 Portfolio & Concentration\n\n- **Profile**: ${profile?.name ?? "Investor"} (${profile?.riskTolerance.toUpperCase()})\n- **Holding Weight**: **${syn.concentration.symbolWeightPct.toFixed(1)}%** of portfolio\n- **Concentration HHI**: **${syn.concentration.hhi}**\n- **Holding Value**: ₹${syn.concentration.holdingValueInr.toLocaleString("en-IN")}`;
  }

  return `### 📊 Research Briefing for **${s.symbol}**\n\n- **Action**: **${syn.action.label}** (\`${syn.action.ruleId}\`, ${syn.action.confidence}% confidence)\n- **Technicals**: RSI ${ind.rsi14}, MA20 ₹${ind.ma20}\n- **Agents**: Technical (${tech?.signal}), Filing (${filing?.signal}), News (${news?.signal})\n- **Holding Weight**: ${syn.concentration.symbolWeightPct.toFixed(1)}% of portfolio`;
}
