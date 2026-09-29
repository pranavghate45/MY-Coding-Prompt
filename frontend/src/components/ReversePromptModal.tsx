"use client";

import React, { useState } from "react";
import {
  RotateCcw,
  X,
  Sparkles,
  Code2,
  Copy,
  Check,
  ArrowRight,
  RefreshCw,
  Cpu,
  FileCode
} from "lucide-react";
import { ReverseEngineerResponse } from "../types/api";

interface ReversePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyPromptPair: (systemPrompt: string, userPrompt: string) => void;
}

export function ReversePromptModal({
  isOpen,
  onClose,
  onApplyPromptPair,
}: ReversePromptModalProps) {
  const [desiredOutput, setDesiredOutput] = useState("");
  const [sampleInput, setSampleInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReverseEngineerResponse | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleReverseEngineer = async () => {
    if (!desiredOutput.trim()) return;

    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/prompt/reverse-engineer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          desired_output: desiredOutput.trim(),
          sample_input: sampleInput.trim() || undefined,
        }),
      });

      if (res.ok) {
        const data: ReverseEngineerResponse = await res.json();
        setResult(data);
      }
    } catch (err) {
      console.error("Error running reverse prompt engineering:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleApply = () => {
    if (result) {
      const combinedPrompt = `[SYSTEM INSTRUCTION]\n${result.system_prompt}\n\n[USER PROMPT]\n${result.user_prompt}`;
      onApplyPromptPair(result.system_prompt, combinedPrompt);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-100">
        
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-slate-100">Reverse Prompt Engineer</h2>
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Output-to-Prompt Decompiler
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Paste any desired code or text output to deconstruct its underlying system & user prompts.
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
        <div className="p-6 space-y-5 overflow-y-auto flex-1 bg-slate-950/60">
          
          {/* Target Output Snippet Input */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="flex flex-col space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                <Code2 className="w-3.5 h-3.5 text-purple-400" />
                <span>1. Target Output Code / Text (Required)</span>
              </label>
              <textarea
                value={desiredOutput}
                onChange={(e) => setDesiredOutput(e.target.value)}
                placeholder="Paste the target component code or structured text you want to reverse-engineer..."
                rows={6}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition resize-none font-mono"
              />
            </div>

            <div className="flex flex-col space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                <span>2. Sample Input Data (Optional)</span>
              </label>
              <textarea
                value={sampleInput}
                onChange={(e) => setSampleInput(e.target.value)}
                placeholder="Optional input payload e.g. { userId: '123' }..."
                rows={6}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition resize-none font-mono"
              />
            </div>

          </div>

          {/* Action Trigger */}
          <button
            onClick={handleReverseEngineer}
            disabled={loading || !desiredOutput.trim()}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-500/20 flex items-center justify-center space-x-2 transition disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Deconstructing Architecture & Prompt Patterns...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 fill-current" />
                <span>Deconstruct & Extract Prompts</span>
              </>
            )}
          </button>

          {/* Results Display */}
          {result && (
            <div className="space-y-4 pt-2 border-t border-slate-800 animate-in fade-in">
              
              {/* Detected Patterns Pills */}
              {result.detected_patterns && result.detected_patterns.length > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold text-slate-400">Detected Patterns:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {result.detected_patterns.map((pat) => (
                      <span
                        key={pat}
                        className="px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30"
                      >
                        {pat}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Extracted System Prompt */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center space-x-1.5">
                    <Cpu className="w-3.5 h-3.5" />
                    <span>Extracted System Instruction</span>
                  </label>
                  <button
                    onClick={() => handleCopy(result.system_prompt, "system")}
                    className="text-xs text-slate-400 hover:text-white flex items-center space-x-1"
                  >
                    {copiedField === "system" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedField === "system" ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 font-mono text-xs text-slate-200 max-h-36 overflow-y-auto">
                  <pre className="whitespace-pre-wrap font-mono">{result.system_prompt}</pre>
                </div>
              </div>

              {/* Extracted User Prompt */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center space-x-1.5">
                    <Code2 className="w-3.5 h-3.5" />
                    <span>Extracted User Prompt</span>
                  </label>
                  <button
                    onClick={() => handleCopy(result.user_prompt, "user")}
                    className="text-xs text-slate-400 hover:text-white flex items-center space-x-1"
                  >
                    {copiedField === "user" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedField === "user" ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 font-mono text-xs text-slate-200 max-h-36 overflow-y-auto">
                  <pre className="whitespace-pre-wrap font-mono">{result.user_prompt}</pre>
                </div>
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

          {result && (
            <button
              onClick={handleApply}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center space-x-2 transition"
            >
              <span>Apply Extracted Prompts to Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
