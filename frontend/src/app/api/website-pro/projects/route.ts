import { NextResponse } from "next/server";
import { createWebsiteProProject, listWebsiteProProjects } from "@/lib/website-pro-store";

export async function GET() {
  const projects = await listWebsiteProProjects();
  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<{
    siteType: string;
    framework: string;
    styleSystem: string;
    backend: string;
    database: string;
    goal: string;
    generatedPrompt: string;
    generatedPrompts?: { title: string; prompt: string; locked?: boolean }[];
    generatedPromptTitle: string;
    target: string;
    group?: { name?: string; members?: string[] };
  }>;

  if (!body.siteType || !body.framework || !body.styleSystem || !body.backend || !body.database || !body.goal || !body.target) {
    return NextResponse.json(
      { error: "target, siteType, framework, styleSystem, backend, database, and goal are required." },
      { status: 400 },
    );
  }

  const project = await createWebsiteProProject({
    target: body.target,
    siteType: body.siteType,
    framework: body.framework,
    styleSystem: body.styleSystem,
    backend: body.backend,
    database: body.database,
    goal: body.goal,
    generatedPrompt: body.generatedPrompt,
    generatedPrompts: body.generatedPrompts,
    generatedPromptTitle: body.generatedPromptTitle,
    group: body.group,
  });

  return NextResponse.json({ project }, { status: 201 });
}
