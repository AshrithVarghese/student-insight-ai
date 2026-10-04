"""Create the public Supabase storage bucket for student profile photos.

Run from the ml-service directory:
    python -m scripts.create_photo_bucket

Idempotent: does nothing if the bucket already exists. The storage RLS
policies are defined in database/supabase_schema.sql and must be applied
once from the Supabase SQL editor.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.utils.supabase import get_client  # noqa: E402

BUCKET = "student-photos"


def main() -> None:
    client = get_client()
    try:
        client.storage.get_bucket(BUCKET)
        print(f"Bucket '{BUCKET}' already exists.")
    except Exception:
        client.storage.create_bucket(BUCKET, options={"public": True})
        print(f"Created public bucket '{BUCKET}'.")


if __name__ == "__main__":
    main()