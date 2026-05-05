
"use client";
import { startCheckout } from "@/lib/stripeCheckout";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
// Link to standalone Website Pro generator page
import { useAuth } from "@/components/auth-provider";
import type { WebsiteProProject } from "@/lib/website-pro-store";

const frameworks = [
  "Next.js",
  "React + Vite",
  "Gatsby",
  "Create React App",
  "Remix",
  "Nuxt",
  "Vue",
  "Svelte",
  "SvelteKit",
  "Angular",
  "Ember",
  "Preact",
  "Solid.js",
  "Astro",
  "Alpine.js",
  "Lit",
  "Stencil",
  "RedwoodJS",
  "Blitz",
  "Ionic (web)",
  "Flutter Web",
  "Electron (desktop)",
  "Marko",
  "Mithril",
];

const styles = [
  "Tailwind CSS",
  "Bootstrap",
  "Bulma",
  "Foundation",
  "Material UI / MUI",
  "Chakra UI",
  "Ant Design",
  "Semantic UI",
  "DaisyUI",
  "Flowbite",
  "Shadcn UI",
  "CSS Modules",
  "Styled Components",
  "Emotion",
  "Sass / SCSS",
  "Less",
  "PostCSS",
  "Tachyons",
  "Atomic CSS",
  "BEM (methodology)",
];

const siteTypes = [
  "Static Website",
  "Dynamic Website",
  "Single Page Application (SPA)",
  "Multi Page Website (MPA)",
  "E-commerce / Marketplace",
  "Blog / Personal Website",
  "Portfolio",
  "Business / Corporate Website",
  "Landing Page",
  "SaaS Product Website",
  "Web Application (productivity, admin)",
  "Dashboard / Analytics",
  "Social Network",
  "Forum / Community",
  "News / Magazine",
  "Educational / LMS",
  "Documentation / Knowledge Base",
  "Booking / Reservation",
  "Directory / Listings",
  "Event / Ticketing",
  "Membership / Subscription",
  "Media / Streaming",
  "Headless CMS Frontend",
  "Progressive Web App (PWA)",
  "Micro-site / Campaign",
  "Landing + Checkout",
  "Internal Intranet",
  "API Dashboard / Developer Portal",
  "Real Estate",
  "Healthcare / EHR (frontend)",
];

const backends = [
  "Node.js + Express",
  "NestJS",
  "Koa",
  "Fastify",
  "Next.js API Routes",
  "Meteor",
  "Serverless (AWS Lambda)",
  "Firebase Functions",
  "Google Cloud Functions",
  "Django",
  "Flask",
  "FastAPI",
  "Ruby on Rails",
  "Laravel (PHP)",
  "Symfony (PHP)",
  "Spring Boot (Java)",
  "ASP.NET Core (C#)",
  "Go (Gin / Fiber / Echo)",
  "Phoenix (Elixir)",
  "Play Framework",
  "AdonisJS",
  "Supabase Edge Functions",
  "Cloudflare Workers",
];

const databases = [
  "PostgreSQL",
  "MySQL",
  "MariaDB",
  "SQLite",
  "MongoDB",
  "Cassandra",
  "CouchDB",
  "Redis",
  "Memcached",
  "DynamoDB",
  "Firebase Realtime Database",
  "Firestore",
  "Cosmos DB",
  "Neo4j (graph)",
  "ElasticSearch (search)",
  "MeiliSearch",
  "ClickHouse",
  "TimescaleDB",
  "InfluxDB (time-series)",
  "CockroachDB",
  "PlanetScale",
  "Supabase (Postgres managed)",
];

