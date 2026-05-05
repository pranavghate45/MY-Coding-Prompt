from __future__ import annotations

import hashlib
import json
import os
import re
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import torch
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer


BASE_MODEL_NAME = os.getenv("WEBSITE_PRO_BASE_MODEL", "distilgpt2")
ADAPTER_DIR = Path(
    os.getenv("WEBSITE_PRO_ADAPTER_DIR")
    or (Path(__file__).resolve().parents[2] / "training" / "out_lora_distilgpt2_cpu")
)
MAX_NEW_TOKENS = int(os.getenv("WEBSITE_PRO_MAX_NEW_TOKENS", "96"))
LOCAL_FILES_ONLY = os.getenv("WEBSITE_PRO_LOCAL_FILES_ONLY", "false").strip().lower() in {"1", "true", "yes", "on"}
ENABLE_LOCAL_MODEL = os.getenv("WEBSITE_PRO_ENABLE_LOCAL_MODEL", "true").strip().lower() in {"1", "true", "yes", "on"}
USE_MODEL_OUTPUT = os.getenv("WEBSITE_PRO_USE_MODEL_OUTPUT", "false").strip().lower() in {"1", "true", "yes", "on"}


LEVELS: Dict[str, Dict[str, Any]] = {
    "Basic": {
        "temperature": 0.6,
        "top_p": 0.9,
        "repetition_penalty": 1.05,
        "max_new_tokens": 96,
        "focus": "simple scaffold, essential files only, quick setup, beginner-friendly wording",
    },
    "Improved": {
        "temperature": 0.7,
        "top_p": 0.92,
        "repetition_penalty": 1.08,
        "max_new_tokens": 112,
        "focus": "clear project structure, component responsibilities, API wiring, moderate detail",
    },
    "Optimized": {
        "temperature": 0.75,
        "top_p": 0.93,
        "repetition_penalty": 1.08,
        "max_new_tokens": 128,
        "focus": "architecture, data flow, performance, testing, and production-ready implementation details",
    },
    "Pro": {
        "temperature": 0.8,
        "top_p": 0.94,
        "repetition_penalty": 1.1,
        "max_new_tokens": 144,
        "focus": "architecture decisions, security hardening, observability, scalability, maintainability",
    },
    "Premium": {
        "temperature": 0.85,
        "top_p": 0.95,
        "repetition_penalty": 1.12,
        "max_new_tokens": 160,
        "focus": "production-ready repo, CI/CD, deployment, rollback, monitoring, and release quality",
    },
}


def _value(data: Any, name: str, default: str = "") -> str:
    value = data.get(name) if isinstance(data, dict) else getattr(data, name, default)
    if value is None:
        return default
    return str(value)


def _pick_project_type(data: Any) -> str:
    target = _value(data, "target")
    site_type = _value(data, "siteType")
    app_type = _value(data, "appType")
    if target.lower() == "app":
        return app_type or site_type or "application"
    return site_type or app_type or "website"


def _context_payload(data: Any) -> Dict[str, str]:
    return {
        "target": _value(data, "target", "Website"),
        "projectType": _pick_project_type(data),
        "siteType": _value(data, "siteType"),
        "appType": _value(data, "appType"),
        "framework": _value(data, "framework", "Next.js"),
        "styleSystem": _value(data, "styleSystem", "Tailwind CSS"),
        "backend": _value(data, "backend", "FastAPI"),
        "database": _value(data, "database", "PostgreSQL"),
        "goal": _value(data, "goal", "Build a useful project scaffold."),
    }


def _seed_for(level: str, context: Dict[str, str]) -> int:
    payload = json.dumps({"level": level, "context": context}, sort_keys=True, ensure_ascii=False)
    digest = hashlib.sha256(payload.encode("utf-8")).hexdigest()
    return int(digest[:16], 16) % (2**31)


def _input_device(model: torch.nn.Module) -> torch.device:
    try:
        return next(model.parameters()).device
    except StopIteration:
        return torch.device("cpu")


