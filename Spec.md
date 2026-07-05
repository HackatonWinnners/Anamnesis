# System Specification: Project "Anamnesis" - AI Medical Consultation Assistant
**Target:** Coding Agent (Cursor, Devin, GitHub Copilot)
**Context:** Healthcare continuity-of-care application. The domain is Healthcare (specifically aimed at the German/European system, e.g., Charité). The core value proposition is utilizing Graph Memory to solve the "Continuity of Care" problem. The application relies heavily on the 4 core Cognee APIs: `remember()`, `recall()`, `improve()/memify()`, and `forget()`.

## 1. Architecture & Tech Stack
*   **Project Name:** Anamnesis (Greek for "recollection", medical term for patient history).
*   **Frontend:** Next.js (React) - focused on the Doctor's Dashboard and Patient Timeline view.
*   **Backend:** Hono or NestJS (TypeScript). *(Note to agent: Use Cognee TS SDK if available, otherwise set up a lightweight Python FastAPI microservice for the Cognee logic).*
*   **AI/LLM:** Configurable LLM provider.
*   **Transcription:** stable-ts / Whisper-compatible local transcription.
*   **Memory/Graph:** Cognee (Self-hosted for Open Source Track and data privacy).

## 2. Core Features (The "Cognee API" Showcase)
The application implements these four pillars:

### Pillar 1: Graph-based Session Structuring (`remember()`)
*   **Flow:** Audio -> Whisper Transcript -> LLM Entity Extraction -> `cognee.remember()`.
*   **Action:** Do not just store text. Break the session into graph nodes: `Complaints`, `Diagnoses`, `Prescriptions`, `Dosages`, `Plans`.

### Pillar 2: Continuity of Care & Conflict Detection (`recall()`)
*   **Flow:** Doctor queries -> `cognee.recall()` (Graph Traversal).
*   **Action:** Before a session, retrieve the patient's history. When a new drug is prescribed, query the graph for past allergies, side effects, or conflicting current medications. Provide a "Safety Alert".
*   **Example query:** "Show all sleep-related complaints over the last year."

### Pillar 3: "Medical Intuition" (`improve()` / `memify()`)
*   **Action:** Use Cognee's self-improving agent capabilities. The agent periodically reviews patient graphs to connect dots (e.g., linking "fatigue in March" and "low ferritin in May" into a single hypothesis node).

### Pillar 4: GDPR "Right to be Forgotten" (`forget()`)
*   **Action:** Crucial for the German medical market. A dedicated endpoint that triggers `cognee.forget(dataset="patient_x")` to surgically remove a patient's entire graph history.

## 3. Secondary Features (If time permits)
1.  **Patient Summary:** Plain-language post-visit summary.
2.  **Pre-Session Brief:** 1-minute summary for the doctor before the patient enters.
3.  **Doctor Handover:** Export/Transfer graph context for specialist referrals.

## 4. Data Models (TypeScript / Zod)
```typescript
import { z } from "zod";

// Core Patient Entity
export const PatientSchema = z.object({
  id: z.string(),
  name: z.string(),
  consentGiven: z.boolean(),
});

// Extracted Entities for cognee.remember()
export const MedicalEntitySchema = z.object({
  type: z.enum(["SYMPTOM", "DIAGNOSIS", "MEDICATION", "ALLERGY", "LAB_RESULT"]),
  value: z.string(),
  timestamp: z.string().datetime(),
  context: z.string().optional(),
});

// Safety Check Response from cognee.recall()
export const SafetyAlertSchema = z.object({
  hasConflict: z.boolean(),
  reason: z.string().optional(),
  conflictingNodes: z.array(z.string()), // e.g., ["Medication: Aspirin", "Condition: Ulcer"]
});
```

## 5. Implementation Steps for the Agent

1.  **Scaffolding:** Initialize the Next.js frontend and Hono/NestJS backend monorepo.
2.  **Self-Hosted Cognee Setup:** Integrate the Cognee SDK. Establish the connection to the self-hosted instance.
3.  **Seed Data Generation:** Write a script to generate a synthetic 2-year medical history (10-15 sessions) for a synthetic patient. Inject this into Cognee using `remember()` to build a rich graph for local visualization.
4.  **Core API Endpoints:**
    *   `POST /api/sessions/process` (Whisper -> LLM -> `remember()`)
    *   `GET /api/patients/:id/history` (`recall()`)
    *   `POST /api/patients/:id/check-conflict` (Real-time `recall()` check)
    *   `DELETE /api/patients/:id` (GDPR `forget()`)
5.  **UI Implementation:** Build a clean dashboard visualizing the patient graph, timeline, and real-time safety alerts.
6.  **Documentation:** Add a prominent disclaimer to the `README.md`: *"Not medical advice. This is an experimental tool for documentation and documentation purposes only."*

## 6. Initial Prompt to the Agent
"Agent, read this specification. Start by initializing the Next.js and Hono monorepo. Then, write the seed data generation script (Step 3) to create a 2-year synthetic patient history that we can feed into Cognee. Let me know when the seed data script is ready."
