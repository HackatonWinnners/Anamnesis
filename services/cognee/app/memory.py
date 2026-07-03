from __future__ import annotations

import hashlib
import inspect
import json
import os
import re
from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any

try:  # python-dotenv is convenient but optional; the service must import without it.
    from dotenv import load_dotenv
except ModuleNotFoundError:  # pragma: no cover - depends on local install
    def load_dotenv(*_args: Any, **_kwargs: Any) -> bool:
        return False

from .models import (
    ConflictCheckRequest,
    ForgetResponse,
    Graph,
    GraphEdge,
    GraphNode,
    GraphNodeType,
    HistoryResponse,
    ImproveResponse,
    MedicalEntity,
    MedicalEntityType,
    Patient,
    ProjectionRecord,
    RememberRequest,
    RememberResponse,
    SafetyAlert,
)

# Let the service be launched either from the repo root or services/cognee.
ROOT = Path(__file__).resolve().parents[3]
load_dotenv(ROOT / ".env")
load_dotenv(Path.cwd() / ".env")

DEFAULT_DATA_DIR = Path(os.getenv("ANAMNESIS_DATA_DIR", ROOT / "services" / "cognee" / ".data"))


def dataset_for_patient(patient_id: str) -> str:
    safe = re.sub(r"[^a-zA-Z0-9_-]+", "_", patient_id.strip()).strip("_")
    return f"patient_{safe or 'unknown'}"


