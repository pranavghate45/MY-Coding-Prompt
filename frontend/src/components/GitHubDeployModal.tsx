"use client";

import React, { useState } from "react";
import { Github, ExternalLink, Lock, Globe, Check, Loader2, Rocket, X, Code } from "lucide-react";
import { GitHubDeployResponse } from "@/types/api";

interface GitHubDeployModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRepoName?: string;
  promptText?: string;
  description?: string;
}

export function GitHubDeployModal({
  isOpen,
  onClose,
  defaultRepoName = "my-ai-saas-app",
  promptText = "",
  description = "Production AI App scaffolded via Super Prompt Studio",
}: GitHubDeployModalProps) {
  const [repoName, setRepoName] = useState(
    defaultRepoName.toLowerCase().replace(/[^a-z0-9-]/g, "-")
  );
  const [githubToken, setGithubToken] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GitHubDeployResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDeploy = async () => {
    if (!repoName.trim()) {
      setError("Repository name is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
      const res = await fetch(`${apiBase}/api/deploy/github`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo_name: repoName.trim(),
          github_token: githubToken.trim() || undefined,
          is_private: isPrivate,
          prompt_text: promptText,
          description: description,
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.detail || "Deployment failed");
      }

      const body: GitHubDeployResponse = await res.json();
      setResult(body);
    } catch (err: any) {
      setError(err.message || "Failed to deploy repository");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-slate-800 text-white border border-slate-700">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">1-Click GitHub Repository Creator</h3>
              <p className="text-xs text-slate-400">
                Scaffold production Next.js 16 starter code & 1-click Vercel Deployment Link.
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

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
          {!result ? (
            <>
              {error && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                  {error}
                </div>
              )}

              {/* Repo Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Repository Name</label>
                <input
                  type="text"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  placeholder="e.g. saas-prompt-starter"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                />
              </div>

              {/* GitHub Token (Optional / Masked) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">GitHub Access Token (Optional)</label>
                  <span className="text-[10px] text-slate-500">Unencrypted tokens are never stored</span>
                </div>
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxx (leave empty for test simulation)"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none font-mono"
                />
              </div>

              {/* Visibility Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center space-x-3">
                  {isPrivate ? <Lock className="w-4 h-4 text-amber-400" /> : <Globe className="w-4 h-4 text-emerald-400" />}
                  <div>
                    <p className="text-xs font-semibold text-white">
                      {isPrivate ? "Private Repository" : "Public Repository"}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {isPrivate ? "Only authorized GitHub users can access" : "Visible to all developers on GitHub"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPrivate(!isPrivate)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    isPrivate ? "bg-amber-500" : "bg-slate-700"
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      isPrivate ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <Code className="w-4 h-4" /> Files Included in Initial Commit:
                </p>
                <p className="text-[11px] text-slate-300 font-mono">
                  • README.md (with Markdown Super Prompt)<br />
                  • package.json (Next.js 16 + React 19)<br />
                  • src/app/page.tsx (Interactive Page Component)
                </p>
              </div>
            </>
          ) : (
            <div className="space-y-6 text-center py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6" />
              </div>

              <div>
                <h4 className="text-lg font-bold text-white">Repository Created Successfully!</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Scaffolded Next.js 16 starter code and committed super prompt specs.
                </p>
              </div>

              {/* Action Badge & Links */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 font-mono">GitHub Repo URL:</span>
                  <a
                    href={result.repo_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    {result.repo_name} <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="pt-2">
                  <a
                    href={result.vercel_deploy_url}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-3 px-6 rounded-xl bg-black hover:bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xl border border-white/20 transition"
                  >
                    <Rocket className="w-4 h-4 text-emerald-400" />
                    <span>Deploy 1-Click to Vercel</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
          >
            {result ? "Done" : "Cancel"}
          </button>

          {!result && (
            <button
              disabled={loading}
              onClick={handleDeploy}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Scaffolding Repo...
                </>
              ) : (
                <>
                  <Github className="w-4 h-4" /> Create & Commit Repo
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
