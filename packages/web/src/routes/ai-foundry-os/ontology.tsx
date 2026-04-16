// F549 + B4: KG XAI 뷰어 — Swimlane 레이아웃 + 내러티브 경로 토글
// Sprint 298 (F549) · 리허설 D-1 hotfix (B4)
// force simulation → column layout (타입별 lane) + 기본 하이라이트 경로 + 내러티브 패널
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";

const BASE_URL = import.meta.env.VITE_API_URL || "/api";

import { fos, fonts, NODE_COLORS } from "./tokens";
import { DemoNav } from "./demo-nav";

const T = {
  font: fonts.body,
  bg: { page: fos.surface.abyss, card: fos.surface.panel, inset: fos.surface.inset },
  border: { subtle: fos.border.subtle },
  text: { primary: fos.text.primary, secondary: fos.text.secondary, muted: fos.text.muted },
} as const;

const NODE_RADIUS: Record<string, number> = {
  Actor: 22, SubProcess: 20, Method: 16,
  Condition: 16, Requirement: 14, DiagnosisFinding: 14, default: 16,
};

const COLUMN_ORDER = ["Actor", "SubProcess", "Method", "Condition", "Requirement", "DiagnosisFinding"] as const;
const COLUMN_LABELS: Record<string, string> = {
  Actor: "① 누가",
  SubProcess: "② 어디서",
  Method: "③ 어떻게",
  Condition: "④ 판단",
  Requirement: "⑤ 남겨야",
  DiagnosisFinding: "⑥ 진단",
};

type PathMode = "success" | "failure" | "partial" | "all";

const PATH_EDGES: Record<Exclude<PathMode, "all">, Array<[string, string]>> = {
  success: [
    ["n4", "n1"], ["n1", "n2"], ["n2", "n3"], ["n3", "n6"],
    ["n6", "n7"], ["n7", "n8"], ["n8", "n9"], ["n6", "n10"],
  ],
  failure: [["n4", "n1"], ["n1", "n2"], ["n2", "n3"], ["n3", "n11"]],
  partial: [["n4", "n1"], ["n1", "n2"], ["n2", "n3"], ["n3", "n12"]],
};

const PATH_LABELS: Record<PathMode, string> = {
  success: "① 성공 경로 — 정상 취소",
  failure: "② 불가 경로 — 조건 미충족",
  partial: "③ 부분 취소",
  all: "전체 보기",
};

const PATH_COLORS: Record<PathMode, string> = {
  success: "#34d399",
  failure: "#f87171",
  partial: "#f59e0b",
  all: "#60a5fa",
};

const NARRATIVES: Record<PathMode, string> = {
  success: "고객이 앱으로 취소를 신청하면, 잔액확인 후 '취소가능조건'을 판단합니다. 가능 시 취소처리 → 환불계좌검증 → 금액계산 → 완료알림 순으로 진행되고, 동시에 '취소이력저장'에 기록됩니다.",
  failure: "고객 신청 후 '취소가능조건' 판단에서 미충족 시 '취소불가조건'이 적용되어 거절 응답으로 종료됩니다.",
  partial: "잔액 중 일부만 취소하는 경우 '부분취소허용' 규칙이 적용되어 잔여 금액이 보존됩니다.",
  all: "LPON 취소 업무 온톨로지 — Actor · SubProcess · Method · Condition · Requirement 5개 타입, 3가지 분기(성공/불가/부분)를 포함한 도메인 계약.",
};

interface GraphNode {
  id: string;
  label: string;
  type: string;
  group?: string;
  x?: number;
  y?: number;
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

function applyColumnLayout(nodes: GraphNode[], W: number, H: number): GraphNode[] {
  const topPad = 90;
  const bottomPad = 40;
  const colCount = COLUMN_ORDER.length;
  const colWidth = W / colCount;
  const byType = new Map<string, GraphNode[]>();
  for (const n of nodes) {
    const type = (COLUMN_ORDER as readonly string[]).includes(n.type) ? n.type : "Method";
    const list = byType.get(type) ?? [];
    list.push(n);
    byType.set(type, list);
  }
  const positioned: GraphNode[] = [];
  COLUMN_ORDER.forEach((type, colIdx) => {
    const siblings = byType.get(type) ?? [];
    siblings.forEach((n, i) => {
      positioned.push({
        ...n,
        x: colIdx * colWidth + colWidth / 2,
        y: topPad + (H - topPad - bottomPad) * (i + 1) / (siblings.length + 1),
      });
    });
  });
  return positioned;
}

const FALLBACK_DATA: GraphData = {
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
};

export function Component() {
  const navigate = useNavigate();
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pathMode, setPathMode] = useState<PathMode>("success");
  const [hoverNode, setHoverNode] = useState<string | null>(null);
  const W = 1000, H = 520;

