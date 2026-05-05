from __future__ import annotations

import argparse
import json
import os
import random
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Sequence

import torch
from peft import LoraConfig, TaskType, get_peft_model
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    Trainer,
    TrainingArguments,
    default_data_collator,
)


LEVEL_FOCUS: Dict[str, str] = {
    "Basic": "simple scaffold, essential files only, quick setup, beginner-friendly wording",
    "Improved": "clear project structure, component responsibilities, API wiring, moderate detail",
    "Advanced": "architecture, data flow, performance, testing, and production-ready implementation details",
    "Expert": "architecture decisions, security hardening, observability, scalability, maintainability",
    "Premium": "production-ready repo, CI/CD, deployment, rollback, monitoring, and release quality",
}


@dataclass
class PromptRecord:
    level: str
    context: Dict[str, Any]
    output: str


def read_jsonl(path: Path) -> List[PromptRecord]:
    records: List[PromptRecord] = []
    with path.open("r", encoding="utf-8") as handle:
        for line_no, line in enumerate(handle, start=1):
            line = line.strip()
            if not line:
                continue
            item = json.loads(line)
            level = str(item.get("level", "Basic")).strip()
            context = item.get("context", {})
            output = str(item.get("output", "")).strip()
            if not output:
                raise ValueError(f"Missing 'output' at {path}:{line_no}")
            records.append(PromptRecord(level=level, context=context, output=output))
    if not records:
        raise ValueError(f"No records found in {path}")
    return records


def build_instruction(level: str, context: Dict[str, Any]) -> str:
    focus = LEVEL_FOCUS.get(level, LEVEL_FOCUS["Basic"])
    normalized = {
        "target": str(context.get("target", "Website")),
        "projectType": str(context.get("projectType", "website")),
        "siteType": str(context.get("siteType", "")),
        "appType": str(context.get("appType", "")),
        "framework": str(context.get("framework", "Next.js")),
        "styleSystem": str(context.get("styleSystem", "Tailwind CSS")),
        "backend": str(context.get("backend", "FastAPI")),
        "database": str(context.get("database", "PostgreSQL")),
        "goal": str(context.get("goal", "Build a useful project scaffold.")),
    }

    return (
        "You are a senior prompt engineer.\n"
        "Write one high-quality prompt for another AI coding assistant.\n"
        "Return only the final prompt text.\n\n"
        f"Prompt level: {level}\n"
        f"Focus: {focus}\n\n"
        "Project context:\n"
        f"{json.dumps(normalized, ensure_ascii=False, indent=2)}\n\n"
        "Writing rules:\n"
        "- Tailor to the project context.\n"
        "- Mention stack and project goal.\n"
        "- End with clear deliverables for this level.\n"
    )


def build_train_text(example: PromptRecord) -> Dict[str, str]:
    prompt = build_instruction(example.level, example.context)
    prompt_block = f"### Instruction\n{prompt}\n### Response\n"
    full_text = prompt_block + example.output.strip() + "\n"
    return {"prompt": prompt_block, "full_text": full_text}


class PromptDataset(torch.utils.data.Dataset):
    def __init__(self, records: Sequence[PromptRecord], tokenizer: AutoTokenizer, max_length: int) -> None:
        self.items: List[Dict[str, Any]] = []

        for record in records:
            rendered = build_train_text(record)
            full_encoding = tokenizer(
                rendered["full_text"],
                max_length=max_length,
                truncation=True,
                padding="max_length",
            )
            prompt_encoding = tokenizer(
                rendered["prompt"],
                max_length=max_length,
                truncation=True,
                padding="max_length",
            )

            input_ids = full_encoding["input_ids"]
            attention_mask = full_encoding["attention_mask"]
            labels = input_ids.copy()

            prompt_token_count = int(sum(prompt_encoding["attention_mask"]))
            for i in range(min(prompt_token_count, len(labels))):
                labels[i] = -100

            for i, mask in enumerate(attention_mask):
                if mask == 0:
                    labels[i] = -100

            self.items.append(
                {
                    "input_ids": torch.tensor(input_ids, dtype=torch.long),
                    "attention_mask": torch.tensor(attention_mask, dtype=torch.long),
                    "labels": torch.tensor(labels, dtype=torch.long),
                }
            )

    def __len__(self) -> int:
        return len(self.items)

    def __getitem__(self, idx: int) -> Dict[str, torch.Tensor]:
        return self.items[idx]


def split_train_val(records: List[PromptRecord], val_ratio: float, seed: int) -> tuple[List[PromptRecord], List[PromptRecord]]:
    if not 0 < val_ratio < 1:
        raise ValueError("val_ratio must be between 0 and 1")

    copied = records.copy()
    random.Random(seed).shuffle(copied)
    val_count = max(1, int(len(copied) * val_ratio))
    if val_count >= len(copied):
        val_count = len(copied) - 1

    val_records = copied[:val_count]
    train_records = copied[val_count:]

    if not train_records or not val_records:
        raise ValueError("Could not split records into non-empty train/val sets")

    return train_records, val_records


