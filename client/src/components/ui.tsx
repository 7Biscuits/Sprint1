import { useState, type ReactNode } from "react";
import type { Signal } from "../types";

export const SIGNAL_STYLE: Record<Signal, string> = {
  bullish: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  bearish: "bg-rose-500/10 text-rose-400 border-rose-500/30",
  neutral: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  unavailable: "bg-zinc-800/40 text-zinc-400 border-zinc-700/40",
};

export const ACTION_STYLE: Record<string, string> = {
  DO_NOT_INCREASE: "bg-rose-500/10 text-rose-300 border-rose-500/30",
  CONSIDER_SMALL_STAGED_ADD: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  WAIT_REVIEW: "bg-amber-500/10 text-amber-200 border-amber-500/30",
};

export function Card({
  children,
  className = "",
  hover = true,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`cred-card p-5 ${hover ? "hover:border-zinc-700/80" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export function SignalPill({ signal, confidence }: { signal: Signal; confidence?: number }) {
  const isBullish = signal === "bullish";
  const isBearish = signal === "bearish";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${SIGNAL_STYLE[signal]}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isBullish
            ? "bg-emerald-400 shadow-[0_0_6px_#34d399]"
            : isBearish
            ? "bg-rose-400 shadow-[0_0_6px_#fb7185]"
            : signal === "neutral"
            ? "bg-amber-400 shadow-[0_0_6px_#fbbf24]"
            : "bg-zinc-600"
        }`}
      />
      <span>{signal}</span>
      {confidence !== undefined && signal !== "unavailable" && (
        <span className="font-mono opacity-75">· {confidence}%</span>
      )}
    </span>
  );
}

export function Badge({
  children,
  tone = "slate",
  dot = false,
  className = "",
}: {
  children: ReactNode;
  tone?: "slate" | "green" | "amber" | "sky" | "violet" | "rose";
  dot?: boolean;
  className?: string;
}) {
  const tones: Record<string, string> = {
    slate: "bg-zinc-800/80 text-zinc-300 border-zinc-700/60",
    green: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
    amber: "bg-amber-500/10 text-amber-300 border-amber-500/25",
    sky: "bg-sky-500/10 text-sky-400 border-sky-500/25",
    violet: "bg-violet-500/10 text-violet-300 border-violet-500/25",
    rose: "bg-rose-500/10 text-rose-400 border-rose-500/25",
  };

  const dotColors: Record<string, string> = {
    slate: "bg-zinc-400",
    green: "bg-emerald-400",
    amber: "bg-amber-400",
    sky: "bg-sky-400",
    violet: "bg-violet-400",
    rose: "bg-rose-400",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${tones[tone]} ${className}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotColors[tone]}`} />}
      {children}
    </span>
  );
}

export function ConfidenceBar({
  value,
  tone = "sky",
  showValue = false,
}: {
  value: number;
  tone?: "sky" | "emerald" | "amber" | "rose" | "violet";
  showValue?: boolean;
}) {
  const gradients: Record<string, string> = {
    sky: "bg-gradient-to-r from-sky-500 to-cyan-400",
    emerald: "bg-gradient-to-r from-emerald-500 to-teal-400",
    amber: "bg-gradient-to-r from-amber-500 to-yellow-400",
    rose: "bg-gradient-to-r from-rose-500 to-red-400",
    violet: "bg-gradient-to-r from-violet-500 to-purple-400",
  };

  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className="w-full">
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-zinc-800/80">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${gradients[tone]}`}
          style={{ width: `${Math.max(3, clamped)}%` }}
        />
      </div>
      {showValue && (
        <div className="mt-1 flex justify-between text-[10px] font-mono text-zinc-400">
          <span>Confidence</span>
          <span>{clamped}%</span>
        </div>
      )}
    </div>
  );
}

export function RadialGauge({
  value,
  size = 54,
  strokeWidth = 4,
  tone = "sky",
  label,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  tone?: "sky" | "emerald" | "amber" | "rose" | "violet";
  label?: string;
}) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;

  const strokeColors: Record<string, string> = {
    sky: "#38bdf8",
    emerald: "#34d399",
    amber: "#fbbf24",
    rose: "#fb7185",
    violet: "#a78bfa",
  };

  return (
    <div className="relative inline-flex flex-col items-center justify-center">
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#27272a"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColors[tone]}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center font-mono text-xs font-bold text-zinc-200">
        <span>{clamped}%</span>
        {label && <span className="text-[8px] text-zinc-500 font-sans font-normal">{label}</span>}
      </div>
    </div>
  );
}

export function EvidenceLine({
  text,
  onCitationClick,
}: {
  text: string;
  onCitationClick: (id: string) => void;
}) {
  const parts = text.split(/(\[[A-Z][A-Z0-9-]+\])/g);
  return (
    <span className="leading-relaxed">
      {parts.map((part, i) => {
        const m = part.match(/^\[([A-Z][A-Z0-9-]+)\]$/);
        if (m) {
          return (
            <button
              key={i}
              onClick={() => onCitationClick(m[1]!)}
              className="mx-0.5 inline-flex items-center gap-0.5 rounded border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-sky-400 transition hover:bg-sky-500/25 hover:text-sky-300"
              title={`View citation ${m[1]}`}
            >
              <span>{m[1]}</span>
              <span className="text-[9px] opacity-75">↗</span>
            </button>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

export function Expandable({
  title,
  children,
  defaultOpen = false,
}: {
  title: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-3 transition">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-2 text-left text-xs font-medium text-zinc-400 hover:text-zinc-200"
        aria-expanded={open}
      >
        <span>{title}</span>
        <span className="font-mono text-[10px] text-zinc-500">
          {open ? "▲ HIDE" : "▼ EXPAND"}
        </span>
      </button>
      {open && <div className="mt-2.5 border-t border-zinc-800/60 pt-2.5">{children}</div>}
    </div>
  );
}

export function fmtTime(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? iso
    : d.toLocaleTimeString("en-IN", { hour12: false }) +
        "." +
        String(d.getMilliseconds()).padStart(3, "0");
}


