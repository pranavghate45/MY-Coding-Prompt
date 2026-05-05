"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bell,
  CreditCard,
  KeyRound,
  Palette,
  Shield,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";

type SettingsSection = "general" | "appearance" | "notifications" | "billing" | "team" | "security" | "api";

type SecuritySettings = {
  requireTwoFactor: boolean;
  enforceSso: boolean;
  sessionTimeoutEnabled: boolean;
  sessionTimeoutMinutes: number;
  unusualLoginAlerts: boolean;
};

type StudentTrialState = {
  active: boolean;
  startedAt: number | null;
};

const SECURITY_STORAGE_KEY = "my-prompt-security-settings";
const STUDENT_TRIAL_STORAGE_KEY = "my-prompt-student-trial";

const defaultSecuritySettings: SecuritySettings = {
  requireTwoFactor: true,
  enforceSso: false,
  sessionTimeoutEnabled: true,
  sessionTimeoutMinutes: 60,
  unusualLoginAlerts: true,
};

function getInitialSecuritySettings(): SecuritySettings {
  if (typeof window === "undefined") {
    return defaultSecuritySettings;
  }

  try {
    const raw = localStorage.getItem(SECURITY_STORAGE_KEY);
    if (!raw) {
      return defaultSecuritySettings;
    }
    const parsed = JSON.parse(raw) as Partial<SecuritySettings>;
    return {
      requireTwoFactor: parsed.requireTwoFactor ?? defaultSecuritySettings.requireTwoFactor,
      enforceSso: parsed.enforceSso ?? defaultSecuritySettings.enforceSso,
      sessionTimeoutEnabled: parsed.sessionTimeoutEnabled ?? defaultSecuritySettings.sessionTimeoutEnabled,
      sessionTimeoutMinutes: parsed.sessionTimeoutMinutes ?? defaultSecuritySettings.sessionTimeoutMinutes,
      unusualLoginAlerts: parsed.unusualLoginAlerts ?? defaultSecuritySettings.unusualLoginAlerts,
    };
  } catch {
    return defaultSecuritySettings;
  }
}

function getInitialStudentTrial(): StudentTrialState {
  if (typeof window === "undefined") {
    return { active: false, startedAt: null };
  }

  try {
    const raw = localStorage.getItem(STUDENT_TRIAL_STORAGE_KEY);
    if (!raw) {
      return { active: false, startedAt: null };
    }

    const parsed = JSON.parse(raw) as Partial<StudentTrialState>;
    return {
      active: Boolean(parsed.active),
      startedAt: typeof parsed.startedAt === "number" ? parsed.startedAt : null,
    };
  } catch {
    return { active: false, startedAt: null };
  }
}

const sections: Array<{
  id: SettingsSection;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}> = [
  { id: "general", label: "General", icon: SlidersHorizontal },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "team", label: "Team", icon: Users },
  { id: "security", label: "Security", icon: Shield },
  { id: "api", label: "API", icon: KeyRound },
];

