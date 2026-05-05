from datetime import datetime
import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.onboarding_profile import OnboardingProfile


router = APIRouter(prefix="/api/onboarding", tags=["Onboarding"])


class OnboardingSaveInput(BaseModel):
    email: str
    plan_tier: str
    assistant_type: str
    answers: list[str]
    generated_plan: Optional[str] = None


@router.get("/{email}")
def get_onboarding_profile(email: str, db: Session = Depends(get_db)):
    profile = db.query(OnboardingProfile).filter(OnboardingProfile.user_email == email).first()
    if not profile:
        return {"found": False, "profile": None}

    try:
        answers = json.loads(profile.answers_json) if profile.answers_json else []
        if not isinstance(answers, list):
            answers = []
    except Exception:
        answers = []

    return {
        "found": True,
        "profile": {
            "email": profile.user_email,
            "plan_tier": profile.plan_tier,
            "assistant_type": profile.assistant_type,
            "answers": answers,
            "generated_plan": profile.generated_plan,
            "updated_at": profile.updated_at.isoformat() if profile.updated_at else None,
        },
    }


@router.post("/save")
def save_onboarding_profile(payload: OnboardingSaveInput, db: Session = Depends(get_db)):
    tier = (payload.plan_tier or "pro").strip().lower()
    assistant = (payload.assistant_type or "coding").strip().lower()

    if tier not in {"pro", "elite"}:
        raise HTTPException(status_code=400, detail="plan_tier must be 'pro' or 'elite'")
    if assistant not in {"coding", "marketing", "sales"}:
        raise HTTPException(status_code=400, detail="assistant_type must be coding/marketing/sales")

    profile = db.query(OnboardingProfile).filter(OnboardingProfile.user_email == payload.email).first()
    if not profile:
        profile = OnboardingProfile(user_email=payload.email)

    profile.plan_tier = tier
    profile.assistant_type = assistant
    profile.answers_json = json.dumps(payload.answers or [])
    profile.generated_plan = payload.generated_plan
    profile.updated_at = datetime.utcnow()

    db.add(profile)
    db.commit()

    return {"ok": True}