from fastapi import APIRouter
from app.database import SessionLocal
from app.models.user import User

router = APIRouter()

@router.get("/users")
def get_users():

    db = SessionLocal()
    users = db.query(User).all()

    return users