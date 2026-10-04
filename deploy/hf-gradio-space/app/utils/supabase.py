"""Server-side Supabase client.

The ML service is server-side code and may use the service-role key. This key
must NEVER be exposed to the browser. The ML service only READS registered
student identity + face embeddings for matching; it never returns embeddings.
"""

from __future__ import annotations

import base64
from functools import lru_cache

import numpy as np
from supabase import create_client, Client

from app.config import settings


@lru_cache(maxsize=1)
def get_client() -> Client:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise RuntimeError(
            "Supabase credentials missing. Set SUPABASE_URL and "
            "SUPABASE_SERVICE_ROLE_KEY in the ML service .env."
        )
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def _decode_embedding(raw) -> np.ndarray | None:
    """Decode a face_embedding value into a normalized float32 vector.

    face_embedding is a BYTEA column. PostgREST returns BYTEA as a hex string
    (e.g. "\\x2a..."); older rows may contain a base64 string. Returns None for
    anything that cannot be decoded into a usable vector.
    """
    if not raw:
        return None
    try:
        if isinstance(raw, str):
            if raw.startswith("\\x"):
                data = bytes.fromhex(raw[2:])
            else:
                data = base64.b64decode(raw)
        else:
            data = bytes(raw)
        embedding = np.frombuffer(data, dtype=np.float32)
        if embedding.size == 0:
            return None
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = embedding / norm
        return embedding
    except Exception:
        return None


def fetch_registered_embeddings() -> list[dict]:
    """Returns registered student identity + embeddings for matching.

    Each entry: {"student_id": str, "name": str, "embedding": np.ndarray}
    """
    client = get_client()
    response = client.table("students").select("student_id,name,face_embedding").execute()
    rows = response.data or []

    results: list[dict] = []
    for row in rows:
        embedding = _decode_embedding(row.get("face_embedding"))
        if embedding is None:
            continue
        results.append(
            {
                "student_id": row["student_id"],
                "name": row["name"],
                "embedding": embedding,
            }
        )
    return results


def fetch_student_name(student_id: str) -> str | None:
    client = get_client()
    response = (
        client.table("students")
        .select("name")
        .eq("student_id", student_id)
        .limit(1)
        .execute()
    )
    rows = response.data or []
    return rows[0]["name"] if rows else None