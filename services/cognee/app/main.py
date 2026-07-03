from __future__ import annotations

import os
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware

from .memory import MemoryService, dataset_for_patient
from .models import (
    ConflictCheckRequest,
    ForgetResponse,
    HistoryResponse,
    ImproveRequest,
    ImproveResponse,
    RecallRequest,
    RememberRequest,
    RememberResponse,
    SafetyAlert,
    TranscriptionResponse,
)
from .transcription import StableTsError, StableTsTranscriber

app = FastAPI(
    title="Anamnesis Cognee Memory Service",
    description="Internal FastAPI wrapper around Cognee remember/recall/improve/forget for the Anamnesis MVP.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

memory = MemoryService()
transcriber = StableTsTranscriber()


@app.get("/health")
async def health() -> dict[str, object]:
    return {
        "ok": True,
        "service": "anamnesis-cognee",
        "cogneeAvailable": memory.cognee.available,
        "transcription": transcriber.health(),
        "warning": memory.cognee.load_warning,
    }


@app.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe(
    audio: UploadFile = File(...),
    language: str | None = Form(default=None),
) -> TranscriptionResponse:
    suffix = Path(audio.filename or "audio.wav").suffix or ".wav"
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp_path = tmp.name
            tmp.write(await audio.read())

        return await run_in_threadpool(transcriber.transcribe_path, tmp_path, language=language)
    except StableTsError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    finally:
        if tmp_path:
            try:
                os.unlink(tmp_path)
            except FileNotFoundError:
                pass


@app.post("/remember", response_model=RememberResponse)
async def remember(request: RememberRequest) -> RememberResponse:
    return await memory.remember(request)


@app.post("/recall", response_model=HistoryResponse)
async def recall(request: RecallRequest) -> HistoryResponse:
    return await memory.recall(request)


@app.post("/check-conflict/{patient_id}", response_model=SafetyAlert)
async def check_conflict(patient_id: str, request: ConflictCheckRequest) -> SafetyAlert:
    return await memory.check_conflict(patient_id, request)


@app.post("/improve", response_model=ImproveResponse)
async def improve(request: ImproveRequest) -> ImproveResponse:
    return await memory.improve(request.patientId)


@app.delete("/forget/{patient_id}", response_model=ForgetResponse)
async def forget(patient_id: str) -> ForgetResponse:
    return await memory.forget(patient_id)


@app.get("/datasets/{patient_id}")
async def dataset_name(patient_id: str) -> dict[str, str]:
    return {"patientId": patient_id, "dataset": dataset_for_patient(patient_id)}