  useEffect(() => {
    fetch(`${BASE_URL}/decode/ontology/graph`)
      .then(r => r.json())
      .then(d => setGraphData(d as GraphData))
      .catch(() => setGraphData(FALLBACK_DATA))
      .finally(() => setLoading(false));
  }, []);

  const laidOut = useMemo(
    () => graphData ? applyColumnLayout(graphData.nodes, W, H) : [],
    [graphData]
  );
  const nodeById = useMemo(
    () => Object.fromEntries(laidOut.map(n => [n.id, n])),
    [laidOut]
  );

  const pathEdgeSet = useMemo(() => {
    if (pathMode === "all") return new Set<string>();
    return new Set(PATH_EDGES[pathMode].map(([s, t]) => `${s}-${t}`));
  }, [pathMode]);

  const pathNodeSet = useMemo(() => {
    if (pathMode === "all") return new Set<string>();
    const set = new Set<string>();
    PATH_EDGES[pathMode].forEach(([s, t]) => { set.add(s); set.add(t); });
    return set;
  }, [pathMode]);

  const activePathColor = PATH_COLORS[pathMode];

  return (
    <div style={{ fontFamily: T.font, background: T.bg.page, minHeight: "100vh", color: T.text.primary }}>
      <DemoNav />
      {/* Header */}
      <div style={{ background: T.bg.card, borderBottom: `1px solid ${T.border.subtle}`, padding: "20px 40px" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <button onClick={() => navigate("/ai-foundry-os")} style={{ background: "transparent", border: `1px solid ${T.border.subtle}`, color: T.text.muted, borderRadius: 6, padding: "4px 12px", fontSize: 12, cursor: "pointer" }}>
              ← AI Foundry OS
            </button>
            <span style={{ background: "#14532d", color: "#4ade80", border: "1px solid #4ade8040", borderRadius: 12, padding: "2px 10px", fontSize: 11 }}>Presentation Plane</span>
          </div>
          <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 700 }}>🕸 KG XAI 뷰어</h1>
          <p style={{ margin: 0, fontSize: 13, color: T.text.secondary }}>
            LPON 취소 업무 온톨로지 — {laidOut.length}개 노드 · {graphData?.edges.length ?? 0}개 관계 · 왼쪽에서 오른쪽으로 업무 흐름
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "24px 20px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 80, color: T.text.muted }}>그래프 로딩 중...</div>
        ) : (
          <>
            {/* Path toggle */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              {(["success", "failure", "partial", "all"] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setPathMode(m)}
                  style={{
                    background: pathMode === m ? `${PATH_COLORS[m]}20` : "transparent",
                    border: `1px solid ${pathMode === m ? PATH_COLORS[m] : T.border.subtle}`,
                    color: pathMode === m ? PATH_COLORS[m] : T.text.secondary,
                    padding: "6px 14px", borderRadius: 6, fontSize: 12, cursor: "pointer", fontWeight: pathMode === m ? 600 : 400,
                  }}
                >{PATH_LABELS[m]}</button>
              ))}
            </div>

            {/* SVG Graph */}
            <div style={{ background: T.bg.card, border: `1px solid ${T.border.subtle}`, borderRadius: 12, overflow: "hidden" }}>
              <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
                <defs>
                  <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
                    <polygon points="0 0, 6 2, 0 4" fill="#4e6085" />
                  </marker>
                  <marker id="arrowhead-highlight" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
                    <polygon points="0 0, 6 2, 0 4" fill={activePathColor} />
                  </marker>
                </defs>

                {/* Column headers + dividers */}
                {COLUMN_ORDER.map((type, i) => {
                  const colW = W / COLUMN_ORDER.length;
                  const cx = i * colW + colW / 2;
                  return (
                    <g key={`col-${type}`}>
                      <text x={cx} y={26} textAnchor="middle" fontSize={12} fill={T.text.secondary} fontWeight={600}>
                        {COLUMN_LABELS[type]}
                      </text>
                      <text x={cx} y={44} textAnchor="middle" fontSize={9} fill={T.text.muted}>
                        {type}
                      </text>
                      {i > 0 && (
                        <line x1={i * colW} y1={56} x2={i * colW} y2={H - 20}
                          stroke={T.border.subtle} strokeDasharray="2,5" opacity={0.4} />
                      )}
                    </g>
                  );
                })}

