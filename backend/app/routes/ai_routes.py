from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.chat import Chat
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from fastapi import Header
from fastapi import Request
import requests
import os
from dotenv import load_dotenv
from datetime import datetime, timedelta
import time
import json
from sqlalchemy import text
import logging

load_dotenv()

router = APIRouter()

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# Simple models endpoint to avoid 404s from frontend model discovery
@router.get("/models")
def list_models():
    # Return a lightweight list of available backend models for the frontend
    models = [
        {"id": "auto", "name": "Auto", "multiplier": 0},
        {"id": "gpt-4.1", "name": "Model A", "multiplier": 0},
        {"id": "gpt-4o", "name": "Model B", "multiplier": 0},
        {"id": "gemini-2.0-pro", "name": "Model C", "multiplier": 1},
    ]
    return {"models": models, "selectedModelId": "auto", "autoOption": {"discountText": "10% discount"}}


@router.get("/website-pro/model-health")
def website_pro_model_health():
    try:
        from app.services.website_pro_prompt_service import get_website_pro_model_health

        return get_website_pro_model_health()
    except Exception as e:
        return {
            "enabled": False,
            "loaded": False,
            "status": "error",
            "error": str(e),
        }

class PromptInput(BaseModel):
    prompt: str
    new_chat: Optional[bool] = False


class FeedbackInput(BaseModel):
    feedback: str
    recordId: Optional[str] = None
    inputText: Optional[str] = None


class WebsiteProInput(BaseModel):
    siteType: str
    appType: Optional[str] = None
    framework: str
    styleSystem: str
    backend: str
    database: str
    goal: str
    developerType: Optional[str] = "full_stack"
    features: Optional[List[str]] = None
    userFlow: Optional[str] = None
    authType: Optional[str] = None
    stateManagement: Optional[str] = None
    performanceOptimization: Optional[str] = None
    integrations: Optional[str] = None
    projectStructure: Optional[str] = None
    testingRequirements: Optional[str] = None
    uiComplexity: Optional[str] = None
    platformTarget: Optional[str] = None
    uiFocus: Optional[str] = None
    componentsFocus: Optional[str] = None
    apiStyle: Optional[str] = None
    authenticationRequired: Optional[bool] = None
    includeDiscoveryQuestions: Optional[bool] = True
    useModelOutput: Optional[bool] = False
    target: Optional[str] = None
    projectId: Optional[int] = None
    group: Optional[dict] = None


class WebsiteProProject(BaseModel):
    id: int
    siteType: str
    framework: str
    styleSystem: str
    backend: str
    database: str
    goal: str
    target: Optional[str] = None
    group: Optional[dict] = None
    createdAt: str


class PromptItem(BaseModel):
    title: str
    prompt: str
    locked: bool
    versionId: Optional[int] = None


class WebsitePromptsResponse(BaseModel):
    sessionId: Optional[int] = None
    developerType: Optional[str] = None
    questions: List[str] = []
    prompts: List[PromptItem]


class WebsitePromptSelectInput(BaseModel):
    versionId: int


class WebsitePromptEditInput(BaseModel):
    prompt: str
    baseVersionId: Optional[int] = None
    title: Optional[str] = None
    selectEdited: Optional[bool] = True


# In-memory fallback when prompt session tables are not available
WEBSITE_PROMPT_SESSIONS: Dict[int, Dict[str, Any]] = {}
_WEBSITE_PROMPT_SESSION_SEQ = int(time.time() * 1000)
_WEBSITE_PROMPT_VERSION_SEQ = int(time.time() * 1000)


def _next_website_prompt_session_id() -> int:
    global _WEBSITE_PROMPT_SESSION_SEQ
    _WEBSITE_PROMPT_SESSION_SEQ += 1
    return _WEBSITE_PROMPT_SESSION_SEQ


def _next_website_prompt_version_id() -> int:
    global _WEBSITE_PROMPT_VERSION_SEQ
    _WEBSITE_PROMPT_VERSION_SEQ += 1
    return _WEBSITE_PROMPT_VERSION_SEQ


