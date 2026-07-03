from __future__ import annotations

import pytest

from app.memory import CogneeAdapter, MemoryService, ProjectionStore
from app.models import ConflictCheckRequest, MedicalEntity, MedicalEntityType, Patient, RememberRequest


class NoopCognee(CogneeAdapter):
    def __init__(self) -> None:
        self._module = None
        self._load_warning = "test fallback"


@pytest.mark.asyncio
async def test_conflict_improve_and_forget(tmp_path):
    service = MemoryService(store=ProjectionStore(tmp_path), cognee=NoopCognee())
    patient = Patient(id="p1", name="Test Patient", consentGiven=True)

    await service.remember(
        RememberRequest(
            patient=patient,
            sessionId="s1",
            summary="ulcer and fatigue",
            entities=[
                MedicalEntity(type=MedicalEntityType.DIAGNOSIS, value="Gastric ulcer", timestamp="2025-01-01T00:00:00Z"),
                MedicalEntity(type=MedicalEntityType.SYMPTOM, value="Fatigue", timestamp="2025-02-01T00:00:00Z"),
                MedicalEntity(type=MedicalEntityType.LAB_RESULT, value="Low ferritin 8 ng/mL", timestamp="2025-03-01T00:00:00Z"),
            ],
        )
    )

    alert = await service.check_conflict("p1", ConflictCheckRequest(medication="Aspirin 500 mg"))
    assert alert.hasConflict is True
    assert any("ulcer" in node.lower() for node in alert.conflictingNodes)

    improved = await service.improve("p1")
    assert len(improved.hypotheses) == 1
    assert improved.hypotheses[0].type == "Hypothesis"

    await service.forget("p1")
    history = await service.recall(type("Recall", (), {"patientId": "p1", "query": "all history"})())
    assert history.timeline == []
    assert history.graph.nodes == []
