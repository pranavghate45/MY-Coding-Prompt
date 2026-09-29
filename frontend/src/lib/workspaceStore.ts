import { Workspace, WorkspaceMember, CreateWorkspacePayload, InviteMemberPayload } from "@/types/api";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

export async function fetchUserWorkspaces(userId: string = "default_user"): Promise<Workspace[]> {
  try {
    const res = await fetch(`${API_BASE}/api/workspaces?user_id=${encodeURIComponent(userId)}`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      return data.workspaces || [];
    }
  } catch (err) {
    console.warn("Backend fetch workspaces failed", err);
  }

  // Fallback to local storage
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("my-prompt-workspaces");
      if (raw) return JSON.parse(raw);
    } catch {}
  }
  return [
    { id: "personal", name: "Personal Workspace", owner_id: userId, role: "owner", created_at: new Date().toISOString() }
  ];
}

export async function createTeamWorkspace(payload: CreateWorkspacePayload): Promise<Workspace | null> {
  try {
    const res = await fetch(`${API_BASE}/api/workspaces`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      const ws = data.workspace as Workspace;
      syncLocalWorkspace(ws);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("my-prompt:workspace-changed", { detail: { workspace: ws } }));
      }
      return ws;
    }
  } catch (err) {
    console.warn("Backend create workspace failed", err);
  }

  // Fallback local creation
  const fallbackWs: Workspace = {
    id: `ws_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: payload.name,
    owner_id: payload.owner_id || "default_user",
    role: "owner",
    created_at: new Date().toISOString()
  };
  syncLocalWorkspace(fallbackWs);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("my-prompt:workspace-changed", { detail: { workspace: fallbackWs } }));
  }
  return fallbackWs;
}

export async function inviteWorkspaceMember(workspaceId: string, payload: InviteMemberPayload): Promise<WorkspaceMember | null> {
  try {
    const res = await fetch(`${API_BASE}/api/workspaces/${workspaceId}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      return data.member as WorkspaceMember;
    }
  } catch (err) {
    console.warn("Backend invite member failed", err);
  }

  // Fallback local invite
  return {
    id: `mem_${Date.now()}`,
    workspace_id: workspaceId,
    user_id: payload.email.split("@")[0],
    role: payload.role || "editor",
    invited_email: payload.email,
    created_at: new Date().toISOString()
  };
}

export async function fetchWorkspaceMembers(workspaceId: string, userId: string = "default_user"): Promise<WorkspaceMember[]> {
  try {
    const res = await fetch(`${API_BASE}/api/workspaces/${workspaceId}/members?user_id=${encodeURIComponent(userId)}`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      return data.members || [];
    }
  } catch {}
  return [];
}

function syncLocalWorkspace(ws: Workspace) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem("my-prompt-workspaces");
    const list: Workspace[] = raw ? JSON.parse(raw) : [
      { id: "personal", name: "Personal Workspace", owner_id: ws.owner_id, role: "owner", created_at: new Date().toISOString() }
    ];
    const idx = list.findIndex((w) => w.id === ws.id);
    if (idx !== -1) list[idx] = ws;
    else list.push(ws);
    localStorage.setItem("my-prompt-workspaces", JSON.stringify(list));
  } catch {}
}
