// F545 / Sprint 298 / FX-REQ-581
// AI Foundry OS — Editorial Deep Space landing
// DeepDive v0.3의 모든 세부 구성요소를 클릭으로 드릴다운 할 수 있는 단일 페이지.
import { useState, useMemo, useEffect, CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { DEEPDIVE } from "../../data/deepdive-content";
import type { PlaneType, SubSectionType } from "../../data/deepdive-content";

// ─── Design Tokens (AXIS dark mode aligned) ───────────────────────
import { fos, fonts, type PlaneId, type Glint } from "./tokens";
import { DemoNav } from "./demo-nav";

const { display, body, mono } = fonts;

// Compatibility aliases — ink/glint → fos
const ink = {
  abyss: fos.surface.abyss,
  hull: fos.surface.hull,
  panel: fos.surface.panel,
  panelHi: fos.surface.panelHi,
  hairline: fos.border.default,
  hairlineStrong: fos.border.strong,
  text: fos.text.primary,
  textSoft: fos.text.secondary,
  textMute: fos.text.muted,
  textDim: fos.text.dim,
} as const;

const glint = {
  input: { accent: fos.accent.input.accent, soft: fos.accent.input.soft, text: fos.accent.input.text },
  control: { accent: fos.accent.control.accent, soft: fos.accent.control.soft, text: fos.accent.control.text },
  takeaway: { accent: fos.accent.takeaway.accent, soft: fos.accent.takeaway.soft, text: fos.accent.takeaway.text },
} as const;

// ─── Global Styles ─────────────────────────────────────────────────
function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT,WONK@9..144,300..900,0..100,0..1&family=JetBrains+Mono:wght@400;500&family=Noto+Serif+KR:wght@400;600&display=swap');
      @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.css');

      *, *::before, *::after { box-sizing: border-box; }
      body {
        font-family: ${body};
        font-feature-settings: "ss01", "ss02", "cv01", "cv02";
        -webkit-font-smoothing: antialiased;
      }

      .fos-root {
        background:
          radial-gradient(ellipse 1200px 600px at 50% -10%, var(--fos-gradient-control), transparent 60%),
          radial-gradient(ellipse 900px 500px at 90% 30%, var(--fos-gradient-input), transparent 60%),
          radial-gradient(ellipse 800px 400px at 10% 70%, var(--fos-gradient-takeaway), transparent 60%),
          var(--fos-surface-abyss);
        color: var(--fos-text-primary);
        min-height: 100vh;
        overflow-x: hidden;
      }
      .fos-root::before {
        content: "";
        position: fixed; inset: 0; pointer-events: none; z-index: 0;
        opacity: var(--fos-scanline-opacity);
        background-image:
          repeating-linear-gradient(
            0deg,
            rgba(255,255,255,0.012) 0,
            rgba(255,255,255,0.012) 1px,
            transparent 1px,
            transparent 3px
          );
        mix-blend-mode: overlay;
      }

      .fos-fade-in { opacity: 0; animation: fosFade 800ms ease forwards; }
      .fos-fade-in-d1 { animation-delay: 100ms; }
      .fos-fade-in-d2 { animation-delay: 220ms; }
      .fos-fade-in-d3 { animation-delay: 360ms; }
      .fos-fade-in-d4 { animation-delay: 520ms; }
      @keyframes fosFade {
        from { opacity: 0; transform: translateY(10px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      .fos-nav-item { cursor: pointer; transition: color 140ms, border-color 140ms; }
      .fos-nav-item:hover { color: var(--fos-text-primary); }

      .fos-section-card {
        cursor: pointer;
        transition: transform 180ms ease, border-color 180ms ease, background 180ms ease;
      }
      .fos-section-card:hover { transform: translateY(-1px); }

      .fos-expanded {
        animation: fosExpand 360ms cubic-bezier(0.22, 1, 0.36, 1);
        overflow: hidden;
      }
      @keyframes fosExpand {
        from { opacity: 0; max-height: 0; }
        to   { opacity: 1; max-height: 3000px; }
      }

      @media (max-width: 960px) {
        .fos-layout { grid-template-columns: 1fr !important; }
        .fos-aside  { position: static !important; border-right: none !important; padding-right: 0 !important; }
        .fos-matrix { font-size: 13px !important; }
        .fos-pipeline { grid-template-columns: 1fr !important; }
        .fos-pipeline .fos-arrow { display: none !important; }
        .fos-cards { grid-template-columns: 1fr !important; }
        .fos-grid-6 { grid-template-columns: repeat(2, 1fr) !important; }
      }
    `}</style>
  );
}

// ─── Masthead ──────────────────────────────────────────────────────
function Masthead() {
  const meta = DEEPDIVE.meta;
  return (
    <header
      className="fos-fade-in"
      style={{
        borderBottom: `1px solid ${ink.hairline}`,
        padding: "28px 48px 22px",
        position: "relative",
        zIndex: 1,
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          display: "flex",
          alignItems: "baseline",
          gap: 18,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            fontFamily: mono,
            fontSize: 11,
            color: ink.textMute,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
          }}
        >
          kt ds · ax bd
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ fontFamily: mono, fontSize: 11, color: ink.textMute, letterSpacing: "0.15em" }}>
          {meta.version.toUpperCase()} · {meta.date}
        </div>
        <div style={{ fontFamily: mono, fontSize: 11, color: ink.textMute }}>
          SPRINT {meta.sprint} · PHASE {meta.phase}
        </div>
      </div>
    </header>
  );
}

// ─── Hero ───────────────────────────────────────────────────────────
function Hero({ onEnterDemo }: { onEnterDemo: () => void }) {
  return (
    <section
      style={{
        padding: "100px 48px 80px",
        maxWidth: 1280,
        margin: "0 auto",
        position: "relative",
        zIndex: 1,
      }}
    >
      <div
        className="fos-fade-in fos-fade-in-d1"
        style={{
          fontFamily: mono,
          fontSize: 11,
          letterSpacing: "0.3em",
          color: glint.control.text,
          marginBottom: 28,
          textTransform: "uppercase",
        }}
      >
        Deep Dive · v0.3 · Input / Control Plane
      </div>

      <h1
        className="fos-fade-in fos-fade-in-d2"
        style={{
          fontFamily: display,
          fontWeight: 400,
          fontSize: "clamp(44px, 7vw, 88px)",
          lineHeight: 1.02,
          letterSpacing: "-0.02em",
          margin: "0 0 28px",
          color: ink.text,
          fontVariationSettings: '"SOFT" 40, "WONK" 1',
        }}
      >
        AI Foundry{" "}
        <em style={{ fontStyle: "italic", color: glint.input.text, fontWeight: 300 }}>OS</em>
        <br />
        <span
          style={{
            color: ink.textSoft,
            fontSize: "0.6em",
            fontStyle: "italic",
            fontWeight: 300,
          }}
        >
          — 경험을 반제품으로, 반제품을 고객 성과로
        </span>
      </h1>

      <p
        className="fos-fade-in fos-fade-in-d3"
        style={{
          maxWidth: 720,
          fontSize: 17,
          lineHeight: 1.7,
          color: ink.textSoft,
          margin: "0 0 44px",
        }}
      >
        kt ds 20년+ SI/ITO 축적 자산을{" "}
        <em style={{ color: glint.input.text, fontStyle: "italic" }}>Decode-X</em>로 정찰·자산화하고,{" "}
        <em style={{ color: glint.control.text, fontStyle: "italic" }}>3대 자산</em>(Harness · AI Engine ·
        Ontology)을 실행팀에 공급하여, Spec 한 장으로 반제품을 꺼내는 엔터프라이즈 AI 개발 플랫폼.
      </p>

      <div className="fos-fade-in fos-fade-in-d4" style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <button
          onClick={onEnterDemo}
          style={{
            fontFamily: body,
            fontSize: 14,
            fontWeight: 500,
            color: ink.abyss,
            background: glint.input.accent,
            border: "none",
            padding: "13px 22px",
            cursor: "pointer",
            letterSpacing: "0.02em",
            transition: "filter 140ms",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.1)")}
          onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
        >
          LPON 반제품 라이브 시연 →
        </button>

        <a
          href="/ai-foundry-os/harness"
          style={{
            fontFamily: body,
            fontSize: 14,
            fontWeight: 500,
            color: ink.text,
            background: "transparent",
            border: `1px solid ${ink.hairlineStrong}`,
            padding: "12px 20px",
            textDecoration: "none",
            transition: "border-color 140ms",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = glint.control.accent)}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = ink.hairlineStrong)}
        >
          Harness 점검
        </a>

        <a
          href="/ai-foundry-os/ontology"
          style={{
            fontFamily: body,
            fontSize: 14,
            fontWeight: 500,
            color: ink.text,
            background: "transparent",
            border: `1px solid ${ink.hairlineStrong}`,
            padding: "12px 20px",
            textDecoration: "none",
            transition: "border-color 140ms",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = glint.control.accent)}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = ink.hairlineStrong)}
        >
          KG XAI 뷰어
        </a>
      </div>
    </section>
  );
}

// ─── Plane Stamp ───────────────────────────────────────────────────
function PlaneStamp({ plane }: { plane: PlaneType }) {
  const g = glint[plane.id as PlaneId];
  return (
    <div
      id={`plane-${plane.code}`}
      style={{
        padding: "80px 0 40px",
        borderTop: `1px solid ${ink.hairline}`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 24,
          flexWrap: "wrap",
          marginBottom: 20,
        }}
      >
        <div
          style={{
            fontFamily: display,
            fontSize: 96,
            fontWeight: 300,
            lineHeight: 0.9,
            color: g.accent,
            letterSpacing: "-0.04em",
            fontVariationSettings: '"SOFT" 30',
          }}
        >
          {plane.code}
        </div>
        <div style={{ flex: 1, minWidth: 260 }}>
          <div
            style={{
              fontFamily: mono,
              fontSize: 11,
              letterSpacing: "0.28em",
              color: g.text,
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            {plane.label}
          </div>
          <h2
            style={{
              fontFamily: display,
              fontSize: 36,
              fontWeight: 400,
              lineHeight: 1.15,
              margin: "0 0 14px",
              color: ink.text,
              letterSpacing: "-0.01em",
            }}
          >
            {plane.korean}{" "}
            <span style={{ color: ink.textMute, fontStyle: "italic", fontSize: 22 }}>
              — {plane.tagline}
            </span>
          </h2>
          <p
            style={{ fontSize: 15, lineHeight: 1.7, color: ink.textSoft, margin: 0, maxWidth: 780 }}
          >
            {plane.thesis}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Subsection ───────────────────────────────────────────────────
function Subsection({
  section,
  plane,
  isOpen,
  onToggle,
}: {
  section: SubSectionType;
  plane: PlaneType;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const g = glint[plane.id as PlaneId];

  return (
    <article
      className="fos-section-card"
      onClick={onToggle}
      style={{
        background: isOpen ? ink.panelHi : ink.panel,
        border: `1px solid ${isOpen ? g.accent + "66" : ink.hairline}`,
        borderRadius: 2,
        marginBottom: 14,
      }}
    >
      <div style={{ padding: "22px 28px", display: "flex", alignItems: "baseline", gap: 20 }}>
        <div
          style={{
            fontFamily: mono,
            fontSize: 12,
            fontWeight: 500,
            color: g.text,
            letterSpacing: "0.1em",
            minWidth: 52,
          }}
        >
          {section.code}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3
            style={{
              fontFamily: display,
              fontSize: 22,
              fontWeight: 400,
              lineHeight: 1.25,
              margin: "0 0 6px",
              color: ink.text,
              letterSpacing: "-0.005em",
            }}
          >
            {section.title}
          </h3>
          {section.tagline && (
            <div style={{ fontSize: 13, color: ink.textMute, fontStyle: "italic", marginBottom: 8 }}>
              {section.tagline}
            </div>
          )}
          <p
            style={{
              fontSize: 14.5,
              lineHeight: 1.65,
              color: ink.textSoft,
              margin: 0,
              maxWidth: 780,
            }}
          >
            {section.lede}
          </p>
        </div>
        <div
          style={{
            fontFamily: mono,
            fontSize: 11,
            color: ink.textMute,
            letterSpacing: "0.1em",
            minWidth: 72,
            textAlign: "right",
            transform: isOpen ? "rotate(90deg)" : "rotate(0)",
            transition: "transform 240ms",
          }}
        >
          →
        </div>
      </div>

      {isOpen && (
        <div
          className="fos-expanded"
          onClick={(e) => e.stopPropagation()}
          style={{ padding: "0 28px 32px", borderTop: `1px solid ${ink.hairline}` }}
        >
          <DetailRenderer section={section} plane={plane} />
        </div>
      )}
    </article>
  );
}

// ─── Detail Renderer ──────────────────────────────────────────────
function DetailRenderer({ section, plane }: { section: SubSectionType; plane: PlaneType }) {
  const g = glint[plane.id as PlaneId];
  const { kind, data } = section.detail;
  if (kind === "pipeline") return <PipelineDetail data={data as PipelineData} g={g} />;
  if (kind === "cards") return <CardsDetail data={data as CardsData} g={g} />;
  if (kind === "grid") return <GridDetail data={data as GridData} g={g} />;
  if (kind === "flow") return <FlowDetail data={data as FlowData} g={g} />;
  if (kind === "matrix") return <MatrixDetail data={data as MatrixData} g={g} />;
  if (kind === "callout") return <CalloutDetail data={data as CalloutData} g={g} />;
  return null;
}

// ─── Pipeline ─────────────────────────────────────────────────────
interface PipelineData {
  sources: { n: number; name: string; summary: string; items: string[] }[];
  processes: { code: string; name: string; subtitle: string; summary: string; items: string[] }[];
  outputs: { glyph: string; name: string; summary: string; items: string[] }[];
  terminus: string;
}

function PipelineDetail({ data, g }: { data: PipelineData; g: Glint }) {
  const colStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: 12, minWidth: 0 };
  const colTitle: CSSProperties = {
    fontFamily: mono,
    fontSize: 10,
    letterSpacing: "0.24em",
    color: g.text,
    textTransform: "uppercase",
    marginTop: 24,
    marginBottom: 6,
  };
  const unitCard: CSSProperties = {
    background: ink.abyss,
    border: `1px solid ${ink.hairline}`,
    padding: "14px 16px",
  };
  const unitName: CSSProperties = {
    fontFamily: display,
    fontSize: 15,
    fontWeight: 500,
    color: ink.text,
    margin: "0 0 6px",
  };
  const unitSummary: CSSProperties = { fontSize: 12.5, color: ink.textSoft, margin: "0 0 8px" };
  const bulletList: CSSProperties = {
    margin: 0,
    padding: "0 0 0 16px",
    fontSize: 12,
    color: ink.textMute,
    lineHeight: 1.6,
  };

  return (
    <div
      className="fos-pipeline"
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 40px 1.2fr 40px 1fr",
        gap: 4,
        alignItems: "stretch",
      }}
    >
      <div style={colStyle}>
        <div style={colTitle}>① SOURCE — 원시 경험</div>
        {data.sources.map((s) => (
          <div key={s.n} style={unitCard}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 22,
                  height: 22,
                  fontFamily: mono,
                  fontSize: 11,
                  background: g.accent,
                  color: ink.abyss,
                  borderRadius: "50%",
                  fontWeight: 600,
                }}
              >
                {s.n}
              </span>
              <span style={{ ...unitName, margin: 0 }}>{s.name}</span>
            </div>
            <div style={unitSummary}>{s.summary}</div>
            <ul style={bulletList}>
              {s.items.map((it) => (
                <li key={it}>{it}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <Arrow label="Decode-X" g={g} />

      <div style={colStyle}>
        <div style={colTitle}>② PROCESS — Decode-X 4단계</div>
        {data.processes.map((p) => (
          <div key={p.code} style={unitCard}>
            <div style={unitName}>
              {p.code}. {p.name}{" "}
              <span style={{ fontFamily: mono, fontSize: 10.5, color: ink.textMute }}>({p.subtitle})</span>
            </div>
            <div style={unitSummary}>{p.summary}</div>
            {p.items.length > 0 && (
              <ul style={bulletList}>
                {p.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      <Arrow label="구조화" g={g} />

      <div style={colStyle}>
        <div style={colTitle}>③ OUTPUT — Spec Asset</div>
        {data.outputs.map((o) => (
          <div key={o.name} style={unitCard}>
            <div style={unitName}>
              <span style={{ marginRight: 6 }}>{o.glyph}</span>
              {o.name}
            </div>
            <div style={unitSummary}>{o.summary}</div>
            <ul style={bulletList}>
              {o.items.map((it) => (
                <li key={it}>{it}</li>
              ))}
            </ul>
          </div>
        ))}
        <div
          style={{
            background: g.soft,
            border: `1px solid ${g.accent}55`,
            padding: "12px 14px",
            marginTop: 8,
          }}
        >
          <div
            style={{
              fontFamily: mono,
              fontSize: 10.5,
              color: g.text,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            → Knowledge Graph 저장
          </div>
          <div style={{ fontSize: 12, color: ink.textSoft, lineHeight: 1.5 }}>{data.terminus}</div>
        </div>
      </div>
    </div>
  );
}

function Arrow({ label, g }: { label: string; g: Glint }) {
  return (
    <div
      className="fos-arrow"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        marginTop: 32,
      }}
    >
      <div style={{ fontSize: 18, color: g.accent, fontWeight: 300, lineHeight: 1 }}>→</div>
      <div
        style={{
          fontFamily: mono,
          fontSize: 9.5,
          color: ink.textMute,
          marginTop: 6,
          writingMode: "vertical-rl",
          textOrientation: "mixed",
          letterSpacing: "0.15em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
    </div>
  );
}

// ─── Cards ────────────────────────────────────────────────────────
interface CardsDataItem {
  id: string;
  glyph: string;
  name: string;
  purpose: string;
  components: string[];
  tools?: string[];
  example?: string;
}
type CardsData = CardsDataItem[];

function CardsDetail({ data, g }: { data: CardsData; g: Glint }) {
  return (
    <div
      className="fos-cards"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${data.length}, 1fr)`,
        gap: 16,
      }}
    >
      {data.map((card) => (
        <div
          key={card.id}
          style={{
            background: ink.abyss,
            border: `1px solid ${ink.hairline}`,
            padding: 20,
            display: "flex",
            flexDirection: "column",
            borderTop: `2px solid ${g.accent}aa`,
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>{card.glyph}</div>
          <h4
            style={{
              fontFamily: display,
              fontSize: 20,
              fontWeight: 500,
              color: ink.text,
              margin: "0 0 4px",
              letterSpacing: "-0.005em",
            }}
          >
            {card.name}
          </h4>
          <div
            style={{
              fontSize: 12.5,
              color: ink.textMute,
              fontStyle: "italic",
              marginBottom: 16,
            }}
          >
            {card.purpose}
          </div>

          <div
            style={{
              fontFamily: mono,
              fontSize: 10,
              color: g.text,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            구성 요소
          </div>
          <ul
            style={{
              margin: 0,
              padding: "0 0 0 16px",
              fontSize: 13,
              color: ink.textSoft,
              lineHeight: 1.65,
            }}
          >
            {card.components.map((it) => (
              <li key={it} style={{ marginBottom: 4 }}>
                {it}
              </li>
            ))}
          </ul>

          {card.tools && card.tools.length > 0 && (
            <>
              <div
                style={{
                  fontFamily: mono,
                  fontSize: 10,
                  color: g.text,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  marginTop: 18,
                  marginBottom: 8,
                }}
              >
                도구 · 인프라
              </div>
              <ul
                style={{
                  margin: 0,
                  padding: "0 0 0 16px",
                  fontSize: 13,
                  color: ink.textSoft,
                  lineHeight: 1.65,
                }}
              >
                {card.tools.map((it) => (
                  <li key={it} style={{ marginBottom: 4 }}>
                    {it}
                  </li>
                ))}
              </ul>
            </>
          )}

          {card.example && (
            <div
              style={{
                marginTop: 18,
                padding: 14,
                background: g.soft,
                border: `1px solid ${g.accent}44`,
                fontSize: 12.5,
                color: g.text,
                lineHeight: 1.6,
              }}
            >
              <div
                style={{
                  fontFamily: mono,
                  fontSize: 9.5,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  marginBottom: 6,
                  opacity: 0.75,
                }}
              >
                실사례
              </div>
              {card.example}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Grid ─────────────────────────────────────────────────────────
interface GridDataItem {
  n: string;
  title: string;
  tag: string;
  body: string;
}
type GridData = GridDataItem[];

function GridDetail({ data, g }: { data: GridData; g: Glint }) {
  return (
    <div
      className="fos-grid-6"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 1,
        background: ink.hairline,
      }}
    >
      {data.map((c) => (
        <div
          key={c.n}
          style={{
            background: ink.abyss,
            padding: "20px 22px",
            minHeight: 140,
          }}
        >
          <div
            style={{
              fontFamily: display,
              fontSize: 26,
              fontWeight: 300,
              color: g.accent,
              lineHeight: 1,
              marginBottom: 10,
            }}
          >
            {c.n}
          </div>
          <div
            style={{
              fontFamily: display,
              fontSize: 17,
              fontWeight: 500,
              color: ink.text,
              marginBottom: 2,
            }}
          >
            {c.title}
          </div>
          <div
            style={{
              fontFamily: mono,
              fontSize: 10,
              color: ink.textMute,
              letterSpacing: "0.1em",
              marginBottom: 10,
            }}
          >
            {c.tag}
          </div>
          <div style={{ fontSize: 12.5, color: ink.textSoft, lineHeight: 1.6 }}>{c.body}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Flow ─────────────────────────────────────────────────────────
type FlowData = { phase: string; body: string; terminus?: boolean }[];

function FlowDetail({ data, g }: { data: FlowData; g: Glint }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {data.map((step, i) => {
        const isLast = i === data.length - 1;
        return (
          <div key={step.phase} style={{ display: "flex", gap: 20, alignItems: "stretch" }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                minWidth: 28,
              }}
            >
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: step.terminus ? g.accent : "transparent",
                  border: `2px solid ${g.accent}`,
                  marginTop: 6,
                }}
              />
              {!isLast && (
                <div
                  style={{
                    width: 1,
                    flex: 1,
                    background: `linear-gradient(to bottom, ${g.accent}66, ${g.accent}22)`,
                    marginTop: 4,
                  }}
                />
              )}
            </div>
            <div style={{ flex: 1, padding: "4px 0 22px" }}>
              <div
                style={{
                  fontFamily: mono,
                  fontSize: 10.5,
                  color: g.text,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                {step.phase}
              </div>
              <div style={{ fontSize: 14, color: ink.textSoft, lineHeight: 1.65 }}>{step.body}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Matrix ───────────────────────────────────────────────────────
interface MatrixData {
  columns: string[];
  rows: { phase: string; cells: string[] }[];
}

function MatrixDetail({ data, g }: { data: MatrixData; g: Glint }) {
  return (
    <div style={{ overflowX: "auto" }} className="fos-matrix">
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>
            <th
              style={{
                textAlign: "left",
                padding: "12px 16px",
                background: ink.panel,
                borderBottom: `1px solid ${g.accent}55`,
                fontFamily: mono,
                fontSize: 10,
                color: ink.textMute,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                fontWeight: 500,
                minWidth: 120,
              }}
            >
              단계
            </th>
            {data.columns.map((c) => (
              <th
                key={c}
                style={{
                  textAlign: "left",
                  padding: "12px 16px",
                  background: ink.panel,
                  borderBottom: `1px solid ${g.accent}55`,
                  fontFamily: mono,
                  fontSize: 10,
                  color: g.text,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  fontWeight: 500,
                }}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, ri) => (
            <tr key={row.phase} style={{ borderBottom: `1px solid ${ink.hairline}` }}>
              <td
                style={{
                  padding: "16px",
                  verticalAlign: "top",
                  fontFamily: display,
                  fontSize: 14,
                  fontWeight: 500,
                  color: ink.text,
                  background: ri % 2 ? "transparent" : ink.hull,
                }}
              >
                {row.phase}
              </td>
              {row.cells.map((cell, ci) => (
                <td
                  key={ci}
                  style={{
                    padding: "16px",
                    verticalAlign: "top",
                    color: cell === "—" ? ink.textDim : ink.textSoft,
                    lineHeight: 1.6,
                    background: ri % 2 ? "transparent" : ink.hull,
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Callout ──────────────────────────────────────────────────────
interface CalloutData {
  tone: "input" | "control" | "takeaway";
  label: string;
  metric: string;
}

function CalloutDetail({ data, g }: { data: CalloutData; g: Glint }) {
  return (
    <div
      style={{
        background: g.soft,
        border: `1px solid ${g.accent}44`,
        padding: "20px 24px",
        display: "flex",
        alignItems: "baseline",
        gap: 20,
        flexWrap: "wrap",
      }}
    >
      <div
        style={{
          fontFamily: mono,
          fontSize: 10.5,
          letterSpacing: "0.22em",
          color: g.text,
          textTransform: "uppercase",
        }}
      >
        {data.label}
      </div>
      <div
        style={{
          fontFamily: display,
          fontSize: 22,
          fontWeight: 400,
          color: g.accent,
          letterSpacing: "-0.01em",
          fontStyle: "italic",
        }}
      >
        {data.metric}
      </div>
    </div>
  );
}

// ─── Aside Navigation ─────────────────────────────────────────────
function AsideNav({
  planes,
  activeId,
  onJump,
}: {
  planes: PlaneType[];
  activeId: string;
  onJump: (id: string) => void;
}) {
  return (
    <aside
      className="fos-aside fos-fade-in fos-fade-in-d3"
      style={{
        position: "sticky",
        top: 20,
        alignSelf: "start",
        padding: "0 28px 40px 0",
        borderRight: `1px solid ${ink.hairline}`,
      }}
    >
      <div
        style={{
          fontFamily: mono,
          fontSize: 10,
          letterSpacing: "0.28em",
          color: ink.textMute,
          textTransform: "uppercase",
          marginBottom: 20,
        }}
      >
        Contents
      </div>
      {planes.map((plane) => {
        const g = glint[plane.id as PlaneId];
        const planeActive = activeId === `plane-${plane.code}`;
        return (
          <div key={plane.code} style={{ marginBottom: 22 }}>
            <div
              onClick={() => onJump(`plane-${plane.code}`)}
              className="fos-nav-item"
              style={{
                fontFamily: display,
                fontSize: 14,
                fontWeight: 500,
                color: planeActive ? g.accent : ink.textSoft,
                marginBottom: 8,
                letterSpacing: "-0.005em",
                borderLeft: `2px solid ${planeActive ? g.accent : "transparent"}`,
                paddingLeft: 10,
              }}
            >
              <span
                style={{
                  fontFamily: mono,
                  fontSize: 10.5,
                  color: g.text,
                  marginRight: 8,
                  letterSpacing: "0.1em",
                }}
              >
                {plane.code}
              </span>
              {plane.korean}
            </div>
            {plane.sections.map((sec) => {
              const secActive = activeId === `section-${sec.code}`;
              return (
                <div
                  key={sec.code}
                  onClick={() => onJump(`section-${sec.code}`)}
                  className="fos-nav-item"
                  style={{
                    fontFamily: body,
                    fontSize: 12.5,
                    color: secActive ? ink.text : ink.textMute,
                    padding: "5px 0 5px 22px",
                    lineHeight: 1.45,
                    borderLeft: secActive ? `1px solid ${g.accent}` : `1px solid transparent`,
                    marginLeft: 10,
                  }}
                >
                  <span
                    style={{
                      fontFamily: mono,
                      fontSize: 10,
                      color: ink.textMute,
                      marginRight: 8,
                    }}
                  >
                    {sec.code}
                  </span>
                  {sec.title}
                </div>
              );
            })}
          </div>
        );
      })}
    </aside>
  );
}

// ─── Footer ────────────────────────────────────────────────────────
function Footer() {
  const meta = DEEPDIVE.meta;
  return (
    <footer
      style={{
        marginTop: 120,
        borderTop: `1px solid ${ink.hairline}`,
        padding: "36px 48px 48px",
        fontFamily: mono,
        fontSize: 11,
        color: ink.textMute,
        letterSpacing: "0.08em",
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          display: "flex",
          gap: 32,
          flexWrap: "wrap",
          alignItems: "baseline",
        }}
      >
        <div>AI FOUNDRY OS · KT DS AX BD</div>
        <div style={{ flex: 1 }} />
        <div>SOURCE · {meta.source}</div>
        <div>
          SPRINT {meta.sprint} · PHASE {meta.phase}
        </div>
        <div>
          {meta.version.toUpperCase()} · {meta.date}
        </div>
      </div>
    </footer>
  );
}

// ─── Root ──────────────────────────────────────────────────────────
export function Component() {
  const navigate = useNavigate();
  const [openSection, setOpenSection] = useState<string | null>("A-1");
  const [activeId, setActiveId] = useState<string>("plane-A");

  const allPlanes = DEEPDIVE.planes;
  const allIds = useMemo(() => {
    const out: string[] = [];
    for (const p of allPlanes) {
      out.push(`plane-${p.code}`);
      for (const s of p.sections) out.push(`section-${s.code}`);
    }
    return out;
  }, [allPlanes]);

  useEffect(() => {
    const onScroll = () => {
      const scrollTop = window.scrollY + 140;
      let current = activeId;
      for (const id of allIds) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.offsetTop <= scrollTop) current = id;
      }
      if (current !== activeId) setActiveId(current);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [allIds, activeId]);

  const handleJump = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 30;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  const handleToggle = (code: string) => {
    setOpenSection(openSection === code ? null : code);
  };

  return (
    <div className="fos-root">
      <DemoNav />
      <GlobalStyle />
      <Masthead />
      <Hero onEnterDemo={() => navigate("/ai-foundry-os/demo/lpon")} />

      <div
        className="fos-layout"
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "0 48px",
          display: "grid",
          gridTemplateColumns: "240px 1fr",
          gap: 40,
          position: "relative",
          zIndex: 1,
        }}
      >
        <AsideNav planes={allPlanes} activeId={activeId} onJump={handleJump} />

        <main>
          {allPlanes.map((plane) => (
            <div key={plane.code}>
              <PlaneStamp plane={plane} />
              {plane.sections.map((sec) => (
                <div key={sec.code} id={`section-${sec.code}`}>
                  <Subsection
                    section={sec}
                    plane={plane}
                    isOpen={openSection === sec.code}
                    onToggle={() => handleToggle(sec.code)}
                  />
                </div>
              ))}
            </div>
          ))}
        </main>
      </div>

      <Footer />
    </div>
  );
}
