from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models.answers import Answer
from app.models.requirements import Requirement
from app.models.generated_prompts import GeneratedPrompt

from app.schemas.answer import AnswerSubmission
from app.services.prompt_service import build_prompt
from app.services.ai_service import generate_response

router = APIRouter(prefix="/answers", tags=["Answers"])


@router.post("/")
def submit_answers(data: AnswerSubmission, db: Session = Depends(get_db)):

    # Save answers
    for a in data.answers:

        answer = Answer(
            question_id=a.question_id,
            answer_text=a.answer_text
        )

        db.add(answer)

    db.commit()

    requirement = db.query(Requirement).filter(
        Requirement.id == data.requirement_id
    ).first()

    # Build structured prompt
    final_prompt = build_prompt(
        requirement.requirement_text,
        data.answers
    )

    # Send prompt to AI
    ai_result = generate_response(final_prompt)
    ai_response = ai_result.get("response", "")

    # Save prompt + response
    generated_prompt = GeneratedPrompt(
        user_id=data.user_id,
        requirement_id=data.requirement_id,
        final_prompt=final_prompt,
        ai_response=ai_response
    )

    db.add(generated_prompt)
    db.commit()

    return {
        "prompt": final_prompt,
        "ai_response": ai_response
    }