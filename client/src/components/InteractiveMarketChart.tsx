import { useState, useMemo, useRef } from "react";
import type { AnalyzeResponse } from "../types";

type ChartMode = "area" | "candle";
type TimeRange = "1M" | "3M" | "6M" | "ALL";

export function InteractiveMarketChart({ r }: { r: AnalyzeResponse }) {
  const [mode, setMode] = useState<ChartMode>("area");
  const [range, setRange] = useState<TimeRange>("6M");
  const [showMAs, setShowMAs] = useState(true);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const snapshot = r.snapshot;
  const isCloseOnly = snapshot.dataQuality === "close_only";

  // Raw bars or fallback to closes
  const rawBars = useMemo(() => {
    if (snapshot.points && snapshot.points.length > 0) {
      return snapshot.points;
    }
    const closes = snapshot.closesPreview ?? [snapshot.price];
    return closes.map((c, i) => ({
      date: `Day ${i + 1}`,
      open: c,
      high: c,
      low: c,
      close: c,
      volume: 0,
    }));
  }, [snapshot.points, snapshot.closesPreview, snapshot.price]);

  // Filter bars by range
  const bars = useMemo(() => {
    if (range === "1M") return rawBars.slice(-22);
    if (range === "3M") return rawBars.slice(-65);
    if (range === "6M") return rawBars.slice(-90);
    return rawBars;
  }, [rawBars, range]);

  // Compute rolling MA20 and MA50
  const { ma20Series, ma50Series } = useMemo(() => {
    const ma20: (number | null)[] = [];
    const ma50: (number | null)[] = [];
    for (let i = 0; i < bars.length; i++) {
      if (i >= 19) {
        const slice20 = bars.slice(i - 19, i + 1);
        ma20.push(slice20.reduce((sum, b) => sum + b.close, 0) / 20);
      } else {
        ma20.push(null);
      }

      if (i >= 49) {
        const slice50 = bars.slice(i - 49, i + 1);
        ma50.push(slice50.reduce((sum, b) => sum + b.close, 0) / 50);
      } else {
        ma50.push(null);
      }
    }
    return { ma20Series: ma20, ma50Series: ma50 };
  }, [bars]);

  // Dimensions
  const W = 640;
  const H = 200;
  const PAD_TOP = 16;
  const PAD_BOTTOM = 36;
  const PAD_LEFT = 8;
  const PAD_RIGHT = 54;
  const VOL_H = 34;

  const chartH = H - PAD_TOP - PAD_BOTTOM - VOL_H;

  const minPrice = useMemo(() => Math.min(...bars.map((b) => b.low || b.close)) * 0.995, [bars]);
  const maxPrice = useMemo(() => Math.max(...bars.map((b) => b.high || b.close)) * 1.005, [bars]);
  const priceSpan = maxPrice - minPrice || 1;

  const maxVol = useMemo(() => Math.max(...bars.map((b) => b.volume || 0), 1), [bars]);

  const getX = (index: number) => {
    if (bars.length <= 1) return PAD_LEFT;
    return PAD_LEFT + (index / (bars.length - 1)) * (W - PAD_LEFT - PAD_RIGHT);
  };

  const getY = (val: number) => {
    return PAD_TOP + chartH - ((val - minPrice) / priceSpan) * chartH;
  };

  // Coordinates for area chart
  const areaPath = useMemo(() => {
    if (bars.length === 0) return "";
    const points = bars.map((b, i) => `${getX(i).toFixed(1)},${getY(b.close).toFixed(1)}`);
    const firstX = getX(0).toFixed(1);
    const lastX = getX(bars.length - 1).toFixed(1);
    const bottomY = (PAD_TOP + chartH).toFixed(1);
    return `M ${firstX},${bottomY} L ${points.join(" L ")} L ${lastX},${bottomY} Z`;
  }, [bars, minPrice, priceSpan]);

  const linePath = useMemo(() => {
    if (bars.length === 0) return "";
    return bars.map((b, i) => `${i === 0 ? "M" : "L"} ${getX(i).toFixed(1)},${getY(b.close).toFixed(1)}`).join(" ");
  }, [bars, minPrice, priceSpan]);

  // MA paths
  const ma20Path = useMemo(() => {
    const valid = ma20Series.map((v, i) => (v !== null ? { x: getX(i), y: getY(v) } : null)).filter(Boolean);
    if (valid.length < 2) return "";
    return valid.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p!.x.toFixed(1)},${p!.y.toFixed(1)}`).join(" ");
  }, [ma20Series, minPrice, priceSpan]);

  const ma50Path = useMemo(() => {
    const valid = ma50Series.map((v, i) => (v !== null ? { x: getX(i), y: getY(v) } : null)).filter(Boolean);
    if (valid.length < 2) return "";
    return valid.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p!.x.toFixed(1)},${p!.y.toFixed(1)}`).join(" ");
  }, [ma50Series, minPrice, priceSpan]);

  // Price grid lines
  const gridLines = useMemo(() => {
    const steps = 4;
    return Array.from({ length: steps + 1 }).map((_, i) => {
      const price = minPrice + (i / steps) * priceSpan;
      const y = getY(price);
      return { price, y };
    });
  }, [minPrice, priceSpan]);

  // Handle mouse crosshair
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || bars.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const svgX = (clientX / rect.width) * W;

    const relX = Math.max(0, Math.min(W - PAD_LEFT - PAD_RIGHT, svgX - PAD_LEFT));
    const rawIdx = (relX / (W - PAD_LEFT - PAD_RIGHT)) * (bars.length - 1);
    const closestIdx = Math.round(rawIdx);
    setHoverIndex(closestIdx);
  };

  const handleMouseLeave = () => setHoverIndex(null);

  const activeIndex = hoverIndex !== null ? hoverIndex : bars.length - 1;
  const activeBar = bars[activeIndex] ?? bars[bars.length - 1];
  const activeMa20 = ma20Series[activeIndex];
  const activeMa50 = ma50Series[activeIndex];

  const firstClose = bars[0]?.close ?? activeBar?.close ?? 1;
  const barChangePct = activeBar ? (((activeBar.close - firstClose) / firstClose) * 100).toFixed(2) : "0.00";
  const isPositive = Number(barChangePct) >= 0;

  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3.5 backdrop-blur-md">
      {/* Top Chart Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/70 pb-2.5">
        <div className="flex items-baseline gap-2.5">
          <span className="font-mono text-xs font-semibold text-slate-400">
            {activeBar?.date ?? snapshot.snapshotDate}
          </span>
          <span className="font-mono text-base font-bold text-slate-100">
            ₹{activeBar?.close.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
          <span className={`font-mono text-xs font-semibold ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
            {isPositive ? "+" : ""}{barChangePct}%
          </span>
        </div>

        {/* Action controls: mode & range */}
        <div className="flex flex-wrap items-center gap-1.5">
          {!isCloseOnly && (
            <div className="flex rounded-lg border border-slate-800 bg-slate-900/80 p-0.5 text-[10px]">
              <button
                onClick={() => setMode("area")}
                className={`rounded px-2 py-0.5 font-medium transition ${
                  mode === "area" ? "bg-sky-500/20 text-sky-300 font-semibold" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Area
              </button>
              <button
                onClick={() => setMode("candle")}
                className={`rounded px-2 py-0.5 font-medium transition ${
                  mode === "candle" ? "bg-sky-500/20 text-sky-300 font-semibold" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Candles
              </button>
            </div>
          )}

          <button
            onClick={() => setShowMAs(!showMAs)}
            className={`rounded-lg border px-2 py-0.5 text-[10px] font-medium transition ${
              showMAs
                ? "border-sky-500/40 bg-sky-500/10 text-sky-300"
                : "border-slate-800 bg-slate-900/60 text-slate-500 hover:text-slate-300"
            }`}
          >
            MA(20/50)
          </button>

          <div className="flex rounded-lg border border-slate-800 bg-slate-900/80 p-0.5 text-[10px]">
            {(["1M", "3M", "6M", "ALL"] as TimeRange[]).map((tr) => (
              <button
                key={tr}
                onClick={() => setRange(tr)}
                className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-medium transition ${
                  range === tr ? "bg-slate-700 text-slate-100" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {tr}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SVG Interactive Canvas */}
      <div className="relative mt-2">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="h-48 w-full select-none"
          preserveAspectRatio="none"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id="areaGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.28" />
              <stop offset="60%" stopColor="#0ea5e9" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {gridLines.map(({ price, y }, idx) => (
            <g key={idx}>
              <line
                x1={PAD_LEFT}
                y1={y}
                x2={W - PAD_RIGHT}
                y2={y}
                stroke="rgba(51, 65, 85, 0.25)"
                strokeDasharray="2 3"
              />
              <text
                x={W - PAD_RIGHT + 6}
                y={y + 3}
                fill="#64748b"
                fontSize="9"
                fontFamily="monospace"
              >
                ₹{price.toFixed(0)}
              </text>
            </g>
          ))}

          {/* Area Chart Mode */}
          {mode === "area" && (
            <>
              <path d={areaPath} fill="url(#areaGlow)" />
              <path
                d={linePath}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}

          {/* Candlestick Mode */}
          {mode === "candle" && (
            <g>
              {bars.map((b, i) => {
                const x = getX(i);
                const isBull = b.close >= b.open;
                const candleColor = isBull ? "#34d399" : "#fb7185";
                const topY = getY(Math.max(b.open, b.close));
                const botY = getY(Math.min(b.open, b.close));
                const highY = getY(b.high);
                const lowY = getY(b.low);
                const candleH = Math.max(1.5, botY - topY);
                const candleW = Math.max(2, (W - PAD_LEFT - PAD_RIGHT) / bars.length - 2);

                return (
                  <g key={i}>
                    {/* Wick */}
                    <line
                      x1={x}
                      y1={highY}
                      x2={x}
                      y2={lowY}
                      stroke={candleColor}
                      strokeWidth="1"
                      opacity="0.8"
                    />
                    {/* Body */}
                    <rect
                      x={x - candleW / 2}
                      y={topY}
                      width={candleW}
                      height={candleH}
                      fill={isBull ? "#064e3b" : "#881337"}
                      stroke={candleColor}
                      strokeWidth="1"
                      rx="0.5"
                    />
                  </g>
                );
              })}
            </g>
          )}

          {/* Moving Averages */}
          {showMAs && (
            <>
              {ma20Path && (
                <path
                  d={ma20Path}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="1.2"
                  strokeDasharray="3 2"
                  opacity="0.85"
                />
              )}
              {ma50Path && (
                <path
                  d={ma50Path}
                  fill="none"
                  stroke="#c084fc"
                  strokeWidth="1.2"
                  strokeDasharray="4 2"
                  opacity="0.85"
                />
              )}
            </>
          )}

          {/* Volume sub-chart */}
          <g transform={`translate(0, ${H - VOL_H - 12})`}>
            <line
              x1={PAD_LEFT}
              y1={0}
              x2={W - PAD_RIGHT}
              y2={0}
              stroke="rgba(51, 65, 85, 0.3)"
            />
            {bars.map((b, i) => {
              if (!b.volume) return null;
              const x = getX(i);
              const barW = Math.max(1.5, (W - PAD_LEFT - PAD_RIGHT) / bars.length - 2);
              const barH = (b.volume / maxVol) * VOL_H;
              const isUp = b.close >= b.open;
              return (
                <rect
                  key={i}
                  x={x - barW / 2}
                  y={VOL_H - barH}
                  width={barW}
                  height={barH}
                  fill={isUp ? "rgba(52, 211, 153, 0.4)" : "rgba(251, 113, 133, 0.4)"}
                />
              );
            })}
          </g>

          {/* Hover Crosshair & Indicator Point */}
          {hoverIndex !== null && (
            <g>
              <line
                x1={getX(hoverIndex)}
                y1={PAD_TOP}
                x2={getX(hoverIndex)}
                y2={H - 12}
                stroke="#94a3b8"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.7"
              />
              <circle
                cx={getX(hoverIndex)}
                cy={getY(activeBar.close)}
                r="4"
                fill="#38bdf8"
                stroke="#0f172a"
                strokeWidth="2"
                className="shadow-[0_0_8px_#38bdf8]"
              />
            </g>
          )}
        </svg>

        {/* Floating tooltip metrics */}
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3 text-[10px] text-slate-400">
          <div className="flex flex-wrap items-center gap-3">
            {activeBar.open !== activeBar.close && (
              <>
                <span>O: <b className="font-mono text-slate-200">₹{activeBar.open}</b></span>
                <span>H: <b className="font-mono text-slate-200">₹{activeBar.high}</b></span>
                <span>L: <b className="font-mono text-slate-200">₹{activeBar.low}</b></span>
                <span>C: <b className="font-mono text-slate-200">₹{activeBar.close}</b></span>
              </>
            )}
            {activeBar.volume > 0 && (
              <span>Vol: <b className="font-mono text-slate-200">{(activeBar.volume / 1e6).toFixed(2)}M</b></span>
            )}
          </div>

          <div className="flex items-center gap-3 font-mono">
            {showMAs && activeMa20 !== null && (
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-2 rounded bg-sky-400" />
                <span>MA20: ₹{activeMa20?.toFixed(1)}</span>
              </span>
            )}
            {showMAs && activeMa50 !== null && (
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-2 rounded bg-purple-400" />
                <span>MA50: ₹{activeMa50?.toFixed(1)}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
