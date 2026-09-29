export type PromptStatus = "active" | "draft" | "archived";

export type PromptItem = {
  id: string;
  title: string;
  category: string;
  tags: string[];
  lastUpdated: string;
  usageCount: number;
  status: PromptStatus;
  preview: string;
};

export type AssistantModel = {
  id: string;
  name: string;
  provider: string;
  specialty: string;
  contextWindow: string;
  speed: "Fast" | "Balanced" | "Deep";
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  provider: string;
  timestamp: string;
};

export type ProjectItem = {
  id: string;
  name: string;
  category: "Web" | "Mobile" | "Automation" | "Research";
  status: "Planning" | "Active" | "Completed";
  model: string;
  updatedAt: string;
};

export const promptItems: PromptItem[] = [
  {
    id: "p-001",
    title: "Startup Idea Validator",
    category: "Business",
    tags: ["strategy", "market", "MVP"],
    lastUpdated: "2 hours ago",
    usageCount: 1284,
    status: "active",
    preview:
      "Act as a startup advisor and evaluate this business idea against market fit, competition, and monetization.",
  },
  {
    id: "p-002",
    title: "SEO Blog Writer",
    category: "Content",
    tags: ["SEO", "blog", "marketing"],
    lastUpdated: "Yesterday",
    usageCount: 912,
    status: "active",
    preview:
      "Generate a long-form SEO article with H2/H3 structure, keyword placement, and a compelling CTA.",
  },
  {
    id: "p-003",
    title: "Cold Email Personalizer",
    category: "Sales",
    tags: ["outreach", "B2B", "email"],
    lastUpdated: "3 days ago",
    usageCount: 543,
    status: "draft",
    preview:
      "Create a concise personalized cold email based on LinkedIn profile details and company context.",
  },
  {
    id: "p-004",
    title: "Interview Prep Coach",
    category: "Career",
    tags: ["interview", "career", "practice"],
    lastUpdated: "Last week",
    usageCount: 772,
    status: "active",
    preview:
      "Simulate a behavioral interview and provide STAR-format feedback with suggested improvements.",
  },
  {
    id: "p-005",
    title: "Customer Support Resolver",
    category: "Support",
    tags: ["CS", "tone", "resolution"],
    lastUpdated: "2 weeks ago",
    usageCount: 402,
    status: "archived",
    preview:
      "Draft an empathetic support response with clear steps, ownership language, and fast resolution options.",
  },
];

export const modelCatalog: AssistantModel[] = [
  {
    id: "gpt-4.1",
    name: "Model A",
    provider: "Provider A",
    specialty: "Reliable reasoning and coding support",
    contextWindow: "128K",
    speed: "Balanced",
  },
  {
    id: "gpt-4o",
    name: "Model B",
    provider: "Provider B",
    specialty: "Fast multimodal responses",
    contextWindow: "128K",
    speed: "Fast",
  },
  {
    id: "gemini-2.0-pro",
    name: "Model C",
    provider: "Provider C",
    specialty: "Large context understanding",
    contextWindow: "1M",
    speed: "Balanced",
  },
  {
    id: "sonar-pro",
    name: "Model D",
    provider: "Provider D",
    specialty: "Search-grounded answers with sources",
    contextWindow: "200K",
    speed: "Fast",
  },
  {
    id: "claude-3.7",
    name: "Model E",
    provider: "Provider E",
    specialty: "Long-form writing and analysis",
    contextWindow: "200K",
    speed: "Deep",
  },
];

export const chatHistory = [
  "Product strategy brainstorm",
  "YouTube script outline",
  "Customer research summary",
  "AI agent architecture",
  "Landing page rewrite",
];

export const starterPrompts = [
  "Build a go-to-market plan for a new SaaS product",
  "Compare top models for research",
  "Generate a complete app PRD with milestones",
  "Write a polished investor pitch deck narrative",
];

export const initialMessages: ChatMessage[] = [
  {
    id: "m-1",
    role: "assistant",
    content:
      "Welcome back. I can help you draft prompts, compare models, and produce production-ready output. Start with a question or choose a starter prompt.",
    provider: "System",
    timestamp: "09:10",
  },
  {
    id: "m-2",
    role: "user",
    content: "Compare ChatGPT, Gemini, and Perplexity for research-heavy work.",
    provider: "You",
    timestamp: "09:11",
  },
  {
    id: "m-3",
    role: "assistant",
    content:
      "For research-heavy workflows: Perplexity is strongest for web-grounded answers with citations, Gemini is excellent for very long context ingestion, and ChatGPT is strongest for structured synthesis and writing quality. A hybrid workflow usually gives the best results.",
    provider: "Assistant",
    timestamp: "09:11",
  },
];

export const analyticsSummary = {
  totalPrompts: 178,
  activeUsers: 32410,
  avgResponseTime: "1.2s",
  monthlyRuns: 294000,
  runGrowth: "+28.2%",
  retention: "81%",
};

export const activityFeed = [
  "Team switched default model",
  "Workspace added for long-context docs",
  "Search mode enabled for research",
  "12 prompts promoted from draft to active",
  "March analytics snapshot exported",
];

export const projectItems: ProjectItem[] = [
  {
    id: "prj-001",
    name: "Landing Page Generator",
    category: "Web",
    status: "Active",
    model: "Model A",
    updatedAt: "1 hour ago",
  },
  {
    id: "prj-002",
    name: "Prompt QA Automation",
    category: "Automation",
    status: "Planning",
    model: "Model E",
    updatedAt: "Today",
  },
  {
    id: "prj-003",
    name: "Knowledge Search Copilot",
    category: "Research",
    status: "Active",
    model: "Model D",
    updatedAt: "Yesterday",
  },
  {
    id: "prj-004",
    name: "Mobile Onboarding Flow",
    category: "Mobile",
    status: "Completed",
    model: "Model C",
    updatedAt: "2 days ago",
  },
];
