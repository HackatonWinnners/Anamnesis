import { config } from "dotenv";
import { Hono } from "hono";
import type { Context } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import OpenAI from "openai";
import { z } from "zod";
import {
  ConflictCheckRequestSchema,
  DEFAULT_PATIENT,
  ForgetResponseSchema,
  GraphSchema,
  HistoryResponseSchema,
  ImproveResponseSchema,
  MEDICAL_DISCLAIMER,
  MedicalEntitySchema,
  PatientSchema,
  ProcessSessionResponseSchema,
  RememberRequestSchema,
  SafetyAlertSchema,
  TranscriptionResponseSchema,
} from "@anamnesis/shared";

config();
config({ path: "../../.env", override: false });

const COGNEE_SERVICE_URL = process.env.COGNEE_SERVICE_URL ?? "http://localhost:8001";

function envValue(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

// LLM provider is configurable so the extraction step can run against OpenAI
// (GPT-4o) or any OpenAI-compatible endpoint such as Sakana Fugu.
// Resolution order:
//   - explicit LLM_BASE_URL / LLM_API_KEY / LLM_MODEL win
//   - otherwise, if a Sakana key is present (and no OpenAI key), use Fugu
//   - otherwise, default to OpenAI GPT-4o
const HAS_OPENAI = Boolean(envValue("OPENAI_API_KEY"));
const HAS_SAKANA = Boolean(envValue("SAKANA_API_KEY"));
const USE_SAKANA = !HAS_OPENAI && HAS_SAKANA;

const LLM_BASE_URL =
  envValue("LLM_BASE_URL") ?? (USE_SAKANA ? "https://api.sakana.ai/v1" : undefined);
const LLM_API_KEY =
  envValue("LLM_API_KEY") ?? envValue("OPENAI_API_KEY") ?? envValue("SAKANA_API_KEY");
const LLM_MODEL =
  envValue("LLM_MODEL") ?? (LLM_BASE_URL?.includes("sakana") ? "fugu" : "gpt-4o");
// Fugu (and Fugu Ultra especially) can take a while; give the client headroom.
const LLM_TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS ?? 180000);

// Allowed medical entity types (used by the extraction schema/normalizer).
const entityTypes = [
  "SYMPTOM",
  "DIAGNOSIS",
  "MEDICATION",
  "ALLERGY",
  "LAB_RESULT",
  "COMPLAINT",
  "PRESCRIPTION",
  "DOSAGE",
  "PLAN",
] as const;

export const app = new Hono();

app.use("*", logger());

// Explicit CORS allow-list from env (comma-separated), e.g.
//   CORS_ORIGINS="https://app.example.com,https://admin.example.com"
const EXPLICIT_CORS_ORIGINS = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

// Any localhost/127.0.0.1/[::1] origin on any port is allowed for local dev.
// This prevents "Failed to fetch" when the web app runs on a non-3000 port
// (Next.js falls back to 3001+ when 3000 is busy) or via 127.0.0.1.
const LOCAL_ORIGIN_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

function resolveCorsOrigin(origin: string): string | null {
  // Non-browser clients (curl, server-to-server) send no Origin header.
  // Returning the requested origin keeps credentialed requests working.
  if (!origin) return "*";
  if (LOCAL_ORIGIN_PATTERN.test(origin)) return origin;
  if (EXPLICIT_CORS_ORIGINS.includes(origin)) return origin;
  return null;
}

app.use(
  "*",
  cors({
    origin: (origin) => resolveCorsOrigin(origin),
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
  }),
);

class PublicApiError extends Error {
  constructor(
    message: string,
    public readonly status = 500,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

function openaiClient(): OpenAI {
  if (!LLM_API_KEY) {
    throw new PublicApiError(
      "No LLM credential configured. Set OPENAI_API_KEY (GPT-4o) or SAKANA_API_KEY (Fugu), or LLM_API_KEY with LLM_BASE_URL.",
      500,
    );
  }
  return new OpenAI({
    apiKey: LLM_API_KEY,
    baseURL: LLM_BASE_URL,
    timeout: LLM_TIMEOUT_MS,
    // Some OpenAI-compatible gateways (e.g. the Sakana Fugu proxy) run a WAF
    // that blocks the SDK's default `User-Agent: OpenAI/JS <ver>`. Override it
    // with a neutral UA so requests aren't rejected with 403.
    defaultHeaders: { "User-Agent": "anamnesis-api/0.1" },
  });
}

// JSON schema used with providers that support strict structured outputs.
const EXTRACTION_JSON_SCHEMA = {
  name: "anamnesis_medical_extraction",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["summary", "entities"],
    properties: {
      summary: {
        type: "string",
        description: "One concise doctor-facing clinical summary of the visit.",
      },
      entities: {
        type: "array",
        description: "Typed facts to be written to Cognee graph memory.",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["type", "value", "timestamp", "context", "confidence"],
          properties: {
            type: { type: "string", enum: entityTypes },
            value: { type: "string" },
            timestamp: {
              type: "string",
              description:
                "ISO-8601 timestamp. Use the supplied session timestamp unless the transcript clearly gives a different date.",
            },
            context: { type: ["string", "null"] },
            confidence: { type: ["number", "null"], minimum: 0, maximum: 1 },
          },
        },
      },
    },
  },
} as const;

