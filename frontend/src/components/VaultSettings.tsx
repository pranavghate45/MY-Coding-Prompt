"use client";

import React, { useState, useEffect } from "react";
import { Key, ShieldCheck, Trash2, Plus, Lock, CheckCircle, RefreshCw, X } from "lucide-react";
import { UserApiKeyItem } from "../types/api";

interface VaultSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VaultSettings({ isOpen, onClose }: VaultSettingsProps) {
  const [keys, setKeys] = useState<UserApiKeyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState("openai");
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/vault/keys?user_id=default_user");
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys || []);
      }
    } catch (err) {
      console.error("Failed to fetch vault keys:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchKeys();
    }
  }, [isOpen]);

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) return;

    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/vault/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          api_key: apiKey.trim(),
          user_id: "default_user",
        }),
      });

      if (res.ok) {
        setApiKey("");
        setStatusMsg(`Successfully stored encrypted key for ${provider.toUpperCase()}`);
        await fetchKeys();
      } else {
        const err = await res.json().catch(() => ({}));
        setStatusMsg(err.detail || "Failed to save key");
      }
    } catch (err) {
      setStatusMsg("Failed to connect to vault API");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteKey = async (prov: string) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/vault/keys/${prov}?user_id=default_user`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchKeys();
      }
    } catch (err) {
      console.error("Failed to delete key:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">BYOK Encrypted Key Vault</h3>
              <p className="text-xs text-slate-400">Keys encrypted with AES-128/256 Fernet</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-6 overflow-y-auto max-h-[80vh]">
          {/* Add Key Form */}
          <form onSubmit={handleSaveKey} className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-4">
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Key className="w-4 h-4 text-purple-400" /> Store Custom Provider Key
            </div>

            <div className="grid grid-cols-3 gap-2">
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="bg-slate-900 text-xs text-purple-300 font-semibold p-2.5 rounded-lg border border-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value="openai">OpenAI</option>
                <option value="groq">Groq</option>
                <option value="anthropic">Anthropic</option>
                <option value="huggingface">HuggingFace</option>
              </select>

              <input
                type="password"
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="col-span-2 bg-slate-900 text-xs text-slate-100 placeholder-slate-500 p-2.5 rounded-lg border border-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={saving || !apiKey.trim()}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium text-xs rounded-lg transition"
            >
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>Save Encrypted Key</span>
            </button>

            {statusMsg && (
              <div className="p-2.5 bg-purple-500/10 border border-purple-500/30 rounded-lg text-xs text-purple-300 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{statusMsg}</span>
              </div>
            )}
          </form>

          {/* Configured Keys List */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
              <span>Configured Vault Keys</span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                AES Encrypted
              </span>
            </div>

            {loading ? (
              <div className="py-6 text-center text-xs text-slate-500">Loading configured keys...</div>
            ) : keys.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800/60 p-4">
                No custom keys stored yet. Add a custom API key above to prioritize your personal quota.
              </div>
            ) : (
              <div className="space-y-2">
                {keys.map((k) => (
                  <div
                    key={k.id}
                    className="flex items-center justify-between p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <div>
                        <span className="font-bold text-white uppercase">{k.provider}</span>
                        <div className="text-[11px] font-mono text-slate-400">{k.masked_key}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteKey(k.provider)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-900 transition"
                      title="Delete stored key"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Zero-Knowledge Plaintext Policy</span>
          <span className="text-slate-500">Master Key Enabled</span>
        </div>
      </div>
    </div>
  );
}
