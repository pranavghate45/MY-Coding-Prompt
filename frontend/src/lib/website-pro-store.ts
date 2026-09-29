import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type WebsiteProProject = {
  id: string;
  target?: string;
  siteType: string;
  projectName?: string;
  description?: string;
  primaryUserFlow?: string;
  framework: string;
  styleSystem: string;
  backend: string;
  database: string;
  goal: string;
  plan: string[];
  generatedPrompt?: string;
  generatedPrompts?: { title: string; prompt: string; locked?: boolean }[];
  generatedPromptTitle?: string;
  ownerEmail?: string;
  group?: {
    id: string;
    name?: string;
    members: string[];
  };
  createdAt: string;
  updatedAt?: string;
};

const dataDir = path.join(process.cwd(), "data");
const storePath = path.join(dataDir, "website-pro-projects.json");

function buildWebsitePlan(siteType: string, framework: string, styleSystem: string, backend: string, database: string) {
  return [
    `Project: ${siteType} using ${framework}`,
    `Styling: ${styleSystem}`,
    `Backend: ${backend}`,
    `Database: ${database}`,
    "Pages: Home, Features, Pricing, About, Contact",
    "Components: Hero, CTA, Testimonials, FAQ, Footer",
    "SEO: Meta tags, OG tags, sitemap, semantic headings",
    "Performance: Image optimization, code splitting, Lighthouse targets",
    "Conversion: Primary CTA strategy and trust elements",
  ];
}

async function ensureStore() {
  await mkdir(dataDir, { recursive: true });
  try {
    await readFile(storePath, "utf8");
  } catch {
    await writeFile(storePath, "[]", "utf8");
  }
}

export async function listWebsiteProProjects(): Promise<WebsiteProProject[]> {
  await ensureStore();
  const raw = await readFile(storePath, "utf8");
  const parsed = JSON.parse(raw) as WebsiteProProject[];
  return parsed.sort((a, b) => {
    const aTime = a.updatedAt ?? a.createdAt;
    const bTime = b.updatedAt ?? b.createdAt;
    return aTime < bTime ? 1 : -1;
  });
}

export async function createWebsiteProProject(input: {
  target?: string;
  siteType: string;
  projectName?: string;
  description?: string;
  primaryUserFlow?: string;
  framework: string;
  styleSystem: string;
  backend: string;
  database: string;
  goal: string;
  generatedPrompt?: string;
  generatedPrompts?: { title: string; prompt: string; locked?: boolean }[];
  generatedPromptTitle?: string;
  ownerEmail?: string;
  group?: { name?: string; members?: string[] };
}): Promise<WebsiteProProject> {
  const project: WebsiteProProject = {
    id: `wpp-${Date.now()}`,
    target: input.target,
    siteType: input.siteType,
    projectName: input.projectName,
    description: input.description,
    primaryUserFlow: input.primaryUserFlow,
    framework: input.framework,
    styleSystem: input.styleSystem,
    backend: input.backend,
    database: input.database,
    goal: input.goal,
    generatedPrompt: input.generatedPrompt,
    generatedPrompts: input.generatedPrompts,
    generatedPromptTitle: input.generatedPromptTitle,
    ownerEmail: input.ownerEmail,
    plan: buildWebsitePlan(input.siteType, input.framework, input.styleSystem, input.backend, input.database),
    group: input.group
      ? { id: `grp-${Date.now()}`, name: input.group.name, members: input.group.members || [] }
      : undefined,
    createdAt: new Date().toISOString(),
  };

  const projects = await listWebsiteProProjects();
  const nextProjects = [project, ...projects].slice(0, 50);
  await writeFile(storePath, JSON.stringify(nextProjects, null, 2), "utf8");

  return project;
}

export async function updateWebsiteProProject(
  id: string,
  input: {
    target?: string;
    siteType: string;
    projectName?: string;
    description?: string;
    primaryUserFlow?: string;
    framework: string;
    styleSystem: string;
    backend: string;
    database: string;
    goal: string;
    generatedPrompt?: string;
    generatedPrompts?: { title: string; prompt: string; locked?: boolean }[];
    generatedPromptTitle?: string;
    group?: { name?: string; members?: string[] };
  },
): Promise<WebsiteProProject | null> {
  const projects = await listWebsiteProProjects();
  const index = projects.findIndex((project) => project.id === id);
  if (index === -1) return null;

  const existing = projects[index];
  const nextProject: WebsiteProProject = {
    ...existing,
    target: input.target,
    siteType: input.siteType,
    projectName: input.projectName,
    description: input.description,
    primaryUserFlow: input.primaryUserFlow,
    framework: input.framework,
    styleSystem: input.styleSystem,
    backend: input.backend,
    database: input.database,
    goal: input.goal,
    generatedPrompt: input.generatedPrompt,
    generatedPrompts: input.generatedPrompts ?? existing.generatedPrompts,
    generatedPromptTitle: input.generatedPromptTitle,
    plan: buildWebsitePlan(input.siteType, input.framework, input.styleSystem, input.backend, input.database),
    group: input.group
      ? { id: existing.group?.id ?? `grp-${Date.now()}`, name: input.group.name, members: input.group.members || [] }
      : existing.group,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };

  projects[index] = nextProject;
  await writeFile(storePath, JSON.stringify(projects, null, 2), "utf8");
  return nextProject;
}

export async function deleteWebsiteProProject(id: string): Promise<boolean> {
  const projects = await listWebsiteProProjects();
  const nextProjects = projects.filter((project) => project.id !== id);

  if (nextProjects.length === projects.length) {
    return false;
  }

  await writeFile(storePath, JSON.stringify(nextProjects, null, 2), "utf8");
  return true;
}
