from pydantic import BaseModel, ConfigDict, Field


def _to_camel(name: str) -> str:
    parts = name.split("_")
    return parts[0] + "".join(p.capitalize() for p in parts[1:])


class CareerSkill(BaseModel):
    name: str
    proficiency: str = "Intermediate"


class CareerProject(BaseModel):
    technologies: list[str] = Field(default_factory=list)
    title: str | None = None


class CareerCertification(BaseModel):
    name: str
    issuer: str | None = None


class SubjectPerformance(BaseModel):
    name: str
    marks: float = Field(ge=0, le=100)


class CareerRecommendationRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=_to_camel)

    skills: list[CareerSkill] = Field(default_factory=list)
    projects: list[CareerProject] = Field(default_factory=list)
    certifications: list[CareerCertification] = Field(default_factory=list)
    cgpa: float | None = Field(default=None, ge=0, le=10)
    subject_performance: list[SubjectPerformance] = Field(
        default_factory=list, alias="subjectPerformance"
    )
    interests: list[str] = Field(default_factory=list)


class RoleRecommendation(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=_to_camel)

    role: str
    score: int = Field(ge=0, le=100)
    matched_factors: list[str] = Field(default_factory=list, alias="matchedFactors")


class CareerRecommendationResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=_to_camel)

    recommendations: list[RoleRecommendation]