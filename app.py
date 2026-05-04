"""
Beam Calculator — FastAPI Backend
==================================
Run:
    uvicorn app:app --reload --port 8000

Docs: http://localhost:8000/docs
"""
from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional, Union

import os

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from beam_engine import BeamModel, DirectStiffnessSolver

# ─────────────────────────────────────────────────────────────────────────────
# App & CORS
# ─────────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Beam Calculator API",
    version="1.0.0",
    description="High-end beam analysis using Direct Stiffness Method (FEM).",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # restrict in production (e.g. your Vite dev origin)
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────────────────────────────────────
# Request / Response schemas
# ─────────────────────────────────────────────────────────────────────────────

class SupportIn(BaseModel):
    x:    float
    type: Literal["fixed", "pinned", "roller", "free"]


# Loads are passed as free-form dicts so the frontend can extend them
# without a backend schema change.  Pydantic validates the envelope only.
class AnalyzeRequest(BaseModel):
    length:     float = Field(..., gt=0,   description="Total beam length (m or mm)")
    E:          float = Field(..., gt=0,   description="Young's modulus (MPa or kN/m²)")
    I:          float = Field(..., gt=0,   description="Second moment of area (mm⁴ or m⁴)")
    supports:   List[SupportIn] = Field(..., min_length=1)
    loads:      List[Dict[str, Any]] = Field(default_factory=list)
    n_elements: int = Field(default=200, ge=10, le=2000,
                            description="Number of base FEM elements (more = smoother)")

    model_config = {"json_schema_extra": {
        "example": {
            "length": 10.0,
            "E": 200000,
            "I": 1.5e8,
            "supports": [
                {"x": 0,  "type": "pinned"},
                {"x": 10, "type": "roller"},
            ],
            "loads": [
                {"type": "point",       "x": 5,  "fy": -50},
                {"type": "distributed", "start_x": 0, "end_x": 10, "wy": -10},
            ],
        }
    }}


class AnalyzeResponse(BaseModel):
    # Diagram data (parallel arrays — zip in the frontend)
    x:     List[float]
    V:     List[float]   # Shear force
    M:     List[float]   # Bending moment
    delta: List[float]   # Deflection

    # Support reactions  {"0.0": {"Fy": 75.0, "Mz": 0.0}, ...}
    reactions: Dict[str, Dict[str, float]]

    # Summary values
    max_deflection: float   # most positive (upward)
    min_deflection: float   # most negative (downward)
    max_moment:     float   # max |M|
    max_shear:      float   # max |V|


# ─────────────────────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/health", tags=["meta"])
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.post(
    "/api/analyze",
    response_model=AnalyzeResponse,
    summary="Analyse a beam",
    tags=["beam"],
)
def analyze(req: AnalyzeRequest) -> AnalyzeResponse:
    """
    Perform FEM beam analysis (Direct Stiffness Method).

    Returns dense x-arrays for SFD, BMD, and deflection diagram,
    plus support reactions and summary statistics.
    """
    try:
        model = BeamModel(
            length=req.length,
            E=req.E,
            I=req.I,
            supports=[s.model_dump() for s in req.supports],
            loads=req.loads,
            n_elements=req.n_elements,
        )
        result = DirectStiffnessSolver(model).run()
        return AnalyzeResponse(**result)

    except np.linalg.LinAlgError as exc:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Singular stiffness matrix — the structure may be unstable "
                f"or improperly supported. Detail: {exc}"
            ),
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ─────────────────────────────────────────────────────────────────────────────
# Build & serve frontend
# ─────────────────────────────────────────────────────────────────────────────

_DIST = os.path.join(os.path.dirname(__file__), "frontend", "dist")

if os.path.isdir(_DIST):
    _assets = os.path.join(_DIST, "assets")
    if os.path.isdir(_assets):
        app.mount("/assets", StaticFiles(directory=_assets), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_spa(full_path: str) -> FileResponse:
        candidate = os.path.join(_DIST, full_path)
        if os.path.isfile(candidate):
            return FileResponse(candidate)
        return FileResponse(os.path.join(_DIST, "index.html"))


# ─────────────────────────────────────────────────────────────────────────────
# Dev entry-point
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=5000,
        reload=True,
        reload_includes=["*.py"],
        reload_excludes=["frontend/*"],
    )
