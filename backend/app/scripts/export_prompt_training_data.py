from __future__ import annotations

import argparse
import json
import random
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.answers import Answer
from app.models.chat import Chat
from app.models.generated_prompts import GeneratedPrompt
from app.models.prompt_sessions import PromptSession
from app.models.prompt_scores import PromptScore
from app.models.prompt_versions import PromptVersion
from app.models.question import Question
from app.models.requirements import Requirement


LEVELS = ["Basic", "Improved", "Advanced", "Expert", "Premium"]

FRAMEWORK_HINTS = [
    "next.js",
    "react",
    "vue",
    "angular",
    "svelte",
    "fastapi",
    "django",
    "flask",
    "node",
    "express",
]

STYLE_HINTS = ["tailwind", "css modules", "styled components", "bootstrap", "chakra", "material ui"]
BACKEND_HINTS = ["fastapi", "django", "flask", "node", "express", "nestjs", "spring"]
DATABASE_HINTS = ["postgres", "postgresql", "mysql", "sqlite", "mongodb", "redis"]


@dataclass
class ExportRecord:
    level: str
    context: Dict[str, Any]
    output: str
    meta: Dict[str, Any]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Export prompt-optimization training examples from DB prompt/session tables"
    )
    parser.add_argument(
        "--output-train",
        default="app/super-prompt-model/datasets/prompt_train.auto.jsonl",
        help="Output JSONL path for training split",
    )
    parser.add_argument(
        "--output-eval",
        default="app/super-prompt-model/datasets/prompt_eval.auto.jsonl",
        help="Output JSONL path for eval split",
    )
    parser.add_argument("--eval-ratio", type=float, default=0.15, help="Eval split ratio")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    parser.add_argument("--min-output-words", type=int, default=30, help="Minimum output length")
    parser.add_argument(
        "--min-score",
        type=float,
        default=0.0,
        help="Optional minimum prompt_scores.score (rows without score are excluded only when this is > 0)",
    )
    parser.add_argument(
        "--max-generated-prompts",
        type=int,
        default=0,
        help="Cap generated_prompts rows (0 means no limit)",
    )
    parser.add_argument(
        "--include-chats",
        action="store_true",
        help="Also mine chat sessions for prompt-like examples",
    )
    parser.add_argument(
        "--skip-website-pro-sessions",
        action="store_true",
        help="Do not extract examples from prompt_sessions/prompt_versions",
    )
    parser.add_argument(
        "--max-chats",
        type=int,
        default=1000,
        help="Chat rows to inspect when --include-chats is enabled",
    )
    return parser.parse_args()


def normalize_whitespace(text: str) -> str:
    return " ".join(text.replace("```", " ").split())


def first_hint(text: str, hints: Sequence[str], fallback: str) -> str:
    lt = text.lower()
    for item in hints:
        if item in lt:
            if item == "postgres":
                return "PostgreSQL"
            if item == "next.js":
                return "Next.js"
            return item.title()
    return fallback


def infer_level(output: str) -> str:
    text = output.lower()
    for level in LEVELS:
        if level.lower() in text:
            return level

    words = len(output.split())
    if words < 80:
        return "Basic"
    if words < 130:
        return "Improved"
    if words < 190:
        return "Advanced"
    if words < 260:
        return "Expert"
    return "Premium"


def looks_like_prompt(text: str, min_words: int) -> bool:
    cleaned = normalize_whitespace(text)
    if len(cleaned.split()) < min_words:
        return False

    lower = cleaned.lower()
    cues = ["you are", "create", "build", "generate", "include", "deliverable", "goal:"]
    return any(cue in lower for cue in cues)


def build_context_from_text(goal_text: str) -> Dict[str, str]:
    framework = first_hint(goal_text, FRAMEWORK_HINTS, "Next.js")
    style = first_hint(goal_text, STYLE_HINTS, "Tailwind CSS")
    backend = first_hint(goal_text, BACKEND_HINTS, "FastAPI")
    database = first_hint(goal_text, DATABASE_HINTS, "PostgreSQL")

    lower = goal_text.lower()
    target = "App" if "app" in lower else "Website"
    project_type = "application" if target == "App" else "website"

    return {
        "target": target,
        "projectType": project_type,
        "siteType": project_type if target == "Website" else "",
        "appType": project_type if target == "App" else "",
        "framework": framework,
        "styleSystem": style,
        "backend": backend,
        "database": database,
        "goal": goal_text.strip() or "Build a useful project scaffold.",
    }


def score_map(db: Session) -> Dict[int, float]:
    out: Dict[int, float] = {}
    rows = db.query(PromptScore).all()
    for row in rows:
        if row.generated_prompt_id is None:
            continue
        try:
            value = float(row.score)
        except Exception:
            continue
        current = out.get(int(row.generated_prompt_id))
        if current is None or value > current:
            out[int(row.generated_prompt_id)] = value
    return out


