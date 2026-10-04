"""Face enrollment orchestration: image -> embedding -> store.

Server-side, admin-gated operation. The embedding is generated with the
pretrained model and written to `students.face_embedding` via the service-role
key. Embeddings are never returned to callers.
"""

from __future__ import annotations

import numpy as np

from app.services.face_service import FaceStateError, face_service
from app.utils import supabase


class UnknownStudentError(Exception):
    pass


class FaceServiceUnavailableError(Exception):
    pass


def enroll_student(student_id: str, image_base64: str) -> dict:
    """Generate an embedding for a student's face photo and store it.

    Returns:
        {"student_id": str, "confidence": float}

    Raises:
        FaceStateError (NO_FACE/MULTIPLE_FACES/FACE_TOO_SMALL/
        LOW_IMAGE_QUALITY/MODEL_UNAVAILABLE), UnknownStudentError, or
        FaceServiceUnavailableError.
    """
    if not face_service.available:
        raise FaceServiceUnavailableError("Face recognition model is not available.")

    image = face_service.decode_image(image_base64)
    embedding, metadata = face_service.embed(image)

    client = supabase.get_client()
    found = (
        client.table("students")
        .select("student_id")
        .eq("student_id", student_id)
        .limit(1)
        .execute()
    )
    if not found.data:
        raise UnknownStudentError(
            f"No student found with ID '{student_id}'; nothing enrolled."
        )

    embedding_bytes = embedding.astype(np.float32).tobytes()
    # face_embedding is BYTEA; PostgREST expects hex "\\x..." literals for
    # bytea columns (base64 strings are stored as their literal characters).
    embedding_hex = "\\x" + embedding_bytes.hex()

    client.table("students").update({"face_embedding": embedding_hex}).eq(
        "student_id", student_id
    ).execute()

    return {"student_id": student_id, "confidence": metadata["confidence"]}