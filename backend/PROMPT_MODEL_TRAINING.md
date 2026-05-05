# Project-Specific Prompt Model Training

This setup fine-tunes a LoRA adapter so prompt generation is better aligned to your project style and stack.

## Files Added

- `app/scripts/train_prompt_model.py`
- `app/scripts/eval_prompt_model.py`
- `app/scripts/export_prompt_training_data.py`
- `app/scripts/export_prompt_training_data_top.py`
- `app/super-prompt-model/datasets/prompt_train.sample.jsonl`
- `app/super-prompt-model/datasets/prompt_eval.sample.jsonl`

## 0) Auto-Extract Dataset From DB

You can generate train/eval JSONL directly from existing DB prompt/session data.

From backend folder:

```bash
python app/scripts/export_prompt_training_data.py \
  --output-train app/super-prompt-model/datasets/prompt_train.auto.jsonl \
  --output-eval app/super-prompt-model/datasets/prompt_eval.auto.jsonl \
  --eval-ratio 0.15 \
  --min-output-words 30
```

Optional quality controls:

```bash
python app/scripts/export_prompt_training_data.py \
  --min-score 7.5 \
  --include-chats \
  --max-chats 2000
```

What it extracts:
- `generated_prompts.final_prompt` as training target output.
- Requirement/question/answer context where available.
- Optional prompt-like user/assistant pairs from `chats.messages`.
- Persisted Website Pro prompt versions (`prompt_sessions`/`prompt_versions`) for selected and edited variants.

To skip Website Pro session extraction:

```bash
python app/scripts/export_prompt_training_data.py --skip-website-pro-sessions
```

## 0b) Top-Performing Dataset Export (Recommended)

This exporter keeps only quality-focused examples:
- highest-scored example per requirement
- newest example per user

From backend folder:

```bash
python app/scripts/export_prompt_training_data_top.py \
  --output-train app/super-prompt-model/datasets/prompt_train.top.jsonl \
  --output-eval app/super-prompt-model/datasets/prompt_eval.top.jsonl \
  --min-score 7.5 \
  --eval-ratio 0.15
```

If many prompts do not have scores yet, include newest-per-user unscored rows too:

```bash
python app/scripts/export_prompt_training_data_top.py \
  --min-score 7.5 \
  --allow-unscored-newest
```

## Website Pro Prompt Persistence APIs

Migration to apply first:
- `db_migrations/007_create_prompt_sessions_versions.sql`

Endpoints added under `/ai`:
- `POST /website-pro/generate-prompts` now persists a prompt session and returns `sessionId` + `versionId` for each variant.
- `POST /website-pro/prompt-sessions/{session_id}/select` to persist selected variant.
- `POST /website-pro/prompt-sessions/{session_id}/edits` to persist user-edited variants.
- `GET /website-pro/prompt-sessions` to fetch session history.
- `GET /website-pro/prompt-sessions/{session_id}` to fetch one session with versions.

## Dataset Format

JSONL with one object per line:

```json
{"level":"Advanced","context":{"framework":"Next.js","backend":"FastAPI","database":"PostgreSQL","goal":"..."},"output":"ideal generated prompt text"}
```

Fields:
- `level`: `Basic|Improved|Advanced|Expert|Premium`
- `context`: project metadata used for generation
- `output`: target prompt text you want the model to produce

## 1) Train Adapter

From backend folder:

```bash
python app/scripts/train_prompt_model.py \
  --train-file app/super-prompt-model/datasets/prompt_train.sample.jsonl \
  --val-file app/super-prompt-model/datasets/prompt_eval.sample.jsonl \
  --base-model mistralai/Mistral-7B-v0.1 \
  --output-dir app/super-prompt-model/adapters/project-lora
```

Notes:
- For large models, GPU is strongly recommended.
- If you already downloaded model files and want offline mode, add `--local-files-only`.
- You can tune `--epochs`, `--learning-rate`, `--batch-size`, and `--grad-accum-steps`.

## 2) Evaluate Baseline vs Tuned

```bash
python app/scripts/eval_prompt_model.py \
  --eval-file app/super-prompt-model/datasets/prompt_eval.sample.jsonl \
  --base-model mistralai/Mistral-7B-v0.1 \
  --adapter-dir app/super-prompt-model/adapters/project-lora \
  --output-report app/super-prompt-model/eval_report.json
```

This writes a report with:
- average baseline quality score
- average tuned quality score
- per-example outputs and checks

## 3) Enable in Backend Service

Set env values in backend `.env`:

```env
WEBSITE_PRO_ENABLE_LOCAL_MODEL=true
WEBSITE_PRO_BASE_MODEL=mistralai/Mistral-7B-v0.1
WEBSITE_PRO_ADAPTER_DIR=app/super-prompt-model/adapters/project-lora
```

`website_pro_prompt_service.py` will load this adapter directory when local model mode is enabled.

## 4) Production Tips

- Replace sample JSONL with your real project data (at least 200-1000 high-quality examples).
- Keep evaluation set separate from training set.
- Track score deltas in `eval_report.json` for every training run.
- Version adapters per run, for example `adapters/project-lora-2026-04-20`.
