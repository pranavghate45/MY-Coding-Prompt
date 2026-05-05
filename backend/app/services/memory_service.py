from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.nlp_learning import NLPLearning
from app.services.nlp_service import best_similarity_match


def find_similar_interaction(
    user_id: str,
    query_embedding: List[float],
    threshold: float = 0.7,
    limit: int = 500,
) -> Optional[Dict[str, Any]]:
    if not query_embedding:
        return None

    db: Session = SessionLocal()
    try:
        # Fetch recent records for this user
        records = db.query(NLPLearning).filter(
            NLPLearning.user_id == user_id,
            NLPLearning.embedding.isnot(None)
        ).order_by(NLPLearning.created_at.desc()).limit(limit).all()

        if not records:
            return None

        # Convert SQLAlchemy models to dicts for similarity matching
        record_dicts = [
            {
                "id": r.id,
                "embedding": r.embedding,
                "output_text": r.output_text,
                "input_text": r.input_text,
            }
            for r in records
        ]

        best_record, best_score = best_similarity_match(query_embedding, record_dicts)
        if best_record is None or best_score < threshold:
            return None

        return {
            "record_id": str(best_record.get("id")),
            "output_text": best_record.get("output_text"),
            "input_text": best_record.get("input_text"),
            "similarity": float(best_score),
        }
    finally:
        db.close()


def store_interaction(
    user_id: str,
    input_text: str,
    output_text: str,
    embedding: List[float],
    source: str,
    feedback: Optional[str] = None,
    similarity: Optional[float] = None,
    matched_record_id: Optional[Any] = None,
) -> Optional[int]:
    db: Session = SessionLocal()
    try:
        parsed_matched_record_id: Optional[int] = None
        if matched_record_id is not None:
            try:
                parsed_matched_record_id = int(matched_record_id)
            except (TypeError, ValueError):
                parsed_matched_record_id = None

        learning_record = NLPLearning(
            user_id=user_id,
            input_text=input_text,
            output_text=output_text,
            embedding=embedding,
            source=source,
            similarity_score=similarity if similarity is not None else None,
            matched_record_id=parsed_matched_record_id,
            feedback=feedback if feedback in {"like", "dislike"} else None,
            created_at=datetime.now(timezone.utc),
        )
        db.add(learning_record)
        db.commit()
        db.refresh(learning_record)
        return learning_record.id
    finally:
        db.close()


def set_feedback(
    user_id: str,
    feedback: str,
    record_id: Optional[Any] = None,
    input_text: Optional[str] = None,
) -> bool:
    if feedback not in {"like", "dislike"}:
        return False

    db: Session = SessionLocal()
    try:
        query = db.query(NLPLearning).filter(NLPLearning.user_id == user_id)

        if record_id:
            try:
                parsed_record_id = int(record_id)
            except (TypeError, ValueError):
                return False
            query = query.filter(NLPLearning.id == parsed_record_id)
        elif input_text:
            query = query.filter(NLPLearning.input_text == input_text).order_by(NLPLearning.created_at.desc())

        record = query.first()
        if not record:
            return False

        record.feedback = feedback
        db.commit()
        return True
    finally:
        db.close()
