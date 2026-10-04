"""AI-assisted performance summary generation.

Deterministic, template-based generation from verified data only (per
PLAN.md section 19). An LLM may replace this later for more natural
wording, but any LLM integration must only receive verified facts.

This module never invents grades, achievements, skills, or conduct.
"""

from __future__ import annotations

from app.schemas.summary import SummaryRequest


def _trend_phrase(trend: str) -> str:
    mapping = {
        "IMPROVING": "improving",
        "STABLE": "stable",
        "DECLINING": "declining",
        "NO_DATA": "not yet established",
    }
    return mapping.get(trend, "not yet established")


def generate_summary(payload: SummaryRequest) -> str:
    parts: list[str] = []

    # Academic trend
    trend = _trend_phrase(payload.cgpa_trend)
    if payload.cgpa_trend == "NO_DATA":
        parts.append(
            "The academic trend is not yet established as the available semester "
            "history is limited."
        )
    else:
        parts.append(f"The overall academic trajectory is {trend}.")

    # Strengths
    if payload.strong_subjects:
        strong = ", ".join(payload.strong_subjects[:3])
        parts.append(
            f"Strengths include strong performance in {strong}."
        )

    # Areas for improvement
    if payload.weak_subjects:
        weak = ", ".join(payload.weak_subjects[:3])
        parts.append(
            f"Areas for improvement have been identified in {weak}; focused effort here "
            "can further raise overall performance."
        )

    # Attendance observation
    if payload.attendance is not None and payload.attendance >= 0:
        if payload.attendance >= 90:
            parts.append("Attendance is consistently excellent.")
        elif payload.attendance >= 75:
            parts.append("Attendance is at a healthy level, above the typical minimum.")
        else:
            parts.append(
                "Attendance is below the recommended 75% threshold and should be "
                "monitored closely."
            )

    # Practical experience
    experience_bits: list[str] = []
    if payload.project_count > 0:
        experience_bits.append(f"{payload.project_count} project(s)")
    if payload.certification_count > 0:
        experience_bits.append(f"{payload.certification_count} certification(s)")
    if payload.achievement_count > 0:
        experience_bits.append(f"{payload.achievement_count} achievement(s)")
    if experience_bits:
        parts.append(
            f"Practical experience includes {', '.join(experience_bits)}, which "
            "complements classroom learning."
        )
    else:
        parts.append(
            "No projects or certifications are currently recorded; adding practical "
            "work would strengthen the profile."
        )

    return " ".join(parts)