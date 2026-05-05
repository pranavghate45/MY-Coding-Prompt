from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.dependencies import get_current_admin, get_db
from app.models.user import User
from fastapi import Request
from pydantic import BaseModel
import os

router = APIRouter()


# ------------------ USERS ------------------

@router.get("/users")
def get_users(db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    users = db.query(User).all()
    return users


# ------------------ CHATS ------------------

@router.get("/chats")
def get_chats(admin=Depends(get_current_admin)):
    print("✅ ADMIN CHATS HIT")
    return {"message": "All chats"}


# ------------------ DELETE USER ------------------

@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(user)
    db.commit()

    return {"message": "User deleted"}


# ------------------ DEV: Set OpenAI Key ------------------


class SetKeyInput(BaseModel):
    openai_key: str


@router.post("/set-openai-key")
def set_openai_key(data: SetKeyInput, request: Request):
    # Dev-only: only accept requests from localhost to avoid remote abuse
    client_host = request.client.host if request.client else None
    if client_host not in ("127.0.0.1", "::1", "localhost"):
        raise HTTPException(status_code=403, detail="Forbidden")

    env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.env"))
    try:
        # read existing .env if present
        existing = ""
        if os.path.exists(env_path):
            with open(env_path, "r", encoding="utf-8") as f:
                existing = f.read()

        lines = []
        replaced = False
        if existing:
            for line in existing.splitlines():
                if line.strip().startswith("OPENAI_API_KEY="):
                    lines.append(f"OPENAI_API_KEY={data.openai_key}")
                    replaced = True
                else:
                    lines.append(line)

        if not replaced:
            lines.append(f"OPENAI_API_KEY={data.openai_key}")

        with open(env_path, "w", encoding="utf-8") as f:
            f.write("\n".join(lines) + "\n")

        return {"message": "OPENAI_API_KEY updated", "path": env_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))