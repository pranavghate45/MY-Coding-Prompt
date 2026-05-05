type MetricCardProps = {
  label: string;
  value: string | number;
  trend?: string;
};

export function MetricCard({ label, value, trend }: MetricCardProps) {
  return (
    <div className="app-card p-5 shadow-sm">
      <p className="text-sm text-[var(--app-muted)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-[var(--app-text)]">{value}</p>
      {trend ? <p className="mt-1 text-xs font-medium text-[var(--app-text)]">{trend}</p> : null}
    </div>
  );
}
