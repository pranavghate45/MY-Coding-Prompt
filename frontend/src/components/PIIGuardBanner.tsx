"use client";

import React, { useState } from "react";
import { ShieldCheck, X } from "lucide-react";

interface PIIGuardBannerProps {
  maskedCount?: number;
  warning?: string;
  maskedTypes?: string[];
}

export function PIIGuardBanner({ maskedCount = 0, warning, maskedTypes = [] }: PIIGuardBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !maskedCount || maskedCount === 0) return null;

  return (
    <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-950/40 via-amber-900/30 to-slate-900 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between shadow-lg space-x-3">
      <div className="flex items-center space-x-2.5">
        <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
        <div>
          <p className="font-semibold text-amber-300">
            {warning || `🛡️ ${maskedCount} sensitive entity auto-masked before sending to LLM.`}
          </p>
          {maskedTypes.length > 0 && (
            <p className="text-[11px] text-amber-200/70 mt-0.5">
              Shielded Categories: <code className="bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-500/20">{maskedTypes.join(", ")}</code>
            </p>
          )}
        </div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="p-1 text-amber-400/80 hover:text-amber-200 hover:bg-amber-500/20 rounded-lg transition"
        title="Dismiss warning"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
