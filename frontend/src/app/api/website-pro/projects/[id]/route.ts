import { NextResponse } from "next/server";
import { deleteWebsiteProProject, updateWebsiteProProject } from "@/lib/website-pro-store";

type ProjectBody = {
  target?: string;
  siteType?: string;
  framework?: string;
  styleSystem?: string;
  backend?: string;
  database?: string;
  goal?: string;
  generatedPrompt?: string;
  generatedPrompts?: { title: string; prompt: string; locked?: boolean }[];
  generatedPromptTitle?: string;
  group?: { name?: string; members?: string[] };
};

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = (await request.json()) as ProjectBody;

  if (!body.siteType || !body.framework || !body.styleSystem || !body.backend || !body.database || !body.goal) {
    return NextResponse.json(
      { error: "siteType, framework, styleSystem, backend, database, and goal are required." },
      { status: 400 },
    );
  }

  const project = await updateWebsiteProProject(id, {
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

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({ project });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const deleted = await deleteWebsiteProProject(id);

  if (!deleted) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}