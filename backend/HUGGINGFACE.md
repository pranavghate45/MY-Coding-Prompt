Hugging Face Inference API (quick setup)

You can use Hugging Face's hosted Inference API on its free tier for basic text-generation.

1) Obtain a token
- Sign in at https://huggingface.co
- Go to Settings → Access Tokens → Create new token (scope: `read`)

2) Choose a model
- Pick a lightweight text-generation model that supports inference (example: `gpt2`, `bigscience/bloomz-small`, `google/flan-t5-small`, or other community models).
- For better chat-like results prefer instruction-tuned models (eg. `bigscience/bloomz-*`, `google/flan-*`).

3) Add to `backend/.env`:

```
HUGGINGFACE_API_KEY=hf_<your_token_here>
HUGGINGFACE_MODEL=gpt2
```

4) Restart backend and test `/chat` or `/ai/ask-ai`.

Notes
- The backend will try Hugging Face before OpenAI when `HUGGINGFACE_API_KEY` is set.
- Free-tier rate-limits apply; pick smaller models for lower latency.
- If you want, I can add a small adapter for chat-format models (system/user messages) — tell me which model you want to use.
