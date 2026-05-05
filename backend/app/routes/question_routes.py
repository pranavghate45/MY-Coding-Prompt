from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models.requirements import Requirement
from app.services.question_service import generate_questions, save_questions

router = APIRouter(prefix="/questions", tags=["Questions"])


@router.post("/generate/{requirement_id}")
def generate_questions_for_requirement(
    requirement_id: int,
    developer_type: str = "full_stack",
    db: Session = Depends(get_db),
):

    requirement = db.query(Requirement).filter(
        Requirement.id == requirement_id
    ).first()

    if not requirement:
        return {"error": "Requirement not found"}

    questions = generate_questions(requirement.requirement_text, developer_type=developer_type)

    saved_questions = save_questions(db, requirement_id, questions)

    return {
        "message": "Questions generated successfully",
        "questions": [q.question_text for q in saved_questions]
    }