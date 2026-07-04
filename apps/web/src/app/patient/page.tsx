"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getHistory, runImprove, type HistoryResponse, type ImproveResponse } from "../../lib/api";
import { DEFAULT_DEMO_PATIENT, DEMO_DATASET, DEMO_QUERY, MEDICAL_DISCLAIMER } from "../../lib/demo";
import { Disclaimer, StatusLine } from "../../components/Primitives";

export default function PatientDashboardPage() {
  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [improve, setImprove] = useState<ImproveResponse | null>(null);
  const [message, setMessage] = useState("Loading patient dashboard...");

  useEffect(() => {
    getHistory(DEFAULT_DEMO_PATIENT.id, DEMO_QUERY)
      .then((data) => {
        setHistory(data);
        setMessage("Loaded recall projection from patient graph.");
      })
      .catch((err) => setMessage(err instanceof Error ? err.message : String(err)));
  }, []);

  async function onImprove() {
    setMessage("Running improve()...");
    try {
      const data = await runImprove(DEFAULT_DEMO_PATIENT.id);
      setImprove(data);
      setHistory((current) => (current ? { ...current, graph: data.graph } : current));
      setMessage(`improve() returned ${data.hypotheses.length} hypothesis node(s).`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }

  const graph = improve?.graph ?? history?.graph;
  const nodes = graph?.nodes.length ?? 0;
  const sessions = graph?.nodes.filter((n) => n.type === "Session").length ?? 12;
  const allergies = graph?.nodes.filter((n) => n.type === "Allergy").length ?? 1;
  const plans = graph?.nodes.filter((n) => n.type === "Plan").length ?? 3;
  const hypotheses = graph?.nodes.filter((n) => n.type === "Hypothesis").length ?? improve?.hypotheses.length ?? 0;

  return (
    <div className="pg">
      <div className="box" style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{DEFAULT_DEMO_PATIENT.name}</div>
          <div className="mono muted">
            {DEFAULT_DEMO_PATIENT.id} · dataset: {DEMO_DATASET}
          </div>
        </div>
        <div style={{ textAlign: "right", fontSize: 11 }}>
          <div className="chip">Consent: granted</div>
          <div className="muted" style={{ marginTop: 4 }}>
            Last updated 2026-06-18 14:32
          </div>
        </div>
      </div>
      <Disclaimer text={MEDICAL_DISCLAIMER} />
      <div className="sec">Overview</div>
      <div className="grid4">
        <div className="stat"><div className="n">{sessions}</div><div className="l">Sessions stored</div></div>
        <div className="stat"><div className="n">{nodes || "—"}</div><div className="l">Graph nodes</div></div>
        <div className="stat"><div className="n">{history?.timeline.length ?? "—"}</div><div className="l">Timeline entities in query</div></div>
        <div className="stat"><div className="n">{graph?.nodes.filter((n) => n.type === "Prescription").length ?? "—"}</div><div className="l">Medication/prescription nodes</div></div>
        <div className="stat"><div className="n">{allergies}</div><div className="l">Allergies</div></div>
        <div className="stat"><div className="n">{plans}</div><div className="l">Open plans</div></div>
        <div className="stat"><div className="n">{hypotheses}</div><div className="l">Generated hypotheses</div></div>
      </div>
      <div className="sec">Actions</div>
      <div className="row">
        <Link className="btn pri" href="/process">Process new audio session</Link>
        <Link className="btn" href="/timeline">Run recall query</Link>
        <Link className="btn" href="/safety">Check medication conflict</Link>
        <button className="btn" onClick={() => void onImprove()}>Run improve()</button>
        <Link className="btn" href="/handover">Prepare handover</Link>
      </div>
      <StatusLine>{message}</StatusLine>
      <div className="sec">Recent clinical summary</div>
      <div className="box">
        <div><b>Current history.</b> 34-year-old patient with a 2-year record: recurring sleep complaints over the last year, fatigue with documented low ferritin, resolved gastric ulcer on pantoprazole, allergic rhinitis.</div>
        <div><b>Highlighted concerns:</b> NSAID/aspirin bleeding risk due to ulcer history · unresolved sleep disturbance · ferritin follow-up.</div>
        <div><b>Latest visit:</b> reports short/fragmented sleep; fatigue improved; discussed iron supplementation adherence.</div>
        <div><b>Active follow-up plans:</b> repeat ferritin · continue NSAID avoidance · sleep diary review next visit.</div>
      </div>
      <details className="box">
        <summary className="sec">Data administration</summary>
        <div className="row">
          <Link className="btn danger" href="/forget">GDPR forget patient</Link>
          <Link className="btn" href="/seed">View demo seed data</Link>
          <Link className="btn" href="/status">System status</Link>
        </div>
      </details>
    </div>
  );
}
