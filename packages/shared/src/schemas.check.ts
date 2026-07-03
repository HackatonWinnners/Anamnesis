/**
 * Dependency-free regression check for the shared schemas.
 *
 * Background: the Python (Pydantic) Cognee service serializes unset optional
 * fields as JSON `null`. The shared Zod schemas previously used `.optional()`,
 * which rejects `null`, so `/recall` and `/improve` responses failed validation
 * in apps/api and surfaced as errors in the browser. These fields now use
 * `.nullish()`; this script locks that behavior in.
 *
 * Run with:  node --import tsx packages/shared/src/schemas.check.ts
 */
import {
  HistoryResponseSchema,
  ImproveResponseSchema,
  SafetyAlertSchema,
  ForgetResponseSchema,
  TranscriptionResponseSchema,
} from "./index.js";

let failures = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL - ${name}`);
    console.error(error instanceof Error ? error.message : error);
  }
}

// Mirrors the real Cognee /recall payload: null context/timestamp/meta.
check("recall accepts null optional fields", () => {
  HistoryResponseSchema.parse({
    patientId: "p1",
    query: "sleep",
    timeline: [
      { type: "SYMPTOM", value: "Insomnia", timestamp: "2025-01-01T00:00:00Z", context: null, confidence: null },
    ],
    graph: {
      nodes: [{ id: "n1", type: "Complaint", label: "Insomnia", timestamp: null, context: null, meta: null }],
      edges: [{ id: "e1", source: "n1", target: "n2", label: "MENTIONS", meta: null }],
    },
    rawRecall: null,
  });
});

check("improve accepts null optional fields", () => {
  ImproveResponseSchema.parse({
    patientId: "p1",
    hypotheses: [{ id: "h1", type: "Hypothesis", label: "Pattern", timestamp: null, context: null, meta: null }],
    graph: { nodes: [], edges: [] },
    rawImprove: null,
  });
});

check("safety alert accepts null reason", () => {
  SafetyAlertSchema.parse({ hasConflict: false, reason: null, conflictingNodes: [] });
});

check("forget response parses", () => {
  ForgetResponseSchema.parse({ patientId: "p1", dataset: "patient_p1", forgotten: true });
});

check("transcription accepts null optional fields", () => {
  TranscriptionResponseSchema.parse({
    provider: "stable-ts",
    model: "base",
    text: "hello",
    language: null,
    segments: [{ id: null, start: 0, end: 1, text: "hello", words: null }],
    warning: null,
  });
});

if (failures > 0) {
  // Throwing yields a non-zero exit code without needing Node's `process`
  // global (this package's tsconfig has no node types).
  throw new Error(`${failures} schema check(s) failed.`);
}
console.log("\nAll shared schema checks passed.");
