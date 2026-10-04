import types

import numpy as np
import pytest

from app.services import identify_service
from app.services.face_service import face_service
from app.services.identify_service import (
    FaceServiceUnavailableError,
    UnknownFaceError,
    check_similarity,
    identify_student,
)
from app.schemas.career import (
    CareerCertification,
    CareerProject,
    CareerRecommendationRequest,
    CareerSkill,
)
from app.services.career_service import recommend_careers
from app.schemas.prediction import CgpaPredictionRequest
from app.services import prediction_service
from app.services.prediction_service import PredictionUnavailableError, predict_cgpa
from app.schemas.summary import SummaryRequest
from app.services.summary_service import generate_summary


class TestCareerRecommendation:
    def test_returns_top_three_sorted(self):
        payload = CareerRecommendationRequest(
            skills=[
                CareerSkill(name="JavaScript", proficiency="Advanced"),
                CareerSkill(name="React", proficiency="Advanced"),
                CareerSkill(name="Node.js", proficiency="Intermediate"),
                CareerSkill(name="SQL", proficiency="Intermediate"),
            ],
            projects=[CareerProject(technologies=["React", "Node.js", "PostgreSQL"])],
            certifications=[CareerCertification(name="AWS Certified Developer")],
            cgpa=8.2,
        )
        recs = recommend_careers(payload)

        assert len(recs) <= 3
        assert recs[0].score >= recs[1].score

    def test_unmatched_profile_returns_empty(self):
        payload = CareerRecommendationRequest(
            skills=[CareerSkill(name="Accounting", proficiency="Beginner")],
            cgpa=4.0,
        )
        recs = recommend_careers(payload)
        assert recs == []

    def test_fullstack_ranked_for_web_profile(self):
        payload = CareerRecommendationRequest(
            skills=[
                CareerSkill(name="JavaScript", proficiency="Expert"),
                CareerSkill(name="React", proficiency="Expert"),
                CareerSkill(name="CSS", proficiency="Advanced"),
            ],
            projects=[CareerProject(technologies=["React", "Node.js"])],
            interests=["web development"],
        )
        recs = recommend_careers(payload)
        top = recs[0].role
        assert top == "Full-Stack Developer"


class TestPredictionService:
    def test_model_unavailable_raises(self, monkeypatch):
        monkeypatch.setattr(prediction_service, "_load_model", lambda: None)
        payload = CgpaPredictionRequest(
            previous_cgpa=8.1,
            attendance=91,
            internal_score=84,
            project_score=90,
        )
        with pytest.raises(PredictionUnavailableError):
            predict_cgpa(payload)

    def test_model_available_returns_prediction(self):
        payload = CgpaPredictionRequest(
            previous_cgpa=8.1,
            attendance=91,
            internal_score=84,
            project_score=90,
        )
        result = predict_cgpa(payload)
        assert 0.0 <= result["predicted_cgpa"] <= 10.0
        assert result["model_version"] == "cgpa-v1"


class TestSummaryService:
    def test_improving_summary(self):
        summary = generate_summary(
            SummaryRequest(
                cgpa_trend="IMPROVING",
                attendance=92,
                strong_subjects=["DBMS", "OS"],
                weak_subjects=["Mathematics"],
                project_count=5,
                certification_count=3,
                achievement_count=2,
            )
        )
        assert "improving" in summary
        assert "DBMS" in summary
        assert "Mathematics" in summary

    def test_low_attendance_warning(self):
        summary = generate_summary(
            SummaryRequest(cgpa_trend="STABLE", attendance=60, weak_subjects=[], strong_subjects=[])
        )
        assert "75%" in summary

    def test_no_practical_experience_mention(self):
        summary = generate_summary(
            SummaryRequest(cgpa_trend="NO_DATA", attendance=None, project_count=0, certification_count=0)
        )
        assert "No projects or certifications" in summary


class TestIdentifyService:
    def _patch_pipeline(self, monkeypatch, embedding: np.ndarray, registered: list[dict]):
        fake = types.SimpleNamespace(
            available=True,
            simulation_enabled=False,
            decode_image=lambda image_base64: np.zeros((100, 100, 3), dtype=np.uint8),
            embed=lambda image: (embedding, {"confidence": 0.9}),
            _cosine_similarity=face_service._cosine_similarity,
        )
        monkeypatch.setattr(identify_service, "face_service", fake)
        monkeypatch.setattr(
            identify_service.supabase, "fetch_registered_embeddings", lambda: registered
        )

    def test_match_found(self, monkeypatch):
        unit = np.ones(512, dtype=np.float32)
        unit = unit / np.linalg.norm(unit)
        self._patch_pipeline(
            monkeypatch,
            unit,
            [{"student_id": "JEC24CS019", "name": "Aksa P K", "embedding": unit}],
        )
        result = identify_student("AA==")
        assert result["student"]["student_id"] == "JEC24CS019"
        assert result["simulated"] is False
        assert 0.0 <= result["confidence"] <= 1.0

    def test_unknown_face_rejected(self, monkeypatch):
        unit = np.ones(512, dtype=np.float32)
        unit = unit / np.linalg.norm(unit)
        # Orthogonal embedding -> cosine similarity ~0, below match threshold.
        far = np.zeros(512, dtype=np.float32)
        far[0] = 1.0
        self._patch_pipeline(
            monkeypatch,
            unit,
            [{"student_id": "JEC24CS019", "name": "Aksa P K", "embedding": far}],
        )
        with pytest.raises(UnknownFaceError):
            identify_student("AA==")

    def test_no_registered_faces_raises(self, monkeypatch):
        unit = np.ones(512, dtype=np.float32)
        unit = unit / np.linalg.norm(unit)
        self._patch_pipeline(monkeypatch, unit, [])
        with pytest.raises(UnknownFaceError):
            identify_student("AA==")

    def test_model_unavailable_fails_closed(self, monkeypatch):
        fake = types.SimpleNamespace(
            available=False,
            simulation_enabled=False,
            decode_image=lambda image_base64: np.zeros((100, 100, 3), dtype=np.uint8),
        )
        monkeypatch.setattr(identify_service, "face_service", fake)
        with pytest.raises(FaceServiceUnavailableError):
            identify_student("AA==")

    def test_cosine_similarity_identity_and_orthogonal(self):
        a = np.array([1.0, 0.0, 0.0], dtype=np.float32)
        b = np.array([0.0, 1.0, 0.0], dtype=np.float32)
        assert check_similarity(a, a) == pytest.approx(1.0, abs=1e-6)
        assert check_similarity(a, b) == pytest.approx(0.0, abs=1e-6)