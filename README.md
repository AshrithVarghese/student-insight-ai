# Student Insight AI

End-to-end student analytics platform: face-recognition attendance, CGPA prediction, career guidance, and AI summaries.

## Architecture

| Folder | What it is |
| ------ | ---------- |
| `frontend/` | React + TypeScript + Vite SPA (deployed to Vercel) |
| `ml-service/` | FastAPI ML backend: face recognition, CGPA prediction, career recommendation, summaries |
| `database/` | Supabase schema (PostgreSQL) |
| `deploy/hf-gradio-space/` | Deploy bundle for the free Hugging Face Gradio Space running the ML service |
| `deploy/hf-space/` | (Obsolete) Docker-based HF deploy, replaced by the Gradio Space |

## ML Service (Hugging Face Space)

The ML service runs at `https://Ashrith-Varghese-student-insight-ai-ml.hf.space`.
Endpoints: `/health`, `/identify`, `/register-face`, `/predict/cgpa`, `/recommend/career`, `/summary/generate`.
Re-deploy from `deploy/hf-gradio-space/` with `powershell -ExecutionPolicy Bypass -File .\push.ps1`.

## Frontend

`frontend/` is deployed to Vercel. Set env vars from `frontend/.env.example` in Vercel's dashboard.

## Local dev

- ML service: `cd ml-service; python -m venv .venv; .\.venv\Scripts\pip install -r requirements.txt; uvicorn app.main:app --reload --port 8000`
- Frontend: `cd frontend; npm install; npm run dev`