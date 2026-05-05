import { modelCatalog } from "@/lib/mock-data";

export default function PromptsPage() {
  return (
    <div className="space-y-5">
      <section className="app-card p-5">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--app-muted)]">Model Discovery</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--app-text)]">Find the best model for every task.</h2>
        <p className="mt-2 text-sm text-[var(--app-muted)]">Compare model strengths, context limits, and speed before starting your chat.</p>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--app-text)]">Discover Models</h2>
        <div className="flex gap-2">
          <button className="btn btn-secondary">Filter</button>
          <button className="btn btn-secondary">Sort</button>
        </div>
      </div>

      <section className="flex flex-wrap gap-2">
        {[
          "Best for Coding",
          "Best for Research",
          "Long Context",
          "Low Latency",
          "Multimodal",
        ].map((chip) => (
          <button key={chip} className="rounded-full border border-[var(--app-border)] bg-[var(--app-surface-2)] px-3 py-1.5 text-xs text-[var(--app-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]">
            {chip}
          </button>
        ))}
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {modelCatalog.map((model) => (
          <article key={model.id} className="app-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-[var(--app-text)]">{model.name}</h3>
                <p className="text-sm text-[var(--app-muted)]">{model.provider}</p>
              </div>
              <span className="rounded-full border border-[var(--app-border)] bg-[var(--app-surface-2)] px-2.5 py-1 text-xs text-[var(--app-muted)]">{model.speed}</span>
            </div>

            <p className="mt-3 text-sm leading-6 text-[var(--app-muted)]">{model.specialty}</p>

            <div className="mt-4 flex items-center justify-between text-xs text-[var(--app-muted)]">
              <span>Context window</span>
              <span className="font-semibold text-[var(--app-text)]">{model.contextWindow}</span>
            </div>

            <button className="mt-4 w-full btn btn-primary">Start with {model.name}</button>
          </article>
        ))}
      </div>

      <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5">
        <h3 className="text-lg font-semibold text-[var(--app-text)]">Featured Bundles</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] p-3">
            <p className="text-sm font-semibold text-[var(--app-text)]">Code Pro Stack</p>
            <p className="mt-1 text-xs text-[var(--app-muted)]">High-accuracy + analysis models for architecture and refactors.</p>
          </div>
          <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] p-3">
            <p className="text-sm font-semibold text-[var(--app-text)]">Research Stack</p>
            <p className="mt-1 text-xs text-[var(--app-muted)]">Search-optimized + long-context models for sourced insights and long docs.</p>
          </div>
          <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] p-3">
            <p className="text-sm font-semibold text-[var(--app-text)]">Startup Stack</p>
            <p className="mt-1 text-xs text-[var(--app-muted)]">Fast + balanced models for speed, quality, and product writing.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