// Pull the first JSON object out of a model response that may be wrapped in
// markdown fences or prose (non-strict providers).
function stripToJson(text: string): string {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  let out = fence ? fence[1] : text;
  const start = out.indexOf("{");
  const end = out.lastIndexOf("}");
  if (start >= 0 && end > start) out = out.slice(start, end + 1);
  return out.trim();
}

async function jsonOrThrow(response: Response): Promise<unknown> {
  const text = await response.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // Keep raw text in the error.
  }
  if (!response.ok) {
    throw new PublicApiError(`Cognee service error ${response.status}`, response.status, body);
  }
  return body;
}

async function cogneeFetch(path: string, init: RequestInit): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${COGNEE_SERVICE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });
  } catch (error) {
    // The Cognee service is unreachable (not started, wrong URL, crashed).
    // Surface a clear 502 so the browser sees an actionable JSON error with
    // CORS headers instead of a network failure ("Failed to fetch").
    throw new PublicApiError(
      `Cognee memory service is unreachable at ${COGNEE_SERVICE_URL}. Start it with \`pnpm dev:cognee\`.`,
      502,
      { cause: String(error), url: `${COGNEE_SERVICE_URL}${path}` },
    );
  }
  return jsonOrThrow(response);
}

function safeJson(c: Context, error: unknown) {
  if (error instanceof z.ZodError) {
    return c.json({ error: "Validation failed", details: error.flatten() }, 400);
  }
  if (error instanceof PublicApiError) {
    return c.json({ error: error.message, details: error.details }, error.status as never);
  }
  console.error(error);
  return c.json({ error: "Unexpected API error" }, 500);
}

const extractionEnvelopeSchema = z.object({
  summary: z.string().min(1),
  entities: z.array(MedicalEntitySchema),
});

type ExtractionEnvelope = z.infer<typeof extractionEnvelopeSchema>;

async function transcribeAudio(audioFile: File) {
  const form = new FormData();
  form.set("audio", audioFile, audioFile.name || "session-audio.wav");

  let response: Response;
  try {
    response = await fetch(`${COGNEE_SERVICE_URL}/transcribe`, {
      method: "POST",
      body: form,
    });
  } catch (error) {
    throw new PublicApiError(
      `Cognee memory service is unreachable at ${COGNEE_SERVICE_URL}. Start it with \`pnpm dev:cognee\`.`,
      502,
      { cause: String(error), url: `${COGNEE_SERVICE_URL}/transcribe` },
    );
  }
  const body = await jsonOrThrow(response);
  return TranscriptionResponseSchema.parse(body);
}

async function extractMedicalEntities(transcript: string, timestamp: string): Promise<ExtractionEnvelope> {
  const openai = openaiClient();
  const systemPrompt = [
    "You extract structured medical documentation for a doctor-facing continuity-of-care graph.",
    "Capture complaints/symptoms, diagnoses, medications/prescriptions, dosages, allergies, lab results, and follow-up plans.",
    "Never provide patient-facing medical advice or recommendations beyond what is explicitly in the transcript.",
  ].join(" ");
  const schemaHint = [
    "Return ONLY a single JSON object, no markdown, matching exactly:",
    `{"summary": string, "entities": [{"type": one of ${entityTypes.join("|")},`,
    '"value": string, "timestamp": ISO-8601 string, "context": string|null, "confidence": number 0..1|null}]}',
    "Use the supplied session timestamp unless the transcript clearly gives a different date.",
  ].join(" ");
  const messages = [
    { role: "system" as const, content: `${systemPrompt} ${schemaHint}` },
    { role: "user" as const, content: `Session timestamp: ${timestamp}\n\nTranscript:\n${transcript}` },
  ];
  const base = { model: LLM_MODEL, temperature: 0, messages } as const;

  // Try, in order: strict JSON schema → json_object mode → plain text.
  // OpenAI supports strict schema; Fugu / other OpenAI-compatible providers may
  // only support a subset, so we degrade gracefully and still parse JSON out.
  const attempts: Array<Record<string, unknown>> = [
    { ...base, response_format: { type: "json_schema", json_schema: EXTRACTION_JSON_SCHEMA } },
    { ...base, response_format: { type: "json_object" } },
    { ...base },
  ];

  let content: string | null = null;
  let lastError: unknown = null;
  for (const req of attempts) {
    try {
      const completion = await openai.chat.completions.create(req as never);
      content = completion.choices[0]?.message?.content ?? null;
      if (content) break;
    } catch (error) {
      lastError = error;
    }
  }
  if (!content) {
    throw new PublicApiError(
      `${LLM_MODEL} returned no extraction content.`,
      502,
      lastError ? { cause: String(lastError) } : undefined,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripToJson(content));
  } catch (error) {
    throw new PublicApiError(`${LLM_MODEL} did not return valid JSON.`, 502, {
      cause: String(error),
      raw: content.slice(0, 400),
    });
  }
  const normalized = z
    .object({
      summary: z.string(),
      entities: z.array(
        z
          .object({
            type: z.enum(entityTypes),
            value: z.string(),
            timestamp: z.string().optional(),
            context: z.string().nullable().optional(),
            confidence: z.number().nullable().optional(),
          })
          .transform((entity) => ({
            ...entity,
            timestamp: entity.timestamp ?? timestamp,
            context: entity.context ?? undefined,
            confidence: entity.confidence ?? undefined,
          })),
      ),
    })
    .parse(parsed);

  return extractionEnvelopeSchema.parse(normalized);
}

