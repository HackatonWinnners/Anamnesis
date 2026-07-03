"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_DEMO_PATIENT,
  MEDICAL_DISCLAIMER,
  type Graph,
  type GraphNode,
  type HistoryResponse,
  type ProcessSessionResponse,
  type SafetyAlert,
} from "@anamnesis/shared";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8787";
const DEMO_QUERY = "Show all sleep-related complaints over the last year.";

type LoadState = "idle" | "loading" | "success" | "error";

/**
 * Wraps fetch so a network-level failure (API not running, wrong
 * NEXT_PUBLIC_API_BASE_URL, or CORS block) surfaces an actionable message
 * instead of the browser's opaque "Failed to fetch". Also normalizes HTTP
 * error bodies ({ error }) into thrown Errors.
 */
async function apiFetch(path: string, init?: RequestInit): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, init);
  } catch {
    throw new Error(
      `Cannot reach the Anamnesis API at ${API_BASE}. Make sure it is running (\`pnpm dev:api\`) and that NEXT_PUBLIC_API_BASE_URL is correct.`,
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
    throw new Error(message);
  }
  return data;
}

export default function DashboardPage() {
  const [patientId, setPatientId] = useState(DEFAULT_DEMO_PATIENT.id);
  const [patientName, setPatientName] = useState(DEFAULT_DEMO_PATIENT.name);
  const [query, setQuery] = useState(DEMO_QUERY);
  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [status, setStatus] = useState<LoadState>("idle");
  const [message, setMessage] = useState<string>("Seed demo data with `pnpm seed`, then load history.");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [lastProcessed, setLastProcessed] = useState<ProcessSessionResponse | null>(null);
  const [medication, setMedication] = useState("Aspirin 500 mg");
  const [safetyAlert, setSafetyAlert] = useState<SafetyAlert | null>(null);

  const loadHistory = useCallback(async () => {
    setStatus("loading");
    setMessage("Loading patient graph from Cognee recall()...");
    try {
      const data = (await apiFetch(
        `/api/patients/${encodeURIComponent(patientId)}/history?q=${encodeURIComponent(query)}`,
      )) as HistoryResponse;
      setHistory(data);
      setStatus("success");
      setMessage(`Loaded ${data.timeline.length} timeline item(s) and ${data.graph.nodes.length} graph node(s).`);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Unknown error while loading history");
    }
  }, [patientId, query]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  async function processSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!audioFile) {
      setMessage("Choose an audio file first. Local stable-ts transcription is required for session processing.");
      return;
    }
    setStatus("loading");
    setMessage("Uploading audio to stable-ts, extracting entities with GPT-4o, then calling remember()...");
    try {
      const form = new FormData();
      form.set("patientId", patientId);
      form.set("patientName", patientName);
      form.set("consentGiven", "true");
      form.set("audio", audioFile);
      const data = (await apiFetch(`/api/sessions/process`, { method: "POST", body: form })) as ProcessSessionResponse;
      setLastProcessed(data);
      setHistory({ patientId, query, timeline: data.entities, graph: data.graph });
      setStatus("success");
      setMessage(`remember() stored ${data.rememberedCount} extracted entity node(s).`);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Unknown error while processing session");
    }
  }

  async function checkConflict() {
    setStatus("loading");
    setMessage("Checking allergies, ulcer history, and current medication context with recall()...");
    try {
      const data = (await apiFetch(`/api/patients/${encodeURIComponent(patientId)}/check-conflict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ medication }),
      })) as SafetyAlert;
      setSafetyAlert(data);
      setStatus("success");
      setMessage(data.hasConflict ? "Safety alert generated." : "No demo-rule conflict found.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Unknown error while checking conflict");
    }
  }

  async function runImprove() {
    setStatus("loading");
    setMessage("Running Cognee improve()/memify() and updating hypothesis nodes...");
    try {
      const data = (await apiFetch(`/api/patients/${encodeURIComponent(patientId)}/improve`, {
        method: "POST",
      })) as { graph: Graph; hypotheses: unknown[] };
      setHistory((current) => (current ? { ...current, graph: data.graph } : { patientId, query, timeline: [], graph: data.graph }));
      setStatus("success");
      setMessage(`improve() returned ${data.hypotheses.length} hypothesis node(s).`);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Unknown error while running improve");
    }
  }

  async function forgetPatient() {
    const confirmed = window.confirm(`Delete all graph memory for ${patientName} (${patientId})? This demonstrates GDPR forget().`);
    if (!confirmed) return;
    setStatus("loading");
    setMessage("Calling forget() and clearing local dashboard state...");
    try {
      const data = (await apiFetch(`/api/patients/${encodeURIComponent(patientId)}`, {
        method: "DELETE",
      })) as { dataset: string };
      setHistory(null);
      setSafetyAlert(null);
      setLastProcessed(null);
      setStatus("success");
      setMessage(`forget() removed dataset ${data.dataset}.`);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Unknown error while forgetting patient");
    }
  }

  const graph = history?.graph ?? { nodes: [], edges: [] };
  const timeline = history?.timeline ?? [];

  return (
    <main className="shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Cognee Hackathon · German/EU healthcare demo</p>
          <h1>Anamnesis</h1>
          <p className="lede">Doctor dashboard for continuity of care with graph memory.</p>
        </div>
        <div className="disclaimer">{MEDICAL_DISCLAIMER}</div>
      </section>

      <section className="grid two">
        <article className="card patient-card">
          <div className="section-heading">
            <span>Patient</span>
            <strong>Consent: yes</strong>
          </div>
          <label>
            Patient ID
            <input value={patientId} onChange={(event) => setPatientId(event.target.value)} />
          </label>
          <label>
            Name
            <input value={patientName} onChange={(event) => setPatientName(event.target.value)} />
          </label>
          <div className="button-row">
            <button onClick={() => void loadHistory()}>Load recall()</button>
            <button className="secondary" onClick={() => void runImprove()}>Run improve()</button>
            <button className="danger" onClick={() => void forgetPatient()}>GDPR forget()</button>
          </div>
          <p className={`status ${status}`}>{message}</p>
        </article>

        <article className="card brief-card">
          <div className="section-heading">
            <span>Pre-session brief</span>
            <strong>recall()</strong>
          </div>
          <textarea value={query} onChange={(event) => setQuery(event.target.value)} rows={3} />
          <button onClick={() => void loadHistory()}>Run query</button>
          <p className="hint">Demo query: “{DEMO_QUERY}”</p>
        </article>
      </section>

      <section className="grid two">
        <article className="card">
          <div className="section-heading">
            <span>Safety alert</span>
            <strong>recall() conflict check</strong>
          </div>
          <label>
            Proposed medication
            <input value={medication} onChange={(event) => setMedication(event.target.value)} />
          </label>
          <button onClick={() => void checkConflict()}>Check conflict</button>
          {safetyAlert ? <SafetyAlertView alert={safetyAlert} /> : <p className="hint">Try Aspirin 500 mg after seeding demo data.</p>}
        </article>

        <article className="card">
          <div className="section-heading">
            <span>New visit</span>
            <strong>stable-ts → GPT-4o → remember()</strong>
          </div>
          <form onSubmit={(event) => void processSession(event)}>
            <input type="file" accept="audio/*" onChange={(event) => setAudioFile(event.target.files?.[0] ?? null)} />
            <button type="submit">Process audio session</button>
          </form>
          {lastProcessed ? (
            <div className="transcript">
              <strong>Transcript</strong>
              {lastProcessed.transcription ? (
                <small>
                  {lastProcessed.transcription.provider} · model {lastProcessed.transcription.model} ·{" "}
                  {lastProcessed.transcription.segments.length} segment(s)
                </small>
              ) : null}
              <p>{lastProcessed.transcript}</p>
            </div>
          ) : (
            <p className="hint">Requires stable-ts, ffmpeg, and a live audio file. GPT extraction still requires OPENAI_API_KEY.</p>
          )}
        </article>
      </section>

      <section className="grid dashboard">
        <article className="card timeline-card">
          <div className="section-heading">
            <span>Patient timeline</span>
            <strong>{timeline.length} item(s)</strong>
          </div>
          <Timeline items={timeline} />
        </article>

        <article className="card graph-card">
          <div className="section-heading">
            <span>Graph memory</span>
            <strong>{graph.nodes.length} nodes · {graph.edges.length} edges</strong>
          </div>
          <GraphView graph={graph} />
        </article>
      </section>
    </main>
  );
}

function SafetyAlertView({ alert }: { alert: SafetyAlert }) {
  return (
    <div className={alert.hasConflict ? "alert danger-alert" : "alert ok-alert"}>
      <strong>{alert.hasConflict ? "Safety Alert" : "No conflict found"}</strong>
      {alert.reason ? <p>{alert.reason}</p> : null}
      {alert.conflictingNodes.length > 0 ? (
        <ul>
          {alert.conflictingNodes.map((node) => (
            <li key={node}>{node}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Timeline({ items }: { items: HistoryResponse["timeline"] }) {
  if (items.length === 0) return <p className="empty">No timeline items yet. Run `pnpm seed` or process a session.</p>;
  return (
    <ol className="timeline">
      {items.map((item, index) => (
        <li key={`${item.timestamp}-${item.type}-${item.value}-${index}`}>
          <time>{new Date(item.timestamp).toLocaleDateString()}</time>
          <div>
            <strong>{item.type.replace("_", " ")}</strong>
            <span>{item.value}</span>
            {item.context ? <p>{item.context}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

function GraphView({ graph }: { graph: Graph }) {
  const positions = useMemo(() => layoutNodes(graph.nodes), [graph.nodes]);
  if (graph.nodes.length === 0) return <p className="empty">No graph nodes loaded.</p>;
  return (
    <svg className="graph" viewBox="0 0 900 520" role="img" aria-label="Patient memory graph">
      {graph.edges.map((edge) => {
        const source = positions.get(edge.source);
        const target = positions.get(edge.target);
        if (!source || !target) return null;
        return <line key={edge.id} x1={source.x} y1={source.y} x2={target.x} y2={target.y} className="edge" />;
      })}
      {graph.nodes.map((node) => {
        const position = positions.get(node.id);
        if (!position) return null;
        return (
          <g key={node.id} transform={`translate(${position.x}, ${position.y})`}>
            <circle r={node.type === "Hypothesis" ? 28 : 22} className={`node ${node.type.toLowerCase()}`} />
            <text y={4}>{shortLabel(node)}</text>
            <title>{`${node.type}: ${node.label}${node.context ? ` — ${node.context}` : ""}`}</title>
          </g>
        );
      })}
    </svg>
  );
}

function layoutNodes(nodes: GraphNode[]): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const center = { x: 450, y: 260 };
  const patient = nodes.find((node) => node.type === "Patient");
  if (patient) positions.set(patient.id, center);
  const rest = nodes.filter((node) => node.id !== patient?.id);
  const radius = Math.min(210, 70 + rest.length * 4);
  rest.forEach((node, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(rest.length, 1) - Math.PI / 2;
    positions.set(node.id, {
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius,
    });
  });
  return positions;
}

function shortLabel(node: GraphNode): string {
  const label = node.label.length > 18 ? `${node.label.slice(0, 16)}…` : node.label;
  if (node.type === "Patient") return "Patient";
  if (node.type === "Session") return "Visit";
  if (node.type === "Hypothesis") return "Hypothesis";
  return label;
}
