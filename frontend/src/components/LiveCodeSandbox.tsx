"use client";

import React, { useState, useMemo } from "react";
import { Monitor, Tablet, Smartphone, RefreshCw, Copy, Check, X, Play, Code } from "lucide-react";

interface LiveCodeSandboxProps {
  code: string;
  isOpen: boolean;
  onClose: () => void;
}

export function LiveCodeSandbox({ code, isOpen, onClose }: LiveCodeSandboxProps) {
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [copied, setCopied] = useState(false);
  const [key, setKey] = useState(0); // Force iframe refresh

  // Safely construct HTML document payload for sandboxed iframe srcdoc
  const srcDocPayload = useMemo(() => {
    const rawCode = code.trim();

    // Check if full HTML document already
    if (rawCode.toLowerCase().includes("<html") || rawCode.toLowerCase().includes("<!doctype html")) {
      return rawCode;
    }

    // Wrap snippet into styled HTML document with Tailwind CSS
    return `<!DOCTYPE html>
<html lang="en" class="h-full">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body {
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      padding: 1rem;
      background-color: #090d16;
      color: #f1f5f9;
      min-height: 100vh;
    }
  </style>
</head>
<body>
  ${rawCode}
</body>
</html>`;
  }, [code]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-2 md:p-6">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-6xl h-[90vh] shadow-2xl overflow-hidden flex flex-col">
        {/* Top Controls Bar */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Play className="w-5 h-5 fill-purple-400" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Live Sandbox Preview</h3>
              <p className="text-xs text-slate-400 font-mono">Isolated Frame: sandbox="allow-scripts"</p>
            </div>
          </div>

          {/* Viewport Toggles */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewport("desktop")}
              className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition ${
                viewport === "desktop" ? "bg-purple-600 text-white font-semibold shadow-sm" : "text-slate-400 hover:text-white"
              }`}
              title="Desktop Viewport (100%)"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Desktop</span>
            </button>
            <button
              onClick={() => setViewport("tablet")}
              className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition ${
                viewport === "tablet" ? "bg-purple-600 text-white font-semibold shadow-sm" : "text-slate-400 hover:text-white"
              }`}
              title="Tablet Viewport (768px)"
            >
              <Tablet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">768px</span>
            </button>
            <button
              onClick={() => setViewport("mobile")}
              className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition ${
                viewport === "mobile" ? "bg-purple-600 text-white font-semibold shadow-sm" : "text-slate-400 hover:text-white"
              }`}
              title="Mobile Viewport (375px)"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">375px</span>
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setKey((k) => k + 1)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Refresh Preview"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleCopy}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Copy Rendered Code"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sandboxed Canvas Container */}
        <div className="flex-1 bg-slate-950 flex items-center justify-center p-4 overflow-auto">
          <div
            className={`h-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 ${
              viewport === "mobile"
                ? "w-[375px]"
                : viewport === "tablet"
                ? "w-[768px]"
                : "w-full"
            }`}
          >
            <iframe
              key={key}
              srcDoc={srcDocPayload}
              title="Live Code Sandbox"
              sandbox="allow-scripts"
              className="w-full h-full border-0 bg-[#090d16]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
