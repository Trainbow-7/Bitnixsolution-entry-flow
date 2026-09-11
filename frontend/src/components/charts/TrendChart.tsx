import React, { useState } from 'react';

interface TrendDataPoint {
  date: string;
  count: number;
  tech_institute: number;
  dry_cleaning: number;
}

interface TrendChartProps {
  data: TrendDataPoint[];
}

export const TrendChart: React.FC<TrendChartProps> = ({ data }) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return <div style={{ color: 'var(--text-muted)', padding: '2rem', textAlign: 'center' }}>No trend data available</div>;
  }

  const width = 760;
  const height = 240;
  const padding = { top: 20, right: 25, bottom: 35, left: 35 };

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxVal = Math.max(1, ...data.map((d) => Math.max(d.tech_institute, d.dry_cleaning, d.count)));
  const yMax = Math.ceil(maxVal * 1.25);

  const getX = (i: number) => padding.left + (i / (data.length - 1)) * chartW;
  const getY = (val: number) => padding.top + chartH - (val / yMax) * chartH;

  // Build SVG path strings
  const techPoints = data.map((d, i) => `${getX(i)},${getY(d.tech_institute)}`);
  const cleanPoints = data.map((d, i) => `${getX(i)},${getY(d.dry_cleaning)}`);

  const techPath = `M ${techPoints.join(' L ')}`;
  const cleanPath = `M ${cleanPoints.join(' L ')}`;

  const techArea = `${techPath} L ${getX(data.length - 1)},${padding.top + chartH} L ${getX(0)},${padding.top + chartH} Z`;
  const cleanArea = `${cleanPath} L ${getX(data.length - 1)},${padding.top + chartH} L ${getX(0)},${padding.top + chartH} Z`;

  return (
    <div style={{ position: 'relative', width: '100%', overflowX: 'auto' }}>
      <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '0.75rem', fontSize: '0.825rem', justifyContent: 'flex-end' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#00d2ff' }}></span>
          <span style={{ color: 'var(--text-secondary)' }}>Tech Institute</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#14b8a6' }}></span>
          <span style={{ color: 'var(--text-secondary)' }}>Dry Cleaning</span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="techGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00d2ff" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#00d2ff" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="cleanGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid Lines */}
        {[0, 0.33, 0.66, 1].map((ratio, idx) => {
          const y = padding.top + chartH * (1 - ratio);
          const val = Math.round(yMax * ratio);
          return (
            <g key={idx}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="rgba(0, 210, 255, 0.08)"
                strokeDasharray="4 4"
              />
              <text
                x={padding.left - 10}
                y={y + 4}
                fill="var(--text-muted)"
                fontSize="10"
                textAnchor="end"
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* Area Fills */}
        <path d={techArea} fill="url(#techGrad)" />
        <path d={cleanArea} fill="url(#cleanGrad)" />

        {/* Lines */}
        <path d={techPath} fill="none" stroke="#00d2ff" strokeWidth="2.5" strokeLinecap="round" />
        <path d={cleanPath} fill="none" stroke="#14b8a6" strokeWidth="2.5" strokeLinecap="round" />

        {/* X-axis labels (sparse) */}
        {data.map((d, i) => {
          if (i % 5 === 0 || i === data.length - 1) {
            const dateParts = d.date.split('-');
            const label = `${dateParts[1]}/${dateParts[2]}`;
            return (
              <text
                key={i}
                x={getX(i)}
                y={height - 8}
                fill="var(--text-muted)"
                fontSize="10"
                textAnchor="middle"
              >
                {label}
              </text>
            );
          }
          return null;
        })}

        {/* Hover interaction points */}
        {data.map((d, i) => {
          const isHovered = hoverIndex === i;
          return (
            <g key={i} onMouseEnter={() => setHoverIndex(i)} onMouseLeave={() => setHoverIndex(null)}>
              {/* Invisible touch/hover target */}
              <rect
                x={getX(i) - 10}
                y={padding.top}
                width={20}
                height={chartH}
                fill="transparent"
                style={{ cursor: 'pointer' }}
              />

              {isHovered && (
                <>
                  <line
                    x1={getX(i)}
                    y1={padding.top}
                    x2={getX(i)}
                    y2={padding.top + chartH}
                    stroke="rgba(0, 210, 255, 0.4)"
                    strokeDasharray="2 2"
                  />
                  <circle cx={getX(i)} cy={getY(d.tech_institute)} r="5" fill="#00d2ff" stroke="#fff" strokeWidth="2" />
                  <circle cx={getX(i)} cy={getY(d.dry_cleaning)} r="5" fill="#14b8a6" stroke="#fff" strokeWidth="2" />
                </>
              )}
            </g>
          );
        })}
      </svg>

      {/* Floating Tooltip */}
      {hoverIndex !== null && data[hoverIndex] && (
        <div
          style={{
            position: 'absolute',
            top: 25,
            left: Math.min(width - 150, Math.max(20, getX(hoverIndex) - 60)),
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '0.5rem 0.75rem',
            boxShadow: 'var(--shadow-lg)',
            pointerEvents: 'none',
            fontSize: '0.75rem',
            zIndex: 10,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: '0.25rem', color: 'var(--text-primary)' }}>
            {data[hoverIndex].date}
          </div>
          <div style={{ color: '#00d2ff', fontWeight: 600 }}>Tech Institute: {data[hoverIndex].tech_institute}</div>
          <div style={{ color: '#2dd4bf' }}>Dry Cleaning: {data[hoverIndex].dry_cleaning}</div>
          <div style={{ color: 'var(--text-secondary)', borderTop: '1px solid var(--border-subtle)', marginTop: '0.25rem', paddingTop: '0.25rem' }}>
            Total Visits: {data[hoverIndex].count}
          </div>
        </div>
      )}
    </div>
  );
};