@lru_cache(maxsize=1)
def get_model_bundle() -> Tuple[AutoTokenizer, PeftModel, torch.device]:
    if not ADAPTER_DIR.exists():
        raise FileNotFoundError(f"Adapter directory not found: {ADAPTER_DIR}")

    use_cuda = torch.cuda.is_available()
    dtype = torch.float16 if use_cuda else torch.float32

    tokenizer = AutoTokenizer.from_pretrained(str(ADAPTER_DIR), use_fast=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    base_model = AutoModelForCausalLM.from_pretrained(
        BASE_MODEL_NAME,
        torch_dtype=dtype,
        device_map="auto" if use_cuda else None,
        low_cpu_mem_usage=True,
        local_files_only=LOCAL_FILES_ONLY,
    )

    # Keep base embeddings aligned with adapter tokenizer size.
    if base_model.get_input_embeddings().num_embeddings != len(tokenizer):
        base_model.resize_token_embeddings(len(tokenizer))

    model = PeftModel.from_pretrained(base_model, str(ADAPTER_DIR), is_trainable=False)
    model.eval()
    return tokenizer, model, _input_device(model)


def get_website_pro_model_health() -> Dict[str, Any]:
    info: Dict[str, Any] = {
        "enabled": bool(ENABLE_LOCAL_MODEL),
        "baseModel": BASE_MODEL_NAME,
        "adapterDir": str(ADAPTER_DIR),
        "adapterExists": ADAPTER_DIR.exists(),
        "localFilesOnly": bool(LOCAL_FILES_ONLY),
        "cudaAvailable": bool(torch.cuda.is_available()),
        "loaded": False,
    }

    if not ENABLE_LOCAL_MODEL:
        info["status"] = "disabled"
        return info

    try:
        tokenizer, model, device = get_model_bundle()
        info["loaded"] = True
        info["status"] = "ok"
        info["device"] = str(device)
        info["tokenizerClass"] = tokenizer.__class__.__name__
        info["modelClass"] = model.__class__.__name__
    except Exception as e:
        info["status"] = "error"
        info["error"] = str(e)

    return info


def build_level_prompt(level: str, data: Any) -> str:
    context = _context_payload(data)
    spec = LEVELS[level]
    project_type = context["projectType"]
    goal = context["goal"]
    stack = ", ".join(
        [context["framework"], context["styleSystem"], context["backend"], context["database"]]
    )
    role_focus = _role_focus_lines(data)

    return f"""You are a senior prompt engineer.
Write one concise prompt for an AI coding assistant. Return only the final prompt text.

Prompt level: {level}
Focus: {spec['focus']}

Project:
- Type: {project_type}
- Stack: {stack}
- Goal: {goal}

Role-specific focus:
{chr(10).join(f'- {line}' for line in role_focus)}

Writing rules:
- Stay precise and short.
- Mention the project type and at least one stack element.
- Ask for concrete deliverables such as pages, components, endpoints, data models, tests, or deployment steps.
- Avoid vague filler, repeated buzzwords, and broad phrases like "improve performance" unless tied to a specific action.
"""


def build_batch_prompt(data: Any) -> str:
    context = _context_payload(data)
    levels = list(LEVELS.keys())
    stack = ", ".join(
        [context["framework"], context["styleSystem"], context["backend"], context["database"]]
    )
    role_focus = _role_focus_lines(data)

    return f"""You are a senior prompt engineer.
Generate exactly five distinct prompt variants for the same project. Return only valid JSON.

Format:
{{"prompts":[{{"title":"Basic","prompt":"..."}},{{"title":"Improved","prompt":"..."}},{{"title":"Optimized","prompt":"..."}},{{"title":"Pro","prompt":"..."}},{{"title":"Premium","prompt":"..."}}]}}

Rules:
- Each prompt must be meaningfully different.
- Keep the titles in this exact order: {", ".join(levels)}.
- Do not include markdown fences or commentary.
- Do not repeat the same wording across levels.
- Keep each prompt to 1-2 sentences.
- Mention the project type, stack, and goal once.
- Ask for concrete deliverables appropriate to each level, such as pages, components, endpoints, schemas, tests, deployment, or monitoring.
- Avoid generic phrases like improve performance, enhance user experience, service architecture, cache optimization, or similar buzzword lists.

Role-specific focus:
{chr(10).join(f'- {line}' for line in role_focus)}

Project:
- Type: {context['projectType']}
- Stack: {stack}
- Goal: {context['goal']}
"""


def _clean_generated_text(text: str) -> str:
    cleaned = text.strip()
    for prefix in ("Prompt:", "prompt:", "Final prompt:", "final prompt:"):
        if cleaned.startswith(prefix):
            cleaned = cleaned[len(prefix):].strip()
    cleaned = cleaned.replace("```", "").strip()
    cleaned = " ".join(cleaned.split())
    return cleaned


def _context_tokens(data: Any) -> List[str]:
    context = _context_payload(data)
    return [
        context["projectType"].lower(),
        context["framework"].lower(),
        context["styleSystem"].lower(),
        context["backend"].lower(),
        context["database"].lower(),
    ]


def _has_context_signal(text: str, data: Any) -> bool:
    lowered = text.lower()
    return any(token and token in lowered for token in _context_tokens(data))


def _sanitize_generated_prompt(text: str) -> str:
    """Remove obvious spammy phrases and repeated junk from generated prompt text."""
    cleaned = _clean_generated_text(text)
    if not cleaned:
        return cleaned

    spam_patterns = [
        r"export to csv",
        r"export to aws cloudfront",
        r"signed by google\+",
        r"stackoverflow/api",
        r"allstate fails",
        r"logged sales\[0\]",
        r"exports? userreds",
        r"returns? http headers",
        r"executes backend scripts",
        r"performs database validation",
        r"delivers endpoint services",
        r"provides dashboard",
        r"export\b",
        r"csv\b",
    ]
    for pattern in spam_patterns:
        cleaned = re.sub(pattern, "", cleaned, flags=re.IGNORECASE)

    # collapse repeated tokens and repeated short phrases
    cleaned = re.sub(r"\b(\w+)(?:[\s,;:\-]+\1){1,}\b", r"\1", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"(\b[\w\-/]+(?:\s+[\w\-/]+){0,4}\b)(?:\s+\1){2,}", r"\1", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s{2,}", " ", cleaned).strip(" ,;:-")
    return cleaned


def _looks_noisy(text: str) -> bool:
    if not text:
        return True
    lowered = text.lower()
    noisy_markers = [
        "improve performance",
        "improve user experience",
        "enhance performance",
        "enhance user experience",
        "service architecture",
        "cache optimization",
        "endpoint validation",
        "redirecting to api calls",
        "doubleclick",
        "singleclick",
        "rails exports images",
        "redux",
        "ajax",
        "signed by google",
        "stackoverflow/api",
        "export to csv",
        "export to aws cloudfront",
        "allstate fails",
        "headers",
        "logs sales[0]",
        "database validation",
    ]
    marker_hits = sum(1 for marker in noisy_markers if marker in lowered)
    repeated_words = re.findall(r"\b(\w+)\b(?:\s+\1\b){2,}", lowered)
    bracket_noise = sum(lowered.count(ch) for ch in ['[', ']', '{', '}', '"'])
    field_noise = sum(lowered.count(token) for token in ["statemanagement", "projectstructure", "performanceoptimization", "integrations", "goalstat", "goals"]) 
    colon_noise = lowered.count(":")
    return (
        marker_hits >= 1
        or len(repeated_words) >= 1
        or len(lowered) < 40
        or not re.search(r"\b(build|create|design|write|generate|implement|scaffold|deliver|outline|plan)\b", lowered)
        or not re.search(r"\b(prompt|assistant|website|app|project|frontend|backend|stack)\b", lowered)
        or bracket_noise >= 6
        or field_noise >= 3
        or colon_noise >= 8
    )


def _extract_json_object(text: str) -> Optional[Dict[str, Any]]:
    candidate = text.strip()
    if candidate.startswith("```"):
        candidate = candidate.strip("`")
    start = candidate.find("{")
    end = candidate.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None
    try:
        return json.loads(candidate[start : end + 1])
    except Exception:
        return None


def generate_level_prompt(level: str, data: Any) -> str:
    tokenizer, model, device = get_model_bundle()
    instruction = build_level_prompt(level, data)
    inputs = tokenizer(instruction, return_tensors="pt")
    inputs = {key: value.to(device) for key, value in inputs.items()}

    context = _context_payload(data)
    seed = _seed_for(level, context)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)

    generation_kwargs = {
        "max_new_tokens": min(LEVELS[level]["max_new_tokens"], MAX_NEW_TOKENS),
        "temperature": LEVELS[level]["temperature"],
        "top_p": LEVELS[level]["top_p"],
        "do_sample": True,
        "repetition_penalty": LEVELS[level]["repetition_penalty"],
        "pad_token_id": tokenizer.eos_token_id,
        "eos_token_id": tokenizer.eos_token_id,
        "use_cache": True,
    }

    with torch.inference_mode():
        outputs = model.generate(**inputs, **generation_kwargs)

    prompt_token_count = inputs["input_ids"].shape[-1]
    generated_tokens = outputs[0][prompt_token_count:]
    generated_text = tokenizer.decode(generated_tokens, skip_special_tokens=True)
    sanitized = _sanitize_generated_prompt(generated_text)
    if _looks_noisy(sanitized) or not _has_context_signal(sanitized, data):
        return build_level_prompt(level, data)
    return sanitized


def _role_focus_lines(data: Any) -> List[str]:
    developer_type = (_value(data, "developerType", "full_stack") or "full_stack").strip().lower()
    project_type = _pick_project_type(data)
    framework = _value(data, "framework", "Next.js")
    backend = _value(data, "backend", "FastAPI")
    database = _value(data, "database", "PostgreSQL")
    goal = _value(data, "goal", "Build a useful project scaffold.")

    shared = [
        f"Project type: {project_type}",
        f"Stack: {framework}",
        f"Goal: {goal}",
    ]

    if developer_type == "frontend":
        return shared + [
            "Focus on responsive UI structure, accessibility, reusable components, and clear interaction states.",
            "Ask for route layout, state handling, form flows, and design-system-friendly implementation details.",
        ]
    if developer_type == "backend":
        return shared + [
            f"Focus on API contracts, validation, auth, workers, and database design with {backend} and {database}.",
            "Ask for service boundaries, endpoint responsibilities, error handling, logging, and deployment readiness.",
        ]
    return shared + [
        f"Balance frontend implementation with backend architecture using {backend} and {database}.",
        "Ask for end-to-end data flow, UI-to-API wiring, auth, persistence, and release planning.",
    ]


def _fallback_level_prompt(level: str, data: Any) -> str:
    context = _context_payload(data)
    level_specs = {
        "Basic": "simple scaffold, minimal files, quick setup, beginner-friendly wording",
        "Improved": "clear structure, reusable components, API wiring, moderate detail",
        "Optimized": "architecture, data flow, performance, testing, and implementation details",
        "Pro": "architecture decisions, security hardening, observability, scalability, maintainability",
        "Premium": "production-ready repo, CI/CD, deployment, rollback, monitoring, release quality",
    }
    focus_lines = _role_focus_lines(data)
    return f"""You are a senior prompt engineer.
Write a {level.lower()} prompt for an AI coding assistant.
Return only the final prompt text.

Prompt level: {level}
Focus: {level_specs[level]}

Project context:
{json.dumps(context, indent=2, ensure_ascii=False)}

Role-specific focus:
{chr(10).join(f'- {line}' for line in focus_lines)}

Writing rules:
- Tailor the prompt to the exact project context.
- Keep wording clean and actionable.
- Mention the stack and the project goal.
- End with clear deliverables appropriate for the level.
"""


def generate_all_prompts(data: Any) -> List[Dict[str, Any]]:
    tokenizer, model, device = get_model_bundle()
    instruction = build_batch_prompt(data)
    inputs = tokenizer(instruction, return_tensors="pt")
    inputs = {key: value.to(device) for key, value in inputs.items()}

    context = _context_payload(data)
    seed = _seed_for("batch", context)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)

    generation_kwargs = {
        "max_new_tokens": min(LEVELS["Premium"]["max_new_tokens"], MAX_NEW_TOKENS),
        "temperature": 0.75,
        "top_p": 0.95,
        "do_sample": True,
        "repetition_penalty": 1.08,
        "pad_token_id": tokenizer.eos_token_id,
        "eos_token_id": tokenizer.eos_token_id,
        "use_cache": True,
    }

    with torch.inference_mode():
        outputs = model.generate(**inputs, **generation_kwargs)

    prompt_token_count = inputs["input_ids"].shape[-1]
    generated_tokens = outputs[0][prompt_token_count:]
    generated_text = tokenizer.decode(generated_tokens, skip_special_tokens=True).strip()
    parsed = _extract_json_object(generated_text)

    if isinstance(parsed, dict) and isinstance(parsed.get("prompts"), list):
        cleaned_prompts: List[Dict[str, Any]] = []
        raw_prompts = parsed["prompts"]
        for index, level in enumerate(LEVELS.keys()):
            item = raw_prompts[index] if index < len(raw_prompts) and isinstance(raw_prompts[index], dict) else {}
            prompt_text = _sanitize_generated_prompt(str(item.get("prompt", "")))
            if _looks_noisy(prompt_text) or not _has_context_signal(prompt_text, data):
                prompt_text = _fallback_level_prompt(level, data)
            cleaned_prompts.append(
                {
                    "title": level,
                    "prompt": prompt_text,
                    "locked": False,
                }
            )
        return cleaned_prompts

    return [
        {
            "title": level,
            "prompt": generate_level_prompt(level, data),
            "locked": False,
        }
        for level in LEVELS.keys()
    ]


