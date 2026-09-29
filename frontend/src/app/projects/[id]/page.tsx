"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import type { WebsiteProProject } from "@/lib/website-pro-store";
import PaymentModal from "@/components/PaymentModal";
import { useAuth } from "@/components/auth-provider";

export default function ProjectDetail() {
  const params = useParams();
  const id = params?.id;
  const router = useRouter();

  const [project, setProject] = useState<WebsiteProProject | null>(null);
  const [selectedPromptIndex, setSelectedPromptIndex] = useState(0);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentPlan, setPaymentPlan] = useState<{ name: string; price: number; key: string } | null>(null);
  const { setPlan, setPlanTier, user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!id) return;
    fetch("/api/website-pro/projects")
      .then((r) => r.json())
      .then((d) => {
        const found = (d.projects as WebsiteProProject[]).find((p) => p.id === id);
        setProject(found || null);
      })
      .catch((e) => console.error(e))
  }, [id]);

  if (!id || !project || project.id !== id) return <div className="p-6">Loading project…</div>;
  if (!project)
    return (
      <div className="p-6">
        <p>Project not found.</p>
        <button onClick={() => router.push("/projects")} className="mt-3 btn">
          Back to projects
        </button>
      </div>
    );

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">{project.siteType}</h1>
      <div className="flex gap-2">
        <button onClick={() => router.push(`/projects?projectId=${id}`)} className="btn btn-primary">
          Edit project
        </button>
        <button onClick={() => router.push("/projects")} className="btn btn-secondary">
          Back to projects
        </button>
      </div>
      <div className="flex gap-6">
        <div>
          <p className="text-sm text-[var(--app-muted)]">Target: {project.target || "Website"}</p>
          <p className="text-sm text-[var(--app-muted)]">Framework: {project.framework}</p>
          <p className="text-sm text-[var(--app-muted)]">Style System: {project.styleSystem}</p>
        </div>
        <div>
          <p className="text-sm text-[var(--app-muted)]">Backend: {project.backend}</p>
          <p className="text-sm text-[var(--app-muted)]">Database: {project.database}</p>
          <p className="text-sm text-[var(--app-muted)]">Created: {new Date(project.createdAt).toLocaleString()}</p>
          {project.updatedAt ? <p className="text-sm text-[var(--app-muted)]">Updated: {new Date(project.updatedAt).toLocaleString()}</p> : null}
        </div>
      </div>

      <div className="mt-4 rounded-lg border p-4 bg-[var(--app-surface-2)]">
        <h3 className="font-semibold">Generated Plan</h3>
        {project.plan && Array.isArray(project.plan) ? (
          <ol className="mt-2 list-decimal list-inside space-y-1 text-sm">
            {project.plan.map((step: string, i: number) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        ) : (
          <p className="text-sm">No plan available.</p>
        )}
      </div>

      {project.generatedPrompt ? (
        <div className="mt-4 rounded-lg border p-4 bg-[var(--app-surface-2)]">
          <h3 className="font-semibold">Generated Prompt</h3>
          {project.generatedPromptTitle ? <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--app-muted)]">{project.generatedPromptTitle}</p> : null}
          <pre className="mt-3 whitespace-pre-wrap rounded-md bg-[var(--app-surface)] p-3 text-sm">{project.generatedPrompts && project.generatedPrompts[selectedPromptIndex] ? project.generatedPrompts[selectedPromptIndex].prompt : project.generatedPrompt}</pre>

          {project.generatedPrompts && project.generatedPrompts.length ? (
            <div className="mt-3 flex flex-wrap gap-3">
              {project.generatedPrompts.map((v, i) => {
                const isPaidUser = Boolean(user && (user.plan === 'paid' || (user.planTier && user.planTier !== 'free') || user.role === 'admin'));
                const isLocked = !!v.locked && !isPaidUser;
                return (
                  <button
                    key={v.title}
                    type="button"
                    onClick={async () => {
                      if (isLocked) {
                        const mapping: Record<string, { name: string; price: number; key: string }> = {
                          Optimized: { name: 'Pro', price: 16864, key: 'pro' },
                          Pro: { name: 'Pro', price: 16864, key: 'pro' },
                          Premium: { name: 'Elite', price: 1999, key: 'elite' },
                        };
                        const plan = mapping[v.title] ?? { name: 'Pro', price: 16864, key: 'pro' };
                        setPaymentPlan(plan);
                        setPaymentOpen(true);
                        return;
                      }

                      // update displayed variant locally
                      setSelectedPromptIndex(i);

                      // also patch project so selected variant becomes the saved generatedPrompt
                      try {
                        const res = await fetch(`/api/website-pro/projects/${project.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            siteType: project.siteType,
                            framework: project.framework,
                            styleSystem: project.styleSystem,
                            backend: project.backend,
                            database: project.database,
                            goal: project.goal,
                            generatedPrompt: v.prompt,
                            generatedPromptTitle: v.title,
                            generatedPrompts: project.generatedPrompts,
                          }),
                        });
                        if (res.ok) {
                          const d = await res.json();
                          setProject(d.project);
                        }
                      } catch (e) {
                        // ignore
                      }
                    }}
                    className={`rounded-2xl border px-3 py-2 text-sm font-medium ${selectedPromptIndex === i ? 'variant-selected' : 'border-[var(--app-border)] bg-[var(--app-surface-2)]'}`}
                  >
                      <div className="flex items-center gap-2">
                        <span>{v.title}</span>
                      </div>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}

      {project.group ? (
        <div className="mt-4 rounded-lg border p-4 bg-[var(--app-surface-2)]">
          <h3 className="font-semibold">Group</h3>
          <p className="text-sm">{project.group.name || "Unnamed group"}</p>
          {project.group.members && project.group.members.length ? (
            <ul className="mt-2 list-disc list-inside text-sm">
              {project.group.members.map((m: string, i: number) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--app-muted)]">No members</p>
          )}
        </div>
      ) : null}

      <div className="mt-4 rounded-lg border p-4 bg-[var(--app-surface-2)]">
        <p className="text-sm">Goal: {project.goal}</p>
        <p className="mt-2 text-sm text-[var(--app-muted)]">You can edit this project from here or open the general projects page to change its inputs and save a new version.</p>
      </div>
      <PaymentModal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        onPay={(details) => {
          setPaymentOpen(false);
          try {
            if (paymentPlan) {
              setPlan('paid');
              setPlanTier(paymentPlan.key === 'elite' ? 'elite' : 'pro');
            }
          } catch {}
        }}
        plan={paymentPlan ?? { name: 'Pro', price: 16864, key: 'pro' }}
        loading={false}
        loggedIn={Boolean(isAuthenticated)}
        userEmail={user?.email}
      />
    </div>
  );
}
