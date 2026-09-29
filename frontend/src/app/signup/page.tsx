"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";

export default function SignupPage() {
  const router = useRouter();
  const { signup, isAuthenticated, isReady } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [collegeId, setCollegeId] = useState("");
  const [desiredPlan, setDesiredPlan] = useState<"free" | "paid">("free");
  const [developerType, setDeveloperType] = useState<"frontend" | "backend" | "full_stack">("full_stack");

  useEffect(() => {
    if (isReady && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, isReady, router]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // prevent creating an account with the reserved admin email
    if (email.trim().toLowerCase() === "myprompt@gmail.com") {
      alert("Cannot create account with reserved email.");
      return;
    }
    // Password policy: first letter uppercase, remaining letters lowercase (digits/special allowed),
    // must include at least one number and one special character.
    const pwd = password || "";
    const policy = /^(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>\/?`~])[A-Z][a-z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>\/?`~]+$/;
    if (!policy.test(pwd)) {
      alert("Password must start with an uppercase letter, have remaining letters lowercase, and include at least one number and one special character.");
      return;
    }

    // Always create accounts as 'free' initially. Paid access requires checkout + admin approval.
    await signup(name, email, password, "free", developerType, collegeId);
    if (desiredPlan === "paid") {
      // send user to billing to purchase
      router.push("/billing");
      return;
    }
    router.push("/dashboard");
  };

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="ui-form-card">
        <h1 className="text-2xl font-semibold text-[var(--app-text)]">Create your account</h1>
        <p className="mt-1 text-sm text-[var(--app-muted)]">Start using My Coding Prompt — choose a plan to get started.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="ui-section space-y-3">
            <p className="ui-section-title">Profile information</p>
            <div className="ui-grid-2">
              <label className="ui-field md:col-span-2">
                <span className="ui-label">Full name</span>
                <input
                  type="text"
                  required
                  placeholder="Jane Doe"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="ui-input"
                />
              </label>

              <label className="ui-field md:col-span-2">
                <span className="ui-label">Email address</span>
                <input
                  type="email"
                  required
                  placeholder="you@company.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="ui-input"
                />
              </label>

              <label className="ui-field md:col-span-2">
                <span className="ui-label">Password</span>
                <input
                  type="password"
                  required
                  placeholder="Start with uppercase + include number and symbol"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="ui-input"
                />
                <span className="ui-helper">Must start with uppercase, then lowercase letters, and include at least one number and one special character.</span>
              </label>

              <label className="ui-field md:col-span-2">
                <span className="ui-label">College ID (Optional)</span>
                <input
                  type="text"
                  placeholder="Your college ID (for student plan verification)"
                  value={collegeId}
                  onChange={(event) => setCollegeId(event.target.value)}
                  className="ui-input"
                />
                <span className="ui-helper">If you're a student, enter your college ID to unlock paid plan features for free.</span>
              </label>
            </div>
          </div>

          <div className="ui-section space-y-2">
            <p className="ui-section-title">Developer type</p>
            <p className="ui-helper">Choose the role that best matches your day-to-day workflow.</p>
            <div className="ui-choice-grid cols-3">
              <label className={`ui-choice text-sm ${developerType === "frontend" ? "active" : ""}`}>
                <input type="radio" name="developerType" checked={developerType === "frontend"} onChange={() => setDeveloperType("frontend")} className="mr-2" />
                Frontend
              </label>
              <label className={`ui-choice text-sm ${developerType === "backend" ? "active" : ""}`}>
                <input type="radio" name="developerType" checked={developerType === "backend"} onChange={() => setDeveloperType("backend")} className="mr-2" />
                Backend
              </label>
              <label className={`ui-choice text-sm ${developerType === "full_stack" ? "active" : ""}`}>
                <input type="radio" name="developerType" checked={developerType === "full_stack"} onChange={() => setDeveloperType("full_stack")} className="mr-2" />
                Full Stack
              </label>
            </div>
          </div>

          <div className="ui-section space-y-2">
            <p className="ui-section-title">Plan selection</p>
            <p className="ui-helper">You can always upgrade later from billing settings.</p>
            <div className="ui-choice-grid cols-2">
              <label className={`ui-choice text-sm ${desiredPlan === "free" ? "active" : ""}`}>
                <input type="radio" name="plan" checked={desiredPlan === "free"} onChange={() => setDesiredPlan("free")} className="mr-2" />
                Free
              </label>
              <label className={`ui-choice text-sm ${desiredPlan === "paid" ? "active" : ""}`}>
                <input type="radio" name="plan" checked={desiredPlan === "paid"} onChange={() => setDesiredPlan("paid")} className="mr-2" />
                Paid Pro (purchase required)
              </label>
            </div>
          </div>

          <button type="submit" className="btn btn-primary w-full">Create Account</button>
        </form>
      </div>

      <p className="mt-4 text-center text-sm text-[var(--app-muted)]">
        Already have an account? <Link href="/login" className="text-[var(--app-text)] font-semibold">Login</Link>
      </p>
    </div>
  );
}
