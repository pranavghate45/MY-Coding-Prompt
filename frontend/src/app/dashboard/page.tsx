"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, ChevronDown, FolderKanban, FolderPlus, Plus, Sparkles, Star } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { projectItems } from "@/lib/mock-data";
import type { WebsiteProProject } from "@/lib/website-pro-store";

type DeveloperType = "frontend" | "backend" | "full_stack";

type DashboardProject = {
  id: string;
  title: string;
  prompts: number;
  updatedLabel: string;
  status: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, isReady, user } = useAuth();
  const [developerType, setDeveloperType] = useState<DeveloperType | "">("");
  const [projects, setProjects] = useState<WebsiteProProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [projectUsage, setProjectUsage] = useState<{ used: number; limit: number } | null>(null);

  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isReady, router]);

  useEffect(() => {
    const loadProjects = async () => {
      if (!isAuthenticated) return;
      setLoadingProjects(true);
      try {
        const response = await fetch("/api/website-pro/projects", { cache: "no-store" });
        if (!response.ok) return;

        const data = (await response.json()) as { projects?: WebsiteProProject[] };
        if (Array.isArray(data.projects)) {
          setProjects(data.projects);
        }
      } finally {
        setLoadingProjects(false);
      }
    };

    void loadProjects();

    const loadUsage = async () => {
      if (!isAuthenticated) return;
      try {
        const res = await fetch('/api/website-pro/projects/usage');
        if (!res.ok) return;
        const js = await res.json();
        setProjectUsage({ used: js.used || 0, limit: js.limit || 0 });
      } catch {}
    };

    void loadUsage();
  }, [isAuthenticated]);

  const normalizedProjects = useMemo<DashboardProject[]>(() => {
    if (projects.length > 0) {
      return projects.slice(0, 3).map((project) => ({
        id: project.id,
        title: (project.goal?.split("\n")[0] || project.siteType || project.id).trim(),
        prompts: project.plan?.length || 0,
        updatedLabel: project.updatedAt ? "Just now" : "Recently",
        status: "Active",
      }));
    }

    return projectItems.slice(0, 3).map((project) => ({
      id: project.id,
      title: project.name,
      prompts: project.category === "Web" ? 12 : 8,
      updatedLabel: project.updatedAt,
      status: project.status,
    }));
  }, [projects]);

  const totalProjects = projects.length > 0 ? projects.length : 12;
  const promptsGenerated = projects.reduce((total, project) => total + (project.plan?.length || 0), 0) || 156;
  const thisMonth = projects.length > 0 ? Math.max(1, projects.filter((project) => !project.updatedAt || project.updatedAt === project.createdAt).length) : 28;
  const developerTypeLabel =
    developerType === "frontend"
      ? "Frontend Developer"
      : developerType === "backend"
        ? "Backend Developer"
        : developerType === "full_stack"
          ? "Full Stack Developer"
          : "Not selected yet";

  if (!isReady || !isAuthenticated) {
    return <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 text-sm text-[var(--app-muted)]">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Welcome Banner */}
      <section className="rounded-3xl border border-white/[0.08] bg-[#111116] p-6 shadow-2xl backdrop-blur-xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400 font-mono">Overview Dashboard</p>
        <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
          Welcome back, {user?.name || "Architect"} 👋
        </h2>
        <p className="mt-1 text-xs text-slate-400">Here&apos;s real-time telemetry and telemetry from your AI prompt projects today.</p>

        {/* CTA Hero Card */}
        <div className="mt-6 rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-900/60 via-indigo-800/40 to-cyan-900/60 p-6 text-white shadow-xl shadow-indigo-600/10 backdrop-blur-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-lg font-bold">Ready to architect your next prompt?</p>
              <p className="mt-1 text-xs text-slate-300">Stream real-time LLM generations with multi-provider routing</p>
            </div>
            {projectUsage && projectUsage.limit > 0 && projectUsage.used >= projectUsage.limit ? (
              <button disabled title="You have reached your free student limit of 5 projects. Upgrade to continue creating more projects." className="inline-flex items-center justify-center rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-500 cursor-not-allowed">
                Create New Project
              </button>
            ) : (
              <Link href="/prompt-generator" className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white hover:bg-slate-100 px-4 py-2 text-xs font-bold text-indigo-950 shadow-lg transition transform active:scale-95">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Create New Project
              </Link>
            )}
          </div>
        </div>

        {/* Developer Type Configuration Card */}
        <div className="mt-5 rounded-2xl border border-white/[0.08] bg-[#16161e] p-5 shadow-inner">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 font-mono">Developer Persona</p>
              <h3 className="mt-1 text-base font-bold text-white">{developerTypeLabel}</h3>
              <p className="mt-1 text-xs text-slate-400">Update this anytime to tailor AI prompt suggestions to your tech stack.</p>
            </div>

            <div className="min-w-[240px]">
              <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 font-mono mb-1.5">Change Persona Type</label>
              <div className="relative">
                <select
                  value={developerType}
                  onChange={(event) => setDeveloperType(event.target.value as DeveloperType | "")}
                  className="w-full appearance-none rounded-xl border border-white/[0.1] bg-[#111116] px-4 py-2.5 pr-10 text-xs text-white outline-none focus:border-indigo-500 font-sans"
                >
                  <option value="">Select a developer type</option>
                  <option value="frontend">Frontend developer</option>
                  <option value="backend">Backend developer</option>
                  <option value="full_stack">Full stack developer</option>
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics Row */}
      <section className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-3xl border border-white/[0.08] bg-[#111116] p-5 shadow-xl">
          <p className="text-xs text-slate-400 font-medium">Total Projects</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <p className="text-3xl font-extrabold text-white font-mono">{totalProjects}</p>
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <FolderKanban size={20} />
            </div>
          </div>
        </article>

        <article className="rounded-3xl border border-white/[0.08] bg-[#111116] p-5 shadow-xl">
          <p className="text-xs text-slate-400 font-medium">Prompts Generated</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <p className="text-3xl font-extrabold text-white font-mono">{promptsGenerated}</p>
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Sparkles size={20} />
            </div>
          </div>
        </article>

        <article className="rounded-3xl border border-white/[0.08] bg-[#111116] p-5 shadow-xl">
          <p className="text-xs text-slate-400 font-medium">Active This Month</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <p className="text-3xl font-extrabold text-white font-mono">{thisMonth}</p>
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <BarChart3 size={20} />
            </div>
          </div>
        </article>
      </section>

      {/* Quick Actions Grid */}
      <section>
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Quick Actions</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/prompt-generator" className="rounded-3xl border border-white/[0.08] bg-[#111116] p-5 text-center shadow-xl transition hover:border-indigo-500/40 hover:bg-[#16161e] group">
            <div className="w-10 h-10 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition">
              <Plus size={22} />
            </div>
            <p className="mt-3 text-sm font-bold text-white">New Prompt Project</p>
            <p className="mt-1 text-xs text-slate-400">Create a structured prompt template</p>
          </Link>

          <Link href="/projects" className="rounded-3xl border border-white/[0.08] bg-[#111116] p-5 text-center shadow-xl transition hover:border-indigo-500/40 hover:bg-[#16161e] group">
            <div className="w-10 h-10 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-110 transition">
              <FolderPlus size={22} />
            </div>
            <p className="mt-3 text-sm font-bold text-white">View All Projects</p>
            <p className="mt-1 text-xs text-slate-400">Browse saved prompts & histories</p>
          </Link>

          <Link href="/billing" className="rounded-3xl border border-white/[0.08] bg-[#111116] p-5 text-center shadow-xl transition hover:border-indigo-500/40 hover:bg-[#16161e] group">
            <div className="w-10 h-10 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition">
              <Star size={22} />
            </div>
            <p className="mt-3 text-sm font-bold text-white">Upgrade Plan</p>
            <p className="mt-1 text-xs text-slate-400">Unlock Pro tier student perks</p>
          </Link>
        </div>
      </section>

      {/* Recent Projects List */}
      <section className="rounded-3xl border border-white/[0.08] bg-[#111116] p-6 shadow-2xl">
        <h3 className="text-sm font-bold text-white">Recent Projects</h3>
        {projectUsage ? (
          <p className="mt-1 text-xs text-slate-400">Projects used: <span className="text-indigo-400 font-mono font-semibold">{projectUsage.used} / {projectUsage.limit}</span></p>
        ) : null}
        <div className="mt-4 space-y-3">
          {loadingProjects ? <p className="text-xs text-slate-500">Loading recent projects...</p> : null}
          {normalizedProjects.map((project) => (
            <div key={project.id} className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.06] bg-[#16161e] px-4 py-3 shadow-inner">
              <div>
                <p className="text-xs font-bold text-white">{project.title}</p>
                <p className="mt-0.5 text-[10px] text-slate-400 font-mono">{project.prompts} prompts</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-500 font-mono">{project.updatedLabel}</p>
                <span className="mt-1 inline-flex rounded-full bg-indigo-500/20 border border-indigo-500/30 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-300">{project.status}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
