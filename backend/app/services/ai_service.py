import os
import requests
import shlex
import subprocess
import tempfile
from dotenv import load_dotenv
from pathlib import Path
from typing import Dict

# Load the backend/.env explicitly so provider keys are available
env_path = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(env_path)


def generate_response(prompt: str, attachments=None) -> Dict[str, str]:
    """Attempt Groq -> OpenAI -> dev-mock and return a consistent result dict.

    Returns: { provider: str, response: str }
    """
    # If attachments provided, include a short summary at the top of the prompt
    if attachments:
        try:
            att_lines = ["Attachments summary:"]
            for att in attachments:
                # att may be a pydantic model or dict
                name = att.name if hasattr(att, "name") else att.get("name")
                content = att.content if hasattr(att, "content") else att.get("content")
                mime = att.mime if hasattr(att, "mime") else att.get("mime")
                is_drive = att.is_drive if hasattr(att, "is_drive") else att.get("is_drive")
                if is_drive:
                    # content expected to be a URL
                    att_lines.append(f"- Drive link: {name} -> {content}")
                elif mime and mime.startswith("image"):
                    att_lines.append(f"- Image file: {name} (image content omitted in prompt)")
                else:
                    # include a short excerpt of text attachments
                    excerpt = None
                    if isinstance(content, str) and len(content) > 0:
                        excerpt = content[:2000]
                        if len(content) > 2000:
                            excerpt += "\n... (truncated)"
                    if excerpt:
                        att_lines.append(f"- Text file: {name}:\n{excerpt}")
                    else:
                        att_lines.append(f"- File: {name} (no inline content)")

            prompt = "\n".join(att_lines) + "\n\n" + "User message:\n" + prompt
        except Exception:
            # if attachment processing fails, just proceed with original prompt
            pass

    # Local LLM runner (preferred when configured)
    local_cmd = os.getenv("LOCAL_LLM_CMD")
    local_model = os.getenv("LOCAL_MODEL_PATH")

    groq_key = os.getenv("GROQ_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")
    # Try Groq if configured (prefer Groq when API key is present)
    if groq_key:
        try:
            from groq import Groq

            client = Groq(api_key=groq_key)
            print("➡️ Calling Groq provider...")
            resp = client.chat.completions.create(
                model=os.getenv("GROQ_MODEL", "llama-3.1-8b-instant"),
                messages=[{"role": "user", "content": prompt}],
            )
            return {"provider": "groq", "response": resp.choices[0].message.content}
        except Exception as e:
            print("Groq error, will try local and other providers:", e)

    # Try local LLM if configured
    if local_cmd:
        try:
            print("➡️ Calling local LLM runner...")
            # Allow longer timeout for first-time model downloads (10 minutes)
            local_resp = run_local_model(local_cmd, prompt, model=local_model, timeout=600)
            if local_resp:
                return {"provider": "local", "response": local_resp}
        except Exception as e:
            print("Local LLM error, will try remote providers:", e)

    # Try Hugging Face Inference API if configured (free-tier friendly)
    hf_key = os.getenv("HUGGINGFACE_API_KEY")
    hf_model = os.getenv("HUGGINGFACE_MODEL", "gpt2")
    if hf_key:
        try:
            print("➡️ Calling Hugging Face Inference API (router)...")
            # Use the HF Router endpoint (newer routing endpoint)
            url = f"https://router.huggingface.co/models/{hf_model}"
            headers = {"Authorization": f"Bearer {hf_key}", "Content-Type": "application/json"}
            payload = {"inputs": prompt, "parameters": {"max_new_tokens": 256}}
            r = requests.post(url, headers=headers, json=payload, timeout=30)
            if r.ok:
                data = r.json()
                # Many HF text-generation models return a list of dicts with 'generated_text'
                if isinstance(data, list) and data and isinstance(data[0], dict):
                    text = data[0].get("generated_text") or data[0].get("text")
                    if text:
                        return {"provider": "huggingface", "response": text}
                # Some endpoints return a dict with 'generated_text' or a plain string
                if isinstance(data, dict):
                    text = data.get("generated_text") or data.get("text") or str(data)
                    if text:
                        return {"provider": "huggingface", "response": text}
                # Fallback: treat raw text body as response
                raw = r.text
                if raw:
                    return {"provider": "huggingface", "response": raw}
            else:
                print("Hugging Face returned non-OK status", r.status_code, r.text)
        except Exception as e:
            print("Hugging Face error:", e)

    # Try OpenAI if configured
    if openai_key:
        try:
            print("➡️ Calling OpenAI provider...")
            r = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {openai_key}",
                    "Content-Type": "application/json",
                },
                json={"model": "gpt-3.5-turbo", "messages": [{"role": "user", "content": prompt}]},
                timeout=30,
            )
            if r.ok:
                data = r.json()
                # extract common OpenAI shape
                if "choices" in data and data["choices"]:
                    text = data["choices"][0].get("message", {}).get("content") or data["choices"][0].get("text")
                    if text:
                        return {"provider": "openai", "response": text}
            else:
                print("OpenAI returned non-OK status", r.status_code, r.text)
        except Exception as e:
            print("OpenAI error:", e)

    # Fallback dev mock
    return {"provider": "mock", "response": realistic_mock(prompt)}


