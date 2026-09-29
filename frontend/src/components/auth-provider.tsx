"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import PromoModal from "./PromoModal";
import PromoEditor from "./PromoEditor";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  developerType?: "frontend" | "backend" | "full_stack";
  plan: "free" | "paid";
  planTier?: "free" | "pro" | "elite";
  role?: "admin" | "user";
  apiKey?: string | null;
  password?: string;
  approved?: boolean;
  deleted?: boolean;
  emailBackup?: string | null;
  college_id?: string | null;
  student_id_verified?: boolean;
};

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isReady: boolean;
  plan: "free" | "paid";
  login: (email: string, password: string, options?: { allowAdmin?: boolean }) => Promise<boolean>;
  signup: (name: string, email: string, password: string, plan?: "free" | "paid", developerType?: "frontend" | "backend" | "full_stack", collegeId?: string) => Promise<boolean>;
  setPlan: (plan: "free" | "paid") => void;
  setPlanTier: (tier: "free" | "pro" | "elite") => void;
  logout: () => void;
  // Admin methods
  listUsers?: () => AuthUser[];
  setUserRole?: (userId: string, role: "admin" | "user") => void;
  setUserApiKey?: (userId: string, apiKey: string | null) => void;
  setUserPlan?: (userId: string, plan: "free" | "paid") => void;
  setUserApproval?: (userId: string, approved: boolean) => void;
  deleteUser?: (userId: string) => void;
  setUserRestore?: (userId: string) => void;
};

const AUTH_STORAGE_KEY = "my-prompt-auth-user";
const USERS_STORAGE_KEY = "my-prompt-users";
const SECURITY_STORAGE_KEY = "my-prompt-security-settings";
const LAST_ACTIVE_KEY = "my-prompt-last-active";

type SecuritySettings = {
  requireTwoFactor: boolean;
  enforceSso: boolean;
  sessionTimeoutEnabled: boolean;
  sessionTimeoutMinutes: number;
  unusualLoginAlerts: boolean;
};

const defaultSecuritySettings: SecuritySettings = {
  requireTwoFactor: true,
  enforceSso: false,
  sessionTimeoutEnabled: true,
  sessionTimeoutMinutes: 60,
  unusualLoginAlerts: true,
};

function getSecuritySettings(): SecuritySettings {
  if (typeof window === "undefined") {
    return defaultSecuritySettings;
  }

  try {
    const raw = localStorage.getItem(SECURITY_STORAGE_KEY);
    if (!raw) {
      return defaultSecuritySettings;
    }
    const parsed = JSON.parse(raw) as Partial<SecuritySettings>;
    return {
      requireTwoFactor: parsed.requireTwoFactor ?? defaultSecuritySettings.requireTwoFactor,
      enforceSso: parsed.enforceSso ?? defaultSecuritySettings.enforceSso,
      sessionTimeoutEnabled: parsed.sessionTimeoutEnabled ?? defaultSecuritySettings.sessionTimeoutEnabled,
      sessionTimeoutMinutes: parsed.sessionTimeoutMinutes ?? defaultSecuritySettings.sessionTimeoutMinutes,
      unusualLoginAlerts: parsed.unusualLoginAlerts ?? defaultSecuritySettings.unusualLoginAlerts,
    };
  } catch {
    return defaultSecuritySettings;
  }
}

