import React, { useState } from 'react';

interface PeakHourItem {
  hour: number;
  label: string;
  count: number;
}

interface PeakHoursChartProps {
  data: PeakHourItem[];
}

export const PeakHoursChart: React.FC<PeakHoursChartProps> = ({ data }) => {
  const [hoverHour, setHoverHour] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return <div style={{ color: 'var(--text-muted)', padding: '2rem', textAlign: 'center' }}>No hour data available</div>;
  }

  const maxCount = Math.max(1, ...data.map((d) => d.count));

  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: '8px',
          height: '180px',
          paddingTop: '20px',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        {data.map((item) => {
          const heightPercent = Math.max(6, Math.round((item.count / maxCount) * 100));
          const isHovered = hoverHour === item.hour;
          const isPeak = item.count === maxCount && maxCount > 0;

          return (
            <div
              key={item.hour}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                height: '100%',
                justifyContent: 'flex-end',
                position: 'relative',
                cursor: 'pointer',
              }}
              onMouseEnter={() => setHoverHour(item.hour)}
              onMouseLeave={() => setHoverHour(null)}
            >
              {/* Tooltip on hover */}
              {isHovered && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-28px',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    padding: '2px 6px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    color: '#fff',
                    zIndex: 20,
                  }}
                >
                  {item.count} visits
                </div>
              )}

              {/* Bar */}
              <div
                style={{
                  width: '100%',
                  maxWidth: '36px',
                  height: `${heightPercent}%`,
                  borderRadius: '4px 4px 0 0',
                  background: isPeak
                    ? 'var(--bitnox-gradient)'
                    : isHovered
                    ? 'var(--bitnox-cyan)'
                    : 'rgba(0, 210, 255, 0.35)',
                  boxShadow: isPeak || isHovered ? '0 0 14px rgba(0, 210, 255, 0.45)' : 'none',
                  transition: 'all 0.2s ease',
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Hour labels */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '8px',
          marginTop: '8px',
        }}
      >
        {data.map((item) => (
          <div
            key={item.hour}
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: '0.65rem',
              color: hoverHour === item.hour ? 'var(--text-primary)' : 'var(--text-muted)',
              fontWeight: hoverHour === item.hour ? 700 : 400,
            }}
          >
            {item.hour % 12 === 0 ? 12 : item.hour % 12}
            <span style={{ fontSize: '0.55rem' }}>{item.hour >= 12 ? 'p' : 'a'}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
