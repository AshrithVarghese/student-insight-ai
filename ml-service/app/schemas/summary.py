from pydantic import BaseModel, ConfigDict, Field


def _to_camel(name: str) -> str:
    parts = name.split("_")
    return parts[0] + "".join(p.capitalize() for p in parts[1:])


class SummaryRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=_to_camel)

    cgpa_trend: str = Field(description="IMPROVING | STABLE | DECLINING | NO_DATA", alias="cgpaTrend")
    attendance: float | None = Field(default=None, ge=0, le=100)
    strong_subjects: list[str] = Field(default_factory=list, alias="strongSubjects")
    weak_subjects: list[str] = Field(default_factory=list, alias="weakSubjects")
    project_count: int = Field(default=0, ge=0, alias="projectCount")
    certification_count: int = Field(default=0, ge=0, alias="certificationCount")
    achievement_count: int = Field(default=0, ge=0, alias="achievementCount")


class SummaryResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=_to_camel)

    summary: str