def _extract_user_id_from_auth_header(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None

    try:
        token = authorization.split(" ")[1]
    except Exception:
        return None

    try:
        from app.services.auth_service import verify_token

        user_data = verify_token(token)
        if not user_data:
            return None
        return str(user_data.get("user_id") or user_data.get("sub") or user_data.get("email") or "guest")
    except Exception:
        return None


def _serialize_prompt_version(version: Any) -> Dict[str, Any]:
    return {
        "id": version.id,
        "title": version.title,
        "prompt": version.prompt,
        "locked": bool(version.locked),
        "source": getattr(version, "source", "generated"),
        "basedOnVersionId": getattr(version, "based_on_version_id", None),
        "isSelected": bool(getattr(version, "is_selected", False)),
        "createdAt": version.created_at.isoformat() + "Z" if getattr(version, "created_at", None) else None,
    }


def _normalize_developer_type(value: Optional[str]) -> str:
    normalized = (value or "full_stack").strip().lower()
    if normalized not in {"frontend", "backend", "full_stack"}:
        return "full_stack"
    return normalized


def _clean_text(value: Optional[str]) -> str:
    return value.strip() if isinstance(value, str) else ""


def _truncate(text: str, limit: int = 1200) -> str:
    if not isinstance(text, str):
        return ""
    if len(text) <= limit:
        return text
    return text[:limit].rsplit(" ", 1)[0] + "..."


def _parse_json_like(text: str) -> Optional[str]:
    """If `text` looks like JSON, parse and return a concise summary."""
    if not isinstance(text, str):
        return None
    txt = text.strip()
    if not txt:
        return None
    if txt.startswith("{" ) or txt.startswith("["):
        try:
            obj = json.loads(txt)
            if isinstance(obj, dict):
                parts = []
                for k, v in obj.items():
                    if isinstance(v, (str, int, float)):
                        parts.append(f"{k}: {str(v)}")
                    else:
                        parts.append(f"{k}")
                return ", ".join(parts)
            if isinstance(obj, list):
                # list of strings or dicts
                if all(isinstance(x, str) for x in obj):
                    return ", ".join(obj[:10])
                return None
        except Exception:
            return None
    return None


def _dedupe_and_compact(text: Optional[str]) -> str:
    """Remove obvious repeats and compact long noisy strings into a readable list."""
    if not text or not isinstance(text, str):
        return ""

    # quick trim
    t = text.strip()
    # try parse JSON-like payloads first
    parsed = _parse_json_like(t)
    if parsed:
        t = parsed

    # collapse exact repeated words (e.g., "csv csv csv")
    import re

    t = re.sub(r"\b(\w+)(?:[\s,;:\-]+\1){1,}\b", r"\1", t, flags=re.IGNORECASE)

    # split into candidate phrases by common separators and dedupe case-insensitive
    parts = re.split(r"[\n,;]+", t)
    seen = []
    for p in parts:
        p2 = p.strip()
        if not p2:
            continue
        lowered = p2.lower()
        if not any(lowered == s.lower() for s in seen):
            seen.append(p2)

    compact = ", ".join(seen)
    # final truncate to avoid enormous prompts
    return _truncate(compact, limit=1000)


def _noise_score(user_input: WebsiteProInput) -> int:
    """Return a simple noise score based on repeated spam tokens and overly long fields."""
    import re

    spam_patterns = [r"export to csv", r"export to aws cloudfront", r"export to csv", r"export", r"csv"]
    fields = [
        user_input.userFlow or "",
        user_input.stateManagement or "",
        user_input.integrations or "",
        user_input.projectStructure or "",
        user_input.testingRequirements or "",
        user_input.uiFocus or "",
        user_input.componentsFocus or "",
    ]
    score = 0
    for f in fields:
        if not f:
            continue
        # long fields add score
        if len(f) > 400:
            score += 2
        for pat in spam_patterns:
            matches = re.findall(pat, f, flags=re.IGNORECASE)
            if matches:
                score += len(matches)

    # penalty for many repeated tokens overall
    combined = " ".join(fields)
    repeats = re.findall(r"(\b\w+\b)(?:[\s,;:\-]+\1){2,}", combined, flags=re.IGNORECASE)
    score += len(repeats) * 2
    return score


@router.post("/website-pro/debug-generate")
def debug_generate_website_prompts(user_input: WebsiteProInput):
    """Return sanitized input and the safe route template prompts without calling the model service.

    This endpoint is for debugging and inspection only.
    """
    developer_type = _normalize_developer_type(user_input.developerType)

    # sanitize inputs using the existing helpers
    sanitized = {
        "siteType": _clean_text(user_input.siteType),
        "framework": _clean_text(user_input.framework),
        "styleSystem": _clean_text(user_input.styleSystem),
        "backend": _clean_text(user_input.backend),
        "database": _clean_text(user_input.database),
        "goal": _truncate(_clean_text(user_input.goal), 800),
        "developerType": developer_type,
        "features": [str(f).strip() for f in (user_input.features or []) if f and str(f).strip()],
        "userFlow": _dedupe_and_compact(_clean_text(user_input.userFlow)),
        "stateManagement": _dedupe_and_compact(_clean_text(user_input.stateManagement)),
        "performanceOptimization": _dedupe_and_compact(_clean_text(user_input.performanceOptimization)),
        "integrations": _dedupe_and_compact(_clean_text(user_input.integrations)),
        "projectStructure": _dedupe_and_compact(_clean_text(user_input.projectStructure)),
        "testingRequirements": _dedupe_and_compact(_clean_text(user_input.testingRequirements)),
        "uiFocus": _dedupe_and_compact(_clean_text(user_input.uiFocus)),
        "componentsFocus": _dedupe_and_compact(_clean_text(user_input.componentsFocus)),
        "apiStyle": _clean_text(user_input.apiStyle),
    }

    # Build the same template prompts used by the route, but do not call the model
    platform_target = sanitized.get("platformTarget") or sanitized.get("siteType") or "website"
    shared_focus_block = _join_nonempty([
        f"- Features: {', '.join(sanitized.get('features') or []) or 'No features selected'}",
        f"- User flow: {sanitized.get('userFlow') or 'Not specified'}",
        f"- Platform target: {platform_target}",
        f"- UI complexity: { _clean_text(user_input.uiComplexity) or 'Not specified'}",
        f"- Project structure: {sanitized.get('projectStructure') or 'Not specified'}",
        f"- Testing requirements: {sanitized.get('testingRequirements') or 'Not specified'}",
    ])

    frontend_focus_block = _join_nonempty([
        f"- State management: {sanitized.get('stateManagement') or 'Not specified'}",
        f"- Performance / optimization: {sanitized.get('performanceOptimization') or 'Not specified'}",
        f"- UI focus: {sanitized.get('uiFocus') or 'Not specified'}",
        f"- Components focus: {sanitized.get('componentsFocus') or 'Not specified'}",
    ])

    backend_focus_block = _join_nonempty([
        f"- Auth type: {sanitized.get('apiStyle') or ('Required' if user_input.authenticationRequired else 'Optional')}",
        f"- API style: {sanitized.get('apiStyle') or 'REST'}",
        f"- Integrations: {sanitized.get('integrations') or 'Not specified'}",
        f"- Database: {sanitized.get('database') or 'Not specified'}",
        f"- Auth required: {'Yes' if user_input.authenticationRequired else 'No'}",
    ])

    basic = f"""
Create a simple {sanitized.get('siteType') or platform_target} using {sanitized.get('framework') or 'the chosen framework'} for a {developer_type} developer workflow.
Use {sanitized.get('styleSystem') or 'the chosen style system'} for styling and connect with {sanitized.get('backend') or 'the chosen backend'} + {sanitized.get('database') or 'the chosen database'} where relevant.
Target platform: {platform_target}.

Core product inputs:
{shared_focus_block}

Frontend focus:
{frontend_focus_block if developer_type in {'frontend', 'full_stack'} else 'Not applicable'}

Backend focus:
{backend_focus_block if developer_type in {'backend', 'full_stack'} else 'Not applicable'}

Goal: {sanitized.get('goal')}
"""

    improved = f"""
You are a senior {developer_type} engineer. Build a structured {sanitized.get('siteType') or platform_target} using {sanitized.get('framework') or 'the chosen framework'}.

Requirements:
- Include only the layers relevant to {developer_type} scope first
- Respect the requested platform target: {platform_target}
- Make the user flow explicit: {sanitized.get('userFlow') or 'clarify before coding'}

Focus constraints:
{shared_focus_block}
{frontend_focus_block if developer_type in {'frontend', 'full_stack'} else ''}
{backend_focus_block if developer_type in {'backend', 'full_stack'} else ''}

Goal: {sanitized.get('goal')}
"""

    prompts = [
        {"title": "Basic", "prompt": basic, "locked": False},
        {"title": "Improved", "prompt": improved, "locked": False},
    ]

    return {"sanitized_input": sanitized, "prompts": prompts}


def _join_nonempty(items: List[str], separator: str = "\n") -> str:
    return separator.join(item for item in items if item)


def _developer_questions(developer_type: str) -> List[str]:
    if developer_type == "frontend":
        return [
            "Which UI screens/components are highest priority for the first release?",
            "What design system, visual style, and interaction patterns should be followed?",
            "Which reusable components should be created first and what props should they expose?",
            "What accessibility and responsive requirements must be enforced across breakpoints?",
            "What frontend state management and data-fetching approach should be used?",
        ]
    if developer_type == "backend":
        return [
            "Which core API resources and endpoints are required for MVP?",
            "What database schema, indexes, and relationships are required?",
            "What authentication and authorization model should be used?",
            "What validation, error handling, and rate-limiting policies are needed?",
            "What background jobs, caching, and observability requirements should be included?",
        ]

    return [
        "Which frontend screens and backend APIs should be delivered in phase one?",
        "What reusable UI components and service-layer modules are required?",
        "What end-to-end data flow should connect UI events to API/business logic and DB writes?",
        "What authentication, authorization, and security controls are needed across the stack?",
        "What testing and deployment strategy should validate both frontend and backend together?",
    ]


def _focus_lines(
    developer_type: str,
    style_system: str,
    backend: str,
    database: str,
    ui_focus: Optional[str],
    components_focus: Optional[str],
    api_style: Optional[str],
    authentication_required: Optional[bool],
) -> List[str]:
    lines: List[str] = []
    if developer_type in {"frontend", "full_stack"}:
        lines.append(f"UI and styling focus: {ui_focus or 'responsive layout, polished UX, accessibility, and clear visual hierarchy'}")
        lines.append(f"Component focus: {components_focus or 'reusable, composable components with clear responsibilities and prop contracts'}")
        lines.append(f"Style system preference: {style_system}")

    if developer_type in {"backend", "full_stack"}:
        lines.append(f"API focus: {api_style or 'REST endpoints with clear request/response contracts and validation'}")
        lines.append(f"Backend stack: {backend}, data layer: {database}")
        auth_text = "Authentication and authorization must be implemented." if authentication_required is not False else "Authentication can be mocked or deferred for MVP."
        lines.append(auth_text)

    return lines


def _persist_chat_thread(db: Session, user_id: str, prompt: str, response: str, new_chat: bool = False) -> None:
    if new_chat:
        messages = [{"role": "user", "content": prompt, "ts": None}, {"role": "assistant", "content": response, "ts": None}]
        chat = Chat(user_id=user_id, prompt=prompt, response=response, messages=json.dumps(messages))
        db.add(chat)
        db.commit()
        return

    latest = db.query(Chat).filter(Chat.user_id == user_id).order_by(Chat.created_at.desc()).first()
    if latest and latest.messages:
        try:
            msgs = json.loads(latest.messages)
        except Exception:
            msgs = []
        msgs.append({"role": "user", "content": prompt, "ts": None})
        msgs.append({"role": "assistant", "content": response, "ts": None})
        latest.messages = json.dumps(msgs)
        latest.response = response
        db.add(latest)
        db.commit()
        return

    messages = [{"role": "user", "content": prompt, "ts": None}, {"role": "assistant", "content": response, "ts": None}]
    chat = Chat(user_id=user_id, prompt=prompt, response=response, messages=json.dumps(messages))
    db.add(chat)
    db.commit()


def _store_learning_safely(
    user_id: str,
    input_text: str,
    output_text: str,
    embedding: List[float],
    source: str,
    similarity: Optional[float] = None,
    matched_record_id: Optional[str] = None,
) -> None:
    if not embedding:
        return

    try:
        from app.services.memory_service import store_interaction

        store_interaction(
            user_id=user_id,
            input_text=input_text,
            output_text=output_text,
            embedding=embedding,
            source=source,
            similarity=similarity,
            matched_record_id=matched_record_id,
        )
    except Exception as e:
        print("Warning: failed to store NLP learning record:", e)


@router.post("/ask-ai")
def ask_ai(
    data: PromptInput,
    db: Session = Depends(get_db),
    authorization: str = Header(None)
):
    # Validate Authorization header
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    token = None
    try:
        token = authorization.split(" ")[1]
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid Authorization header format")

    from app.services.auth_service import verify_token
    user_data = verify_token(token)
    if not user_data:
        raise HTTPException(status_code=401, detail="Invalid token")

    user_id = str(user_data.get("user_id") or user_data.get("sub") or user_data.get("email") or "guest")

    similarity_threshold = float(os.getenv("NLP_SIMILARITY_THRESHOLD", "0.7"))
    query_embedding: List[float] = []

    try:
        from app.services.nlp_service import generate_embedding
        from app.services.memory_service import find_similar_interaction

        query_embedding = generate_embedding(data.prompt)
        learned_match = find_similar_interaction(
            user_id=user_id,
            query_embedding=query_embedding,
            threshold=similarity_threshold,
        )

        if learned_match and learned_match.get("output_text"):
            learned_answer = str(learned_match.get("output_text"))
            try:
                _persist_chat_thread(db, user_id, data.prompt, learned_answer, bool(getattr(data, "new_chat", False)))
            except Exception as e:
                print("Warning: failed to persist learned chat thread:", e)

            _store_learning_safely(
                user_id=user_id,
                input_text=data.prompt,
                output_text=learned_answer,
                embedding=query_embedding,
                source="learned",
                similarity=learned_match.get("similarity"),
                matched_record_id=learned_match.get("record_id"),
            )

            return {
                "response": learned_answer,
                "source": "learned",
                "similarity": learned_match.get("similarity"),
            }
    except Exception as e:
        print("Warning: NLP similarity lookup skipped:", e)

    # Read provider keys (GROQ optional; if missing we'll try OpenAI or mock)
    api_key = os.getenv("GROQ_API_KEY")

    # Try GROQ first; if the key is invalid or provider returns 401, fall back to OpenAI if available.
    openai_key = os.getenv("OPENAI_API_KEY")

    def extract_message_from_result(res_json: dict):
        # Support both providers' response shapes
        if "choices" in res_json and res_json.get("choices"):
            first = res_json["choices"][0]
            # common shape: { message: { content: '...' } }
            if isinstance(first.get("message"), dict) and "content" in first["message"]:
                return first["message"]["content"]
            # alternate shape: { text: '...' }
            if "text" in first:
                return first["text"]
        return None

    try:
        # If we have a GROQ key, try it first
        result = None
        used_provider = None

        if api_key:
            try:
                resp = requests.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "llama-3.1-8b-instant",
                        "messages": [{"role": "user", "content": data.prompt}]
                    },
                    timeout=30,
                )
            except requests.RequestException as e:
                # network error to GROQ — attempt OpenAI if available
                if openai_key:
                    resp = None
                else:
                    raise HTTPException(status_code=502, detail=f"Failed to reach GROQ provider: {str(e)}")

            if resp is not None:
                if resp.ok:
                    result = resp.json()
                    used_provider = "groq"
                else:
                    # read error body
                    try:
                        err = resp.json()
                    except Exception:
                        err = resp.text
                        # if invalid API key, try OpenAI fallback; otherwise log and fall back to mock
                        if resp.status_code == 401 or (isinstance(err, dict) and err.get("code") == "invalid_api_key"):
                            print("GROQ invalid api key or unauthorized; will try OpenAI if configured.", err)
                        else:
                            print("GROQ provider returned error; falling back to next provider or mock:", err)
                        resp = None

        # If we didn't get a result from GROQ, try OpenAI if key present
        if result is None:
            if openai_key:
                try:
                    resp2 = requests.post(
                        "https://api.openai.com/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {openai_key}",
                            "Content-Type": "application/json"
                        },
                        json={
                            "model": "gpt-3.5-turbo",
                            "messages": [{"role": "user", "content": data.prompt}]
                        },
                        timeout=30,
                    )
                except requests.RequestException as e:
                    raise HTTPException(status_code=502, detail=f"Failed to reach OpenAI provider: {str(e)}")

                if not resp2.ok:
                    try:
                        err2 = resp2.json()
                    except Exception:
                        err2 = resp2.text
                    print("OpenAI provider returned error; falling back to mock:", err2)
                    resp2 = None
                else:
                    result = resp2.json()
                    used_provider = "openai"
            else:
                # No provider keys available — return a richer development mock reply
                from app.services.ai_service import realistic_mock

                mock_answer = realistic_mock(data.prompt)
                try:
                    # append to existing thread unless a new chat was requested
                    _persist_chat_thread(db, user_id, data.prompt, mock_answer, bool(getattr(data, "new_chat", False)))
                except Exception:
                    # ignore persistence errors
                    pass
                _store_learning_safely(
                    user_id=user_id,
                    input_text=data.prompt,
                    output_text=mock_answer,
                    embedding=query_embedding,
                    source="generated",
                )
                return {"response": mock_answer, "provider": "mock"}

    except HTTPException:
        # re-raise FastAPI HTTPExceptions
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Unexpected error while calling AI provider: {str(e)}")

    if not result:
        # No provider produced a valid result — return a richer development mock reply
        from app.services.ai_service import realistic_mock

        mock_answer = realistic_mock(data.prompt)
        try:
            _persist_chat_thread(db, user_id, data.prompt, mock_answer, bool(getattr(data, "new_chat", False)))
        except Exception:
            pass
        _store_learning_safely(
            user_id=user_id,
            input_text=data.prompt,
            output_text=mock_answer,
            embedding=query_embedding,
            source="generated",
        )
        return {"response": mock_answer, "provider": "mock"}

    answer = extract_message_from_result(result)
    if answer is None:
        raise HTTPException(status_code=502, detail={"provider_response": result})

    try:
        _persist_chat_thread(db, user_id, data.prompt, answer, bool(getattr(data, "new_chat", False)))
    except Exception as e:
        print("Warning: failed to persist chat:", e)

    _store_learning_safely(
        user_id=user_id,
        input_text=data.prompt,
        output_text=answer,
        embedding=query_embedding,
        source="generated",
    )

    return {"response": answer}


