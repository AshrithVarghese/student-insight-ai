from fastapi import APIRouter, HTTPException, status

from app.schemas.summary import SummaryRequest
from app.services.summary_service import generate_summary

router = APIRouter(tags=["summary"])


@router.post("/summary/generate")
def post_generate_summary(payload: SummaryRequest) -> dict:
    try:
        summary = generate_summary(payload)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "INTERNAL_ERROR", "message": "Summary generation failed."},
        )

    return {"success": True, "data": {"summary": summary}}