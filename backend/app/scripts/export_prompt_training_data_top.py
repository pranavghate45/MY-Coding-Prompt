from __future__ import annotations

import argparse
import json
import random
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.answers import Answer
from app.models.generated_prompts import GeneratedPrompt
from app.models.prompt_scores import PromptScore
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


@dataclass
class Candidate:
    row: GeneratedPrompt
    score: Optional[float]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Export top-performing prompt examples: highest score per requirement + newest per user"
    )
    parser.add_argument(
        "--output-train",
        default="app/super-prompt-model/datasets/prompt_train.top.jsonl",
        help="Output JSONL path for training split",
    )
    parser.add_argument(
        "--output-eval",
        default="app/super-prompt-model/datasets/prompt_eval.top.jsonl",
        help="Output JSONL path for eval split",
    )
    parser.add_argument("--eval-ratio", type=float, default=0.15, help="Eval split ratio")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    parser.add_argument("--min-output-words", type=int, default=30, help="Minimum output length")
    parser.add_argument(
        "--min-score",
        type=float,
        default=0.0,
        help="Minimum score for score-based selection (highest-per-requirement).",
    )
    parser.add_argument(
        "--max-generated-prompts",
        type=int,
        default=0,
        help="Cap generated_prompts rows to scan (0 means no limit)",
    )
    parser.add_argument(
        "--allow-unscored-newest",
        action="store_true",
        help="Allow newest-per-user examples even when score is missing.",
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
    cues = ["you are", "create", "build", "generate", "include", "goal:"]
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
        gp_id = int(row.generated_prompt_id)
        current = out.get(gp_id)
        if current is None or value > current:
            out[gp_id] = value
    return out


def build_requirement_maps(db: Session) -> Tuple[Dict[int, str], Dict[int, int], Dict[int, List[str]]]:
    req_text_by_id = {int(r.id): str(r.requirement_text or "") for r in db.query(Requirement).all()}

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

    return req_text_by_id, q_to_req, answers_by_req


def _created_at_ts(row: GeneratedPrompt) -> float:
    created = getattr(row, "created_at", None)
    if isinstance(created, datetime):
        return created.timestamp()
    return 0.0


def _row_rank_for_requirement(candidate: Candidate) -> Tuple[float, float, int]:
    score = candidate.score if candidate.score is not None else float("-inf")
    ts = _created_at_ts(candidate.row)
    gp_id = int(candidate.row.id or 0)
    return (score, ts, gp_id)


def _row_rank_for_newest(candidate: Candidate) -> Tuple[float, float, int]:
    ts = _created_at_ts(candidate.row)
    score = candidate.score if candidate.score is not None else float("-inf")
    gp_id = int(candidate.row.id or 0)
    return (ts, score, gp_id)


def select_top_candidates(
    db: Session,
    min_words: int,
    min_score: float,
    max_rows: int,
    allow_unscored_newest: bool,
) -> Tuple[List[Candidate], Dict[str, int]]:
    score_by_prompt = score_map(db)

    query = db.query(GeneratedPrompt).order_by(GeneratedPrompt.created_at.desc())
    if max_rows > 0:
        query = query.limit(max_rows)

    rows = query.all()
    candidates: List[Candidate] = []
    for row in rows:
        if row.id is None:
            continue
        output = normalize_whitespace(str(row.final_prompt or ""))
        if not looks_like_prompt(output, min_words=min_words):
            continue
        gp_id = int(row.id)
        candidates.append(Candidate(row=row, score=score_by_prompt.get(gp_id)))

    # Highest scored example per requirement
    best_by_requirement: Dict[int, Candidate] = {}
    for c in candidates:
        req_id = getattr(c.row, "requirement_id", None)
        if req_id is None:
            continue
        if c.score is None or c.score < min_score:
            continue
        req_key = int(req_id)
        current = best_by_requirement.get(req_key)
        if current is None or _row_rank_for_requirement(c) > _row_rank_for_requirement(current):
            best_by_requirement[req_key] = c

    # Newest example per user
    newest_by_user: Dict[str, Candidate] = {}
    for c in candidates:
        user_id = getattr(c.row, "user_id", None)
        if user_id is None:
            continue
        if not allow_unscored_newest and c.score is None:
            continue
        key = str(user_id)
        current = newest_by_user.get(key)
        if current is None or _row_rank_for_newest(c) > _row_rank_for_newest(current):
            newest_by_user[key] = c

    selected_by_id: Dict[int, Candidate] = {}
    for c in best_by_requirement.values():
        selected_by_id[int(c.row.id)] = c
    for c in newest_by_user.values():
        selected_by_id[int(c.row.id)] = c

    counts = {
        "scanned_candidates": len(candidates),
        "best_per_requirement": len(best_by_requirement),
        "newest_per_user": len(newest_by_user),
        "selected_union": len(selected_by_id),
    }
    return list(selected_by_id.values()), counts


def build_export_records(db: Session, selected: Sequence[Candidate]) -> List[ExportRecord]:
    req_text_by_id, _, answers_by_req = build_requirement_maps(db)

    records: List[ExportRecord] = []
    for c in selected:
        row = c.row
        output = normalize_whitespace(str(row.final_prompt or ""))
        req_id = int(row.requirement_id) if row.requirement_id is not None else None

        req_text = req_text_by_id.get(req_id or -1, "")
        answers = answers_by_req.get(req_id or -1, [])

        goal_parts = [part for part in [req_text] if part]
        if answers:
            goal_parts.append("User details: " + "; ".join(a.strip() for a in answers[:8] if a and a.strip()))
        goal_text = " ".join(goal_parts).strip() or "Generate a high-quality coding prompt for the user requirement."

        context = build_context_from_text(goal_text)
        level = infer_level(output)

        records.append(
            ExportRecord(
                level=level,
                context=context,
                output=output,
                meta={
                    "source": "generated_prompts_top",
                    "generated_prompt_id": row.id,
                    "requirement_id": req_id,
                    "user_id": row.user_id,
                    "score": c.score,
                    "created_at": row.created_at.isoformat() if getattr(row, "created_at", None) else None,
                },
            )
        )

    return records


def deduplicate(records: Sequence[ExportRecord]) -> List[ExportRecord]:
    seen: set[str] = set()
    out: List[ExportRecord] = []
    for record in records:
        key = normalize_whitespace(record.output).lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(record)
    return out


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
        selected, selection_counts = select_top_candidates(
            db,
            min_words=args.min_output_words,
            min_score=args.min_score,
            max_rows=args.max_generated_prompts,
            allow_unscored_newest=args.allow_unscored_newest,
        )

        records = build_export_records(db, selected)
        records = deduplicate(records)

        if len(records) < 2:
            raise ValueError(
                "Not enough top examples extracted. Lower --min-output-words or --min-score, or add --allow-unscored-newest."
            )

        train_records, eval_records = split_records(records, eval_ratio=args.eval_ratio, seed=args.seed)

        write_jsonl(output_train, train_records)
        write_jsonl(output_eval, eval_records)

        summary = {
            **selection_counts,
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