@router.post("/feedback")
def add_feedback(data: FeedbackInput, authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    user_id = _extract_user_id_from_auth_header(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    feedback = (data.feedback or "").strip().lower()
    if feedback not in {"like", "dislike"}:
        raise HTTPException(status_code=400, detail="feedback must be 'like' or 'dislike'")

    try:
        from app.services.memory_service import set_feedback

        updated = set_feedback(
            user_id=user_id,
            feedback=feedback,
            record_id=data.recordId,
            input_text=data.inputText,
        )
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Failed to store feedback: {str(e)}")

    if not updated:
        raise HTTPException(status_code=404, detail="No matching learning record found")

    return {"success": True, "feedback": feedback}

# ------------------ GET HISTORY ------------------

@router.get("/history/{user_id}")
def get_chat_history(user_id: str, db: Session = Depends(get_db)):
    # Try to select messages column if available; fall back gracefully if DB schema not migrated.
    results = []
    try:
        sql = text("SELECT id, user_id, prompt, response, messages, created_at FROM chats WHERE user_id = :uid ORDER BY created_at DESC")
        rows = db.execute(sql, {"uid": user_id}).fetchall()
        for r in rows:
            try:
                msgs = json.loads(r[4]) if r[4] else None
            except Exception:
                msgs = None
            results.append({
                "id": r[0],
                "user_id": r[1],
                "prompt": r[2],
                "response": r[3],
                "messages": msgs,
                "created_at": r[5].isoformat() if r[5] else None,
            })
        return {"chats": results}
    except Exception:
        # messages column may not exist yet; fall back to selecting known columns
        sql2 = text("SELECT id, user_id, prompt, response, created_at FROM chats WHERE user_id = :uid ORDER BY created_at DESC")
        rows = db.execute(sql2, {"uid": user_id}).fetchall()
        for r in rows:
            results.append({
                "id": r[0],
                "user_id": r[1],
                "prompt": r[2],
                "response": r[3],
                "messages": None,
                "created_at": r[4].isoformat() if r[4] else None,
            })
        return {"chats": results}


# ------------------ WEBSITE PRO (dev stub) ------------------

# In-memory fallback for environments where DB migration hasn't been applied yet
PROJECTS: list[dict] = []


@router.get("/website-pro/projects")
def list_website_projects(request: Request, db: Session = Depends(get_db)):
    from app.models import Project, Group

    projects = []
    try:
        # Try to determine the requesting user (optional auth)
        auth = request.headers.get("authorization")
        user_email = None
        is_admin = False
        if auth:
            try:
                token = auth.split(" ")[1]
                from app.services.auth_service import verify_token
                ud = verify_token(token)
                user_email = ud.get("email") if ud else None
                is_admin = ud.get("role") == "admin" if ud else False
            except Exception:
                user_email = None

        rows = db.query(Project).order_by(Project.created_at.desc()).all()
        for p in rows:
            grp = None
            if p.group_id:
                g = db.query(Group).filter(Group.id == p.group_id).first()
                if g:
                    import json as _json
                    try:
                        members = _json.loads(g.members) if g.members else []
                    except Exception:
                        members = []
                    grp = {"id": g.id, "name": g.name, "members": members}

            # attempt to parse plan if stored as JSON
            plan = None
            try:
                import json as _json
                plan = _json.loads(p.plan) if p.plan else None
            except Exception:
                plan = p.plan.split("\n") if p.plan else None

            # permission: if project has group, only include if user is admin or member
            include = True
            if grp and not is_admin:
                include = user_email in (grp.get("members") or [])

            if not include:
                continue

            projects.append({
                "id": p.id,
                "siteType": p.site_type,
                "framework": p.framework,
                "styleSystem": p.style_system,
                "backend": p.backend,
                "database": p.database,
                "goal": p.goal,
                "target": p.target,
                "plan": plan,
                "group": grp,
                "createdAt": p.created_at.isoformat() + "Z" if p.created_at else None,
            })
    except Exception:
        # If DB isn't migrated or accessible, fall back to the in-memory store
        try:
            return {"projects": PROJECTS}
        except Exception:
            return {"projects": []}

    return {"projects": projects}


@router.post("/website-pro/projects")
def create_website_project(data: WebsiteProInput, db: Session = Depends(get_db)):
    from app.models import Project, Group
    import json as _json

    try:
        # create group if provided
        group_obj = None
        if data.group:
            members_json = None
            try:
                members = data.group.get("members") if isinstance(data.group, dict) else None
                members_json = _json.dumps(members or [])
            except Exception:
                members_json = _json.dumps([])

            group_obj = Group(name=data.group.get("name") if isinstance(data.group, dict) else None, members=members_json)
            db.add(group_obj)
            db.commit()
            db.refresh(group_obj)

        # build plan
        plan_list = [
            f"Project: {data.siteType} using {data.framework}",
            f"Styling: {data.styleSystem}",
            f"Backend: {data.backend}",
            f"Database: {data.database}",
            "Pages: Home, Features, Pricing, About, Contact",
            "Components: Hero, CTA, Testimonials, FAQ, Footer",
            "SEO: Meta tags, OG tags, sitemap, semantic headings",
            "Performance: Image optimization, code splitting, Lighthouse targets",
            "Conversion: Primary CTA strategy and trust elements",
        ]

        project = Project(
            name=None,
            target=data.target,
            site_type=data.siteType,
            framework=data.framework,
            style_system=data.styleSystem,
            backend=data.backend,
            database=data.database,
            goal=data.goal,
            plan=_json.dumps(plan_list),
            group_id=group_obj.id if group_obj else None,
        )

        db.add(project)
        db.commit()
        db.refresh(project)

        return {
            "project": {
                "id": project.id,
                "siteType": project.site_type,
                "framework": project.framework,
                "styleSystem": project.style_system,
                "backend": project.backend,
                "database": project.database,
                "goal": project.goal,
                "target": project.target,
                "plan": plan_list,
                "group": {"id": group_obj.id, "name": group_obj.name, "members": _json.loads(group_obj.members)} if group_obj else None,
                "createdAt": project.created_at.isoformat() + "Z",
            }
        }


    except Exception:
        # If DB not ready (tables missing) or any DB error, fall back to in-memory store
        try:
            project = {
                "id": int(time.time() * 1000),
                "siteType": data.siteType,
                "framework": data.framework,
                "styleSystem": data.styleSystem,
                "backend": data.backend,
                "database": data.database,
                "goal": data.goal,
                "target": data.target,
                "plan": [
                    f"Project: {data.siteType} using {data.framework}",
                    f"Styling: {data.styleSystem}",
                    f"Backend: {data.backend}",
                    f"Database: {data.database}",
                ],
                "group": data.group if data.group else None,
                "createdAt": datetime.utcnow().isoformat() + "Z",
            }
            PROJECTS.insert(0, project)
            return {"project": project}
        except Exception:
            raise


# ------------------ WEBSITE PRO: PROMPT GENERATOR (freemium) ------------------
@router.post("/website-pro/generate-prompts", response_model=WebsitePromptsResponse)
def generate_website_prompts(
    user_input: WebsiteProInput,
    db: Session = Depends(get_db),
    authorization: str = Header(None),
    x_user_plan: Optional[str] = Header(None, alias="X-User-Plan"),
):
    developer_type = _normalize_developer_type(user_input.developerType)
    # Discovery/clarifying questions removed per user request

    target = user_input.target or user_input.siteType or user_input.appType or "website"
    framework = user_input.framework
    style = user_input.styleSystem
    backend = user_input.backend
    database = user_input.database
    goal = user_input.goal
    # sanitize and normalize frequently noisy fields
    platform_target = _clean_text(user_input.platformTarget) or target
    # features may be a list; ensure strings and dedupe
    feature_list = [str(feature).strip() for feature in (user_input.features or []) if feature and str(feature).strip()]
    # dedupe preserving order
    seen_feats = []
    for f in feature_list:
        if f.lower() not in [s.lower() for s in seen_feats]:
            seen_feats.append(f)
    feature_block = ", ".join(seen_feats) if seen_feats else "No features selected"

    # compact noisy free-text fields
    sanitized_state_management = _dedupe_and_compact(_clean_text(user_input.stateManagement))
    sanitized_performance = _dedupe_and_compact(_clean_text(user_input.performanceOptimization))
    sanitized_integrations = _dedupe_and_compact(_clean_text(user_input.integrations))
    sanitized_project_structure = _dedupe_and_compact(_clean_text(user_input.projectStructure))
    sanitized_testing = _dedupe_and_compact(_clean_text(user_input.testingRequirements))
    sanitized_user_flow = _dedupe_and_compact(_clean_text(user_input.userFlow))
    sanitized_ui_focus = _dedupe_and_compact(_clean_text(user_input.uiFocus))
    sanitized_components_focus = _dedupe_and_compact(_clean_text(user_input.componentsFocus))
    sanitized_auth_type = _dedupe_and_compact(_clean_text(user_input.authType))

    shared_focus_lines = [
        f"- Features: {feature_block}",
        f"- User flow: {sanitized_user_flow or 'Not specified'}",
        f"- Platform target: {platform_target}",
        f"- UI complexity: {_clean_text(user_input.uiComplexity) or 'Not specified'}",
        f"- Project structure: {sanitized_project_structure or 'Not specified'}",
        f"- Testing requirements: {sanitized_testing or 'Not specified'}",
    ]

    frontend_focus_lines = [
        f"- State management: {sanitized_state_management or 'Not specified'}",
        f"- Performance / optimization: {sanitized_performance or 'Not specified'}",
        f"- UI focus: {sanitized_ui_focus or 'Not specified'}",
        f"- Components focus: {sanitized_components_focus or 'Not specified'}",
    ]

    backend_focus_lines = [
        f"- Auth type: {sanitized_auth_type or ('Required' if user_input.authenticationRequired else 'Optional')}",
        f"- API style: {_clean_text(user_input.apiStyle) or 'REST'}",
        f"- Integrations: {sanitized_integrations or 'Not specified'}",
        f"- Database: {database}",
        f"- Auth required: {'Yes' if user_input.authenticationRequired else 'No'}",
    ]

    focus_lines = _focus_lines(
        developer_type=developer_type,
        style_system=style,
        backend=backend,
        database=database,
        ui_focus=user_input.uiFocus,
        components_focus=user_input.componentsFocus,
        api_style=user_input.apiStyle,
        authentication_required=user_input.authenticationRequired,
    )

    developer_scope = {
        "frontend": "Focus on frontend implementation quality and UI/UX execution.",
        "backend": "Focus on backend logic, APIs, data integrity, and service reliability.",
        "full_stack": "Balance frontend UX and backend architecture as one cohesive system.",
    }[developer_type]

    role_priority_lines = {
        "frontend": [
            "- Prioritize polished UI, responsive layouts, accessibility, and component reuse.",
            "- Emphasize visual hierarchy, interaction states, and client-side state management.",
        ],
        "backend": [
            "- Prioritize API contracts, auth flows, database design, and service reliability.",
            "- Emphasize validation, error handling, observability, and integration boundaries.",
        ],
        "full_stack": [
            "- Prioritize end-to-end product flow from UI to API to database.",
            "- Emphasize cohesive architecture, shared contracts, and delivery sequencing.",
        ],
    }[developer_type]

    focus_block = "\n".join([f"- {line}" for line in focus_lines])
    # discovery sections intentionally omitted
    shared_focus_block = _join_nonempty(shared_focus_lines)
    frontend_focus_block = _join_nonempty(frontend_focus_lines)
    backend_focus_block = _join_nonempty(backend_focus_lines)
    role_priority_block = _join_nonempty(role_priority_lines)

    # BASIC
    basic = f"""
Create a simple {target} using {framework} for a {developer_type.replace('_', ' ')} developer workflow.
{developer_scope}
Use {style} for styling and connect with {backend} + {database} where relevant.
Target platform: {platform_target}.
Role priorities:
{role_priority_block}

Core product inputs:
{shared_focus_block}

Frontend focus:
{frontend_focus_block if developer_type in {'frontend', 'full_stack'} else 'Not applicable'}

Backend focus:
{backend_focus_block if developer_type in {'backend', 'full_stack'} else 'Not applicable'}

Goal: {goal}.

Priority focus:
    {focus_block}
"""

    # IMPROVED
    improved = f"""
You are a senior {developer_type.replace('_', ' ')} engineer. Build a structured {target} using {framework}.

Requirements:
- Clean component structure
- Include only the layers relevant to {developer_type.replace('_', ' ')} scope first
- Respect the requested platform target: {platform_target}
- Make the user flow explicit: {_clean_text(user_input.userFlow) or 'clarify before coding'}
- Use these focus constraints:
{focus_block}
{shared_focus_block}
{frontend_focus_block if developer_type in {'frontend', 'full_stack'} else ''}
{backend_focus_block if developer_type in {'backend', 'full_stack'} else ''}


Goal: {goal}
"""

    # ADVANCED
    advanced = f"""
Act as a full-stack developer.

Design a scalable {target} using {framework} with proper architecture for {developer_type.replace('_', ' ')} responsibilities.

Include:
- Modular folder structure
- Role-relevant implementation detail depth
- API design using {backend} when backend is in scope
- Database schema for {database} when data layer is in scope
- Error handling and validation
- Project structure preference: {_clean_text(user_input.projectStructure) or 'modular and maintainable'}
- Testing requirements: {_clean_text(user_input.testingRequirements) or 'unit and integration coverage'}
- Integrations: {_clean_text(user_input.integrations) or 'Not specified'}

Role-specific focus:
{focus_block}
{shared_focus_block}
{frontend_focus_block if developer_type in {'frontend', 'full_stack'} else ''}
{backend_focus_block if developer_type in {'backend', 'full_stack'} else ''}

Goal: {goal}
"""

    # EXPERT
    expert = f"""
You are a senior software architect.

Build a production-ready {target} using {framework}, optimized for {developer_type.replace('_', ' ')} ownership.

Include:
- Clean architecture (MVC or modular)
- Authentication system where required
- Optimized API layer using {backend} where in scope
- Scalable database design using {database} where in scope
- Performance optimization
- Security best practices
- Auth type: {_clean_text(user_input.authType) or 'Choose the most appropriate approach'}
- State management: {_clean_text(user_input.stateManagement) or 'Define per layer'}
- UI complexity level: {_clean_text(user_input.uiComplexity) or 'Moderate'}

Role-specific focus:
{focus_block}
{shared_focus_block}
{frontend_focus_block if developer_type in {'frontend', 'full_stack'} else ''}
{backend_focus_block if developer_type in {'backend', 'full_stack'} else ''}

Goal: {goal}
"""

    # PREMIUM
    premium = f"""
Act as a principal engineer.

Create a production-grade {target} using {framework} for a {developer_type.replace('_', ' ')} delivery track.

Deliver:
- Complete system design
- CI/CD pipeline (GitHub Actions)
- Deployment strategy (Docker + Cloud)
- Performance optimization (lazy loading, caching)
- Monitoring and logging
- Scalable backend using {backend} with {database} where backend scope applies
- Auth type: {_clean_text(user_input.authType) or 'Choose the most appropriate approach'}
- State management: {_clean_text(user_input.stateManagement) or 'Define per layer'}
- UI complexity level: {_clean_text(user_input.uiComplexity) or 'Moderate'}
- Platform target: {platform_target}

Role-specific focus:
{focus_block}
{shared_focus_block}
{frontend_focus_block if developer_type in {'frontend', 'full_stack'} else ''}
{backend_focus_block if developer_type in {'backend', 'full_stack'} else ''}


Goal: {goal}
"""

    prompts = [
        {"title": "Basic", "prompt": basic, "locked": False},
        {"title": "Improved", "prompt": improved, "locked": False},
        {"title": "Advanced", "prompt": advanced, "locked": True},
        {"title": "Expert", "prompt": expert, "locked": True},
        {"title": "Premium", "prompt": premium, "locked": True},
    ]

    # Decide whether input is noisy. If noisy, prefer sanitized template composition instead of model call.
    noise = _noise_score(user_input)
    logger.info(f"WebsitePro input noise score={noise} for user_input.projectId={user_input.projectId}")

    # sanitize some fields for logging and possible template use
    sanitized_for_log = {
        "userFlow": _dedupe_and_compact(_clean_text(user_input.userFlow)),
        "stateManagement": _dedupe_and_compact(_clean_text(user_input.stateManagement)),
        "integrations": _dedupe_and_compact(_clean_text(user_input.integrations)),
        "projectStructure": _dedupe_and_compact(_clean_text(user_input.projectStructure)),
    }
    logger.info("Original vs sanitized: %s", {"original_userFlow": _clean_text(user_input.userFlow), "sanitized_userFlow": sanitized_for_log["userFlow"]})

    if noise < 3:
        # attempt model-backed generation only for low-noise inputs
        try:
            from app.services.website_pro_prompt_service import generate_website_pro_prompts

            model_prompts = generate_website_pro_prompts(user_input, x_user_plan, bool(user_input.useModelOutput))
            if model_prompts:
                prompts = model_prompts
        except Exception as e:
            logger.warning("Website prompt service fallback to route templates: %s", e)
    else:
        logger.info("Using sanitized route templates due to high noise score; skipping model call.")

    session_id: Optional[int] = None
    user_id = _extract_user_id_from_auth_header(authorization)

    try:
        from app.models import PromptSession, PromptVersion

        session = PromptSession(
            user_id=user_id,
            project_id=user_input.projectId,
            input_payload=json.dumps(user_input.dict()),
        )
        db.add(session)
        db.commit()
        db.refresh(session)

        for item in prompts:
            version = PromptVersion(
                session_id=session.id,
                title=item["title"],
                prompt=item["prompt"],
                locked=bool(item.get("locked", False)),
                source="generated",
                is_selected=False,
            )
            db.add(version)
            db.flush()
            item["versionId"] = version.id

        db.commit()
        session_id = session.id
    except Exception as e:
        print("Website prompt persistence fallback (DB unavailable):", e)
        try:
            db.rollback()
        except Exception:
            pass

        session_id = _next_website_prompt_session_id()
        now_iso = datetime.utcnow().isoformat() + "Z"
        mem_versions = []
        for item in prompts:
            version_id = _next_website_prompt_version_id()
            item["versionId"] = version_id
            mem_versions.append(
                {
                    "id": version_id,
                    "title": item["title"],
                    "prompt": item["prompt"],
                    "locked": bool(item.get("locked", False)),
                    "source": "generated",
                    "basedOnVersionId": None,
                    "isSelected": False,
                    "createdAt": now_iso,
                }
            )

        WEBSITE_PROMPT_SESSIONS[session_id] = {
            "id": session_id,
            "userId": user_id,
            "projectId": user_input.projectId,
            "input": user_input.dict(),
            "selectedVersionId": None,
            "selectedTitle": None,
            "selectedPrompt": None,
            "createdAt": now_iso,
            "updatedAt": now_iso,
            "versions": mem_versions,
        }

    return {
        "sessionId": session_id,
        "developerType": developer_type,
        "questions": [],
        "prompts": prompts,
    }


@router.post("/website-pro/prompt-sessions/{session_id}/select")
def select_website_prompt_variant(
    session_id: int,
    payload: WebsitePromptSelectInput,
    db: Session = Depends(get_db),
):
    try:
        from app.models import PromptSession, PromptVersion

        session = db.query(PromptSession).filter(PromptSession.id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Prompt session not found")

        selected = db.query(PromptVersion).filter(
            PromptVersion.id == payload.versionId,
            PromptVersion.session_id == session_id,
        ).first()
        if not selected:
            raise HTTPException(status_code=404, detail="Prompt version not found in session")

        db.query(PromptVersion).filter(PromptVersion.session_id == session_id).update(
            {PromptVersion.is_selected: False},
            synchronize_session=False,
        )

        selected.is_selected = True
        session.selected_version_id = selected.id
        session.selected_title = selected.title
        session.selected_prompt = selected.prompt

        db.add(selected)
        db.add(session)
        db.commit()

        return {
            "sessionId": session.id,
            "selectedVersionId": selected.id,
            "selectedTitle": selected.title,
            "selectedPrompt": selected.prompt,
        }
    except HTTPException:
        raise
    except Exception:
        session = WEBSITE_PROMPT_SESSIONS.get(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Prompt session not found")

        versions = session.get("versions") or []
        selected = None
        for version in versions:
            version["isSelected"] = False
            if int(version.get("id") or 0) == payload.versionId:
                selected = version

        if not selected:
            raise HTTPException(status_code=404, detail="Prompt version not found in session")

        selected["isSelected"] = True
        session["selectedVersionId"] = selected["id"]
        session["selectedTitle"] = selected["title"]
        session["selectedPrompt"] = selected["prompt"]
        session["updatedAt"] = datetime.utcnow().isoformat() + "Z"

        return {
            "sessionId": session["id"],
            "selectedVersionId": selected["id"],
            "selectedTitle": selected["title"],
            "selectedPrompt": selected["prompt"],
        }


@router.post("/website-pro/prompt-sessions/{session_id}/edits")
def save_website_prompt_edit(
    session_id: int,
    payload: WebsitePromptEditInput,
    db: Session = Depends(get_db),
):
    if not payload.prompt or not payload.prompt.strip():
        raise HTTPException(status_code=400, detail="Edited prompt cannot be empty")

    try:
        from app.models import PromptSession, PromptVersion

        session = db.query(PromptSession).filter(PromptSession.id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Prompt session not found")

        base_version_id = payload.baseVersionId or session.selected_version_id
        base_version = None
        if base_version_id:
            base_version = db.query(PromptVersion).filter(
                PromptVersion.id == base_version_id,
                PromptVersion.session_id == session_id,
            ).first()

        derived_title = payload.title
        if not derived_title:
            if base_version and base_version.title:
                derived_title = f"{base_version.title} (Edited)"
            else:
                derived_title = "Edited"

        should_select = bool(payload.selectEdited)
        if should_select:
            db.query(PromptVersion).filter(PromptVersion.session_id == session_id).update(
                {PromptVersion.is_selected: False},
                synchronize_session=False,
            )

        edited = PromptVersion(
            session_id=session_id,
            title=derived_title,
            prompt=payload.prompt.strip(),
            locked=False,
            source="edited",
            based_on_version_id=base_version.id if base_version else None,
            is_selected=should_select,
        )
        db.add(edited)
        db.flush()

        if should_select:
            session.selected_version_id = edited.id
            session.selected_title = edited.title
            session.selected_prompt = edited.prompt
            db.add(session)

        db.commit()
        db.refresh(edited)

        return {
            "sessionId": session_id,
            "version": _serialize_prompt_version(edited),
            "selectedVersionId": edited.id if should_select else session.selected_version_id,
        }
    except HTTPException:
        raise
    except Exception:
        session = WEBSITE_PROMPT_SESSIONS.get(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Prompt session not found")

        base_version_id = payload.baseVersionId or session.get("selectedVersionId")
        base_version = None
        for version in session.get("versions") or []:
            if int(version.get("id") or 0) == int(base_version_id or 0):
                base_version = version
                break

        title = payload.title
        if not title:
            if base_version and base_version.get("title"):
                title = f"{base_version['title']} (Edited)"
            else:
                title = "Edited"

        should_select = bool(payload.selectEdited)
        if should_select:
            for version in session.get("versions") or []:
                version["isSelected"] = False

        now_iso = datetime.utcnow().isoformat() + "Z"
        new_version = {
            "id": _next_website_prompt_version_id(),
            "title": title,
            "prompt": payload.prompt.strip(),
            "locked": False,
            "source": "edited",
            "basedOnVersionId": base_version_id,
            "isSelected": should_select,
            "createdAt": now_iso,
        }
        session.setdefault("versions", []).append(new_version)

        if should_select:
            session["selectedVersionId"] = new_version["id"]
            session["selectedTitle"] = new_version["title"]
            session["selectedPrompt"] = new_version["prompt"]

        session["updatedAt"] = now_iso
        return {
            "sessionId": session_id,
            "version": new_version,
            "selectedVersionId": session.get("selectedVersionId"),
        }


@router.get("/website-pro/prompt-sessions")
def list_website_prompt_sessions(
    db: Session = Depends(get_db),
    authorization: str = Header(None),
    limit: int = 20,
):
    safe_limit = max(1, min(limit, 100))
    user_id = _extract_user_id_from_auth_header(authorization)

    try:
        from app.models import PromptSession, PromptVersion

        q = db.query(PromptSession)
        if user_id:
            q = q.filter(PromptSession.user_id == user_id)
        sessions = q.order_by(PromptSession.created_at.desc()).limit(safe_limit).all()

        out = []
        for session in sessions:
            versions = db.query(PromptVersion).filter(
                PromptVersion.session_id == session.id
            ).order_by(PromptVersion.created_at.asc()).all()
            out.append(
                {
                    "id": session.id,
                    "userId": session.user_id,
                    "projectId": session.project_id,
                    "selectedVersionId": session.selected_version_id,
                    "selectedTitle": session.selected_title,
                    "selectedPrompt": session.selected_prompt,
                    "createdAt": session.created_at.isoformat() + "Z" if session.created_at else None,
                    "updatedAt": session.updated_at.isoformat() + "Z" if session.updated_at else None,
                    "versions": [_serialize_prompt_version(v) for v in versions],
                }
            )

        return {"sessions": out}
    except Exception:
        sessions = list(WEBSITE_PROMPT_SESSIONS.values())
        if user_id:
            sessions = [s for s in sessions if s.get("userId") == user_id]
        sessions = sorted(sessions, key=lambda s: s.get("createdAt") or "", reverse=True)[:safe_limit]
        return {"sessions": sessions}


@router.get("/website-pro/prompt-sessions/{session_id}")
def get_website_prompt_session(session_id: int, db: Session = Depends(get_db)):
    try:
        from app.models import PromptSession, PromptVersion

        session = db.query(PromptSession).filter(PromptSession.id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Prompt session not found")

        versions = db.query(PromptVersion).filter(
            PromptVersion.session_id == session_id
        ).order_by(PromptVersion.created_at.asc()).all()

        return {
            "session": {
                "id": session.id,
                "userId": session.user_id,
                "projectId": session.project_id,
                "input": json.loads(session.input_payload) if session.input_payload else None,
                "selectedVersionId": session.selected_version_id,
                "selectedTitle": session.selected_title,
                "selectedPrompt": session.selected_prompt,
                "createdAt": session.created_at.isoformat() + "Z" if session.created_at else None,
                "updatedAt": session.updated_at.isoformat() + "Z" if session.updated_at else None,
                "versions": [_serialize_prompt_version(v) for v in versions],
            }
        }
    except HTTPException:
        raise
    except Exception:
        session = WEBSITE_PROMPT_SESSIONS.get(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Prompt session not found")
        return {"session": session}


# ---- Group management endpoints (lightweight) ----
@router.post("/groups")
def create_group(payload: dict, db: Session = Depends(get_db)):
    from app.models import Group
    import json as _json

    name = payload.get("name")
    members = payload.get("members") or []
    try:
        g = Group(name=name, members=_json.dumps(members))
        db.add(g)
        db.commit()
        db.refresh(g)
        return {"group": {"id": g.id, "name": g.name, "members": members}}
    except Exception:
        # fallback to in-memory representation
        grp = {"id": int(time.time() * 1000), "name": name, "members": members}
        PROJECTS.insert(0, {"group": grp})
        return {"group": grp}


@router.get("/groups")
def list_groups(db: Session = Depends(get_db)):
    from app.models import Group
    import json as _json
    out = []
    try:
        rows = db.query(Group).order_by(Group.created_at.desc()).all()
        for g in rows:
            try:
                members = _json.loads(g.members) if g.members else []
            except Exception:
                members = []
            out.append({"id": g.id, "name": g.name, "members": members})
        return {"groups": out}
    except Exception:
        return {"groups": []}


@router.post("/groups/{group_id}/members")
def add_group_member(group_id: int, payload: dict, db: Session = Depends(get_db)):
    from app.models import Group
    import json as _json
    email = payload.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="email required")
    try:
        g = db.query(Group).filter(Group.id == group_id).first()
        if not g:
            raise HTTPException(status_code=404, detail="group not found")
        members = []
        try:
            members = _json.loads(g.members) if g.members else []
        except Exception:
            members = []
        if email not in members:
            members.append(email)
            g.members = _json.dumps(members)
            db.add(g)
            db.commit()
            db.refresh(g)
        return {"group": {"id": g.id, "name": g.name, "members": members}}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="failed to add member")


@router.post("/groups/{group_id}/share")
def share_group_link(group_id: int, payload: dict = None, db: Session = Depends(get_db)):
    """Generate a persistent share token for the group.
    If payload contains `email`, attempt to email the invite (best-effort).
    """
    import secrets
    from app.models import InviteToken
    from app.services.email_service import send_invite_email

    token = secrets.token_urlsafe(16)
    expires = InviteToken.make_expiry(60 * 60 * 24)  # 24h
    email_to = None
    if isinstance(payload, dict):
        email_to = payload.get("email")

    it = InviteToken(token=token, group_id=group_id, email=email_to, expires_at=expires)
    try:
        db.add(it)
        db.commit()
        db.refresh(it)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="failed to create invite token")

    link = f"/invites/accept?token={token}"
    # best-effort email (enqueue)
    if email_to:
        subj = "You're invited to join a project group"
        body = f"You were invited to join group {group_id}. Accept here: {link}\nToken: {token}"
        try:
            from app.services.email_service import enqueue_email
            enqueue_email(email_to, subj, body)
        except Exception:
            # fall back to direct send (rare)
            try:
                from app.services.email_service import send_invite_email
                send_invite_email(email_to, subj, body)
            except Exception:
                pass

    return {"share_token": token, "link": link}


@router.post("/invites/accept")
def accept_invite(payload: dict, db: Session = Depends(get_db)):
    token = payload.get("token")
    email = payload.get("email")
    if not token or not email:
        raise HTTPException(status_code=400, detail="token and email required")

    from app.models import InviteToken, Group
    import json as _json
    now = datetime.utcnow()

    it = db.query(InviteToken).filter(InviteToken.token == token, InviteToken.used == False).first()
    if not it:
        raise HTTPException(status_code=404, detail="invalid or expired token")
    if it.expires_at:
        exp = it.expires_at
        try:
            # normalize timezone-aware timestamps to naive UTC for comparison
            if getattr(exp, "tzinfo", None) is not None:
                exp = exp.astimezone().replace(tzinfo=None)
        except Exception:
            try:
                exp = exp.replace(tzinfo=None)
            except Exception:
                pass
        if exp < now:
            raise HTTPException(status_code=410, detail="token expired")

    group_id = it.group_id
    g = db.query(Group).filter(Group.id == group_id).first()
    if not g:
        raise HTTPException(status_code=404, detail="group not found")

    members = []
    try:
        members = _json.loads(g.members) if g.members else []
    except Exception:
        members = []
    if email not in members:
        members.append(email)
        g.members = _json.dumps(members)
        db.add(g)

    # mark token used
    try:
        it.used = True
        db.add(it)
        db.commit()
        db.refresh(g)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="failed to accept invite")

    return {"group": {"id": g.id, "name": g.name, "members": members}}


@router.delete("/groups/{group_id}/members")
def remove_group_member(group_id: int, payload: dict, db: Session = Depends(get_db)):
    from app.models import Group
    import json as _json
    email = payload.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="email required")
    try:
        g = db.query(Group).filter(Group.id == group_id).first()
        if not g:
            raise HTTPException(status_code=404, detail="group not found")
        members = []
        try:
            members = _json.loads(g.members) if g.members else []
        except Exception:
            members = []
        if email in members:
            members = [m for m in members if m != email]
            g.members = _json.dumps(members)
            db.add(g)
            db.commit()
            db.refresh(g)
        return {"group": {"id": g.id, "name": g.name, "members": members}}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="failed to remove member")


# ------------------ ANALYTICS (DB-powered endpoints) ------------------
@router.get("/analytics/summary")
def analytics_summary(db: Session = Depends(get_db), window: Optional[str] = None):
    """Return analytics computed from DB where possible; fall back to sensible defaults."""
    try:
        from app.models.generated_prompts import GeneratedPrompt
        from app.models.chat import Chat
        from app.models.user import User

        now = datetime.utcnow()

        # Interpret optional `window` query param (examples: '24h', '7d', '30d', '90d')
        # If provided, compute counts for that window and compare to previous same-sized window.
        if window:
            try:
                if window.endswith('h'):
                    hours = int(window[:-1])
                    last_30 = now - timedelta(hours=hours)
                    prev_30_start = now - timedelta(hours=hours*2)
                    prev_30_end = last_30
                elif window.endswith('d'):
                    days = int(window[:-1])
                    last_30 = now - timedelta(days=days)
                    prev_30_start = now - timedelta(days=days*2)
                    prev_30_end = last_30
                else:
                    # fallback to treating numeric value as days
                    days = int(window)
                    last_30 = now - timedelta(days=days)
                    prev_30_start = now - timedelta(days=days*2)
                    prev_30_end = last_30
            except Exception:
                # if malformed, fall back to 30-day window
                last_30 = now - timedelta(days=30)
                prev_30_start = now - timedelta(days=60)
                prev_30_end = last_30
        else:
            last_30 = now - timedelta(days=30)
            prev_30_start = now - timedelta(days=60)
            prev_30_end = last_30

        # Use raw SQL for counts to avoid potential ORM edge-cases
        try:
            r = db.execute(text("SELECT COUNT(*) FROM generated_prompts")).fetchone()
            total_prompts = int(r[0]) if r and r[0] is not None else 0
        except Exception:
            total_prompts = 0

        # runs in selected window = generated prompts in last_30 window
        try:
            r = db.execute(text("SELECT COUNT(*) FROM generated_prompts WHERE created_at >= :ts"), {"ts": last_30}).fetchone()
            monthly_runs = int(r[0]) if r and r[0] is not None else 0
        except Exception:
            monthly_runs = 0

        # previous 30-day window for growth calc
        try:
            r = db.execute(text("SELECT COUNT(*) FROM generated_prompts WHERE created_at >= :start AND created_at < :end"), {"start": prev_30_start, "end": prev_30_end}).fetchone()
            prev_runs = int(r[0]) if r and r[0] is not None else 0
        except Exception:
            prev_runs = 0
        run_growth = "0%"
        try:
            if prev_runs == 0 and monthly_runs > 0:
                run_growth = "+100%"
            elif prev_runs == 0:
                run_growth = "0%"
            else:
                run_growth = f"{((monthly_runs - prev_runs) / max(prev_runs,1) * 100):+.1f}%"
        except Exception:
            run_growth = "0%"

        # active users: distinct user ids seen in chats in the last 30 days
        try:
            active_users = db.query(Chat.user_id).filter(Chat.created_at >= last_30).distinct().count()
        except Exception:
            # fall back to counting users table
            active_users = db.query(User).count()

        # avg response time: not instrumented; return N/A unless there is a prompt_scores table we can sample
        avg_response_time = "N/A"

        retention = "N/A"

        print('DEBUG analytics: total_prompts=', total_prompts, 'monthly_runs=', monthly_runs, 'prev_runs=', prev_runs)
        return {
            "totalPrompts": total_prompts,
            "activeUsers": active_users,
            "avgResponseTime": avg_response_time,
            "monthlyRuns": monthly_runs,
            "runGrowth": run_growth,
            "retention": retention,
        }
    except Exception:
        # safe fallback
        return {
            "totalPrompts": 0,
            "activeUsers": 0,
            "avgResponseTime": "N/A",
            "monthlyRuns": 0,
            "runGrowth": "0%",
            "retention": "N/A",
        }


@router.get("/analytics/activity")
def analytics_activity(db: Session = Depends(get_db)):
    """Return a recent activity feed derived from latest generated prompts and chats."""
    try:
        from app.models.generated_prompts import GeneratedPrompt
        from app.models.chat import Chat

        out = []
        # recent generated prompts
        try:
            rows = db.query(GeneratedPrompt).order_by(GeneratedPrompt.created_at.desc()).limit(5).all()
            for r in rows:
                user_label = str(r.user_id) if r.user_id else "guest"
                out.append(f"Prompt created by {user_label}: { (r.final_prompt or '').strip()[:80] }")
        except Exception:
            pass

        # if not enough items, include latest chats
        if len(out) < 5:
            try:
                chats = db.query(Chat).order_by(Chat.created_at.desc()).limit(5).all()
                for c in chats:
                    out.append(f"Chat by {c.user_id or 'guest'}: { (c.prompt or '').strip()[:80] }")
            except Exception:
                pass

        if not out:
            out = [
                "No recent activity available",
            ]

        return {"activity": out[:5]}
    except Exception:
        return {"activity": ["No recent activity available"]}