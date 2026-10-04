"""Future CGPA prediction.

Loads a trained model ONCE and reuses it across requests (per PLAN.md
architecture rules). When no model file exists the endpoint returns
MODEL_UNAVAILABLE instead of fabricating a value.

The model is trained offline by training/train_cgpa.py. Training code lives
in training/ and never runs inside the inference API.
"""

from __future__ import annotations

import logging
from pathlib import Path

import joblib
import numpy as np

from app.config import settings
from app.schemas.prediction import CgpaPredictionRequest

logger = logging.getLogger(__name__)

MODEL_VERSION = "cgpa-v1"

FEATURE_ORDER = [
    "previous_cgpa",
    "attendance",
    "internal_score",
    "project_score",
    "recent_gpa",
]

_model = None
_model_path: Path | None = None


def _load_model() -> object | None:
    global _model, _model_path
    path = settings.resolved_model_path
    if path == _model_path and _model is not None:
        return _model

    if not path.exists():
        logger.info("CGPA model not found at %s - prediction will be unavailable", path)
        return None

    try:
        _model = joblib.load(path)
        _model_path = path
        logger.info("Loaded CGPA model from %s", path)
        return _model
    except Exception:
        logger.exception("Failed to load CGPA model")
        return None


def model_available() -> bool:
    return _load_model() is not None


def predict_cgpa(payload: CgpaPredictionRequest) -> dict:
    """Returns a dict with predicted_cgpa and model_version, or raises
    PredictionUnavailableError when the model cannot be used."""
    model = _load_model()
    if model is None:
        raise PredictionUnavailableError("Model is not available.")

    features = np.array(
        [
            [
                payload.previous_cgpa,
                payload.attendance,
                payload.internal_score,
                payload.project_score,
                payload.recent_gpa if payload.recent_gpa is not None else payload.previous_cgpa,
            ]
        ]
    )

    predicted = float(model.predict(features)[0])
    predicted = max(0.0, min(10.0, round(predicted, 2)))

    return {"predicted_cgpa": predicted, "model_version": MODEL_VERSION}


class PredictionUnavailableError(Exception):
    pass