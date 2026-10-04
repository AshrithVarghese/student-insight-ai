"""Training scripts for the CGPA prediction model.

This module lives under training/ and is STRICTLY separate from the inference
API (app/). Models trained here are saved to models/cgpa/ and loaded by the
inference service.

DATASET NOTICE:
Learning from a tiny real-world dataset is unreliable (PLAN.md section 16).
The bundled generator creates SYNTHETIC development data. Any model trained
on it must be treated as a development demo, never as production-grade.
"""

from __future__ import annotations

from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, r2_score, mean_squared_error
from sklearn.model_selection import train_test_split

try:
    from sklearn.ensemble import HistGradientBoostingRegressor
except ImportError:  # renamed in some sklearn versions
    from sklearn.ensemble._hist_gradient_boosting.gradient_boosting import (
        HistGradientBoostingRegressor,
    )

MODELS_DIR = Path(__file__).resolve().parent.parent / "models" / "cgpa"
DATASET_PATH = Path(__file__).resolve().parent / "datasets" / "student_cgpa.csv"

FEATURES = ["previous_cgpa", "attendance", "internal_score", "project_score", "recent_gpa"]
TARGET = "next_cgpa"


def generate_synthetic_data(n: int = 2000, seed: int = 42) -> pd.DataFrame:
    """Generate clearly-labeled synthetic study data for development/demos."""
    rng = np.random.default_rng(seed)

    previous_cgpa = np.clip(rng.normal(7.0, 1.2, n), 0, 10).round(2)
    attendance = np.clip(rng.normal(85, 10, n), 40, 100).round(1)
    internal_score = np.clip(rng.normal(1.5 * previous_cgpa + 10, 6, n), 0, 100).round(1)
    project_score = np.clip(rng.normal(0.8 * internal_score + 10, 8, n), 0, 100).round(1)
    recent_gpa = np.clip(previous_cgpa + rng.normal(0.2, 0.4, n), 0, 10).round(2)

    noise = rng.normal(0, 0.15, n)
    next_cgpa = np.clip(
        0.6 * previous_cgpa
        + 0.15 * recent_gpa
        + 0.02 * (attendance - 75)
        + 0.008 * (internal_score - 60)
        + 0.004 * (project_score - 60)
        + noise,
        0,
        10,
    ).round(2)

    return pd.DataFrame(
        {
            "previous_cgpa": previous_cgpa,
            "attendance": attendance,
            "internal_score": internal_score,
            "project_score": project_score,
            "recent_gpa": recent_gpa,
            "next_cgpa": next_cgpa,
            "source": "SYNTHETIC",
        }
    )


def split_and_train() -> tuple[object, dict]:
    if DATASET_PATH.exists():
        df = pd.read_csv(DATASET_PATH)
    else:
        print("No dataset found; generating synthetic development data...")
        df = generate_synthetic_data()
        DATASET_PATH.parent.mkdir(parents=True, exist_ok=True)
        df.to_csv(DATASET_PATH, index=False)

    X = df[FEATURES]
    y = df[TARGET]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    candidates: list[tuple[str, object]] = [
        ("LinearRegression", LinearRegression()),
        ("RandomForestRegressor", RandomForestRegressor(
            n_estimators=100, random_state=42, n_jobs=-1
        )),
        ("GradientBoostingRegressor", GradientBoostingRegressor(random_state=42)),
        ("HistGradientBoostingRegressor", HistGradientBoostingRegressor(random_state=42)),
    ]

    results: dict[str, dict] = {}

    for name, model in candidates:
        model.fit(X_train, y_train)
        preds = model.predict(X_test)
        results[name] = {
            "mae": mean_absolute_error(y_test, preds),
            "rmse": float(np.sqrt(mean_squared_error(y_test, preds))),
            "r2": r2_score(y_test, preds),
        }
        print(f"{name}: MAE={results[name]['mae']:.4f} RMSE={results[name]['rmse']:.4f} R2={results[name]['r2']:.4f}")

    # Choose the model with the lowest MAE (simple models preferred).
    best_name = min(results, key=lambda k: results[k]["mae"])
    best_model = dict(candidates)[best_name]
    print(f"Selected model: {best_name}")

    # Final fit on all training data (not test data) to avoid leakage.
    best_model.fit(X_train, y_train)

    return best_model, results


def train_and_save(model_path: Path | None = None) -> None:
    path = model_path or MODELS_DIR / "cgpa_model.joblib"
    model, metrics = split_and_train()

    path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, path)
    print(f"Model saved to {path}")

    # Persist evaluation summary alongside the model.
    report_path = path.with_suffix(".json")
    import json

    report_path.write_text(
        json.dumps(metrics, indent=2),
        encoding="utf-8",
    )
    print(f"Evaluation report saved to {report_path}")


if __name__ == "__main__":
    train_and_save()