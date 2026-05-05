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
  if (!isAuthenticated) {
    return (
      <div className="h-screen overflow-hidden bg-[var(--app-bg)] text-[var(--app-text)]">
        <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />

        <div className="mx-auto flex h-full w-full max-w-[1650px] gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <aside className="fixed top-4 z-40 sidebar fixed-viewport hidden h-[calc(100vh-2rem)] shrink-0 rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm backdrop-blur md:block">
            <div className="sidebar-header rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-2)] p-3">
              <div className="flex items-center gap-2.5">
                <ProjectLogo compact={true} />
                <div className="logo-box">
                  <div className="logo-title flex items-center gap-2">
                    <span>My Prompt</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold text-[color:var(--accent-foreground)] bg-[color:var(--accent)]">Pro</span>
                  </div>
                </div>
              </div>
            </div>

            <button onClick={() => setAuthModalOpen(true)} className="btn btn-primary mt-4 w-full h-7">
              + New Project
            </button>

            <nav className="mt-4 space-y-1">
              {user?.role === "admin" ? (
                <button onClick={() => setAuthModalOpen(true)} className="nav-item">
                  <PanelsTopLeft size={16} />
                  <span>Admin</span>
                </button>
              ) : null}

              {renderedNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button key={item.href} onClick={() => setAuthModalOpen(true)} title={item.label} className={`nav-item`}>
                    <Icon size={16} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="mt-6 border-t border-[var(--app-border)] pt-4">
              <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--app-muted)]">Recent Projects</p>
                <div className="recent-chats mt-2">
                  {loadingRecent ? (
                    <div className="text-xs text-[var(--app-muted)]">Loading recent projects...</div>
                  ) : recentProjects.length === 0 ? (
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs text-[var(--app-muted)]">No recent projects yet.</div>
                      <button onClick={() => void fetchRecent()} className="text-xs text-[var(--app-text)] underline">Refresh</button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {recentProjects.map((project) => (
                        <Link
                          key={project.id}
                          href={`/website-developer?projectId=${project.id}`}
                          onClick={() => {
                            router.push(`/website-developer?projectId=${project.id}`);
                          }}
                          className="w-full block rounded-lg border border-transparent px-2 py-2 text-left text-sm text-[var(--app-text)] transition hover:bg-[var(--app-surface-2)]"
                        >
                          <div className="truncate font-medium">{project.siteType} · {project.framework}</div>
                          <div className="mt-0.5 text-xs text-[var(--app-muted)]">{formatProjectTime(project.updatedAt || project.createdAt)}</div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
            </div>

            <div className="mt-4 border-t border-[var(--app-border)] pt-4">
              <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--app-muted)]">Account</p>
              <div className="mt-2 space-y-2">
                <Link href="/login" className="nav-item">
                  <LogIn size={16} />
                  <span className="text-sm font-medium">Login</span>
                </Link>
                <Link href="/signup" className="nav-item">
                  <UserRound size={16} />
                  <span className="text-sm font-medium">Create Account</span>
                </Link>
              </div>
            </div>
          </aside>

          <main className="flex-1 overflow-hidden md:ml-[272px]">
            <div className="mb-6 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 text-center">
              <div className="flex items-center justify-between">
                <div>
                  <ProjectLogo />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setAuthModalOpen(true)} className="btn btn-primary">Login</button>
                  <button onClick={() => setAuthModalOpen(true)} className="btn btn-secondary">Sign up</button>
                </div>
              </div>

              <h1 className="mt-4 text-3xl font-semibold text-[var(--app-text)]">Welcome to My Prompt</h1>
              <p className="mt-2 text-sm text-[var(--app-muted)]">Use Chat for free. Log in to access Projects, Website Pro and more.</p>
            </div>

            <div className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 h-full overflow-hidden">
              <ChatWorkspace publicMode />
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Authenticated shell
  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
      <div className="mx-auto flex w-full max-w-[1650px] gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <aside className="fixed top-4 z-40 sidebar fixed-viewport hidden h-[calc(100vh-2rem)] shrink-0 rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm backdrop-blur md:block">
            <div className="sidebar-header rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-2)] p-3">
            <div className="flex items-center gap-2.5">
                <ProjectLogo compact={true} />
              <div className="logo-box">
                <div className="logo-title flex items-center gap-2">
                  <span>My Prompt</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold text-[color:var(--accent-foreground)] bg-[color:var(--accent)]">Pro</span>
                </div>
              </div>
            </div>
          </div>

            <button
            onClick={() => {
              router.push("/website-developer");
            }}
            className={`btn btn-primary mt-4 w-full h-7`}
          >
            + New Project
          </button>

          <div className="sidebar-body">
            <nav className="nav-section">
              {user?.role === "admin" ? (
                <Link href="/admin" className="nav-item">
                  <PanelsTopLeft size={16} />
                  <span>Admin</span>
                </Link>
              ) : null}
              {renderedNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <div key={item.href}>
                    <Link href={item.href} title={item.label} className={`nav-item ${isActive ? 'active' : ''}`}>
                      <Icon size={16} />
                      <span className="text-sm font-medium">{item.label}</span>
                    </Link>

                    {/* No submenu under Website Developer; prompt generator is a top-level nav item */}
                  </div>
                );
              })}
            </nav>

            <div className="mt-6 border-t border-[var(--app-border)] pt-4 sidebar-footer">
              <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--app-muted)]">Recent Projects</p>
              <div className="recent-chats mt-2">
                {loadingRecent ? (
                  <div className="text-xs text-[var(--app-muted)]">Loading recent projects...</div>
                ) : recentProjects.length === 0 ? (
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs text-[var(--app-muted)]">No recent projects yet.</div>
                    <button onClick={() => void fetchRecent()} className="text-xs text-[var(--app-text)] underline">Refresh</button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {recentProjects.map((project) => (
                      <Link
                        key={project.id}
                        href={`/website-developer?projectId=${project.id}`}
                        onClick={() => {
                          router.push(`/website-developer?projectId=${project.id}`);
                        }}
                        className="w-full block rounded-lg border border-transparent px-2 py-2 text-left text-sm text-[var(--app-text)] transition hover:bg-[var(--app-surface-2)]"
                      >
                        <div className="truncate font-medium">{project.siteType} · {project.framework}</div>
                        <div className="mt-0.5 text-xs text-[var(--app-muted)]">{formatProjectTime(project.updatedAt || project.createdAt)}</div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-[var(--app-border)] pt-4">
              <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--app-muted)]">Account</p>
              <div className="mt-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] p-2.5">
                <Link href="/user" className="block rounded-lg px-2 py-1.5 transition hover:bg-[var(--app-surface)]">
                  <div className="text-sm font-semibold text-[var(--app-text)]">{user?.name || "User"}</div>
                  <div className="text-xs text-[var(--app-muted)] truncate">{user?.email || "No email"}</div>
                  <div className="mt-1 text-xs font-medium text-[var(--app-text)]">Open profile</div>
                </Link>
                <button onClick={logout} className="btn btn-secondary mt-2 w-full inline-flex items-center justify-center gap-1">
                  <LogOut size={14} /> Logout
                </button>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 md:ml-[272px]">
          {isDashboardPage ? (
            <header className="sticky top-4 z-20 mb-4 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3 shadow-sm backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-lg font-semibold tracking-tight text-[var(--app-text)]">My Prompt</h1>
                  <p className="text-sm text-[var(--app-muted)]">Unified model-agnostic frontend.</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="hidden items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] px-3 py-2 lg:flex">
                    <Search size={14} className="text-[var(--app-muted)]" />
                    <input
                      placeholder="Search prompts, models, chats"
                      className="search-input w-56 text-xs"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={handleSearchKeyDown}
                    />
                  </div>
                  <div className="hidden sm:flex items-center gap-2">
                    {plan === "paid" && user?.approved === true ? (
                      <Link href="/website-developer" className="btn btn-secondary">
                        Paid Workspace
                      </Link>
                    ) : plan === "paid" && user?.approved !== true ? (
                      <button className="btn btn-secondary opacity-60 cursor-not-allowed">Paid (Pending Approval)</button>
                    ) : (
                      <Link href="/billing" className="btn btn-secondary">
                        Free Workspace
                      </Link>
                    )}
                    {plan === "free" ? (
                      <Link href="/billing" className="btn btn-primary">
                        Upgrade
                      </Link>
                    ) : null}
                    <ThemeToggle />
                    <button onClick={logout} className="btn btn-secondary inline-flex items-center gap-1">
                      <LogOut size={14} /> Logout
                    </button>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--app-text)] text-sm font-semibold text-[var(--app-bg)]">
                    {(user?.name?.[0] ?? "U").toUpperCase()}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--app-border)] pt-3 text-xs text-[var(--app-muted)]">
                <p>Ready · {plan === "paid" ? "Pro tier" : "Free tier"} · 5 model routes active</p>
                <p className="rounded-full border border-[var(--app-border)] bg-[var(--app-surface-2)] px-2 py-1">Tip: Press ⌘K to search</p>
              </div>
            </header>
          ) : null}

          {!isHomePage ? (
            <div className="mb-4 flex gap-2 overflow-x-auto rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-2 md:hidden">
              {renderedNavItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                      isActive ? "bg-[var(--app-text)] text-[var(--app-bg)]" : "bg-[var(--app-surface-2)] text-[var(--app-text)]"
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