def generate_website_pro_prompts(data: Any, user_plan: Optional[str], use_model_output: bool = False) -> List[Dict[str, Any]]:
    unlocked_plan = (user_plan or "free").strip().lower()
    is_paid = unlocked_plan in {"paid", "pro", "premium", "elite"}

    prompts: List[Dict[str, Any]] = []
    def _fallback_prompts() -> List[Dict[str, Any]]:
        context = _context_payload(data)
        project_type = context["projectType"]
        framework = context["framework"]
        style_system = context["styleSystem"]
        backend = context["backend"]
        database = context["database"]
        goal = context["goal"]
        developer_type = (_value(data, "developerType", "full_stack") or "full_stack").strip().lower()

        if developer_type == "frontend":
            basic_text = (
                f"Create a simple starter prompt for building a {project_type} using {framework}. "
                f"Focus on responsive UI structure, reusable components, routing, and accessible layout decisions. Goal: {goal}"
            )
            improved_text = (
                f"Write a moderate-detail prompt for a {project_type} with {framework} and {style_system}. "
                f"Ask for component hierarchy, design-system usage, state handling, responsive breakpoints, and frontend data fetching. Goal: {goal}"
            )
            optimized_text = (
                f"Generate an optimized implementation prompt for a {project_type} using {framework}. "
                f"Require architecture decisions, UI state flow, performance strategy, test plan, and accessibility checks. Goal: {goal}"
            )
            pro_text = (
                f"Create a pro-level prompt for a production-grade {project_type} frontend stack ({framework}, {style_system}). "
                f"Include best practices for accessibility, observability, scalability, error handling, and maintainable component design. Goal: {goal}"
            )
            premium_text = (
                f"Produce a premium prompt for delivering a production-ready {project_type} frontend with {framework}. "
                f"Require CI/CD pipeline, component testing, performance optimization, release validation, and deployment checklist. Goal: {goal}"
            )
        elif developer_type == "backend":
            basic_text = (
                f"Create a simple starter prompt for building a {project_type} backend using {framework}. "
                f"Focus on endpoints, service boundaries, data models, auth flow, and the minimum setup needed to ship. Goal: {goal}"
            )
            improved_text = (
                f"Write a moderate-detail prompt for a {project_type} backend with {framework} and {backend}. "
                f"Ask for API contracts, folder structure, validation, database notes for {database}, and integration points. Goal: {goal}"
            )
            optimized_text = (
                f"Generate an optimized implementation prompt for a {project_type} backend using {framework} + {backend}. "
                f"Require architecture decisions, auth, job queues, performance strategy, test plan, and a robust {database} schema outline. Goal: {goal}"
            )
            pro_text = (
                f"Create a pro-level prompt for a production-grade {project_type} backend stack ({framework}, {backend}, {database}). "
                f"Include best practices for security, observability, scalability, error handling, and maintainable service design. Goal: {goal}"
            )
            premium_text = (
                f"Produce a premium prompt for delivering a fully production-ready {project_type} backend with {framework}/{backend}/{database}. "
                f"Require CI/CD pipeline, containerization, deployment strategy, rollback plan, monitoring, and post-deploy verification checklist. Goal: {goal}"
            )
        else:
            basic_text = (
                f"Create a simple starter prompt for building a {project_type} using {framework}. "
                f"Keep it beginner-friendly, include the minimum file structure, setup commands, and first page/component. Goal: {goal}"
            )
            improved_text = (
                f"Write a moderate-detail prompt for a {project_type} with {framework} and {style_system}. "
                f"Ask for folder structure, reusable components, API integration points with {backend}, and initial database notes for {database}. Goal: {goal}"
            )
            optimized_text = (
                f"Generate an optimized implementation prompt for a {project_type} using {framework} + {backend}. "
                f"Require architecture decisions, state/data flow, performance strategy, test plan, and a robust {database} schema outline. Goal: {goal}"
            )
            pro_text = (
                f"Create a pro-level prompt for a production-grade {project_type} stack ({framework}, {backend}, {database}). "
                f"Include best practices for security, observability, scalability, error handling, and maintainable coding standards. Goal: {goal}"
            )
            premium_text = (
                f"Produce a premium prompt for delivering a fully production-ready {project_type} with {framework}/{backend}/{database}. "
                f"Require CI/CD pipeline, containerization, deployment strategy, rollback plan, monitoring, and post-deploy verification checklist. Goal: {goal}"
            )

        return [
            {
                "title": "Basic",
                "prompt": basic_text,
                "locked": False,
            },
            {
                "title": "Improved",
                "prompt": improved_text,
                "locked": False,
            },
            {
                "title": "Optimized",
                "prompt": optimized_text,
                "locked": False,
            },
            {
                "title": "Pro",
                "prompt": pro_text,
                "locked": False,
            },
            {
                "title": "Premium",
                "prompt": premium_text,
                "locked": False,
            },
        ]

    # Deterministic templates are the default because the tuned local model can still emit noisy text.
    if not ENABLE_LOCAL_MODEL or not (USE_MODEL_OUTPUT or use_model_output):
        generated = _fallback_prompts()
    else:
        try:
            generated = generate_all_prompts(data)
        except Exception:
            generated = _fallback_prompts()

    for index, level in enumerate(LEVELS.keys()):
        item = generated[index] if index < len(generated) else {"title": level, "prompt": generate_level_prompt(level, data), "locked": False}
        prompt_text = _sanitize_generated_prompt(str(item.get("prompt", "")))
        if _looks_noisy(prompt_text) or not _has_context_signal(prompt_text, data):
            prompt_text = _fallback_level_prompt(level, data)
        prompts.append(
            {
                "title": level,
                "prompt": prompt_text,
                "locked": False if is_paid else index >= 2,
            }
        )

    return prompts