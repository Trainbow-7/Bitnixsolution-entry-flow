import React, { useState } from 'react';

interface DonutItem {
  label: string;
  count: number;
  color?: string;
}

interface DonutChartProps {
  data: DonutItem[];
  centerLabel?: string;
  palette?: string[];
}

const DEFAULT_PALETTE = [
  '#00d2ff',
  '#14b8a6',
  '#0088ff',
  '#f59e0b',
  '#10b981',
  '#38bdf8',
  '#ec4899',
  '#a855f7',
];

export const DonutChart: React.FC<DonutChartProps> = ({
  data,
  centerLabel = 'Visits',
  palette = DEFAULT_PALETTE,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const total = data.reduce((sum, item) => sum + item.count, 0);

  if (total === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        No data to display
      </div>
    );
  }

  const radius = 65;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;

  let cumulativeAngle = 0;

  const slices = data.map((item, index) => {
    const percentage = item.count / total;
    const strokeDasharray = `${circumference * percentage} ${circumference * (1 - percentage)}`;
    const strokeDashoffset = -cumulativeAngle;
    cumulativeAngle += circumference * percentage;
    const color = item.color || palette[index % palette.length];

    return {
      ...item,
      percentage: Math.round(percentage * 100),
      strokeDasharray,
      strokeDashoffset,
      color,
    };
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
      {/* SVG Donut */}
      <div style={{ position: 'relative', width: 170, height: 170, flexShrink: 0 }}>
        <svg viewBox="0 0 170 170" width="170" height="170" style={{ transform: 'rotate(-90deg)' }}>
          {slices.map((slice, i) => {
            const isHovered = hoveredIdx === i;
            return (
              <circle
                key={i}
                cx="85"
                cy="85"
                r={radius}
                fill="transparent"
                stroke={slice.color}
                strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={slice.strokeDasharray}
                strokeDashoffset={slice.strokeDashoffset}
                style={{
                  transition: 'stroke-width 0.2s ease, opacity 0.2s ease',
                  cursor: 'pointer',
                  opacity: hoveredIdx === null || isHovered ? 1 : 0.45,
                }}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            );
          })}
        </svg>

        {/* Center label */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>
            {hoveredIdx !== null ? slices[hoveredIdx].count : total}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            {hoveredIdx !== null ? `${slices[hoveredIdx].percentage}%` : centerLabel}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, minWidth: 160 }}>
        {slices.map((slice, i) => {
          const isHovered = hoveredIdx === i;
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.825rem',
                cursor: 'pointer',
                opacity: hoveredIdx === null || isHovered ? 1 : 0.45,
                padding: '0.2rem 0.4rem',
                borderRadius: 'var(--radius-sm)',
                background: isHovered ? 'var(--bg-surface-elevated)' : 'transparent',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: slice.color,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    color: 'var(--text-secondary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {slice.label}
                </span>
              </div>
              <div style={{ fontWeight: 700, marginLeft: '0.5rem', whiteSpace: 'nowrap' }}>
                {slice.count} <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>({slice.percentage}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
