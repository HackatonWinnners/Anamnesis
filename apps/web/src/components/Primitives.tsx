import type { Graph, GraphNode, HistoryResponse } from "@anamnesis/shared";
import type { CSSProperties, ReactNode } from "react";
import { fmtDate } from "../lib/patientData";

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

export function GraphSketch({
  graph,
  selectedNodeId,
  onSelectNode,
}: {
  graph: Graph | null;
  selectedNodeId?: string | null;
  onSelectNode?: (node: GraphNode) => void;
}) {
  const nodes = graph?.nodes ?? [];
  const patient = nodes.find((n) => n.type === "Patient") ?? nodes[0];
  const sessions = nodes.filter((n) => n.type === "Session").slice(-2);
  const clinical = nodes.filter((n) => !["Patient", "Session"].includes(n.type)).slice(0, 5);
  const hypothesis = nodes.find((n) => n.type === "Hypothesis");

  if (nodes.length === 0) {
    return (
      <div className="box" style={{ minHeight: 300, justifyContent: "center", alignItems: "center" }}>
        <span className="muted">No graph loaded yet. Press “Load graph” to run recall().</span>
      </div>
    );
  }

  return (
    <div className="box" style={{ minHeight: 300, justifyContent: "center", gap: 14 }}>
      <div className="row" style={{ justifyContent: "center" }}>
        <GraphNodePill node={patient} label={`Patient: ${patient?.label ?? "—"}`} selectedNodeId={selectedNodeId} onSelectNode={onSelectNode} style={{ borderWidth: 2.5 }} />
      </div>
      {sessions.length ? (
        <>
      <div className="row" style={{ justifyContent: "center" }}>
        <span className="edge">HAS_SESSION ↓</span>
      </div>
      <div className="row" style={{ justifyContent: "center" }}>
        {sessions.map((n) => (
          <GraphNodePill key={n.id} node={n} label={short(n.label)} selectedNodeId={selectedNodeId} onSelectNode={onSelectNode} />
        ))}
      </div>
        </>
      ) : null}
      {clinical.length ? (
        <>
      <div className="row" style={{ justifyContent: "center" }}>
        <span className="edge">MENTIONS ↓</span>
      </div>
      <div className="row" style={{ justifyContent: "center" }}>
        {clinical.map((n) => (
          <GraphNodePill key={n.id} node={n} label={short(`${n.type}: ${n.label}`)} selectedNodeId={selectedNodeId} onSelectNode={onSelectNode} />
        ))}
      </div>
        </>
      ) : null}
      {hypothesis ? (
        <>
      <div className="row" style={{ justifyContent: "center" }}>
        <span className="edge">SUPPORTS ↓</span>
      </div>
      <div className="row" style={{ justifyContent: "center" }}>
        <GraphNodePill node={hypothesis} label={short(`Hypothesis: ${hypothesis.label}`)} selectedNodeId={selectedNodeId} onSelectNode={onSelectNode} className="hyp" />
      </div>
        </>
      ) : null}
    </div>
  );
}

function GraphNodePill({
  node,
  label,
  selectedNodeId,
  onSelectNode,
  className = "",
  style,
}: {
  node?: GraphNode;
  label: string;
  selectedNodeId?: string | null;
  onSelectNode?: (node: GraphNode) => void;
  className?: string;
  style?: CSSProperties;
}) {
  const selected = Boolean(node && selectedNodeId === node.id);
  if (!node || !onSelectNode) {
    return <span className={`node ${className}`.trim()} style={style}>{label}</span>;
  }
  return (
    <button
      type="button"
      className={`node nodebtn ${className} ${selected ? "selected" : ""}`.trim()}
      style={style}
      onClick={() => onSelectNode(node)}
      aria-pressed={selected}
      title={`Select ${node.type}: ${node.label}`}
    >
      {label}
    </button>
  );
}

export function NodeDetail({ node }: { node?: GraphNode }) {
  return (
    <div className="box">
      <div className="sec">Node detail</div>
      {node ? (
        <>
          <div className="kv"><span>Type</span><b>{node.type}</b></div>
          <div className="kv"><span>Label</span><b style={{ textAlign: "right" }}>{node.label}</b></div>
          <div className="kv"><span>Timestamp</span><b>{fmtDate(node.timestamp)}</b></div>
          <div className="kv"><span>Context</span><span style={{ textAlign: "right" }}>{node.context ?? "—"}</span></div>
        </>
      ) : (
        <span className="muted">No node selected. Load the graph to inspect a node.</span>
      )}
    </div>
  );
}

function short(value: string) {
  return value.length > 42 ? `${value.slice(0, 39)}…` : value;
}
