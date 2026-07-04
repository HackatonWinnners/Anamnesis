"use client";

import { useEffect, useMemo, useState } from "react";
import { getHistory, type HistoryResponse } from "../../lib/api";
import { DEFAULT_DEMO_PATIENT, DEMO_QUERY } from "../../lib/demo";
import { GraphSketch, NodeDetail, StatusLine } from "../../components/Primitives";

export default function GraphPage() {
  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [message, setMessage] = useState("Loading patient graph...");

  useEffect(() => {
    getHistory(DEFAULT_DEMO_PATIENT.id, DEMO_QUERY)
      .then((data) => {
        setHistory(data);
        setMessage(`Loaded ${data.graph.nodes.length} nodes and ${data.graph.edges.length} edges.`);
      })
      .catch((err) => setMessage(err instanceof Error ? err.message : String(err)));
  }, []);

  const detailNode = useMemo(
    () => history?.graph.nodes.find((node) => node.type === "LabResult") ?? history?.graph.nodes.find((node) => node.type === "Hypothesis"),
    [history],
  );

  return (
    <div className="pg">
      <h1 className="h1">Cognee Patient Graph</h1>
      <p className="sub">Visualize structured medical memory: patient, session, complaint, diagnosis, prescription, dosage, plan, allergy, lab result, and hypothesis nodes.</p>
      <StatusLine>{message}</StatusLine>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 250px", gap: 12 }}>
        <GraphSketch graph={history?.graph ?? null} />
        <NodeDetail node={detailNode} />
      </div>
      <div className="box">
        <div className="sec">Graph inventory</div>
        <div className="row">
          {["Patient", "Session", "Complaint", "Diagnosis", "Prescription", "Dosage", "Plan", "Allergy", "LabResult", "Hypothesis"].map((type) => {
            const count = history?.graph.nodes.filter((node) => node.type === type).length ?? 0;
            return <span className="chip" key={type}>{type}: {count}</span>;
          })}
        </div>
      </div>
    </div>
  );
}