app.get("/api/health", async (c) => {
  const cogneeHealth = await fetch(`${COGNEE_SERVICE_URL}/health`)
    .then((response) => response.json())
    .catch((error) => ({ ok: false, error: String(error) }));
  return c.json({ ok: true, service: "anamnesis-api", disclaimer: MEDICAL_DISCLAIMER, cognee: cogneeHealth });
});

app.post("/api/sessions/process", async (c) => {
  const form = await c.req.formData();
  const patientId = String(form.get("patientId") ?? DEFAULT_PATIENT.id);
  const patientName = String(form.get("patientName") ?? DEFAULT_PATIENT.name);
  const consentGiven = String(form.get("consentGiven") ?? "true") === "true";
  const sessionId = String(form.get("sessionId") ?? `session-${Date.now()}`);
  const timestamp = String(form.get("timestamp") ?? new Date().toISOString());
  const audio = form.get("audio");

  const patient = PatientSchema.parse({ id: patientId, name: patientName, consentGiven });
  if (!patient.consentGiven) {
    throw new PublicApiError("Patient consent is required before writing graph memory.", 400);
  }
  if (!(audio instanceof File) || audio.size === 0) {
    throw new PublicApiError("An audio file field named 'audio' is required.", 400);
  }

  const transcription = await transcribeAudio(audio);
  const transcript = transcription.text;
  const extraction = await extractMedicalEntities(transcript, timestamp);
  const rememberPayload = RememberRequestSchema.parse({
    patient,
    sessionId,
    transcript,
    summary: extraction.summary,
    entities: extraction.entities,
  });

  const remembered = await cogneeFetch("/remember", {
    method: "POST",
    body: JSON.stringify(rememberPayload),
  });
  const rememberedShape = z
    .object({
      rememberedCount: z.number(),
      graph: GraphSchema,
    })
    .passthrough()
    .parse(remembered);

  return c.json(
    ProcessSessionResponseSchema.parse({
      patient,
      sessionId,
      transcript,
      summary: extraction.summary,
      entities: extraction.entities,
      transcription,
      rememberedCount: rememberedShape.rememberedCount,
      graph: rememberedShape.graph,
    }),
  );
});

app.get("/api/patients/:id/history", async (c) => {
  const patientId = c.req.param("id");
  const query = c.req.query("q") ?? "Summarize this patient's history for a pre-session doctor brief.";
  const response = await cogneeFetch("/recall", {
    method: "POST",
    body: JSON.stringify({ patientId, query }),
  });
  return c.json(HistoryResponseSchema.parse(response));
});

app.post("/api/patients/:id/check-conflict", async (c) => {
  const patientId = c.req.param("id");
  const request = ConflictCheckRequestSchema.parse(await c.req.json());
  const response = await cogneeFetch(`/check-conflict/${encodeURIComponent(patientId)}`, {
    method: "POST",
    body: JSON.stringify(request),
  });
  return c.json(SafetyAlertSchema.parse(response));
});

app.post("/api/patients/:id/improve", async (c) => {
  const patientId = c.req.param("id");
  const response = await cogneeFetch("/improve", {
    method: "POST",
    body: JSON.stringify({ patientId }),
  });
  return c.json(ImproveResponseSchema.parse(response));
});

app.delete("/api/patients/:id", async (c) => {
  const patientId = c.req.param("id");
  const response = await cogneeFetch(`/forget/${encodeURIComponent(patientId)}`, {
    method: "DELETE",
    body: JSON.stringify({}),
  });
  return c.json(ForgetResponseSchema.parse(response));
});

app.onError((error, c) => safeJson(c, error));

export { COGNEE_SERVICE_URL };
