import { UniversalProject, ProjectCreatePayload, ProjectUpdatePayload, ProjectFilters } from "@/types/api";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

export async function fetchUniversalProjects(filters: ProjectFilters = {}): Promise<UniversalProject[]> {
  try {
    const params = new URLSearchParams();
    if (filters.type && filters.type !== "all") params.set("type", filters.type);
    if (filters.persona) params.set("persona", filters.persona);
    if (filters.search) params.set("search", filters.search);
    if (filters.is_favorite !== undefined) params.set("is_favorite", String(filters.is_favorite));
    if (filters.sort_by) params.set("sort_by", filters.sort_by);
    if (filters.page) params.set("page", String(filters.page));
    if (filters.limit) params.set("limit", String(filters.limit));

    const res = await fetch(`${API_BASE}/api/projects?${params.toString()}`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      return data.projects || [];
    }
  } catch (err) {
    console.warn("Backend /api/projects fetch failed, using fallback cache", err);
  }

  // Fallback to local storage
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("my-prompt-universal-projects");
      if (raw) {
        let list = JSON.parse(raw) as UniversalProject[];
        if (filters.type && filters.type !== "all") list = list.filter((p) => p.prompt_type === filters.type);
        if (filters.search) {
          const s = filters.search.toLowerCase();
          list = list.filter((p) => p.title.toLowerCase().includes(s) || p.generated_super_prompt.toLowerCase().includes(s));
        }
        if (filters.is_favorite) list = list.filter((p) => p.is_favorite);
        return list;
      }
    } catch {}
  }
  return [];
}

export async function saveUniversalProject(payload: ProjectCreatePayload): Promise<UniversalProject | null> {
  try {
    const res = await fetch(`${API_BASE}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      const saved = data.project as UniversalProject;
      // Sync local cache
      syncLocalProject(saved);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("my-prompt:universal-project-saved", { detail: { project: saved } }));
      }
      return saved;
    }
  } catch (err) {
    console.warn("Backend save failed, saving to local cache", err);
  }

  // Fallback save locally
  const fallbackProject: UniversalProject = {
    id: payload.id || `proj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    user_id: payload.user_id || "default_user",
    title: payload.title || payload.raw_input?.slice(0, 50) || "Untitled Super Prompt",
    prompt_type: payload.prompt_type || "workspace_chat",
    persona: payload.persona || "Standard",
    target_model: payload.target_model || "gpt-4o",
    framework: payload.framework || "Freeform",
    raw_input: payload.raw_input || "",
    generated_super_prompt: payload.generated_super_prompt,
    metadata_json: payload.metadata_json || {},
    is_favorite: !!payload.is_favorite,
    tokens_count: Math.round(payload.generated_super_prompt.length / 4),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  syncLocalProject(fallbackProject);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("my-prompt:universal-project-saved", { detail: { project: fallbackProject } }));
  }
  return fallbackProject;
}

export async function patchUniversalProject(id: string, payload: ProjectUpdatePayload): Promise<UniversalProject | null> {
  try {
    const res = await fetch(`${API_BASE}/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      const updated = data.project as UniversalProject;
      syncLocalProject(updated);
      return updated;
    }
  } catch {}

  // Fallback update local storage
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("my-prompt-universal-projects");
      if (raw) {
        const list = JSON.parse(raw) as UniversalProject[];
        const idx = list.findIndex((p) => p.id === id);
        if (idx !== -1) {
          list[idx] = { ...list[idx], ...payload, updated_at: new Date().toISOString() };
          localStorage.setItem("my-prompt-universal-projects", JSON.stringify(list));
          return list[idx];
        }
      }
    } catch {}
  }
  return null;
}

export async function deleteUniversalProject(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/projects/${id}`, { method: "DELETE" });
    if (res.ok) {
      removeLocalProject(id);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("my-prompt:universal-project-deleted", { detail: { id } }));
      }
      return true;
    }
  } catch {}

  removeLocalProject(id);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("my-prompt:universal-project-deleted", { detail: { id } }));
  }
  return true;
}

export async function duplicateUniversalProject(id: string): Promise<UniversalProject | null> {
  try {
    const res = await fetch(`${API_BASE}/api/projects/${id}/duplicate`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      const dup = data.project as UniversalProject;
      syncLocalProject(dup);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("my-prompt:universal-project-saved", { detail: { project: dup } }));
      }
      return dup;
    }
  } catch {}
  return null;
}

function syncLocalProject(project: UniversalProject) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem("my-prompt-universal-projects");
    const list: UniversalProject[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex((p) => p.id === project.id);
    if (idx !== -1) {
      list[idx] = project;
    } else {
      list.unshift(project);
    }
    localStorage.setItem("my-prompt-universal-projects", JSON.stringify(list.slice(0, 100)));
  } catch {}
}

function removeLocalProject(id: string) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem("my-prompt-universal-projects");
    if (raw) {
      const list: UniversalProject[] = JSON.parse(raw);
      const filtered = list.filter((p) => p.id !== id);
      localStorage.setItem("my-prompt-universal-projects", JSON.stringify(filtered));
    }
  } catch {}
}
