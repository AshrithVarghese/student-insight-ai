"""Identify orchestration: image -> embedding -> similarity match.

Separates business logic from route handlers (PLAN.md rule 9).
"""

from __future__ import annotations

import logging

import numpy as np

from app.config import settings
from app.services.face_service import FaceStateError, face_service
from app.utils import supabase

logger = logging.getLogger(__name__)


class UnknownFaceError(Exception):
    pass


class FaceServiceUnavailableError(Exception):
    pass


def identify_student(image_base64: str) -> dict:
    """Identify a student from a base64 image.

    Returns:
        {"student": {"student_id", "name"}, "confidence": float, "simulated": bool}

    Raises:
        FaceStateError with discriminant (NO_FACE/MULTIPLE_FACES/FACE_TOO_SMALL/
        LOW_IMAGE_QUALITY/MODEL_UNAVAILABLE), UnknownFaceError, or
        FaceServiceUnavailableError.
    """
    image = face_service.decode_image(image_base64)

    if not face_service.available:
        if face_service.simulation_enabled:
            return _simulated_identify()
        raise FaceServiceUnavailableError("Face recognition model is not available.")

    embedding, metadata = face_service.embed(image)

    registered = supabase.fetch_registered_embeddings()
    if not registered:
        raise UnknownFaceError("No registered faces are available for matching.")

    best_similarity = -1.0
    best = None
    for entry in registered:
        sim = face_service._cosine_similarity(embedding, entry["embedding"])
        if sim > best_similarity:
            best_similarity = sim
            best = entry

    if best is None or best_similarity < settings.face_match_threshold:
        raise UnknownFaceError("Face does not match any registered student.")

    detection_confidence = metadata.get("confidence", 0.5)
    combined = _combine_confidence(best_similarity, detection_confidence)

    return {
        "student": {"student_id": best["student_id"], "name": best["name"]},
        "confidence": combined,
        "simulated": False,
    }


def _simulated_identify() -> dict:
    """Dev-only simulation match. Responses are explicitly flagged simulated."""
    student_id = settings.face_simulation_student_id
    name = supabase.fetch_student_name(student_id)
    if not name:
        raise FaceServiceUnavailableError(
            f"Simulation student '{student_id}' not found in Supabase."
        )
    return {
        "student": {"student_id": student_id, "name": name},
        "confidence": 0.94,
        "simulated": True,
    }


def _combine_confidence(match_similarity: float, detection_confidence: float) -> float:
    # Similarity normalized to [0,1]; average with the model detection score.
    combined = (max(0.0, min(1.0, match_similarity)) + detection_confidence) / 2.0
    return round(max(0.0, min(1.0, combined)), 4)


def check_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Exposed for tests without needing the full pipeline."""
    return face_service._cosine_similarity(a, b)