# Student Insight AI — ML Service

Python FastAPI microservice for the ML / computer-vision functionality:
face recognition, CGPA prediction, career recommendation, and AI summary.

## Quick start

```bash
cd ml-service
python -m venv .venv
# Windows: .venv\Scripts\activate     |  macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env    # fill in SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
uvicorn app.main:app --reload --port 8000
```

The service runs without a Supabase key, but face identification needs it.

## Endpoints

| Method | Path                 | Purpose                              |
| ------ | -------------------- | ------------------------------------ |
| GET    | `/health`            | Liveness check                       |
| POST   | `/identify`          | Identify a student from a face image |
| POST   | `/predict/cgpa`      | Predict a student's future CGPA      |
| POST   | `/recommend/career`  | Top-3 career role recommendations    |
| POST   | `/summary/generate`  | Deterministic performance summary    |

Interactive docs at `http://localhost:8000/docs`.

## Face recognition

Uses a **pretrained** InsightFace model. The plan explicitly forbids training a
face-recognition network from scratch. Insights:

- If `insightface` + `onnxruntime` are installed, real recognition runs.
- Otherwise, with `FACE_SIMULATION_MODE=true` (the default), the service runs a
  dev-only simulation that returns the student configured in
  `FACE_SIMULATION_STUDENT_ID`. Responses are flagged `"simulated": true`.
- Set `FACE_SIMULATION_MODE=false` in production so it fails instead of faking.

### Register a student's face (server-side, admin-gated)

```bash
python -m training.register_face --student-id 2021CS001 path/to/photo.jpg
```

Embeddings are stored as float32 `BYTEA` in Supabase and are never returned to
the browser. Matching compares cosine similarity against
`FACE_MATCH_THRESHOLD` (default 0.4).

## CGPA prediction

- Model training lives in `training/train_cgpa.py`; the inference API in
  `app/services/prediction_service.py` only loads the artifact.
- Trained models are saved to `models/cgpa/cgpa_model.joblib`. If the model is
  missing, the endpoint returns `MODEL_UNAVAILABLE` — it never fabricates a
  value.
- If the bundled dataset is absent, the trainer generates **synthetic,
  clearly-labeled** development data. A model trained on synthetic data is a
  development demo only.

Train the baseline model:

```bash
python -m training.train_cgpa
```

## Career recommendation

Rule-based hybrid scoring (skill / project / certification / interest /
academic matching) — deterministic, not ML. Scores are profile compatibility,
not probability of career success.

## Tests

```bash
pytest
```

## Notes

- This service is server-side and may use the Supabase **service-role key**.
  It must never be shipped into the browser bundle.
- Response format follows PLAN.md section 24:
  - Success: `{ "success": true, "data": ... }`
  - Error: `{ "success": false, "error": { "code": ..., "message": ... } }`
- ML logic never lives in React components (PLAN.md rule 8); the frontend
  calls these endpoints directly.

   To restart later: ml-service\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8000 (run from ml-service/).