def build_requirement_text_maps(db: Session) -> Tuple[Dict[int, str], Dict[int, int], Dict[int, List[str]]]:
    req_text = {int(r.id): str(r.requirement_text or "") for r in db.query(Requirement).all()}

    q_to_req: Dict[int, int] = {}
    for q in db.query(Question).all():
        if q.id is not None and q.requirement_id is not None:
            q_to_req[int(q.id)] = int(q.requirement_id)

    answers_by_req: Dict[int, List[str]] = {}
    for a in db.query(Answer).all():
        if a.question_id is None:
            continue
        req_id = q_to_req.get(int(a.question_id))
        if req_id is None:
            continue
        answers_by_req.setdefault(req_id, []).append(str(a.answer_text or ""))

    return req_text, q_to_req, answers_by_req


def extract_from_generated_prompts(
    db: Session,
    min_words: int,
    min_score: float,
    max_rows: int,
) -> List[ExportRecord]:
    score_by_prompt = score_map(db)
    req_text_by_id, _, answers_by_req = build_requirement_text_maps(db)

    query = db.query(GeneratedPrompt).order_by(GeneratedPrompt.created_at.desc())
    if max_rows > 0:
        query = query.limit(max_rows)
    rows = query.all()

    extracted: List[ExportRecord] = []
    for row in rows:
        if row.id is None:
            continue

        gp_id = int(row.id)
        score = score_by_prompt.get(gp_id)
        if min_score > 0:
            if score is None or score < min_score:
                continue

        output = normalize_whitespace(str(row.final_prompt or ""))
        if not looks_like_prompt(output, min_words=min_words):
            continue

        req_id = int(row.requirement_id) if row.requirement_id is not None else None
        req_text = req_text_by_id.get(req_id or -1, "")
        answers = answers_by_req.get(req_id or -1, [])
        goal_parts = [part for part in [req_text] if part]
        if answers:
            goal_parts.append("User details: " + "; ".join(a.strip() for a in answers[:8] if a and a.strip()))
        goal_text = " ".join(goal_parts).strip() or "Generate a high-quality coding prompt for the user requirement."

        context = build_context_from_text(goal_text)
        level = infer_level(output)

        extracted.append(
            ExportRecord(
                level=level,
                context=context,
                output=output,
                meta={
                    "source": "generated_prompts",
                    "generated_prompt_id": gp_id,
                    "requirement_id": req_id,
                    "user_id": row.user_id,
                    "score": score,
                },
            )
        )

    return extracted


def _iter_message_pairs(messages: List[Dict[str, Any]]) -> Iterable[Tuple[str, str]]:
    pending_user: Optional[str] = None
    for msg in messages:
        role = str(msg.get("role", "")).lower()
        content = str(msg.get("content", "")).strip()
        if not content:
            continue
        if role == "user":
            pending_user = content
            continue
        if role == "assistant" and pending_user:
            yield pending_user, content
            pending_user = None


def extract_from_chats(db: Session, min_words: int, max_chats: int) -> List[ExportRecord]:
    rows = db.query(Chat).order_by(Chat.created_at.desc()).limit(max_chats).all()

    extracted: List[ExportRecord] = []
    for chat in rows:
        messages_raw = str(chat.messages or "").strip()
        if not messages_raw:
            continue

        try:
            parsed = json.loads(messages_raw)
        except Exception:
            continue
        if not isinstance(parsed, list):
            continue

        for user_text, assistant_text in _iter_message_pairs(parsed):
            lower_user = user_text.lower()
            if not any(k in lower_user for k in ["prompt", "generate", "build", "create"]):
                continue

            output = normalize_whitespace(assistant_text)
            if not looks_like_prompt(output, min_words=min_words):
                continue

            context = build_context_from_text(user_text)
            level = infer_level(output)
            extracted.append(
                ExportRecord(
                    level=level,
                    context=context,
                    output=output,
                    meta={
                        "source": "chats",
                        "chat_id": chat.id,
                        "user_id": chat.user_id,
                    },
                )
            )

    return extracted


def _context_from_website_pro_payload(payload: Any) -> Dict[str, str]:
    if not isinstance(payload, dict):
        return {
            "target": "Website",
            "projectType": "website",
            "siteType": "website",
            "appType": "",
            "framework": "Next.js",
            "styleSystem": "Tailwind CSS",
            "backend": "FastAPI",
            "database": "PostgreSQL",
            "goal": "Build a useful project scaffold.",
        }

    target = str(payload.get("target") or payload.get("siteType") or payload.get("appType") or "Website")
    site_type = str(payload.get("siteType") or "website")
    app_type = str(payload.get("appType") or "")
    project_type = app_type if target.lower() == "app" else site_type

    developer_type = str(payload.get("developerType") or "full_stack").strip().lower()
    if developer_type not in {"frontend", "backend", "full_stack"}:
        developer_type = "full_stack"

    return {
        "target": target,
        "projectType": project_type or "website",
        "siteType": site_type,
        "appType": app_type,
        "framework": str(payload.get("framework") or "Next.js"),
        "styleSystem": str(payload.get("styleSystem") or "Tailwind CSS"),
        "backend": str(payload.get("backend") or "FastAPI"),
        "database": str(payload.get("database") or "PostgreSQL"),
        "goal": f"Developer type: {developer_type}. {str(payload.get('goal') or 'Build a useful project scaffold.')}",
    }


