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
    <div className="space-y-5">
      <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--app-muted)]">Dashboard</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--app-text)]">Welcome back, {user?.name || "User"} 👋</h2>
        <p className="mt-2 text-sm text-[var(--app-muted)]">Here&apos;s what&apos;s happening with your projects today.</p>

        <div className="mt-5 rounded-[24px] border border-[#95a3ff] bg-[linear-gradient(90deg,#2f49f4_0%,#3657ff_100%)] p-5 text-white shadow-[0_18px_50px_rgba(47,73,244,0.24)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-lg font-semibold">Ready to create your next prompt?</p>
              <p className="mt-1 text-sm text-white/80">Start generating powerful AI prompts in seconds</p>
            </div>
            <Link href="/prompt-generator" className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-medium text-[#3657ff] shadow-sm">
              Create New Project
            </Link>
          </div>
        </div>

        <div className="mt-5 rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--app-muted)]">Developer type</p>
              <h3 className="mt-1 text-lg font-semibold text-[var(--app-text)]">{developerTypeLabel}</h3>
              <p className="mt-1 text-sm text-[var(--app-muted)]">Update this anytime to change the questions you see in project setup.</p>
            </div>

            <div className="min-w-[240px]">
              <label className="block text-xs uppercase tracking-[0.18em] text-[var(--app-muted)]">Change developer type</label>
              <div className="relative mt-2">
                <select
                  value={developerType}
                  onChange={(event) => setDeveloperType(event.target.value as DeveloperType | "")}
                  className="w-full appearance-none rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-2.5 pr-10 text-sm text-[var(--app-text)] outline-none"
                >
                  <option value="">Select a developer type</option>
                  <option value="frontend">Frontend developer</option>
                  <option value="backend">Backend developer</option>
                  <option value="full_stack">Full stack developer</option>
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--app-muted)]" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-[20px] border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm">
          <p className="text-xs text-[var(--app-muted)]">Total Projects</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <p className="text-3xl font-semibold text-[var(--app-text)]">{totalProjects}</p>
            <FolderKanban className="text-[#d7a93d]" size={22} />
          </div>
        </article>

        <article className="rounded-[20px] border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm">
          <p className="text-xs text-[var(--app-muted)]">Prompts Generated</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <p className="text-3xl font-semibold text-[var(--app-text)]">{promptsGenerated}</p>
            <Sparkles className="text-[#f59e0b]" size={22} />
          </div>
        </article>

        <article className="rounded-[20px] border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm">
          <p className="text-xs text-[var(--app-muted)]">This Month</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <p className="text-3xl font-semibold text-[var(--app-text)]">{thisMonth}</p>
            <BarChart3 className="text-[#4f46e5]" size={22} />
          </div>
        </article>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-[var(--app-text)]">Quick Actions</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <Link href="/prompt-generator" className="rounded-[20px] border border-[var(--app-border)] bg-[var(--app-surface)] p-4 text-center shadow-sm transition hover:-translate-y-0.5">
            <Plus className="mx-auto text-[#8b5cf6]" size={28} />
            <p className="mt-2 text-sm font-semibold text-[var(--app-text)]">New Project</p>
            <p className="mt-1 text-xs text-[var(--app-muted)]">Create a new prompt project</p>
          </Link>

          <Link href="/projects" className="rounded-[20px] border border-[var(--app-border)] bg-[var(--app-surface)] p-4 text-center shadow-sm transition hover:-translate-y-0.5">
            <FolderPlus className="mx-auto text-[#f59e0b]" size={28} />
            <p className="mt-2 text-sm font-semibold text-[var(--app-text)]">View Projects</p>
            <p className="mt-1 text-xs text-[var(--app-muted)]">Browse all your projects</p>
          </Link>

          <Link href="/billing" className="rounded-[20px] border border-[var(--app-border)] bg-[var(--app-surface)] p-4 text-center shadow-sm transition hover:-translate-y-0.5">
            <Star className="mx-auto text-[#eab308]" size={28} />
            <p className="mt-2 text-sm font-semibold text-[var(--app-text)]">Upgrade Plan</p>
            <p className="mt-1 text-xs text-[var(--app-muted)]">Unlock premium features</p>
          </Link>
        </div>
      </section>

      <section className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-[var(--app-text)]">Recent Projects</h3>
        <div className="mt-4 space-y-4">
          {loadingProjects ? <p className="text-sm text-[var(--app-muted)]">Loading recent projects...</p> : null}
          {normalizedProjects.map((project) => (
            <div key={project.id} className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-[var(--app-text)]">{project.title}</p>
                <p className="mt-1 text-xs text-[var(--app-muted)]">{project.prompts} prompts</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[var(--app-muted)]">{project.updatedLabel}</p>
                <span className="mt-1 inline-flex rounded-full bg-[#e8eaff] px-2.5 py-0.5 text-[11px] font-medium text-[#4f46e5]">{project.status}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
