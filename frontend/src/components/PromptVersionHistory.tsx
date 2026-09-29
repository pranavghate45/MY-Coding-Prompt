"use client";

import React, { useState, useEffect } from "react";
import { GitCommit, History, RotateCcw, Plus, CheckCircle, Clock, FileText, ChevronRight, RefreshCw, X } from "lucide-react";
import { PromptVersionItem, PromptVersionsResponse, RollbackVersionResponse } from "../types/api";

interface PromptVersionHistoryProps {
  projectId: number;
  currentPromptText?: string;
  onRollbackSuccess?: (restoredPromptText: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function PromptVersionHistory({
  projectId,
  currentPromptText = "",
  onRollbackSuccess,
  isOpen,
  onClose,
}: PromptVersionHistoryProps) {
  const [versions, setVersions] = useState<PromptVersionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [commitLoading, setCommitLoading] = useState(false);
  const [rollbackLoading, setRollbackLoading] = useState<number | null>(null);
  const [changeSummary, setChangeSummary] = useState("");
  const [selectedVersion, setSelectedVersion] = useState<PromptVersionItem | null>(null);

  const fetchVersions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/prompts/${projectId}/versions`);
      if (res.ok) {
        const data: PromptVersionsResponse = await res.json();
        setVersions(data.versions || []);
        if (data.versions && data.versions.length > 0) {
          const active = data.versions.find((v) => v.is_selected) || data.versions[0];
          setSelectedVersion(active);
        }
      }
    } catch (err) {
      console.error("Failed to fetch prompt version history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && projectId) {
      fetchVersions();
    }
  }, [isOpen, projectId]);

  const handleCommitSnapshot = async () => {
    if (!currentPromptText.trim()) return;

    setCommitLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/prompts/${projectId}/commit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt_text: currentPromptText.trim(),
          change_summary: changeSummary.trim() || "Manual snapshot commit",
          title: `Snapshot v${versions.length + 1}`,
        }),
      });

      if (res.ok) {
        setChangeSummary("");
        await fetchVersions();
      }
    } catch (err) {
      console.error("Failed to commit prompt snapshot:", err);
    } finally {
      setCommitLoading(false);
    }
  };

  const handleRollback = async (versionId: number) => {
    setRollbackLoading(versionId);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/prompts/${projectId}/rollback/${versionId}`, {
        method: "POST",
      });

      if (res.ok) {
        const data: RollbackVersionResponse = await res.json();
        if (onRollbackSuccess && data.restored_version?.prompt_text) {
          onRollbackSuccess(data.restored_version.prompt_text);
        }
        await fetchVersions();
      }
    } catch (err) {
      console.error("Failed to execute rollback:", err);
    } finally {
      setRollbackLoading(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-slate-950 border-l border-slate-800 shadow-2xl z-50 flex flex-col justify-between">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-purple-400" />
          <h3 className="font-bold text-white text-base">Prompt Version Control</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Commit New Snapshot Form */}
        <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <GitCommit className="w-4 h-4 text-purple-400" /> Create Commit Snapshot
            </span>
            <span className="text-[10px] font-mono bg-purple-950/80 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30">
              Project #{projectId}
            </span>
          </div>

          <input
            type="text"
            placeholder="Commit message (e.g. Added error handling directives)..."
            value={changeSummary}
            onChange={(e) => setChangeSummary(e.target.value)}
            className="w-full bg-slate-950 text-xs text-slate-200 placeholder-slate-500 rounded-lg p-2.5 border border-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />

          <button
            onClick={handleCommitSnapshot}
            disabled={commitLoading || !currentPromptText.trim()}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium text-xs rounded-lg transition"
          >
            {commitLoading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            <span>Commit Active Prompt Snapshot</span>
          </button>
        </div>

        {/* Timeline Version List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium px-1">
            <span>Commit History Timeline</span>
            <button onClick={fetchVersions} className="hover:text-purple-400 transition">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {loading && versions.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">Loading version commits...</div>
          ) : versions.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800/60 p-4">
              No commit snapshots saved yet. Click commit above to create version v1.
            </div>
          ) : (
            <div className="space-y-2 relative border-l-2 border-slate-800 ml-3 pl-4">
              {versions.map((ver) => {
                const isCurrent = ver.is_selected;
                const isInspected = selectedVersion?.id === ver.id;

                return (
                  <div
                    key={ver.id}
                    onClick={() => setSelectedVersion(ver)}
                    className={`relative p-3.5 rounded-xl border transition cursor-pointer ${
                      isInspected
                        ? "bg-slate-900 border-purple-500/50 shadow-md"
                        : "bg-slate-900/50 border-slate-800/80 hover:bg-slate-900/80"
                    }`}
                  >
                    {/* Timeline Node Icon */}
                    <div
                      className={`absolute -left-[23px] top-4 w-3 h-3 rounded-full border-2 border-slate-950 ${
                        isCurrent ? "bg-emerald-400 ring-2 ring-emerald-400/30" : "bg-purple-500"
                      }`}
                    />

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-white">v{ver.version_number}</span>
                        {isCurrent && (
                          <span className="px-1.5 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-300 rounded font-medium border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Active
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(ver.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 font-medium mt-1.5 line-clamp-1">
                      {ver.change_summary}
                    </p>

                    <div className="text-[11px] text-slate-500 font-mono mt-1 line-clamp-2 bg-slate-950/60 p-1.5 rounded border border-slate-900">
                      {ver.prompt_text}
                    </div>

                    {/* Action buttons */}
                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-800/60">
                      <span className="text-[10px] text-slate-500 font-mono">ID #{ver.id}</span>
                      {!isCurrent && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRollback(ver.id);
                          }}
                          disabled={rollbackLoading === ver.id}
                          className="flex items-center gap-1 text-[11px] font-semibold text-purple-400 hover:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 px-2.5 py-1 rounded-lg border border-purple-500/30 transition"
                        >
                          {rollbackLoading === ver.id ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <RotateCcw className="w-3 h-3" />
                          )}
                          <span>Rollback to v{ver.version_number}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/90 text-xs text-slate-400 flex items-center justify-between">
        <span>Git-style prompt snapshots</span>
        <span className="font-mono text-purple-400">{versions.length} versions stored</span>
      </div>
    </div>
  );
}
