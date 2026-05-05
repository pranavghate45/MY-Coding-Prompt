import os
from functools import lru_cache
from typing import Any, Iterable, List, Optional, Sequence, Tuple


@lru_cache(maxsize=1)
def _get_model() -> Any:
    from sentence_transformers import SentenceTransformer

    model_name = os.getenv("SENTENCE_TRANSFORMER_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
    return SentenceTransformer(model_name)


def generate_embedding(text: str) -> List[float]:
    if not isinstance(text, str) or not text.strip():
        return []

    model = _get_model()
    vector = model.encode(text, convert_to_numpy=True)
    return vector.astype("float32").tolist()


def cosine_similarity(vec_a: Sequence[float], vec_b: Sequence[float]) -> float:
    if not vec_a or not vec_b:
        return 0.0

    if len(vec_a) != len(vec_b):
        return 0.0

    dot = 0.0
    norm_a = 0.0
    norm_b = 0.0

    for a, b in zip(vec_a, vec_b):
        af = float(a)
        bf = float(b)
        dot += af * bf
        norm_a += af * af
        norm_b += bf * bf

    if norm_a <= 0.0 or norm_b <= 0.0:
        return 0.0

    return dot / ((norm_a ** 0.5) * (norm_b ** 0.5))


def best_similarity_match(
    query_embedding: Sequence[float],
    records: Iterable[dict],
) -> Tuple[Optional[dict], float]:
    best_record: Optional[dict] = None
    best_score = -1.0

    for record in records:
        emb = record.get("embedding") if isinstance(record, dict) else None
        if not isinstance(emb, list) or not emb:
            continue

        score = cosine_similarity(query_embedding, emb)
        if score > best_score:
            best_record = record
            best_score = score

    if best_record is None:
        return None, 0.0

    return best_record, max(best_score, 0.0)
