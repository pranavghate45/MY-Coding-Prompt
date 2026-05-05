from typing import List, Optional

from fastapi import APIRouter, Header
from pydantic import BaseModel

router = APIRouter()


class GenerateRequest(BaseModel):
	target: str
	siteType: str
	framework: str
	styleSystem: str
	backend: str
	database: str
	goal: str


class PromptItem(BaseModel):
	title: str
	prompt: str
	locked: bool = False


@router.post("/website-pro/generate-prompts", response_model=List[PromptItem])
def generate_prompts(req: GenerateRequest, x_user_plan: Optional[str] = Header(None)):
	"""Generate a small set of prompts for Website Pro. Freemium: free users get 2 unlocked prompts, paid users get all 5 unlocked."""

	# Simple deterministic prompt generation using the input fields
	basic = PromptItem(
		title="Basic",
		prompt=(
			f"You are an expert developer. Produce a minimal, developer-ready scaffold prompt for a {req.siteType} "
			f"using {req.framework}. Output should include: 1) a clear project folder structure with filenames, "
			f"2) required dependencies and exact commands to install and start (example `npm`/`pip` commands), "
			f"3) one or two example source-file snippets (e.g. main app entry and a sample component), and "
			f"4) a short checklist of next implementation steps. Keep the prompt focused and copy-paste ready. Goal: {req.goal}"
		),
		locked=False,
	)

	improved = PromptItem(
		title="Improved",
		prompt=(
			f"You are a senior engineer. Write a detailed, developer-actionable prompt for building a {req.siteType} "
			f"using {req.framework} and {req.styleSystem}. The prompt must request: 1) a complete folder structure with purpose for each folder, "
			f"2) component list with responsibilities and example props/interfaces, 3) a sample REST API contract (endpoints, request/response JSON), "
			f"4) recommended testing approach and example test case, and 5) an example of how to wire the frontend to the backend (fetch example). "
			f"Format the output so an AI can generate full code from it. Goal: {req.goal}"
		),
		locked=False,
	)

	advanced = PromptItem(
		title="Advanced",
		prompt=(
			f"You are an architecture lead. Produce an advanced prompt that asks for a production-ready implementation of a {req.siteType}: "
			f"include SSR vs SSG tradeoffs for {req.framework}, performance budgets (TTI, LCP targets), caching and CDN strategies, "
			f"a normalized database schema for {req.database} (DDL SQL), migration strategy, and detailed deployment steps (CI/CD, infra as code). "
			f"Include example configuration snippets (Dockerfile, NGINX config, example cloud provider CLI commands). Goal: {req.goal}"
		),
		locked=True,
	)

	expert = PromptItem(
		title="Expert",
		prompt=(
			f"You are a principal engineer. Craft an expert-level prompt that requests: 1) end-to-end CI/CD pipeline (build, test, deploy) with example YAML for GitHub Actions or GitLab CI, "
			f"2) a production-grade Dockerfile and multi-stage build, 3) automated test strategy with example unit and integration test commands, "
			f"4) security hardening checklist (CSP, authentication, secrets management), and 5) a data migration and rollback plan. Target stack: {req.framework} + {req.backend}."
		),
		locked=True,
	)

	premium = PromptItem(
		title="Premium",
		prompt=(
			f"You are building a premium deliverable. Produce a comprehensive, copy-paste-ready prompt that instructs an AI to generate: 1) a complete runnable repository scaffold (package manifests, build scripts), "
			f"2) full example source files for core features, 3) database seeding scripts and sample data, 4) deployment manifests (Kubernetes/Helm or provider-specific templates), "
			f"and 5) verification steps and smoke tests to validate the deployed site. Tailor outputs to {req.framework} + {req.database}. Goal: {req.goal}"
		),
		locked=True,
	)

	prompts = [basic, improved, advanced, expert, premium]

	# If user is paid (header value 'paid' or 'pro'), unlock all
	if x_user_plan and x_user_plan.lower() in ("paid", "pro", "elite"):
		for p in prompts:
			p.locked = False

	return prompts

