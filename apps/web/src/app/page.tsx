"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getHealth, type HealthResponse } from "../lib/api";
import { MEDICAL_DISCLAIMER } from "../lib/patientData";
import { datasetForPatient, useActivePatient } from "../lib/activePatient";
import { Disclaimer, StatusLine } from "../components/Primitives";

export default function HomePage() {
  const { activePatient, patients, selectPatient, createPatient } = useActivePatient();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newPatientName, setNewPatientName] = useState("");
  const [newPatientId, setNewPatientId] = useState("");
  const [patientPanelOpen, setPatientPanelOpen] = useState(false);
  const [patientMessage, setPatientMessage] = useState("Choose a patient, then open the patient dashboard.");

  useEffect(() => {
    getHealth().then(setHealth).catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  const transcriptionReady = Boolean(health?.cognee.transcription?.available);
  const cogneeReady = Boolean(health?.cognee.cogneeAvailable);

  function onCreatePatient() {
    try {
      const patient = createPatient({ id: newPatientId || undefined, name: newPatientName, consentGiven: true });
      setNewPatientName("");
      setNewPatientId("");
      setPatientMessage(`Created and selected ${patient.name}.`);
    } catch (err) {
      setPatientMessage(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="pg">
      <div>
        <h1 className="h1">Anamnesis</h1>
        <p className="sub">AI medical consultation assistant for continuity of care using graph memory.</p>
      </div>
      <Disclaimer text={MEDICAL_DISCLAIMER} />

      <div className="sec">Quick actions</div>
      <div className="row">
        <button className="btn pri" type="button" onClick={() => setPatientPanelOpen((open) => !open)}>
          Open patient
        </button>
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
      </div>
      {patientPanelOpen ? (
      <div className="box">
        <div className="grid2">
          <label className="field">Choose patient
            <select className="in" value={activePatient.id} onChange={(event) => {
              selectPatient(event.target.value);
              const selected = patients.find((patient) => patient.id === event.target.value);
              setPatientMessage(selected ? `Selected ${selected.name}.` : "Patient selected.");
            }}>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>{patient.name} · {patient.id}</option>
              ))}
            </select>
          </label>
          <div className="field">
            <span>&nbsp;</span>
            <Link className="btn pri" href="/patient">Open selected patient</Link>
          </div>
          <label className="field">New patient name
            <input className="in" value={newPatientName} placeholder="e.g. Maria Schmidt" onChange={(event) => setNewPatientName(event.target.value)} />
          </label>
          <label className="field">New patient ID
            <input className="in mono" value={newPatientId} placeholder="optional, auto-generated if blank" onChange={(event) => setNewPatientId(event.target.value)} />
          </label>
        </div>
        <div className="row" style={{ alignItems: "center" }}>
          <button className="btn" type="button" onClick={onCreatePatient} disabled={!newPatientName.trim()}>Create patient</button>
          <span className="muted" style={{ fontSize: 11 }}>{patientMessage}</span>
        </div>
      </div>
      ) : null}

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
          <div className="n">—</div>
          <div className="l">LLM extraction — checked when processing uploads</div>
        </div>
        <div className="stat">
          <div className="n mono" style={{ fontSize: 12 }}>
            {datasetForPatient(activePatient.id)}
          </div>
          <div className="l">Current patient dataset</div>
        </div>
      </div>
      {error ? <StatusLine status="err">{error}</StatusLine> : null}

      <div className="sec">Patients</div>
      <table className="tbl">
        <tbody>
          <tr>
            <th>Patient</th>
            <th>ID</th>
            <th>Consent</th>
            <th>Status</th>
          </tr>
          {patients.map((patient) => (
            <tr key={patient.id}>
              <td>
                <b>{patient.name}</b>
              </td>
              <td className="mono">{patient.id}</td>
              <td>{patient.consentGiven ? "Consented" : "Pending"}</td>
              <td>{patient.id === activePatient.id ? <span className="chip">active</span> : <span className="muted">available</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ok">
        Current patient: <b>{activePatient.name}</b> · <span className="mono">{activePatient.id}</span>
      </div>

      <details className="box">
        <summary className="sec">Admin utilities</summary>
        <div className="row">
          <Link className="btn" href="/handover">Doctor handover</Link>
          <Link className="btn danger" href="/forget">GDPR forget patient</Link>
          <Link className="btn" href="/seed">Seed data</Link>
          <Link className="btn" href="/status">System status</Link>
        </div>
      </details>
    </div>
  );
}
