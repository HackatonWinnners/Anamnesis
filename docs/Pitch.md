# Anamnesis — 3-Minute Video Demo Pitch

## Suggested video title

**Anamnesis — AI Medical Memory System for Continuity of Care**

## Goal

Create a YouTube video demo, not more than **3 minutes**, covering:

- About the project
- Tech stack and architecture
- Demo, if possible
- Learning and growth

---

## 0:00–0:25 — About the project

**Narration:**

> Hi, this is Anamnesis, an AI medical memory system for continuity of care.  
> The problem we are solving is that patient history is often fragmented across visits, notes, medications, lab results, and referrals. Doctors may only have a few minutes before seeing a patient, so important longitudinal context can be missed.  
> Anamnesis converts consultations into structured graph memory, so clinicians can recall patient history, identify safety risks, and connect patterns over time.

**Screen recording:**

- Show the Home page.
- Show the active patient flow.
- Click **Open patient**.

---

## 0:25–1:05 — Tech stack and architecture

**Narration:**

> The app uses a Next.js frontend for the doctor dashboard, a Hono TypeScript API gateway, and a Python FastAPI service for the memory layer. That FastAPI service is the Cognee adapter: it is the only layer that imports Cognee and maps each patient to an isolated dataset such as `patient_<id>`.  
> Audio consultations are processed with local stable-ts transcription. The transcript is passed to a configured LLM for medical entity extraction.  
> Those extracted facts become the payload for Cognee `remember()`: symptoms, diagnoses, medications, allergies, lab results, and follow-up plans are written as typed graph memory nodes linked to the patient and session.  
> During the demo, doctor questions and medication checks use Cognee `recall()` to retrieve relevant graph context, the medical intuition feature uses `improve()` or `memify()` to create hypothesis nodes from longitudinal patterns, and GDPR deletion uses `forget()` to remove the patient's dataset. A small local graph projection mirrors Cognee so the UI can render deterministic nodes and still show a fallback warning if the Cognee SDK is unavailable.

**Screen recording:**

- Show the Session Processing page.
- Point to the pipeline: audio → transcription → LLM extraction → Cognee `remember()`.
- Mention that recall, safety, improve/memify, and forget are routed through the FastAPI Cognee service.
- Optionally show terminal services running.

---

## 1:05–2:20 — Demo

**Narration:**

> Here is the main workflow. First, I can choose or create a patient from the home page.  
> Then I can process a new consultation by recording or uploading audio. The system transcribes the consultation, extracts medical entities, and writes them into the patient graph.  
> Next, the Patient Timeline lets the doctor run natural-language recall queries, for example asking for stomach complaints or sleep-related issues over a time period.  
> The Pre-Session Brief summarizes relevant history before the doctor enters the room.  
> In Medication Safety, the system uses Cognee `recall()` to pull relevant allergies, medications, and risk history, then checks a proposed medication against documented facts and rule-based patterns such as NSAID or aspirin use in patients with ulcer history.  
> Finally, the Memory Graph visualizes patient, session, clinical, and hypothesis nodes mirrored from Cognee graph memory. The medical intuition feature calls Cognee `improve()` or `memify()` and can connect facts over time into doctor-facing hypothesis nodes, such as linking fatigue and low ferritin into a possible longitudinal pattern.

**Screen recording sequence:**

1. Home → click **Open patient**.
2. Select or create a patient.
3. Go to **Session Processing**.
4. Show upload/recording area and extracted result if available.
5. Go to **Patient Timeline** and run a query.
6. Go to **Medication Safety** and check a medication.
7. Go to **Memory Graph**, click **Load graph**, select nodes, and run medical intuition.

---

## 2:20–2:50 — Learning and growth

**Narration:**

> The main learning was how to move from flat transcripts to structured, queryable patient memory.  
> We also learned that user experience matters a lot: the system should not show hardcoded results, should make recall explicit, and should clearly distinguish hypotheses from diagnoses.  
> Future improvements would include stronger clinical safety rules, better patient management, richer graph visualization, and integration with real healthcare record systems.

**Screen recording:**

- Show Memory Graph or Pre-Session Brief.
- Highlight the disclaimer at the bottom.

---

## 2:50–3:00 — Closing

**Narration:**

> In short, Anamnesis helps every consultation improve the patient’s memory graph, making future visits safer, faster, and more context-aware. Thank you.

---

## Short YouTube description

```txt
Anamnesis is an AI medical memory system for continuity of care.

It converts consultation audio into structured graph memory, allowing doctors to recall patient history, review timelines, check medication safety risks, generate pre-session briefs, and identify longitudinal hypothesis patterns.

Tech stack:
- Next.js frontend
- Hono TypeScript API gateway
- Python FastAPI memory service
- stable-ts local transcription
- Configurable LLM-based medical entity extraction
- Cognee graph memory via FastAPI adapter
- Cognee APIs: remember for storing typed patient/session facts, recall for timeline and safety context, improve/memify for longitudinal hypotheses, and forget for GDPR-style patient deletion

Disclaimer: Not medical advice. This is an experimental tool for documentation purposes only.
```

---

## Recording checklist

Before recording:

- Start backend services.
- Open the public app URL.
- Make sure Home → Open patient works.
- Make sure `patient-001` has seeded or processed data.
- Have one successful recall query ready.
- Have Memory Graph ready to load/populate.
- Keep the recording under **3:00**.
- Upload to YouTube as **Unlisted**.
- Submit the YouTube link.
