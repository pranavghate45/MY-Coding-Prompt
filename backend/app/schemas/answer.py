from pydantic import BaseModel
from typing import List


class AnswerItem(BaseModel):
    question_id: int
    answer_text: str


class AnswerSubmission(BaseModel):
    requirement_id: int
    user_id: int
    answers: List[AnswerItem]