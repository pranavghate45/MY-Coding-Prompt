"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, Sparkles, Swords, Store, Lock, GitBranch, History, Download, Terminal, Copy, Play, ArrowRight, CornerDownLeft, Command, X, Zap, Stethoscope, RotateCcw, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectModel?: (modelId: string) => void;
  onTriggerAction?: (actionId: string) => void;
}

interface CommandItem {
  id: string;
  title: string;
  subtitle: string;
  category: "Navigation" | "Actions" | "Models" | "Templates";
  shortcut?: string;
  icon: React.ReactNode;
  action: () => void;
}

export function CommandPalette({ isOpen, onClose, onSelectModel, onTriggerAction }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const commands: CommandItem[] = [
    // Navigation
    {
      id: "nav-workspace",
      title: "Go to Workspace",
      subtitle: "Main AI prompt engineering canvas",
      category: "Navigation",
      shortcut: "⌘ 1",
      icon: <Sparkles className="w-4 h-4 text-indigo-400" />,
      action: () => {
        router.push("/");
        onClose();
      },
    },
    {
      id: "act-doctor",
      title: "Run Prompt Doctor",
      subtitle: "Diagnose raw prompt & answer 3 clarifying questions",
      category: "Actions",
      shortcut: "⌘ D",
      icon: <Stethoscope className="w-4 h-4 text-teal-400" />,
      action: () => {
        if (onTriggerAction) onTriggerAction("open-prompt-doctor");
        onClose();
      },
    },
    {
      id: "act-reverse",
      title: "Reverse Engineer Prompt",
      subtitle: "Deconstruct target output into System & User prompt pair",
      category: "Actions",
      shortcut: "⌘ R",
      icon: <RotateCcw className="w-4 h-4 text-purple-400" />,
      action: () => {
        if (onTriggerAction) onTriggerAction("open-reverse-prompt");
        onClose();
      },
    },
    {
      id: "act-redteam",
      title: "Red-Team Stress Test",
      subtitle: "Evaluate 4 ambiguity factors & apply deterministic patches",
      category: "Actions",
      shortcut: "⌘ T",
      icon: <ShieldAlert className="w-4 h-4 text-rose-400" />,
      action: () => {
        if (onTriggerAction) onTriggerAction("open-redteam-test");
        onClose();
      },
    },
    {
      id: "nav-super-studio",
      title: "Open Super Prompt Studio",
      subtitle: "Metaprompt engine, CO-STAR frameworks & Claude XML",
      category: "Actions",
      shortcut: "⌘ S",
      icon: <Zap className="w-4 h-4 text-cyan-400 fill-current" />,
      action: () => {
        if (onTriggerAction) onTriggerAction("open-super-prompt-studio");
        onClose();
      },
    },
    {
      id: "nav-arena",
      title: "Open Prompt Arena",
      subtitle: "Side-by-side dual-model battle & benchmark",
      category: "Navigation",
      shortcut: "⌘ 2",
      icon: <Swords className="w-4 h-4 text-purple-400" />,
      action: () => {
        if (onTriggerAction) onTriggerAction("open-arena");
        onClose();
      },
    },
    {
      id: "nav-marketplace",
      title: "Explore Marketplace",
      subtitle: "Community prompt templates & workflows",
      category: "Navigation",
      shortcut: "⌘ 3",
      icon: <Store className="w-4 h-4 text-cyan-400" />,
      action: () => {
        router.push("/marketplace");
        onClose();
      },
    },
    {
      id: "nav-vault",
      title: "Manage BYOK Vault",
      subtitle: "Encrypted API keys (OpenAI, Groq, Anthropic)",
      category: "Navigation",
      icon: <Lock className="w-4 h-4 text-emerald-400" />,
      action: () => {
        if (onTriggerAction) onTriggerAction("open-vault");
        onClose();
      },
    },
    {
      id: "nav-workflows",
      title: "Run Multi-Step Workflows",
      subtitle: "Prompt chaining & pipeline execution",
      category: "Navigation",
      icon: <GitBranch className="w-4 h-4 text-amber-400" />,
      action: () => {
        if (onTriggerAction) onTriggerAction("open-workflows");
        onClose();
      },
    },
    {
      id: "nav-versions",
      title: "View Prompt Version History",
      subtitle: "Diff view & 1-click rollback drawer",
      category: "Navigation",
      icon: <History className="w-4 h-4 text-rose-400" />,
      action: () => {
        if (onTriggerAction) onTriggerAction("open-versions");
        onClose();
      },
    },

    // Actions
    {
      id: "act-lint",
      title: "Run Prompt Linter & Evaluator",
      subtitle: "Check clarity, context, and score quality",
      category: "Actions",
      shortcut: "⌘ L",
      icon: <Sparkles className="w-4 h-4 text-indigo-300" />,
      action: () => {
        if (onTriggerAction) onTriggerAction("run-lint");
        onClose();
      },
    },
    {
      id: "act-export-zip",
      title: "Export Prompt as ZIP Archive",
      subtitle: "Package prompt.md and metadata.json",
      category: "Actions",
      icon: <Download className="w-4 h-4 text-slate-300" />,
      action: () => {
        if (onTriggerAction) onTriggerAction("export-zip");
        onClose();
      },
    },
    {
      id: "act-copy-curl",
      title: "Copy Executable cURL Command",
      subtitle: "Generate formatted HTTP curl snippet",
      category: "Actions",
      icon: <Terminal className="w-4 h-4 text-slate-300" />,
      action: () => {
        if (onTriggerAction) onTriggerAction("copy-curl");
        onClose();
      },
    },
    {
      id: "act-sandbox",
      title: "Toggle Live Code Sandbox",
      subtitle: "In-browser HTML/JS live iframe preview",
      category: "Actions",
      shortcut: "⌘ B",
      icon: <Play className="w-4 h-4 text-purple-300" />,
      action: () => {
        if (onTriggerAction) onTriggerAction("toggle-sandbox");
        onClose();
      },
    },
    {
      id: "act-shortcuts-help",
      title: "View Keyboard Shortcuts Cheat Sheet",
      subtitle: "Display productivity hotkey list",
      category: "Actions",
      shortcut: "?",
      icon: <Command className="w-4 h-4 text-slate-400" />,
      action: () => {
        if (onTriggerAction) onTriggerAction("open-shortcuts-help");
        onClose();
      },
    },

    // Models
    {
      id: "model-auto",
      title: "Switch Model to Auto (Smart Router)",
      subtitle: "Dynamically routes to optimal provider",
      category: "Models",
      icon: <Sparkles className="w-4 h-4 text-cyan-400" />,
      action: () => {
        if (onSelectModel) onSelectModel("auto");
        onClose();
      },
    },
    {
      id: "model-groq-llama-70b",
      title: "Switch Model to Groq Llama 3.3 70B",
      subtitle: "Ultra-fast inference (Versatile)",
      category: "Models",
      icon: <Sparkles className="w-4 h-4 text-amber-400" />,
      action: () => {
        if (onSelectModel) onSelectModel("llama-3.3-70b-versatile");
        onClose();
      },
    },
    {
      id: "model-openai-gpt4o",
      title: "Switch Model to OpenAI GPT-4o",
      subtitle: "Omni reasoning engine",
      category: "Models",
      icon: <Sparkles className="w-4 h-4 text-emerald-400" />,
      action: () => {
        if (onSelectModel) onSelectModel("gpt-4o");
        onClose();
      },
    },
    {
      id: "model-local",
      title: "Switch Model to Local LLM Runner",
      subtitle: "Offline privacy-first inference",
      category: "Models",
      icon: <Sparkles className="w-4 h-4 text-indigo-400" />,
      action: () => {
        if (onSelectModel) onSelectModel("local-model");
        onClose();
      },
    },

    // Templates
    {
      id: "tpl-fullstack",
      title: "Insert Variable Template: Full-Stack React Feature",
      subtitle: "Includes {{component_name}}, {{state_management}}, {{api_endpoint}}",
      category: "Templates",
      icon: <Copy className="w-4 h-4 text-indigo-400" />,
      action: () => {
        if (onTriggerAction) onTriggerAction("template-fullstack");
        onClose();
      },
    },
    {
      id: "tpl-api-router",
      title: "Insert Variable Template: FastAPI Endpoint Router",
      subtitle: "Includes {{router_name}}, {{http_method}}, {{response_schema}}",
      category: "Templates",
      icon: <Copy className="w-4 h-4 text-emerald-400" />,
      action: () => {
        if (onTriggerAction) onTriggerAction("template-api-router");
        onClose();
      },
    },
  ];

  const filteredCommands = commands.filter((cmd) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      cmd.title.toLowerCase().includes(q) ||
      cmd.subtitle.toLowerCase().includes(q) ||
      cmd.category.toLowerCase().includes(q)
    );
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 bg-black/80 backdrop-blur-md px-4">
      <div
        className="w-full max-w-2xl bg-[#111116] border border-white/[0.12] rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all duration-200"
        onKeyDown={handleKeyDown}
      >
        {/* Search Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.08] bg-[#16161e]">
          <Search className="w-5 h-5 text-indigo-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command or search... (e.g. Arena, GPT-4o, Export)"
            className="w-full bg-transparent text-sm text-white placeholder-slate-500 outline-none font-sans"
          />
          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono text-slate-500 bg-white/[0.04] border border-white/[0.08] px-2 py-0.5 rounded-md">
            ESC to close
          </span>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-2 space-y-1">
          {filteredCommands.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No matching commands or navigation options found for &quot;{query}&quot;.
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  onClick={() => cmd.action()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all ${
                    isSelected
                      ? "bg-indigo-600/20 border border-indigo-500/40 text-white shadow-inner"
                      : "border border-transparent text-slate-300 hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl border ${isSelected ? "bg-indigo-600/30 border-indigo-500/50" : "bg-[#16161e] border-white/[0.08]"}`}>
                      {cmd.icon}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white flex items-center gap-2">
                        {cmd.title}
                        <span className="text-[10px] text-slate-500 font-mono font-normal">[{cmd.category}]</span>
                      </div>
                      <div className="text-[11px] text-slate-400">{cmd.subtitle}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {cmd.shortcut && (
                      <span className="text-[10px] font-mono text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md">
                        {cmd.shortcut}
                      </span>
                    )}
                    {isSelected && (
                      <CornerDownLeft className="w-3.5 h-3.5 text-indigo-400" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer hints */}
        <div className="px-5 py-2.5 bg-[#16161e] border-t border-white/[0.08] flex items-center justify-between text-[11px] font-mono text-slate-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><ArrowRight className="w-3 h-3 text-indigo-400" /> Navigate ↑↓</span>
            <span className="flex items-center gap-1"><CornerDownLeft className="w-3 h-3 text-indigo-400" /> Select</span>
          </div>
          <div>Super Prompt Command Palette</div>
        </div>
      </div>
    </div>
  );
}
