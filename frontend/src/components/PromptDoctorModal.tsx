"use client";

import React, { useState, useEffect } from "react";
import {
  Stethoscope,
  X,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  RefreshCw,
  Zap,
  Check
} from "lucide-react";
import {
  DoctorQuestion,
  DiagnosePromptResponse,
  SynthesizePromptResponse
} from "../types/api";
import { saveUniversalProject } from "@/lib/projectStore";


interface PromptDoctorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt?: string;
  onApplyMasterPrompt: (masterPrompt: string) => void;
}

export function PromptDoctorModal({
  isOpen,
  onClose,
  initialPrompt = "",
  onApplyMasterPrompt,
}: PromptDoctorModalProps) {
  const [rawPrompt, setRawPrompt] = useState(initialPrompt);
  const [questions, setQuestions] = useState<DoctorQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loadingDiagnosis, setLoadingDiagnosis] = useState(false);
  const [loadingSynthesis, setLoadingSynthesis] = useState(false);
  const [masterPromptResult, setMasterPromptResult] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && initialPrompt.trim()) {
      setRawPrompt(initialPrompt);
      handleDiagnose(initialPrompt);
    }
  }, [isOpen, initialPrompt]);

  if (!isOpen) return null;

  const handleDiagnose = async (promptToDiagnose?: string) => {
    const text = promptToDiagnose || rawPrompt;
    if (!text.trim()) return;

    setLoadingDiagnosis(true);
    setMasterPromptResult(null);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/prompt/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_prompt: text.trim() }),
      });

      if (res.ok) {
        const data: DiagnosePromptResponse = await res.json();
        setQuestions(data.questions);
        // Pre-fill answers with first option default
        const initAnswers: Record<string, string> = {};
        data.questions.forEach((q) => {
          if (q.options && q.options.length > 0) {
            initAnswers[q.id] = q.options[0];
          }
        });
        setAnswers(initAnswers);
      }
    } catch (err) {
      console.error("Error diagnosing prompt:", err);
    } finally {
      setLoadingDiagnosis(false);
    }
  };

  const handleSelectOption = (questionId: string, optionValue: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionValue }));
  };

  const handleSynthesize = async () => {
    if (!rawPrompt.trim() || questions.length === 0) return;

    setLoadingSynthesis(true);
    try {
      const formattedAnswers = questions.map((q) => ({
        question: q.question,
        answer: answers[q.id] || "Standard Default",
      }));

      const res = await fetch("http://127.0.0.1:8000/api/prompt/synthesize-with-answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raw_prompt: rawPrompt.trim(),
          answers: formattedAnswers,
        }),
      });

      if (res.ok) {
        const data: SynthesizePromptResponse = await res.json();
        setMasterPromptResult(data.master_prompt);
        if (data.master_prompt) {
          void saveUniversalProject({
            title: `Prompt Doctor: ${rawPrompt.trim().slice(0, 45)}`,
            prompt_type: "prompt_doctor",
            persona: "Architect",
            target_model: "gpt-4o",
            framework: "CO-STAR",
            raw_input: rawPrompt.trim(),
            generated_super_prompt: data.master_prompt,
            metadata_json: { source: "prompt_doctor" },
          });
        }
      }
    } catch (err) {
      console.error("Error synthesizing master prompt:", err);
    } finally {
      setLoadingSynthesis(false);
    }
  };

  const handleApplyToWorkspace = () => {
    if (masterPromptResult) {
      onApplyMasterPrompt(masterPromptResult);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-100">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-slate-100">Prompt Doctor</h2>
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  Interactive Diagnosis
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Diagnoses weak prompt specifications and asks 3 critical design questions to build a Master Prompt.
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
          
          {/* Raw Prompt Input */}
          <div className="flex flex-col space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Raw Concept / Idea</span>
              <button
                onClick={() => handleDiagnose()}
                disabled={loadingDiagnosis || !rawPrompt.trim()}
                className="text-xs text-teal-400 hover:underline flex items-center space-x-1 disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${loadingDiagnosis ? "animate-spin" : ""}`} />
                <span>Re-Diagnose</span>
              </button>
            </label>
            <textarea
              value={rawPrompt}
              onChange={(e) => setRawPrompt(e.target.value)}
              placeholder="e.g. Build a car rental web app..."
              rows={3}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 transition resize-none font-sans"
            />
          </div>

          {/* 3 Diagnosed Clarifying Questions */}
          {loadingDiagnosis ? (
            <div className="py-8 flex flex-col items-center justify-center space-y-3 text-slate-400">
              <RefreshCw className="w-7 h-7 animate-spin text-teal-400" />
              <p className="text-xs font-medium">Diagnosing prompt specifications & extracting missing dimensions...</p>
            </div>
          ) : questions.length > 0 ? (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
                <HelpCircle className="w-4 h-4 text-teal-400" />
                <span>3 Critical Clarification Questions</span>
              </h3>

              <div className="space-y-4">
                {questions.map((q, idx) => (
                  <div
                    key={q.id || idx}
                    className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200">
                        {idx + 1}. {q.question}
                      </span>
                      {q.category && (
                        <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-800 text-teal-300 rounded border border-slate-700">
                          {q.category}
                        </span>
                      )}
                    </div>

                    {/* Option Chips */}
                    <div className="flex flex-wrap gap-2">
                      {q.options?.map((opt) => {
                        const isSelected = answers[q.id] === opt;
                        return (
                          <button
                            key={opt}
                            onClick={() => handleSelectOption(q.id, opt)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center space-x-1.5 ${
                              isSelected
                                ? "bg-teal-500/20 border-teal-500 text-teal-200 shadow-sm"
                                : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 text-teal-400" />}
                            <span>{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Master Prompt Output Preview */}
          {masterPromptResult && (
            <div className="space-y-2 animate-in fade-in">
              <label className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Synthesized Master Super Prompt</span>
              </label>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 max-h-52 overflow-y-auto font-mono text-xs text-slate-200 leading-relaxed shadow-inner">
                <pre className="whitespace-pre-wrap font-mono">{masterPromptResult}</pre>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition"
          >
            Cancel
          </button>

          <div className="flex items-center space-x-2">
            {!masterPromptResult ? (
              <button
                onClick={handleSynthesize}
                disabled={loadingSynthesis || questions.length === 0}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-bold text-xs shadow-lg shadow-teal-500/20 flex items-center space-x-2 transition disabled:opacity-50"
              >
                {loadingSynthesis ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Synthesizing Master Prompt...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>Generate Master Prompt</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleApplyToWorkspace}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center space-x-2 transition"
              >
                <span>Apply to Workspace Composer</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
