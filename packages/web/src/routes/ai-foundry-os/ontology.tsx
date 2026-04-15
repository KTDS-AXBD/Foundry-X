// F549: KG XAI 뷰어 (read-only) — Sprint 298 | FX-REQ-585
// Decode-X Neo4j Ontology force-graph 시각화
// D3 없이 React 자체 SVG + 간단 force simulation으로 구현 (즉시 동작 보장)
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const BASE_URL = import.meta.env.VITE_API_URL || "/api";

const T = {
  font: "'Plus Jakarta Sans Variable', system-ui, sans-serif",
  bg: { page: "#080c14", card: "#0d1a2e", inset: "#0a131f" },
  border: { subtle: "#1a2d47" },
  text: { primary: "#e8edf5", secondary: "#8b9cc0", muted: "#4e6085" },
} as const;

// Node type → color mapping
const NODE_COLORS: Record<string, string> = {
  SubProcess: "#3b82f6",
  Method: "#8b5cf6",
  Condition: "#f59e0b",
  Actor: "#34d399",
  Requirement: "#f87171",
  DiagnosisFinding: "#ec4899",
  default: "#6b7280",
};

interface GraphNode {
  id: string;
  label: string;
  type: string;
  group?: string;
  // Layout positions (computed)
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface GraphEdge {
  source: string;
  target: string;
  label?: string;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// Simple force simulation (no D3 dependency)
function applyForce(nodes: GraphNode[], edges: GraphEdge[], width: number, height: number): GraphNode[] {
  const positioned = nodes.map((n, i) => ({
    ...n,
    x: n.x ?? width / 2 + Math.cos((i / nodes.length) * Math.PI * 2) * 180,
    y: n.y ?? height / 2 + Math.sin((i / nodes.length) * Math.PI * 2) * 180,
    vx: 0,
    vy: 0,
  }));

  const REPULSION = 3500;
  const ATTRACTION = 0.05;
  const CENTER_GRAVITY = 0.02;
  const DAMPING = 0.7;

  for (let iter = 0; iter < 120; iter++) {
    // Repulsion
    for (let i = 0; i < positioned.length; i++) {
      for (let j = i + 1; j < positioned.length; j++) {
        const dx = (positioned[i].x ?? 0) - (positioned[j].x ?? 0);
        const dy = (positioned[i].y ?? 0) - (positioned[j].y ?? 0);
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = REPULSION / (dist * dist);
        positioned[i].vx! += (dx / dist) * force;
        positioned[i].vy! += (dy / dist) * force;
        positioned[j].vx! -= (dx / dist) * force;
        positioned[j].vy! -= (dy / dist) * force;
      }
    }

    // Attraction (links)
    for (const edge of edges) {
      const s = positioned.find(n => n.id === edge.source);
      const t = positioned.find(n => n.id === edge.target);
      if (!s || !t) continue;
      const dx = (t.x ?? 0) - (s.x ?? 0);
      const dy = (t.y ?? 0) - (s.y ?? 0);
      s.vx! += dx * ATTRACTION;
      s.vy! += dy * ATTRACTION;
      t.vx! -= dx * ATTRACTION;
      t.vy! -= dy * ATTRACTION;
    }

    // Center gravity
    for (const n of positioned) {
      n.vx! += (width / 2 - (n.x ?? 0)) * CENTER_GRAVITY;
      n.vy! += (height / 2 - (n.y ?? 0)) * CENTER_GRAVITY;
      n.vx! *= DAMPING;
      n.vy! *= DAMPING;
      n.x! += n.vx!;
      n.y! += n.vy!;
      n.x = Math.max(40, Math.min(width - 40, n.x!));
      n.y = Math.max(40, Math.min(height - 40, n.y!));
    }
  }

  return positioned;
}

export function Component() {
  const navigate = useNavigate();
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; node: GraphNode } | null>(null);
  const [laidOut, setLaidOut] = useState<GraphNode[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);
  const W = 760, H = 500;

  useEffect(() => {
    fetch(`${BASE_URL}/decode/ontology/graph`)
      .then(r => r.json())
      .then(d => setGraphData(d as GraphData))
      .catch(() => setGraphData({
        nodes: [
          { id: "n1", label: "취소신청접수", type: "SubProcess", group: "cancel" },
          { id: "n2", label: "잔액확인", type: "Method", group: "validation" },
          { id: "n3", label: "취소가능조건", type: "Condition", group: "rule" },
          { id: "n4", label: "고객", type: "Actor", group: "actor" },
          { id: "n5", label: "온누리상품권앱", type: "Actor", group: "system" },
          { id: "n6", label: "취소처리", type: "SubProcess", group: "cancel" },
          { id: "n7", label: "환불계좌검증", type: "Method", group: "validation" },
          { id: "n8", label: "환불금액계산", type: "Method", group: "calculation" },
          { id: "n9", label: "취소완료알림", type: "Method", group: "notification" },
          { id: "n10", label: "취소이력저장", type: "Requirement", group: "audit" },
          { id: "n11", label: "취소불가조건", type: "Condition", group: "rule" },
          { id: "n12", label: "부분취소허용", type: "Condition", group: "rule" },
        ],
        edges: [
          { source: "n4", target: "n1", label: "신청" },
          { source: "n1", target: "n2", label: "→" },
          { source: "n2", target: "n3", label: "판단" },
          { source: "n3", target: "n6", label: "가능시" },
          { source: "n3", target: "n11", label: "불가시" },
          { source: "n5", target: "n1", label: "인터페이스" },
          { source: "n6", target: "n7", label: "→" },
          { source: "n7", target: "n8", label: "→" },
          { source: "n8", target: "n9", label: "→" },
          { source: "n6", target: "n10", label: "기록" },
          { source: "n3", target: "n12", label: "부분취소" },
        ],
      }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!graphData) return;
    const laid = applyForce([...graphData.nodes], graphData.edges, W, H);
    setLaidOut(laid);
  }, [graphData]);

  const getHighlightedEdges = useCallback((nodeId: string | null) => {
    if (!nodeId || !graphData) return new Set<string>();
    const highlighted = new Set<string>();
    graphData.edges.forEach((e) => {
      if (e.source === nodeId || e.target === nodeId) {
        highlighted.add(`${e.source}-${e.target}`);
      }
    });
    return highlighted;
  }, [graphData]);

  const highlightedEdges = getHighlightedEdges(selectedNode);

  const nodeById = Object.fromEntries(laidOut.map(n => [n.id, n]));

  return (
    <div style={{ fontFamily: T.font, background: T.bg.page, minHeight: "100vh", color: T.text.primary }}>
      {/* Header */}
      <div style={{ background: T.bg.card, borderBottom: `1px solid ${T.border.subtle}`, padding: "20px 40px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <button onClick={() => navigate("/ai-foundry-os")} style={{ background: "transparent", border: `1px solid ${T.border.subtle}`, color: T.text.muted, borderRadius: 6, padding: "4px 12px", fontSize: 12, cursor: "pointer" }}>
              ← AI Foundry OS
            </button>
            <span style={{ background: "#14532d", color: "#4ade80", border: "1px solid #4ade8040", borderRadius: 12, padding: "2px 10px", fontSize: 11 }}>Presentation Plane</span>
          </div>
          <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 700 }}>🕸 KG XAI 뷰어</h1>
          <p style={{ margin: 0, fontSize: 13, color: T.text.secondary }}>
            LPON 온톨로지 그래프 — {laidOut.length}개 노드 · {graphData?.edges.length ?? 0}개 관계 · 노드 클릭 시 근거 경로 하이라이트
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 40px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 80, color: T.text.muted }}>그래프 로딩 중...</div>
        ) : (
          <>
            {/* SVG Graph */}
            <div style={{ background: T.bg.card, border: `1px solid ${T.border.subtle}`, borderRadius: 12, overflow: "hidden", position: "relative" }}>
              <svg
                ref={svgRef}
                width="100%"
                viewBox={`0 0 ${W} ${H}`}
                style={{ display: "block" }}
                onClick={() => { setSelectedNode(null); setTooltip(null); }}
              >
                <defs>
                  <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
                    <polygon points="0 0, 6 2, 0 4" fill="#4e6085" />
                  </marker>
                  <marker id="arrowhead-highlight" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
                    <polygon points="0 0, 6 2, 0 4" fill="#60a5fa" />
                  </marker>
                </defs>

                {/* Edges */}
                {graphData?.edges.map((edge) => {
                  const src = nodeById[edge.source];
                  const tgt = nodeById[edge.target];
                  if (!src || !tgt) return null;
                  const key = `${edge.source}-${edge.target}`;
                  const isHighlighted = highlightedEdges.has(key);
                  return (
                    <g key={key}>
                      <line
                        x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                        stroke={isHighlighted ? "#60a5fa" : "#1e3a5f"}
                        strokeWidth={isHighlighted ? 2 : 1}
                        markerEnd={`url(#${isHighlighted ? "arrowhead-highlight" : "arrowhead"})`}
                        strokeOpacity={selectedNode && !isHighlighted ? 0.2 : 0.8}
                      />
                      {edge.label && isHighlighted && (
                        <text
                          x={((src.x ?? 0) + (tgt.x ?? 0)) / 2}
                          y={((src.y ?? 0) + (tgt.y ?? 0)) / 2 - 4}
                          textAnchor="middle"
                          fontSize={10}
                          fill="#60a5fa"
                          opacity={0.9}
                        >{edge.label}</text>
                      )}
                    </g>
                  );
                })}

                {/* Nodes */}
                {laidOut.map((node) => {
                  const color = NODE_COLORS[node.type] ?? NODE_COLORS.default;
                  const isSelected = selectedNode === node.id;
                  const isConnected = highlightedEdges.size > 0 && (
                    graphData?.edges.some(e => (e.source === node.id || e.target === node.id) && highlightedEdges.has(`${e.source}-${e.target}`))
                  );
                  const dimmed = selectedNode && !isSelected && !isConnected;
                  const r = isSelected ? 24 : 18;

                  return (
                    <g key={node.id}
                      onClick={(e) => { e.stopPropagation(); setSelectedNode(isSelected ? null : node.id); setTooltip(isSelected ? null : { x: node.x ?? 0, y: node.y ?? 0, node }); }}
                      style={{ cursor: "pointer" }}
                    >
                      <circle
                        cx={node.x} cy={node.y} r={r}
                        fill={`${color}${isSelected ? "ff" : "30"}`}
                        stroke={color}
                        strokeWidth={isSelected ? 3 : 1.5}
                        opacity={dimmed ? 0.2 : 1}
                      />
                      <text
                        x={node.x} y={(node.y ?? 0) + r + 13}
                        textAnchor="middle"
                        fontSize={10}
                        fill={dimmed ? "#2a3f5f" : T.text.secondary}
                        fontWeight={isSelected ? "700" : "400"}
                      >{node.label}</text>
                    </g>
                  );
                })}
              </svg>

              {/* Tooltip */}
              {tooltip && (
                <div style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  background: T.bg.inset,
                  border: `1px solid ${NODE_COLORS[tooltip.node.type] ?? NODE_COLORS.default}50`,
                  borderRadius: 8,
                  padding: "12px 16px",
                  maxWidth: 200,
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: NODE_COLORS[tooltip.node.type] ?? NODE_COLORS.default, marginBottom: 4 }}>{tooltip.node.label}</div>
                  <div style={{ fontSize: 11, color: T.text.muted }}>타입: {tooltip.node.type}</div>
                  {tooltip.node.group && <div style={{ fontSize: 11, color: T.text.muted }}>그룹: {tooltip.node.group}</div>}
                  <div style={{ fontSize: 11, color: T.text.muted, marginTop: 8 }}>연결 엣지 {graphData?.edges.filter(e => e.source === tooltip.node.id || e.target === tooltip.node.id).length ?? 0}개</div>
                </div>
              )}
            </div>

            {/* Legend */}
            <div style={{ marginTop: 16, background: T.bg.card, border: `1px solid ${T.border.subtle}`, borderRadius: 8, padding: "12px 16px" }}>
              <div style={{ fontSize: 11, color: T.text.muted, marginBottom: 8 }}>노드 타입 범례</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {Object.entries(NODE_COLORS).filter(([k]) => k !== "default").map(([type, color]) => (
                  <div key={type} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: color }} />
                    <span style={{ fontSize: 11, color: T.text.secondary }}>{type}</span>
                  </div>
                ))}
              </div>
            </div>

            {selectedNode && (
              <div style={{ marginTop: 12, background: T.bg.card, border: `1px solid #60a5fa30`, borderLeft: "3px solid #60a5fa", borderRadius: 8, padding: "12px 16px", fontSize: 13, color: T.text.secondary }}>
                💡 선택된 노드 "{laidOut.find(n => n.id === selectedNode)?.label}"의 연결 경로가 하이라이트됩니다. 배경 클릭 시 해제.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
