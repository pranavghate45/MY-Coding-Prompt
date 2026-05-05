"use client";
import React, { useEffect, useMemo, useState } from "react";
import stylesModule from "./WebsiteProGenerator.module.css";
import { Sparkles, Copy, Lock, Loader2, Code2, ShieldCheck, Rocket, WandSparkles, Layers3, ArrowRight } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { siteTypes, frameworks, styles, backends, databases, appTypes } from "@/lib/website-pro-options";
import { useRouter } from "next/navigation";

type Prompt = { title: string; prompt: string; locked: boolean };
type DeveloperType = "frontend" | "backend" | "full_stack";
type HealthTone = "green" | "yellow" | "red";
const STORAGE_KEY = "website-pro-generator-state";

const UI_FOCUS_OPTIONS: Record<DeveloperType, string[]> = {
  frontend: [
    "Accessible and responsive UI with polished UX",
    "Fast, mobile-first UI with clear navigation",
    "Conversion-focused interface with strong CTA flow",
  ],
  backend: [
    "Clean API-facing UI for admin and operational workflows",
    "Data-heavy interface optimized for reliability and clarity",
    "Functional dashboard UI to manage backend operations",
  ],
  full_stack: [
    "Accessible and responsive UI with polished UX",
    "Balanced UX for customer and admin journeys",
    "Scalable product UI with clear flows and reusable patterns",
  ],
};

const COMPONENTS_FOCUS_OPTIONS: Record<DeveloperType, string[]> = {
  frontend: [
    "Reusable form, card, list, and layout components",
    "Navigation, hero, CTA, and conversion components",
    "Design-system style primitives and page sections",
  ],
  backend: [
    "Admin tables, filtering controls, and data-entry forms",
    "Operational dashboards and settings modules",
    "Status, logs, and monitoring-focused components",
  ],
  full_stack: [
    "Reusable form, card, list, and layout components",
    "User-facing pages plus admin dashboard components",
    "Shared UI kit for product and operations views",
  ],
};

const TARGET_AUDIENCE_OPTIONS: Record<DeveloperType, string[]> = {
  frontend: [
    "Startup founders and product teams",
    "Students and early-career developers",
    "Design-conscious SaaS users",
  ],
  backend: [
    "Internal operations and engineering teams",
    "Data and platform administrators",
    "Enterprise technical users",
  ],
  full_stack: [
    "Startup founders and product teams",
    "SMB teams needing end-to-end workflows",
    "Enterprise users across business and operations",
  ],
};

const MUST_HAVE_FEATURES_OPTIONS: Record<DeveloperType, string[]> = {
  frontend: [
    "Authentication, dashboard, and analytics overview",
    "Onboarding flow, profile management, and notifications",
    "Search, filters, and responsive content views",
  ],
  backend: [
    "Auth, RBAC, and API rate limiting",
    "CRUD APIs, validation, and audit logging",
    "Background jobs, queues, and observability",
  ],
  full_stack: [
    "Authentication, dashboard, and analytics overview",
    "Role-based access, API integrations, and reporting",
    "End-to-end workflows from UI input to persistent storage",
  ],
};

const PRIMARY_OUTCOME_OPTIONS: Record<DeveloperType, string[]> = {
  frontend: [
    "Launch-ready MVP with clean UX and maintainable code",
    "Improve activation and conversion with stronger UI flows",
    "Ship polished responsive screens quickly",
  ],
  backend: [
    "Deliver stable APIs with secure and scalable architecture",
    "Reduce incidents with strong validation and observability",
    "Ship maintainable services with clear contracts",
  ],
  full_stack: [
    "Launch-ready MVP with clean UX and maintainable code",
    "Ship a complete product flow from frontend to database",
    "Balance speed of delivery with long-term scalability",
  ],
};

const FEATURE_OPTIONS = [
  { key: "auth", label: "Auth", description: "Login, signup, roles, or secure sessions" },
  { key: "payment", label: "Payment", description: "Checkout, subscriptions, or invoices" },
  { key: "dashboard", label: "Dashboard", description: "Admin, analytics, or overview panels" },
  { key: "search", label: "Search", description: "Search, filters, and discovery" },
  { key: "analytics", label: "Analytics", description: "Tracking, metrics, and insights" },
  { key: "notifications", label: "Notifications", description: "Alerts, inboxes, or real-time updates" },
] as const;

const AUTH_TYPE_OPTIONS = ["Email/password", "Magic link", "OAuth / social login", "SSO / enterprise", "JWT session", "Passkeys"];
const STATE_MANAGEMENT_OPTIONS = ["Local component state", "Context + reducers", "Redux Toolkit", "Zustand", "React Query / server state", "MobX"];
const PERFORMANCE_OPTIONS = ["Lazy loading", "Code splitting", "Memoization", "Caching", "Virtualized lists", "Image optimization"];
const INTEGRATION_OPTIONS = ["Stripe / payments", "Email service", "Maps / geolocation", "CRM / ERP", "Webhooks", "Analytics SDK"];
const PROJECT_STRUCTURE_OPTIONS = ["Feature-based", "Layered", "Modular monorepo", "App router + shared UI", "Service-driven", "Domain-driven"];
const TESTING_OPTIONS = ["Unit tests", "Integration tests", "Component tests", "E2E tests", "API contract tests", "Accessibility checks"];
const PLATFORM_TARGET_OPTIONS = ["Web", "Responsive web", "Mobile web", "Desktop web app", "PWA", "Cross-platform"];

const ROLE_HINTS: Record<DeveloperType, string[]> = {
  frontend: [
    "Ask which screens, states, and interactions need the most polish first.",
    "Clarify the design system, responsive breakpoints, and accessibility target.",
    "Ask what state management and data-fetching approach should power the UI.",
  ],
  backend: [
    "Ask which APIs, resources, and auth flows should exist in the MVP.",
    "Clarify the database shape, external services, and observability needs.",
    "Ask what testing and validation depth is expected for the service layer.",
  ],
  full_stack: [
    "Ask which user journeys need to be delivered end-to-end first.",
    "Clarify how the UI, API, auth, and data model should fit together.",
    "Ask which parts should be built first to ship a complete system quickly.",
  ],
};

