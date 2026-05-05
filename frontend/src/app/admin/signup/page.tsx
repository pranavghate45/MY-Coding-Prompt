"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, AuthUser } from "@/components/auth-provider";

export default function AdminSignupPage() {
  const router = useRouter();
  const { signup, setUserRole, listUsers, setUserApiKey } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secret, setSecret] = useState("");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const users = listUsers?.() ?? [];
    const hasAdmin = users.some((u) => u.role === "admin");

    const storedSecret = localStorage.getItem("my-prompt-admin-secret") || "admin-secret";

    if (hasAdmin && secret !== storedSecret) {
      alert("Admin secret required to create additional admins.");
      return;
    }

    await signup(name, email, password, "paid");

    try {
      const raw = localStorage.getItem("my-prompt-auth-user");
      if (raw) {
        const created = JSON.parse(raw) as AuthUser | null;
        if (created) {
          setUserRole?.(created.id, "admin");
          // grant an API key for admin by default
          const apiKey = `sk-${Math.random().toString(36).slice(2, 12)}`;
          setUserApiKey?.(created.id, apiKey);
        }
      }
    } catch {
      /* ignore */
    }

    router.push("/admin");
  };

  return (
    <div className="mx-auto w-full max-w-md rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6">
      <h1 className="text-2xl font-semibold text-[var(--app-text)]">Create Admin Account</h1>
      <p className="mt-1 text-sm text-[var(--app-muted)]">Create a new admin. If admins already exist you must provide the admin secret.</p>

      <form onSubmit={onSubmit} className="mt-5 space-y-3">
        <input required placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border px-3 py-2" />
        <input required type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border px-3 py-2" />
        <input required type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border px-3 py-2" />

        <input placeholder="Admin secret (if required)" value={secret} onChange={(e)=>setSecret(e.target.value)} className="w-full rounded-xl border px-3 py-2" />

        <div className="flex justify-end">
          <button type="submit" className="rounded-xl bg-[var(--app-text)] px-4 py-2 text-[var(--app-bg)]">Create Admin</button>
        </div>
      </form>
    </div>
  );
}
