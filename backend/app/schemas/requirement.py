from pydantic import BaseModel

class RequirementCreate(BaseModel):
    user_id: int
    category_id: int
    requirement_text: str