export default function WebsiteProGenerator() {
  const { plan, user } = useAuth();
  const router = useRouter();
  const [target, setTarget] = useState("Website");
  const [siteType, setSiteType] = useState("");
  const [appType, setAppType] = useState("");
  const [framework, setFramework] = useState(frameworks[0] ?? "Next.js");
  const [styleSystem, setStyleSystem] = useState(styles[0] ?? "Tailwind CSS");
  const [backend, setBackend] = useState(backends[0] ?? "FastAPI");
  const [database, setDatabase] = useState(databases[0] ?? "PostgreSQL");
  const [apiStyle, setApiStyle] = useState("REST APIs with clear request/response contracts");
  const [authenticationRequired, setAuthenticationRequired] = useState(true);
  const [uiFocus, setUiFocus] = useState("Accessible and responsive UI with polished UX");
  const [componentsFocus, setComponentsFocus] = useState("Reusable form, card, list, and layout components");
  const [targetAudience, setTargetAudience] = useState("Startup founders and product teams");
  const [mustHaveFeatures, setMustHaveFeatures] = useState("Authentication, dashboard, and analytics overview");
  const [primaryOutcome, setPrimaryOutcome] = useState("Launch-ready MVP with clean UX and maintainable code");
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(["auth", "dashboard"]);
  const [userFlow, setUserFlow] = useState("1) Visitor lands on the product. 2) User signs in. 3) User completes the core workflow. 4) User reviews results and next steps.");
  const [authType, setAuthType] = useState("Email/password");
  const [stateManagement, setStateManagement] = useState("Context + reducers");
  const [performanceOptimization, setPerformanceOptimization] = useState("Lazy loading and code splitting for large UI sections.");
  const [integrations, setIntegrations] = useState("Stripe / payments");
  const [projectStructure, setProjectStructure] = useState("Feature-based");
  const [testingRequirements, setTestingRequirements] = useState("Unit tests for logic, component tests for UI, and E2E coverage for the critical flow.");
  const [uiComplexity, setUiComplexity] = useState("High");
  const [platformTarget, setPlatformTarget] = useState("Responsive web");
  const [profileDeveloperType, setProfileDeveloperType] = useState<DeveloperType>("full_stack");
  const [developerTypeOverride, setDeveloperTypeOverride] = useState(false);
  const [developerType, setDeveloperType] = useState<DeveloperType>("full_stack");
  const [includeDiscoveryQuestions, setIncludeDiscoveryQuestions] = useState(true);
  const [useModelOutput, setUseModelOutput] = useState(false);
  const [questions, setQuestions] = useState<string[]>([]);
  const [goal, setGoal] = useState("Generate 5 prompt variants for developers to scaffold the project.");
  const [loading, setLoading] = useState(false);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [modelHealthLabel, setModelHealthLabel] = useState("Model: Checking");
  const [modelHealthTone, setModelHealthTone] = useState<HealthTone>("yellow");
  const [modelHealthDetail, setModelHealthDetail] = useState<string>("Checking model status");

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  const effectiveDeveloperType: DeveloperType = developerTypeOverride ? developerType : profileDeveloperType;
  const showFrontendFields = effectiveDeveloperType === "frontend" || effectiveDeveloperType === "full_stack";
  const showBackendFields = effectiveDeveloperType === "backend" || effectiveDeveloperType === "full_stack";

  const uiFocusOptions = UI_FOCUS_OPTIONS[effectiveDeveloperType];
  const componentsFocusOptions = COMPONENTS_FOCUS_OPTIONS[effectiveDeveloperType];
  const targetAudienceOptions = TARGET_AUDIENCE_OPTIONS[effectiveDeveloperType];
  const mustHaveFeaturesOptions = MUST_HAVE_FEATURES_OPTIONS[effectiveDeveloperType];
  const primaryOutcomeOptions = PRIMARY_OUTCOME_OPTIONS[effectiveDeveloperType];
  const selectedFeatureLabels = useMemo(
    () => FEATURE_OPTIONS.filter((feature) => selectedFeatures.includes(feature.key)).map((feature) => feature.label),
    [selectedFeatures],
  );
  const promptCardIcons = [WandSparkles, Code2, ShieldCheck, Rocket, Layers3];
  const discoveryHints = questions.length > 0 ? questions : ROLE_HINTS[effectiveDeveloperType];

  const generatedPlan = useMemo(
    () => [
      `Target: ${target}`,
      `Project: ${target === "App" ? appType || "(unspecified)" : siteType || "(unspecified)"} using ${framework}`,
      `Developer Type: ${effectiveDeveloperType.replace("_", " ")}`,
      `Platform Target: ${platformTarget}`,
      `Features: ${selectedFeatureLabels.length > 0 ? selectedFeatureLabels.join(", ") : "(none selected)"}`,
      `User Flow: ${userFlow}`,
      ...(showFrontendFields
        ? [
            `Styling: ${styleSystem}`,
            `UI Focus: ${uiFocus}`,
            `Components Focus: ${componentsFocus}`,
            `State Management: ${stateManagement}`,
            `UI Complexity: ${uiComplexity}`,
            `Performance: ${performanceOptimization}`,
            `Target Audience: ${targetAudience}`,
            `Must-have Features: ${mustHaveFeatures}`,
            `Primary Outcome: ${primaryOutcome}`,
          ]
        : []),
      ...(showBackendFields
        ? [
            `Backend: ${backend}`,
            `Database: ${database}`,
            `API Style: ${apiStyle}`,
            `Auth Type: ${authType}`,
            `Integrations: ${integrations}`,
            `Testing: ${testingRequirements}`,
            `Project Structure: ${projectStructure}`,
            `Authentication: ${authenticationRequired ? "Required" : "Optional"}`,
          ]
        : []),
      "Pages: Home, Features, Pricing, About, Contact",
      "Components: Hero, CTA, Testimonials, FAQ, Footer",
    ],
    [
      target,
      siteType,
      appType,
      framework,
      styleSystem,
      backend,
      database,
      effectiveDeveloperType,
      showFrontendFields,
      showBackendFields,
      uiFocus,
      componentsFocus,
      targetAudience,
      mustHaveFeatures,
      primaryOutcome,
      selectedFeatureLabels,
      userFlow,
      platformTarget,
      stateManagement,
      uiComplexity,
      performanceOptimization,
      authType,
      integrations,
      testingRequirements,
      projectStructure,
      apiStyle,
      authenticationRequired,
    ],
  );

  const optimizationContext = useMemo(() => {
    const contextLines: string[] = [];
    contextLines.push(`Platform target: ${platformTarget}`);
    contextLines.push(`Features: ${selectedFeatureLabels.length > 0 ? selectedFeatureLabels.join(", ") : "none selected"}`);
    contextLines.push(`User flow: ${userFlow}`);
    contextLines.push(`Project structure: ${projectStructure}`);
    contextLines.push(`Testing requirements: ${testingRequirements}`);
    if (showFrontendFields) {
      contextLines.push(`Target audience: ${targetAudience}`);
      contextLines.push(`Must-have features: ${mustHaveFeatures}`);
      contextLines.push(`Primary outcome: ${primaryOutcome}`);
      contextLines.push(`State management: ${stateManagement}`);
      contextLines.push(`UI complexity: ${uiComplexity}`);
      contextLines.push(`Performance / optimization: ${performanceOptimization}`);
    }
    if (showBackendFields) {
      contextLines.push(`Auth type: ${authType}`);
      contextLines.push(`Integrations: ${integrations}`);
      contextLines.push(`API style: ${apiStyle}`);
    }
    return contextLines;
  }, [
    platformTarget,
    selectedFeatureLabels,
    userFlow,
    projectStructure,
    testingRequirements,
    showFrontendFields,
    targetAudience,
    mustHaveFeatures,
    primaryOutcome,
    stateManagement,
    uiComplexity,
    performanceOptimization,
    showBackendFields,
    authType,
    integrations,
    apiStyle,
  ]);

  const optimizedGoal = useMemo(() => {
    if (optimizationContext.length === 0) return goal;
    return `${goal}\n\nOptimization context:\n- ${optimizationContext.join("\n- ")}`;
  }, [goal, optimizationContext]);
  const isPaid = plan === "paid";

  // unified copy button classes so free and paid cards look identical
  const copyBtnClass = `inline-flex items-center justify-center w-9 h-9 rounded-md bg-white/0 text-[var(--app-muted)] hover:bg-[var(--app-surface-2)] border border-transparent hover:border-[var(--app-border)]`;

  const unlockedPrompts = prompts.filter((p) => !p.locked);
  const lockedPrompts = prompts.filter((p) => p.locked);
  // display buckets: treat first 2 prompts as free, next 3 as paid (if available)
  const freePrompts = prompts.length >= 2 ? prompts.slice(0, 2) : unlockedPrompts.slice(0, 2);
  const paidPrompts = prompts.length >= 3 ? prompts.slice(2, 5) : lockedPrompts.slice(0, 3);

  const validate = () => {
    if (target === "Website" && !siteType) {
      setError("Please select a Website Type.");
      return false;
    }
    if (target === "App" && !appType) {
      setError("Please select an App Type.");
      return false;
    }
    if (!framework) {
      setError("Please select a Framework.");
      return false;
    }
    if (showFrontendFields && !styleSystem) {
      setError("Please select a Style System.");
      return false;
    }
    if (showBackendFields && (!backend || !database)) {
      setError("Please select Backend and Database.");
      return false;
    }
    setError(null);
    return true;
  };

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const checkModelHealth = async () => {
      try {
        const res = await fetch(`${apiBase}/ai/website-pro/model-health`, {
          method: "GET",
          signal: controller.signal,
          cache: "no-store",
        });

        if (!res.ok) throw new Error(`Health check failed (${res.status})`);
        const data = await res.json();
        if (cancelled) return;

        if (data?.loaded && data?.status === "ok") {
          setModelHealthTone("green");
          setModelHealthLabel("Model: Healthy");
          setModelHealthDetail(`${data.baseModel || "model"} on ${data.device || "unknown device"}`);
          return;
        }

        if (data?.status === "disabled" || data?.enabled === false) {
          setModelHealthTone("yellow");
          setModelHealthLabel("Model: Disabled");
          setModelHealthDetail("Adapter generation is disabled; fallback templates are active.");
          return;
        }

        setModelHealthTone("red");
        setModelHealthLabel("Model: Error");
        setModelHealthDetail(data?.error || "Adapter failed to load.");
      } catch (err: any) {
        if (cancelled) return;
        setModelHealthTone("red");
        setModelHealthLabel("Model: Offline");
        setModelHealthDetail(err?.message || "Could not reach model health endpoint.");
      }
    };

    checkModelHealth();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [apiBase]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<{
        target: string;
        siteType: string;
        appType: string;
        framework: string;
        styleSystem: string;
        backend: string;
        database: string;
        apiStyle: string;
        authenticationRequired: boolean;
        features: string[];
        userFlow: string;
        authType: string;
        stateManagement: string;
        performanceOptimization: string;
        integrations: string;
        projectStructure: string;
        testingRequirements: string;
        uiComplexity: string;
        platformTarget: string;
        uiFocus: string;
        componentsFocus: string;
        targetAudience: string;
        mustHaveFeatures: string;
        primaryOutcome: string;
        profileDeveloperType: DeveloperType;
        developerTypeOverride: boolean;
        developerType: DeveloperType;
        includeDiscoveryQuestions: boolean;
        useModelOutput: boolean;
        questions: string[];
        goal: string;
        prompts: Prompt[];
        error: string | null;
      }>;

      if (typeof parsed.target === "string") setTarget(parsed.target);
      if (typeof parsed.siteType === "string") setSiteType(parsed.siteType);
      if (typeof parsed.appType === "string") setAppType(parsed.appType);
      if (typeof parsed.framework === "string") setFramework(parsed.framework);
      if (typeof parsed.styleSystem === "string") setStyleSystem(parsed.styleSystem);
      if (typeof parsed.backend === "string") setBackend(parsed.backend);
      if (typeof parsed.database === "string") setDatabase(parsed.database);
      if (typeof parsed.apiStyle === "string") setApiStyle(parsed.apiStyle);
      if (typeof parsed.authenticationRequired === "boolean") setAuthenticationRequired(parsed.authenticationRequired);
      if (Array.isArray(parsed.features)) setSelectedFeatures(parsed.features.filter((feature): feature is string => typeof feature === "string"));
      if (typeof parsed.userFlow === "string") setUserFlow(parsed.userFlow);
      if (typeof parsed.authType === "string") setAuthType(parsed.authType);
      if (typeof parsed.stateManagement === "string") setStateManagement(parsed.stateManagement);
      if (typeof parsed.performanceOptimization === "string") setPerformanceOptimization(parsed.performanceOptimization);
      if (typeof parsed.integrations === "string") setIntegrations(parsed.integrations);
      if (typeof parsed.projectStructure === "string") setProjectStructure(parsed.projectStructure);
      if (typeof parsed.testingRequirements === "string") setTestingRequirements(parsed.testingRequirements);
      if (typeof parsed.uiComplexity === "string") setUiComplexity(parsed.uiComplexity);
      if (typeof parsed.platformTarget === "string") setPlatformTarget(parsed.platformTarget);
      if (typeof parsed.uiFocus === "string") setUiFocus(parsed.uiFocus);
      if (typeof parsed.componentsFocus === "string") setComponentsFocus(parsed.componentsFocus);
      if (typeof parsed.targetAudience === "string") setTargetAudience(parsed.targetAudience);
      if (typeof parsed.mustHaveFeatures === "string") setMustHaveFeatures(parsed.mustHaveFeatures);
      if (typeof parsed.primaryOutcome === "string") setPrimaryOutcome(parsed.primaryOutcome);
      if (parsed.profileDeveloperType === "frontend" || parsed.profileDeveloperType === "backend" || parsed.profileDeveloperType === "full_stack") {
        setProfileDeveloperType(parsed.profileDeveloperType);
      }
      if (typeof parsed.developerTypeOverride === "boolean") setDeveloperTypeOverride(parsed.developerTypeOverride);
      if (parsed.developerType === "frontend" || parsed.developerType === "backend" || parsed.developerType === "full_stack") {
        setDeveloperType(parsed.developerType);
      }
      if (typeof parsed.includeDiscoveryQuestions === "boolean") setIncludeDiscoveryQuestions(parsed.includeDiscoveryQuestions);
      if (typeof parsed.useModelOutput === "boolean") setUseModelOutput(parsed.useModelOutput);
      if (Array.isArray(parsed.questions)) setQuestions(parsed.questions.filter((q): q is string => typeof q === "string"));
      if (typeof parsed.goal === "string") setGoal(parsed.goal);
      if (Array.isArray(parsed.prompts)) setPrompts(parsed.prompts);
      if (typeof parsed.error === "string" || parsed.error === null) setError(parsed.error ?? null);
    } catch {
      // ignore restore issues
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          target,
          siteType,
          appType,
          framework,
          styleSystem,
          backend,
          database,
          apiStyle,
          authenticationRequired,
          selectedFeatures,
          userFlow,
          authType,
          stateManagement,
          performanceOptimization,
          integrations,
          projectStructure,
          testingRequirements,
          uiComplexity,
          platformTarget,
          uiFocus,
          componentsFocus,
          targetAudience,
          mustHaveFeatures,
          primaryOutcome,
          profileDeveloperType,
          developerTypeOverride,
          developerType,
          includeDiscoveryQuestions,
          useModelOutput,
          questions,
          goal,
          prompts,
          error,
        }),
      );
    } catch {
      // ignore persistence issues
    }
  }, [target, siteType, appType, framework, styleSystem, backend, database, apiStyle, authenticationRequired, selectedFeatures, userFlow, authType, stateManagement, performanceOptimization, integrations, projectStructure, testingRequirements, uiComplexity, platformTarget, uiFocus, componentsFocus, targetAudience, mustHaveFeatures, primaryOutcome, profileDeveloperType, developerTypeOverride, developerType, includeDiscoveryQuestions, useModelOutput, questions, goal, prompts, error]);

  useEffect(() => {
    const localDeveloperType = user?.developerType;
    if (localDeveloperType === "frontend" || localDeveloperType === "backend" || localDeveloperType === "full_stack") {
      setProfileDeveloperType(localDeveloperType);
    }

    const numericId = Number(user?.id);
    if (!user?.id || Number.isNaN(numericId)) {
      return;
    }

    let cancelled = false;
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${apiBase}/users/${numericId}/profile`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { developer_type?: string };
        const backendType = data.developer_type;
        if (!cancelled && (backendType === "frontend" || backendType === "backend" || backendType === "full_stack")) {
          setProfileDeveloperType(backendType);
        }
      } catch {
        // keep local profile value
      }
    };

    void fetchProfile();
    return () => {
      cancelled = true;
    };
  }, [apiBase, user?.id, user?.developerType]);

  useEffect(() => {
    if (!uiFocusOptions.includes(uiFocus)) {
      setUiFocus(uiFocusOptions[0]);
    }
    if (!componentsFocusOptions.includes(componentsFocus)) {
      setComponentsFocus(componentsFocusOptions[0]);
    }
    if (!targetAudienceOptions.includes(targetAudience)) {
      setTargetAudience(targetAudienceOptions[0]);
    }
    if (!mustHaveFeaturesOptions.includes(mustHaveFeatures)) {
      setMustHaveFeatures(mustHaveFeaturesOptions[0]);
    }
    if (!primaryOutcomeOptions.includes(primaryOutcome)) {
      setPrimaryOutcome(primaryOutcomeOptions[0]);
    }
  }, [
    uiFocus,
    uiFocusOptions,
    componentsFocus,
    componentsFocusOptions,
    targetAudience,
    targetAudienceOptions,
    mustHaveFeatures,
    mustHaveFeaturesOptions,
    primaryOutcome,
    primaryOutcomeOptions,
  ]);

  const handleGenerate = async () => {
    if (!validate()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${apiBase}/ai/website-pro/generate-prompts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Plan": plan ?? "free", // VERY IMPORTANT
        },
        body: JSON.stringify({
          target,
          siteType: target === "Website" ? siteType : "",
          appType: target === "App" ? appType : "",
          framework,
          styleSystem: showFrontendFields ? styleSystem : "",
          backend: showBackendFields ? backend : "",
          database: showBackendFields ? database : "",
          developerType: effectiveDeveloperType,
          features: selectedFeatures,
          userFlow,
          authType,
          stateManagement: showFrontendFields ? stateManagement : null,
          performanceOptimization: showFrontendFields ? performanceOptimization : null,
          integrations: showBackendFields ? integrations : null,
          projectStructure,
          testingRequirements,
          uiComplexity: showFrontendFields ? uiComplexity : null,
          platformTarget,
          uiFocus: showFrontendFields ? uiFocus : null,
          componentsFocus: showFrontendFields ? componentsFocus : null,
          apiStyle: showBackendFields ? apiStyle : null,
          authenticationRequired: showBackendFields ? authenticationRequired : null,
          includeDiscoveryQuestions,
          useModelOutput,
          goal: optimizedGoal,
        }),
      });

      if (!res.ok) throw new Error("Failed to generate prompts");

      const data = await res.json();

      // Directly use backend response
      setPrompts(data.prompts ?? []);
      setQuestions(Array.isArray(data.questions) ? data.questions : []);
      if (!developerTypeOverride && (data.developerType === "frontend" || data.developerType === "backend" || data.developerType === "full_stack")) {
        setProfileDeveloperType(data.developerType);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast("Prompt copied");
    } catch {
      showToast("Unable to copy");
    }
  };

  // small inline toast for feedback
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  };

  return (
    <section className={`rounded-[18px] border border-(--app-border) bg-linear-to-br from-(--app-surface) via-[rgba(255,255,255,0.02)] to-(--app-surface) p-6 ${stylesModule.container}`}>
      <div className="flex items-center gap-4">
        <div className="rounded-lg bg-linear-to-tr from-(--accent) to-(--accent-foreground) p-3 text-white shadow-md">
          <Sparkles size={20} />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-(--app-text)">Prompt Generator</h3>
          <p className="mt-1 text-sm text-(--app-muted) max-w-xl">Create high-quality, production-ready prompts for scaffolding websites and apps — instantly.</p>
        </div>
        <div className="ml-auto flex items-center gap-2 text-sm text-(--app-muted)">
          <span
            className={`${stylesModule.healthBadge} ${
              modelHealthTone === "green"
                ? stylesModule.healthGreen
                : modelHealthTone === "yellow"
                  ? stylesModule.healthYellow
                  : stylesModule.healthRed
            }`}
            title={modelHealthDetail}
          >
            {modelHealthLabel}
          </span>
          {prompts.length > 0 ? <span>{prompts.length} prompts</span> : null}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className={stylesModule.segmented} role="tablist" aria-label="Project target">
          <button
            onClick={() => setTarget("Website")}
            className={`${stylesModule.segmentBtn} ${target === "Website" ? stylesModule.segmentBtnActive : stylesModule.segmentBtnIdle}`}
          >
            Website
          </button>
          <button
            onClick={() => setTarget("App")}
            className={`${stylesModule.segmentBtn} ${target === "App" ? stylesModule.segmentBtnActive : stylesModule.segmentBtnIdle}`}
          >
            App
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={stylesModule.metaPill}>Mode: {target}</span>
          <span className={stylesModule.metaPill}>Type: {effectiveDeveloperType.replace("_", " ")}</span>
        </div>
      </div>

      <div className={`mt-4 text-sm text-(--app-muted) ${stylesModule.sectionPanel}`}>
        <p className={stylesModule.sectionTitle}>Generation Preferences</p>
        <div className={stylesModule.preferencesGrid}>
          <div className={stylesModule.preferencesRow}>
            <div className={stylesModule.profileInfo}>
              <span className={stylesModule.profileLabel}>Profile Developer Type</span>
              <strong className={stylesModule.profileValue}>{profileDeveloperType.replace("_", " ")}</strong>
            </div>
            <label className={stylesModule.checkboxLabel}>
            <input
              type="checkbox"
                className={stylesModule.checkboxInput}
              checked={developerTypeOverride}
              onChange={(e) => setDeveloperTypeOverride(e.target.checked)}
            />
              Choose developer type for this prompt
          </label>
          </div>

          <label className={stylesModule.checkboxLabel}>
            <input
              type="checkbox"
              className={stylesModule.checkboxInput}
              checked={includeDiscoveryQuestions}
              onChange={(e) => setIncludeDiscoveryQuestions(e.target.checked)}
            />
            Include discovery questions in generated prompts
          </label>

          <label className={stylesModule.checkboxLabel}>
            <input
              type="checkbox"
              className={stylesModule.checkboxInput}
              checked={useModelOutput}
              onChange={(e) => setUseModelOutput(e.target.checked)}
            />
            Use model output instead of deterministic templates
          </label>
          <span className={stylesModule.helperText}>Leave this off for the fastest response and cleaner prompts.</span>
        </div>
        {developerTypeOverride ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <button onClick={() => setDeveloperType("frontend")} className={`${stylesModule.preferenceBtn} ${developerType === "frontend" ? stylesModule.preferenceBtnActive : ""}`}>Frontend</button>
            <button onClick={() => setDeveloperType("backend")} className={`${stylesModule.preferenceBtn} ${developerType === "backend" ? stylesModule.preferenceBtnActive : ""}`}>Backend</button>
            <button onClick={() => setDeveloperType("full_stack")} className={`${stylesModule.preferenceBtn} ${developerType === "full_stack" ? stylesModule.preferenceBtnActive : ""}`}>Full Stack</button>
          </div>
        ) : null}
      </div>

      <div className={`mt-4 ${stylesModule.sectionPanel}`}>
        <p className={stylesModule.sectionTitle}>Project Inputs</p>
      <div className={`grid gap-3 md:grid-cols-2 ${stylesModule.formGrid}`}>
        {target === "Website" ? (
          <label className={`space-y-1 text-sm ${stylesModule.formLabel}`}>
            <span className={`text-(--app-muted)`}>Website Type</span>
            <select value={siteType} onChange={(e) => setSiteType(e.target.value)} className={`w-full rounded-xl border px-3 py-2 bg-(--app-surface-2) ${stylesModule.control} ${stylesModule.select}`}>
              <option value="">Select website type</option>
              {siteTypes.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <span className={stylesModule.helperText}>Pick the primary website category you want to scaffold.</span>
          </label>
        ) : (
          <label className={`space-y-1 text-sm ${stylesModule.formLabel}`}>
            <span className={`text-(--app-muted)`}>App Type</span>
            <select value={appType} onChange={(e) => setAppType(e.target.value)} className={`w-full rounded-xl border px-3 py-2 bg-(--app-surface-2) ${stylesModule.control} ${stylesModule.select}`}>
              <option value="">Select app type</option>
              {appTypes.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <span className={stylesModule.helperText}>Choose the kind of application experience you want to build.</span>
          </label>
        )}

        <label className={`space-y-1 text-sm ${stylesModule.formLabel}`}>
          <span className={`text-(--app-muted)`}>Framework</span>
          <select value={framework} onChange={(e) => setFramework(e.target.value)} className={`w-full rounded-xl border px-3 py-2 bg-(--app-surface-2) ${stylesModule.control} ${stylesModule.select}`}>
            {frameworks.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
          <span className={stylesModule.helperText}>This sets the baseline stack for generated prompts.</span>
        </label>
        <div className={`md:col-span-2 ${stylesModule.fieldSection}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className={stylesModule.fieldSectionTitle}>Product context</p>
              <p className={stylesModule.helperText}>Shared inputs that shape every prompt variant, regardless of developer type.</p>
            </div>
            <span className={stylesModule.metaPill}>Shared</span>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <label className="space-y-1 text-sm lg:col-span-2">
              <span className={`text-(--app-muted)`}>Features</span>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {FEATURE_OPTIONS.map((feature) => {
                  const checked = selectedFeatures.includes(feature.key);
                  return (
                    <label
                      key={feature.key}
                      className={`rounded-2xl border px-3 py-3 transition-all ${checked ? "border-[var(--app-text)] bg-[var(--app-surface)] shadow-sm" : "border-[var(--app-border)] bg-[var(--app-surface-2)] hover:border-[var(--app-text)]/30"}`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          className={stylesModule.checkboxInput}
                          checked={checked}
                          onChange={(event) => {
                            setSelectedFeatures((current) =>
                              event.target.checked ? [...current, feature.key] : current.filter((item) => item !== feature.key),
                            );
                          }}
                        />
                        <div>
                          <div className="font-medium text-[var(--app-text)]">{feature.label}</div>
                          <div className="mt-1 text-xs leading-5 text-[var(--app-muted)]">{feature.description}</div>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </label>

            <label className="space-y-1 text-sm lg:col-span-2">
              <span className={`text-(--app-muted)`}>User Flow</span>
              <textarea value={userFlow} onChange={(event) => setUserFlow(event.target.value)} rows={4} className={`w-full rounded-xl border px-3 py-2 bg-(--app-surface-2) ${stylesModule.control} ${stylesModule.textarea}`} />
              <span className={stylesModule.helperText}>Describe the journey step by step so the prompt can preserve the intended product flow.</span>
            </label>

            <label className={`space-y-1 text-sm ${stylesModule.formLabel}`}>
              <span className={`text-(--app-muted)`}>Platform Target</span>
              <select value={platformTarget} onChange={(event) => setPlatformTarget(event.target.value)} className={`w-full rounded-xl border px-3 py-2 bg-[var(--app-surface-2)] ${stylesModule.control} ${stylesModule.select}`}>
                {PLATFORM_TARGET_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>

            <label className={`space-y-1 text-sm ${stylesModule.formLabel}`}>
              <span className={`text-(--app-muted)`}>Project Structure</span>
              <select value={projectStructure} onChange={(event) => setProjectStructure(event.target.value)} className={`w-full rounded-xl border px-3 py-2 bg-[var(--app-surface-2)] ${stylesModule.control} ${stylesModule.select}`}>
                {PROJECT_STRUCTURE_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>

            <label className={`space-y-1 text-sm ${stylesModule.formLabel}`}>
              <span className={`text-(--app-muted)`}>Testing Requirements</span>
              <select value={testingRequirements} onChange={(event) => setTestingRequirements(event.target.value)} className={`w-full rounded-xl border px-3 py-2 bg-[var(--app-surface-2)] ${stylesModule.control} ${stylesModule.select}`}>
                {TESTING_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {showFrontendFields ? (
          <div className={`md:col-span-2 ${stylesModule.fieldSection}`}>
            <p className={stylesModule.fieldSectionTitle}>Frontend settings</p>
            <div className="grid gap-3 md:grid-cols-2">
            <label className={`space-y-1 text-sm ${stylesModule.formLabel}`}>
              <span className={`text-(--app-muted)`}>Style System</span>
              <select value={styleSystem} onChange={(e) => setStyleSystem(e.target.value)} className={`w-full rounded-xl border px-3 py-2 bg-(--app-surface-2) ${stylesModule.control} ${stylesModule.select}`}>
                {styles.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <span className={stylesModule.helperText}>Set your preferred styling approach for generated UI code.</span>
            </label>

            <label className={`space-y-1 text-sm ${stylesModule.formLabel}`}>
              <span className={`text-(--app-muted)`}>UI Focus</span>
              <select value={uiFocus} onChange={(e) => setUiFocus(e.target.value)} className={`w-full rounded-xl border px-3 py-2 bg-(--app-surface-2) ${stylesModule.control} ${stylesModule.select}`}>
                {uiFocusOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <span className={stylesModule.helperText}>Define what quality bar the interface should meet.</span>
            </label>

            <label className="md:col-span-2 space-y-1 text-sm">
              <span className={`text-(--app-muted)`}>Components Focus</span>
              <select value={componentsFocus} onChange={(e) => setComponentsFocus(e.target.value)} className={`w-full rounded-xl border px-3 py-2 bg-(--app-surface-2) ${stylesModule.control} ${stylesModule.select}`}>
                {componentsFocusOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <span className={stylesModule.helperText}>Prioritize the building blocks that should be generated first.</span>
            </label>

            <label className={`space-y-1 text-sm ${stylesModule.formLabel}`}>
              <span className={`text-(--app-muted)`}>Target Audience</span>
              <select value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} className={`w-full rounded-xl border px-3 py-2 bg-(--app-surface-2) ${stylesModule.control} ${stylesModule.select}`}>
                {targetAudienceOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <span className={stylesModule.helperText}>Example: founders, students, internal teams, or enterprise users.</span>
            </label>

            <label className={`space-y-1 text-sm ${stylesModule.formLabel}`}>
              <span className={`text-(--app-muted)`}>State Management</span>
              <select value={stateManagement} onChange={(event) => setStateManagement(event.target.value)} className={`w-full rounded-xl border px-3 py-2 bg-[var(--app-surface-2)] ${stylesModule.control} ${stylesModule.select}`}>
                {STATE_MANAGEMENT_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <span className={stylesModule.helperText}>Select the client-state pattern that should be reflected in the prompt.</span>
            </label>

            <label className={`space-y-1 text-sm ${stylesModule.formLabel}`}>
              <span className={`text-(--app-muted)`}>UI Complexity</span>
              <select value={uiComplexity} onChange={(event) => setUiComplexity(event.target.value)} className={`w-full rounded-xl border px-3 py-2 bg-[var(--app-surface-2)] ${stylesModule.control} ${stylesModule.select}`}>
                {['Low', 'Moderate', 'High', 'Enterprise-grade'].map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <span className={stylesModule.helperText}>This helps the prompt set the right level of polish and interaction depth.</span>
            </label>

            <label className="md:col-span-2 space-y-1 text-sm">
              <span className={`text-(--app-muted)`}>Performance / Optimization</span>
              <textarea value={performanceOptimization} onChange={(event) => setPerformanceOptimization(event.target.value)} rows={3} className={`w-full rounded-xl border px-3 py-2 bg-[var(--app-surface-2)] ${stylesModule.control} ${stylesModule.textarea}`} />
              <span className={stylesModule.helperText}>Capture animations, loading strategy, and UI performance expectations.</span>
            </label>

            <label className={`space-y-1 text-sm ${stylesModule.formLabel}`}>
              <span className={`text-(--app-muted)`}>Must-have Features</span>
              <select value={mustHaveFeatures} onChange={(e) => setMustHaveFeatures(e.target.value)} className={`w-full rounded-xl border px-3 py-2 bg-(--app-surface-2) ${stylesModule.control} ${stylesModule.select}`}>
                {mustHaveFeaturesOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <span className={stylesModule.helperText}>List 2-4 essential features for better prompt precision.</span>
            </label>

            <label className="md:col-span-2 space-y-1 text-sm">
              <span className={`text-(--app-muted)`}>Primary Outcome</span>
              <select value={primaryOutcome} onChange={(e) => setPrimaryOutcome(e.target.value)} className={`w-full rounded-xl border px-3 py-2 bg-(--app-surface-2) ${stylesModule.control} ${stylesModule.select}`}>
                {primaryOutcomeOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <span className={stylesModule.helperText}>Example: launch MVP fast, optimize conversion, or reduce support requests.</span>
            </label>
            </div>
          </div>
        ) : null}

        {showBackendFields ? (
          <div className={`md:col-span-2 ${stylesModule.fieldSection}`}>
            <p className={stylesModule.fieldSectionTitle}>Backend settings</p>
            <div className="grid gap-3 md:grid-cols-2">
            <label className={`space-y-1 text-sm ${stylesModule.formLabel}`}>
              <span className={`text-(--app-muted)`}>Backend</span>
              <select value={backend} onChange={(e) => setBackend(e.target.value)} className={`w-full rounded-xl border px-3 py-2 bg-(--app-surface-2) ${stylesModule.control} ${stylesModule.select}`}>
                {backends.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
              <span className={stylesModule.helperText}>Choose the API/service runtime for implementation prompts.</span>
            </label>

            <label className={`space-y-1 text-sm ${stylesModule.formLabel}`}>
              <span className={`text-(--app-muted)`}>Database</span>
              <select value={database} onChange={(e) => setDatabase(e.target.value)} className={`w-full rounded-xl border px-3 py-2 bg-(--app-surface-2) ${stylesModule.control} ${stylesModule.select}`}>
                {databases.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <span className={stylesModule.helperText}>Defines data modeling and migration guidance in output prompts.</span>
            </label>

            <label className={`space-y-1 text-sm ${stylesModule.formLabel}`}>
              <span className={`text-(--app-muted)`}>API Style</span>
              <input value={apiStyle} onChange={(e) => setApiStyle(e.target.value)} placeholder="REST with clear contracts and robust validation" className={`w-full rounded-xl border px-3 py-2 bg-(--app-surface-2) ${stylesModule.control}`} />
              <span className={stylesModule.helperText}>Set expectations for endpoint structure and conventions.</span>
            </label>

            <label className={`space-y-1 text-sm ${stylesModule.formLabel}`}>
              <span className={`text-(--app-muted)`}>Authentication</span>
              <select value={authenticationRequired ? "required" : "optional"} onChange={(e) => setAuthenticationRequired(e.target.value === "required")} className={`w-full rounded-xl border px-3 py-2 bg-(--app-surface-2) ${stylesModule.control} ${stylesModule.select}`}>
                <option value="required">Required</option>
                <option value="optional">Optional / Deferred</option>
              </select>
              <span className={stylesModule.helperText}>Control whether auth should be included in initial scaffolding.</span>
            </label>

            <label className={`space-y-1 text-sm ${stylesModule.formLabel}`}>
              <span className={`text-(--app-muted)`}>Auth Type</span>
              <select value={authType} onChange={(event) => setAuthType(event.target.value)} className={`w-full rounded-xl border px-3 py-2 bg-[var(--app-surface-2)] ${stylesModule.control} ${stylesModule.select}`}>
                {AUTH_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <span className={stylesModule.helperText}>Add the exact auth pattern the frontend should coordinate with.</span>
            </label>

            <label className={`space-y-1 text-sm ${stylesModule.formLabel}`}>
              <span className={`text-(--app-muted)`}>Integrations</span>
              <select value={integrations} onChange={(event) => setIntegrations(event.target.value)} className={`w-full rounded-xl border px-3 py-2 bg-[var(--app-surface-2)] ${stylesModule.control} ${stylesModule.select}`}>
                {INTEGRATION_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <span className={stylesModule.helperText}>Useful for payment, messaging, analytics, or third-party services.</span>
            </label>
            </div>
          </div>
        ) : null}

        <label className="md:col-span-2 space-y-1">
          <span className="text-(--app-muted)">Project Goal</span>
          <textarea value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Generate multiple prompt variants with clear architecture, phases, and implementation priorities." rows={3} className={`w-full rounded-xl border px-3 py-2 ${stylesModule.control} ${stylesModule.textarea}`} />
          <span className={stylesModule.helperText}>A specific goal produces more precise prompts.</span>
        </label>

        <div className={`md:col-span-2 ${stylesModule.actions}`}>
          <button onClick={handleGenerate} disabled={loading} className={`${stylesModule.generateBtn} flex items-center gap-2`}>
            {loading ? <Loader2 className="animate-spin" size={16} /> : null}
            {loading ? "Generating..." : "Generate Prompts"}
          </button>
          <button onClick={() => { setPrompts([]); setQuestions([]); setError(null); }} className={`${stylesModule.btnSecondary} text-sm`}>Clear</button>
        </div>
      </div>
      </div>

      <section className={`mt-4 ${stylesModule.sectionPanel}`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-(--app-text)">Role-based discovery questions</h3>
            <p className="text-sm text-(--app-muted)">These questions update with the selected developer type and the backend generator uses them to sharpen the prompts.</p>
          </div>
          <span className={stylesModule.metaPill}>{effectiveDeveloperType.replace("_", " ")}</span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {discoveryHints.map((hint) => (
            <div key={hint} className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-2)] p-4 text-sm text-[var(--app-text)] shadow-sm transition-transform duration-150 hover:-translate-y-0.5">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-[var(--app-surface)] p-2 text-[var(--app-muted)]">
                  <ArrowRight size={14} />
                </div>
                <p className="leading-6 text-[var(--app-muted)]">{hint}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {error && <p className="mt-3 text-xs text-rose-300">{error}</p>}

      <div className="mt-6 mx-auto max-w-6xl">
        {/* Inline toast */}
        {toast ? (
          <div className="fixed right-6 bottom-6 z-50 rounded-full bg-(--app-surface-2) px-4 py-2 shadow-lg text-sm">
            {toast}
          </div>
        ) : null}
        <div className={stylesModule.resultsHeader}>
          <div>
            <h3 className="text-lg font-semibold text-(--app-text)">Generated Prompts</h3>
            <p className="text-sm text-(--app-muted)">Copy and use the generated prompts.</p>
          </div>
          <span className={stylesModule.metaPill}>{prompts.length > 0 ? `${prompts.length} available` : "Generate to see prompts"}</span>
        </div>

        {prompts.length === 0 ? (
          <div className={stylesModule.emptyState}>
            <Sparkles size={18} />
            <p>Set your inputs and click Generate Prompts.</p>
          </div>
        ) : null}
        {/* Top: two free prompts centered above the paid cards; side-by-side on sm+ screens */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div />
          <div className="w-full sm:col-span-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-6 justify-items-stretch items-stretch">
              {(freePrompts.length > 0 ? freePrompts : [
                { title: 'Basic', prompt: 'Create a concise prompt to scaffold a Microblog Website using React. Goal: Generate 5 prompt variants for developers to scaffold the project.', locked: false },
                { title: 'Improved', prompt: 'Produce an improved prompt detailing folder structure, main components, and a sample API contract for React.', locked: false },
              ]).map((p, idx) => {
                const Icon = promptCardIcons[idx % promptCardIcons.length];
                return (
                <article key={idx} className={`group relative rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 min-h-44 shadow-sm overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:border-[var(--app-text)]/20 ${stylesModule.card}`}>
                  <div className="absolute top-3 right-3 z-20">
                    <button aria-label="Copy icon" onClick={() => copy(p.prompt)} className={`${copyBtnClass} ${""}`}>
                      <Copy size={14} aria-hidden />
                    </button>
                  </div>

                  <div className="relative z-10">
                    <div className="flex items-start gap-3">
                      <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-2)] p-3 text-[var(--app-text)] shadow-sm transition-transform duration-200 group-hover:-translate-y-0.5">
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <h4 className={`text-xl font-semibold tracking-tight text-(--app-text) ${stylesModule.cardTitle}`}>{p.title}</h4>
                          <span className={stylesModule.chip}>Unlocked</span>
                        </div>
                        <p className={`mt-3 text-sm ${stylesModule.promptText} leading-relaxed ${stylesModule.clamp3}`}>{p.prompt}</p>
                      </div>
                    </div>
                  </div>
                </article>
                );
              })}
            </div>
          </div>
          <div />
        </div>

        {/* Paid prompts: three compact cards in a row */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6 justify-items-center">
              {(paidPrompts.length > 0 ? paidPrompts : [
            { title: 'Advanced', prompt: 'Generate an advanced prompt covering SSR/SSG, performance budgets, and a DB schema for MySQL.', locked: true },
            { title: 'Expert', prompt: 'Provide an expert-level prompt that includes CI/CD, Docker, tests, and security hardening for scaling the project.', locked: true },
            { title: 'Premium', prompt: 'Premium prompt: full runnable scaffolding, seeding scripts, and deployment manifests tailored for React + MySQL.', locked: true },
          ]).map((p, i) => {
            const Icon = promptCardIcons[i % promptCardIcons.length];
            // Client-side guard: for free users, paid section items are always locked.
            const effectiveLocked = !isPaid;
            return (
                  <article key={i} className={`group relative rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 min-h-44 shadow-sm overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:border-[var(--app-text)]/20 ${stylesModule.card}`}>
                    {effectiveLocked && (
                      <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 rounded-3xl backdrop-blur-sm bg-black/45 text-white">
                        <div className="rounded-full border border-white/20 p-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                          <Lock size={22} />
                        </div>
                        <div className="text-sm font-semibold">Locked</div>
                        <div className="flex items-center gap-2">
                        <button
                          onClick={() => router.push('/billing')}
                          className="mt-1 inline-flex items-center gap-2 rounded-full bg-yellow-400 px-4 py-2 text-sm font-semibold text-black shadow transition-transform duration-150 hover:-translate-y-0.5"
                        >
                          Upgrade to Unlock
                        </button>
                      </div>
                      </div>
                    )}

                    <div className="absolute top-3 right-3 z-20">
                      {!effectiveLocked ? (
                        <button aria-label="Copy prompt" onClick={() => copy(p.prompt)} className={`${copyBtnClass} ${stylesModule.copyBtn}`}>
                          <Copy size={14} aria-hidden />
                        </button>
                      ) : (
                        <div aria-hidden className={`${copyBtnClass} opacity-40 pointer-events-none`}>
                          <Copy size={14} aria-hidden />
                        </div>
                      )}
                    </div>

                    <div className={`relative z-10 transition-all ${effectiveLocked ? 'filter blur-sm' : 'opacity-100'}`}>
                        <div className="flex items-start gap-3">
                          <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-2)] p-3 text-[var(--app-text)] shadow-sm transition-transform duration-200 group-hover:-translate-y-0.5">
                            <Icon size={18} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <h4 className={`text-xl font-semibold tracking-tight text-(--app-text) ${stylesModule.cardTitle}`}>{p.title}</h4>
                              <span className={stylesModule.chip}>{effectiveLocked ? 'Locked' : 'Unlocked'}</span>
                            </div>
                            <p className={`mt-3 text-sm ${stylesModule.promptText} leading-relaxed ${stylesModule.clamp4}`}>{p.prompt}</p>
                          </div>
                        </div>
                    </div>
                  </article>
            );
          })}
        </div>
      </div>

      <section className={`mt-6 p-5 ${stylesModule.sectionPanel}`}>
        <h3 className="text-lg font-semibold text-(--app-text)">Generated Build Plan</h3>
        <div className="mt-3 space-y-2 text-sm text-(--app-muted)">
          {generatedPlan.map((item) => (
            <div key={item} className="rounded-xl border border-(--app-border) bg-(--app-surface-2) p-3 text-(--app-text)">{item}</div>
          ))}
        </div>
      </section>
    </section>
  );
}
