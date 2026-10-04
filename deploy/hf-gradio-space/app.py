"""Hugging Face Gradio-space bootstrap for the ML service.

HF's Gradio SDK runtime requires a real Gradio `demo` launched via
`demo.launch()` (a plain uvicorn.run is killed after startup with
"No @spaces.GPU function detected during startup"). So:

1. We define a minimal Gradio UI and launch it on the HF port.
2. After launch, we attach our FastAPI routers to Gradio's underlying app
   (`demo.app`) so all ML endpoints keep working alongside the UI.
3. A `@spaces.GPU`-decorated handler is wired to a button so HF's startup
   scan is satisfied (it never actually uses a GPU on CPU Spaces).
"""

import os
import threading

# Must be imported before anything that initializes CUDA (this service uses
# only onnxruntime CPU, so this is belt-and-suspenders).
import spaces

import gradio as gr
from fastapi.middleware.cors import CORSMiddleware

from app.main import app as fastapi_app
from app.config import settings

# ---------------------------------------------------------------------------
# Minimal Gradio UI (the runtime requires a real demo)
# ---------------------------------------------------------------------------
with gr.Blocks(title="Student Insight AI - ML Service") as demo:
    gr.Markdown(
        "## Student Insight AI - ML Service\n\n"
        "Public API endpoints:\n"
        "- `GET /health`\n"
        "- `POST /identify`  `POST /register-face`\n"
        "- `POST /predict/cgpa`  `POST /recommend/career`  `POST /summary/generate`\n\n"
        "Interactive OpenAPI docs at `/docs`."
    )

_status = gr.Textbox(value="running", visible=False)


@spaces.GPU()
def _platform_check(msg: str) -> str:
    # Exists only to satisfy HF's startup scan for a @spaces.GPU handler.
    # On a CPU Space the decorator is a no-op and returns `msg` unchanged.
    return msg


demo.load(fn=_platform_check, inputs=_status, outputs=_status)

demo.queue().launch(
    server_name="0.0.0.0",
    server_port=int(os.environ.get("PORT", 7860)),
    prevent_thread_lock=True,
    ssr_mode=False,
    quiet=True,
)

# ---------------------------------------------------------------------------
# Attach the FastAPI service to Gradio's underlying ASGI app
# ---------------------------------------------------------------------------
served = demo.app  # created inside launch()

served.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
served.include_router(fastapi_app.router)
for exc_type, handler in fastapi_app.exception_handlers.items():
    served.exception_handlers[exc_type] = handler

# Keep the main thread alive (gradio's server runs in a background thread).
threading.Event().wait()