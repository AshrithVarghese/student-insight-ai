from fastapi import APIRouter, HTTPException, status

from app.schemas.career import CareerRecommendationRequest
from app.services.career_service import recommend_careers

router = APIRouter(tags=["career"])


@router.post("/recommend/career")
def post_recommend_career(payload: CareerRecommendationRequest) -> dict:
    try:
        recommendations = recommend_careers(payload)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "INTERNAL_ERROR", "message": "Career recommendation failed."},
        )

    return {
        "success": True,
        "data": {
            "recommendations": [
                {
                    "role": rec.role,
                    "score": rec.score,
                    "matchedFactors": rec.matched_factors,
                }
                for rec in recommendations
            ]
        },
    }