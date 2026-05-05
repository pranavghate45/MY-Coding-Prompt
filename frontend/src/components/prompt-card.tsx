import type { PromptItem } from "@/lib/mock-data";

const statusClassMap: Record<PromptItem["status"], string> = {
  active: "border-[var(--app-border)] bg-[var(--app-surface-2)] text-[var(--app-text)]",
  draft: "border-[var(--app-border)] bg-[var(--app-surface-2)] text-[var(--app-muted)]",
  archived: "border-[var(--app-border)] bg-[var(--app-surface-2)] text-[var(--app-muted)]",
};

type PromptCardProps = {
  item: PromptItem;
};

export function PromptCard({ item }: PromptCardProps) {
  return (
    <article className="app-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-[var(--app-text)]">{item.title}</h3>
          <p className="mt-1 text-sm text-[var(--app-muted)]">{item.category}</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClassMap[item.status]}`}>
          {item.status}
        </span>
      </div>

      <p className="mt-4 line-clamp-2 text-sm leading-6 text-[var(--app-muted)]">{item.preview}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {item.tags.map((tag) => (
          <span key={tag} className="rounded-full border border-[var(--app-border)] bg-[var(--app-surface-2)] px-2.5 py-1 text-xs font-medium text-[var(--app-muted)]">
            #{tag}
          </span>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between text-xs text-[var(--app-muted)]">
        <span>Updated {item.lastUpdated}</span>
        <span>{item.usageCount.toLocaleString()} runs</span>
      </div>
    </article>
  );
}