def find_lora_targets(model: torch.nn.Module) -> List[str]:
    common_targets = [
        "q_proj",
        "k_proj",
        "v_proj",
        "o_proj",
        "gate_proj",
        "up_proj",
        "down_proj",
        "c_attn",
        "c_proj",
    ]

    module_names = [name for name, _ in model.named_modules()]
    found = [target for target in common_targets if any(name.endswith(target) for name in module_names)]

    if not found:
        raise ValueError(
            "Could not auto-detect LoRA target modules. Add model-specific targets in find_lora_targets()."
        )
    return found


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Fine-tune a prompt generator adapter with LoRA")
    parser.add_argument("--train-file", required=True, help="Path to train JSONL")
    parser.add_argument("--val-file", default="", help="Path to validation JSONL (optional)")
    parser.add_argument(
        "--output-dir",
        default="app/super-prompt-model/adapters/project-lora",
        help="Where to save the LoRA adapter",
    )
    parser.add_argument(
        "--base-model",
        default=os.getenv("WEBSITE_PRO_BASE_MODEL", "mistralai/Mistral-7B-v0.1"),
        help="HF base model id",
    )
    parser.add_argument("--epochs", type=float, default=2.0)
    parser.add_argument("--learning-rate", type=float, default=2e-4)
    parser.add_argument("--batch-size", type=int, default=1)
    parser.add_argument("--grad-accum-steps", type=int, default=8)
    parser.add_argument("--max-length", type=int, default=1024)
    parser.add_argument("--val-ratio", type=float, default=0.2)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--local-files-only", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    random.seed(args.seed)
    torch.manual_seed(args.seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(args.seed)

    train_path = Path(args.train_file).resolve()
    val_path = Path(args.val_file).resolve() if args.val_file else None
    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    train_records = read_jsonl(train_path)
    if val_path and val_path.exists():
        val_records = read_jsonl(val_path)
    else:
        train_records, val_records = split_train_val(train_records, val_ratio=args.val_ratio, seed=args.seed)

    use_cuda = torch.cuda.is_available()
    dtype = torch.float16 if use_cuda else torch.float32

    tokenizer = AutoTokenizer.from_pretrained(args.base_model, use_fast=True, local_files_only=args.local_files_only)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    model = AutoModelForCausalLM.from_pretrained(
        args.base_model,
        torch_dtype=dtype,
        device_map="auto" if use_cuda else None,
        local_files_only=args.local_files_only,
    )

    targets = find_lora_targets(model)
    lora_config = LoraConfig(
        task_type=TaskType.CAUSAL_LM,
        r=16,
        lora_alpha=32,
        lora_dropout=0.05,
        target_modules=targets,
        bias="none",
    )
    model = get_peft_model(model, lora_config)

    train_dataset = PromptDataset(train_records, tokenizer=tokenizer, max_length=args.max_length)
    val_dataset = PromptDataset(val_records, tokenizer=tokenizer, max_length=args.max_length)

    training_args = TrainingArguments(
        output_dir=str(output_dir / "checkpoints"),
        overwrite_output_dir=True,
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size,
        gradient_accumulation_steps=args.grad_accum_steps,
        learning_rate=args.learning_rate,
        warmup_ratio=0.03,
        logging_steps=10,
        save_strategy="epoch",
        eval_strategy="epoch",
        report_to="none",
        fp16=use_cuda,
        bf16=False,
        save_total_limit=2,
        load_best_model_at_end=True,
        metric_for_best_model="eval_loss",
        greater_is_better=False,
        seed=args.seed,
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
        data_collator=default_data_collator,
    )

    trainer.train()
    trainer.evaluate()

    model.save_pretrained(str(output_dir))
    tokenizer.save_pretrained(str(output_dir))

    metadata = {
        "base_model": args.base_model,
        "train_file": str(train_path),
        "val_file": str(val_path) if val_path else "split_from_train",
        "num_train_records": len(train_records),
        "num_val_records": len(val_records),
        "epochs": args.epochs,
        "learning_rate": args.learning_rate,
        "batch_size": args.batch_size,
        "gradient_accumulation_steps": args.grad_accum_steps,
        "max_length": args.max_length,
        "target_modules": targets,
    }

    with (output_dir / "training_metadata.json").open("w", encoding="utf-8") as handle:
        json.dump(metadata, handle, indent=2)

    print(f"Adapter saved to: {output_dir}")


if __name__ == "__main__":
    main()
