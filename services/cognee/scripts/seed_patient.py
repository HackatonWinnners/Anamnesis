#!/usr/bin/env python
from __future__ import annotations

import argparse
import asyncio
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

from app.memory import MemoryService  # noqa: E402
from app.models import MedicalEntity, MedicalEntityType, Patient, RememberRequest  # noqa: E402


def iso_days_ago(days: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=days)).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def entity(entity_type: MedicalEntityType, value: str, days_ago: int, context: str | None = None) -> MedicalEntity:
    return MedicalEntity(
        type=entity_type,
        value=value,
        timestamp=iso_days_ago(days_ago),
        context=context,
        confidence=0.95,
    )


def synthetic_sessions(patient: Patient) -> list[RememberRequest]:
    """A 2-year, coherent history with built-in demo hooks.

    Hooks:
    - sleep complaints across the last year for recall()
    - fatigue + low ferritin for improve()/memify()
    - gastric ulcer history for aspirin/NSAID conflict detection
    """

    return [
        RememberRequest(
            patient=patient,
            sessionId="demo-visit-01",
            transcript="Annual check-up. Patient reports seasonal allergies and occasional headaches.",
            summary="Annual check-up with allergy history documented.",
            entities=[
                entity(MedicalEntityType.ALLERGY, "Penicillin allergy", 720, "Rash reported in childhood"),
                entity(MedicalEntityType.SYMPTOM, "Occasional headaches", 720, "Mild, tension-like"),
                entity(MedicalEntityType.PLAN, "Monitor headaches and hydration", 720),
            ],
        ),
        RememberRequest(
            patient=patient,
            sessionId="demo-visit-02",
            transcript="Epigastric pain after NSAID use; diagnosed likely gastric ulcer and started pantoprazole.",
            summary="Gastric ulcer history after NSAID exposure.",
            entities=[
                entity(MedicalEntityType.SYMPTOM, "Epigastric pain", 650, "Worse after ibuprofen"),
                entity(MedicalEntityType.DIAGNOSIS, "Gastric ulcer", 650, "Avoid NSAIDs where possible"),
                entity(MedicalEntityType.MEDICATION, "Pantoprazole 40 mg daily", 650, "Started for ulcer protection"),
                entity(MedicalEntityType.PLAN, "Avoid NSAIDs and reassess in 6 weeks", 650),
            ],
        ),
        RememberRequest(
            patient=patient,
            sessionId="demo-visit-03",
            transcript="Ulcer symptoms improved. Blood pressure slightly elevated.",
            summary="Ulcer follow-up improved; blood pressure monitoring started.",
            entities=[
                entity(MedicalEntityType.DIAGNOSIS, "Resolved gastric ulcer symptoms", 580),
                entity(MedicalEntityType.SYMPTOM, "Elevated home blood pressure readings", 580),
                entity(MedicalEntityType.PLAN, "Home blood pressure diary", 580),
            ],
        ),
        RememberRequest(
            patient=patient,
            sessionId="demo-visit-04",
            transcript="Patient describes increasing fatigue over several weeks, no fever, no weight loss.",
            summary="First fatigue presentation.",
            entities=[
                entity(MedicalEntityType.SYMPTOM, "Fatigue", 500, "Several weeks, worse in afternoons"),
                entity(MedicalEntityType.PLAN, "Check CBC, ferritin, TSH", 500),
            ],
        ),
        RememberRequest(
            patient=patient,
            sessionId="demo-visit-05",
            transcript="Lab review shows low ferritin. Discussed iron-rich diet and oral iron trial.",
            summary="Low ferritin documented after fatigue complaint.",
            entities=[
                entity(MedicalEntityType.LAB_RESULT, "Low ferritin 9 ng/mL", 430, "Hemoglobin borderline normal"),
                entity(MedicalEntityType.MEDICATION, "Oral iron 100 mg every other day", 430, "Trial for iron deficiency"),
                entity(MedicalEntityType.PLAN, "Repeat ferritin in 8-12 weeks", 430),
            ],
        ),
        RememberRequest(
            patient=patient,
            sessionId="demo-visit-06",
            transcript="Patient reports difficulty falling asleep during stressful work period.",
            summary="Initial sleep complaint during stress.",
            entities=[
                entity(MedicalEntityType.SYMPTOM, "Difficulty falling asleep", 340, "Work stress; no snoring reported"),
                entity(MedicalEntityType.PLAN, "Sleep hygiene counselling", 340),
            ],
        ),
        RememberRequest(
            patient=patient,
            sessionId="demo-visit-07",
            transcript="Follow-up after iron therapy. Energy improved, ferritin rising.",
            summary="Fatigue improved with iron supplementation.",
            entities=[
                entity(MedicalEntityType.SYMPTOM, "Fatigue improved", 300, "Better exercise tolerance"),
                entity(MedicalEntityType.LAB_RESULT, "Ferritin improved to 22 ng/mL", 300),
                entity(MedicalEntityType.PLAN, "Continue oral iron for 3 more months", 300),
            ],
        ),
        RememberRequest(
            patient=patient,
            sessionId="demo-visit-08",
            transcript="Second sleep visit. Waking at 3 AM several times per week.",
            summary="Sleep maintenance insomnia documented.",
            entities=[
                entity(MedicalEntityType.SYMPTOM, "Waking at 3 AM", 240, "Occurs three nights per week"),
                entity(MedicalEntityType.DIAGNOSIS, "Insomnia symptoms", 240, "Likely stress-related"),
                entity(MedicalEntityType.PLAN, "CBT-I resources provided", 240),
            ],
        ),
        RememberRequest(
            patient=patient,
            sessionId="demo-visit-09",
            transcript="Migraine-like headaches increased. Avoided aspirin because of ulcer history.",
            summary="Headache treatment constrained by ulcer history.",
            entities=[
                entity(MedicalEntityType.SYMPTOM, "Migraine-like headaches", 180, "Photophobia, no focal neuro symptoms"),
                entity(MedicalEntityType.PLAN, "Use paracetamol first-line; avoid aspirin/NSAIDs", 180),
            ],
        ),
        RememberRequest(
            patient=patient,
            sessionId="demo-visit-10",
            transcript="Sleep improved but still fragmented before exams.",
            summary="Recurrent sleep fragmentation.",
            entities=[
                entity(MedicalEntityType.SYMPTOM, "Fragmented sleep", 120, "Exam-related anxiety"),
                entity(MedicalEntityType.PLAN, "Continue sleep diary", 120),
            ],
        ),
        RememberRequest(
            patient=patient,
            sessionId="demo-visit-11",
            transcript="New allergic rhinitis flare. Started cetirizine.",
            summary="Allergic rhinitis flare treated.",
            entities=[
                entity(MedicalEntityType.DIAGNOSIS, "Allergic rhinitis", 60, "Spring pollen season"),
                entity(MedicalEntityType.MEDICATION, "Cetirizine 10 mg daily", 60, "As needed during pollen season"),
            ],
        ),
        RememberRequest(
            patient=patient,
            sessionId="demo-visit-12",
            transcript="Most recent visit. Patient again asks about sleep, averaging 5 hours per night.",
            summary="Recent short sleep duration.",
            entities=[
                entity(MedicalEntityType.SYMPTOM, "Short sleep duration", 14, "Averaging 5 hours per night"),
                entity(MedicalEntityType.PLAN, "Review caffeine, screens, and consider CBT-I referral", 14),
            ],
        ),
    ]


