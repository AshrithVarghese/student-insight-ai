from pydantic import BaseModel, ConfigDict, Field


def _to_camel(name: str) -> str:
    parts = name.split("_")
    return parts[0] + "".join(p.capitalize() for p in parts[1:])


class CgpaPredictionRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=_to_camel)

    previous_cgpa: float = Field(..., ge=0, le=10, alias="previousCgpa")
    attendance: float = Field(..., ge=0, le=100)
    internal_score: float = Field(..., ge=0, le=100, alias="internalScore")
    project_score: float = Field(..., ge=0, le=100, alias="projectScore")
    recent_gpa: float | None = Field(default=None, ge=0, le=10, alias="recentGpa")


class CgpaPredictionResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=_to_camel)

    predicted_cgpa: float = Field(..., alias="predictedCgpa")
    model_version: str = Field(..., alias="modelVersion")