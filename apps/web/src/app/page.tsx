"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getHealth, type HealthResponse } from "../lib/api";
import { DEFAULT_DEMO_PATIENT, DEMO_DATASET, demoPatients, MEDICAL_DISCLAIMER } from "../lib/demo";
import { Disclaimer, StatusLine } from "../components/Primitives";

export default function HomePage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getHealth().then(setHealth).catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  const transcriptionReady = Boolean(health?.cognee.transcription?.available);
  const cogneeReady = Boolean(health?.cognee.cogneeAvailable);

  return (
    <div className="pg">
      <div>
        <h1 className="h1">Anamnesis</h1>
        <p className="sub">AI medical consultation assistant for continuity of care using graph memory.</p>
      </div>
      <Disclaimer text={MEDICAL_DISCLAIMER} />

      <div className="sec">Quick actions</div>
      <div className="row">
        <Link className="btn pri" href="/patient">
          Open demo patient
        </Link>
        <Link className="btn" href="/process">
          Process new consultation
        </Link>
        <Link className="btn" href="/brief">
          Run pre-session recall
        </Link>
        <Link className="btn" href="/safety">
          Check medication safety
        </Link>
        <Link className="btn" href="/graph">
          Open memory graph
        </Link>
        <Link className="btn danger" href="/forget">
          GDPR forget patient
        </Link>
      </div>

      <div className="sec">System status</div>
      <div className="grid4">
        <div className="stat">
          <div className="n">{cogneeReady ? "●" : "○"}</div>
          <div className="l">Cognee memory service — {cogneeReady ? "connected" : "fallback / unavailable"}</div>
        </div>
        <div className="stat">
          <div className="n">{transcriptionReady ? "●" : "○"}</div>
          <div className="l">stable-ts transcription — {transcriptionReady ? "ready" : "not ready"}</div>
        </div>
        <div className="stat">
          <div className="n">●</div>
          <div className="l">GPT-4o extraction — requires OPENAI_API_KEY for uploads</div>
        </div>
        <div className="stat">
          <div className="n mono" style={{ fontSize: 12 }}>
            {DEMO_DATASET}
          </div>
          <div className="l">Current demo patient dataset</div>
        </div>
      </div>
      {error ? <StatusLine status="err">{error}</StatusLine> : null}

      <div className="sec">Recent patients</div>
      <table className="tbl">
        <tbody>
          <tr>
            <th>Patient</th>
            <th>ID</th>
            <th>Consent</th>
            <th>Last visit</th>
            <th>Sessions</th>
            <th>Safety alert</th>
          </tr>
          {demoPatients.map((patient) => (
            <tr key={patient.id}>
              <td>
                <b>{patient.name}</b>
              </td>
              <td className="mono">{patient.id}</td>
              <td>{patient.consent}</td>
              <td>{patient.lastVisit}</td>
              <td>{patient.sessions}</td>
              <td>{patient.alert === "None" ? <span className="muted">None</span> : <span className="chip">{patient.alert}</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ok">
        Demo defaults: <b>{DEFAULT_DEMO_PATIENT.name}</b> · <span className="mono">{DEFAULT_DEMO_PATIENT.id}</span>
      </div>
    </div>
  );
}
