// F545: AI Foundry OS 3-Plane 랜딩 대시보드 — 공개 (인증 불필요)
// Sprint 298 | FX-REQ-581 | 대표 보고 4/17 09:00
import { useNavigate } from "react-router-dom";

const T = {
  font: "'Plus Jakarta Sans Variable', system-ui, sans-serif",
  bg: { page: "#080c14", card: "#0d1a2e", inset: "#0a131f", accent: "#0f1e35" },
  border: { subtle: "#1a2d47", glow: "#1d4ed8" },
  text: { primary: "#e8edf5", secondary: "#8b9cc0", muted: "#4e6085", accent: "#60a5fa" },
  colors: {
    input: "#3b82f6",    // Blue — Input Plane
    control: "#8b5cf6",  // Purple — Control Plane
    present: "#10b981",  // Green — Presentation Plane
    badge: "#f59e0b",    // Amber — LPON badge
  },
} as const;

const planes = [
  {
    id: "input",
    label: "Input Plane",
    subtitle: "Decode-X 정찰 엔진",
    color: T.colors.input,
    icon: "⚡",
    description: "SI/ITO 산출물과 소스코드를 역공학하여 도메인 암묵지를 추출. 3-Pass 분석(Scoring → Diagnosis → Comparison)으로 AI-Ready 반제품을 생성.",
    metrics: ["847+ Tests GREEN", "3-Pass 분석", "LPON 반제품 완성"],
    link: "/ai-foundry-os/demo/lpon",
    linkLabel: "라이브 시연 →",
  },
  {
    id: "control",
    label: "Control Plane",
    subtitle: "3대 자산 관리",
    color: T.colors.control,
    icon: "🎛",
    description: "Harness Engineering · AI Engine · Ontology KG — 현장 투입 수행인력이 가방에 넣어가는 3대 자산의 상태와 품질을 실시간으로 점검.",
    metrics: ["5종 자동 점검", "실시간 지표", "KT연계성 100%"],
    link: "/ai-foundry-os/harness",
    linkLabel: "Harness 점검 →",
  },
  {
    id: "presentation",
    label: "Presentation Plane",
    subtitle: "KG XAI 뷰어",
    color: T.colors.present,
    icon: "🕸",
    description: "Decode-X Neo4j Ontology를 D3 force-graph로 시각화. 노드 클릭 시 '이 결정의 근거 경로'를 하이라이트하여 AI 판단의 설명가능성(XAI)을 제공.",
    metrics: ["Neo4j 실데이터", "D3 force-graph", "경로 하이라이트"],
    link: "/ai-foundry-os/ontology",
    linkLabel: "KG 뷰어 →",
  },
];

export function Component() {
  const navigate = useNavigate();

  return (
    <div style={{ fontFamily: T.font, background: T.bg.page, minHeight: "100vh", color: T.text.primary }}>
      {/* Header */}
      <div style={{ background: T.bg.card, borderBottom: `1px solid ${T.border.subtle}`, padding: "24px 40px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
            <span style={{ fontSize: 32 }}>🏭</span>
            <div>
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: T.text.primary }}>
                AI Foundry OS
              </h1>
              <p style={{ margin: 0, fontSize: 13, color: T.text.secondary }}>
                Foundry-X × Decode-X — 3-Plane 통합 플랫폼
              </p>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{
                background: "#78350f",
                color: T.colors.badge,
                border: `1px solid ${T.colors.badge}40`,
                borderRadius: 20,
                padding: "4px 14px",
                fontSize: 12,
                fontWeight: 600,
              }}>
                🎯 LPON 반제품 시연 준비
              </span>
              <span style={{ color: T.text.muted, fontSize: 12 }}>v0.1 MVP | 4/17 대표 보고</span>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: 14, color: T.text.secondary, maxWidth: 720 }}>
            "가방에 넣어가는 3대 자산(Harness · AI Engine · Ontology) + Spec" — SI/ITO 고객사 투입 시
            AI-Ready 반제품을 즉시 생성하는 엔드-투-엔드 플랫폼. 온누리상품권 취소(LPON)를 첫 Type 1 반제품으로 실증.
          </p>
        </div>
      </div>

      {/* 3-Plane Cards */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 40px 0" }}>
        <h2 style={{ margin: "0 0 24px", fontSize: 16, color: T.text.secondary, fontWeight: 500, textTransform: "uppercase", letterSpacing: 1 }}>
          3-Plane Architecture (DeepDive v0.3)
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {planes.map((plane) => (
            <div key={plane.id} style={{
              background: T.bg.card,
              border: `1px solid ${plane.color}30`,
              borderTop: `3px solid ${plane.color}`,
              borderRadius: 12,
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 24 }}>{plane.icon}</span>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: plane.color }}>{plane.label}</div>
                    <div style={{ fontSize: 12, color: T.text.muted }}>{plane.subtitle}</div>
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: T.text.secondary, lineHeight: 1.6 }}>
                  {plane.description}
                </p>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {plane.metrics.map((m) => (
                  <span key={m} style={{
                    background: `${plane.color}15`,
                    border: `1px solid ${plane.color}30`,
                    color: plane.color,
                    borderRadius: 6,
                    padding: "2px 10px",
                    fontSize: 11,
                    fontWeight: 500,
                  }}>{m}</span>
                ))}
              </div>

              <button
                onClick={() => navigate(plane.link)}
                style={{
                  background: `${plane.color}20`,
                  border: `1px solid ${plane.color}50`,
                  color: plane.color,
                  borderRadius: 8,
                  padding: "10px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  textAlign: "center",
                  marginTop: "auto",
                }}
              >
                {plane.linkLabel}
              </button>
            </div>
          ))}
        </div>

        {/* LPON 요약 카드 */}
        <div style={{
          marginTop: 32,
          background: T.bg.accent,
          border: `1px solid ${T.colors.badge}30`,
          borderLeft: `4px solid ${T.colors.badge}`,
          borderRadius: 12,
          padding: 24,
          display: "flex",
          alignItems: "center",
          gap: 24,
        }}>
          <span style={{ fontSize: 40 }}>🏪</span>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: T.text.primary }}>
                온누리상품권 취소 (LPON) — Type 1 반제품
              </span>
              <span style={{
                background: "#14532d",
                color: "#4ade80",
                border: "1px solid #4ade8040",
                borderRadius: 12,
                padding: "2px 10px",
                fontSize: 11,
                fontWeight: 600,
              }}>READY</span>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: T.text.secondary }}>
              Decode-X `반제품-스펙/pilot-lpon-cancel/working-version/` — 6종 Spec + 구현 코드 + 테스트 + D1 스키마 완성.
              3-Pass 분석 결과 시각화 + Type 1 반제품 다운로드가 1-path로 동작.
            </p>
          </div>
          <button
            onClick={() => navigate("/ai-foundry-os/demo/lpon")}
            style={{
              background: T.colors.badge,
              border: "none",
              color: "#000",
              borderRadius: 8,
              padding: "12px 24px",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            시연 시작 →
          </button>
        </div>

        {/* Footer */}
        <div style={{ padding: "32px 0", borderTop: `1px solid ${T.border.subtle}`, marginTop: 40, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: T.text.muted }}>
            Foundry-X Phase 45 · Sprint 298 · fx-ai-foundry-os MVP
          </span>
          <span style={{ fontSize: 12, color: T.text.muted }}>
            Decode-X (KTDS-AXBD) · 847+ Tests GREEN · 2026-04-17
          </span>
        </div>
      </div>
    </div>
  );
}