export default function WebsiteDeveloperPage() {
  const { plan, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [siteType, setSiteType] = useState(siteTypes[0]);
  const [target, setTarget] = useState("Website");
  const [framework, setFramework] = useState(frameworks[0]);
  const [styleSystem, setStyleSystem] = useState(styles[0]);
  const [backend, setBackend] = useState(backends[0]);
  const [database, setDatabase] = useState(databases[0]);
  const [goal, setGoal] = useState("Generate a production-ready website structure with reusable components and conversion-focused sections.");
  const [groupName, setGroupName] = useState("");
  const [groupMembers, setGroupMembers] = useState("");
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<WebsiteProProject[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const generatedPlan = useMemo(
    () => [
      `Target: ${target}`,
      `Project: ${siteType} using ${framework}`,
      `Styling: ${styleSystem}`,
      `Backend: ${backend}`,
      `Database: ${database}`,
      "Pages: Home, Features, Pricing, About, Contact",
      "Components: Hero, CTA, Testimonials, FAQ, Footer",
      "SEO: Meta tags, OG tags, sitemap, semantic headings",
      "Performance: Image optimization, code splitting, Lighthouse targets",
      "Conversion: Primary CTA strategy and trust elements",
    ],
    [target, siteType, framework, styleSystem, backend, database],
  );

  const resetProjectForm = () => {
    setEditingProjectId(null);
    router.replace("/website-developer");
    setTarget("Website");
    setSiteType(siteTypes[0]);
    setFramework(frameworks[0]);
    setStyleSystem(styles[0]);
    setBackend(backends[0]);
    setDatabase(databases[0]);
    setGoal("Generate a production-ready website structure with reusable components and conversion-focused sections.");
    setGroupName("");
    setGroupMembers("");
  };

  const applyProjectToForm = (project: WebsiteProProject) => {
    setEditingProjectId(project.id);
    setTarget(project.target || "Website");
    setSiteType(project.siteType || siteTypes[0]);
    setFramework(project.framework || frameworks[0]);
    setStyleSystem(project.styleSystem || styles[0]);
    setBackend(project.backend || backends[0]);
    setDatabase(project.database || databases[0]);
    setGoal(project.goal || "");
    setGroupName(project.group?.name || "");
    setGroupMembers(project.group?.members?.join(", ") || "");
  };

  const saveProject = async () => {
    setIsGenerating(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const membersList = Array.from(
        new Set([
          ...(groupMembers.split(",").map((member) => member.trim()).filter(Boolean)),
          ...(user?.email ? [user.email] : []),
        ]),
      );

      const payload = {
        target,
        siteType,
        framework,
        styleSystem,
        backend,
        database,
        goal,
        group: groupName ? { name: groupName, members: membersList } : undefined,
      };

      const endpoint = editingProjectId ? `/api/website-pro/projects/${editingProjectId}` : "/api/website-pro/projects";
      const response = await fetch(endpoint, {
        method: editingProjectId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(editingProjectId ? "Failed to update project" : "Failed to create project");
      }

      const data = (await response.json()) as { project: WebsiteProProject };
      setProjects((currentProjects) => {
        const filtered = currentProjects.filter((project) => project.id !== data.project.id);
        return [data.project, ...filtered];
      });
      setEditingProjectId(data.project.id);
      setSuccessMessage(editingProjectId ? "Project updated successfully." : "Project created and saved successfully.");

      try {
        window.dispatchEvent(new CustomEvent("my-prompt:project-saved", { detail: { project: data.project } }));
      } catch {
        // ignore cross-component sync issues
      }
    } catch {
      setError(editingProjectId ? "Failed to update project." : "Failed to create project.");
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (plan !== "paid") {
      return;
    }

    const fetchProjects = async () => {
      setIsLoadingProjects(true);
      setError(null);
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/ai/website-pro/projects`, { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to load projects");
        }
        const data = (await response.json()) as { projects: WebsiteProProject[] };
        setProjects(data.projects);
      } catch {
        setError("Unable to load Website Pro projects right now.");
      } finally {
        setIsLoadingProjects(false);
      }
    };

    void fetchProjects();
  }, [plan]);

  useEffect(() => {
    if (!projects.length) return;
    const projectId = searchParams?.get("projectId");
    if (!projectId) return;
    const matchedProject = projects.find((project) => project.id === projectId);
    if (matchedProject) {
      applyProjectToForm(matchedProject);
    }
  }, [projects, searchParams]);

  useEffect(() => {
    if (!successMessage) return;
    const t = setTimeout(() => setSuccessMessage(null), 4500);
    return () => clearTimeout(t);
  }, [successMessage]);

  // Export as Prompt: Generate an advanced, production-grade website prompt and copy to clipboard
  const handleExportPrompt = async () => {
    try {
      if (!generatedPlan || generatedPlan.length === 0) {
        alert("No prompt to export");
        return;
      }
      // Build an advanced, detailed prompt using selected options and target (Website or App)
      const promptBase = `You are an expert full-stack architect and developer. Produce a complete, production-ready %TARGET% project based on the specification below. Provide runnable code, clear folder structure, configuration, and instructions so a developer can clone, install, build, test, and deploy the project without additional explanation.`;

      const websitePrompt = `
    ${promptBase.replace('%TARGET%', 'Website')}

    TECH STACK:
    - Frontend: ${framework} (use TypeScript when available)
    - Styling system: ${styleSystem}
    - Backend: ${backend}
    - Database: ${database}

    SPECIFICATION:
    - Project type: ${siteType}
    - Business/goal: ${goal}
    - Target platform: Responsive web, SEO optimized, PWA-ready where appropriate

    REQUIREMENTS & DELIVERABLES (Website):
    1) Project scaffold: Provide the full folder tree and explain each folder briefly.
    2) Implement key pages: Home, Features, Pricing, About, Contact, Auth (login/signup), Dashboard (if applicable).
    3) Components: implement reusable 'Header', 'Footer', 'Hero', 'FeatureCard', 'PricingCard', 'Testimonial', 'CTA', and 'Modal' components with examples.
    4) Routing: demonstrate client-side routing and server-side rendering or static generation choices with reasons.
    5) API: describe and implement example REST or GraphQL endpoints on the backend for auth, products, and content. Include request/response schemas and sample seed data.
    6) Database: provide schema/migrations for the selected database and seeding scripts.
    7) Authentication & Authorization: implement JWT-based auth, session handling, and role-based example (admin/user).
    8) Dev tooling: include 'package.json' scripts, TypeScript config, linting ('eslint'), formatting ('prettier'), and test setup (Jest/Playwright or React Testing Library).
    9) CI/CD: provide a sample GitHub Actions workflow to run tests, build, and deploy to a cloud provider (e.g., Vercel, AWS, or Docker image push).
    10) Docker: include a 'Dockerfile' and 'docker-compose.yml' for local dev with database service.
    11) Performance & SEO: image optimization, code splitting, lazy loading, meta tags, sitemap, robots.
    12) Accessibility: show how components meet WCAG 2.1 AA, include sample aria attributes and keyboard navigation.
    13) Security: outline input validation, rate limiting, secure headers, and env var handling.
    14) Documentation: 'README.md' with setup, run, test, and deploy instructions, plus notes for extensibility.

    Return: full project skeleton, key code files (only the most relevant large files in full), sample tests, and exact commands to run locally and deploy.
    `;

      const appPrompt = `
