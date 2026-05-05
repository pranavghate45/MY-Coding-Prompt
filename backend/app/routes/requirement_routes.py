from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models.requirements import Requirement
from app.schemas.requirement import RequirementCreate
from app.services.question_service import generate_questions, save_questions

router = APIRouter(prefix="/requirements", tags=["Requirements"])


@router.post("/")
def create_requirement(req: RequirementCreate, db: Session = Depends(get_db)):

    # Save requirement
    new_requirement = Requirement(
        user_id=req.user_id,
        category_id=req.category_id,
        requirement_text=req.requirement_text
    )

    db.add(new_requirement)
    db.commit()
    db.refresh(new_requirement)

    # Generate questions
    questions = generate_questions(req.requirement_text)

    # Save questions
    saved_questions = save_questions(db, new_requirement.id, questions)

    return {
        "requirement_id": new_requirement.id,
        "questions": [q.question_text for q in saved_questions]
    }
