"use client";

import { useState } from "react";
import { getHistory, type HistoryResponse } from "../../lib/api";
import { DEFAULT_RECALL_QUERY } from "../../lib/patientData";
import { useActivePatient } from "../../lib/activePatient";
import { StatusLine, TimelineTable } from "../../components/Primitives";

const ENTITY_TYPE_OPTIONS = [
  ["ALL", "All types"],
  ["SYMPTOM", "Symptom"],
  ["COMPLAINT", "Complaint"],
  ["DIAGNOSIS", "Diagnosis"],
  ["MEDICATION", "Medication"],
  ["PRESCRIPTION", "Prescription"],
  ["DOSAGE", "Dosage"],
  ["ALLERGY", "Allergy"],
  ["LAB_RESULT", "Lab result"],
  ["PLAN", "Plan"],
] as const;

const DATE_RANGE_OPTIONS = [
  ["12", "Last 12 months"],
  ["6", "Last 6 months"],
  ["3", "Last 3 months"],
  ["ALL", "All time"],
] as const;

export default function TimelinePage() {
  const { activePatient } = useActivePatient();
  const [query, setQuery] = useState(DEFAULT_RECALL_QUERY);
  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [message, setMessage] = useState("Ready to run recall(). Enter a query and press Recall.");
  const [busy, setBusy] = useState(false);
  const [entityType, setEntityType] = useState<string>("ALL");
  const [dateRange, setDateRange] = useState<string>("12");

  async function load() {
    setBusy(true);
    setMessage("Running recall()...");
    try {
      const data = await getHistory(activePatient.id, query);
      setHistory(data);
      setMessage(`Loaded ${data.timeline.length} matching item(s), ${data.graph.nodes.length} related graph node(s).`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const cutoff =
    dateRange === "ALL" ? null : new Date(Date.now() - Number(dateRange) * 30 * 24 * 60 * 60 * 1000);
  const filteredTimeline = (history?.timeline ?? []).filter((item) => {
    if (entityType !== "ALL" && item.type !== entityType) return false;
    if (cutoff) {
      const ts = new Date(item.timestamp);
      if (!Number.isNaN(ts.getTime()) && ts < cutoff) return false;
    }
    return true;
  });
  const filteredHistory = history ? { ...history, timeline: filteredTimeline } : null;

  return (
    <div className="pg">
      <h1 className="h1">Patient Timeline</h1>
      <div className="mono muted" style={{ fontSize: 11 }}>patient: {activePatient.name} · {activePatient.id}</div>
      <div className="box" style={{ flexDirection: "row", alignItems: "flex-end", gap: 10 }}>
        <label className="field" style={{ flex: 1 }}>Recall query<input className="in" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
        <label className="field">Entity type
          <select className="in" value={entityType} onChange={(e) => setEntityType(e.target.value)}>
            {ENTITY_TYPE_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className="field">Date range
          <select className="in" value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
            {DATE_RANGE_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <button className="btn pri" onClick={() => void load()} disabled={busy}>{busy ? <span className="spin" /> : null} Recall</button>
      </div>
      <div className="box" style={{ flexDirection: "row", gap: 20, fontSize: 11.5 }}>
        <span><b>{filteredHistory ? filteredTimeline.length : "—"}</b> matching items</span>
        <span className="muted">query: “{history?.query ?? query}”</span>
        <span className="muted">related graph nodes: {history?.graph.nodes.length ?? "—"}</span>
      </div>
      <StatusLine>{message}</StatusLine>
      <div className="sec">Live timeline</div>
      <TimelineTable history={filteredHistory} />
    </div>
  );
}
