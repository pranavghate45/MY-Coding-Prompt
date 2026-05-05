from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.dependencies import get_db
from app.models.question import Question
from pydantic import BaseModel
from typing import Optional, List
from app.services.ai_service import generate_response
from app.database import get_db
from sqlalchemy.orm import Session
from app.models.chat import Chat
import json

router = APIRouter()

@router.get("/chat/{requirement_id}")
def get_chat_history(requirement_id: int, db: Session = Depends(get_db)):

    questions = db.query(Question).filter(
        Question.requirement_id == requirement_id
    ).all()

    messages = []

    for q in questions:
        messages.append({
            "role": "assistant",
            "content": q.question_text
        })

    return messages


class Attachment(BaseModel):
    name: str
    content: Optional[str] = None
    mime: Optional[str] = None
    is_drive: Optional[bool] = False


class ChatRequest(BaseModel):
    message: str
    model: Optional[str] = None
    attachments: Optional[List[Attachment]] = None
    new_chat: Optional[bool] = False
    user_id: Optional[str] = None


@router.post("/chat")
def chat(req: ChatRequest):
    try:
        user_id = req.user_id.strip() if isinstance(req.user_id, str) and req.user_id.strip() else "guest"

        similarity = None
        source = "generated"
        result = None
        query_embedding: List[float] = []

        try:
            import os
            from app.services.nlp_service import generate_embedding
            from app.services.memory_service import find_similar_interaction

            query_embedding = generate_embedding(req.message)
            match = find_similar_interaction(
                user_id=user_id,
                query_embedding=query_embedding,
                threshold=float(os.getenv("NLP_SIMILARITY_THRESHOLD", "0.7")),
            )

            if match and match.get("output_text"):
                assistant_text = str(match.get("output_text"))
                source = "learned"
                similarity = float(match.get("similarity")) if match.get("similarity") is not None else None
                result = {"provider": "learned", "response": assistant_text}

                try:
                    from app.services.memory_service import store_interaction

                    store_interaction(
                        user_id=user_id,
                        input_text=req.message,
                        output_text=assistant_text,
                        embedding=query_embedding,
                        source="learned",
                        similarity=similarity,
                        matched_record_id=match.get("record_id"),
                    )
                except Exception:
                    pass
            else:
                result = generate_response(req.message, attachments=req.attachments)
                assistant_text = result.get("response")
        except Exception:
            result = generate_response(req.message, attachments=req.attachments)
            assistant_text = result.get("response")

        if source == "generated":
            try:
                from app.services.memory_service import store_interaction

                store_interaction(
                    user_id=user_id,
                    input_text=req.message,
                    output_text=assistant_text,
                    embedding=query_embedding,
                    source="generated",
                )
            except Exception:
                pass

        # persist chat thread locally (append to latest thread unless new_chat requested)
        try:
            db: Session = next(get_db())

            if req.new_chat:
                # create a new chat thread
                messages = [
                    {"role": "user", "content": req.message, "ts": None},
                    {"role": "assistant", "content": assistant_text, "ts": None},
                ]
                chat = Chat(user_id=user_id, prompt=req.message, response=assistant_text, messages=json.dumps(messages))
                db.add(chat)
                db.commit()
            else:
                # try to find the latest chat for this user and append to it
                latest = db.query(Chat).filter(Chat.user_id == user_id).order_by(Chat.created_at.desc()).first()
                if latest and latest.messages:
                    try:
                        msgs = json.loads(latest.messages)
                        msgs.append({"role": "user", "content": req.message, "ts": None})
                        msgs.append({"role": "assistant", "content": assistant_text, "ts": None})
                    except Exception:
                        msgs = [{"role": "user", "content": req.message, "ts": None}, {"role": "assistant", "content": assistant_text, "ts": None}]
                    latest.messages = json.dumps(msgs)
                    latest.response = assistant_text
                    db.add(latest)
                    db.commit()
                else:
                    # no existing thread — create one
                    messages = [
                        {"role": "user", "content": req.message, "ts": None},
                        {"role": "assistant", "content": assistant_text, "ts": None},
                    ]
                    chat = Chat(user_id=user_id, prompt=req.message, response=assistant_text, messages=json.dumps(messages))
                    db.add(chat)
                    db.commit()
        except Exception:
            # ignore persistence errors in this lightweight route
            pass

        response_payload = {"reply": assistant_text, "provider": result.get("provider"), "source": source}
        if similarity is not None:
            response_payload["similarity"] = similarity
        return response_payload
    except Exception as e:
        return {"error": str(e)}