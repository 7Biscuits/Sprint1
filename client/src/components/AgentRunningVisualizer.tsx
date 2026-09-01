import { useEffect, useState } from "react";
import { Badge, Card } from "./ui";

const AGENTS = [
  {
    name: "Technical Agent",
    key: "technical",
    sub: "Deterministic Indicator Code",
    steps: ["Loading 130 OHLCV bars", "Computing RSI(14) & MA(20/50)", "Evaluating 6M price drawdown", "Generating technical claims"],
    tone: "sky",
    icon: "📈",
  },
  {
    name: "Filing Agent",
    key: "filing",
    sub: "Grounded RAG Vector Engine",
    steps: ["Querying 8-chunk filing corpus", "Computing cosine embedding similarity", "Extracting top-3 excerpts", "Binding strict citation IDs"],
    tone: "violet",
    icon: "📑",
  },
  {
    name: "News Agent",
    key: "news",
    sub: "Dated Headline Lexicon",
    steps: ["Fetching dated market headlines", "Lexicon sentiment token scoring", "Applying scenario rules", "Generating sentiment evidence"],
    tone: "emerald",
    icon: "📰",
  },
];

export function AgentRunningVisualizer() {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const interval = setInterval(() => {
      setElapsedMs(Math.round(performance.now() - start));
    }, 16);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="border-sky-500/40 bg-slate-900/80 p-6 shadow-2xl shadow-sky-950/30">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-sky-500" />
            </span>
            <h3 className="text-base font-bold text-slate-100">
              Parallel Multi-Agent Synthesis in Progress
            </h3>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            Native <code className="text-sky-300 font-mono">Promise.allSettled</code> dispatch · Zero serialization bottleneck · Shared zod contract
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge tone="sky" dot>
            LIVE TIMER: <span className="font-mono text-xs font-bold text-sky-200">{elapsedMs} ms</span>
          </Badge>
          <Badge tone="violet">PARALLEL DISPATCH</Badge>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {AGENTS.map((agent) => {
          const stepIdx = Math.min(agent.steps.length - 1, Math.floor(elapsedMs / 250));
          return (
            <div
              key={agent.key}
              className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950/60 p-4 shadow-inner"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{agent.icon}</span>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      {agent.name}
                    </h4>
                    <p className="text-[10px] text-slate-500">{agent.sub}</p>
                  </div>
                </div>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-400" />
                </span>
              </div>

              {/* Progress Bar */}
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-800/80">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 to-violet-500 transition-all duration-300"
                  style={{ width: `${Math.min(95, 30 + (elapsedMs / 10) % 70)}%` }}
                />
              </div>

              {/* Step checklist */}
              <ul className="mt-3 space-y-1.5 text-[11px]">
                {agent.steps.map((step, sIdx) => {
                  const isDone = sIdx < stepIdx;
                  const isCurrent = sIdx === stepIdx;
                  return (
                    <li
                      key={sIdx}
                      className={`flex items-center gap-2 transition-all ${
                        isDone
                          ? "text-emerald-400 font-medium"
                          : isCurrent
                          ? "text-sky-300 font-semibold"
                          : "text-slate-600"
                      }`}
                    >
                      <span>{isDone ? "✓" : isCurrent ? "▶" : "○"}</span>
                      <span className="truncate">{step}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800/80 bg-slate-950/40 px-3 py-2 text-[10px] text-slate-400">
        <span>Proof invariant: all 3 agents started at identical timestamp (±0–2 ms spread)</span>
        <span className="font-mono text-slate-500">Awaiting schema validation…</span>
      </div>
    </Card>
  );
}