${promptBase.replace('%TARGET%', 'Mobile App (React Native / Flutter / Ionic)')}

TECH STACK:
- Mobile framework: ${framework.includes('React') ? 'React Native (with Expo) or React Native CLI' : framework}
- Styling / UI: ${styleSystem}
- Backend: ${backend}
- Database / Sync: ${database} (and local persistence strategy: SQLite / AsyncStorage / SecureStore)

SPECIFICATION:
- App type: ${siteType}
- Business/goal: ${goal}
- Target platforms: iOS and Android, responsive to multiple device sizes, support for offline-first where applicable.

REQUIREMENTS & DELIVERABLES (App):
1) Project scaffold: full folder tree for the mobile app and backend, with platform-specific entry points.
2) Implement key screens: Onboarding, Auth (login/signup), Home, Details, Profile, Settings, and an example feature screen.
3) Components: reusable 'Button', 'Card', 'List', 'Form' components with accessibility and touch handling.
4) Navigation: implement stack/tab navigation and deep linking support.
5) API: backend endpoints for auth, data sync, and file upload; include schema and examples.
6) Local storage & sync: show how to persist data locally and sync with server; include conflict resolution strategy.
7) Native concerns: permissions (camera, location), push notifications setup, app icons, and splash screens.
8) Testing: unit and integration tests (Jest + React Native Testing Library) and an example E2E test (Detox or Playwright mobile).
9) CI/CD: GitHub Actions or Fastlane setup for building and publishing to TestFlight / Google Play.
10) Bundling & release: instructions for building release APK/IPA and signing.
11) Docker for backend: 'Dockerfile' and 'docker-compose' to run backend and DB for integration testing.
12) Documentation: 'README.md' with setup, running on simulator/device, testing, and publishing steps.

