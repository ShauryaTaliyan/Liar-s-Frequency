from __future__ import annotations
import os
from typing import Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from .engine import public_case, interrogate, score_accusation, case_reveal
from .bolna_service import bolna_status, start_test_call

load_dotenv()
app = FastAPI(title="Liar's Frequency API", version="0.1.0", description="Deterministic game engine for Case 001.")
origins = [os.getenv("FRONTEND_ORIGIN", "http://localhost:5173"), "http://127.0.0.1:5173"]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class InterrogationRequest(BaseModel):
    session_id: str = Field(default="demo-session-001", max_length=100)
    suspect_id: str = Field(default="arjun", max_length=30)
    question: str = Field(min_length=1, max_length=1500)
    unlocked_evidence: list[str] = Field(default_factory=list, max_length=9)

class AccusationRequest(BaseModel):
    suspect_id: str = Field(min_length=1, max_length=30)
    evidence_ids: list[str] = Field(default_factory=list, max_length=9)
    unlocked_evidence_ids: list[str] = Field(default_factory=list, max_length=9)
    reasoning: str = Field(default="", max_length=4000)

class TestCallRequest(BaseModel):
    recipient_phone_number: str = Field(min_length=7, max_length=30, description="A phone number you control or have explicit permission to call")

@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "liars-frequency"}

@app.get("/api/case")
def get_case() -> dict[str, Any]:
    return public_case()

@app.get("/api/reveal")
def get_case_reveal() -> dict[str, Any]:
    # The frontend requests this only after the player explicitly selects "Unseal the truth".
    return case_reveal()

@app.post("/api/interrogate")
def post_interrogate(request: InterrogationRequest) -> dict[str, Any]:
    try:
        return interrogate(request.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

@app.post("/api/accuse")
def post_accuse(request: AccusationRequest) -> dict[str, Any]:
    try:
        return score_accusation(request.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

@app.get("/api/bolna/status")
def get_bolna_status() -> dict[str, Any]:
    return bolna_status()

@app.post("/api/bolna/start-call")
async def post_bolna_start_call(request: TestCallRequest) -> dict[str, Any]:
    # This starts an actual outbound call. It is intentionally separate from the in-browser demo path.
    try:
        return await start_test_call(request.recipient_phone_number)
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Could not start Bolna call: {exc}") from exc
