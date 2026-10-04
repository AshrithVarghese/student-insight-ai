from fastapi import APIRouter, HTTPException, status

from app.schemas.face import IdentifyRequest, RegisterFaceRequest
from app.services.face_service import FaceStateError
from app.services.identify_service import (
    FaceServiceUnavailableError,
    UnknownFaceError,
    identify_student,
)
from app.services.enroll_service import (
    FaceServiceUnavailableError as EnrollFaceServiceUnavailableError,
    UnknownStudentError,
    enroll_student,
)

router = APIRouter(tags=["face"])

_STATE_TO_STATUS = {
    "NO_FACE": (status.HTTP_404_NOT_FOUND, "NO_FACE"),
    "MULTIPLE_FACES": (status.HTTP_400_BAD_REQUEST, "MULTIPLE_FACES"),
    "FACE_TOO_SMALL": (status.HTTP_422_UNPROCESSABLE_ENTITY, "FACE_TOO_SMALL"),
    "LOW_IMAGE_QUALITY": (status.HTTP_422_UNPROCESSABLE_ENTITY, "LOW_IMAGE_QUALITY"),
    "MODEL_UNAVAILABLE": (status.HTTP_503_SERVICE_UNAVAILABLE, "MODEL_UNAVAILABLE"),
}


def _handle_face_state(exc: FaceStateError) -> HTTPException:
    http_status, code = _STATE_TO_STATUS.get(
        exc.state, (status.HTTP_422_UNPROCESSABLE_ENTITY, "VALIDATION_ERROR")
    )
    return HTTPException(
        status_code=http_status,
        detail={"code": code, "message": exc.message, **exc.detail},
    )


@router.post("/identify")
def identify(payload: IdentifyRequest) -> dict:
    try:
        result = identify_student(payload.image_base64)
    except FaceStateError as exc:
        raise _handle_face_state(exc) from exc
    except UnknownFaceError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "UNKNOWN_FACE", "message": str(exc)},
        ) from exc
    except FaceServiceUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "MODEL_UNAVAILABLE", "message": str(exc)},
        ) from exc

    return {
        "success": True,
        "data": {
            "student": result["student"],
            "confidence": result["confidence"],
            "simulated": result["simulated"],
        },
    }


@router.post("/register-face")
def register_face(payload: RegisterFaceRequest) -> dict:
    try:
        result = enroll_student(payload.student_id, payload.image_base64)
    except FaceStateError as exc:
        raise _handle_face_state(exc) from exc
    except EnrollFaceServiceUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "MODEL_UNAVAILABLE", "message": str(exc)},
        ) from exc
    except UnknownStudentError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "UNKNOWN_STUDENT", "message": str(exc)},
        ) from exc

    return {"success": True, "data": result}