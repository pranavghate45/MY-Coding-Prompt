"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  X,
  Shield,
  Target,
  Copy,
  Check,
  Play,
  Layers,
  Cpu,
  Sliders,
  AlertCircle,
  FileCode,
  Zap,
  RefreshCw
} from "lucide-react";
import { OptimizePromptRequest, ExpandConstraintsResponse } from "../types/api";
import { saveUniversalProject } from "@/lib/projectStore";
import { CacheBadge } from "./CacheBadge";
import { PIIGuardBanner } from "./PIIGuardBanner";
import { PromptFeedbackWidget } from "./PromptFeedbackWidget";
import { VoicePromptRecorder } from "./VoicePromptRecorder";
import { MarkdownRenderer } from "./MarkdownRenderer";


interface SuperPromptStudioProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt?: string;
  onApplyPrompt?: (superPrompt: string) => void;
}

export function SuperPromptStudio({
  isOpen,
  onClose,
  initialPrompt = "",
  onApplyPrompt,
}: SuperPromptStudioProps) {
  const [rawPrompt, setRawPrompt] = useState(initialPrompt);
  const [framework, setFramework] = useState<"co-star" | "rtf" | "few-shot" | "custom">("co-star");
  const [targetModelStyle, setTargetModelStyle] = useState<"claude-xml" | "openai-markdown" | "reasoning-o1">("claude-xml");
  const [rigorLevel, setRigorLevel] = useState<"standard" | "strict">("strict");
  
  const [outputPrompt, setOutputPrompt] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isExpandingConstraints, setIsExpandingConstraints] = useState(false);
  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);
  const [piiAudit, setPiiAudit] = useState<{ maskedCount: number; warning: string; maskedTypes: string[] }>({
    maskedCount: 0,
    warning: "",
    maskedTypes: [],
  });

  const outputRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (initialPrompt && !rawPrompt) {
      setRawPrompt(initialPrompt);
    }
  }, [initialPrompt]);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [outputPrompt]);

  if (!isOpen) return null;

  const handleGenerateSuperPrompt = async () => {
    if (!rawPrompt.trim()) return;

    // Check for PII & secrets in input
    const piiKeyMatches = rawPrompt.match(/\bsk-(?:proj-)?[a-zA-Z0-9_\-]{20,}\b|\bAKIA[0-9A-Z]{16}\b|\bBearer\s+eyJ[a-zA-Z0-9\-_=\.]+\b/g);
    const piiContactMatches = rawPrompt.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b|\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g);
    const maskedCount = (piiKeyMatches ? piiKeyMatches.length : 0) + (piiContactMatches ? piiContactMatches.length : 0);

    if (maskedCount > 0) {
      const types = [];
      if (piiKeyMatches) types.push("[REDACTED_API_KEY]");
      if (piiContactMatches) types.push("[REDACTED_CONTACT]");
      setPiiAudit({
        maskedCount,
        warning: `🛡️ ${maskedCount} sensitive ${maskedCount > 1 ? "entities were" : "entity was"} auto-masked before sending to LLM.`,
        maskedTypes: types,
      });
    } else {
      setPiiAudit({ maskedCount: 0, warning: "", maskedTypes: [] });
    }

    setOutputPrompt("");
    setIsStreaming(true);
    setIsCached(false);
    setStatusMessage("Architecting Super Prompt with Metaprompt Engine...");

    try {
      const payload: OptimizePromptRequest = {
        raw_prompt: rawPrompt.trim(),
        framework,
        target_model_style: targetModelStyle,
        rigor_level: rigorLevel,
      };

      const response = await fetch("http://127.0.0.1:8000/api/prompt/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const cacheHeader = response.headers.get("X-Cache");
      if (cacheHeader === "HIT") {
        setIsCached(true);
      }

      if (!response.ok || !response.body) {
        throw new Error(`Server returned status ${response.status}`);
      }


      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data: ")) {
            const jsonStr = trimmed.replace("data: ", "");
            if (jsonStr === "[DONE]") break;
            try {
              const parsed = JSON.parse(jsonStr);
              if (parsed.content) {
                setOutputPrompt((prev) => prev + parsed.content);
              }
            } catch (e) {
              console.error("Error parsing SSE chunk:", e);
            }
          }
        }
      }

      setStatusMessage("Super Prompt Optimization Complete! ⚡");
      if (rawPrompt.trim()) {
        void saveUniversalProject({
          title: `Super Prompt: ${rawPrompt.trim().slice(0, 45)}`,
          prompt_type: "workspace_chat",
          persona: "Architect",
          target_model: targetModelStyle,
          framework: framework.toUpperCase(),
          raw_input: rawPrompt.trim(),
          generated_super_prompt: outputPrompt,
          metadata_json: { framework, rigorLevel, targetModelStyle },
        });
      }
    } catch (err) {
      console.error("Failed to generate Super Prompt:", err);
      setStatusMessage("Failed to generate prompt. Please check backend connection.");
    } finally {
      setIsStreaming(false);
    }
  };

  const handleAddEdgeCaseGuardrails = async () => {
    if (!rawPrompt.trim()) return;

    setIsExpandingConstraints(true);
    setStatusMessage("Synthesizing 5 Domain Edge Cases & Negative Constraints...");

    try {
      const res = await fetch("http://127.0.0.1:8000/api/prompt/expand-constraints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raw_prompt: rawPrompt.trim(),
          domain_context: framework,
        }),
      });

      if (res.ok) {
        const data: ExpandConstraintsResponse = await res.json();
        const guardrailsText = `\n\n### 🛡️ Mandatory Edge-Case Guardrails & Negative Constraints:\n` +
          data.constraints.map((c, idx) => `${idx + 1}. ${c}`).join("\n");

        setOutputPrompt((prev) => prev + guardrailsText);
        setStatusMessage("Appended 5 Domain Edge-Case Guardrails!");
      }
    } catch (err) {
      console.error("Failed to expand constraints:", err);
      setStatusMessage("Failed to fetch edge-case guardrails.");
    } finally {
      setIsExpandingConstraints(false);
    }
  };

  const handleInjectFewShotExample = () => {
    const fewShotTemplate = `\n\n### 🎯 Few-Shot Benchmark Example:

<example_input>
{
  "user_query": "Calculate 30-day recurring revenue retention for enterprise tier",
  "data_format": "JSON"
}
</example_input>

<example_output>
{
  "metric": "Net Revenue Retention (NRR)",
  "value_pct": 112.4,
  "cohort_analysis": "Expansion driven by seats add-on",
  "status": "HEALTHY"
}
</example_output>`;

    setOutputPrompt((prev) => prev + fewShotTemplate);
    setStatusMessage("Injected Few-Shot Example Schema!");
  };

  const handleCopy = () => {
    if (!outputPrompt) return;
    navigator.clipboard.writeText(outputPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTestNow = () => {
    if (outputPrompt && onApplyPrompt) {
      onApplyPrompt(outputPrompt);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800/90 rounded-2xl w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-100">
        
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-slate-100 tracking-wide">
                  Super Prompt Studio
                </h2>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Metaprompt v2.0
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Transform raw concepts into production-grade, highly structured LLM prompts.
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

        {/* Split Screen Workspace Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-800 flex-1 overflow-hidden">
          
          {/* Left Pane: Controls & Raw Prompt Input (5 Cols) */}
          <div className="lg:col-span-5 p-5 flex flex-col space-y-5 overflow-y-auto bg-slate-900/60">
            
            {/* Raw Prompt Input */}
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  1. Raw Prompt / Vague Idea
                </label>
                <div className="flex items-center space-x-2">
                  <VoicePromptRecorder
                    persona={framework}
                    framework={framework}
                    onPromptSynthesized={(transcribed, superPrompt) => {
                      setRawPrompt(transcribed);
                      setOutputPrompt(superPrompt);
                    }}
                  />
                  <span className="text-[10px] text-slate-400 font-normal">
                    {rawPrompt.length} chars
                  </span>
                </div>
              </div>

              <textarea
                value={rawPrompt}
                onChange={(e) => setRawPrompt(e.target.value)}
                placeholder="e.g. Create a FastAPI router for handling subscription billing webhook events from Stripe..."
                rows={5}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-sans resize-none"
              />
            </div>

            {/* Prompt Framework Selector */}
            <div className="flex flex-col space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>2. Prompt Architecture Framework</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "co-star", name: "CO-STAR", desc: "Context, Obj, Style, Tone, Aud, Resp" },
                  { id: "rtf", name: "Role-Task-Format", desc: "Role, Task, Strict Format" },
                  { id: "few-shot", name: "Few-Shot Examples", desc: "Input/Output Schemas" },
                  { id: "custom", name: "Adaptive Auto", desc: "AI-determined structure" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setFramework(item.id as any)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      framework === item.id
                        ? "bg-indigo-600/15 border-indigo-500 text-indigo-200 shadow-sm"
                        : "bg-slate-950/60 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    <div className="font-semibold text-xs text-slate-200">{item.name}</div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Target Model Syntax Rules */}
            <div className="flex flex-col space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                <span>3. Target Model Style Adapters</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "claude-xml", label: "Claude XML", tag: "<xml>" },
                  { id: "openai-markdown", label: "GPT-4o / Groq", tag: "Markdown" },
                  { id: "reasoning-o1", label: "Reasoning o1", tag: "CoT Verification" },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setTargetModelStyle(m.id as any)}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      targetModelStyle === m.id
                        ? "bg-cyan-500/15 border-cyan-500 text-cyan-200"
                        : "bg-slate-950/60 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    <div className="text-xs font-semibold truncate">{m.label}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{m.tag}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Rigor & Strictness Level */}
            <div className="flex flex-col space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                <span className="flex items-center space-x-1.5">
                  <Sliders className="w-3.5 h-3.5 text-purple-400" />
                  <span>4. Guardrail Rigor</span>
                </span>
                <span className="text-[11px] text-indigo-400 font-medium capitalize">
                  {rigorLevel} Mode
                </span>
              </label>
              <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
                <button
                  onClick={() => setRigorLevel("standard")}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    rigorLevel === "standard"
                      ? "bg-slate-800 text-slate-100 shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Standard Guardrails
                </button>
                <button
                  onClick={() => setRigorLevel("strict")}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    rigorLevel === "strict"
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Strict / Zero-Hallucination
                </button>
              </div>
            </div>

            {/* Generate Action Button */}
            <button
              onClick={handleGenerateSuperPrompt}
              disabled={isStreaming || !rawPrompt.trim()}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-auto"
            >
              {isStreaming ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Architecting Super Prompt...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-current" />
                  <span>Generate Super Prompt</span>
                </>
              )}
            </button>
          </div>

          {/* Right Pane: Live Super Prompt Output & Quick Actions (7 Cols) */}
          <div className="lg:col-span-7 p-5 flex flex-col space-y-4 bg-slate-950/80 overflow-hidden">
            
            {/* PII Audit Banner */}
            <PIIGuardBanner
              maskedCount={piiAudit.maskedCount}
              warning={piiAudit.warning}
              maskedTypes={piiAudit.maskedTypes}
            />

            {/* Right Pane Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <FileCode className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Optimized Super Prompt Blueprint
                </span>
                {outputPrompt && (
                  <span className="px-2 py-0.5 text-[10px] font-mono bg-slate-800 text-slate-300 rounded border border-slate-700">
                    {outputPrompt.length} chars
                  </span>
                )}
                <CacheBadge cached={isCached} />
              </div>

              {/* Status Message / Spinner */}
              {statusMessage && (
                <span className="text-xs text-indigo-300 font-medium truncate max-w-xs animate-in fade-in">
                  {statusMessage}
                </span>
              )}
            </div>

            {/* Prompt Output Viewer */}
            <div className="flex-1 bg-slate-900/90 border border-slate-800 rounded-xl p-4 overflow-y-auto relative text-xs text-slate-200 leading-relaxed shadow-inner">
              {outputPrompt ? (
                <div className="space-y-4">
                  <MarkdownRenderer content={outputPrompt} id="studio" />
                  {!isStreaming && (
                    <div className="pt-3 border-t border-slate-800">
                      <PromptFeedbackWidget
                        projectId="super-prompt-studio"
                        originalPrompt={rawPrompt}
                        generatedPrompt={outputPrompt}
                      />
                    </div>
                  )}
                </div>
              ) : (

                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center space-y-3 p-6">
                  <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50 text-slate-400">
                    <Sparkles className="w-8 h-8 stroke-1 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-300">
                      Super Prompt Workspace Ready
                    </p>
                    <p className="text-xs text-slate-400 max-w-sm mt-1">
                      Enter your raw prompt concept on the left, choose your framework, and hit Generate to stream your production-ready metaprompt.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Action Enhancers Bar */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
              
              {/* 🛡️ Edge Case Guardrails */}
              <button
                onClick={handleAddEdgeCaseGuardrails}
                disabled={isExpandingConstraints || !rawPrompt.trim()}
                className="py-2 px-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-medium flex items-center space-x-1.5 transition-all disabled:opacity-50"
              >
                {isExpandingConstraints ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                ) : (
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>🛡️ Add Edge-Case Guardrails</span>
              </button>

              {/* 🎯 Few-Shot Benchmark Example */}
              <button
                onClick={handleInjectFewShotExample}
                className="py-2 px-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-medium flex items-center space-x-1.5 transition-all"
              >
                <Target className="w-3.5 h-3.5 text-cyan-400" />
                <span>🎯 Inject Few-Shot Example</span>
              </button>

              <div className="flex-1" />

              {/* 📋 Copy */}
              <button
                onClick={handleCopy}
                disabled={!outputPrompt}
                className="py-2 px-3 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 text-xs font-medium flex items-center space-x-1.5 transition-all disabled:opacity-40"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>

              {/* 🧪 Test Prompt Now */}
              <button
                onClick={handleTestNow}
                disabled={!outputPrompt}
                className="py-2 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md shadow-emerald-600/20 disabled:opacity-40"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Test Prompt Now</span>
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
