import type {
  ForgetResponse,
  Graph,
  HistoryResponse,
  ImproveResponse,
  ProcessSessionResponse,
  SafetyAlert,
} from "@anamnesis/shared";

/**
 * Base URL for the Hono API gateway.
 * - When `NEXT_PUBLIC_API_BASE_URL` is set to an absolute URL, calls go there.
 * - When it is set to an empty string, calls are same-origin (`/api/...`),
 *   which is what the HTTPS reverse proxy expects.
 * - Otherwise we fall back to the local dev gateway.
 */
export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  (process.env.NODE_ENV === "production" ? "" : "http://localhost:8787");

export class ApiError extends Error {}

export async function apiFetch<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, init);
  } catch {
    throw new ApiError(
      `Cannot reach the Anamnesis API at ${API_BASE || "(same origin)"}. Make sure it is running (\`pnpm dev:api\`).`,
    );
  }
  let data: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!response.ok) {
    const message =
      data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : `Request failed with status ${response.status}`;
    throw new ApiError(message);
  }
  return data as T;
}

export type HealthResponse = {
  ok: boolean;
  service: string;
  disclaimer: string;
  cognee: {
    ok?: boolean;
    cogneeAvailable?: boolean;
    transcription?: {
      provider?: string;
      model?: string;
      available?: boolean;
      missing?: string[];
      device?: string;
      downloadRoot?: string | null;
    };
    warning?: string | null;
    error?: string;
  };
};

export const getHealth = () => apiFetch<HealthResponse>("/api/health");

export const getHistory = (patientId: string, query: string) =>
  apiFetch<HistoryResponse>(
    `/api/patients/${encodeURIComponent(patientId)}/history?q=${encodeURIComponent(query)}`,
  );

export const checkConflict = (patientId: string, body: Record<string, unknown>) =>
  apiFetch<SafetyAlert>(`/api/patients/${encodeURIComponent(patientId)}/check-conflict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export const runImprove = (patientId: string) =>
  apiFetch<ImproveResponse>(`/api/patients/${encodeURIComponent(patientId)}/improve`, {
    method: "POST",
  });

export const forgetPatient = (patientId: string) =>
  apiFetch<ForgetResponse>(`/api/patients/${encodeURIComponent(patientId)}`, {
    method: "DELETE",
  });

export const processSession = (form: FormData) =>
  apiFetch<ProcessSessionResponse>("/api/sessions/process", { method: "POST", body: form });

export type { ForgetResponse, Graph, HistoryResponse, ImproveResponse, ProcessSessionResponse, SafetyAlert };
