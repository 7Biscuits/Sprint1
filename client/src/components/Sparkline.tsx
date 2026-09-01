/** Static price mini-chart derived from the returned OHLCV closes (should-have; no chart lib). */
export function Sparkline({ closes }: { closes: number[] }) {
  if (closes.length < 2) return null;
  const W = 300;
  const H = 56;
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const span = max - min || 1;
  const pts = closes.map((c, i) => {
    const x = (i / (closes.length - 1)) * (W - 4) + 2;
    const y = H - 4 - ((c - min) / span) * (H - 10);
    return [x, y] as const;
  });
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `2,${H - 2} ${line} ${W - 2},${H - 2}`;
  const last = pts[pts.length - 1]!;
  return (
    <figure className="m-0" aria-label={`Price trend over the last ${closes.length} sessions`}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-14 w-full" preserveAspectRatio="none" role="img">
        <polygon points={area} fill="rgba(14,165,233,0.12)" />
        <polyline points={line} fill="none" stroke="#38bdf8" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={last[0]} cy={last[1]} r="2.4" fill="#38bdf8" />
      </svg>
      <figcaption className="text-right font-mono text-[9px] text-slate-500">
        last {closes.length} sessions · ₹{min.toFixed(0)}–₹{max.toFixed(0)}
      </figcaption>
    </figure>
  );
}
