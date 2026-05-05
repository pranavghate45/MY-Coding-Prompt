from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User
from app.services.auth_service import (
    create_token,
    hash_password,
    verify_password,
    is_password_hashed,
)

router = APIRouter(tags=["Auth"])


# ------------------ SCHEMAS ------------------

class SignupInput(BaseModel):
    name: str
    email: str
    password: str
    developer_type: str = "full_stack"


class LoginInput(BaseModel):
    email: str
    password: str


# ------------------ SIGNUP ------------------

@router.post("/signup")
def signup(data: SignupInput, db: Session = Depends(get_db)):
    developer_type = (data.developer_type or "full_stack").strip().lower()
    if developer_type not in {"frontend", "backend", "full_stack"}:
        raise HTTPException(status_code=400, detail="Invalid developer_type")

    existing = db.query(User).filter(User.email == data.email).first()

    if existing:
        raise HTTPException(status_code=400, detail="User already exists")

    user = User(
        name=data.name,
        email=data.email,
        password=hash_password(data.password),
        plan="free",
        plan_tier="free",
        role="user",   # ✅ NEW
        developer_type=developer_type,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "plan": user.plan,
        "plan_tier": getattr(user, "plan_tier", "free"),
        "role": user.role,   # ✅ NEW
        "developer_type": getattr(user, "developer_type", "full_stack"),
    }


# ------------------ LOGIN ------------------

@router.post("/login")
def login(data: LoginInput, db: Session = Depends(get_db)):

    email = data.email.strip().lower()
    password = data.password.strip()

    user = db.query(User).filter(User.email == email).first()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    password_ok = verify_password(password, user.password)

    # One-time migration path for legacy plaintext records.
    if not password_ok and user.password == password and not is_password_hashed(user.password):
        user.password = hash_password(password)
        db.add(user)
        db.commit()
        db.refresh(user)
        password_ok = True

    if not password_ok:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_token({
        "user_id": user.id,
        "email": user.email,
        "role": user.role,
        "developer_type": getattr(user, "developer_type", "full_stack"),
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "plan": user.plan,
            "plan_tier": getattr(user, "plan_tier", "free"),
            "role": user.role,
            "developer_type": getattr(user, "developer_type", "full_stack"),
        }
    }