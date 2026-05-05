import Link from "next/link";

export default function UserPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5">
        <h1 className="text-2xl font-semibold text-[var(--app-text)]">User Panel</h1>
        <p className="mt-1 text-sm text-[var(--app-muted)]">Your personal workspace: projects, prompts, and model preferences.</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/projects" className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] px-4 py-2 text-sm font-medium text-[var(--app-text)]">
            My Projects
          </Link>
          <Link href="/prompt-generator" className="rounded-xl bg-[var(--app-text)] px-4 py-2 text-sm font-semibold text-[var(--app-bg)]">
            Create Project
          </Link>
        </div>
      </section>
    </div>
  );
}
