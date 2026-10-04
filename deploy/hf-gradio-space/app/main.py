"""Student Insight AI — ML Service entry point.

FastAPI service handling face recognition, CGPA prediction, career
recommendation, and summary generation.

Responses follow the API contract in PLAN.md section 24:
  { "success": true,  "data":  ... }
  { "success": false, "error": { "code": ..., "message": ... } }
"""

from __future__ import annotations

import logging

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.routes import career, face, prediction, summary

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Student Insight AI — ML Service",
    version="0.1.0",
    description=(
        "Face recognition, academic prediction, career recommendation, "
        "and performance summary endpoints."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(face.router, prefix="")
app.include_router(prediction.router, prefix="")
app.include_router(career.router, prefix="")
app.include_router(summary.router, prefix="")


@app.get("/health")
def health() -> dict:
    return {"success": True, "data": {"status": "ok"}}


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    if exc.detail is None:
        return JSONResponse(
            status_code=exc.status_code,
            content={"success": False, "error": {"code": "ERROR", "message": "Request failed."}},
            headers=exc.headers,
        )

    if isinstance(exc.detail, dict) and "code" in exc.detail:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "error": {"code": exc.detail["code"], "message": exc.detail["message"]},
            },
            headers=exc.headers,
        )

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {"code": "ERROR", "message": str(exc.detail)},
        },
        headers=exc.headers,
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": {"code": "VALIDATION_ERROR", "message": "Request validation failed."},
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error on %s", request.url.path)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {"code": "INTERNAL_ERROR", "message": "An internal error occurred."},
        },
    )