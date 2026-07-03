from __future__ import annotations

from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class MedicalEntityType(str, Enum):
    SYMPTOM = "SYMPTOM"
    DIAGNOSIS = "DIAGNOSIS"
    MEDICATION = "MEDICATION"
    ALLERGY = "ALLERGY"
    LAB_RESULT = "LAB_RESULT"
    COMPLAINT = "COMPLAINT"
    PRESCRIPTION = "PRESCRIPTION"
    DOSAGE = "DOSAGE"
    PLAN = "PLAN"


class GraphNodeType(str, Enum):
    Patient = "Patient"
    Session = "Session"
    Complaint = "Complaint"
    Diagnosis = "Diagnosis"
    Prescription = "Prescription"
    Dosage = "Dosage"
    Plan = "Plan"
    Allergy = "Allergy"
    LabResult = "LabResult"
    Medication = "Medication"
    Hypothesis = "Hypothesis"


class Patient(BaseModel):
    id: str
    name: str
    consentGiven: bool


class MedicalEntity(BaseModel):
    type: MedicalEntityType
    value: str
    timestamp: str
    context: str | None = None
    confidence: float | None = Field(default=None, ge=0, le=1)


class GraphNode(BaseModel):
    id: str
    type: GraphNodeType
    label: str
    timestamp: str | None = None
    context: str | None = None
    meta: dict[str, Any] | None = None


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    label: str
    meta: dict[str, Any] | None = None


class Graph(BaseModel):
    nodes: list[GraphNode] = Field(default_factory=list)
    edges: list[GraphEdge] = Field(default_factory=list)


class TranscriptionWord(BaseModel):
    word: str
    start: float
    end: float
    probability: float | None = None


class TranscriptionSegment(BaseModel):
    id: int | None = None
    start: float
    end: float
    text: str
    words: list[TranscriptionWord] | None = None


class TranscriptionResponse(BaseModel):
    provider: Literal["stable-ts"] = "stable-ts"
    model: str
    text: str
    language: str | None = None
    segments: list[TranscriptionSegment] = Field(default_factory=list)
    warning: str | None = None


class RememberRequest(BaseModel):
    patient: Patient
    sessionId: str | None = None
    transcript: str | None = None
    summary: str | None = None
    entities: list[MedicalEntity]


class RememberResponse(BaseModel):
    patientId: str
    dataset: str
    rememberedCount: int
    graph: Graph
    backend: str
    rawRemember: Any | None = None
    warning: str | None = None


class RecallRequest(BaseModel):
    patientId: str
    query: str


class HistoryResponse(BaseModel):
    patientId: str
    query: str
    timeline: list[MedicalEntity]
    graph: Graph
    rawRecall: Any | None = None


class ConflictCheckRequest(BaseModel):
    medication: str
    dosage: str | None = None
    context: str | None = None
    timestamp: str | None = None


class SafetyAlert(BaseModel):
    hasConflict: bool
    reason: str | None = None
    conflictingNodes: list[str]


class ImproveRequest(BaseModel):
    patientId: str


class ImproveResponse(BaseModel):
    patientId: str
    hypotheses: list[GraphNode]
    graph: Graph
    rawImprove: Any | None = None
    warning: str | None = None


class ForgetResponse(BaseModel):
    patientId: str
    dataset: str
    forgotten: bool
    rawForget: Any | None = None
    warning: str | None = None


class ProjectionRecord(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    patient: Patient
    dataset: str
    sessions: list[dict[str, Any]] = Field(default_factory=list)
    entities: list[MedicalEntity] = Field(default_factory=list)
    graph: Graph = Field(default_factory=Graph)
