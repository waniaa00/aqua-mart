import { useMemo, useRef, useState } from 'react';

const WIDTH = 700;
const HEIGHT = 260;
const PAD = { top: 16, right: 16, bottom: 28, left: 8 };

function formatDateLabel(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// Hand-rolled inline SVG line/area chart — research.md §5 (no charting
// library; this app has exactly 4 npm dependencies and every existing
// visual is hand-rolled). `metric` selects which field of each series
// point to plot; totals are always shown as text elsewhere (FR-024) so
// this chart is never the only place a number lives.
export default function RevenueChart({ series, metric, formatValue }) {
  const [hoverIndex, setHoverIndex] = useState(null);
  const svgRef = useRef(null);

  const points = useMemo(() => {
    if (!series || series.length === 0) return [];
    const values = series.map((p) => Number(p[metric]));
    const maxValue = Math.max(...values, 1);
    const innerW = WIDTH - PAD.left - PAD.right;
    const innerH = HEIGHT - PAD.top - PAD.bottom;
    return series.map((p, i) => {
      const x = PAD.left + (series.length === 1 ? innerW / 2 : (i / (series.length - 1)) * innerW);
      const y = PAD.top + innerH - (values[i] / maxValue) * innerH;
      return { x, y, value: values[i], date: p.date };
    });
  }, [series, metric]);

  if (!series || series.length === 0) {
    return (
      <div className="revenue-chart-empty">
        <p className="muted">No data for this range yet.</p>
      </div>
    );
  }

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${HEIGHT - PAD.bottom} L ${points[0].x} ${HEIGHT - PAD.bottom} Z`;

  function handleMove(e) {
    const rect = svgRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    let nearest = 0;
    let best = Infinity;
    points.forEach((p, i) => {
      const d = Math.abs(p.x - relX);
      if (d < best) {
        best = d;
        nearest = i;
      }
    });
    setHoverIndex(nearest);
  }

  const hovered = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div className="revenue-chart-wrap">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="revenue-chart-svg"
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIndex(null)}
        role="img"
        aria-label={`${metric === 'revenue' ? 'Revenue' : 'Order count'} over time`}
      >
        <line x1={PAD.left} y1={HEIGHT - PAD.bottom} x2={WIDTH - PAD.right} y2={HEIGHT - PAD.bottom} className="revenue-chart-axis" />
        <path d={areaPath} className="revenue-chart-area" />
        <path d={linePath} className="revenue-chart-line" />
        {hovered && <line x1={hovered.x} y1={PAD.top} x2={hovered.x} y2={HEIGHT - PAD.bottom} className="revenue-chart-crosshair" />}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={i === hoverIndex ? 5 : 3} className="revenue-chart-dot" />
        ))}
      </svg>
      {hovered && (
        <div className="revenue-chart-tooltip" style={{ left: `${(hovered.x / WIDTH) * 100}%` }}>
          <strong>{formatValue ? formatValue(hovered.value) : hovered.value}</strong>
          <span>{formatDateLabel(hovered.date)}</span>
        </div>
      )}
    </div>
  );
}
