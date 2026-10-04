"""Face recognition service.

Uses a PRETRAINED face-recognition model (InsightFace) - the plan explicitly
forbids training a face-recognition network from scratch (PLAN.md section 14).

Design notes:
- Raw embeddings are never returned to callers.
- When insightface/onnxruntime are not installed the service runs in an
  explicitly flagged SIMULATION_MODE so local development remains possible.
  Simulated responses are marked with `simulated: true` and are NOT used in
  production configurations.
- Matching uses cosine similarity against embeddings stored server-side.
"""

from __future__ import annotations

import base64
import io
import logging
import re
from dataclasses import dataclass

import numpy as np

from app.config import settings

logger = logging.getLogger(__name__)


class FaceStateError(Exception):
    """Raised with a FaceState discriminant so callers can map to a response."""

    def __init__(self, state: str, message: str, detail: dict | None = None):
        super().__init__(message)
        self.state = state
        self.message = message
        self.detail = detail or {}


class FaceService:
    def __init__(self) -> None:
        self._model = None
        self._ready = False
        self._load_model()

    # ------------------------------------------------------------------
    # Model loading (once, reused)
    # ------------------------------------------------------------------
    def _load_model(self) -> None:
        try:
            import onnxruntime  # noqa: F401
            from insightface.app import FaceAnalysis

            app = FaceAnalysis(name=settings.face_model_name, providers=["CPUExecutionProvider"])
            app.prepare(ctx_id=0, det_size=(640, 640))
            self._model = app
            self._ready = True
            logger.info("InsightFace model loaded successfully.")
        except Exception:
            self._model = None
            self._ready = False
            if settings.face_simulation_mode:
                logger.warning(
                    "InsightFace unavailable. Running in SIMULATION_MODE (dev only)."
                )
            else:
                logger.exception("InsightFace unavailable and simulation mode is disabled.")

    @property
    def available(self) -> bool:
        return self._ready

    @property
    def simulation_enabled(self) -> bool:
        return settings.face_simulation_mode

    # ------------------------------------------------------------------
    # Image handling
    # ------------------------------------------------------------------
    @staticmethod
    def decode_image(image_base64: str) -> np.ndarray:
        header_pattern = re.compile(r"^data:image/(png|jpe?g);base64,")
        data = header_pattern.sub("", image_base64.strip())
        try:
            raw = base64.b64decode(data)
        except Exception as exc:
            raise FaceStateError("LOW_IMAGE_QUALITY", "Image could not be decoded.") from exc

        try:
            import cv2

            arr = np.frombuffer(raw, dtype=np.uint8)
            img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            if img is None:
                raise ValueError("cv2 failed to decode")
            return img
        except Exception as exc:
            # Fallback via PIL when cv2 is unavailable
            try:
                from PIL import Image

                pil_image = Image.open(io.BytesIO(raw)).convert("RGB")
                return np.asarray(pil_image)[:, :, ::-1]
            except Exception as inner:
                raise FaceStateError(
                    "LOW_IMAGE_QUALITY", "Image could not be decoded."
                ) from inner

    @staticmethod
    def _check_quality(image: np.ndarray) -> None:
        if image.size == 0:
            raise FaceStateError("LOW_IMAGE_QUALITY", "Image is empty.")
        h, w = image.shape[:2]
        if h < 32 or w < 32:
            raise FaceStateError(
                "LOW_IMAGE_QUALITY",
                "Image dimensions are too small to contain a usable face.",
                {"width": w, "height": h},
            )

    # ------------------------------------------------------------------
    # Embedding generation
    # ------------------------------------------------------------------
    def embed(self, image: np.ndarray) -> tuple[np.ndarray, dict]:
        """Returns (embedding, metadata). Raises FaceStateError."""
        self._check_quality(image)

        if not self.available:
            raise FaceStateError(
                "MODEL_UNAVAILABLE",
                "Face recognition model is not available.",
            )

        faces = self._model.get(image)

        if len(faces) == 0:
            raise FaceStateError("NO_FACE", "No face detected in the image.")
        if len(faces) > 1:
            raise FaceStateError(
                "MULTIPLE_FACES",
                "Multiple faces detected. Ensure exactly one face is in frame.",
                {"face_count": len(faces)},
            )

        face = faces[0]
        if face.bbox is not None:
            box_w = face.bbox[2] - face.bbox[0]
            box_h = face.bbox[3] - face.bbox[1]
            image_h, image_w = image.shape[:2]
            face_ratio = (box_w * box_h) / (image_w * image_h)
            if face_ratio < 0.015:
                raise FaceStateError("FACE_TOO_SMALL", "Face is too small in the frame.")

        embedding = face.embedding.astype(np.float32)
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = embedding / norm

        metadata = {"confidence": float(face.det_score or 0.5)}
        return embedding, metadata

    # ------------------------------------------------------------------
    # Matching
    # ------------------------------------------------------------------
    @staticmethod
    def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
        a_n = a / (np.linalg.norm(a) + 1e-8)
        b_n = b / (np.linalg.norm(b) + 1e-8)
        return float(np.dot(a_n, b_n))


face_service = FaceService()