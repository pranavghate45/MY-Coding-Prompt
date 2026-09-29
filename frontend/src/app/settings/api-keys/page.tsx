"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  Code,
  Download,
  Terminal,
  ShieldCheck,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";

interface ApiKeyItem {
  id: string;
  name: string;
  prefix: string;
  rate_limit_rpm: number;
  is_active: boolean;
  created_at: string;
  last_used_at?: string;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyName, setKeyName] = useState("");
  const [rateLimit, setRateLimit] = useState(60);
  const [creating, setCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<"curl" | "python" | "vscode">("curl");

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/developer/keys");
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys || []);
      }
    } catch (err) {
      console.error("Failed to load developer keys", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/developer/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: keyName.trim(), rate_limit_rpm: Number(rateLimit) }),
      });
      if (res.ok) {
        const data = await res.json();
        setCreatedKey(data.raw_key);
        setKeyName("");
        fetchKeys();
      }
    } catch (err) {
      console.error("Failed to create key", err);
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeKey = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this API key? Applications using it will immediately lose access.")) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/developer/keys/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setKeys(keys.filter((k) => k.id !== id));
      }
    } catch (err) {
      console.error("Failed to revoke key", err);
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    if (type === "key") {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else {
      setCopiedSnippet(type);
      setTimeout(() => setCopiedSnippet(null), 2000);
    }
  };

  const downloadGithubWorkflow = () => {
    const yamlContent = `name: Prompt Regression & Quality Linting

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]

jobs:
  prompt-lint:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v3

      - name: Run SuperPrompt Regression Suite
        env:
          SUPERPROMPT_API_KEY: \${{ secrets.SUPERPROMPT_API_KEY }}
        run: |
          curl -X POST "http://localhost:8000/v1/ci/evaluate-run" \\
            -H "Authorization: Bearer $SUPERPROMPT_API_KEY" \\
            -H "Content-Type: application/json" \\
            -d '{
              "prompt": "You are a senior tech lead. Produce clean, well-structured TypeScript code with comments.",
              "tests": [
                {
                  "input": "Write a binary search function",
                  "must_contain": ["function", "return"],
                  "must_not_contain": ["var ", "eval("]
                }
              ]
            }' > ci-report.json
          
          cat ci-report.json
          PASSED=$(jq '.passed' ci-report.json)
          if [ "$PASSED" != "true" ]; then
            echo "Prompt regression failed!"
            exit 1
          fi
`;
    const blob = new Blob([yamlContent], { type: "text/yaml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "prompt-lint.yml";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const activeKeySample = keys[0]?.prefix ? `${keys[0].prefix}••••••••` : "sp_live_xxxx";

  const getCodeSnippet = () => {
    switch (selectedLanguage) {
      case "curl":
        return `curl -X POST "http://localhost:8000/v1/prompt/optimize" \\
  -H "Authorization: Bearer ${activeKeySample}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "Write a python function to scrape financial data",
    "persona": "Architect",
    "framework": "CO-STAR"
  }'`;
      case "python":
        return `import requests

url = "http://localhost:8000/v1/prompt/optimize"
headers = {
    "Authorization": "Bearer ${activeKeySample}",
    "Content-Type": "application/json"
}
payload = {
    "prompt": "Write a python function to scrape financial data",
    "persona": "Architect",
    "framework": "CO-STAR"
}

response = requests.post(url, headers=headers, json=payload)
print(response.json())`;
      case "vscode":
        return `// VS Code settings.json
{
  "super-prompt.apiKey": "${activeKeySample}",
  "super-prompt.apiUrl": "http://localhost:8000/v1"
}`;
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 p-6 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/settings"
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-3">
                <Key className="w-7 h-7 text-indigo-400" />
                <span>Developer API & SDK Platform</span>
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Manage headless API access, key rate limits, VS Code integrations & CI/CD prompt linting.
              </p>
            </div>
          </div>
          <button
            onClick={downloadGithubWorkflow}
            className="flex items-center space-x-2 px-4 py-2.5 bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 rounded-xl hover:bg-indigo-600/30 transition text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            <span>Download GitHub Action Workflow</span>
          </button>
        </div>

        {/* Modal display when new API key is generated */}
        {createdKey && (
          <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/80 to-teal-950/80 border border-emerald-500/40 shadow-xl space-y-4">
            <div className="flex items-start space-x-3">
              <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-emerald-200">API Key Successfully Created!</h3>
                <p className="text-xs text-emerald-300/80 mt-1">
                  Copy your key now. For safety, it will <strong className="text-emerald-100 underline">never be shown again</strong>.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3 bg-slate-950/90 p-3 rounded-xl border border-emerald-500/30 font-mono text-sm text-emerald-400">
              <span className="truncate flex-1">{createdKey}</span>
              <button
                onClick={() => copyToClipboard(createdKey, "key")}
                className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 rounded-lg transition text-xs font-sans"
              >
                {copiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey ? "Copied" : "Copy Key"}</span>
              </button>
            </div>
            <button
              onClick={() => setCreatedKey(null)}
              className="text-xs text-emerald-400/80 hover:text-emerald-300 underline font-medium"
            >
              Done, I have stored it safely
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Key List & Creator */}
          <div className="lg:col-span-2 space-y-6">
            {/* Create Form */}
            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
              <h2 className="text-lg font-semibold text-slate-200 flex items-center space-x-2">
                <Plus className="w-5 h-5 text-indigo-400" />
                <span>Create New Developer API Key</span>
              </h2>
              <form onSubmit={handleCreateKey} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-medium text-slate-400">Key Description / Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Production VS Code Extension / CI Pipeline"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    className="w-full h-10 px-3.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-400">Rate Limit (RPM)</label>
                  <select
                    value={rateLimit}
                    onChange={(e) => setRateLimit(Number(e.target.value))}
                    className="w-full h-10 px-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value={60}>60 req/min (Standard)</option>
                    <option value={120}>120 req/min (Pro)</option>
                    <option value={300}>300 req/min (Enterprise)</option>
                  </select>
                </div>
                <div className="md:col-span-3 flex justify-end">
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition disabled:opacity-50 flex items-center space-x-2"
                  >
                    {creating ? (
                      <span>Generating...</span>
                    ) : (
                      <>
                        <Key className="w-4 h-4" />
                        <span>Generate Key</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Keys Table */}
            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-200">Active API Keys</h2>
                <span className="text-xs text-slate-400 font-mono">{keys.length} Keys Active</span>
              </div>

              {loading ? (
                <div className="py-8 text-center text-slate-500 text-sm">Loading keys...</div>
              ) : keys.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-slate-800 rounded-xl space-y-2">
                  <Key className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-slate-400 text-sm font-medium">No active API keys found</p>
                  <p className="text-slate-600 text-xs">Generate a key above to access Headless Endpoints & VS Code extensions.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400">
                        <th className="py-3 px-3">Name</th>
                        <th className="py-3 px-3">Prefix / Hash</th>
                        <th className="py-3 px-3">Rate Limit</th>
                        <th className="py-3 px-3">Created</th>
                        <th className="py-3 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-sm">
                      {keys.map((k) => (
                        <tr key={k.id} className="hover:bg-slate-800/30 transition">
                          <td className="py-3.5 px-3 font-medium text-slate-200">{k.name}</td>
                          <td className="py-3.5 px-3 font-mono text-xs text-indigo-300">
                            {k.prefix}••••••••
                          </td>
                          <td className="py-3.5 px-3 text-xs text-slate-400">{k.rate_limit_rpm} RPM</td>
                          <td className="py-3.5 px-3 text-xs text-slate-500">
                            {new Date(k.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-3 text-right">
                            <button
                              onClick={() => handleRevokeKey(k.id)}
                              className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                              title="Revoke Key"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Code Snippets & Quickstart */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
                  <Code className="w-4 h-4 text-indigo-400" />
                  <span>Headless Endpoint Quickstart</span>
                </h3>
                <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
                  {(["curl", "python", "vscode"] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setSelectedLanguage(lang)}
                      className={`px-2.5 py-1 rounded-md transition font-medium capitalize ${
                        selectedLanguage === lang
                          ? "bg-indigo-600 text-white"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative group">
                <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
                  {getCodeSnippet()}
                </pre>
                <button
                  onClick={() => copyToClipboard(getCodeSnippet(), "snippet")}
                  className="absolute top-3 right-3 p-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg transition text-xs flex items-center space-x-1"
                >
                  {copiedSnippet === "snippet" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-800/40 text-xs space-y-2">
                <p className="font-semibold text-indigo-300 flex items-center space-x-1.5">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Available Headless Endpoints</span>
                </p>
                <ul className="text-slate-400 space-y-1 font-mono text-[11px]">
                  <li><strong className="text-emerald-400">POST</strong> /v1/prompt/optimize</li>
                  <li><strong className="text-indigo-400">POST</strong> /v1/prompt/compress</li>
                  <li><strong className="text-amber-400">POST</strong> /v1/prompt/evaluate</li>
                  <li><strong className="text-rose-400">POST</strong> /v1/ci/evaluate-run</li>
                </ul>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 text-xs text-slate-400">
              <div className="flex items-center space-x-2 text-slate-200 font-semibold">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Security Guidelines</span>
              </div>
              <p>
                API keys possess high-level access to SuperPrompt optimization models. Never commit raw keys to git repositories. Use environment variables like <code className="text-indigo-300 bg-slate-950 px-1 py-0.5 rounded">SUPERPROMPT_API_KEY</code>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
