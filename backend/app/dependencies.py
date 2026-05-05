from fastapi import Header, HTTPException
from sqlalchemy.orm import Session
from jose import jwt

from app.database import SessionLocal
from app.services.auth_service import ALGORITHM, SECRET_KEY, verify_token



# ------------------ DATABASE DEPENDENCY ------------------

def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ------------------ ADMIN AUTH ------------------

def get_current_admin(authorization: str = Header(None, alias="Authorization")):
    print("STEP 1 - Header:", authorization)

    if not authorization:
        raise HTTPException(status_code=401, detail="Missing header")

    try:
        parts = authorization.split(" ")

        if len(parts) != 2 or parts[0] != "Bearer":
            raise HTTPException(status_code=401, detail="Invalid header format")

        token = parts[1]
        print("STEP 2 - Token extracted")

        # ✅ Use your existing auth service
        payload = verify_token(token)
        print("STEP 3 - Payload:", payload)

        if payload.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Not admin")

        print("STEP 4 - Admin verified")
        return payload

    except Exception as e:
        print("JWT ERROR:", e)
        raise HTTPException(status_code=401, detail="Invalid token")