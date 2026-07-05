"use client";

import { useState } from "react";
import Link from "next/link";
import { getHistory, runImprove, type HistoryResponse, type ImproveResponse } from "../../lib/api";
import { DEFAULT_RECALL_QUERY, MEDICAL_DISCLAIMER } from "../../lib/patientData";
import { datasetForPatient, useActivePatient } from "../../lib/activePatient";
import { Disclaimer, StatusLine } from "../../components/Primitives";

export default function PatientDashboardPage() {
  const { activePatient } = useActivePatient();
  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [improve, setImprove] = useState<ImproveResponse | null>(null);
  const [message, setMessage] = useState("Patient dashboard ready. Load recall projection when needed.");
  const [busy, setBusy] = useState(false);

  async function loadRecallProjection() {
    setBusy(true);
    setMessage("Running recall() for patient dashboard...");
    try {
      const data = await getHistory(activePatient.id, DEFAULT_RECALL_QUERY);
      setHistory(data);
      setMessage("Loaded recall projection from patient graph.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function onImprove() {
    setBusy(true);
    setMessage("Running improve()...");
    try {
      const data = await runImprove(activePatient.id);
      setImprove(data);
      setHistory((current) => (current ? { ...current, graph: data.graph } : current));
      setMessage(`improve() returned ${data.hypotheses.length} hypothesis node(s).`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const graph = improve?.graph ?? history?.graph;
  const timeline = history?.timeline ?? [];
  const nodes = graph?.nodes.length;
  const sessions = graph?.nodes.filter((n) => n.type === "Session").length;
  const allergies = graph?.nodes.filter((n) => n.type === "Allergy").length;
  const plans = graph?.nodes.filter((n) => n.type === "Plan").length;
  const hypotheses = graph?.nodes.filter((n) => n.type === "Hypothesis").length ?? improve?.hypotheses.length ?? 0;
  const latestItems = [...timeline].slice(-4).reverse();

  return (
    <div className="pg">
      <div className="box" style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{activePatient.name}</div>
          <div className="mono muted">
            {activePatient.id} · dataset: {datasetForPatient(activePatient.id)}
          </div>
        </div>
        <div style={{ textAlign: "right", fontSize: 11 }}>
          <div className="chip">Consent: {activePatient.consentGiven ? "granted" : "not granted"}</div>
          <div className="muted" style={{ marginTop: 4 }}>
            {latestItems[0]?.timestamp ? `Latest record: ${latestItems[0].timestamp.slice(0, 10)}` : "No records loaded"}
          </div>
        </div>
      </div>
      <Disclaimer text={MEDICAL_DISCLAIMER} />
      <div className="sec">Overview</div>
      <div className="grid4">
        <div className="stat"><div className="n">{sessions ?? "—"}</div><div className="l">Sessions stored</div></div>
        <div className="stat"><div className="n">{nodes ?? "—"}</div><div className="l">Graph nodes</div></div>
        <div className="stat"><div className="n">{history?.timeline.length ?? "—"}</div><div className="l">Timeline entities in query</div></div>
        <div className="stat"><div className="n">{graph?.nodes.filter((n) => n.type === "Prescription").length ?? "—"}</div><div className="l">Medication/prescription nodes</div></div>
        <div className="stat"><div className="n">{allergies ?? "—"}</div><div className="l">Allergies</div></div>
        <div className="stat"><div className="n">{plans ?? "—"}</div><div className="l">Open plans</div></div>
        <div className="stat"><div className="n">{hypotheses}</div><div className="l">Generated hypotheses</div></div>
      </div>
      <div className="sec">Actions</div>
      <div className="row">
        <Link className="btn pri" href="/process">Process new audio session</Link>
        <button className="btn" onClick={() => void loadRecallProjection()} disabled={busy}>{busy ? <span className="spin" /> : null} Load recall projection</button>
        <Link className="btn" href="/timeline">Run recall query</Link>
        <Link className="btn" href="/safety">Check medication conflict</Link>
        <button className="btn" onClick={() => void onImprove()} disabled={busy}>{busy ? <span className="spin" /> : null} Run improve()</button>
        <Link className="btn" href="/handover">Prepare handover</Link>
      </div>
      <StatusLine>{message}</StatusLine>
      <div className="sec">Recall-derived clinical summary</div>
      <div className="box">
        {latestItems.length ? (
          latestItems.map((item) => (
            <div key={`${item.timestamp}-${item.type}-${item.value}`}>
              <b>{item.type.replace("_", " ")}.</b> {item.value}{item.context ? ` — ${item.context}` : ""}
            </div>
          ))
        ) : (
          <span className="muted">No recall projection loaded yet. Click “Load recall projection”.</span>
        )}
      </div>
      <details className="box">
        <summary className="sec">Data administration</summary>
        <div className="row">
          <Link className="btn danger" href="/forget">GDPR forget patient</Link>
          <Link className="btn" href="/seed">View seed data</Link>
          <Link className="btn" href="/status">System status</Link>
        </div>
      </details>
    </div>
  );
}
