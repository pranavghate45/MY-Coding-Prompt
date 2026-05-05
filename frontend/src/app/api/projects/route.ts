import { NextResponse } from "next/server";
import { listWebsiteProProjects } from "@/lib/website-pro-store";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const dataDir = path.join(process.cwd(), "data");
const storePath = path.join(dataDir, "website-pro-projects.json");

export async function POST(request: Request) {
  const body = await request.json();
  const { name, category, plan } = body || {};

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  await (async () => {
    try {
      // ensure file exists
      await listWebsiteProProjects();
    } catch (e) {
      // ignore
    }
  })();

  const projects = await listWebsiteProProjects();

  const project = {
    id: `prj-${Date.now()}`,
    name,
    category: category || "Web",
    status: "Planning",
    model: plan === "paid" ? "Model (Paid)" : "Model (Free)",
    updatedAt: "Just now",
  };

  const next = [project, ...projects].slice(0, 50);
  await writeFile(storePath, JSON.stringify(next, null, 2), "utf8");

  return NextResponse.json({ project }, { status: 201 });
}