def stable_id(*parts: object) -> str:
    raw = "|".join(str(part) for part in parts)
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()[:16]


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def parse_iso(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def json_safe(value: Any) -> Any:
    try:
        json.dumps(value)
        return value
    except TypeError:
        if hasattr(value, "model_dump"):
            return value.model_dump()
        if hasattr(value, "dict"):
            return value.dict()
        return repr(value)


def entity_to_node_type(entity_type: MedicalEntityType) -> GraphNodeType:
    return {
        MedicalEntityType.SYMPTOM: GraphNodeType.Complaint,
        MedicalEntityType.COMPLAINT: GraphNodeType.Complaint,
        MedicalEntityType.DIAGNOSIS: GraphNodeType.Diagnosis,
        MedicalEntityType.MEDICATION: GraphNodeType.Prescription,
        MedicalEntityType.PRESCRIPTION: GraphNodeType.Prescription,
        MedicalEntityType.DOSAGE: GraphNodeType.Dosage,
        MedicalEntityType.PLAN: GraphNodeType.Plan,
        MedicalEntityType.ALLERGY: GraphNodeType.Allergy,
        MedicalEntityType.LAB_RESULT: GraphNodeType.LabResult,
    }[entity_type]


class ProjectionStore:
    """Small UI projection of the patient graph.

    Cognee remains the memory engine. This projection is deliberately simple: it
    gives the dashboard deterministic nodes/edges to draw and lets tests run when
    Cognee is not installed yet. GDPR deletion removes this projection too.
    """

    def __init__(self, data_dir: Path = DEFAULT_DATA_DIR):
        self.data_dir = data_dir
        self.data_dir.mkdir(parents=True, exist_ok=True)

    def path_for(self, patient_id: str) -> Path:
        return self.data_dir / "patients" / f"{dataset_for_patient(patient_id)}.json"

    def load(self, patient_id: str) -> ProjectionRecord | None:
        path = self.path_for(patient_id)
        if not path.exists():
            return None
        return ProjectionRecord.model_validate_json(path.read_text())

    def save(self, record: ProjectionRecord) -> None:
        path = self.path_for(record.patient.id)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(record.model_dump_json(indent=2), encoding="utf-8")

    def delete(self, patient_id: str) -> None:
        path = self.path_for(patient_id)
        if path.exists():
            path.unlink()

    def ensure_record(self, patient: Patient) -> ProjectionRecord:
        existing = self.load(patient.id)
        if existing:
            # Keep consent/name fresh if the API supplies updated patient metadata.
            existing.patient = patient
            return existing
        patient_node = GraphNode(
            id=f"patient:{patient.id}",
            type=GraphNodeType.Patient,
            label=patient.name,
            meta={"consentGiven": patient.consentGiven},
        )
        return ProjectionRecord(
            patient=patient,
            dataset=dataset_for_patient(patient.id),
            graph=Graph(nodes=[patient_node], edges=[]),
        )

    def remember(self, request: RememberRequest) -> ProjectionRecord:
        record = self.ensure_record(request.patient)
        session_id = request.sessionId or f"session-{stable_id(request.patient.id, request.summary, utc_now_iso())}"
        first_timestamp = request.entities[0].timestamp if request.entities else utc_now_iso()
        session_node_id = f"session:{session_id}"
        session_node = GraphNode(
            id=session_node_id,
            type=GraphNodeType.Session,
            label=request.summary or f"Clinical session {first_timestamp[:10]}",
            timestamp=first_timestamp,
            context=request.transcript,
            meta={"sessionId": session_id},
        )
        self._upsert_node(record.graph, session_node)
        self._upsert_edge(
            record.graph,
            GraphEdge(
                id=f"edge:{stable_id(request.patient.id, session_id, 'HAS_SESSION')}",
                source=f"patient:{request.patient.id}",
                target=session_node_id,
                label="HAS_SESSION",
            ),
        )

        record.sessions.append(
            {
                "id": session_id,
                "timestamp": first_timestamp,
                "summary": request.summary,
                "transcript": request.transcript,
            }
        )

        for entity in request.entities:
            node_type = entity_to_node_type(entity.type)
            entity_id = f"{node_type.value.lower()}:{stable_id(request.patient.id, entity.type, entity.value, entity.timestamp)}"
            node = GraphNode(
                id=entity_id,
                type=node_type,
                label=entity.value,
                timestamp=entity.timestamp,
                context=entity.context,
                meta={"entityType": entity.type.value, "confidence": entity.confidence},
            )
            self._upsert_node(record.graph, node)
            self._upsert_edge(
                record.graph,
                GraphEdge(
                    id=f"edge:{stable_id(session_node_id, entity_id, 'MENTIONS')}",
                    source=session_node_id,
                    target=entity_id,
                    label="MENTIONS",
                ),
            )

            if entity.type in {MedicalEntityType.MEDICATION, MedicalEntityType.PRESCRIPTION}:
                dosage = self._extract_dosage(entity.value, entity.context)
                if dosage:
                    dosage_id = f"dosage:{stable_id(request.patient.id, entity_id, dosage)}"
                    dosage_node = GraphNode(
                        id=dosage_id,
                        type=GraphNodeType.Dosage,
                        label=dosage,
                        timestamp=entity.timestamp,
                        context=f"Dosage extracted from {entity.value}",
                    )
                    self._upsert_node(record.graph, dosage_node)
                    self._upsert_edge(
                        record.graph,
                        GraphEdge(
                            id=f"edge:{stable_id(entity_id, dosage_id, 'HAS_DOSAGE')}",
                            source=entity_id,
                            target=dosage_id,
                            label="HAS_DOSAGE",
                        ),
                    )

            record.entities.append(entity)

        record.entities.sort(key=lambda e: e.timestamp)
        record.sessions.sort(key=lambda s: s.get("timestamp") or "")
        self.save(record)
        return record

    def recall(self, patient_id: str, query: str) -> tuple[list[MedicalEntity], Graph]:
        record = self.load(patient_id)
        if not record:
            return [], Graph()

        entities = list(record.entities)
        q = query.lower()
        if any(term in q for term in ["sleep", "insomnia", "schlaf", "müd", "fatigue"]):
            entities = [
                entity
                for entity in entities
                if any(term in f"{entity.value} {entity.context or ''}".lower() for term in ["sleep", "insomnia", "schlaf", "fatigue", "müd"])
            ]

        if "last year" in q or "12 months" in q or "letztes jahr" in q:
            cutoff = datetime.now(timezone.utc) - timedelta(days=365)
            entities = [entity for entity in entities if (parse_iso(entity.timestamp) or cutoff) >= cutoff]

        return entities, record.graph

    def improve(self, patient_id: str) -> tuple[list[GraphNode], Graph]:
        record = self.load(patient_id)
        if not record:
            return [], Graph()

        haystacks = [(node, f"{node.label} {node.context or ''}".lower()) for node in record.graph.nodes]
        fatigue_nodes = [node for node, text in haystacks if "fatigue" in text or "müd" in text]
        ferritin_nodes = [node for node, text in haystacks if "ferritin" in text and any(term in text for term in ["low", "niedrig", "reduced", "erniedrigt"])]

        hypotheses: list[GraphNode] = []
        if fatigue_nodes and ferritin_nodes:
            hypothesis = GraphNode(
                id=f"hypothesis:{stable_id(patient_id, 'fatigue-low-ferritin')}",
                type=GraphNodeType.Hypothesis,
                label="Possible iron-deficiency pattern",
                timestamp=utc_now_iso(),
                context="Cognee improve/memify candidate: recurring fatigue plus later low ferritin may represent one longitudinal pattern.",
                meta={"supportingNodeIds": [node.id for node in fatigue_nodes + ferritin_nodes]},
            )
            self._upsert_node(record.graph, hypothesis)
            for support in fatigue_nodes + ferritin_nodes:
                self._upsert_edge(
                    record.graph,
                    GraphEdge(
                        id=f"edge:{stable_id(support.id, hypothesis.id, 'SUPPORTS')}",
                        source=support.id,
                        target=hypothesis.id,
                        label="SUPPORTS",
                    ),
                )
            hypotheses.append(hypothesis)

        self.save(record)
        return hypotheses, record.graph

    def check_conflict(self, patient_id: str, request: ConflictCheckRequest) -> SafetyAlert:
        record = self.load(patient_id)
        if not record:
            return SafetyAlert(hasConflict=False, reason="No patient history found for conflict check.", conflictingNodes=[])

        med = request.medication.strip().lower()
        med_terms = {med}
        aliases = {
            "aspirin": {"aspirin", "asa", "acetylsalicylic", "acetylsalicylic acid"},
            "ibuprofen": {"ibuprofen", "nsaid", "nsar"},
            "naproxen": {"naproxen", "nsaid", "nsar"},
            "diclofenac": {"diclofenac", "nsaid", "nsar"},
        }
        for key, values in aliases.items():
            if key in med or any(value in med for value in values):
                med_terms |= values

        # Only clinical fact nodes can be "conflicting"; Patient/Session are structural.
        clinical_nodes = [
            node
            for node in record.graph.nodes
            if node.type not in {GraphNodeType.Patient, GraphNodeType.Session}
        ]

        conflicts: list[str] = []
        reasons: list[str] = []
        for node in clinical_nodes:
            text = f"{node.label} {node.context or ''}".lower()
            if node.type == GraphNodeType.Allergy and any(term in text for term in med_terms):
                conflicts.append(f"{node.type.value}: {node.label}")
                reasons.append(f"documented allergy/adverse reaction to {request.medication}")

        history_text = "\n".join(f"{node.type.value}: {node.label} {node.context or ''}" for node in clinical_nodes).lower()
        nsaid_like = bool(med_terms & {"aspirin", "asa", "acetylsalicylic", "acetylsalicylic acid", "ibuprofen", "naproxen", "diclofenac", "nsaid", "nsar"})
        ulcer_terms = ["ulcer", "gastric ulcer", "stomach ulcer", "magenulkus", "peptic ulcer"]
        if nsaid_like and any(term in history_text for term in ulcer_terms):
            ulcer_nodes = [node for node in clinical_nodes if any(term in f"{node.label} {node.context or ''}".lower() for term in ulcer_terms)]
            conflicts.extend(f"{node.type.value}: {node.label}" for node in ulcer_nodes)
            reasons.append("history of gastric/peptic ulcer may increase NSAID-related bleeding risk")

        conflicts = list(dict.fromkeys(conflicts))
        reasons = list(dict.fromkeys(reasons))
        return SafetyAlert(
            hasConflict=bool(conflicts),
            reason="; ".join(reasons) if reasons else None,
            conflictingNodes=conflicts,
        )

    @staticmethod
    def _upsert_node(graph: Graph, node: GraphNode) -> None:
        graph.nodes = [existing for existing in graph.nodes if existing.id != node.id]
        graph.nodes.append(node)

    @staticmethod
    def _upsert_edge(graph: Graph, edge: GraphEdge) -> None:
        if not any(existing.id == edge.id for existing in graph.edges):
            graph.edges.append(edge)

    @staticmethod
    def _extract_dosage(value: str, context: str | None) -> str | None:
        text = f"{value} {context or ''}"
        match = re.search(r"\b\d+(?:[.,]\d+)?\s?(?:mg|mcg|µg|g|ml|units?|IU)\b(?:\s+(?:daily|bid|tid|once daily|twice daily))?", text, re.I)
        return match.group(0) if match else None


@dataclass
class CogneeCallResult:
    backend: str
    raw: Any | None = None
    warning: str | None = None


class CogneeAdapter:
    def __init__(self) -> None:
        self._module: Any | None = None
        self._load_warning: str | None = None
        try:
            import cognee  # type: ignore

            self._module = cognee
        except Exception as exc:  # pragma: no cover - depends on local install
            self._load_warning = f"Cognee SDK unavailable; using projection fallback only: {exc}"

    @property
    def available(self) -> bool:
        return self._module is not None

    @property
    def load_warning(self) -> str | None:
        return self._load_warning

    async def remember(self, dataset: str, payload: dict[str, Any]) -> CogneeCallResult:
        return await self._call("remember", dataset, payload)

    async def recall(self, dataset: str, query: str) -> CogneeCallResult:
        return await self._call("recall", dataset, query)

    async def improve(self, dataset: str) -> CogneeCallResult:
        # Some Cognee builds expose memify as the lower-level equivalent.
        result = await self._call("improve", dataset)
        if result.backend == "fallback" and result.warning and "missing" in result.warning.lower():
            return await self._call("memify", dataset)
        return result

    async def forget(self, dataset: str) -> CogneeCallResult:
        return await self._call("forget", dataset)

    async def _call(self, name: str, dataset: str, *args: Any) -> CogneeCallResult:
        if not self._module:
            return CogneeCallResult(backend="fallback", warning=self._load_warning)

        fn = getattr(self._module, name, None)
        if not fn:
            return CogneeCallResult(backend="fallback", warning=f"Cognee SDK missing {name}(); using projection fallback.")

        attempts: list[tuple[tuple[Any, ...], dict[str, Any]]] = []
        if name == "remember":
            payload = args[0]
            attempts.extend(
                [
                    ((payload,), {"dataset": dataset}),
                    ((payload,), {"dataset_name": dataset}),
                    ((payload,), {"datasets": [dataset]}),
                    ((payload, dataset), {}),
                    ((payload,), {}),
                ]
            )
        elif name == "recall":
            query = args[0]
            attempts.extend(
                [
                    ((query,), {"dataset": dataset}),
                    ((query,), {"dataset_name": dataset}),
                    ((query,), {"datasets": [dataset]}),
                    ((query, dataset), {}),
                    ((query,), {}),
                ]
            )
        else:
            attempts.extend(
                [
                    ((), {"dataset": dataset}),
                    ((), {"dataset_name": dataset}),
                    ((), {"datasets": [dataset]}),
                    ((dataset,), {}),
                    ((), {}),
                ]
            )

        last_error: Exception | None = None
        for positional, kwargs in attempts:
            try:
                value = fn(*positional, **kwargs)
                if inspect.isawaitable(value):
                    value = await value
                return CogneeCallResult(backend="cognee", raw=json_safe(value))
            except TypeError as exc:
                last_error = exc
                continue
            except Exception as exc:  # pragma: no cover - external dependency behavior
                last_error = exc
                break

        return CogneeCallResult(
            backend="fallback",
            warning=f"Cognee {name}() failed; using projection fallback. Last error: {last_error}",
        )


class MemoryService:
    def __init__(self, store: ProjectionStore | None = None, cognee: CogneeAdapter | None = None):
        self.store = store or ProjectionStore()
        self.cognee = cognee or CogneeAdapter()

    async def remember(self, request: RememberRequest) -> RememberResponse:
        dataset = dataset_for_patient(request.patient.id)
        payload = {
            "dataset": dataset,
            "patient": request.patient.model_dump(),
            "sessionId": request.sessionId,
            "transcript": request.transcript,
            "summary": request.summary,
            "entities": [entity.model_dump(mode="json") for entity in request.entities],
        }
        cognee_result = await self.cognee.remember(dataset, payload)
        record = self.store.remember(request)
        return RememberResponse(
            patientId=request.patient.id,
            dataset=dataset,
            rememberedCount=len(request.entities),
            graph=record.graph,
            backend=cognee_result.backend,
            rawRemember=cognee_result.raw,
            warning=cognee_result.warning,
        )

    async def recall(self, request: "RecallRequest") -> HistoryResponse:  # type: ignore[name-defined]
        dataset = dataset_for_patient(request.patientId)
        cognee_result = await self.cognee.recall(dataset, request.query)
        timeline, graph = self.store.recall(request.patientId, request.query)
        return HistoryResponse(
            patientId=request.patientId,
            query=request.query,
            timeline=timeline,
            graph=graph,
            rawRecall=cognee_result.raw or cognee_result.warning,
        )

    async def check_conflict(self, patient_id: str, request: ConflictCheckRequest) -> SafetyAlert:
        # Call recall first to satisfy the pillar and populate raw graph memory caches in
        # Cognee implementations that do query-time indexing.
        await self.cognee.recall(
            dataset_for_patient(patient_id),
            f"Find allergies, adverse reactions, ulcers, bleeding risk, and current medications relevant to {request.medication}.",
        )
        return self.store.check_conflict(patient_id, request)

    async def improve(self, patient_id: str) -> ImproveResponse:
        dataset = dataset_for_patient(patient_id)
        cognee_result = await self.cognee.improve(dataset)
        hypotheses, graph = self.store.improve(patient_id)
        return ImproveResponse(
            patientId=patient_id,
            hypotheses=hypotheses,
            graph=graph,
            rawImprove=cognee_result.raw,
            warning=cognee_result.warning,
        )

    async def forget(self, patient_id: str) -> ForgetResponse:
        dataset = dataset_for_patient(patient_id)
        cognee_result = await self.cognee.forget(dataset)
        self.store.delete(patient_id)
        return ForgetResponse(
            patientId=patient_id,
            dataset=dataset,
            forgotten=True,
            rawForget=cognee_result.raw,
            warning=cognee_result.warning,
        )
