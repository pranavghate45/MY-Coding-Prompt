"use client";

import React, { useState, useEffect } from "react";
import { GitBranch, Play, CheckCircle2, Clock, Zap, Cpu, DollarSign, RefreshCw, X, Layers, ArrowRight, Sparkles } from "lucide-react";
import { WorkflowExecutionResponse, WorkflowStepTrace } from "../types/api";

interface PromptWorkflowRunnerProps {
  isOpen: boolean;
  onClose: () => void;
  onInjectOutputToComposer?: (finalOutput: string) => void;
}

const TEMPLATES = [
  {
    id: "fullstack",
    name: "⚡ Full-Stack SaaS Builder",
    desc: "Step 1: SQL Schema -> Step 2: FastAPI Endpoints -> Step 3: Next.js 16 UI Component",
    initialPrompt: "Multi-tenant Student Verification Platform with OCR and JWT Auth",
    steps: [
      { step_number: 1, name: "SQL Schema Design", persona: "Architect", model: "llama-3.3-70b-versatile", prompt_template: "Design a clean SQL schema for: {{initial_input}}. Include primary keys, foreign keys, and indexes." },
      { step_number: 2, name: "FastAPI Backend Router", persona: "Architect", model: "gpt-4o", prompt_template: "Based on the SQL schema:\n\n{{step_1_output}}\n\nWrite fully typed Python FastAPI router endpoints with Pydantic schemas." },
      { step_number: 3, name: "Next.js 16 UI Component", persona: "Architect", model: "gpt-4o", prompt_template: "Based on the FastAPI router endpoints:\n\n{{step_2_output}}\n\nCreate a modern Next.js 16 component using Tailwind CSS and Lucide icons." }
    ]
  },
  {
    id: "research",
    name: "🔬 AI Research & Paper Synthesis",
    desc: "Step 1: Literature Outline -> Step 2: Formal Hypotheses -> Step 3: Executive Paper",
    initialPrompt: "Scalable Vector Search and Graph RAG Architectures for LLM Retrieval",
    steps: [
      { step_number: 1, name: "Topic Taxonomy", persona: "Researcher", model: "llama-3.3-70b-versatile", prompt_template: "Construct a research taxonomy for: {{initial_input}}." },
      { step_number: 2, name: "Hypothesis Synthesis", persona: "Researcher", model: "gpt-4o", prompt_template: "Based on taxonomy:\n\n{{step_1_output}}\n\nFormulate 3 formal hypotheses with mathematical logic." },
      { step_number: 3, name: "Executive Paper", persona: "Researcher", model: "gpt-4o", prompt_template: "Synthesize hypotheses:\n\n{{step_2_output}}\n\nWrite a complete executive research paper in Markdown." }
    ]
  }
];

export function PromptWorkflowRunner({
  isOpen,
  onClose,
  onInjectOutputToComposer,
}: PromptWorkflowRunnerProps) {
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0]);
  const [initialInput, setInitialInput] = useState(TEMPLATES[0].initialPrompt);
  const [loading, setLoading] = useState(false);
  const [activeStepTab, setActiveStepTab] = useState(1);
  const [result, setResult] = useState<WorkflowExecutionResponse | null>(null);

  const handleExecuteWorkflow = async () => {
    if (!initialInput.trim()) return;

    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/workflow/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selectedTemplate.name,
          steps: selectedTemplate.steps,
          initial_input: initialInput.trim(),
          user_id: "default_user",
        }),
      });

      if (res.ok) {
        const data: WorkflowExecutionResponse = await res.json();
        setResult(data);
        setActiveStepTab(1);
      }
    } catch (err) {
      console.error("Failed to execute multi-step workflow:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Prompt Chaining & Pipeline Engine</h3>
              <p className="text-xs text-slate-400">Multi-step sequential LLM execution with contextual variable piping</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Template Selector Pills */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">Select Workflow Pipeline Template</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() => {
                    setSelectedTemplate(tmpl);
                    setInitialInput(tmpl.initialPrompt);
                    setResult(null);
                  }}
                  className={`p-3.5 rounded-2xl border text-left transition ${
                    selectedTemplate.id === tmpl.id
                      ? "bg-purple-950/40 border-purple-500/60 shadow-lg shadow-purple-500/10"
                      : "bg-slate-950/60 border-slate-800 hover:bg-slate-950/90"
                  }`}
                >
                  <div className="font-bold text-xs text-white">{tmpl.name}</div>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{tmpl.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Initial Context Input */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">Initial Pipeline Input Variable (<code className="text-purple-300">{"{{initial_input}}"}</code>)</label>
            <textarea
              value={initialInput}
              onChange={(e) => setInitialInput(e.target.value)}
              placeholder="Enter the core topic or requirements for Step 1..."
              className="w-full h-20 bg-slate-950 text-xs text-slate-100 placeholder-slate-500 p-3 rounded-xl border border-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono resize-none"
            />
          </div>

          {/* Pipeline Step Visualizer */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-300">Pipeline Execution Steps</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {selectedTemplate.steps.map((st) => {
                const stepResult = result?.execution_trace.find((t) => t.step_number === st.step_number);

                return (
                  <div
                    key={st.step_number}
                    className={`p-3.5 rounded-xl border transition ${
                      stepResult
                        ? "bg-slate-950 border-emerald-500/40"
                        : loading
                        ? "bg-slate-950 border-purple-500/40 animate-pulse"
                        : "bg-slate-950/60 border-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-purple-400 font-bold uppercase">Step {st.step_number}</span>
                      {stepResult ? (
                        <span className="px-2 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-300 rounded font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Done
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] bg-slate-800 text-slate-400 rounded font-semibold">
                          Pending
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-bold text-white mt-1">{st.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-1">Model: {st.model}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleExecuteWorkflow}
              disabled={loading || !initialInput.trim()}
              className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-lg shadow-purple-600/30 transition"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Executing Pipeline Chain...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Run Multi-Step Pipeline</span>
                </>
              )}
            </button>
          </div>

          {/* Results Output Viewer */}
          {result && (
            <div className="space-y-4 pt-4 border-t border-slate-800">
              {/* Telemetry Summary Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono">
                <div className="flex items-center gap-2 text-slate-300">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Total Latency: {result.total_latency_ms} ms</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Cpu className="w-4 h-4 text-blue-400" />
                  <span>Total Tokens: {result.total_tokens_used} tok</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <span>Total Cost: ${result.total_estimated_cost_usd.toFixed(6)}</span>
                </div>
              </div>

              {/* Step Trace Tabs */}
              <div className="flex items-center gap-1 border-b border-slate-800">
                {result.execution_trace.map((tr) => (
                  <button
                    key={tr.step_number}
                    onClick={() => setActiveStepTab(tr.step_number)}
                    className={`px-4 py-2 text-xs font-semibold rounded-t-xl transition border-b-2 ${
                      activeStepTab === tr.step_number
                        ? "border-purple-500 text-white bg-slate-950"
                        : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Step {tr.step_number}: {tr.name}
                  </button>
                ))}
              </div>

              {/* Step Trace Output Content */}
              {result.execution_trace.find((t) => t.step_number === activeStepTab) && (
                <div className="space-y-3">
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                    {result.execution_trace.find((t) => t.step_number === activeStepTab)?.output}
                  </div>

                  {onInjectOutputToComposer && (
                    <div className="flex justify-end">
                      <button
                        onClick={() => {
                          const text = result.execution_trace.find((t) => t.step_number === activeStepTab)?.output;
                          if (text) {
                            onInjectOutputToComposer(text);
                            onClose();
                          }
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md transition"
                      >
                        <span>Inject Output to Workspace</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