def realistic_mock(prompt: str) -> str:
    """Create a richer, helpful mock reply that feels like a real assistant.

    Includes a short summary, 3 actionable steps, and a short estimate.
    """
    # Short heuristic-based templating to produce a plausible answer
    summary = "I don't have access to a live AI provider right now, so here's a simulated assistant response based on your request."

    # Create basic steps by splitting the prompt into keywords (simple heuristic)
    words = [w.strip() for w in prompt.split() if len(w) > 3]
    key_terms = words[:3] if words else ["task"]

    steps = [
        f"Clarify goals: Confirm the main objective — e.g. focus on {', '.join(key_terms)}.",
        "Design an outline: Break the work into digestible sections with deliverables for each.",
        "Implement and iterate: Build a minimal version, test, and refine based on feedback."
    ]

    estimate = "Estimated effort: small prototype (1–2 days), full feature (1–2 weeks) depending on scope."

    details = "\n\n".join(["Summary:\n" + summary, "Suggested action steps:\n- " + "\n- ".join(steps), "Notes:\n" + estimate])

    footer = "\n\n[DEV MOCK] This is a development-mode reply. Configure a valid GROQ_API_KEY or OPENAI_API_KEY in backend/.env to receive live AI responses."

    return details + footer


def run_local_model(cmd_template: str, prompt: str, model: str = None, timeout: int = 60) -> str:
    """Run a local LLM command provided by `LOCAL_LLM_CMD`.

    The command template may include the placeholders:
      - {model}        : substituted with `LOCAL_MODEL_PATH` (if provided)
      - {prompt}       : substituted with the prompt (quoted)
      - {prompt_file}  : substituted with a temporary filename containing the prompt

    Examples:
      LOCAL_LLM_CMD='./main -m {model} -p "{prompt}" -n 256'
      LOCAL_LLM_CMD='./main -m {model} -f {prompt_file} -n 256'

    Writing the prompt to a temp file and using {prompt_file} is safer for long prompts.
    """
    # If the command template expects a prompt file, write prompt to temp file
    prompt_file = None
    try:
        if "{prompt_file}" in cmd_template:
            tf = tempfile.NamedTemporaryFile(delete=False, mode="w", encoding="utf-8")
            tf.write(prompt)
            tf.flush()
            prompt_file = tf.name
            tf.close()
            formatted = cmd_template.format(model=model or "", prompt_file=prompt_file)
        else:
            # Leave quoting to the shell; format the prompt directly
            formatted = cmd_template.format(model=model or "", prompt=prompt)

        # Run the command string via the shell so paths with spaces and quoted
        # arguments are handled correctly (uses the current shell environment).
        proc = subprocess.run(formatted, shell=True, capture_output=True, text=True, timeout=timeout)
        if proc.returncode == 0:
            out = proc.stdout.strip()
            if out:
                return out
            return proc.stderr.strip()
        else:
            raise RuntimeError(f"Local LLM command failed ({proc.returncode}): {proc.stderr}")
    finally:
        if prompt_file:
            try:
                os.unlink(prompt_file)
            except Exception:
                pass