---
title: Student Insight AI — ML Service
emoji: 🎓
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# Student Insight AI — ML Service

FastAPI service powering face recognition, CGPA prediction, career recommendation,
and performance summaries for the Student Insight AI web app.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Liveness check |
| POST | `/identify` | Identify a student from a base64 image |
| POST | `/register-face` | Enroll a student face embedding (admin) |
| POST | `/predict/cgpa` | Predict future CGPA |
| POST | `/recommend/career` | Career role compatibility |
| POST | `/summary/generate` | Text performance summary |

## Required environment variables (Settings → Variables and secrets)

| Variable | Example | Notes |
| --- | --- | --- |
| `SUPABASE_URL` | `https://stdzputiwdpennpzpjti.supabase.co` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_...` | Service role key (keep secret) |
| `FACE_SIMULATION_MODE` | `false` | Must be `false` for real matches |
| `CORS_ORIGINS` | `http://localhost:5173,https://<frontend-domain>` | Comma-separated browser origins |
| `FACE_MODEL_NAME` | `buffalo_l` | Leave default (already baked into image) |
| `FACE_MATCH_THRESHOLD` | `0.4` | Optional |

## Deploy

1. Create a Space with **Docker** SDK: https://huggingface.co/new-space
2. `git clone https://huggingface.co/spaces/<user>/<space-name>`
3. Copy this folder's contents (`app/`, `models/`, `Dockerfile`, `requirements.txt`, `README.md`) into the clone.
4. Set the environment variables above in the Space **Settings**.
5. Commit and push. The public HTTPS URL becomes `https://<user>-<space-name>.hf.space`.

Point the frontend at it with `VITE_ML_SERVICE_URL=https://<user>-<space-name>.hf.space`.

## Notes

- The InsightFace `buffalo_l` model is downloaded and baked into the image during
  the build, so every `/identify` or `/register-face` call starts fast (no
  per-request model download).
- Free HF Spaces pause after ~48h of inactivity and wake on the next request
  (cold start ~1–2 min). For demo purposes this is fine.
- If the build fails on a native dependency wheel (`onnxruntime` / `insightface`)
  for the Python 3.11 linux image, try `onnxruntime==1.20.0` in the Dockerfile.