export default function SettingsPage() {
  const { plan, setPlan, user } = useAuth();
  const [activeSection, setActiveSection] = useState<SettingsSection>("general");
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>(getInitialSecuritySettings);
  const [studentTrial, setStudentTrial] = useState<StudentTrialState>(getInitialStudentTrial);

  const updateSecuritySetting = <K extends keyof SecuritySettings>(key: K, value: SecuritySettings[K]) => {
    setSecuritySettings((current) => ({ ...current, [key]: value }));
  };

  const saveSecuritySettings = () => {
    localStorage.setItem(SECURITY_STORAGE_KEY, JSON.stringify(securitySettings));
  };

  const startStudentTrial = () => {
    const nextTrial: StudentTrialState = {
      active: true,
      startedAt: Date.now(),
    };
    setStudentTrial(nextTrial);
    localStorage.setItem(STUDENT_TRIAL_STORAGE_KEY, JSON.stringify(nextTrial));
  };
  const isTrialActive = studentTrial.active;

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--app-muted)]">Workspace Settings</p>
        <h2 className="mt-2 text-2xl font-semibold text-[var(--app-text)]">Control your workspace</h2>
        <p className="mt-1 text-sm text-[var(--app-muted)]">Manage profile, billing, security, notifications, and API access in one place.</p>
      </section>

      <section className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <aside className="app-card p-3">
          <nav className="space-y-1">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;

              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition ${isActive ? 'btn btn-primary' : 'btn btn-secondary'}`}
                >
                  <Icon size={15} />
                  {section.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="space-y-4">
          {activeSection === "general" ? (
            <article className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5">
              <h3 className="text-lg font-semibold text-[var(--app-text)]">General</h3>
              <p className="mt-1 text-sm text-[var(--app-muted)]">Update your workspace identity and default preferences.</p>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="space-y-1.5 text-sm">
                  <span className="font-medium text-[var(--app-text)]">Workspace Name</span>
                  <input
                    defaultValue="My Prompt"
                    className="h-10 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 text-[var(--app-text)] outline-none"
                  />
                </label>

                <label className="space-y-1.5 text-sm">
                  <span className="font-medium text-[var(--app-text)]">Workspace URL</span>
                  <input
                    defaultValue="myprompt.com/pranav"
                    className="h-10 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 text-[var(--app-text)] outline-none"
                  />
                </label>

                <label className="space-y-1.5 text-sm">
                  <span className="font-medium text-[var(--app-text)]">Language</span>
                  <select className="h-10 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 text-[var(--app-text)] outline-none">
                    <option>English</option>
                    <option>Hindi</option>
                    <option>Spanish</option>
                  </select>
                </label>

                <label className="space-y-1.5 text-sm">
                  <span className="font-medium text-[var(--app-text)]">Timezone</span>
                  <select className="h-10 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 text-[var(--app-text)] outline-none">
                    <option>Asia/Kolkata</option>
                    <option>UTC</option>
                    <option>America/New_York</option>
                  </select>
                </label>
              </div>

              <button className="mt-4 btn btn-primary">Save Changes</button>
            </article>
          ) : null}

          {activeSection === "appearance" ? (
            <article className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5">
              <h3 className="text-lg font-semibold text-[var(--app-text)]">Appearance</h3>
              <p className="mt-1 text-sm text-[var(--app-muted)]">Theme and visual preferences for your workspace.</p>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {[
                  { title: "Dark", desc: "Focused and high-contrast" },
                  { title: "Light", desc: "Clean and minimal" },
                  { title: "Mix", desc: "Premium gradient blend" },
                ].map((mode) => (
                  <div key={mode.title} className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] p-3">
                    <p className="text-sm font-semibold text-[var(--app-text)]">{mode.title}</p>
                    <p className="mt-1 text-xs text-[var(--app-muted)]">{mode.desc}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-2">
                {[
                  "Use compact spacing",
                  "Enable subtle motion",
                  "Show model badges in chat",
                ].map((item) => (
                  <label key={item} className="flex items-center justify-between rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] px-3 py-2 text-sm text-[var(--app-text)]">
                    <span>{item}</span>
                    <input type="checkbox" defaultChecked className="h-4 w-4" />
                  </label>
                ))}
              </div>
            </article>
          ) : null}

          {activeSection === "notifications" ? (
            <article className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5">
              <h3 className="text-lg font-semibold text-[var(--app-text)]">Notifications</h3>
              <p className="mt-1 text-sm text-[var(--app-muted)]">Choose what updates you want to receive.</p>

              <div className="mt-4 space-y-2">
                {[
                  "Product updates",
                  "Weekly usage report",
                  "Billing alerts",
                  "Security alerts",
                  "Team activity summary",
                ].map((item, index) => (
                  <label key={item} className="flex items-center justify-between rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] px-3 py-2 text-sm text-[var(--app-text)]">
                    <span>{item}</span>
                    <input type="checkbox" defaultChecked={index < 3} className="h-4 w-4" />
                  </label>
                ))}
              </div>

              <button className="mt-4 btn btn-primary">Save Preferences</button>
            </article>
          ) : null}

          {activeSection === "billing" ? (
            <article className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5">
              <h3 className="text-lg font-semibold text-[var(--app-text)]">Billing</h3>
              <p className="mt-1 text-sm text-[var(--app-muted)]">Current plan: {plan === "paid" ? "Paid Pro" : "Free"}</p>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] p-3">
                  <p className="text-xs text-[var(--app-muted)]">Monthly usage</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--app-text)]">{plan === "paid" ? "294,000" : "25,000"} runs</p>
                </div>
                <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] p-3">
                  <p className="text-xs text-[var(--app-muted)]">Seats</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--app-text)]">{plan === "paid" ? "10" : "1"}</p>
                </div>
                <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] p-3">
                  <p className="text-xs text-[var(--app-muted)]">Advanced Tools</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--app-text)]">{plan === "paid" ? "Enabled" : "Limited"}</p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-[var(--app-text)]">Student 1-Month Free Trial</p>
                    <p className="mt-0.5 text-xs text-[var(--app-muted)]">
                      {isTrialActive ? "Trial is active for this workspace." : "Get full premium access free for 30 days."}
                    </p>
                  </div>
                  <button onClick={startStudentTrial} disabled={isTrialActive} className={`btn ${isTrialActive ? 'opacity-60 cursor-not-allowed' : 'btn-primary'}`}>
                    {isTrialActive ? 'Trial Active' : 'Start Free Trial'}
                  </button>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[var(--app-text)]">Paid Pro Benefits</p>
                  <span className="rounded-full border border-[var(--app-border)] bg-[var(--app-bg)] px-2 py-0.5 text-xs text-[var(--app-muted)]">
                    {plan === "paid" ? "Active" : "Recommended"}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {[
                    "Up to 294,000 monthly runs",
                    "10 team seats",
                    "Website Pro access",
                    "Priority model routing",
                  ].map((benefit) => (
                    <div key={benefit} className="rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-sm text-[var(--app-text)]">
                      {benefit}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <button
                  onClick={() => setPlan("free")}
                  className={`rounded-xl border px-4 py-2 text-sm ${
                    plan === "free"
                      ? "border-[var(--app-text)] bg-[var(--app-text)] font-semibold text-[var(--app-bg)]"
                      : "border-[var(--app-border)] bg-[var(--app-surface-2)] text-[var(--app-text)]"
                  }`}
                >
                  Use Free
                </button>
                <Link
                  href="/billing"
                  className={`rounded-xl border px-4 py-2 text-sm ${
                    plan === "paid"
                      ? "border-[var(--app-text)] bg-[var(--app-text)] font-semibold text-[var(--app-bg)]"
                      : "border-[var(--app-border)] bg-[var(--app-surface-2)] text-[var(--app-text)]"
                  }`}
                >
                  {plan === "paid" ? "Paid Pro Active" : "Upgrade to Paid Pro"}
                </Link>
              </div>
            </article>
          ) : null}

          {activeSection === "team" ? (
            <article className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5">
              <h3 className="text-lg font-semibold text-[var(--app-text)]">Team</h3>
              <p className="mt-1 text-sm text-[var(--app-muted)]">Manage members and permissions.</p>

              <div className="mt-4 space-y-2">
                {[
                  "Pranav · Owner",
                  "Komal · Developer",
                  "Purvi · Product",
                  "Arcelin · QA",
                  "Sandhya · Operations",
                ].map((member) => (
                  <div key={member} className="flex items-center justify-between rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] px-3 py-2 text-sm">
                    <span className="text-[var(--app-text)]">{member}</span>
                    <button className="rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-1 text-xs text-[var(--app-muted)]">Manage</button>
                  </div>
                ))}
              </div>

              <button className="mt-4 btn btn-secondary">Invite Member</button>
            </article>
          ) : null}

          {activeSection === "security" ? (
            <article className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5">
              <h3 className="text-lg font-semibold text-[var(--app-text)]">Security</h3>
              <p className="mt-1 text-sm text-[var(--app-muted)]">Protect your workspace and account.</p>

              <div className="mt-4 space-y-2">
                <label className="flex items-center justify-between rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] px-3 py-2 text-sm text-[var(--app-text)]">
                  <span>Require 2-factor authentication</span>
                  <input
                    type="checkbox"
                    checked={securitySettings.requireTwoFactor}
                    onChange={(event) => updateSecuritySetting("requireTwoFactor", event.target.checked)}
                    className="h-4 w-4"
                  />
                </label>

                <label className="flex items-center justify-between rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] px-3 py-2 text-sm text-[var(--app-text)]">
                  <span>Enforce single sign-on</span>
                  <input
                    type="checkbox"
                    checked={securitySettings.enforceSso}
                    onChange={(event) => updateSecuritySetting("enforceSso", event.target.checked)}
                    className="h-4 w-4"
                  />
                </label>

                <label className="flex items-center justify-between rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] px-3 py-2 text-sm text-[var(--app-text)]">
                  <span>Enable session timeout</span>
                  <input
                    type="checkbox"
                    checked={securitySettings.sessionTimeoutEnabled}
                    onChange={(event) => updateSecuritySetting("sessionTimeoutEnabled", event.target.checked)}
                    className="h-4 w-4"
                  />
                </label>

                <label className="flex items-center justify-between rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] px-3 py-2 text-sm text-[var(--app-text)]">
                  <span>Notify on unusual login</span>
                  <input
                    type="checkbox"
                    checked={securitySettings.unusualLoginAlerts}
                    onChange={(event) => updateSecuritySetting("unusualLoginAlerts", event.target.checked)}
                    className="h-4 w-4"
                  />
                </label>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="space-y-1.5 text-sm">
                  <span className="font-medium text-[var(--app-text)]">Session timeout duration</span>
                  <select
                    value={securitySettings.sessionTimeoutMinutes}
                    onChange={(event) => updateSecuritySetting("sessionTimeoutMinutes", Number(event.target.value))}
                    className="h-10 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 text-[var(--app-text)] outline-none"
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={60}>60 minutes</option>
                    <option value={120}>120 minutes</option>
                  </select>
                </label>
                <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] p-3">
                  <p className="text-xs text-[var(--app-muted)]">Security Score</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--app-text)]">
                    {[
                      securitySettings.requireTwoFactor,
                      securitySettings.enforceSso,
                      securitySettings.sessionTimeoutEnabled,
                      securitySettings.unusualLoginAlerts,
                    ].filter(Boolean).length * 25}
                    /100
                  </p>
                </div>
              </div>

              <button onClick={saveSecuritySettings} className="mt-4 btn btn-primary">Save Security Settings</button>
            </article>
          ) : null}

          {activeSection === "api" ? (
            <article className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5">
              <h3 className="text-lg font-semibold text-[var(--app-text)]">API & Webhooks</h3>
              <p className="mt-1 text-sm text-[var(--app-muted)]">Access keys and automation endpoints.</p>

              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] p-3">
                  <p className="text-xs text-[var(--app-muted)]">API Key</p>
                  <p className="mt-1 text-sm text-[var(--app-text)]">sk_live_••••••••••••••••••••••</p>
                </div>
                <label className="space-y-1.5 text-sm">
                  <span className="font-medium text-[var(--app-text)]">Webhook URL</span>
                  <input
                    defaultValue="https://api.example.com/prompt-events"
                    className="h-10 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 text-[var(--app-text)] outline-none"
                  />
                </label>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button className="btn btn-primary">Regenerate Key</button>
                <button className="btn btn-secondary">Save Webhook</button>
              </div>
            </article>
          ) : null}
          </div>
        </section>
    </div>
  );
}
