import { useState, type ReactNode } from "react";
import type { Signal } from "../types";

export const SIGNAL_STYLE: Record<Signal, string> = {
  bullish: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  bearish: "bg-rose-500/15 text-rose-300 border-rose-500/40",
  neutral: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  unavailable: "bg-slate-600/20 text-slate-400 border-slate-600/40",
};

export const ACTION_STYLE: Record<string, string> = {
  DO_NOT_INCREASE: "bg-rose-500/15 text-rose-300 border-rose-500/50",
  CONSIDER_SMALL_STAGED_ADD: "bg-emerald-500/15 text-emerald-300 border-emerald-500/50",
  WAIT_REVIEW: "bg-amber-500/15 text-amber-200 border-amber-500/50",
};

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg shadow-black/20 ${className}`}>
      {children}
    </div>
  );
}

export function SignalPill({ signal, confidence }: { signal: Signal; confidence?: number }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${SIGNAL_STYLE[signal]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {signal}
      {confidence !== undefined && signal !== "unavailable" ? ` · ${confidence}%` : ""}
    </span>
  );
}

export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "green" | "amber" | "sky" | "violet" }) {
  const tones: Record<string, string> = {
    slate: "bg-slate-800 text-slate-300 border-slate-700",
    green: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
    amber: "bg-amber-500/15 text-amber-300 border-amber-500/40",
    sky: "bg-sky-500/15 text-sky-300 border-sky-500/40",
    violet: "bg-violet-500/15 text-violet-300 border-violet-500/40",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[11px] ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function ConfidenceBar({ value, tone = "sky" }: { value: number; tone?: "sky" | "emerald" | "amber" }) {
  const colors: Record<string, string> = {
    sky: "bg-sky-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
  };
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full ${colors[tone]}`} style={{ width: `${Math.max(2, Math.min(100, value))}%` }} />
    </div>
  );
}

/** Splits evidence text on [CITATION-ID] markers and renders the markers as buttons. */
export function EvidenceLine({ text, onCitationClick }: { text: string; onCitationClick: (id: string) => void }) {
  const parts = text.split(/(\[[A-Z][A-Z0-9-]+\])/g);
  return (
    <span>
      {parts.map((part, i) => {
        const m = part.match(/^\[([A-Z][A-Z0-9-]+)\]$/);
        if (m) {
          return (
            <button
              key={i}
              onClick={() => onCitationClick(m[1]!)}
              className="mx-0.5 rounded bg-sky-500/15 px-1 py-0.5 font-mono text-[10px] text-sky-300 underline decoration-dotted hover:bg-sky-500/30"
              title={`Show citation ${m[1]}`}
            >
              {m[1]}
            </button>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

export function Expandable({ title, children, defaultOpen = false }: { title: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-2 text-left text-xs text-slate-400 hover:text-slate-200" aria-expanded={open}>
        <span>{title}</span>
        <span className="font-mono">{open ? "[-]" : "[+]"}</span>
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
}

export function fmtTime(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleTimeString("en-IN", { hour12: false }) + "." + String(d.getMilliseconds()).padStart(3, "0");
}
