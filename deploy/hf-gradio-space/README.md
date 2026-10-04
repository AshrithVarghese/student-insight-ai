---
title: Student Insight AI — ML Service
emoji: 🎓
colorFrom: blue
colorTo: indigo
sdk: gradio
sdk_version: "6.29.1"
app_file: app.py
pinned: false
---

# Student Insight AI — ML Service

Backend ML service for the Student Insight AI web app (face recognition,
CGPA prediction, career recommendation, performance summaries).

Hosted as a Hugging Face Space using the FREE **Gradio SDK** runtime. The Space
shows a small status UI; the FastAPI routes are attached to Gradio's server so
the ML endpoints are served at the same public URL.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Liveness check |
| POST | `/identify` | Identify a student from a base64 image |
| POST | `/register-face` | Enroll a student face embedding (admin) |
| POST | `/predict/cgpa` | Predict future CGPA |
| POST | `/recommend/career` | Career role compatibility |
| POST | `/summary/generate` | Text performance summary |

## Environment variables (Settings → Variables and secrets)

| Variable | Example | Notes |
| --- | --- | --- |
| `SUPABASE_URL` | `https://stdzputiwdpennpzpjti.supabase.co` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_...` | Service role key (keep secret) |
| `FACE_SIMULATION_MODE` | `false` | Must be `false` for real matches |
| `CORS_ORIGINS` | `http://localhost:5173,https://<frontend-domain>` | Comma-separated browser origins |
| `FACE_MODEL_NAME` | `buffalo_l` | Default; `buffalo_s` downloads much faster |
| `FACE_MATCH_THRESHOLD` | `0.4` | Optional |

## Deploy

1. Create a Space with SDK **Gradio**: https://huggingface.co/new-space
2. Push this folder (`app.py`, `app/`, `models/`, `requirements.txt`, `README.md`) to the Space repo.
3. Set the environment variables above in **Settings**, then it builds & runs.
4. Public URL: `https://<user>-<space-name>.hf.space`
5. Frontend: `VITE_ML_SERVICE_URL=https://<user>-<space-name>.hf.space`

## Notes

- The InsightFace `buffalo_l` model downloads on first boot (~a few minutes).
  On slow starts, switch `FACE_MODEL_NAME` to `buffalo_s` (smaller, faster).
- Build note: the Gradio SDK runtime uses **Python 3.10**, so `onnxruntime` is
  pinned to `1.23.2` (later versions require Python 3.11+).
- Free Spaces pause after ~48h of inactivity and wake on the next request
  (~1–2 min cold start). Fine for demos.
- Refresh code any time via `sync.ps1` + re-push.