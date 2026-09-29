"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Sparkles, Sliders, Check, X, Eye, FileCode } from "lucide-react";
import { TemplateVariable } from "../types/api";

export interface VariablePromptModalProps {
  rawTemplate: string;
  isOpen: boolean;
  onClose: () => void;
  onInjectPrompt: (interpolatedText: string) => void;
}

export function VariablePromptModal({ rawTemplate, isOpen, onClose, onInjectPrompt }: VariablePromptModalProps) {
  const [variables, setVariables] = useState<TemplateVariable[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Parse variables from backend endpoint or regex fallback
  useEffect(() => {
    if (!isOpen || !rawTemplate.trim()) return;

    let isMounted = true;
    setLoading(true);

    const parseRemote = async () => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
        const res = await fetch(`${apiBase}/api/templates/parse`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ template_text: rawTemplate }),
        });

        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.variables) {
            setVariables(data.variables);
            const initialVals: Record<string, string> = {};
            data.variables.forEach((v: TemplateVariable) => {
              initialVals[v.name] = v.default_value || "";
            });
            setValues(initialVals);
            setLoading(false);
            return;
          }
        }
      } catch {
        // Fallback to local regex parse
      }

      // Local Regex Fallback
      const matches = Array.from(rawTemplate.matchAll(/\{\{\s*([a-zA-Z0-9_]+)(?:\s*:\s*([^}]+))?\s*\}\}/g));
      const seen = new Set<string>();
      const parsedVars: TemplateVariable[] = [];
      const initialVals: Record<string, string> = {};

      matches.forEach((m) => {
        const name = m[1].trim();
        const def = m[2] ? m[2].trim() : null;
        if (!seen.has(name)) {
          seen.add(name);
          parsedVars.push({
            name,
            default_value: def,
            label: name.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
          });
          initialVals[name] = def || "";
        }
      });

      if (isMounted) {
        setVariables(parsedVars);
        setValues(initialVals);
        setLoading(false);
      }
    };

    void parseRemote();

    return () => {
      isMounted = false;
    };
  }, [isOpen, rawTemplate]);

  // Live Interpolated Text Calculation
  const interpolatedText = useMemo(() => {
    if (!rawTemplate) return "";
    return rawTemplate.replace(/\{\{\s*([a-zA-Z0-9_]+)(?:\s*:\s*([^}]+))?\s*\}\}/g, (match, varName, defaultVal) => {
      const trimmedName = varName.trim();
      const userVal = values[trimmedName];
      if (userVal !== undefined && userVal.trim() !== "") {
        return userVal.trim();
      }
      if (defaultVal) {
        return defaultVal.trim();
      }
      return match;
    });
  }, [rawTemplate, values]);

  const handleChange = (varName: string, val: string) => {
    setValues((prev) => ({ ...prev, [varName]: val }));
  };

  const handleInject = () => {
    onInjectPrompt(interpolatedText);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4">
      <div className="w-full max-w-2xl bg-[#111116] border border-white/[0.12] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#16161e]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Fill Prompt Variables</h3>
              <p className="text-xs text-slate-400">
                {variables.length} variable placeholder{variables.length !== 1 ? "s" : ""} detected in template
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Parsing template variables...</div>
          ) : variables.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No variable placeholders matching <code className="text-indigo-300 font-mono">{"{{var}}"}</code> found in this prompt.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {variables.map((v) => (
                  <div key={v.name} className="space-y-1.5 bg-[#16161e] p-3 rounded-2xl border border-white/[0.06]">
                    <label className="block text-xs font-semibold text-slate-200">
                      {v.label} <span className="text-[10px] text-slate-500 font-mono">({`{{${v.name}}}`})</span>
                    </label>
                    <input
                      type="text"
                      value={values[v.name] || ""}
                      onChange={(e) => handleChange(v.name, e.target.value)}
                      placeholder={v.default_value ? `Default: ${v.default_value}` : `Enter ${v.label.toLowerCase()}...`}
                      className="w-full bg-[#111116] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500 transition font-sans"
                    />
                  </div>
                ))}
              </div>

              {/* Live Interpolated Preview Box */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5 font-semibold text-indigo-400 font-mono">
                    <Eye className="w-3.5 h-3.5" /> Live Interpolated Output Preview:
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">{interpolatedText.length} chars</span>
                </div>
                <div className="p-4 rounded-2xl bg-[#0a0a0c] border border-white/[0.08] text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                  {interpolatedText}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#16161e] border-t border-white/[0.08] flex items-center justify-between">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-white/[0.08] text-xs font-medium text-slate-400 hover:text-white hover:bg-white/[0.04] transition">
            Cancel
          </button>
          <button
            onClick={handleInject}
            disabled={!interpolatedText.trim()}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 text-white hover:from-indigo-500 hover:to-cyan-500 text-xs font-bold shadow-lg shadow-indigo-600/25 transition disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>Inject into Workspace</span>
          </button>
        </div>
      </div>
    </div>
  );
}
