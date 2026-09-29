"use client";

import React from "react";
import { Zap } from "lucide-react";

interface CacheBadgeProps {
  cached?: boolean;
  similarityScore?: number;
}

export function CacheBadge({ cached, similarityScore }: CacheBadgeProps) {
  if (!cached) return null;

  return (
    <div
      className="inline-flex items-center space-x-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-xs font-medium text-emerald-400 shadow-sm"
      title={similarityScore ? `Semantic Similarity Match: ${(similarityScore * 100).toFixed(1)}%` : "Sub-50ms Semantic Cache Hit"}
    >
      <Zap className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
      <span>⚡ Served from Cache (0ms latency, $0.00 cost)</span>
    </div>
  );
}
