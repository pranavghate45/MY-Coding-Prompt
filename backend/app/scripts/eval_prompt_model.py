from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List

import torch
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer


@dataclass
class PromptRecord:
    level: str
    context: Dict[str, Any]
    output: str


def read_jsonl(path: Path) -> List[PromptRecord]:
    rows: List[PromptRecord] = []
    with path.open("r", encoding="utf-8") as handle:
        for line_no, line in enumerate(handle, start=1):
            line = line.strip()
            if not line:
                continue
            payload = json.loads(line)
            output = str(payload.get("output", "")).strip()
            if not output:
                raise ValueError(f"Missing output at {path}:{line_no}")
            rows.append(
                PromptRecord(
                    level=str(payload.get("level", "Basic")),
                    context=payload.get("context", {}),
                    output=output,
                )
            )
    if not rows:
        raise ValueError(f"No rows found in {path}")
    return rows


def build_instruction(level: str, context: Dict[str, Any]) -> str:
    return (
        "You are a senior prompt engineer.\n"
        "Write one high-quality prompt for another AI coding assistant.\n"
        "Return only the final prompt text.\n\n"
        f"Prompt level: {level}\n"
        "Project context:\n"
        f"{json.dumps(context, ensure_ascii=False, indent=2)}\n\n"
        "Writing rules:\n"
        "- Tailor the prompt to the context.\n"
        "- Mention stack and project goal.\n"
        "- End with level-appropriate deliverables.\n"
    )


def generate_text(
    model: AutoModelForCausalLM,
    tokenizer: AutoTokenizer,
    prompt: str,
    max_new_tokens: int,
    device: torch.device,
) -> str:
    inputs = tokenizer(prompt, return_tensors="pt")
    inputs = {k: v.to(device) for k, v in inputs.items()}

    with torch.inference_mode():
        outputs = model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            do_sample=False,
            temperature=0.0,
            top_p=1.0,
            pad_token_id=tokenizer.eos_token_id,
            eos_token_id=tokenizer.eos_token_id,
        )

    prompt_len = inputs["input_ids"].shape[-1]
    generated_ids = outputs[0][prompt_len:]
    return tokenizer.decode(generated_ids, skip_special_tokens=True).strip()


def quality_score(candidate: str, context: Dict[str, Any]) -> Dict[str, Any]:
    if not candidate:
        return {"score": 0.0, "checks": {"non_empty": False}}

    lc = candidate.lower()
    checks: Dict[str, bool] = {
        "non_empty": bool(candidate.strip()),
        "no_code_fence": "```" not in candidate,
        "mentions_framework": str(context.get("framework", "")).lower() in lc if context.get("framework") else False,
        "mentions_backend": str(context.get("backend", "")).lower() in lc if context.get("backend") else False,
        "mentions_database": str(context.get("database", "")).lower() in lc if context.get("database") else False,
        "mentions_goal_keyword": any(
            token in lc for token in str(context.get("goal", "")).lower().split() if len(token) > 4
        ),
        "has_deliverables_cue": any(token in lc for token in ["deliverable", "output", "include", "return"]),
        "reasonable_length": len(candidate.split()) >= 60,
    }

    total = len(checks)
    passed = sum(1 for value in checks.values() if value)
    score = passed / total if total else 0.0
    return {"score": round(score, 4), "checks": checks}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Evaluate baseline vs LoRA adapter for prompt generation")
    parser.add_argument("--eval-file", required=True, help="Path to evaluation JSONL")
    parser.add_argument("--base-model", required=True, help="HF base model id")
    parser.add_argument("--adapter-dir", required=True, help="Path to LoRA adapter")
    parser.add_argument("--output-report", default="app/super-prompt-model/eval_report.json")
    parser.add_argument("--max-new-tokens", type=int, default=220)
    parser.add_argument("--local-files-only", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    eval_file = Path(args.eval_file).resolve()
    adapter_dir = Path(args.adapter_dir).resolve()
    output_report = Path(args.output_report).resolve()
    output_report.parent.mkdir(parents=True, exist_ok=True)

    examples = read_jsonl(eval_file)
    use_cuda = torch.cuda.is_available()
    dtype = torch.float16 if use_cuda else torch.float32

    tokenizer = AutoTokenizer.from_pretrained(args.base_model, use_fast=True, local_files_only=args.local_files_only)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    base_model = AutoModelForCausalLM.from_pretrained(
        args.base_model,
        torch_dtype=dtype,
        device_map="auto" if use_cuda else None,
        local_files_only=args.local_files_only,
    )
    tuned_model = PeftModel.from_pretrained(base_model, str(adapter_dir), is_trainable=False)

    device = next(tuned_model.parameters()).device

    report_rows: List[Dict[str, Any]] = []
    base_scores: List[float] = []
    tuned_scores: List[float] = []

    for row in examples:
        instruction = build_instruction(row.level, row.context)
        baseline_text = generate_text(base_model, tokenizer, instruction, args.max_new_tokens, device)
        tuned_text = generate_text(tuned_model, tokenizer, instruction, args.max_new_tokens, device)

        baseline_quality = quality_score(baseline_text, row.context)
        tuned_quality = quality_score(tuned_text, row.context)

        base_scores.append(float(baseline_quality["score"]))
        tuned_scores.append(float(tuned_quality["score"]))

        report_rows.append(
            {
                "level": row.level,
                "context": row.context,
                "reference": row.output,
                "baseline": {
                    "text": baseline_text,
                    "quality": baseline_quality,
                },
                "tuned": {
                    "text": tuned_text,
                    "quality": tuned_quality,
                },
            }
        )

    avg_base = sum(base_scores) / len(base_scores)
    avg_tuned = sum(tuned_scores) / len(tuned_scores)

    report = {
        "base_model": args.base_model,
        "adapter_dir": str(adapter_dir),
        "eval_file": str(eval_file),
        "summary": {
            "avg_baseline_score": round(avg_base, 4),
            "avg_tuned_score": round(avg_tuned, 4),
            "delta": round(avg_tuned - avg_base, 4),
            "num_examples": len(report_rows),
        },
        "examples": report_rows,
    }

    with output_report.open("w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2, ensure_ascii=False)

    print(json.dumps(report["summary"], indent=2))
    print(f"Report saved to: {output_report}")


if __name__ == "__main__":
    main()
