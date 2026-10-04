# Hugging Face Spaces (Docker SDK)
# Serves the Student Insight AI ML service on port 7860 ($PORT).
# Build context = root of the HF Space repo (this folder).
FROM python:3.11-slim

# HF Spaces Docker conventions
ENV PORT=7860
ENV PYTHONUNBUFFERED=1

# Runtime libs required by onnxruntime / scikit-learn / opencv headless
RUN apt-get update && apt-get install -y --no-install-recommends \
        libgomp1 \
        libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# insightface + onnxruntime are commented out in requirements.txt (they are
# only required when real face recognition is enabled), so install them here
# with the exact versions already verified on the local dev machine.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir \
        "onnxruntime==1.30.0" \
        "insightface==2.1"

# Inference code and committed ML artifacts only (training code is NOT bundled)
COPY app ./app
COPY models ./models

# Download and warm the InsightFace model into the image at BUILD time so cold
# starts are fast and no runtime download is required. Mirror of face_service.py.
RUN python -c "from insightface.app import FaceAnalysis; app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider']); app.prepare(ctx_id=0, det_size=(640, 640)); print('InsightFace buffalo_l baked into image')"

EXPOSE 7860

# $PORT is set by Hugging Face at runtime; default to 7860.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-7860}"]