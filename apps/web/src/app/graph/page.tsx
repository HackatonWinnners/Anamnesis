"use client";

import { useMemo, useState } from "react";
import { getHistory, runImprove, type HistoryResponse, type ImproveResponse } from "../../lib/api";
import { DEFAULT_RECALL_QUERY, MEDICAL_DISCLAIMER } from "../../lib/patientData";
import { useActivePatient } from "../../lib/activePatient";
import { Disclaimer, GraphSketch, NodeDetail, StatusLine } from "../../components/Primitives";

export default function GraphPage() {
  const { activePatient } = useActivePatient();
  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [improve, setImprove] = useState<ImproveResponse | null>(null);
  const [message, setMessage] = useState("Patient graph ready. Press Load graph to run recall().");
  const [busy, setBusy] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  async function loadGraph() {
    setBusy(true);
    setMessage("Running recall() for patient graph...");
    try {
      const data = await getHistory(activePatient.id, DEFAULT_RECALL_QUERY);
      setHistory(data);
      setSelectedNodeId(data.graph.nodes.find((node) => node.type === "Patient")?.id ?? data.graph.nodes[0]?.id ?? null);
      setMessage(`Loaded ${data.graph.nodes.length} nodes and ${data.graph.edges.length} edges.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function runMedicalIntuition() {
    setBusy(true);
    setMessage("Running improve()/memify() to update hypothesis nodes...");
    try {
      const data = await runImprove(activePatient.id);
      setImprove(data);
      setSelectedNodeId(data.hypotheses[0]?.id ?? data.graph.nodes.find((node) => node.type === "Hypothesis")?.id ?? selectedNodeId);
      setHistory((current) => (current ? { ...current, graph: data.graph } : current));
      setMessage(`Generated/updated ${data.hypotheses.length} hypothesis node(s).`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const graph = improve?.graph ?? history?.graph ?? null;
  const hypotheses = improve?.hypotheses ?? graph?.nodes.filter((node) => node.type === "Hypothesis") ?? [];
  const primaryHypothesis = hypotheses[0];
  const supportingNodeIds =
    primaryHypothesis?.meta && typeof primaryHypothesis.meta === "object" && "supportingNodeIds" in primaryHypothesis.meta
      ? primaryHypothesis.meta.supportingNodeIds
      : null;
  const supportingNodes = Array.isArray(supportingNodeIds)
    ? graph?.nodes.filter((node) => supportingNodeIds.includes(node.id)) ?? []
    : [];

  const detailNode = useMemo(() => {
    if (!graph) return undefined;
    return graph.nodes.find((node) => node.id === selectedNodeId) ?? graph.nodes[0];
  }, [graph, selectedNodeId]);

  return (
    <div className="pg">
      <h1 className="h1">Memory Graph</h1>
      <p className="sub">Visualize structured medical memory and run <span className="mono">improve() / memify()</span> to connect facts over time into doctor-facing hypothesis nodes.</p>
      <div className="mono muted" style={{ fontSize: 11 }}>patient: {activePatient.name} · {activePatient.id}</div>
      <div className="row">
        <button className="btn pri" onClick={() => void loadGraph()} disabled={busy}>{busy ? <span className="spin" /> : null} Load graph</button>
        <button className="btn" onClick={() => void runMedicalIntuition()} disabled={busy}>{busy ? <span className="spin" /> : null} Run medical intuition</button>
      </div>
      <StatusLine>{message}</StatusLine>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 250px", gap: 12 }}>
        <GraphSketch graph={graph} selectedNodeId={selectedNodeId} onSelectNode={(node) => setSelectedNodeId(node.id)} />
        <NodeDetail node={detailNode} />
      </div>
      <div className="box">
        <div className="sec">Medical intuition</div>
        <div className="row" style={{ alignItems: "center" }}>
          <span className="node hyp">{primaryHypothesis?.label ?? "No hypothesis generated yet"}</span>
          <span className="chip">hypothesis node</span>
        </div>
        <div><b>Explanation:</b> {primaryHypothesis?.context ?? "Run medical intuition to let improve()/memify() connect related facts in the graph."}</div>
        <div><b>Supporting evidence:</b></div>
        <div className="row">
          {supportingNodes.length ? (
            supportingNodes.map((node) => (
              <button
                type="button"
                className={`node nodebtn ${selectedNodeId === node.id ? "selected" : ""}`.trim()}
                key={node.id}
                onClick={() => setSelectedNodeId(node.id)}
              >
                {node.label}
              </button>
            ))
          ) : (
            <span className="muted">No supporting nodes loaded yet.</span>
          )}
        </div>
        <div className="ok">Note: hypotheses are documentation aids, not diagnoses.</div>
      </div>
      <div className="box">
        <div className="sec">Graph inventory</div>
        <div className="row">
          {["Patient", "Session", "Complaint", "Diagnosis", "Prescription", "Dosage", "Plan", "Allergy", "LabResult", "Hypothesis"].map((type) => {
            const count = graph?.nodes.filter((node) => node.type === type).length ?? 0;
            return <span className="chip" key={type}>{type}: {count}</span>;
          })}
        </div>
      </div>
      <Disclaimer text={MEDICAL_DISCLAIMER} />
    </div>
  );
}
