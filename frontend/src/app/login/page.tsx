"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useAuth, AuthUser } from "@/components/auth-provider";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isReady } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showDeletedRequest, setShowDeletedRequest] = useState(false);

  useEffect(() => {
    if (isReady && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, isReady, router]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // block attempts to use the reserved admin email on the user login form
    if (email.trim().toLowerCase() === "myprompt@gmail.com") {
      alert("Not found");
      return;
    }
    const ok = await login(email, password);
    if (!ok) {
      // If the account exists and is deleted, show restore request UI
      try {
        const rawUsers = localStorage.getItem("my-prompt-users");
        const users = rawUsers ? (JSON.parse(rawUsers) as AuthUser[]) : [];
        // find by current email or by backed-up original email (emailBackup)
        const existing = users.find((u) => u.email === email || u.emailBackup === email);
        if (existing && existing.role === "admin") {
          alert("Not found");
        } else if (existing && existing.deleted) {
          // show deleted-account restore UI
          setShowDeletedRequest(true);
        } else {
          alert("Invalid email or password");
        }
      } catch {
        alert("Invalid email or password");
      }
      return;
    }

    // no inline admin promotion here — admins should use the separate admin login flow

    // After successful login, route based on the user's role so admins go to /admin
    try {
      const raw = localStorage.getItem("my-prompt-auth-user");
      const parsed = raw ? (JSON.parse(raw) as AuthUser | null) : null;
      if (parsed && parsed.role === "admin") {
        router.push("/admin");
        return;
      }
    } catch {
      /* ignore */
    }

    router.push("/dashboard");
  };

  return (
    <div className="mx-auto w-full max-w-lg">
      <div className="ui-form-card">
        <h1 className="text-2xl font-semibold text-[var(--app-text)]">Welcome back</h1>
        <p className="mt-1 text-sm text-[var(--app-muted)]">Log in to continue to your AI workspace.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="ui-section space-y-3">
            <p className="ui-section-title">Account details</p>

            <label className="ui-field">
              <span className="ui-label">Email address</span>
              <input
                type="email"
                required
                placeholder="you@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="ui-input"
              />
              <span className="ui-helper">Use the email you registered with.</span>
            </label>

            <label className="ui-field">
              <span className="ui-label">Password</span>
              <input
                type="password"
                required
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="ui-input"
              />
              <span className="ui-helper">Passwords are case-sensitive.</span>
            </label>
          </div>

          <button type="submit" className="btn btn-primary w-full">Login</button>

        </form>
        {showDeletedRequest ? (
          <div className="mt-4 p-4 rounded-lg border border-red-200 bg-red-50">
            <div className="font-semibold">Your account has been deleted</div>
            <div className="mt-2 text-sm text-[var(--app-muted)]">Your account has been deleted. You will need to submit a request to restore it.</div>
            <div className="mt-3">
              <button
                onClick={() => {
                  try {
                    const raw = localStorage.getItem("my-prompt-restore-requests");
                    const existing = raw ? JSON.parse(raw) as Array<any> : [];
                    const req = {
                      id: `r-${Date.now()}`,
                      email: email,
                      message: `I request my account (${email}) be restored.`,
                      createdAt: Date.now()
                    };
                    existing.unshift(req);
                    localStorage.setItem("my-prompt-restore-requests", JSON.stringify(existing));
                    // notify admin UI
                    window.dispatchEvent(new Event("restore:updated"));
                    setShowDeletedRequest(false);
                    alert("Restore request submitted. Admins will review it in the admin panel.");
                  } catch (err) {
                    console.error(err);
                    alert("Failed to submit request. Please contact support.");
                  }
                }}
                className="mt-2 btn btn-primary"
              >
                Request Restore from Admin
              </button>
              <button onClick={() => setShowDeletedRequest(false)} className="mt-2 ml-2 px-3 py-2 rounded border">Cancel</button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-3 text-center text-sm">
        <Link href="/admin/login" className="text-[var(--app-muted)] hover:text-[var(--app-text)] underline">Admin login</Link>
      </div>

      <p className="mt-4 text-center text-sm text-[var(--app-muted)]">
        New here? <Link href="/signup" className="text-[var(--app-text)] font-semibold">Create account</Link>
      </p>
    </div>
  );
}
