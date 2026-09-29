"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Stethoscope,
  RotateCcw,
  ShieldAlert,
  Wand2,
  Zap,
  ArrowRight,
  CheckCircle2,
  Copy,
  Check,
  Play,
  Layers,
  Cpu,
  Shield,
  FileCode,
  Flame
} from "lucide-react";
import PromptProjectWizard from "@/components/PromptProjectWizard";
import { SuperPromptStudio } from "@/components/SuperPromptStudio";
import { PromptDoctorModal } from "@/components/PromptDoctorModal";
import { ReversePromptModal } from "@/components/ReversePromptModal";
import { PromptRedTeamModal } from "@/components/PromptRedTeamModal";
import { useRouter } from "next/navigation";

const QUICK_PRESETS = [
  {
    title: "⚡ FastAPI + Stripe Webhooks",
    prompt: "Build a production-ready FastAPI router for Stripe recurring billing webhooks with signature verification, idempotency keys, and database updates.",
  },
  {
    title: "🚀 Next.js 16 OLED Dashboard",
    prompt: "Architect a responsive Next.js 16 App Router dashboard using Tailwind CSS OLED dark tokens, Lucide icons, glassmorphism headers, and client state management.",
  },
  {
    title: "🔒 Supabase RLS & Auth Security",
    prompt: "Design comprehensive PostgreSQL Row Level Security (RLS) policies for user profiles, organization memberships, and multi-tenant document access in Supabase.",
  },
  {
    title: "🧠 DeepSeek R1 CoT Reasoning",
    prompt: "Construct a chain-of-thought verification prompt for complex algorithmic optimization, enforcing step-by-step mathematical proof prior to code generation.",
  },
];