Return: full project scaffold, critical source files, example components/screens in full, backend endpoints, and exact commands to run locally and to produce release builds.
`;

      const finalPrompt = target === "App" ? appPrompt : websitePrompt;
      // copy the detailed finalPrompt
      await navigator.clipboard.writeText(finalPrompt);
      alert("Detailed prompt copied to clipboard ✅\nPaste into your AI generator to receive full scaffolded code and instructions.");
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  // Admins always get access, skip paywall
  const [loading, setLoading] = useState(false);

  if (user && user.role === "admin") {
    // fall through to main UI
  } else if (plan !== "paid") {
    return (
      <div className="space-y-5">
        <section className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--app-muted)]">Paid Pro Feature</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--app-text)]">Website Developer Pro</h2>
          <p className="mt-2 text-sm text-[var(--app-muted)]">This easy website builder workspace is available in Paid Pro.</p>
          <button
            className="mt-4 inline-flex rounded-xl bg-[var(--app-text)] px-4 py-2 text-sm font-semibold text-[var(--app-bg)]"
            disabled={loading}
              onClick={async () => {
              setLoading(true);
              try {
                await startCheckout("pro");
              } catch (err: unknown) {
                if (err && typeof err === "object" && "message" in err) {
                  alert((err as { message?: string }).message || "Payment error");
                } else {
                  alert("Payment error");
                }
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? "Redirecting..." : "Upgrade to Paid"}
          </button>
        </section>
      </div>
    );
  }

  // If the user has paid but not yet approved by an admin, show waiting state
  // Admins bypass the approval waiting state and get immediate access.
  if (user && user.plan === "paid" && user.approved !== true && user.role !== "admin") {
    return (
      <div className="space-y-5">
        <section className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--app-muted)]">Payment Received</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--app-text)]">Awaiting Admin Approval</h2>
          <p className="mt-2 text-sm text-[var(--app-muted)]">Thanks for upgrading — our admin will review and approve your Paid Pro access shortly. You won&apos;t be able to use Paid features until approval is granted.</p>
          <div className="mt-4 flex gap-2">
            <Link href="/settings" className="inline-flex rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] px-4 py-2 text-sm font-semibold text-[var(--app-text)]">
              View Account
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--app-muted)]">Paid Pro</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--app-text)]">Website Developer Pro</h2>
        <p className="mt-2 text-sm text-[var(--app-muted)]">Best and easy way to plan, scaffold, and ship developer-grade websites fast.</p>
      </section>

      <section className="grid gap-4 xl:grid-cols-12">
        <article className="space-y-4 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-2)] p-5 xl:col-span-7">
          <h3 className="text-lg font-semibold text-[var(--app-text)]">Quick Website Wizard</h3>
          <p className="text-xs text-[var(--app-muted)]">Choose options and generate a complete website development plan.</p>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-[var(--app-muted)]">Project Target</span>
              <select value={target} onChange={(event) => setTarget(event.target.value)} className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] px-3 py-2 text-[var(--app-text)] outline-none">
                {["Website", "App"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-[var(--app-muted)]">Website Type</span>
              <select value={siteType} onChange={(event) => setSiteType(event.target.value)} className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] px-3 py-2 text-[var(--app-text)] outline-none">
                {siteTypes.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-[var(--app-muted)]">Framework</span>
              <select value={framework} onChange={(event) => setFramework(event.target.value)} className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] px-3 py-2 text-[var(--app-text)] outline-none">
                {frameworks.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm md:col-span-2">
              <span className="text-[var(--app-muted)]">Style System</span>
              <select value={styleSystem} onChange={(event) => setStyleSystem(event.target.value)} className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] px-3 py-2 text-[var(--app-text)] outline-none">
                {styles.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-[var(--app-muted)]">Backend</span>
              <select value={backend} onChange={(event) => setBackend(event.target.value)} className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] px-3 py-2 text-[var(--app-text)] outline-none">
                {backends.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-[var(--app-muted)]">Database</span>
              <select value={database} onChange={(event) => setDatabase(event.target.value)} className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] px-3 py-2 text-[var(--app-text)] outline-none">
                {databases.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="space-y-1 text-sm">
            <span className="text-[var(--app-muted)]">Project Goal</span>
            <textarea value={goal} onChange={(event) => setGoal(event.target.value)} rows={4} className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] px-3 py-2 text-[var(--app-text)] outline-none" />
          </label>

          <div className="flex gap-2">
            <button onClick={saveProject} disabled={isGenerating} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-zinc-900 disabled:cursor-not-allowed disabled:opacity-60">
              {isGenerating ? (editingProjectId ? "Updating..." : "Creating...") : editingProjectId ? "Update Project" : "Create Project"}
            </button>
            <button onClick={resetProjectForm} className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] px-4 py-2 text-sm text-[var(--app-text)]">
              New Project
            </button>
            <button onClick={handleExportPrompt} className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] px-4 py-2 text-sm text-[var(--app-text)]">Export as Prompt</button>
          </div>
          {editingProjectId ? <p className="text-xs text-[var(--app-muted)]">Editing saved project: {editingProjectId}</p> : null}
          {successMessage ? <p className="text-xs text-emerald-400">{successMessage}</p> : null}
          {error && !successMessage ? <p className="text-xs text-rose-300">{error}</p> : null}
        </article>
        <article className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 xl:col-span-5">
          <h3 className="text-lg font-semibold text-[var(--app-text)]">Generated Build Plan</h3>
          <div className="mt-3 space-y-2 text-sm text-[var(--app-muted)]">
            {generatedPlan.map((item) => (
              <div key={item} className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] p-3 text-[var(--app-text)]">{item}</div>
            ))}
          </div>
        </article>
      </section>

      {/* Link to the standalone Website Pro generator page */}
      <div className="mt-4">
        <Link href="/prompt-generator" className="inline-flex items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] px-4 py-2 text-sm text-[var(--app-text)]">
          Open Prompt Generator
        </Link>
      </div>

      <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5">
        <h3 className="text-lg font-semibold text-[var(--app-text)]">One-Click Developer Presets</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {["Startup SaaS Website", "High-Converting Product Landing", "Modern Developer Portfolio"].map((preset) => (
            <button key={preset} className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] p-3 text-left text-sm text-[var(--app-text)] hover:brightness-95">
              {preset}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5">
        <h3 className="text-lg font-semibold text-[var(--app-text)]">Saved Website Pro Projects (Backend)</h3>
        {isLoadingProjects ? <p className="mt-2 text-sm text-[var(--app-muted)]">Loading projects...</p> : null}
        {!isLoadingProjects && projects.length === 0 ? <p className="mt-2 text-sm text-[var(--app-muted)]">No saved projects yet. Generate one to store it in backend.</p> : null}

        <div className="mt-3 space-y-2">
          {projects.map((project) => (
            <article key={project.id} className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] p-3 text-sm text-[var(--app-text)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-[var(--app-text)]">
                    {project.siteType} · {project.framework}
                  </p>
                  <p className="mt-1 text-xs text-[var(--app-muted)]">{project.styleSystem} · {project.backend} · {project.database}</p>
                  <p className="mt-1 text-xs text-[var(--app-muted)]">{new Date(project.updatedAt || project.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => applyProjectToForm(project)} className="rounded-lg border border-[var(--app-border)] px-3 py-1 text-xs font-medium text-[var(--app-text)]">
                    Edit
                  </button>
                  <Link href={`/website-developer?projectId=${project.id}`} className="rounded-lg border border-[var(--app-border)] px-3 py-1 text-xs font-medium text-[var(--app-text)]">
                    Open
                  </Link>
                </div>
              </div>
              <p className="mt-2 text-xs text-[var(--app-muted)]">{project.goal}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
