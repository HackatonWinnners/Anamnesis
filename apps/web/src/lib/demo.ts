import { DEFAULT_DEMO_PATIENT, MEDICAL_DISCLAIMER } from "@anamnesis/shared";

export { DEFAULT_DEMO_PATIENT, MEDICAL_DISCLAIMER };

export const DEMO_QUERY = "Show all sleep-related complaints over the last year.";
export const BRIEF_QUERY = "Summarize this patient’s history for a pre-session doctor brief.";
export const DEMO_DATASET = `patient_${DEFAULT_DEMO_PATIENT.id}`;

export const demoPatients = [
  {
    name: "Anna Müller",
    id: "demo-patient-001",
    consent: "Consented",
    lastVisit: "2026-06-18",
    sessions: 12,
    alert: "⚠ Aspirin conflict",
  },
  { name: "Jonas Weber", id: "demo-patient-002", consent: "Consented", lastVisit: "2026-06-02", sessions: 4, alert: "None" },
  { name: "Sofia Rossi", id: "demo-patient-003", consent: "Pending", lastVisit: "2026-05-27", sessions: 2, alert: "None" },
];

export const demoExtractedEntities = [
  ["symptom", "Fragmented sleep, 3–4 awakenings/night", "00:02:14", "ongoing 2 months", "0.94"],
  ["complaint", "Daytime tiredness", "00:03:02", "improved vs. last visit", "0.91"],
  ["diagnosis", "Resolved gastric ulcer symptoms", "00:05:40", "no pain post-treatment", "0.88"],
  ["medication", "Ferrous sulfate", "00:06:12", "ongoing supplementation", "0.95"],
  ["prescription", "Pantoprazole — course completed", "00:05:55", "discontinue", "0.90"],
  ["dosage", "Ferrous sulfate 325 mg daily", "00:06:20", "with vitamin C", "0.93"],
  ["allergy", "Allergic rhinitis (grass pollen)", "00:08:01", "seasonal, stable", "0.89"],
  ["lab result", "Ferritin 22 ng/mL", "00:07:10", "up from 9 ng/mL", "0.97"],
  ["plan", "Repeat ferritin in 8 weeks; sleep diary", "00:09:30", "follow-up", "0.92"],
] as const;

export const demoTimelineRows = [
  ["2026-06-18", "Follow-up, sleep + iron", "complaint", "Fragmented sleep 3–4×/night", "ongoing 2 months, improving", "sleep-04, sess-12"],
  ["2026-04-30", "Fatigue re-check", "complaint", "Fatigue improved", "after iron supplementation", "fatigue-03, hyp-01"],
  ["2026-04-30", "Fatigue re-check", "lab result", "Ferritin 22 ng/mL", "improved from 9 ng/mL", "lab-05, hyp-01"],
  ["2026-02-11", "Tiredness work-up", "lab result", "Low ferritin 9 ng/mL", "iron deficiency suspected", "lab-04, hyp-01"],
  ["2026-01-08", "Sleep complaint intake", "complaint", "Difficulty maintaining sleep", "onset ~1 year ago", "sleep-02, sess-08"],
  ["2025-10-02", "Ulcer follow-up", "plan", "Avoid NSAIDs / aspirin", "gastric ulcer history", "plan-02, dx-02"],
  ["2025-06-14", "Seasonal symptoms", "allergy", "Allergic rhinitis", "grass pollen, seasonal", "alrg-01"],
  ["2025-03-20", "Epigastric pain", "diagnosis", "Gastric ulcer", "H. pylori negative", "dx-02, rx-01"],
  ["2025-03-20", "Epigastric pain", "prescription", "Pantoprazole 40 mg daily", "8-week course", "rx-01, dose-01"],
] as const;

export function fmtDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 10);
  return d.toISOString().slice(0, 10);
}