                {/* Edges */}
                {graphData?.edges.map((edge) => {
                  const src = nodeById[edge.source];
                  const tgt = nodeById[edge.target];
                  if (!src || !tgt) return null;
                  const key = `${edge.source}-${edge.target}`;
                  const isInPath = pathEdgeSet.has(key);
                  const isAll = pathMode === "all";
                  const dimmed = !isAll && !isInPath;
                  const strokeColor = isInPath ? activePathColor : "#1e3a5f";
                  const midX = ((src.x ?? 0) + (tgt.x ?? 0)) / 2;
                  const midY = ((src.y ?? 0) + (tgt.y ?? 0)) / 2;
                  return (
                    <g key={key} opacity={dimmed ? 0.15 : 1}>
                      <line
                        x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                        stroke={strokeColor}
                        strokeWidth={isInPath ? 2.5 : 1}
                        markerEnd={`url(#${isInPath ? "arrowhead-highlight" : "arrowhead"})`}
                        strokeOpacity={0.85}
                      />
                      {edge.label && edge.label !== "→" && (
                        <g>
                          <rect x={midX - 22} y={midY - 8} width={44} height={14} fill={T.bg.card} rx={3} opacity={0.85} />
                          <text x={midX} y={midY + 2} textAnchor="middle" fontSize={9.5}
                            fill={isInPath ? activePathColor : T.text.muted} fontWeight={isInPath ? 600 : 400}>
                            {edge.label}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}

                {/* Nodes */}
                {laidOut.map((node) => {
                  const color = NODE_COLORS[node.type] ?? NODE_COLORS.default;
                  const r = NODE_RADIUS[node.type] ?? NODE_RADIUS.default;
                  const isInPath = pathNodeSet.has(node.id);
                  const isAll = pathMode === "all";
                  const dimmed = !isAll && !isInPath;
                  const isHover = hoverNode === node.id;
                  return (
                    <g key={node.id}
                      onMouseEnter={() => setHoverNode(node.id)}
                      onMouseLeave={() => setHoverNode(null)}
                      style={{ cursor: "pointer" }}
                      opacity={dimmed ? 0.25 : 1}
                    >
                      <circle
                        cx={node.x} cy={node.y} r={isHover ? r + 3 : r}
                        fill={`${color}${isInPath || isAll ? "40" : "25"}`}
                        stroke={color}
                        strokeWidth={isInPath ? 2.5 : 1.5}
                      />
                      <text
                        x={node.x} y={(node.y ?? 0) + r + 14}
                        textAnchor="middle"
                        fontSize={11}
                        fill={isInPath || isAll ? T.text.primary : T.text.secondary}
                        fontWeight={isInPath ? 600 : 400}
                      >{node.label}</text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Narrative */}
            <div style={{
              marginTop: 16,
              background: T.bg.card,
              border: `1px solid ${T.border.subtle}`,
              borderLeft: `3px solid ${activePathColor}`,
              borderRadius: 8,
              padding: "14px 18px",
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: activePathColor, marginBottom: 6 }}>
                {PATH_LABELS[pathMode]}
              </div>
              <div style={{ fontSize: 13, color: T.text.secondary, lineHeight: 1.7 }}>
                {NARRATIVES[pathMode]}
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              {[
                { label: "노드", value: laidOut.length },
                { label: "관계", value: graphData?.edges.length ?? 0 },
                { label: "Actor", value: laidOut.filter(n => n.type === "Actor").length },
                { label: "Method", value: laidOut.filter(n => n.type === "Method").length },
                { label: "Condition", value: laidOut.filter(n => n.type === "Condition").length },
              ].map(s => (
                <div key={s.label} style={{ flex: 1, background: T.bg.card, border: `1px solid ${T.border.subtle}`, borderRadius: 8, padding: "10px 14px" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: T.text.primary }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: T.text.muted, marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div style={{ marginTop: 12, background: T.bg.card, border: `1px solid ${T.border.subtle}`, borderRadius: 8, padding: "10px 14px" }}>
              <div style={{ fontSize: 10, color: T.text.muted, marginBottom: 6 }}>노드 타입 범례</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {Object.entries(NODE_COLORS).filter(([k]) => k !== "default").map(([type, color]) => (
                  <div key={type} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: color }} />
                    <span style={{ fontSize: 11, color: T.text.secondary }}>{type}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
