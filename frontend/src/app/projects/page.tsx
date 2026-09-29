"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FolderKanban,
  Search,
  Sparkles,
  Star,
  Trash2,
  Copy,
  ExternalLink,
  Plus,
  ArrowRight,
  Filter,
  Check,
  Bot,
  Stethoscope,
  Swords,
  Layers,
  Code2,
  Clock,
  Download,
  CopyCheck,
  Zap,
  ChevronRight,
  X,
  FileText,
  Scissors,
  Github
} from "lucide-react";
import { PromptCompressorModal } from "@/components/PromptCompressorModal";
import { GitHubDeployModal } from "@/components/GitHubDeployModal";

import { useAuth } from "@/components/auth-provider";
import { UniversalProject, PromptType, PersonaType } from "@/types/api";
import {
  fetchUniversalProjects,
  patchUniversalProject,
  deleteUniversalProject,
  duplicateUniversalProject
} from "@/lib/projectStore";

export default function ProjectsPage() {
  const router = useRouter();
  const { isAuthenticated, isReady } = useAuth();

  const [projects, setProjects] = useState<UniversalProject[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Sorting state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<PromptType | "all" | "starred">("all");
  const [sortBy, setSortBy] = useState<"newest" | "tokens" | "alphabetical">("newest");

  // Selected project inspect modal
  const [activeProject, setActiveProject] = useState<UniversalProject | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Compressor & GitHub Deploy Modals
  const [compressorOpen, setCompressorOpen] = useState(false);
  const [compressorText, setCompressorText] = useState("");

  const [githubOpen, setGithubOpen] = useState(false);
  const [githubRepoName, setGithubRepoName] = useState("");
  const [githubPromptText, setGithubPromptText] = useState("");

  const handleOpenCompressor = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    setCompressorText(text);
    setCompressorOpen(true);
  };

  const handleOpenGitHub = (e: React.MouseEvent, title: string, text: string) => {
    e.stopPropagation();
    setGithubRepoName(title.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
    setGithubPromptText(text);
    setGithubOpen(true);
  };


  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isReady, router]);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const data = await fetchUniversalProjects();
      setProjects(data);
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProjects();
  }, []);

  // Sync event listener for auto-saved projects
  useEffect(() => {
    const handleSaved = (e: Event) => {
      const detail = (e as CustomEvent).detail as { project?: UniversalProject };
      if (detail?.project) {
        setProjects((prev) => {
          const exists = prev.some((p) => p.id === detail.project?.id);
          if (exists) {
            return prev.map((p) => (p.id === detail.project?.id ? detail.project! : p));
          }
          return [detail.project!, ...prev];
        });
      }
    };

    const handleDeleted = (e: Event) => {
      const detail = (e as CustomEvent).detail as { id?: string };
      if (detail?.id) {
        setProjects((prev) => prev.filter((p) => p.id !== detail.id));
      }
    };

    window.addEventListener("my-prompt:universal-project-saved", handleSaved as EventListener);
    window.addEventListener("my-prompt:universal-project-deleted", handleDeleted as EventListener);
    return () => {
      window.removeEventListener("my-prompt:universal-project-saved", handleSaved as EventListener);
      window.removeEventListener("my-prompt:universal-project-deleted", handleDeleted as EventListener);
    };
  }, []);

  // Filtered & Sorted Projects
  const filteredProjects = useMemo(() => {
    return projects
      .filter((proj) => {
        // Category Filter
        if (selectedType === "starred") {
          if (!proj.is_favorite) return false;
        } else if (selectedType !== "all") {
          if (proj.prompt_type !== selectedType) return false;
        }

        // Search Filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesTitle = proj.title?.toLowerCase().includes(q);
          const matchesPrompt = proj.generated_super_prompt?.toLowerCase().includes(q);
          const matchesInput = proj.raw_input?.toLowerCase().includes(q);
          const matchesModel = proj.target_model?.toLowerCase().includes(q);
          if (!matchesTitle && !matchesPrompt && !matchesInput && !matchesModel) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "alphabetical") {
          return (a.title || "").localeCompare(b.title || "");
        }
        if (sortBy === "tokens") {
          return (b.tokens_count || 0) - (a.tokens_count || 0);
        }
        // default newest
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [projects, selectedType, searchQuery, sortBy]);

  // Statistics
  const stats = useMemo(() => {
    const total = projects.length;
    const starred = projects.filter((p) => p.is_favorite).length;
    const totalTokens = projects.reduce((acc, p) => acc + (p.tokens_count || 0), 0);
    return { total, starred, totalTokens };
  }, [projects]);

  const handleToggleFavorite = async (e: React.MouseEvent, proj: UniversalProject) => {
    e.stopPropagation();
    const updated = await patchUniversalProject(proj.id, { is_favorite: !proj.is_favorite });
    if (updated) {
      setProjects((prev) => prev.map((p) => (p.id === proj.id ? updated : p)));
      showToast(updated.is_favorite ? "Starred project ⭐" : "Unstarred project");
    }
  };

  const handleCopyPrompt = async (e: React.MouseEvent, proj: UniversalProject) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(proj.generated_super_prompt);
      setCopiedId(proj.id);
      showToast("Super Prompt copied to clipboard! 📋");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      showToast("Failed to copy text");
    }
  };

  const handleDuplicate = async (e: React.MouseEvent, proj: UniversalProject) => {
    e.stopPropagation();
    const duplicated = await duplicateUniversalProject(proj.id);
    if (duplicated) {
      setProjects((prev) => [duplicated, ...prev]);
      showToast("Duplicated project!");
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this project?")) return;
    const ok = await deleteUniversalProject(id);
    if (ok) {
      setProjects((prev) => prev.filter((p) => p.id !== id));
      if (activeProject?.id === id) setActiveProject(null);
      showToast("Project deleted");
    }
  };

  const handleOpenInWorkspace = (e: React.MouseEvent, proj: UniversalProject) => {
    e.stopPropagation();
    try {
      window.dispatchEvent(
        new CustomEvent("my-prompt:load-chat", {
          detail: {
            prompt: proj.raw_input || proj.title,
            response: proj.generated_super_prompt,
            messages: [
              { role: "user", content: proj.raw_input || proj.title },
              { role: "assistant", content: proj.generated_super_prompt },
            ],
          },
        })
      );
      router.push("/");
    } catch {
      router.push("/");
    }
  };

  const handleExportZip = (e: React.MouseEvent, proj: UniversalProject) => {
    e.stopPropagation();
    const blob = new Blob([proj.generated_super_prompt], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${proj.title.toLowerCase().replace(/[^a-z0-9]/g, "_")}_super_prompt.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Exported Markdown prompt file! 📥");
  };

  const getSourceIcon = (type: PromptType) => {
    switch (type) {
      case "website_wizard":
        return <Layers className="w-4 h-4 text-purple-400" />;
      case "prompt_doctor":
        return <Stethoscope className="w-4 h-4 text-teal-400" />;
      case "arena_battle":
        return <Swords className="w-4 h-4 text-amber-400" />;
      case "vision_ui":
        return <Code2 className="w-4 h-4 text-emerald-400" />;
      default:
        return <Bot className="w-4 h-4 text-indigo-400" />;
    }
  };

  const getSourceLabel = (type: PromptType) => {
    switch (type) {
      case "website_wizard":
        return "Website Wizard";
      case "prompt_doctor":
        return "Prompt Doctor";
      case "arena_battle":
        return "Prompt Arena";
      case "vision_ui":
        return "Vision UI";
      default:
        return "Chat Workspace";
    }
  };

  if (!isReady || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-slate-400 text-sm">
        Loading Universal Projects Hub...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-indigo-600 text-white px-4 py-2.5 rounded-xl shadow-2xl font-medium text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <Sparkles className="w-4 h-4" /> {toastMessage}
        </div>
      )}

      {/* Header Section */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-900/90 border border-slate-800 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
              <FolderKanban className="w-3.5 h-3.5" /> Centralized Prompt Repository
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Universal Projects Hub
            </h1>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              Every synthesized prompt across Chat, Website Wizards, Prompt Doctor, and Arena battles is automatically cataloged, filterable, and ready to fork.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all"
            >
              <Plus className="w-4 h-4" /> New Super Prompt
            </Link>
            <Link
              href="/prompt-generator"
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-2 transition-all border border-slate-700"
            >
              <Sparkles className="w-4 h-4 text-indigo-400" /> Website Wizard
            </Link>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-8 pt-6 border-t border-slate-800/80">
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Total Prompts</p>
              <p className="text-2xl font-black text-white mt-1">{stats.total}</p>
            </div>
            <FolderKanban className="w-6 h-6 text-indigo-400" />
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Starred ⭐</p>
              <p className="text-2xl font-black text-amber-400 mt-1">{stats.starred}</p>
            </div>
            <Star className="w-6 h-6 text-amber-400 fill-amber-400/20" />
          </div>

          <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Total Synthesized Tokens</p>
              <p className="text-2xl font-black text-emerald-400 mt-1">{stats.totalTokens.toLocaleString()}</p>
            </div>
            <Zap className="w-6 h-6 text-emerald-400" />
          </div>
        </div>
      </section>

      {/* Filter & Search Toolbar */}
      <section className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search prompts by title, keyword, model, or raw input..."
            className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Pills & Sorting */}
        <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs font-medium">
            {[
              { id: "all", label: "All" },
              { id: "workspace_chat", label: "Chat" },
              { id: "website_wizard", label: "Wizards" },
              { id: "prompt_doctor", label: "Doctor" },
              { id: "arena_battle", label: "Arena" },
              { id: "starred", label: "⭐ Starred" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedType(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  selectedType === tab.id
                    ? "bg-indigo-600 text-white shadow-md font-semibold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-slate-950/80 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none"
          >
            <option value="newest">Newest First</option>
            <option value="tokens">Highest Tokens</option>
            <option value="alphabetical">Alphabetical</option>
          </select>
        </div>
      </section>

      {/* Projects Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 text-sm">
          Loading cataloged projects...
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/30 p-12 text-center flex flex-col items-center justify-center space-y-4">
          <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <FileText className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">No Prompts Found</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              {searchQuery || selectedType !== "all"
                ? "No saved prompts match your filter criteria. Try clearing search filters."
                : "You haven't generated any super-prompts yet. Use Chat, Website Wizard, or Prompt Doctor to synthesize your first prompt!"}
            </p>
          </div>
          <Link
            href="/"
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition shadow-lg shadow-indigo-500/20"
          >
            Generate First Super-Prompt 🚀
          </Link>
        </div>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProjects.map((proj) => (
            <article
              key={proj.id}
              onClick={() => setActiveProject(proj)}
              className="group relative rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-indigo-500/50 p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/5 cursor-pointer"
            >
              {/* Card Header */}
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-slate-800 border border-slate-700/60">
                      {getSourceIcon(proj.prompt_type)}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      {getSourceLabel(proj.prompt_type)}
                    </span>
                  </div>

                  <button
                    onClick={(e) => handleToggleFavorite(e, proj)}
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-amber-400 transition"
                  >
                    <Star
                      className={`w-4 h-4 ${
                        proj.is_favorite ? "text-amber-400 fill-amber-400" : ""
                      }`}
                    />
                  </button>
                </div>

                <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                  {proj.title}
                </h3>

                {/* Metadata Badges */}
                <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                  <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700/50">
                    {proj.persona}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                    {proj.target_model}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    ~{proj.tokens_count} tokens
                  </span>
                </div>

                {/* Prompt Preview Snippet */}
                <p className="mt-4 text-xs text-slate-400 line-clamp-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 font-mono leading-relaxed">
                  {proj.generated_super_prompt}
                </p>
              </div>

              {/* Card Footer Actions */}
              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{new Date(proj.created_at).toLocaleDateString()}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={(e) => handleOpenCompressor(e, proj.generated_super_prompt)}
                    title="Compress Prompt (Cost Cutter)"
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-emerald-400 transition"
                  >
                    <Scissors className="w-4 h-4 text-emerald-400/80" />
                  </button>

                  <button
                    onClick={(e) => handleOpenGitHub(e, proj.title, proj.generated_super_prompt)}
                    title="1-Click Push to GitHub Repo & Deploy Vercel"
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
                  >
                    <Github className="w-4 h-4" />
                  </button>

                  <button
                    onClick={(e) => handleCopyPrompt(e, proj)}
                    title="Copy Super Prompt"
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
                  >
                    {copiedId === proj.id ? (
                      <CopyCheck className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    onClick={(e) => handleOpenInWorkspace(e, proj)}
                    title="Open in Workspace"
                    className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white font-medium text-xs flex items-center gap-1 transition"
                  >
                    <span>Restore</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={(e) => handleDelete(e, proj.id)}
                    title="Delete Prompt"
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      {/* Inspect & Detail Drawer Modal */}
      {activeProject && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  {getSourceIcon(activeProject.prompt_type)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white line-clamp-1">{activeProject.title}</h3>
                  <p className="text-xs text-slate-400 flex items-center gap-2">
                    <span>{getSourceLabel(activeProject.prompt_type)}</span>
                    <span>•</span>
                    <span>{new Date(activeProject.created_at).toLocaleString()}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveProject(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
              {/* Telemetry Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Persona</span>
                  <span className="font-semibold text-slate-200">{activeProject.persona}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Model</span>
                  <span className="font-semibold text-indigo-300">{activeProject.target_model}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Framework</span>
                  <span className="font-semibold text-purple-300">{activeProject.framework}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Tokens</span>
                  <span className="font-semibold text-emerald-400">~{activeProject.tokens_count}</span>
                </div>
              </div>

              {/* Raw Input */}
              {activeProject.raw_input && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Raw Input / Query</h4>
                  <p className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300">
                    {activeProject.raw_input}
                  </p>
                </div>
              )}

              {/* Generated Super Prompt */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                    Synthesized Super Prompt
                  </h4>
                  <button
                    onClick={(e) => handleCopyPrompt(e, activeProject)}
                    className="text-xs text-indigo-300 hover:text-indigo-200 flex items-center gap-1 font-medium"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy Prompt
                  </button>
                </div>
                <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto select-all">
                  {activeProject.generated_super_prompt}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between gap-3">
              <button
                onClick={(e) => handleExportZip(e, activeProject)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs flex items-center gap-1.5 transition border border-slate-700"
              >
                <Download className="w-3.5 h-3.5" /> Export Markdown
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => handleDuplicate(e, activeProject)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs transition border border-slate-700"
                >
                  Duplicate
                </button>
                <button
                  onClick={(e) => handleOpenInWorkspace(e, activeProject)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow-lg shadow-indigo-500/20"
                >
                  <span>Open in Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Prompt Token Compressor Modal */}
      <PromptCompressorModal
        isOpen={compressorOpen}
        onClose={() => setCompressorOpen(false)}
        initialPrompt={compressorText}
        onApplyCompressed={(compressed) => {
          showToast("Applied compressed prompt!");
        }}
      />

      {/* 1-Click GitHub Repo Creator Modal */}
      <GitHubDeployModal
        isOpen={githubOpen}
        onClose={() => setGithubOpen(false)}
        defaultRepoName={githubRepoName}
        promptText={githubPromptText}
      />
    </div>
  );
}