export default function PromptGeneratorPage() {
  const router = useRouter();
  const [activeMode, setActiveMode] = useState<
    "studio" | "doctor" | "reverse" | "redteam" | "wizard"
  >("studio");

  const [activePrompt, setActivePrompt] = useState("");
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendToMainWorkspace = (promptText: string) => {
    try {
      window.dispatchEvent(
        new CustomEvent("my-prompt:load-chat", {
          detail: { prompt: promptText, response: "", messages: [] },
        })
      );
    } catch {}
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-100 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Title Banner */}
        <div className="p-6 rounded-3xl border border-white/[0.08] bg-[#111116]/90 backdrop-blur-xl shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.15),transparent_70%)]" />

          <div className="flex items-center space-x-4 relative z-10">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-500 text-white shadow-lg shadow-indigo-500/25">
              <Sparkles className="w-8 h-8 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                  World-Class Prompt Generator Engine
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold text-cyan-300 bg-cyan-500/20 border border-cyan-500/30">
                  Ultimate AI Suite v2.0
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-3xl">
                The gold standard in AI prompt engineering. Synthesize production-grade Super Prompts, adapt model syntax (Claude XML, OpenAI JSON, DeepSeek CoT), diagnose specification gaps, reverse-engineer code into system prompts, and red-team ambiguity.
              </p>
            </div>
          </div>

          {activePrompt && (
            <div className="flex items-center space-x-2 relative z-10 shrink-0">
              <button
                onClick={() => handleCopy(activePrompt)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition border border-slate-700 flex items-center space-x-1.5"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? "Copied!" : "Copy"}</span>
              </button>
              <button
                onClick={() => handleSendToMainWorkspace(activePrompt)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 flex items-center space-x-2 transition"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Test in Workspace</span>
              </button>
            </div>
          )}
        </div>

        {/* Quick Production Presets Bar */}
        <div className="p-4 rounded-2xl border border-white/[0.08] bg-[#16161e]/70 backdrop-blur-md">
          <div className="flex items-center space-x-2 mb-2 text-xs font-bold uppercase tracking-wider text-indigo-300">
            <Flame className="w-3.5 h-3.5 text-indigo-400 fill-current" />
            <span>1-Click Production Blueprints & Prompts</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {QUICK_PRESETS.map((preset) => (
              <button
                key={preset.title}
                onClick={() => {
                  setActivePrompt(preset.prompt);
                  setActiveMode("studio");
                }}
                className="p-2.5 rounded-xl border border-white/[0.06] bg-slate-900/60 hover:bg-slate-900 hover:border-indigo-500/40 text-left transition-all group"
              >
                <div className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors">
                  {preset.title}
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">
                  {preset.prompt}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Suite Mode Selector Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            {
              id: "studio",
              label: "Super Studio",
              icon: Zap,
              color: "text-cyan-400",
              desc: "Metaprompt & Model Syntax",
            },
            {
              id: "doctor",
              label: "Prompt Doctor",
              icon: Stethoscope,
              color: "text-teal-400",
              desc: "3 Q&A Clarification Diagnosis",
            },
            {
              id: "reverse",
              label: "Reverse Engineer",
              icon: RotateCcw,
              color: "text-purple-400",
              desc: "Decompile Output to System Prompt",
            },
            {
              id: "redteam",
              label: "Red-Team Test",
              icon: ShieldAlert,
              color: "text-rose-400",
              desc: "Ambiguity & Vulnerability Audit",
            },
            {
              id: "wizard",
              label: "Project Wizard",
              icon: Wand2,
              color: "text-amber-400",
              desc: "Step-by-Step App & Web Builder",
            },
          ].map((mode) => {
            const Icon = mode.icon;
            const isSelected = activeMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => setActiveMode(mode.id as any)}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  isSelected
                    ? "bg-slate-900 border-indigo-500/60 shadow-lg shadow-indigo-500/10 text-white"
                    : "bg-[#111116]/80 border-white/[0.08] text-slate-400 hover:border-white/[0.16] hover:text-slate-200"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Icon className={`w-4 h-4 ${mode.color}`} />
                  <span className="font-bold text-xs truncate text-slate-100">
                    {mode.label}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 truncate mt-1">
                  {mode.desc}
                </p>
              </button>
            );
          })}
        </div>

        {/* Active Tool View Container */}
        <div className="rounded-3xl border border-white/[0.08] bg-[#111116] p-2 min-h-[600px] overflow-hidden shadow-2xl relative">
          
          {/* Mode 1: Super Studio */}
          {activeMode === "studio" && (
            <SuperPromptStudio
              isOpen={true}
              onClose={() => setActiveMode("wizard")}
              initialPrompt={activePrompt}
              onApplyPrompt={(p) => {
                setActivePrompt(p);
                handleSendToMainWorkspace(p);
              }}
            />
          )}

          {/* Mode 2: Prompt Doctor */}
          {activeMode === "doctor" && (
            <PromptDoctorModal
              isOpen={true}
              onClose={() => setActiveMode("wizard")}
              initialPrompt={activePrompt}
              onApplyMasterPrompt={(p) => {
                setActivePrompt(p);
                handleSendToMainWorkspace(p);
              }}
            />
          )}

          {/* Mode 3: Reverse Engineer */}
          {activeMode === "reverse" && (
            <ReversePromptModal
              isOpen={true}
              onClose={() => setActiveMode("wizard")}
              onApplyPromptPair={(sys, user) => {
                const combined = `[SYSTEM INSTRUCTION]\n${sys}\n\n[USER PROMPT]\n${user}`;
                setActivePrompt(combined);
                handleSendToMainWorkspace(combined);
              }}
            />
          )}

          {/* Mode 4: Red-Team Stress Test */}
          {activeMode === "redteam" && (
            <PromptRedTeamModal
              isOpen={true}
              onClose={() => setActiveMode("wizard")}
              currentPrompt={activePrompt || "Make a simple, clean, fast website with authentication etc."}
              onApplyPatchedPrompt={(patched) => {
                setActivePrompt(patched);
                handleSendToMainWorkspace(patched);
              }}
            />
          )}

          {/* Mode 5: Prompt Project Wizard */}
          {activeMode === "wizard" && (
            <div className="p-4">
              <PromptProjectWizard />
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
