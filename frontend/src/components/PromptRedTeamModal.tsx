"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  X,
  AlertTriangle,
  CheckCircle2,
  Zap,
  RefreshCw,
  Sliders,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { RedTeamResponse, RedTeamPatch } from "../types/api";

interface PromptRedTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPrompt: string;
  onApplyPatchedPrompt: (patchedPrompt: string) => void;
}

export function PromptRedTeamModal({
  isOpen,
  onClose,
  currentPrompt,
  onApplyPatchedPrompt,
}: PromptRedTeamModalProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RedTeamResponse | null>(null);

  useEffect(() => {
    if (isOpen && currentPrompt.trim()) {
      handleStressTest(currentPrompt);
    }
  }, [isOpen, currentPrompt]);

  if (!isOpen) return null;

  const handleStressTest = async (textToTest?: string) => {
    const text = textToTest || currentPrompt;
    if (!text.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/prompt/stress-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text.trim() }),
      });

      if (res.ok) {
        const data: RedTeamResponse = await res.json();
        setResult(data);
      }
    } catch (err) {
      console.error("Error running red-team stress test:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyAllPatches = () => {
    if (!result || !result.patches || result.patches.length === 0) return;

    let patched = currentPrompt;
    result.patches.forEach((p) => {
      // Replace target phrase case-insensitively
      const regex = new RegExp(`\\b${p.target_phrase}\\b`, "gi");
      patched = patched.replace(regex, p.replacement_text);
    });

    onApplyPatchedPrompt(patched);
    onClose();
  };

  const getScoreColor = (score: number, inverse = false) => {
    const effective = inverse ? 100 - score : score;
    if (effective >= 80) return "text-emerald-400 bg-emerald-500/20 border-emerald-500/30";
    if (effective >= 50) return "text-amber-400 bg-amber-500/20 border-amber-500/30";
    return "text-rose-400 bg-rose-500/20 border-rose-500/30";
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-100">
        
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30">
              <ShieldAlert className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-slate-100">Red-Team Stress Test</h2>
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Ambiguity & Vulnerability Radar
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Audits prompts against 4 key stress vectors and generates deterministic patches.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 bg-slate-950/60">
          
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3 text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin text-rose-400" />
              <p className="text-xs font-medium">Running 4-factor ambiguity stress test...</p>
            </div>
          ) : result ? (
            <div className="space-y-6">
              
              {/* Overall Score Banner */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                    Overall Prompt Resilience Index
                  </div>
                  <div className="text-2xl font-extrabold text-slate-100 mt-0.5">
                    {result.overall_score} / 100
                  </div>
                </div>

                <div className={`px-4 py-2 rounded-xl border text-xs font-bold ${getScoreColor(result.overall_score)}`}>
                  {result.overall_score >= 80 ? "STRONG PROMPT" : result.overall_score >= 50 ? "MODERATE AMBIGUITY" : "HIGH VULNERABILITY"}
                </div>
              </div>

              {/* 4 Stress Factor Meters */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Ambiguity Level", score: result.ambiguity_level, inverse: true, unit: "%" },
                  { label: "Hallucination Risk", score: result.hallucination_vulnerability, inverse: true, unit: "%" },
                  { label: "Instruction Leakage", score: result.instruction_leakage_risk, inverse: true, unit: "%" },
                  { label: "Edge Case Coverage", score: result.edge_case_coverage, inverse: false, unit: "%" },
                ].map((factor) => (
                  <div
                    key={factor.label}
                    className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2"
                  >
                    <div className="text-[11px] font-semibold text-slate-400 truncate">
                      {factor.label}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-slate-100">
                        {factor.score}{factor.unit}
                      </span>
                      <span className={`px-2 py-0.5 text-[10px] font-semibold rounded border ${getScoreColor(factor.score, factor.inverse)}`}>
                        {factor.inverse ? (factor.score > 60 ? "HIGH" : "LOW") : (factor.score < 50 ? "LOW" : "HIGH")}
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          factor.inverse
                            ? factor.score > 60 ? "bg-rose-500" : "bg-emerald-500"
                            : factor.score < 50 ? "bg-rose-500" : "bg-emerald-500"
                        }`}
                        style={{ width: `${factor.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Flagged Vague Terms & Patches */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                  <span className="flex items-center space-x-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>Ambiguity Diagnostics & Deterministic Patches</span>
                  </span>
                  <span className="text-xs text-amber-400 font-medium">
                    {result.flagged_terms?.length || 0} Vulnerabilities Detected
                  </span>
                </h3>

                {result.flagged_terms && result.flagged_terms.length > 0 ? (
                  <div className="space-y-3">
                    {result.flagged_terms.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2 text-xs"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 font-mono text-[11px] font-bold rounded border border-rose-500/30">
                            "{item.word}"
                          </span>
                          <span className="text-slate-300">{item.reason}</span>
                        </div>
                        <div className="pl-3 border-l-2 border-amber-500/40 text-amber-200/90 text-[11px]">
                          <strong>Suggested Patch:</strong> {item.suggested_patch}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-2">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
                    <p className="text-xs font-bold text-emerald-300">
                      Zero Vague Terms Detected!
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Your prompt enforces deterministic parameters and clear instruction boundaries.
                    </p>
                  </div>
                )}
              </div>

            </div>
          ) : null}

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition"
          >
            Cancel
          </button>

          {result && result.patches && result.patches.length > 0 && (
            <button
              onClick={handleApplyAllPatches}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs shadow-lg shadow-rose-500/20 flex items-center space-x-2 transition"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Apply {result.patches.length} Deterministic Patches</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
