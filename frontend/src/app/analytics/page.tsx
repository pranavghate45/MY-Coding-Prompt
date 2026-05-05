"use client";

import { useAuth } from "@/components/auth-provider";
import React, { useEffect, useState } from "react";
import SevenDayBar from "@/components/seven-day-bar";

export default function AnalyticsPage() {
  const { plan } = useAuth();
  const [analyticsSummary, setAnalyticsSummary] = useState<any | null>(null);
  const [activityFeed, setActivityFeed] = useState<string[]>([]);
  const [selectedRange, setSelectedRange] = useState<string>("Last 30d");
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "";

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        // map selectedRange to a compact window param: '24h','7d','30d','90d'
        const mapRange = (r: string) => {
          if (r === "Last 24h") return "24h";
          if (r === "Last 7d") return "7d";
          if (r === "Last 30d") return "30d";
          if (r === "Quarter") return "90d";
          return "30d";
        };
        const windowParam = mapRange(selectedRange);
        const s = await fetch(`${apiBase}/ai/analytics/summary?window=${windowParam}`);
        if (s.ok) {
          const json = await s.json();
          if (mounted) setAnalyticsSummary(json);
        }
      } catch (e) {
        // ignore and keep using fallback UI
      }

      try {
        const a = await fetch(`${apiBase}/ai/analytics/activity`);
        if (a.ok) {
          const j = await a.json();
          if (mounted && Array.isArray(j.activity)) setActivityFeed(j.activity);
        }
      } catch (e) {
        // ignore
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [apiBase, selectedRange]);
  const isMixTheme = false;
  const weeklyRuns = [
    { day: "D1", heightClass: "h-[66%]" },
    { day: "D2", heightClass: "h-[76%]" },
    { day: "D3", heightClass: "h-[70%]" },
    { day: "D4", heightClass: "h-[82%]" },
    { day: "D5", heightClass: "h-[88%]" },
    { day: "D6", heightClass: "h-[94%]" },
    { day: "D7", heightClass: "h-full" },
  ];
  const workflowImpact = [
    { label: "Research", share: "38%", widthClass: "w-[38%]", trend: "+6%" },
    { label: "Content Drafting", share: "27%", widthClass: "w-[27%]", trend: "+2%" },
    { label: "Coding", share: "21%", widthClass: "w-[21%]", trend: "+9%" },
    { label: "Support", share: "14%", widthClass: "w-[14%]", trend: "-3%" },
  ];
  const costEfficiency = [
    { label: "Cost per 1K tokens", value: "$0.041", trend: "-9% vs last week" },
    { label: "Budget utilization", value: "63%", trend: "On track" },
    { label: "Savings from routing", value: "$1,284", trend: "+18% this month" },
  ];

  return (
    <div className="space-y-6">
      <section className="app-card p-5">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--app-muted)]">AI Intelligence</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--app-text)]">Insights</h2>
        <p className="mt-2 text-sm text-[var(--app-muted)]">Track model quality, latency, and routing effectiveness in one dashboard.</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {[
            "Last 24h",
            "Last 7d",
            "Last 30d",
            "Quarter",
          ].map((range) => (
            <button
              key={range}
              onClick={() => setSelectedRange(range)}
              className={`range-pill ${selectedRange === range ? 'selected' : ''}`}
            >
              {range}
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="app-card p-4">
          <p className="text-xs text-[var(--app-muted)]">Prompt Retention</p>
          <p className="mt-1 text-xl font-semibold text-[var(--app-text)]">{analyticsSummary?.retention ?? "—"}</p>
        </article>
        <article className="app-card p-4">
          <p className="text-xs text-[var(--app-muted)]">Avg Response Time</p>
          <p className="mt-1 text-xl font-semibold text-[var(--app-text)]">{analyticsSummary?.avgResponseTime ?? "—"}</p>
        </article>
        <article className="app-card p-4">
          <p className="text-xs text-[var(--app-muted)]">Monthly Runs</p>
          <p className="mt-1 text-xl font-semibold text-[var(--app-text)]">{analyticsSummary?.monthlyRuns ? Number(analyticsSummary.monthlyRuns).toLocaleString() : "—"}</p>
        </article>
        <article className="app-card p-4">
          <p className="text-xs text-[var(--app-muted)]">Growth</p>
          <p className={`mt-1 text-xl font-semibold ${isMixTheme ? "text-emerald-400" : "text-[var(--app-text)]"}`}>{analyticsSummary?.runGrowth ?? "—"}</p>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-12">
        <article className="app-card p-5 xl:col-span-12">
          <h3 className="text-lg font-semibold text-[var(--app-text)]">7-Day Trend</h3>
          <p className="mt-1 text-xs text-[var(--app-muted)]">Daily run index (normalized)</p>

          {/* Combined container: SVG overlayed inside the same box above the day columns */}
          <div className="mt-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] p-3">
            {/* 7-day bar chart placed inside the same card */}
            {(() => {
              const trendData = weeklyRuns.map((w) => {
                const m = w.heightClass.match(/(\d+)%?/);
                return m ? Number(m[1]) : 0;
              });
              const labels = weeklyRuns.map((w) => w.day);
              return <SevenDayBar data={trendData} labels={labels} className="w-full" height={120} gap={28} />;
            })()}
          </div>

          <div className={`mt-3 rounded-xl px-3 py-2 text-xs ${isMixTheme ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border border-[var(--app-border)] bg-[var(--app-surface-2)] text-[var(--app-text)]"}`}>
            Peak load +53% vs start of week
          </div>
        </article>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <article className="app-card p-4">
          <p className="text-xs text-[var(--app-muted)]">Top Recommendation</p>
           <p className="mt-1 text-sm text-[var(--app-text)]">Route coding-heavy tasks to a high-accuracy model for consistent quality.</p>
        </article>
        <article className="app-card p-4">
          <p className="text-xs text-[var(--app-muted)]">Optimization</p>
          <p className="mt-1 text-sm text-[var(--app-text)]">Use Sonar Pro on research queries to reduce latency by ~12%.</p>
        </article>
        <article className="app-card p-4">
          <p className="text-xs text-[var(--app-muted)]">Quality Goal</p>
          <p className="mt-1 text-sm text-[var(--app-text)]">Increase average response score from 89 to 93 this month.</p>
        </article>
      </section>

      <section className="app-card p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-[var(--app-text)]">Recent Activity</h3>
          <p className="text-xs text-[var(--app-muted)]">Live operational events</p>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {(activityFeed.length > 0 ? activityFeed : ["No recent activity"]).map((item) => (
            <div key={item} className="app-subcard px-3 py-2 text-sm text-[var(--app-text)]">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-12">
        <article className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 xl:col-span-7">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-[var(--app-text)]">Workflow Impact</h3>
            <p className="text-xs text-[var(--app-muted)]">Where AI usage is concentrated</p>
          </div>
          <div className="mt-3 space-y-2">
            {workflowImpact.map((item) => (
              <div key={item.label} className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-[var(--app-text)]">{item.label}</p>
                  <p className="text-xs font-medium text-[var(--app-text)]">{item.share}</p>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--app-surface)]">
                  <div className={`h-full rounded-full ${isMixTheme ? "bg-gradient-to-r from-fuchsia-500 via-indigo-500 to-cyan-400" : "bg-[var(--app-muted)]"} ${item.widthClass}`} />
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-[var(--app-muted)]">
                  <span>Share of AI sessions</span>
                  <span className={item.trend.startsWith("+") ? (isMixTheme ? "text-emerald-300" : "text-[var(--app-text)]") : (isMixTheme ? "text-amber-300" : "text-[var(--app-text)]")}>{item.trend} WoW</span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 xl:col-span-5">
          <h3 className="text-lg font-semibold text-[var(--app-text)]">Cost Efficiency</h3>
          <p className="mt-1 text-xs text-[var(--app-muted)]">Spend quality per model route</p>
          <div className="mt-3 space-y-2">
            {costEfficiency.map((item) => (
              <div key={item.label} className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] p-3">
                <p className="text-xs text-[var(--app-muted)]">{item.label}</p>
                <p className="mt-1 text-lg font-semibold text-[var(--app-text)]">{item.value}</p>
                <p className={`mt-0.5 text-xs ${isMixTheme ? "text-emerald-300" : "text-[var(--app-text)]"}`}>{item.trend}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-[var(--app-text)]">Action Queue</h3>
          <p className="text-xs text-[var(--app-muted)]">Next best improvements</p>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <div className={`rounded-xl p-3 text-sm ${isMixTheme ? "border border-indigo-400/30 bg-indigo-500/10 text-indigo-100" : "border border-[var(--app-border)] bg-[var(--app-surface-2)] text-[var(--app-text)]"}`}>Raise Gemini retry budget for long-context requests</div>
            <div className={`rounded-xl p-3 text-sm ${isMixTheme ? "border border-cyan-400/30 bg-cyan-500/10 text-cyan-100" : "border border-[var(--app-border)] bg-[var(--app-surface-2)] text-[var(--app-text)]"}`}>Shift routing percentages between model routes to optimize latency</div>
          <div className={`rounded-xl p-3 text-sm ${isMixTheme ? "border border-emerald-400/30 bg-emerald-500/10 text-emerald-100" : "border border-[var(--app-border)] bg-[var(--app-surface-2)] text-[var(--app-text)]"}`}>Promote top 3 high-retention prompts to pinned templates</div>
        </div>
      </section>

      {plan === "paid" ? (
        <section className="grid gap-4 xl:grid-cols-12">
          <article className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 xl:col-span-8">
            <h3 className="text-lg font-semibold text-[var(--app-text)]">Paid Pro Intelligence</h3>
            <p className="mt-1 text-xs text-[var(--app-muted)]">Advanced quality diagnostics and forecast modeling.</p>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] p-3">
                <p className="text-xs text-[var(--app-muted)]">Predicted Growth</p>
                <p className={`mt-1 text-xl font-semibold ${isMixTheme ? "text-emerald-400" : "text-[var(--app-text)]"}`}>+36.4%</p>
              </div>
              <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] p-3">
                <p className="text-xs text-[var(--app-muted)]">Quality Drift Risk</p>
                <p className="mt-1 text-xl font-semibold text-[var(--app-text)]">Low</p>
              </div>
              <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] p-3">
                <p className="text-xs text-[var(--app-muted)]">Routing Confidence</p>
                <p className="mt-1 text-xl font-semibold text-[var(--app-text)]">95.1%</p>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 xl:col-span-4">
            <h3 className="text-lg font-semibold text-[var(--app-text)]">Auto Actions</h3>
            <div className="mt-3 space-y-2 text-sm text-[var(--app-text)]">
              <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] p-3">Auto-fallback rules are active</div>
              <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] p-3">Quality alerts sent to team channel</div>
              <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] p-3">Nightly benchmark job completed</div>
            </div>
          </article>
        </section>
      ) : (
        <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5">
          <h3 className="text-lg font-semibold text-[var(--app-text)]">Unlock Paid Pro Intelligence</h3>
          <p className="mt-1 text-sm text-[var(--app-muted)]">Upgrade to access forecasting, advanced diagnostics, and automated quality actions.</p>
        </section>
      )}

    </div>
  );
}
