import { z } from "zod";

/**
 * Medical entity types extracted from transcripts.
 * The first five values mirror Spec.md; the extra values let the graph explicitly
 * represent the required Complaint/Prescription/Dosage/Plan node classes.
 */
export const MedicalEntityTypeSchema = z.enum([
  "SYMPTOM",
  "DIAGNOSIS",
  "MEDICATION",
  "ALLERGY",
  "LAB_RESULT",
  "COMPLAINT",
  "PRESCRIPTION",
  "DOSAGE",
  "PLAN",
]);

export const GraphNodeTypeSchema = z.enum([
  "Patient",
  "Session",
  "Complaint",
  "Diagnosis",
  "Prescription",
  "Dosage",
  "Plan",
  "Allergy",
  "LabResult",
  "Medication",
  "Hypothesis",
]);

// Core Patient Entity
export const PatientSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  consentGiven: z.boolean(),
});

// Extracted Entities for cognee.remember()
export const MedicalEntitySchema = z.object({
  type: MedicalEntityTypeSchema,
  value: z.string().min(1),
  timestamp: z.string().datetime(),
  context: z.string().nullish(),
  confidence: z.number().min(0).max(1).nullish(),
});

// Safety Check Response from cognee.recall()
export const SafetyAlertSchema = z.object({
  hasConflict: z.boolean(),
  reason: z.string().nullish(),
  conflictingNodes: z.array(z.string()),
});

export const GraphNodeSchema = z.object({
  id: z.string(),
  type: GraphNodeTypeSchema,
  label: z.string(),
  timestamp: z.string().datetime().nullish(),
  context: z.string().nullish(),
  meta: z.record(z.unknown()).nullish(),
});

export const GraphEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  label: z.string(),
  meta: z.record(z.unknown()).nullish(),
});

export const GraphSchema = z.object({
  nodes: z.array(GraphNodeSchema),
  edges: z.array(GraphEdgeSchema),
});

export const TranscriptionWordSchema = z.object({
  word: z.string(),
  start: z.number(),
  end: z.number(),
  probability: z.number().nullish(),
});

export const TranscriptionSegmentSchema = z.object({
  id: z.number().nullish(),
  start: z.number(),
  end: z.number(),
  text: z.string(),
  words: z.array(TranscriptionWordSchema).nullish(),
});

export const TranscriptionResponseSchema = z.object({
  provider: z.literal("stable-ts"),
  model: z.string(),
  text: z.string(),
  language: z.string().nullish(),
  segments: z.array(TranscriptionSegmentSchema),
  warning: z.string().nullish(),
});

export const RememberRequestSchema = z.object({
  patient: PatientSchema,
  sessionId: z.string().nullish(),
  transcript: z.string().nullish(),
  summary: z.string().nullish(),
  entities: z.array(MedicalEntitySchema),
});

export const ProcessSessionResponseSchema = z.object({
  patient: PatientSchema,
  sessionId: z.string(),
  transcript: z.string(),
  summary: z.string(),
  entities: z.array(MedicalEntitySchema),
  transcription: TranscriptionResponseSchema.nullish(),
  rememberedCount: z.number().int().nonnegative(),
  graph: GraphSchema,
});

export const HistoryResponseSchema = z.object({
  patientId: z.string(),
  query: z.string(),
  timeline: z.array(MedicalEntitySchema),
  graph: GraphSchema,
  rawRecall: z.unknown().optional(),
});

export const ConflictCheckRequestSchema = z.object({
  medication: z.string().min(1),
  dosage: z.string().nullish(),
  context: z.string().nullish(),
  timestamp: z.string().datetime().nullish(),
});

export const ImproveResponseSchema = z.object({
  patientId: z.string(),
  hypotheses: z.array(GraphNodeSchema),
  graph: GraphSchema,
  rawImprove: z.unknown().optional(),
});

export const ForgetResponseSchema = z.object({
  patientId: z.string(),
  dataset: z.string(),
  forgotten: z.boolean(),
});

export type Patient = z.infer<typeof PatientSchema>;
export type MedicalEntity = z.infer<typeof MedicalEntitySchema>;
export type SafetyAlert = z.infer<typeof SafetyAlertSchema>;
export type GraphNode = z.infer<typeof GraphNodeSchema>;
export type GraphEdge = z.infer<typeof GraphEdgeSchema>;
export type Graph = z.infer<typeof GraphSchema>;
export type TranscriptionWord = z.infer<typeof TranscriptionWordSchema>;
export type TranscriptionSegment = z.infer<typeof TranscriptionSegmentSchema>;
export type TranscriptionResponse = z.infer<typeof TranscriptionResponseSchema>;
export type RememberRequest = z.infer<typeof RememberRequestSchema>;
export type ProcessSessionResponse = z.infer<typeof ProcessSessionResponseSchema>;
export type HistoryResponse = z.infer<typeof HistoryResponseSchema>;
export type ConflictCheckRequest = z.infer<typeof ConflictCheckRequestSchema>;
export type ImproveResponse = z.infer<typeof ImproveResponseSchema>;
export type ForgetResponse = z.infer<typeof ForgetResponseSchema>;

export const DEFAULT_DEMO_PATIENT: Patient = {
  id: "demo-patient-001",
  name: "Anna Müller",
  consentGiven: true,
};

export const MEDICAL_DISCLAIMER =
  "Not medical advice. This is an experimental tool for documentation and hackathon purposes only.";
