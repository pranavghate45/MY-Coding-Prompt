"use client";

import React, { useState } from "react";
import { Sparkles, CheckCircle2, AlertTriangle, ArrowRight, RefreshCw, X, Shield, Layers, UserCheck } from "lucide-react";
import { PromptEvaluationResult } from "../types/api";

interface PromptLinterProps {
  currentPrompt: string;
  persona?: string;
  onApplyEnhancedPrompt?: (enhancedText: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function PromptLinter({
  currentPrompt,
  persona,
  onApplyEnhancedPrompt,
  isOpen,
  onClose,
}: PromptLinterProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PromptEvaluationResult | null>(null);

  const handleEvaluate = async () => {
    if (!currentPrompt.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/prompt/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: currentPrompt.trim(),
          persona,
        }),
      });

      if (res.ok) {
        const data: PromptEvaluationResult = await res.json();
        setResult(data);
      }
    } catch (err) {
      console.error("Failed to run prompt evaluation:", err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (isOpen && currentPrompt.trim()) {
      handleEvaluate();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Prompt Quality Evaluator & Linter</h3>
              <p className="text-xs text-slate-400">Real-time analysis across 3 core prompt engineering pillars</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400 text-sm">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
              <span>Analyzing prompt structure and guardrails...</span>
            </div>
          ) : result ? (
            <>
              {/* Score Header Card */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-gradient-to-r from-slate-950 via-indigo-950/30 to-slate-950 p-5 rounded-2xl border border-indigo-500/20 shadow-lg">
                <div className="space-y-1 text-center sm:text-left">
                  <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Overall Quality Score</span>
                  <div className="text-3xl font-extrabold text-white">
                    {result.overall_score} <span className="text-base text-slate-500 font-normal">/ 100</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {result.overall_score >= 80
                      ? "🌟 Production Ready: Excellent guardrails and structural clarity."
                      : result.overall_score >= 50
                      ? "⚠️ Moderate Quality: Recommend adding explicit role and output constraints."
                      : "🚨 Needs Improvement: Lacks role context, guardrails, or output format directives."}
                  </p>
                </div>

                <div className="w-20 h-20 rounded-full border-4 border-indigo-500/40 flex items-center justify-center bg-indigo-950/40 text-indigo-300 font-bold text-xl shadow-inner">
                  {result.overall_score}%
                </div>
              </div>

              {/* 3 Pillar Score Bars */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Pillar 1 */}
                <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-purple-400" /> Role & Context
                    </span>
                    <span className="font-mono text-purple-400">{result.pillar_scores.role_and_context}/10</span>
                  </div>
                  <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full transition-all duration-500"
                      style={{ width: `${(result.pillar_scores.role_and_context / 10) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Pillar 2 */}
                <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-emerald-400" /> Guardrails
                    </span>
                    <span className="font-mono text-emerald-400">{result.pillar_scores.constraints_and_guardrails}/10</span>
                  </div>
                  <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${(result.pillar_scores.constraints_and_guardrails / 10) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Pillar 3 */}
                <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-blue-400" /> Output Structure
                    </span>
                    <span className="font-mono text-blue-400">{result.pillar_scores.output_structure}/10</span>
                  </div>
                  <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${(result.pillar_scores.output_structure / 10) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Suggestions List */}
              {result.suggestions.length > 0 && (
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-slate-300">Actionable Linter Suggestions</div>
                  <div className="space-y-2">
                    {result.suggestions.map((sug, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-200">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <span>{sug}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Enhanced Prompt Candidate */}
              {result.enhanced_prompt && (
                <div className="space-y-3 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300">Enhanced Candidate Preview</span>
                    {onApplyEnhancedPrompt && (
                      <button
                        onClick={() => {
                          onApplyEnhancedPrompt(result.enhanced_prompt);
                          onClose();
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-lg transition shadow-md"
                      >
                        <span>Apply Fixes to Composer</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                    {result.enhanced_prompt}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-8 text-center text-xs text-slate-500">Enter a prompt to run quality evaluation.</div>
          )}
        </div>
      </div>
    </div>
  );
}
