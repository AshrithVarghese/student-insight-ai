from fastapi import APIRouter, HTTPException, status

from app.schemas.prediction import CgpaPredictionRequest
from app.services.prediction_service import (
    PredictionUnavailableError,
    predict_cgpa,
)

router = APIRouter(tags=["prediction"])

_BASED_ON = [
    "previousCgpa",
    "attendance",
    "internalScore",
    "projectScore",
]


@router.post("/predict/cgpa")
def post_predict_cgpa(payload: CgpaPredictionRequest) -> dict:
    try:
        result = predict_cgpa(payload)
    except PredictionUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "MODEL_UNAVAILABLE", "message": str(exc)},
        ) from exc

    return {
        "predictedCgpa": result["predicted_cgpa"],
        "modelVersion": result["model_version"],
        "status": "AVAILABLE",
        "basedOn": _BASED_ON,
    }