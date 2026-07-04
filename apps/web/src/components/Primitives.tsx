import type { Graph, GraphNode, HistoryResponse } from "@anamnesis/shared";
import type { ReactNode } from "react";
import { fmtDate } from "../lib/demo";

export function Disclaimer({ text }: { text: string }) {
  return <div className="disc">{text}</div>;
}

export function Tag({ children }: { children: string }) {
  return <span className="tag">{children.replace("_", " ")}</span>;
}

export function StatusLine({ status, children }: { status?: "ok" | "err"; children: ReactNode }) {
  return <div className={`statusline ${status ?? ""}`}>{children}</div>;
}

export function TimelineTable({ history }: { history: HistoryResponse | null }) {
  const items = history?.timeline ?? [];
  return (
    <table className="tbl">
      <tbody>
        <tr>
          <th>Date</th>
          <th>Type</th>
          <th>Value</th>
          <th>Clinical context</th>
          <th>Confidence</th>
        </tr>
        {items.length === 0 ? (
          <tr>
            <td colSpan={5} className="muted">
              No matching timeline items loaded yet.
            </td>
          </tr>
        ) : (
          items.map((item, index) => (
            <tr key={`${item.timestamp}-${item.type}-${item.value}-${index}`}>
              <td>{fmtDate(item.timestamp)}</td>
              <td>
                <Tag>{item.type}</Tag>
              </td>
              <td>{item.value}</td>
              <td>{item.context ?? "—"}</td>
              <td>{item.confidence ?? "—"}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

export function GraphSketch({ graph }: { graph: Graph | null }) {
  const nodes = graph?.nodes ?? [];
  const patient = nodes.find((n) => n.type === "Patient") ?? nodes[0];
  const sessions = nodes.filter((n) => n.type === "Session").slice(-2);
  const clinical = nodes.filter((n) => !["Patient", "Session"].includes(n.type)).slice(0, 5);
  const hypothesis = nodes.find((n) => n.type === "Hypothesis");

  return (
    <div className="box" style={{ minHeight: 300, justifyContent: "center", gap: 14 }}>
      <div className="row" style={{ justifyContent: "center" }}>
        <span className="node" style={{ borderWidth: 2.5 }}>
          Patient: {patient?.label ?? "Anna Müller"}
        </span>
      </div>
      <div className="row" style={{ justifyContent: "center" }}>
        <span className="edge">HAS_SESSION ↓</span>
      </div>
      <div className="row" style={{ justifyContent: "center" }}>
        {(sessions.length ? sessions : [{ id: "s1", label: "Session #9" }, { id: "s2", label: "Session #11" }]).map((n) => (
          <span className="node" key={n.id}>
            {short(n.label)}
          </span>
        ))}
      </div>
      <div className="row" style={{ justifyContent: "center" }}>
        <span className="edge">MENTIONS ↓</span>
      </div>
      <div className="row" style={{ justifyContent: "center" }}>
        {(clinical.length
          ? clinical
          : [
              { id: "c1", label: "Complaint: Fatigue" },
              { id: "c2", label: "Lab: Low ferritin 9 ng/mL" },
              { id: "c3", label: "Diagnosis: Gastric ulcer" },
            ]
        ).map((n) => (
          <span className="node" key={n.id}>
            {short(n.label)}
          </span>
        ))}
      </div>
      <div className="row" style={{ justifyContent: "center" }}>
        <span className="edge">SUPPORTS ↓</span>
        <span className="edge" style={{ marginLeft: 120 }}>
          HAS_DOSAGE ↓
        </span>
      </div>
      <div className="row" style={{ justifyContent: "center" }}>
        <span className="node hyp">{short(hypothesis?.label ?? "Hypothesis: Possible iron-deficiency pattern")}</span>
        <span className="node">Plan: Avoid aspirin/NSAIDs</span>
        <span className="node">Dosage: Pantoprazole 40 mg</span>
      </div>
    </div>
  );
}

export function NodeDetail({ node }: { node?: GraphNode }) {
  return (
    <div className="box">
      <div className="sec">Node detail</div>
      <div className="kv">
        <span>Type</span>
        <b>{node?.type ?? "Lab result"}</b>
      </div>
      <div className="kv">
        <span>Label</span>
        <b style={{ textAlign: "right" }}>{node?.label ?? "Low ferritin 9 ng/mL"}</b>
      </div>
      <div className="kv">
        <span>Timestamp</span>
        <b>{fmtDate(node?.timestamp) ?? "2026-02-11"}</b>
      </div>
      <div className="kv">
        <span>Context</span>
        <span style={{ textAlign: "right" }}>{node?.context ?? "tiredness work-up"}</span>
      </div>
      <div className="sec" style={{ marginTop: 6 }}>
        Actions
      </div>
      <button className="btn">Inspect supporting evidence</button>
      <button className="btn">Open related timeline entries</button>
      <button className="btn">Run recall from this node</button>
    </div>
  );
}

function short(value: string) {
  return value.length > 42 ? `${value.slice(0, 39)}…` : value;
}
