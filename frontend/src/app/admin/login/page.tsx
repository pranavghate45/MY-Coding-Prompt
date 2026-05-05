"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";

export default function AdminLoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isReady, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (isReady && isAuthenticated && user?.role === "admin") {
      router.replace("/admin");
    }
  }, [isReady, isAuthenticated, user, router]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await login(email, password, { allowAdmin: true });
    if (!ok) {
      alert("Invalid email or password");
      return;
    }

    const raw = localStorage.getItem("my-prompt-auth-user");
    const current = raw ? JSON.parse(raw) : null;
    if (!current || current.role !== "admin") {
      alert("Access denied: account is not an admin.");
      router.push("/login");
      return;
    }

    router.push("/admin");
  };

  return (
    <div className="mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-zinc-900/70 p-6 backdrop-blur">
      <h1 className="text-2xl font-semibold text-white">Admin Login</h1>
      <p className="mt-1 text-sm text-zinc-400">Login with an admin account to access admin controls.</p>

      <form onSubmit={onSubmit} className="mt-5 space-y-3">
        <input required type="email" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none" />
        <input required type="password" placeholder="Password" value={password} onChange={(e)=>setPassword(e.target.value)} className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none" />

        <div className="flex justify-between items-center">
          <Link href="/login" className="text-sm text-zinc-300">Back to user login</Link>
          <button type="submit" className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-zinc-900">Login as Admin</button>
        </div>
      </form>
    </div>
  );
}