async def main() -> None:
    parser = argparse.ArgumentParser(description="Seed a synthetic 2-year Cognee graph for the Anamnesis demo patient.")
    parser.add_argument("--patient-id", default="demo-patient-001")
    parser.add_argument("--patient-name", default="Anna Müller")
    parser.add_argument("--forget-first", action="store_true", help="Delete any existing demo graph before seeding.")
    parser.add_argument("--improve", action="store_true", help="Run improve/memify after seeding.")
    args = parser.parse_args()

    patient = Patient(id=args.patient_id, name=args.patient_name, consentGiven=True)
    service = MemoryService()

    if args.forget_first:
        await service.forget(patient.id)

    sessions = synthetic_sessions(patient)
    for request in sessions:
        response = await service.remember(request)
        print(f"remembered {request.sessionId}: {response.rememberedCount} entities via {response.backend}")
        if response.warning:
            print(f"  warning: {response.warning}")

    if args.improve:
        improve = await service.improve(patient.id)
        print(f"created/updated {len(improve.hypotheses)} hypothesis node(s)")

    history = await service.recall(type("Recall", (), {"patientId": patient.id, "query": "Show all sleep-related complaints over the last year."})())
    print("\nSeed complete")
    print(f"patientId={patient.id}")
    print(f"sessions={len(sessions)}")
    print(f"sleep_related_last_year={len(history.timeline)}")
    print("demo conflict medication: Aspirin 500 mg")


if __name__ == "__main__":
    asyncio.run(main())
