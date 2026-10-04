"""Face enrollment script (admin runs this server-side).

Usage:
    python -m training.register_face --student-id 2021CS001 image.jpg

Reads a student photo, generates the embedding offline using the pretrained
model, and stores it in Supabase. Embeddings are stored as float32 BYTEA and
are NEVER returned to the browser. This is a server-side, admin-gated
operation.

Requires insightface + onnxruntime installed. Runs in the SAME process
separation as training code — registration is not part of the inference API.
"""

from __future__ import annotations

import argparse
import base64
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.face_service import FaceStateError, face_service  # noqa: E402
from app.utils.supabase import get_client  # noqa: E402


def enroll(student_id: str, image_path: Path) -> None:
    if not face_service.available:
        raise SystemExit(
            "InsightFace is not available. Install insightface and onnxruntime "
            "to register faces."
        )

    import cv2

    img = cv2.imread(str(image_path))
    if img is None:
        raise SystemExit(f"Could not read image: {image_path}")

    embedding, metadata = face_service.embed(img)
    embedding_bytes = embedding.astype(np.float32).tobytes()

    client = get_client()
    # face_embedding is BYTEA; PostgREST expects hex "\\x..." literals for
    # bytea columns (base64 strings are stored as their literal characters).
    embedding_hex = "\\x" + embedding_bytes.hex()
    response = (
        client.table("students")
        .update({"face_embedding": embedding_hex})
        .eq("student_id", student_id)
        .execute()
    )

    if response.data:
        print(
            f"Enrolled face for {student_id} (detection confidence "
            f"{metadata['confidence']:.3f})"
        )
    else:
        print(f"No student found with ID {student_id}; nothing updated.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Enroll a student face embedding.")
    parser.add_argument("--student-id", required=True, help="Student ID to enroll")
    parser.add_argument("image", type=Path, help="Path to a face photo (jpg/png)")
    args = parser.parse_args()

    enroll(args.student_id, args.image)


if __name__ == "__main__":
    main()