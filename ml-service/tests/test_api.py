from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


class TestHealth:
    def test_health(self):
        r = client.get("/health")
        assert r.status_code == 200
        assert r.json()["success"] is True


class TestCareerEndpoint:
    def test_career_recommendation_success(self):
        r = client.post(
            "/recommend/career",
            json={
                "skills": [
                    {"name": "JavaScript", "proficiency": "Advanced"},
                    {"name": "React", "proficiency": "Advanced"},
                ],
                "projects": [{"technologies": ["React", "Node.js"]}],
                "cgpa": 8.2,
            },
        )
        assert r.status_code == 200
        body = r.json()
        assert body["success"] is True
        for rec in body["data"]["recommendations"]:
            assert rec["role"]
            assert 0 <= rec["score"] <= 100
            assert "matchedFactors" in rec

    def test_career_validation_error(self):
        r = client.post("/recommend/career", json={"skills": "not-a-list"})
        assert r.status_code == 422
        assert r.json()["error"]["code"] == "VALIDATION_ERROR"


class TestSummaryEndpoint:
    def test_summary_success(self):
        r = client.post(
            "/summary/generate",
            json={
                "cgpaTrend": "IMPROVING",
                "attendance": 91,
                "strongSubjects": ["DBMS"],
                "weakSubjects": [],
                "projectCount": 4,
                "certificationCount": 2,
                "achievementCount": 1,
            },
        )
        assert r.status_code == 200
        assert r.json()["success"] is True
        assert r.json()["data"]["summary"]


class TestPredictionEndpoint:
    def test_model_available(self):
        r = client.post(
            "/predict/cgpa",
            json={
                "previousCgpa": 8.1,
                "attendance": 91,
                "internalScore": 84,
                "projectScore": 90,
            },
        )
        # The trained model (cgpa-v1) is committed; prediction must succeed
        # with a real value, never a fake or an error.
        assert r.status_code == 200
        body = r.json()
        assert 0.0 <= body["predictedCgpa"] <= 10.0
        assert body["modelVersion"] == "cgpa-v1"
        assert body["status"] == "AVAILABLE"


class TestIdentifyEndpoint:
    def test_invalid_image(self):
        r = client.post(
            "/identify",
            json={"imageBase64": "not-base64-!!"},
        )
        assert r.status_code == 422
        assert r.json()["error"]["code"] == "LOW_IMAGE_QUALITY"


class TestRegisterFaceEndpoint:
    def test_invalid_image(self):
        r = client.post(
            "/register-face",
            json={"studentId": "JEC24CS060", "imageBase64": "not-base64-!!"},
        )
        assert r.status_code == 422
        assert r.json()["error"]["code"] == "LOW_IMAGE_QUALITY"