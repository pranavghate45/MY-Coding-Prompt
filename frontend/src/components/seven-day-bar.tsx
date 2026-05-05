"use client";

import React from "react";

type Props = {
  data: number[];
  labels?: string[];
  className?: string;
  height?: number;
  gap?: number;
};

export default function SevenDayBar({ data, labels = [], className = "", height = 140, gap = 20 }: Props) {
  if (!data || data.length === 0) return null;

  const cols = data.length;
  const w = Math.max(320, cols * 60);
  const h = height;
  const max = Math.max(...data) || 1;

  const colGap = Math.max(8, gap);
  const colW = Math.max(18, (w - colGap * (cols + 1)) / cols);

  return (
    <div className={`${className} w-full`}>
      <svg viewBox={`0 0 ${w} ${h + 40}`} width="100%" height={h + 40} role="img" aria-label="7 day bar chart">
        <defs>
          <linearGradient id="barGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.98" />
            <stop offset="60%" stopColor="#7c3aed" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#6d28d9" stopOpacity="0.9" />
          </linearGradient>
          <filter id="barShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#7c3aed" floodOpacity="0.08" />
          </filter>
        </defs>

        {/* horizontal grid lines for visual scale */}
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
          <line key={i} x1={0} x2={w} y1={h - h * p} y2={h - h * p} stroke="#f3f4f6" strokeWidth={1} />
        ))}

        {/* baseline */}
        <line x1={0} x2={w} y1={h} y2={h} stroke="#e5e7eb" strokeWidth={1.5} />

        {data.map((v, i) => {
          const x = colGap + i * (colW + colGap);
          const barH = Math.round((v / max) * (h - 8));
          const y = h - barH;
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={colW}
                height={barH}
                rx={8}
                fill="url(#barGrad)"
                stroke="#6d28d9"
                strokeWidth={0.8}
                filter="url(#barShadow)"
              />

              {/* value label above bar */}
              <text x={x + colW / 2} y={Math.max(12, y - 8)} fontSize={12} fill="#374151" textAnchor="middle" fontWeight={600}>
                {v}
              </text>

              {/* x-axis label */}
              <text x={x + colW / 2} y={h + 18} fontSize={12} fill="#6b7280" textAnchor="middle">
                {labels[i] ?? `D${i + 1}`}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
