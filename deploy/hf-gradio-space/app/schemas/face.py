from pydantic import BaseModel, ConfigDict, Field


def _to_camel(name: str) -> str:
    parts = name.split("_")
    return parts[0] + "".join(p.capitalize() for p in parts[1:])


class IdentifyRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=_to_camel)

    image_base64: str = Field(
        ..., description="JPEG/PNG image encoded as base64", alias="imageBase64"
    )


class RegisterFaceRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=_to_camel)

    student_id: str = Field(..., description="Student ID to enroll", alias="studentId")
    image_base64: str = Field(
        ..., description="JPEG/PNG image encoded as base64", alias="imageBase64"
    )


class IdentifiedStudent(BaseModel):
    student_id: str
    name: str


class IdentifyResponse(BaseModel):
    student: IdentifiedStudent
    confidence: float


FaceState = str  # NO_FACE | MULTIPLE_FACES | FACE_TOO_SMALL | LOW_IMAGE_QUALITY | UNKNOWN_FACE | MATCH_FOUND