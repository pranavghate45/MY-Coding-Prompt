import { NextResponse } from "next/server";

type PromptVariant = {
  title: string;
  prompt: string;
  locked?: boolean;
};

type RequestBody = {
  target?: string;
  siteType?: string;
  appType?: string;
  framework?: string;
  styleSystem?: string;
  backend?: string;
  database?: string;
  developerType?: string;
  features?: string[];
  userFlow?: string;
  projectStructure?: string;
  testingRequirements?: string;
  uiComplexity?: string;
  platformTarget?: string;
  goal?: string;
  includeDiscoveryQuestions?: boolean;
  useModelOutput?: boolean;
};

const promptTitles = ["Basic", "Improved", "Optimized", "Pro", "Premium"] as const;

function buildFallbackPrompts(input: RequestBody): PromptVariant[] {
  const projectType = (input.target || input.siteType || input.appType || "Website").trim() || "Website";
  const projectName = input.goal?.split("\n")[0]?.trim() || `New ${projectType}`;
  const stack = [input.framework, input.styleSystem, input.backend, input.database].filter(Boolean).join(" · ");
  const features = Array.isArray(input.features) && input.features.length > 0 ? input.features.join(", ") : "No features selected";
  const userFlow = input.userFlow || "Define the key user journey first.";
  const platformTarget = input.platformTarget || projectType;

  return promptTitles.map((title, index) => ({
    title,
    locked: index >= 2,
    prompt:
      index === 0
        ? `Create a simple ${projectType.toLowerCase()} for ${projectName}. Use ${stack || "the chosen stack"} and keep the first version focused on a clean scaffold, core pages, and the main user flow. Features: ${features}. User flow: ${userFlow}. Platform target: ${platformTarget}.`
        : index === 1
          ? `Write a more detailed prompt for a ${projectType.toLowerCase()} called ${projectName}. Include component structure, data flow, and the selected stack (${stack || "the chosen stack"}). Make sure the prompt asks for a polished MVP with clear deliverables and testing guidance. Features: ${features}.`
          : index === 2
            ? `Generate an optimized prompt for a ${projectType.toLowerCase()} project. Require architecture decisions, performance notes, testing, and a maintainable structure using ${stack || "the selected stack"}. Goal: ${projectName}.`
            : index === 3
              ? `Create a production-ready prompt for ${projectName}. Focus on security, scaling, observability, and a strong delivery plan for ${projectType.toLowerCase()} development. Stack: ${stack || "the selected stack"}.`
              : `Write a premium prompt for ${projectName} that covers implementation, QA, deployment, and release readiness for the chosen ${projectType.toLowerCase()} stack.`,
  }));
}

export async function POST(request: Request) {
  const body = (await request.json()) as RequestBody;
  const backendBase = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

  try {
    const response = await fetch(`${backendBase}/ai/website-pro/generate-prompts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User-Plan": request.headers.get("X-User-Plan") || "free",
      },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(data);
    }
  } catch {
    // fall through to deterministic fallback below
  }

  return NextResponse.json({ prompts: buildFallbackPrompts(body) });
}