from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # Supabase
    supabase_url: str | None = None
    supabase_service_role_key: str | None = None

    # Face recognition
    # Simulation is only for offline development; it never runs by default so
    # a real (non-simulated) match is guaranteed in production configs.
    face_simulation_mode: bool = False
    face_simulation_student_id: str = "2021CS001"
    face_match_threshold: float = 0.4
    face_model_name: str = "buffalo_l"

    # Prediction
    cgpa_model_path: str = "models/cgpa/cgpa_model.joblib"
    cgpa_min_semesters: int = 3

    # CORS
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def resolved_model_path(self) -> Path:
        p = Path(self.cgpa_model_path)
        return p if p.is_absolute() else Path(__file__).resolve().parent.parent / p


settings = Settings()