def extract_from_website_pro_sessions(db: Session, min_words: int) -> List[ExportRecord]:
    extracted: List[ExportRecord] = []
    try:
        sessions = db.query(PromptSession).order_by(PromptSession.created_at.desc()).all()
        for session in sessions:
            payload = None
            try:
                payload = json.loads(session.input_payload) if session.input_payload else None
            except Exception:
                payload = None

            context = _context_from_website_pro_payload(payload)
            versions = db.query(PromptVersion).filter(PromptVersion.session_id == session.id).all()
            for version in versions:
                output = normalize_whitespace(str(version.prompt or ""))
                if not looks_like_prompt(output, min_words=min_words):
                    continue

                if not bool(version.is_selected) and str(version.source or "").lower() != "edited":
                    continue

                extracted.append(
                    ExportRecord(
                        level=infer_level(output),
                        context=context,
                        output=output,
                        meta={
                            "source": "website_pro_prompt_versions",
                            "session_id": session.id,
                            "version_id": version.id,
                            "version_source": version.source,
                            "is_selected": bool(version.is_selected),
                            "user_id": session.user_id,
                            "project_id": session.project_id,
                        },
                    )
                )
    except Exception:
        return []

    return extracted


def deduplicate(records: Sequence[ExportRecord]) -> List[ExportRecord]:
    seen: set[str] = set()
    unique: List[ExportRecord] = []
    for record in records:
        key = normalize_whitespace(record.output).lower()
        if key in seen:
            continue
        seen.add(key)
        unique.append(record)
    return unique


def split_records(records: List[ExportRecord], eval_ratio: float, seed: int) -> Tuple[List[ExportRecord], List[ExportRecord]]:
    if not records:
        return [], []
    if not 0 < eval_ratio < 1:
        raise ValueError("eval_ratio must be between 0 and 1")

    shuffled = records[:]
    random.Random(seed).shuffle(shuffled)

    eval_count = max(1, int(len(shuffled) * eval_ratio))
    if eval_count >= len(shuffled):
        eval_count = len(shuffled) - 1

    eval_records = shuffled[:eval_count]
    train_records = shuffled[eval_count:]
    return train_records, eval_records


def write_jsonl(path: Path, records: Sequence[ExportRecord]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        for r in records:
            payload = {
                "level": r.level,
                "context": r.context,
                "output": r.output,
                "meta": r.meta,
            }
            handle.write(json.dumps(payload, ensure_ascii=False) + "\n")


def main() -> None:
    args = parse_args()

    output_train = Path(args.output_train).resolve()
    output_eval = Path(args.output_eval).resolve()

    db = SessionLocal()
    try:
        records: List[ExportRecord] = []
        from_prompts = extract_from_generated_prompts(
            db,
            min_words=args.min_output_words,
            min_score=args.min_score,
            max_rows=args.max_generated_prompts,
        )
        records.extend(from_prompts)

        from_chats: List[ExportRecord] = []
        if args.include_chats:
            from_chats = extract_from_chats(db, min_words=args.min_output_words, max_chats=args.max_chats)
            records.extend(from_chats)

        from_website_pro: List[ExportRecord] = []
        if not args.skip_website_pro_sessions:
            from_website_pro = extract_from_website_pro_sessions(db, min_words=args.min_output_words)
            records.extend(from_website_pro)

        records = deduplicate(records)

        if len(records) < 2:
            raise ValueError(
                "Not enough extracted examples. Try lowering --min-output-words, lowering --min-score, or using --include-chats."
            )

        train_records, eval_records = split_records(records, eval_ratio=args.eval_ratio, seed=args.seed)

        write_jsonl(output_train, train_records)
        write_jsonl(output_eval, eval_records)

        summary = {
            "generated_prompts_examples": len(from_prompts),
            "chat_examples": len(from_chats),
            "website_pro_examples": len(from_website_pro),
            "total_unique_examples": len(records),
            "train_examples": len(train_records),
            "eval_examples": len(eval_records),
            "output_train": str(output_train),
            "output_eval": str(output_eval),
        }
        print(json.dumps(summary, indent=2))
    finally:
        db.close()


if __name__ == "__main__":
    main()
