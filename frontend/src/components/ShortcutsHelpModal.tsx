"use client";

import React from "react";
import { Command, X, Keyboard } from "lucide-react";

export interface ShortcutsHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutGroup {
  category: string;
  items: { keyCombo: string; description: string }[];
}

export function ShortcutsHelpModal({ isOpen, onClose }: ShortcutsHelpModalProps) {
  if (!isOpen) return null;

  const shortcutGroups: ShortcutGroup[] = [
    {
      category: "Global & Navigation",
      items: [
        { keyCombo: "⌘ K / Ctrl K", description: "Open Command Palette (Search, Navigation, Models)" },
        { keyCombo: "?", description: "Toggle Keyboard Shortcuts Cheat Sheet (when not in input)" },
        { keyCombo: "Esc", description: "Close active modals, drawers, or cancel streaming" },
      ],
    },
    {
      category: "Prompt Generation & Editing",
      items: [
        { keyCombo: "⌘ Enter / Ctrl Enter", description: "Submit prompt composer and trigger SSE stream" },
        { keyCombo: "⌘ Shift C / Ctrl Shift C", description: "Quick-copy latest AI response to clipboard" },
        { keyCombo: "⌘ B / Ctrl B", description: "Toggle Live Sandbox code preview panel" },
        { keyCombo: "⌘ L / Ctrl L", description: "Run automated Prompt Linter check" },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4">
      <div className="w-full max-w-xl bg-[#111116] border border-white/[0.12] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#16161e]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Keyboard Shortcuts</h3>
              <p className="text-xs text-slate-400">Power-user hotkey bindings across Super Prompt</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {shortcutGroups.map((group) => (
            <div key={group.category} className="space-y-3">
              <h4 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider font-mono">
                {group.category}
              </h4>
              <div className="space-y-2">
                {group.items.map((item) => (
                  <div
                    key={item.keyCombo}
                    className="flex items-center justify-between p-3 rounded-2xl bg-[#16161e] border border-white/[0.06]"
                  >
                    <span className="text-xs text-slate-200 font-medium">{item.description}</span>
                    <kbd className="px-2.5 py-1 text-xs font-mono font-semibold text-indigo-300 bg-indigo-500/10 border border-indigo-500/30 rounded-xl shadow-inner shrink-0">
                      {item.keyCombo}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#16161e] border-t border-white/[0.08] flex items-center justify-between text-xs text-slate-500">
          <span>Press ESC or click close to dismiss</span>
          <span className="font-mono text-indigo-400">Super Prompt DX</span>
        </div>
      </div>
    </div>
  );
}
