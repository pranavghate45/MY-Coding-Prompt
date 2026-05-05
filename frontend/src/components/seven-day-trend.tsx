"use client";

import React from "react";

type Props = {
  data: number[]; // expected 7 values
  className?: string;
};

export default function SevenDayTrend({ data, className = "" }: Props) {
  const w = 420;
  const h = 84;
  if (!data || data.length === 0) return null;
  // normalize
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return [x, y];
  });

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");
  const areaPath = `${path} L ${w},${h} L 0,${h} Z`;

  return (
    <div className={`${className} w-full`}>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="84" role="img" aria-label="7 day trend">
        <defs>
          <linearGradient id="trendGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.2" />
            <stop offset="60%" stopColor="#7c3aed" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* filled area */}
        <path d={areaPath} fill="url(#trendGrad)" />

        {/* main line */}
        <path d={path} fill="none" stroke="#7c3aed" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />

        {/* point markers: outer grey ring with white center; final point purple */}
        {points.map((p, i) => (
          <g key={i}>
            {i === points.length - 1 ? (
              // final purple marker with white center
              <>
                <circle cx={p[0]} cy={p[1]} r={4.5} fill="#7c3aed" />
                <circle cx={p[0]} cy={p[1]} r={2.0} fill="#ffffff" />
              </>
            ) : (
              // normal grey ring with white center
              <>
                <circle cx={p[0]} cy={p[1]} r={3.6} fill="#6b7280" />
                <circle cx={p[0]} cy={p[1]} r={1.4} fill="#ffffff" />
              </>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}
