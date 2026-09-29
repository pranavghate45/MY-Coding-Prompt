"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ThumbsUp, GitFork, Search, Sparkles, Plus, ArrowLeft, CheckCircle2, RefreshCw, X, Filter } from "lucide-react";
import { MarketplacePromptItem, MarketplaceListResponse } from "@/types/api";

const CATEGORIES = ["All", "Web Dev", "Academic", "System Design", "Marketing"];

export default function MarketplacePage() {
  const [prompts, setPrompts] = useState<MarketplacePromptItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("trending");
  const [search, setSearch] = useState("");
  const [publishOpen, setPublishOpen] = useState(false);
  const [forkStatus, setForkStatus] = useState<string | null>(null);

  // Publish Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [promptPayload, setPromptPayload] = useState("");
  const [pubCategory, setPubCategory] = useState("Web Dev");
  const [authorName, setAuthorName] = useState("");
  const [publishing, setPublishing] = useState(false);

  const fetchPrompts = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (category !== "All") queryParams.append("category", category);
      if (sort) queryParams.append("sort", sort);
      if (search.trim()) queryParams.append("query", search.trim());
      queryParams.append("user_id", "default_user");

      const res = await fetch(`http://127.0.0.1:8000/api/marketplace?${queryParams.toString()}`);
      if (res.ok) {
        const data: MarketplaceListResponse = await res.json();
        setPrompts(data.prompts || []);
      }
    } catch (err) {
      console.error("Failed to fetch marketplace prompts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrompts();
  }, [category, sort]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPrompts();
  };

  const handleUpvote = async (promptId: number) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/marketplace/${promptId}/upvote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: "default_user" }),
      });
      if (res.ok) {
        const data = await res.json();
        setPrompts((prev) =>
          prev.map((p) =>
            p.id === promptId
              ? { ...p, has_upvoted: data.upvoted, upvotes_count: data.upvotes_count }
              : p
          )
        );
      }
    } catch (err) {
      console.error("Failed to toggle upvote:", err);
    }
  };

  const handleFork = async (promptId: number, title: string) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/marketplace/${promptId}/fork`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: "default_user", project_id: 1 }),
      });
      if (res.ok) {
        const data = await res.json();
        setForkStatus(`Successfully forked "${title}" to your workspace!`);
        setPrompts((prev) =>
          prev.map((p) => (p.id === promptId ? { ...p, forks_count: data.forks_count } : p))
        );
        setTimeout(() => setForkStatus(null), 4000);
      }
    } catch (err) {
      console.error("Failed to fork prompt:", err);
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !promptPayload.trim()) return;

    setPublishing(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/marketplace/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          prompt_payload: promptPayload.trim(),
          category: pubCategory,
          author_name: authorName.trim() || "Anonymous Architect",
          author_id: "default_user",
        }),
      });

      if (res.ok) {
        setTitle("");
        setDescription("");
        setPromptPayload("");
        setPublishOpen(false);
        await fetchPrompts();
      }
    } catch (err) {
      console.error("Failed to publish prompt:", err);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-100 p-4 md:p-8 space-y-8 font-sans">
      {/* Top Navbar */}
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4 text-indigo-400" /> Back to Workspace
        </Link>

        <button
          onClick={() => setPublishOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/25 transition transform active:scale-95"
        >
          <Plus className="w-4 h-4" /> Publish Prompt
        </button>
      </div>

      {/* Hero Banner */}
      <div className="max-w-7xl mx-auto bg-[#111116] p-8 rounded-3xl border border-white/[0.08] shadow-2xl backdrop-blur-xl space-y-4">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-6 h-6 text-indigo-400 animate-pulse" />
          <h1 className="text-3xl font-extrabold text-white tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">Community Prompt Marketplace</h1>
        </div>
        <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
          Explore production-grade prompts shared by senior architects. Upvote your favorites and fork templates directly into your personal workspace with one click.
        </p>

        {/* Search & Filters */}
        <div className="pt-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-indigo-400" />
            <input
              type="text"
              placeholder="Search prompts by keyword, domain, or author..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#16161e] text-xs text-white placeholder-slate-500 pl-10 pr-4 py-2.5 rounded-xl border border-white/[0.08] outline-none focus:border-indigo-500 transition font-sans"
            />
          </form>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-xl transition whitespace-nowrap ${
                  category === cat
                    ? "bg-gradient-to-r from-indigo-600 to-cyan-600 text-white font-semibold shadow-md shadow-indigo-600/30"
                    : "bg-[#16161e] text-slate-400 hover:text-white border border-white/[0.08]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Fork Notification Banner */}
      {forkStatus && (
        <div className="max-w-7xl mx-auto p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-300 flex items-center gap-2 shadow-lg animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="font-medium">{forkStatus}</span>
        </div>
      )}

      {/* Grid of Prompt Cards */}
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
          <span>Showing {prompts.length} Community Prompts</span>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Sort by:</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="bg-[#16161e] text-xs text-slate-200 p-1.5 rounded-lg border border-white/[0.08] focus:outline-none font-sans"
            >
              <option value="trending">🔥 Trending</option>
              <option value="upvoted">👍 Most Upvoted</option>
              <option value="newest">⚡ Newest</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
            <span>Loading community prompts...</span>
          </div>
        ) : prompts.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500 bg-[#111116] rounded-2xl border border-white/[0.08] p-8">
            No prompts found in this category. Click &quot;Publish Prompt&quot; above to share the first template!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {prompts.map((p) => (
              <div
                key={p.id}
                className="bg-[#111116] border border-white/[0.08] rounded-3xl p-5 shadow-2xl flex flex-col justify-between hover:border-indigo-500/40 transition-all duration-200"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 rounded-full border border-indigo-500/20 font-mono">
                      {p.category}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">by {p.author_name}</span>
                  </div>

                  <h3 className="font-bold text-white text-base leading-snug line-clamp-1">{p.title}</h3>
                  {p.description && <p className="text-xs text-slate-400 line-clamp-2">{p.description}</p>}

                  <div className="bg-[#0a0a0c] p-3 rounded-2xl border border-white/[0.06] text-xs font-mono text-slate-300 line-clamp-3 leading-relaxed">
                    {p.prompt_payload}
                  </div>
                </div>

                {/* Footer Toolbar */}
                <div className="mt-5 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleUpvote(p.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium transition ${
                        p.has_upvoted
                          ? "bg-indigo-600 text-white font-semibold shadow-sm"
                          : "bg-[#16161e] text-slate-400 hover:text-white border border-white/[0.08]"
                      }`}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>{p.upvotes_count}</span>
                    </button>

                    <div className="flex items-center gap-1 text-xs text-slate-500 font-mono">
                      <GitFork className="w-3.5 h-3.5" />
                      <span>{p.forks_count} forks</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleFork(p.id, p.title)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 hover:text-white font-semibold text-xs rounded-xl border border-indigo-500/30 transition shadow-sm"
                  >
                    <GitFork className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Fork</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Publish Modal */}
      {publishOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">Share Prompt with Community</h3>
              <button onClick={() => setPublishOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePublish} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Title</label>
                <input
                  type="text"
                  placeholder="e.g. High-Performance Tokio Async Web Crawler"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 text-xs text-slate-100 p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
                  <select
                    value={pubCategory}
                    onChange={(e) => setPubCategory(e.target.value)}
                    className="w-full bg-slate-950 text-xs text-slate-100 p-2.5 rounded-xl border border-slate-800 focus:outline-none"
                  >
                    {CATEGORIES.filter((c) => c !== "All").map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Author Handle</label>
                  <input
                    type="text"
                    placeholder="e.g. Alex (Senior Architect)"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    className="w-full bg-slate-950 text-xs text-slate-100 p-2.5 rounded-xl border border-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="Short summary of what this prompt accomplishes..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 text-xs text-slate-100 p-2.5 rounded-xl border border-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Prompt Payload</label>
                <textarea
                  placeholder="Paste your system prompt, rules, and placeholders..."
                  value={promptPayload}
                  onChange={(e) => setPromptPayload(e.target.value)}
                  className="w-full h-32 bg-slate-950 text-xs text-slate-100 p-2.5 rounded-xl border border-slate-800 focus:outline-none font-mono resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPublishOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={publishing || !title.trim() || !promptPayload.trim()}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl disabled:opacity-50 flex items-center gap-2"
                >
                  {publishing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Publish Prompt</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
