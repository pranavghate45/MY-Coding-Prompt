Local LLM (llama.cpp / ggml) integration

Goal

Allow the backend to call a local open-source LLM (eg. via llama.cpp, llama.cpp-based runner, or any CLI-based text-gen binary).

How it works

- Set environment variables in `backend/.env`:
  - `LOCAL_LLM_CMD` — a command template the server will run. The template may include placeholders `{model}`, `{prompt}` and/or `{prompt_file}`.
  - `LOCAL_MODEL_PATH` — optional: path to the model file (substituted for `{model}`).

Examples

1) If you have `llama.cpp` compiled and the `main` binary in the repo root, and a ggml model `model.ggml`:

```
LOCAL_MODEL_PATH=/path/to/model.ggml
LOCAL_LLM_CMD="./main -m {model} -p \"{prompt}\" -n 256"
```

This will run `./main -m /path/to/model.ggml -p "<your prompt>" -n 256`.

2) Safer for long prompts (write prompt to temp file):

```
LOCAL_MODEL_PATH=/path/to/model.ggml
LOCAL_LLM_CMD="./main -m {model} -f {prompt_file} -n 256"
```

This writes the prompt to a temp file and passes the filename as `{prompt_file}`.

Notes

- The backend will try the local runner first when `LOCAL_LLM_CMD` is set. If it fails, it falls back to configured remote providers (GROQ → OpenAI) and finally to the dev mock.
- The command must be accessible to the backend process and executable under the user that runs the server.
- If you need help wiring a specific runner (text-generation-inference, ollama, llama.cpp, ggml), I can add a tuned `LOCAL_LLM_CMD` example for your setup.
