from app.models.question import Question


def generate_questions(requirement_text, developer_type: str = "full_stack"):
    developer_type = (developer_type or "full_stack").strip().lower()
    if developer_type not in {"frontend", "backend", "full_stack"}:
        developer_type = "full_stack"

    if developer_type == "frontend":
        return [
            "Which key UI screens and user journeys should be prioritized first?",
            "What design system and styling approach should be used for consistency?",
            "Which reusable components are required and what data should each receive?",
            "What frontend state/data fetching strategy should be used?",
            "What accessibility and responsive behavior must be implemented?",
        ]

    if developer_type == "backend":
        return [
            "Which API endpoints and business operations are required for MVP?",
            "What database schema and constraints are needed?",
            "How should authentication and authorization be handled?",
            "What validation, error handling, and logging should be added?",
            "What scalability and performance constraints should guide the backend design?",
        ]

    return [
        "What is the main objective of this requirement?",
        "Which frontend screens/components and backend APIs are essential first?",
        "What technologies or frameworks should be used for each layer?",
        "Are there any performance or scalability requirements across client and server?",
        "Should the system support authentication or user roles?",
    ]


def save_questions(db, requirement_id, questions):

    saved_questions = []

    for index, q in enumerate(questions, start=1):

        question = Question(
            requirement_id=requirement_id,
            question_text=q,
            question_order=index
        )

        db.add(question)
        saved_questions.append(question)

    db.commit()

    return saved_questions