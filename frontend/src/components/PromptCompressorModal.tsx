"use client";

import React, { useState, useEffect } from "react";
import { Zap, X, Copy, Check, ArrowRight, DollarSign, Scissors, Sparkles, AlertCircle } from "lucide-react";
import { CompressPromptData } from "@/types/api";

interface PromptCompressorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt?: string;
  onApplyCompressed?: (compressedPrompt: string) => void;
}

export function PromptCompressorModal({
  isOpen,
  onClose,
  initialPrompt = "",
  onApplyCompressed,
}: PromptCompressorModalProps) {
  const [rawPrompt, setRawPrompt] = useState(initialPrompt);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CompressPromptData | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && initialPrompt.trim() && !result) {
      setRawPrompt(initialPrompt);
      void handleCompress(initialPrompt);
    }
  }, [isOpen, initialPrompt]);

  if (!isOpen) return null;

  const handleCompress = async (textToCompress?: string) => {
    const input = (textToCompress || rawPrompt).trim();
    if (!input) return;

    setLoading(true);
    try {
      const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
      const res = await fetch(`${apiBase}/api/prompt/compress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: input }),
      });

      if (res.ok) {
        const body = await res.json();
        setResult(body.data);
      }
    } catch (err) {
      console.error("Compression error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result?.compressed_prompt) return;
    try {
      await navigator.clipboard.writeText(result.compressed_prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleApply = () => {
    if (result?.compressed_prompt && onApplyCompressed) {
      onApplyCompressed(result.compressed_prompt);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-100">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white">Prompt Token Compressor</h3>
                <span className="px-2.5 py-0.5 text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30 uppercase tracking-wider">
                  Cost Cutter Engine
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Extractive semantic compression removing filler noise while maintaining critical constraints & schemas.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
          {/* Input Text Area */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              Prompt Input to Compress
            </label>
            <textarea
              rows={4}
              value={rawPrompt}
              onChange={(e) => setRawPrompt(e.target.value)}
              placeholder="Paste verbose prompt text here..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-2xl p-4 text-xs text-slate-200 focus:outline-none font-mono leading-relaxed"
            />
            <div className="flex justify-end">
              <button
                disabled={loading || !rawPrompt.trim()}
                onClick={() => void handleCompress()}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition disabled:opacity-50"
              >
                {loading ? <span className="animate-pulse">Compressing...</span> : <><Scissors className="w-3.5 h-3.5" /> Compress Prompt</>}
              </button>
            </div>
          </div>

          {/* Telemetry Savings Banner */}
          {result && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs">
              <div className="space-y-1">
                <span className="text-slate-400 text-[10px] uppercase font-semibold">Tokens Saved</span>
                <p className="text-xl font-extrabold text-emerald-400">
                  {result.tokens_saved} <span className="text-xs text-slate-400">({result.savings_percentage})</span>
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 text-[10px] uppercase font-semibold">Token Reduction</span>
                <p className="text-base font-bold text-slate-200">
                  {result.original_tokens} → <span className="text-emerald-300">{result.compressed_tokens}</span>
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 text-[10px] uppercase font-semibold">Est. Dollar Savings / 10k Runs</span>
                <p className="text-xl font-extrabold text-indigo-400">
                  ${result.estimated_cost_delta_per_10k}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 text-[10px] uppercase font-semibold">Efficiency Rating</span>
                <p className="text-base font-bold text-amber-400 flex items-center gap-1">
                  <Sparkles className="w-4 h-4" /> High Savings
                </p>
              </div>
            </div>
          )}

          {/* Side-by-Side Diff Comparison */}
          {result && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Original Verbose Prompt ({result.original_tokens} tokens)
                </h4>
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-400 font-mono whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                  {result.original_prompt}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                    Compressed Minified Prompt ({result.compressed_tokens} tokens)
                  </h4>
                  <button
                    onClick={handleCopy}
                    className="text-xs text-emerald-300 hover:text-white font-medium flex items-center gap-1"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/30 text-xs text-slate-200 font-mono whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                  {result.compressed_prompt}
                </div>
              </div>
            </div>
          )}

          {/* Stripped Filler Phrases List */}
          {result && result.removed_phrases && result.removed_phrases.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Stripped Semantic Noise & Filler Phrases:
              </h4>
              <div className="flex flex-wrap gap-2">
                {result.removed_phrases.map((phrase, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/20 text-xs font-mono line-through"
                  >
                    "{phrase}"
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
          >
            Cancel
          </button>

          {result && (
            <button
              onClick={handleApply}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition"
            >
              <span>Apply Compressed Prompt</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
