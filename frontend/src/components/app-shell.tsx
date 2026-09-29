"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { FolderKanban, LayoutDashboard, LogIn, LogOut, MessageSquarePlus, PanelsTopLeft, Search, SearchCode, Settings2, Sparkles, UserRound } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { ProjectLogo } from "@/components/project-logo";
import { ChatWorkspace } from "@/components/chat-workspace";
import { AuthModal } from "@/components/auth-modal";
import { ThemeToggle } from "./theme-toggle";
import { WorkspaceSwitcher } from "@/components/WorkspaceSwitcher";
import type { WebsiteProProject } from "@/lib/website-pro-store";


type AppShellProps = {
  children: React.ReactNode;
};

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/", label: "Chat", icon: MessageSquarePlus },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/prompt-generator", label: "Prompt Generator", icon: Sparkles },
  { href: "/analytics", label: "Insights", icon: SearchCode },
  { href: "/settings", label: "Settings", icon: Settings2 },
];

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const { isAuthenticated, isReady, logout, user, plan } = useAuth();
  const [recentProjects, setRecentProjects] = useState<WebsiteProProject[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const renderedNavItems = navItems; // show all nav items; access control handled inside pages/components

  const isAuthPage =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/admin/login" ||
    pathname === "/admin/signup" ||
    pathname === "/landing";
  const isHomePage = pathname === "/";
  const isDashboardPage = pathname === "/dashboard";

  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const recentProjectsStorageKey = user?.email ? `my-prompt-recent-projects:${user.email}` : null;

  const readRecentCache = () => {
    if (!recentProjectsStorageKey || typeof window === "undefined") return [] as WebsiteProProject[];
    try {
      const raw = localStorage.getItem(recentProjectsStorageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const writeRecentCache = (projects: WebsiteProProject[]) => {
    if (!recentProjectsStorageKey || typeof window === "undefined") return;
    try {
      localStorage.setItem(recentProjectsStorageKey, JSON.stringify(projects.slice(0, 8)));
    } catch {}
  };

  const formatProjectTime = (createdAt?: string) => {
    if (!createdAt) return "";
    // Backend stores UTC timestamps without timezone suffix; treat them as UTC explicitly.
    const normalized = /Z|[+-]\d\d:\d\d$/.test(createdAt) ? createdAt : `${createdAt}Z`;
    const dt = new Date(normalized);
    return Number.isNaN(dt.getTime()) ? "" : dt.toLocaleString();
  };

  const handleSearchKeyDown = async (e: any) => {
    if (e.key !== "Enter") return;
    const q = searchQuery.trim();
    if (!q) return;

    const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";
    try {
      const res = await fetch(`${base}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: q, new_chat: true }),
      });
      const data = await res.json();
      const reply = data && (data.reply || data.error) ? (data.reply || data.error) : "";

      const messages = [{ role: "user", content: q, ts: null }, { role: "assistant", content: reply, ts: null }];

      try {
        router.push("/");
      } catch {}

      try {
        window.dispatchEvent(new CustomEvent("my-prompt:load-chat", { detail: { prompt: q, response: reply, messages } }));
      } catch {}
    } catch (err) {
      // swallow errors but log
      // eslint-disable-next-line no-console
      console.error("Search save failed:", err);
    }
  };

  const fetchRecent = async () => {
    try {
      setLoadingRecent(true);
      // Load the saved Website Pro projects for the current account.
      if (!isAuthenticated || !user || user.id === undefined || user.id === null) {
        setRecentProjects([]);
        return;
      }

      const cached = readRecentCache();
      if (cached.length > 0) {
        setRecentProjects(cached.slice(0, 8));
      }

      const response = await fetch("/api/website-pro/projects", { cache: "no-store" });
      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as { projects?: WebsiteProProject[] };
      if (Array.isArray(data.projects) && data.projects.length > 0) {
        const nextProjects = data.projects.slice(0, 8);
        setRecentProjects(nextProjects);
        writeRecentCache(nextProjects);
      } else if (cached.length === 0) {
        setRecentProjects([]);
      }
    } finally {
      setLoadingRecent(false);
    }
  };

  // fetch recent projects on mount (and when auth/user changes)
  useEffect(() => {
    void fetchRecent();
  }, [isAuthenticated, user]);

  useEffect(() => {
    const handleProjectSaved = (event: Event) => {
      try {
        const detail = (event as CustomEvent).detail as {
          project?: WebsiteProProject;
        } | undefined;

        if (detail?.project) {
          setRecentProjects((current) => {
            const filtered = current.filter((item) => item.id !== detail.project?.id);
            const nextProjects = [detail.project as WebsiteProProject, ...filtered].slice(0, 8);
            writeRecentCache(nextProjects);
            return nextProjects;
          });
        }
      } catch {}

      void fetchRecent();
    };

    window.addEventListener("my-prompt:project-saved", handleProjectSaved as EventListener);
    return () => {
      window.removeEventListener("my-prompt:project-saved", handleProjectSaved as EventListener);
    };
  }, [isAuthenticated, user]);

  useEffect(() => {
    const handleProjectDeleted = (event: Event) => {
      try {
        const detail = (event as CustomEvent).detail as {
          projectId?: string;
        } | undefined;

        if (!detail?.projectId) return;

        setRecentProjects((current) => {
          const nextProjects = current.filter((item) => item.id !== detail.projectId);
          writeRecentCache(nextProjects);
          return nextProjects;
        });
      } catch {}
    };

    window.addEventListener("my-prompt:project-deleted", handleProjectDeleted as EventListener);
    return () => {
      window.removeEventListener("my-prompt:project-deleted", handleProjectDeleted as EventListener);
    };
  }, [isAuthenticated, user]);

  if (isAuthPage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--app-bg)] px-4">
        {children}
      </div>
    );
  }

  if (!isReady) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-zinc-300">Loading...</div>;
  }

  // Unauthenticated shell: buttons open auth modal
  // Unauthenticated shell: buttons open auth modal
  if (!isAuthenticated) {
    return (
      <div className="h-screen overflow-hidden bg-[#0a0a0c] text-slate-100 font-sans">
        <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />

        <div className="mx-auto flex h-full w-full max-w-[1650px] gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <aside className="fixed top-4 z-40 sidebar fixed-viewport hidden h-[calc(100vh-2rem)] w-[250px] shrink-0 rounded-3xl border border-white/[0.08] bg-[#111116]/90 p-4 shadow-2xl backdrop-blur-2xl md:block flex flex-col justify-between">
            <div>
              <div className="sidebar-header rounded-2xl border border-white/[0.08] bg-[#16161e] p-3.5 shadow-sm">
                <div className="flex items-center gap-3">
                  <ProjectLogo compact={true} />
                  <div className="logo-box">
                    <div className="logo-title flex items-center gap-2">
                      <span className="font-extrabold text-sm text-white tracking-tight">Super Prompt</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-cyan-300 bg-cyan-500/20 border border-cyan-500/30">v2.0</span>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setAuthModalOpen(true)}
                className="mt-4 w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 transition active:scale-98 flex items-center justify-center gap-1.5"
              >
                <Sparkles size={14} /> + New Project
              </button>

              <nav className="mt-5 space-y-1">
                {user?.role === "admin" ? (
                  <button onClick={() => setAuthModalOpen(true)} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:bg-white/[0.04] hover:text-white transition">
                    <PanelsTopLeft size={16} className="text-indigo-400" />
                    <span>Admin</span>
                  </button>
                ) : null}

                {renderedNavItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.href}
                      onClick={() => setAuthModalOpen(true)}
                      title={item.label}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:bg-white/[0.04] hover:text-white transition"
                    >
                      <Icon size={16} className="text-slate-400" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              <div className="mt-6 border-t border-white/[0.06] pt-4">
                <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">Recent Projects</p>
                <div className="recent-chats mt-2">
                  {loadingRecent ? (
                    <div className="text-xs text-slate-500">Loading recent projects...</div>
                  ) : recentProjects.length === 0 ? (
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs text-slate-500">No recent projects yet.</div>
                      <button onClick={() => void fetchRecent()} className="text-xs text-indigo-400 hover:underline">Refresh</button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {recentProjects.map((project) => (
                        <Link
                          key={project.id}
                          href={`/projects/${project.id}`}
                          onClick={() => {
                            router.push(`/projects/${project.id}`);
                          }}
                          className="w-full block rounded-xl border border-white/[0.04] bg-[#16161e]/60 px-3 py-2 text-left text-xs text-slate-300 transition hover:border-indigo-500/30 hover:bg-[#16161e] hover:text-white"
                        >
                          <div className="truncate font-medium">{project.siteType} · {project.framework}</div>
                          <div className="mt-0.5 text-[10px] text-slate-500 font-mono">{formatProjectTime(project.updatedAt || project.createdAt)}</div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-white/[0.06] pt-4">
              <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">Account</p>
              <div className="mt-2 space-y-1.5">
                <Link href="/login" className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-white/[0.08] bg-[#16161e] text-xs font-semibold text-white transition hover:bg-white/[0.06]">
                  <LogIn size={15} className="text-indigo-400" />
                  <span>Login</span>
                </Link>
                <Link href="/signup" className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-white/[0.08] bg-[#16161e] text-xs font-semibold text-white transition hover:bg-white/[0.06]">
                  <UserRound size={15} className="text-cyan-400" />
                  <span>Create Account</span>
                </Link>
              </div>
            </div>
          </aside>

          <main className="flex-1 overflow-hidden md:ml-[266px]">
            <div className="mb-4 rounded-3xl border border-white/[0.08] bg-[#111116]/80 p-5 text-center shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div>
                  <ProjectLogo />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setAuthModalOpen(true)} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition">Login</button>
                  <button onClick={() => setAuthModalOpen(true)} className="px-4 py-2 rounded-xl border border-white/[0.1] bg-[#16161e] text-slate-300 hover:text-white text-xs font-semibold transition">Sign up</button>
                </div>
              </div>

              <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">Welcome to Super Prompt Platform</h1>
              <p className="mt-1 text-xs text-slate-400">Stream LLM prompts for free. Log in to unlock BYOK Vault, Prompt Arena, Version Control & Workflows.</p>
            </div>

            <div className="rounded-3xl border border-white/[0.08] bg-[#111116] p-2 h-full overflow-hidden shadow-2xl">
              <ChatWorkspace publicMode />
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Authenticated shell
  return (
    <div className="min-h-screen max-w-full overflow-x-hidden bg-[#0a0a0c] text-slate-100 font-sans">
      <div className="mx-auto flex w-full max-w-[1650px] min-w-0 overflow-x-hidden gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <aside className="fixed top-4 z-40 sidebar fixed-viewport hidden h-[calc(100vh-2rem)] w-[250px] shrink-0 rounded-3xl border border-white/[0.08] bg-[#111116]/90 p-4 shadow-2xl backdrop-blur-2xl md:flex md:flex-col md:justify-between">
          <div>
            <div className="sidebar-header rounded-2xl border border-white/[0.08] bg-[#16161e] p-3.5 shadow-sm">
              <div className="flex items-center gap-3">
                <ProjectLogo compact={true} />
                <div className="logo-box">
                  <div className="logo-title flex items-center gap-2">
                    <span className="font-extrabold text-sm text-white tracking-tight">Super Prompt</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-cyan-300 bg-cyan-500/20 border border-cyan-500/30">Pro v2.0</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                router.push("/");
              }}
              className="mt-4 w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 transition active:scale-98 flex items-center justify-center gap-1.5"
            >
              <Sparkles size={14} /> + New Project
            </button>

            <div className="sidebar-body mt-4">
              <nav className="nav-section space-y-1">
                {user?.role === "admin" ? (
                  <Link href="/admin" className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:bg-white/[0.04] hover:text-white transition">
                    <PanelsTopLeft size={16} className="text-indigo-400" />
                    <span>Admin</span>
                  </Link>
                ) : null}
                {renderedNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <div key={item.href}>
                      <Link
                        href={item.href}
                        title={item.label}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition ${
                          isActive
                            ? "bg-gradient-to-r from-indigo-600/25 to-cyan-600/25 text-white font-bold border-l-2 border-indigo-500 shadow-sm"
                            : "text-slate-400 hover:bg-white/[0.04] hover:text-white"
                        }`}
                      >
                        <Icon size={16} className={isActive ? "text-indigo-400" : "text-slate-400"} />
                        <span>{item.label}</span>
                      </Link>
                    </div>
                  );
                })}
              </nav>

              <div className="mt-6 border-t border-white/[0.06] pt-4 sidebar-footer">
                <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">Recent Projects</p>
                <div className="recent-chats mt-2">
                  {loadingRecent ? (
                    <div className="text-xs text-slate-500">Loading recent projects...</div>
                  ) : recentProjects.length === 0 ? (
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs text-slate-500">No recent projects yet.</div>
                      <button onClick={() => void fetchRecent()} className="text-xs text-indigo-400 hover:underline">Refresh</button>
                    </div>
                  ) : (
                    <div className="space-y-1 max-h-[140px] overflow-y-auto">
                      {recentProjects.map((project) => (
                        <Link
                          key={project.id}
                          href={`/projects/${project.id}`}
                          onClick={() => {
                            router.push(`/projects/${project.id}`);
                          }}
                          className="w-full block rounded-xl border border-white/[0.04] bg-[#16161e]/60 px-3 py-2 text-left text-xs text-slate-300 transition hover:border-indigo-500/30 hover:bg-[#16161e] hover:text-white"
                        >
                          <div className="truncate font-medium">{project.siteType} · {project.framework}</div>
                          <div className="mt-0.5 text-[10px] text-slate-500 font-mono">{formatProjectTime(project.updatedAt || project.createdAt)}</div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/[0.06] pt-4">
            <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">Account</p>
            <div className="mt-2 rounded-2xl border border-white/[0.08] bg-[#16161e] p-3 shadow-inner">
              <Link href="/user" className="block rounded-xl px-2 py-1.5 transition hover:bg-white/[0.04]">
                <div className="text-xs font-bold text-white truncate">{user?.name || "User"}</div>
                <div className="text-[10px] text-slate-400 truncate font-mono">{user?.email || "No email"}</div>
                <div className="mt-1 text-[10px] font-semibold text-indigo-400">Open Profile →</div>
              </Link>
              <button onClick={logout} className="mt-2.5 w-full py-1.5 rounded-xl border border-white/[0.08] bg-[#1a1a24] text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] transition flex items-center justify-center gap-1.5">
                <LogOut size={13} className="text-rose-400" /> Logout
              </button>
            </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0 max-w-full overflow-x-hidden md:ml-[266px]">
          {isDashboardPage ? (
            <header className="sticky top-4 z-20 mb-4 rounded-3xl border border-white/[0.08] bg-[#111116]/80 px-5 py-3.5 shadow-2xl backdrop-blur-xl">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-lg font-extrabold tracking-tight text-white">Super Prompt SaaS</h1>
                  <p className="text-xs text-slate-400">Unified model-agnostic AI engineering workspace.</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="hidden items-center gap-2 rounded-xl border border-white/[0.08] bg-[#16161e] px-3.5 py-1.5 lg:flex">
                    <Search size={14} className="text-indigo-400" />
                    <input
                      placeholder="Search prompts, models, chats (⌘K)"
                      className="bg-transparent text-xs text-white placeholder-slate-500 outline-none w-52 font-sans"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={handleSearchKeyDown}
                    />
                  </div>
                  <div className="hidden sm:flex items-center gap-2">
                    <WorkspaceSwitcher />
                    {plan === "paid" && user?.approved === true ? (
                      <Link href="/projects" className="px-3.5 py-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-semibold hover:bg-indigo-500/20 transition">
                        Paid Workspace
                      </Link>
                    ) : plan === "paid" && user?.approved !== true ? (
                      <button className="px-3.5 py-1.5 rounded-xl border border-white/[0.08] bg-[#16161e] text-slate-500 text-xs font-medium opacity-60 cursor-not-allowed">Paid (Pending Approval)</button>
                    ) : (
                      <Link href="/billing" className="px-3.5 py-1.5 rounded-xl border border-white/[0.08] bg-[#16161e] text-slate-300 hover:text-white text-xs font-medium transition">
                        Free Workspace
                      </Link>
                    )}
                    {plan === "free" ? (
                      <Link href="/billing" className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition">
                        Upgrade
                      </Link>
                    ) : null}
                    <ThemeToggle />
                    <button onClick={logout} className="px-3 py-1.5 rounded-xl border border-white/[0.08] bg-[#16161e] text-slate-400 hover:text-white text-xs font-medium transition flex items-center gap-1">
                      <LogOut size={13} /> Logout
                    </button>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 text-xs font-bold text-white shadow-md">
                    {(user?.name?.[0] ?? "U").toUpperCase()}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-2.5 text-[11px] text-slate-400">
                <p>Status: <span className="text-emerald-400 font-semibold">Ready</span> · {plan === "paid" ? "Pro Tier" : "Free Tier"} · 5 active model routes</p>
                <p className="rounded-full border border-white/[0.08] bg-[#16161e] px-2.5 py-0.5 text-[10px] font-mono text-indigo-300">Press ⌘K for Command Palette</p>
              </div>
            </header>
          ) : null}

          {!isHomePage ? (
            <div className="mb-4 flex gap-2 overflow-x-auto rounded-2xl border border-white/[0.08] bg-[#111116] p-2 md:hidden">
              {renderedNavItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${
                      isActive ? "bg-indigo-600 text-white shadow-sm" : "bg-[#16161e] text-slate-400 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ) : null}

          {children}
        </main>
      </div>
    </div>
  );
}
