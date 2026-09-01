import { useState } from "react";
import type { Profile } from "../types";

export function PortfolioDonutChart({
  profile,
  activeSymbol,
}: {
  profile: Profile;
  activeSymbol: string;
}) {
  const [hoveredSymbol, setHoveredSymbol] = useState<string | null>(null);

  const size = 160;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const colors = ["#38bdf8", "#818cf8", "#34d399", "#fbbf24", "#fb7185", "#94a3b8", "#c084fc"];

  let accumulatedPercent = 0;
  const slices = profile.holdings.map((h, i) => {
    const startPct = accumulatedPercent;
    accumulatedPercent += h.weightPct;
    const strokeDasharray = `${(h.weightPct / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((startPct / 100) * circumference);
    const isTarget = h.symbol === activeSymbol;
    const isHovered = h.symbol === hoveredSymbol;

    return {
      ...h,
      color: colors[i % colors.length]!,
      strokeDasharray,
      strokeDashoffset,
      isTarget,
      isHovered,
    };
  });

  const activeHolding =
    slices.find((s) => s.symbol === hoveredSymbol) ||
    slices.find((s) => s.symbol === activeSymbol) ||
    slices[0];

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative flex items-center justify-center">
        <svg width={size} height={size} className="rotate-[-90deg] select-none">
          {slices.map((s) => (
            <circle
              key={s.symbol}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth={s.isHovered || s.isTarget ? strokeWidth + 4 : strokeWidth}
              strokeDasharray={s.strokeDasharray}
              strokeDashoffset={s.strokeDashoffset}
              className={`cursor-pointer transition-all duration-300 ${
                s.isTarget ? "opacity-100" : "opacity-80 hover:opacity-100"
              }`}
              onMouseEnter={() => setHoveredSymbol(s.symbol)}
              onMouseLeave={() => setHoveredSymbol(null)}
            />
          ))}
        </svg>

        {/* Center label */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-mono text-xs font-bold text-slate-100">
            {activeHolding ? activeHolding.symbol.replace(".NS", "") : "Holdings"}
          </span>
          <span className="font-mono text-sm font-black text-sky-400">
            {activeHolding ? `${activeHolding.weightPct}%` : ""}
          </span>
          <span className="text-[9px] text-slate-400">
            ₹{activeHolding ? (activeHolding.valueInr / 1e5).toFixed(1) : 0} L
          </span>
        </div>
      </div>

      <div className="mt-2 text-center text-[10px] text-slate-400">
        Hover slices to inspect asset allocation
      </div>
    </div>
  );
}
