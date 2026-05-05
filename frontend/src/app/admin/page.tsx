"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth, AuthUser } from "@/components/auth-provider";
import PromoModal from "@/components/PromoModal";
import PromoEditor from "@/components/PromoEditor";
import OpenAIKeySetter from "@/components/OpenAIKeySetter";

export default function AdminPage() {
  const { listUsers, setUserApiKey, setUserRole, setUserPlan, setUserApproval, deleteUser, setUserRestore, user } = useAuth();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [showPromo, setShowPromo] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [showPromoButton, setShowPromoButton] = useState(true);
  const [restoreRequests, setRestoreRequests] = useState<Array<{ id: string; email: string; message: string; createdAt: number }>>([]);

  const refresh = useCallback(() => {
    const fromCtx = listUsers?.();
    if (fromCtx && Array.isArray(fromCtx)) {
      setUsers(fromCtx);
      return;
    }

    // fallback to reading directly from localStorage in case context isn't available
    try {
      const raw = localStorage.getItem("my-prompt-users");
      if (!raw) {
        setUsers([]);
        return;
      }
      const parsed = JSON.parse(raw) as AuthUser[];
      setUsers(parsed);
    } catch {
      setUsers([]);
    }
  }, [listUsers]);

  const handleRefresh = () => {
    // call existing refresh and defensively reload users from storage
    try {
      refresh();
      const raw = localStorage.getItem("my-prompt-users");
      if (!raw) {
        setUsers([]);
        return;
      }
      const parsed = JSON.parse(raw) as AuthUser[];
      setUsers(parsed);
    } catch {
      // fallback to calling refresh once more
      try { refresh(); } catch {}
    }
  };

  useEffect(() => {
    const id = setTimeout(refresh, 0);
    return () => clearTimeout(id);
  }, [refresh]);

  useEffect(() => {
    const onUsersUpdated = () => refresh();
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === "my-prompt-users") refresh();
    };

    const loadRestoreRequests = () => {
      try {
        const raw = localStorage.getItem("my-prompt-restore-requests");
        if (!raw) return setRestoreRequests([]);
        setRestoreRequests(JSON.parse(raw));
      } catch {
        setRestoreRequests([]);
      }
    };

    const onRestoreUpdated = () => loadRestoreRequests();
    loadRestoreRequests();

    if (typeof window !== "undefined") {
      window.addEventListener("users:updated", onUsersUpdated);
      // Listen for promo updates and storage events (cross-tab updates)
      const onPromoUpdated = () => {
        try {
          const raw = localStorage.getItem("my-prompt-promo-config");
          if (!raw) return setShowPromoButton(true);
          const parsed = JSON.parse(raw);
          setShowPromoButton(parsed.showViewButton ?? true);
        } catch {
          setShowPromoButton(true);
        }
      };
      window.addEventListener("promo:updated", onPromoUpdated);
      window.addEventListener("storage", onStorage);
      window.addEventListener("restore:updated", onRestoreUpdated);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("users:updated", onUsersUpdated);
        window.removeEventListener("promo:updated", () => {});
        window.removeEventListener("storage", onStorage);
        window.removeEventListener("restore:updated", onRestoreUpdated);
      }
    };
  }, [refresh]);

  // Load promo config once on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem("my-prompt-promo-config");
      if (!raw) return setShowPromoButton(true);
      const parsed = JSON.parse(raw);
      setShowPromoButton(parsed.showViewButton ?? true);
    } catch {
      setShowPromoButton(true);
    }
  }, []);

  if (user?.role !== "admin") {
    return <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6">Access denied. Admins only.</div>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5">
        <h1 className="text-2xl font-semibold text-[var(--app-text)]">Admin Panel</h1>
        <p className="mt-1 text-sm text-[var(--app-muted)]">Manage users, grant API keys, and promote paid plans.</p>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-sm text-[var(--app-muted)]">Users: {users.filter((uu) => uu.id !== user?.id).length}</div>
            {showPromoButton ? (
              <button onClick={() => setShowPromo(true)} className="rounded-lg bg-blue-600 px-3 py-1 text-sm text-white">View Promo Offer</button>
            ) : null}
            <button onClick={() => setEditorOpen(true)} className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-2)] px-3 py-1 text-sm ml-2">Edit Promo</button>
          </div>
          <div>
            <button
              type="button"
              aria-label="Refresh users"
              onClick={handleRefresh}
              className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-2)] px-3 py-1 text-sm cursor-pointer"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-3 grid gap-3">
          {users.filter((uu) => uu.id !== user?.id).length === 0 ? (
            <p className="text-sm text-[var(--app-muted)]">No users found.</p>
          ) : (
            users
              .filter((uu) => uu.id !== user?.id)
              .map((u: AuthUser) => (
              <div key={u.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] p-3">
                <div>
                  <div className="font-semibold">{u.name} {u.deleted ? <span className="text-xs text-red-500">(deleted)</span> : <span className="text-xs text-[var(--app-muted)]">({u.email})</span>}</div>
                  <div className="mt-1 text-xs text-[var(--app-muted)]">Role: {u.role ?? "user"} · Plan: {u.plan}</div>
                  <div className="mt-1 text-xs text-[var(--app-muted)]">API Key: {u.apiKey ? "●●●●●" : "None"}</div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { if (u.id !== user?.id) { setUserRole?.(u.id, u.role === "admin" ? "user" : "admin"); refresh(); } }}
                    disabled={u.id === user?.id}
                    title={u.id === user?.id ? "You cannot change your own role" : "Toggle role"}
                    className={`rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-2 py-1 text-sm ${u.id === user?.id ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    Toggle Role
                  </button>
                  <button
                    onClick={() => { const newKey = u.apiKey ? null : `sk-${Math.random().toString(36).slice(2,10)}`; setUserApiKey?.(u.id, newKey); refresh(); }}
                    className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-2)] px-2 py-1 text-sm"
                  >
                    {u.apiKey ? "Revoke API Key" : "Grant API Key"}
                  </button>
                  <button
                    onClick={() => { setUserPlan?.(u.id, u.plan === "paid" ? "free" : "paid"); refresh(); }}
                    className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-2)] px-2 py-1 text-sm"
                  >
                    Toggle Plan
                  </button>
                  <button
                    onClick={() => { setUserApproval?.(u.id, !u.approved); refresh(); }}
                    className={`rounded-lg border px-2 py-1 text-sm ${u.approved ? "border-green-600 text-green-600 bg-green-600/10" : "border-[var(--app-border)] bg-[var(--app-surface-2)]"}`}
                  >
                    {u.approved ? "Revoke Approval" : "Approve Paid"}
                  </button>
                  {u.role !== "admin" && u.id !== user?.id ? (
                    u.deleted ? (
                      <button
                        onClick={() => { setUserRestore?.(u.id); refresh(); }}
                        className="rounded-lg border border-green-600 bg-green-600/10 px-2 py-1 text-sm text-green-600"
                      >
                        Restore
                      </button>
                    ) : (
                      <button
                        onClick={() => { deleteUser?.(u.id); refresh(); }}
                        className="rounded-lg border border-red-600 bg-red-600/10 px-2 py-1 text-sm text-red-600"
                      >
                        Delete
                      </button>
                    )
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
        {/* Restore requests panel */}
        <div className="mt-6">
          <h3 className="text-sm font-semibold">Restore Requests</h3>
          {restoreRequests.length === 0 ? (
            <p className="text-xs text-[var(--app-muted)] mt-2">No restore requests.</p>
          ) : (
            <div className="mt-2 space-y-2">
              {restoreRequests.map((r) => (
                <div key={r.id} className="flex items-start justify-between gap-3 rounded-md border p-2 bg-[var(--app-surface-2)]">
                  <div>
                    <div className="text-sm font-medium">{r.email}</div>
                    <div className="text-xs text-[var(--app-muted)]">{new Date(r.createdAt).toLocaleString()}</div>
                    <div className="mt-1 text-xs">{r.message}</div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => {
                        // find user and restore locally
                        const usersRaw = localStorage.getItem("my-prompt-users");
                        const users = usersRaw ? JSON.parse(usersRaw) : [];
                        const target = users.find((u: any) => u.emailBackup === r.email || u.email === r.email);
                        if (target) {
                          // call context restore if available
                          setUserRestore?.(target.id);
                        }
                        // remove request
                        const raw = localStorage.getItem("my-prompt-restore-requests");
                        const arr = raw ? JSON.parse(raw) : [];
                        const next = arr.filter((x: any) => x.id !== r.id);
                        localStorage.setItem("my-prompt-restore-requests", JSON.stringify(next));
                        window.dispatchEvent(new Event("restore:updated"));
                        refresh();
                      }}
                      className="rounded-md bg-green-600 px-3 py-1 text-white text-sm"
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => {
                        const raw = localStorage.getItem("my-prompt-restore-requests");
                        const arr = raw ? JSON.parse(raw) : [];
                        const next = arr.filter((x: any) => x.id !== r.id);
                        localStorage.setItem("my-prompt-restore-requests", JSON.stringify(next));
                        window.dispatchEvent(new Event("restore:updated"));
                        refresh();
                      }}
                      className="rounded-md border px-3 py-1 text-sm"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
      {showPromo ? <PromoModal open={showPromo} onClose={() => setShowPromo(false)} /> : null}
      <PromoEditor open={editorOpen} onClose={() => setEditorOpen(false)} />
    </div>
  );
}

function KeySetter() {
  return (
    <div className="mt-3">
      <OpenAIKeySetter />
    </div>
  );
}
