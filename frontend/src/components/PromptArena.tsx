"use client";

import React, { useState } from "react";
import { Swords, Zap, DollarSign, Cpu, Award, RefreshCw, AlertCircle } from "lucide-react";
import { ArenaComparisonResponse, PersonaType } from "../types/api";
import { saveUniversalProject } from "@/lib/projectStore";


const MODEL_OPTIONS = [
  { id: "llama-3.3-70b-versatile", label: "Groq Llama 3.3 70B (Versatile)", provider: "groq" },
  { id: "llama-3.1-8b-instant", label: "Groq Llama 3.1 8B (Instant)", provider: "groq" },
  { id: "gpt-4o", label: "OpenAI GPT-4o", provider: "openai" },
  { id: "gpt-3.5-turbo", label: "OpenAI GPT-3.5 Turbo", provider: "openai" },
  { id: "local-model", label: "Local Runner (Llama / Mistral)", provider: "local" },
];

export function PromptArena() {
  const [prompt, setPrompt] = useState("");
  const [modelA, setModelA] = useState("llama-3.3-70b-versatile");
  const [modelB, setModelB] = useState("gpt-4o");
  const [persona, setPersona] = useState<PersonaType>("Architect");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ArenaComparisonResponse | null>(null);

  const handleCompare = async () => {
    if (!prompt.trim()) {
      setError("Please enter a prompt to compare.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/arena/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          model_a: modelA,
          model_b: modelB,
          persona,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to execute arena comparison");
      }

      const data: ArenaComparisonResponse = await res.json();
      setResult(data);

      if (data) {
        const battleOutput = `### Model A (${data.model_a.model_name})\n${data.model_a.response}\n\n---\n\n### Model B (${data.model_b.model_name})\n${data.model_b.response}`;
        void saveUniversalProject({
          title: `Arena Battle: ${modelA} vs ${modelB}`,
          prompt_type: "arena_battle",
          persona: persona as any,
          target_model: `${modelA} vs ${modelB}`,
          framework: "Dual-Model Benchmark",
          raw_input: prompt.trim(),
          generated_super_prompt: battleOutput,
          metadata_json: { winner: data.winner, model_a: data.model_a, model_b: data.model_b },
        });
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during arena execution.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-[#111116] p-6 rounded-3xl border border-white/[0.08] shadow-2xl backdrop-blur-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Swords className="w-6 h-6 text-indigo-400 animate-pulse" />
            <h2 className="text-2xl font-bold text-white tracking-tight">Prompt Arena</h2>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-indigo-500/20 text-indigo-300 rounded-full border border-indigo-500/30">
              Dual-Model Benchmark
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Execute two models concurrently in parallel via <code className="text-indigo-300 bg-indigo-950/60 px-1.5 py-0.5 rounded text-xs font-mono">asyncio.gather</code> and compare latencies, token counts, and USD cost.
          </p>
        </div>

        {/* Persona Selector */}
        <div className="flex items-center gap-1.5 bg-[#16161e] p-1.5 rounded-2xl border border-white/[0.08]">
          <span className="text-xs font-medium text-slate-400 px-2">Persona:</span>
          {(["Architect", "Researcher", "Marketer"] as PersonaType[]).map((p) => (
            <button
              key={p}
              onClick={() => setPersona(p)}
              className={`px-3 py-1 text-xs font-medium rounded-xl transition-all ${
                persona === p
                  ? "bg-gradient-to-r from-indigo-600 to-cyan-600 text-white font-semibold shadow-md shadow-indigo-500/20"
                  : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Input Prompt Box */}
      <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 shadow-lg space-y-4">
        <label className="block text-sm font-semibold text-slate-200">
          Arena Input Prompt
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter a prompt to test across both models (e.g. Write a high-performance Rust async web crawler with Tokio)..."
          className="w-full h-28 bg-slate-950/80 text-slate-100 placeholder-slate-500 rounded-xl p-4 text-sm border border-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none font-mono"
        />

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={handleCompare}
            disabled={loading || !prompt.trim()}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-medium text-sm rounded-xl shadow-lg shadow-purple-600/25 transition-all transform active:scale-95"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Running Dual Execution...</span>
              </>
            ) : (
              <>
                <Swords className="w-4 h-4" />
                <span>Launch Dual Model Battle</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Dropdowns & Split-Screen Output Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Model A Column */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-purple-500 shadow-sm shadow-purple-500"></span>
                <span className="font-bold text-slate-200 text-sm">Model A (Left)</span>
              </div>
              <select
                value={modelA}
                onChange={(e) => setModelA(e.target.value)}
                className="bg-slate-950 text-xs text-purple-300 font-medium px-3 py-1.5 rounded-lg border border-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                {MODEL_OPTIONS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Model A Metrics Header */}
            {result?.model_a && (
              <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs font-mono">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>{result.model_a.latency_ms} ms</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Cpu className="w-3.5 h-3.5 text-blue-400" />
                  <span>{result.model_a.tokens_used} tok</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  <span>${result.model_a.estimated_cost_usd.toFixed(6)}</span>
                </div>
              </div>
            )}

            {/* Model A Content */}
            <div className="min-h-[220px] max-h-[360px] overflow-y-auto bg-slate-950/80 rounded-xl p-4 border border-slate-800 text-xs text-slate-200 font-mono whitespace-pre-wrap leading-relaxed">
              {loading ? (
                <div className="h-full flex items-center justify-center py-12 text-slate-500 gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
                  <span>Awaiting Model A stream response...</span>
                </div>
              ) : result?.model_a ? (
                result.model_a.response
              ) : (
                <span className="text-slate-600 italic">Select Model A and launch dual battle to view generation.</span>
              )}
            </div>
          </div>
        </div>

        {/* Model B Column */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-cyan-500 shadow-sm shadow-cyan-500"></span>
                <span className="font-bold text-slate-200 text-sm">Model B (Right)</span>
              </div>
              <select
                value={modelB}
                onChange={(e) => setModelB(e.target.value)}
                className="bg-slate-950 text-xs text-cyan-300 font-medium px-3 py-1.5 rounded-lg border border-slate-800 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                {MODEL_OPTIONS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Model B Metrics Header */}
            {result?.model_b && (
              <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs font-mono">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>{result.model_b.latency_ms} ms</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Cpu className="w-3.5 h-3.5 text-blue-400" />
                  <span>{result.model_b.tokens_used} tok</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  <span>${result.model_b.estimated_cost_usd.toFixed(6)}</span>
                </div>
              </div>
            )}

            {/* Model B Content */}
            <div className="min-h-[220px] max-h-[360px] overflow-y-auto bg-slate-950/80 rounded-xl p-4 border border-slate-800 text-xs text-slate-200 font-mono whitespace-pre-wrap leading-relaxed">
              {loading ? (
                <div className="h-full flex items-center justify-center py-12 text-slate-500 gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                  <span>Awaiting Model B stream response...</span>
                </div>
              ) : result?.model_b ? (
                result.model_b.response
              ) : (
                <span className="text-slate-600 italic">Select Model B and launch dual battle to view generation.</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Comparative Scoreboard */}
      {result && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 p-5 rounded-2xl border border-indigo-500/30 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400 animate-bounce" />
              <h3 className="text-base font-bold text-white">Comparative Scoreboard Telemetry</h3>
            </div>
            <div className="text-xs font-mono text-slate-400">
              Execution Mode: <span className="text-emerald-400 font-semibold">Concurrent asyncio.gather</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Speed Winner */}
            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-1">
              <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" /> Speed Winner
              </div>
              <div className="text-sm font-bold text-emerald-400">
                {result.scoreboard.faster_model === "model_a"
                  ? `Model A (${result.model_a.model})`
                  : result.scoreboard.faster_model === "model_b"
                  ? `Model B (${result.model_b.model})`
                  : "Tie (Equal Latency)"}
              </div>
              <div className="text-xs text-slate-400 font-mono">
                Faster by {result.scoreboard.latency_delta_ms} ms
              </div>
            </div>

            {/* Cost Efficiency Winner */}
            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-1">
              <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Cost Winner
              </div>
              <div className="text-sm font-bold text-emerald-400">
                {result.scoreboard.cheaper_model === "model_a"
                  ? `Model A (${result.model_a.model})`
                  : result.scoreboard.cheaper_model === "model_b"
                  ? `Model B (${result.model_b.model})`
                  : "Tie (Equal Cost)"}
              </div>
              <div className="text-xs text-slate-400 font-mono">
                Cheaper by ${result.scoreboard.cost_difference_usd.toFixed(6)}
              </div>
            </div>

            {/* Token Consumption Delta */}
            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-1">
              <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-blue-400" /> Token Differential
              </div>
              <div className="text-sm font-bold text-slate-200 font-mono">
                {Math.abs(result.model_a.tokens_used - result.model_b.tokens_used)} Tokens
              </div>
              <div className="text-xs text-slate-400">
                Model A: {result.model_a.tokens_used} tok | Model B: {result.model_b.tokens_used} tok
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
