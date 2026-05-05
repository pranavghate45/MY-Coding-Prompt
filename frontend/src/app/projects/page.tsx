"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, CalendarClock, Edit3, FolderKanban, Plus, Sparkles, Trash2 } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import type { WebsiteProProject } from "@/lib/website-pro-store";

export default function ProjectsPage() {
  const router = useRouter();
  const { isAuthenticated, isReady } = useAuth();
  const [projects, setProjects] = useState<WebsiteProProject[]>([]);

  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isReady, router]);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch("/api/website-pro/projects", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as { projects: WebsiteProProject[] };
        setProjects(data.projects || []);
      } catch {
        // keep current list if network fails
      }
    };

    void fetchProjects();
  }, []);

  useEffect(() => {
    const handleProjectSaved = (event: Event) => {
      try {
        const detail = (event as CustomEvent).detail as { project?: WebsiteProProject } | undefined;
        if (!detail?.project) return;

        setProjects((current) => {
          const filtered = current.filter((project) => project.id !== detail.project?.id);
          return [detail.project as WebsiteProProject, ...filtered];
        });
      } catch {
        // ignore sync issues between routes
      }
    };

    window.addEventListener("my-prompt:project-saved", handleProjectSaved as EventListener);
    return () => window.removeEventListener("my-prompt:project-saved", handleProjectSaved as EventListener);
  }, []);

  useEffect(() => {
    const handleProjectDeleted = (event: Event) => {
      try {
        const detail = (event as CustomEvent).detail as { projectId?: string } | undefined;
        if (!detail?.projectId) return;

        setProjects((current) => current.filter((project) => project.id !== detail.projectId));
      } catch {
        // ignore sync issues between routes
      }
    };

    window.addEventListener("my-prompt:project-deleted", handleProjectDeleted as EventListener);
    return () => window.removeEventListener("my-prompt:project-deleted", handleProjectDeleted as EventListener);
  }, []);

  const deleteProject = async (projectId: string) => {
    const confirmed = window.confirm("Delete this project? This cannot be undone.");
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/website-pro/projects/${projectId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete project");
      }

      setProjects((current) => current.filter((project) => project.id !== projectId));

      try {
        window.dispatchEvent(new CustomEvent("my-prompt:project-deleted", { detail: { projectId } }));
      } catch {
        // ignore sync issues
      }
    } catch {
      window.alert("Failed to delete the project. Please try again.");
    }
  };

  if (!isReady || !isAuthenticated) {
    return <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 text-sm text-[var(--app-muted)]">Loading projects...</div>;
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--app-muted)]">Projects</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--app-text)]">Prompt projects</h2>
            <p className="mt-2 max-w-2xl text-sm text-[var(--app-muted)]">
              Projects created in Prompt Generator are stored here automatically. Open any project to edit it and save a new version.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/prompt-generator" className="btn btn-primary inline-flex items-center gap-2">
              <Plus size={14} /> New Project
            </Link>
            <Link href="/prompt-generator" className="btn btn-secondary inline-flex items-center gap-2">
              Prompt Generator <ArrowRight size={14} />
            </Link>
          </div>
        </div>

      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <article className="rounded-[22px] border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm">
          <p className="text-xs text-[var(--app-muted)]">Total Projects</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <p className="text-3xl font-semibold text-[var(--app-text)]">{projects.length}</p>
            <FolderKanban className="text-[#4f46e5]" size={22} />
          </div>
        </article>

        <article className="rounded-[22px] border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm">
          <p className="text-xs text-[var(--app-muted)]">Editable</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <p className="text-3xl font-semibold text-[var(--app-text)]">{projects.length}</p>
            <Edit3 className="text-[#22c55e]" size={22} />
          </div>
        </article>

        <article className="rounded-[22px] border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm">
          <p className="text-xs text-[var(--app-muted)]">Latest update</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <p className="text-lg font-semibold text-[var(--app-text)]">{projects[0] ? new Date(projects[0].updatedAt || projects[0].createdAt).toLocaleDateString() : "No projects yet"}</p>
            <CalendarClock className="text-[#d97706]" size={22} />
          </div>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {projects.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-[var(--app-border)] bg-[var(--app-surface)] p-8 text-center text-sm text-[var(--app-muted)] lg:col-span-3">
            No projects yet. Create one in Prompt Generator and it will appear here.
          </div>
        ) : null}

        {projects.map((project) => {
          const promptCount = project.plan?.length || 0;
          const updatedLabel = project.updatedAt ? `Updated ${new Date(project.updatedAt).toLocaleDateString()}` : `Created ${new Date(project.createdAt).toLocaleDateString()}`;
          return (
            <article key={project.id} className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold text-[var(--app-text)]">{project.siteType}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-[var(--app-muted)]">{project.goal}</p>
                </div>
                <span className="rounded-full bg-[#e8eaff] px-2.5 py-1 text-[11px] font-medium text-[#4f46e5]">
                  {project.target || "Website"}
                </span>
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs text-[var(--app-muted)]">
                <Sparkles size={14} className="text-[#f59e0b]" />
                <span>{promptCount} prompts</span>
                <span>•</span>
                <span>{updatedLabel}</span>
              </div>

              <div className="mt-4 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-2)] p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--app-muted)]">Stack</p>
                <p className="mt-2 text-sm font-medium text-[var(--app-text)]">{project.framework}</p>
                <p className="mt-1 text-sm text-[var(--app-muted)]">{project.styleSystem} · {project.backend} · {project.database}</p>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <button onClick={() => router.push(`/website-developer?projectId=${project.id}`)} className="inline-flex items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] px-3 py-2 text-sm font-medium text-[var(--app-text)]">
                  <Edit3 size={14} /> Edit
                </button>
                <div className="flex items-center gap-2">
                  <button onClick={() => router.push(`/projects/${project.id}`)} className="inline-flex items-center gap-2 rounded-xl bg-[var(--app-text)] px-3 py-2 text-sm font-medium text-[var(--app-bg)]">
                    Open
                    <ArrowRight size={14} />
                  </button>
                  <button
                    onClick={() => void deleteProject(project.id)}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:border-red-300 hover:bg-red-100"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