const DEFAULT_ADMIN_EMAIL = "myprompt@gmail.com";
const DEFAULT_ADMIN_PASSWORD = "Myprompt@123";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [showPromo, setShowPromo] = useState(false);
  // promo timer is handled inside PromoModal; do not auto-close from here
  const [editorOpen, setEditorOpen] = useState(false);

  // Utility to generate compact unique ids for local-only entities.
  const generateId = (prefix = "id") => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;

  function loadUsers(): AuthUser[] {
    try {
      const raw = localStorage.getItem(USERS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as AuthUser[];
      // Normalize and dedupe ids to avoid duplicate-key issues in the UI.
      const seen = new Set<string>();
      const normalized: AuthUser[] = parsed.map((u) => {
        const next = { ...u } as AuthUser;
        if (!next.id || seen.has(next.id)) {
          next.id = generateId(next.role === 'admin' ? 'admin' : 'u');
        }
        seen.add(next.id);
        return next;
      });
      // Persist normalized list back to storage so subsequent loads are clean and
      // to avoid duplicate-key issues caused by old or malformed data.
      try { localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(normalized)); } catch {}
      return normalized;
    } catch {
      return [];
    }
  }

  function saveUsers(users: AuthUser[]) {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    try {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("users:updated"));
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AuthUser>;
        setUser({
          id: parsed.id ?? generateId("u"),
          name: parsed.name ?? "User",
          email: parsed.email ?? "user@example.com",
          developerType: (parsed.developerType as "frontend" | "backend" | "full_stack") ?? "full_stack",
          plan: parsed.plan ?? "free",
          planTier: (parsed.planTier as "free" | "pro" | "elite") ?? ((parsed.plan ?? "free") === "paid" ? "pro" : "free"),
          role: (parsed.role as "admin" | "user") ?? "user",
          apiKey: parsed.apiKey ?? null,
          password: parsed.password ?? undefined,
          approved: parsed.approved ?? false,
        });
      }
    } finally {
      setIsReady(true);
    }
  }, []);

  // persist function: store current auth to localStorage and sync users list
  const persist = useCallback((nextUser: AuthUser | null) => {
    if (nextUser) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextUser));
      // ensure user exists in users list
      const users = loadUsers();
      const exists = users.find((u) => u.id === nextUser.id || u.email === nextUser.email);
      if (exists) {
        const updated = users.map((u) => (u.id === exists.id ? nextUser : u));
        saveUsers(updated);
      } else {
        saveUsers([nextUser, ...users]);
      }
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
    setUser(nextUser);
    // promo display is handled explicitly on signup only
  }, []);

  // Sync auth state when localStorage changes (payment flows may update auth in another window or iframe)
  useEffect(() => {
    const syncFromStorage = () => {
      try {
        const raw = localStorage.getItem(AUTH_STORAGE_KEY);
        if (!raw) {
          persist(null);
          return;
        }
        const parsed = JSON.parse(raw) as Partial<AuthUser>;
        const nextUser: AuthUser = {
          id: parsed.id ?? generateId("u"),
          name: parsed.name ?? "User",
          email: parsed.email ?? "user@example.com",
          developerType: (parsed.developerType as "frontend" | "backend" | "full_stack") ?? "full_stack",
          plan: parsed.plan ?? "free",
          planTier: (parsed.planTier as "free" | "pro" | "elite") ?? ((parsed.plan ?? "free") === "paid" ? "pro" : "free"),
          role: (parsed.role as "admin" | "user") ?? "user",
          apiKey: parsed.apiKey ?? null,
          password: parsed.password ?? undefined,
          approved: parsed.approved ?? false,
        };
        persist(nextUser);
      } catch {
        // ignore parse errors
      }
    };

    const storageHandler = (e: StorageEvent) => {
      if (!e.key) return;
      if (e.key === AUTH_STORAGE_KEY || e.key === "my-prompt-pending-tier") {
        syncFromStorage();
      }
    };

    const visibilityHandler = () => {
      if (document.visibilityState === "visible") {
        syncFromStorage();
      }
    };

    window.addEventListener("storage", storageHandler);
    document.addEventListener("visibilitychange", visibilityHandler);
    return () => {
      window.removeEventListener("storage", storageHandler);
      document.removeEventListener("visibilitychange", visibilityHandler);
    };
  }, [persist]);

  // Ensure there is a default admin account for local development
  useEffect(() => {
    const users = loadUsers();
    const hasAdmin = users.some((u) => u.role === "admin");
    if (!hasAdmin) {
      const defaultAdmin: AuthUser = {
        id: generateId("admin"),
        name: "Admin",
        email: "myprompt@gmail.com",
        developerType: "full_stack",
        plan: "paid",
        planTier: "elite",
        role: "admin",
        apiKey: `sk-${Math.random().toString(36).slice(2, 12)}`,
        password: "Myprompt@123",
        approved: true,
      };
      saveUsers([defaultAdmin, ...users]);
    }
  }, []);


  useEffect(() => {
    if (!user) {
      localStorage.removeItem(LAST_ACTIVE_KEY);
      return;
    }

    const security = getSecuritySettings();
    if (!security.sessionTimeoutEnabled) {
      return;
    }

    const timeoutMs = Math.max(5, security.sessionTimeoutMinutes) * 60 * 1000;

    const markActivity = () => {
      localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
    };

    const checkSession = () => {
      const lastActive = Number(localStorage.getItem(LAST_ACTIVE_KEY) || Date.now());
      if (Date.now() - lastActive >= timeoutMs) {
        persist(null);
      }
    };

    markActivity();
    const events: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "scroll", "touchstart"];
    events.forEach((eventName) => window.addEventListener(eventName, markActivity, { passive: true }));
    const intervalId = window.setInterval(checkSession, 15000);

    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, markActivity));
      window.clearInterval(intervalId);
    };
  }, [user, persist]);

  // If the current user is an admin, always show the promo so admin can manage it
  // Promo UI is managed from the admin page only. Do not auto-open here.
  // Show promo automatically for regular users on their first login only.
  useEffect(() => {
    try {
      if (!user) return;
      if (user.role === "admin") return; // admins do not get auto promos
      // Do not auto-open the promo on certain pages (e.g., billing) where it would block actions
      try {
        if (typeof window !== 'undefined') {
          const path = window.location.pathname || "";
          if (path.startsWith("/billing") || path.startsWith("/upgrade")) {
            // mark promo as shown but do not open it here
            const promoKey = `promo_shown_${user.email}`;
            localStorage.setItem(promoKey, String(Date.now()));
            return;
          }
        }
      } catch {}

      const promoKey = `promo_shown_${user.email}`;
      const already = localStorage.getItem(promoKey);
      if (!already) {
        // mark shown and open
        localStorage.setItem(promoKey, String(Date.now()));
        setShowPromo(true);
      }
    } catch {
      // ignore
    }
  }, [user]);

  

  const login = async (email: string, password: string, options?: { allowAdmin?: boolean }) => {
    // Explicit admin credential check: ensure admin credentials only authenticate when allowAdmin is true
    if (email === DEFAULT_ADMIN_EMAIL && password === DEFAULT_ADMIN_PASSWORD) {
      if (!options?.allowAdmin) {
        return false;
      }

      // ensure admin exists and persist as current user
      const users = loadUsers();
      let admin = users.find((u) => u.email === DEFAULT_ADMIN_EMAIL && u.role === "admin");
      if (!admin) {
        admin = {
          id: generateId("admin"),
          name: "Admin",
          email: DEFAULT_ADMIN_EMAIL,
          developerType: "full_stack",
          plan: "paid",
          role: "admin",
          apiKey: `sk-${Math.random().toString(36).slice(2, 12)}`,
          password: DEFAULT_ADMIN_PASSWORD,
          approved: true,
        } as AuthUser;
        saveUsers([admin, ...users]);
      }
      persist(admin);
      return true;
    }
    const users = loadUsers();
    const found = users.find((u) => u.email === email);
    if (!found) {
      // Do not auto-create users on login. Require explicit signup first.
      return false;
    }
    // If the user is soft-deleted, deny login
    if (found.deleted) return false;
    // Prevent admin accounts from logging in via the regular user login when not allowed
    const allowAdmin = options?.allowAdmin ?? false;
    if (found.role === "admin" && !allowAdmin) {
      return false;
    }

    // If user has a password set, validate it
    if (found.password && password !== found.password) {
      return false;
    }

    persist(found);
    return true;
  };

  const signup = async (
    name: string,
    email: string,
    password: string,
    plan: "free" | "paid" = "free",
    developerType: "frontend" | "backend" | "full_stack" = "full_stack",
    collegeId?: string,
  ) => {
    const users = loadUsers();

    let resolvedId = `u-${Date.now()}`;
    let resolvedDeveloperType: "frontend" | "backend" | "full_stack" = developerType;

    try {
      const base = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
      const res = await fetch(`${base}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || "User",
          email,
          password,
          developer_type: developerType,
          college_id: collegeId || null,
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as { id?: number | string; developer_type?: string };
        if (typeof data.id === "number" || typeof data.id === "string") {
          resolvedId = String(data.id);
        }
        if (data.developer_type === "frontend" || data.developer_type === "backend" || data.developer_type === "full_stack") {
          resolvedDeveloperType = data.developer_type;
        }
      }
    } catch {
      // fallback to local-only signup behavior if backend is unavailable
    }

    const newUser: AuthUser = {
      id: resolvedId,
      name: name.trim() || "User",
      email,
      developerType: resolvedDeveloperType,
      plan,
      planTier: plan === "paid" ? "pro" : "free",
      role: "user",
      apiKey: null,
      password,
      approved: false,
      deleted: false,
      emailBackup: null,
    };
    saveUsers([newUser, ...users]);
    persist(newUser);
    // show promo on explicit signup
    try {
      const promoKey = `promo_shown_${newUser.email}`;
      localStorage.setItem(promoKey, String(Date.now()));
    } catch {}
    // Do not auto-show promo on signup; admin page manages promo visibility.
    // keep the promo visible until user interacts with PromoModal; PromoModal enforces timer
    return true;
  };

  const setPlan = (plan: "free" | "paid") => {
    if (!user) {
      return;
    }
    persist({ ...user, plan, planTier: plan === "free" ? "free" : (user.planTier === "elite" ? "elite" : "pro") });
  };

  const setPlanTier = (tier: "free" | "pro" | "elite") => {
    if (!user) {
      return;
    }
    persist({ ...user, plan: tier === "free" ? "free" : "paid", planTier: tier });
  };

  const logout = () => {
    persist(null);
  };

  const value: AuthContextValue = {
    user,
    isAuthenticated: Boolean(user),
    isReady,
    plan: user?.plan ?? "free",
    login,
    signup,
    setPlan,
    setPlanTier,
    logout,
    listUsers: () => loadUsers(),
    setUserRole: (userId: string, role: "admin" | "user") => {
      // Prevent changing the role of the currently authenticated user to avoid accidental lockout
      if (user?.id === userId) {
        return;
      }

      const users = loadUsers();
      const updated = users.map((u) => (u.id === userId ? { ...u, role } : u));
      saveUsers(updated);
    },
    setUserApiKey: (userId: string, apiKey: string | null) => {
      const users = loadUsers();
      const updated = users.map((u) => (u.id === userId ? { ...u, apiKey } : u));
      saveUsers(updated);
      if (user?.id === userId) persist({ ...user, apiKey });
    },
    setUserPlan: (userId: string, plan: "free" | "paid") => {
      const users = loadUsers();
      const updated = users.map((u) => (u.id === userId ? { ...u, plan } : u));
      saveUsers(updated);
      if (user?.id === userId) persist({ ...user, plan });
    },
    setUserApproval: (userId: string, approved: boolean) => {
      const users = loadUsers();
      const updated = users.map((u) => (u.id === userId ? { ...u, approved } : u));
      saveUsers(updated);
      if (user?.id === userId) persist({ ...user, approved });
    },
    deleteUser: (userId: string) => {
      const users = loadUsers();
      const updated = users.map((u) => {
        if (u.id !== userId) return u;
        // soft-delete locally: backup email and change email to free it for reuse
        const backup = u.email;
        return { ...u, deleted: true, emailBackup: backup, email: `deleted:${u.id}:${Date.now()}@deleted.local` };
      });
      saveUsers(updated);
      if (user?.id === userId) logout();
    },
    // restore a previously deleted user
    setUserRestore: (userId: string) => {
      const users = loadUsers();
      const updated = users.map((u) => {
        if (u.id !== userId) return u;
        if (!u.deleted) return u;
        return { ...u, deleted: false, email: u.emailBackup ?? u.email, emailBackup: null };
      });
      saveUsers(updated);
    },
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {/* Promo modal shown to regular users on first login only; admins manage promo from admin panel. */}
      {typeof window !== "undefined" ? (
        showPromo ? <PromoModal open={showPromo} onClose={() => setShowPromo(false)} /> : null
      ) : null}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
