import { DEFAULT_PATIENT, MEDICAL_DISCLAIMER } from "@anamnesis/shared";

export { DEFAULT_PATIENT, MEDICAL_DISCLAIMER };

export const DEFAULT_RECALL_QUERY = "Show all sleep-related complaints over the last year.";
export const BRIEF_QUERY = "Summarize this patient’s history for a pre-session doctor brief.";
export const PATIENT_DATASET = `patient_${DEFAULT_PATIENT.id}`;
export const DISPLAY_PATIENT_ID = DEFAULT_PATIENT.id;
export const DISPLAY_DATASET = `patient_${DISPLAY_PATIENT_ID}`;

export const patientRows = [
  {
    name: "Anna Müller",
    id: DISPLAY_PATIENT_ID,
    consent: "Consented",
    lastVisit: "2026-06-18",
    sessions: 12,
    alert: "⚠ Aspirin conflict",
  },
  { name: "Jonas Weber", id: "patient-002", consent: "Consented", lastVisit: "2026-06-02", sessions: 4, alert: "None" },
  { name: "Sofia Rossi", id: "patient-003", consent: "Pending", lastVisit: "2026-05-27", sessions: 2, alert: "None" },
];

export function fmtDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 10);
  return d.toISOString().slice(0, 10);
}
