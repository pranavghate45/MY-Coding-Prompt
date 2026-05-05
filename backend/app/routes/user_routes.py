from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.dependencies import get_db
from app.models.user import User

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/{user_id}/plan")
def get_user_plan(user_id: int, db: Session = Depends(get_db)):

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        return {"plan": "free", "developer_type": "full_stack"}

    return {
        "plan": user.plan,
        "developer_type": getattr(user, "developer_type", "full_stack"),
    }


@router.get("/{user_id}/profile")
def get_user_profile(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return {"developer_type": "full_stack"}

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "plan": user.plan,
        "developer_type": getattr(user, "developer_type", "full_stack"),
    }