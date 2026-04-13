// F518: 공개 Roadmap 뷰 — 인증 불필요
import { useEffect, useState } from "react";

const BASE_URL = import.meta.env.VITE_API_URL || "/api";

interface PhaseItem {
  id: string;
  name: string;
  done: number;
  total: number;
  pct: number;
}

interface PhaseProgressData {
  phases: PhaseItem[];
  current_phase: string;
}

const T = {
  font: "'Plus Jakarta Sans Variable', system-ui, sans-serif",
  mono: "'JetBrains Mono Variable', monospace",
  bg: { page: "#080c14", card: "#162032", inset: "#0a0f1a" },
  border: { subtle: "#1e2d45" },
  text: { primary: "#e8edf5", secondary: "#8b9cc0", muted: "#4e6085", accent: "#6ea8fe" },
  status: { done: "#34d399", active: "#60a5fa", planned: "#f59e0b" },
} as const;

async function fetchPublic<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

function PhaseBar({ phase, isCurrent }: { phase: PhaseItem; isCurrent: boolean }) {
  const barColor = phase.pct === 100 ? T.status.done : isCurrent ? T.status.active : T.text.muted;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14,
      padding: "10px 14px",
      background: isCurrent ? T.bg.card : "transparent",
      borderRadius: 8,
      borderLeft: isCurrent ? `3px solid ${T.status.active}` : "3px solid transparent",
    }}>
      <span style={{ color: T.text.muted, fontSize: 11, minWidth: 56, fontFamily: T.mono, fontWeight: 600 }}>
        Phase {phase.id}
      </span>
      <span style={{ color: isCurrent ? T.text.primary : T.text.secondary, fontSize: 13, minWidth: 180, fontWeight: isCurrent ? 600 : 400, fontFamily: T.font }}>
        {phase.name}
      </span>
      <div style={{ flex: 1, background: T.bg.inset, borderRadius: 4, height: 6, overflow: "hidden" }}>
        <div style={{ width: `${phase.pct}%`, height: "100%", background: barColor, borderRadius: 4, transition: "width 0.3s ease" }} />
      </div>
      <span style={{ color: barColor, fontSize: 11, fontWeight: 700, minWidth: 44, textAlign: "right", fontFamily: T.mono }}>
        {phase.done}/{phase.total}
      </span>
    </div>
  );
}

export function Component() {
  const [data, setData] = useState<PhaseProgressData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPublic<PhaseProgressData>("/work/public/roadmap")
      .then(setData)
      .catch(() => setError("Roadmap을 불러올 수 없어요"));
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: T.bg.page, color: T.text.primary, fontFamily: T.font }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 24px" }}>
        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: 24, fontWeight: 700 }}>Foundry-X</span>
            <span style={{ fontSize: 12, color: T.text.muted, fontFamily: T.mono, padding: "2px 8px", background: T.bg.card, borderRadius: 4 }}>PUBLIC</span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, color: T.text.primary }}>Roadmap</h1>
          <p style={{ color: T.text.secondary, fontSize: 13, marginTop: 8, marginBottom: 0 }}>
            AX BD 라이프사이클 플랫폼 개발 현황 — Phase 진행 상태
          </p>
        </div>

        {error && (
          <div style={{ color: "#f87171", padding: 20, background: T.bg.card, borderRadius: 10 }}>{error}</div>
        )}

        {!data && !error && (
          <div style={{ color: T.text.secondary, padding: 20 }}>불러오는 중…</div>
        )}

        {data && (() => {
          const { phases, current_phase } = data;
          const active = phases.filter(p => p.pct < 100 && p.pct > 0);
          const planned = phases.filter(p => p.pct === 0 && p.total > 0);
          const completed = phases.filter(p => p.pct === 100);

          const sectionLabel = (label: string, color: string, count?: number) => (
            <div style={{ fontSize: 10, color, fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: T.mono }}>
              {label}{count !== undefined ? ` (${count})` : ""}
            </div>
          );

          return (
            <>
              <div style={{ fontSize: 12, color: T.text.muted, marginBottom: 24, fontFamily: T.mono }}>
                Phase {current_phase} active · {phases.length} phases tracked
              </div>

              {active.length > 0 && (
                <section style={{ marginBottom: 28 }}>
                  {sectionLabel("진행 중", T.status.planned)}
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {active.map(p => <PhaseBar key={p.id} phase={p} isCurrent={p.id === current_phase} />)}
                  </div>
                </section>
              )}

              {planned.length > 0 && (
                <section style={{ marginBottom: 28 }}>
                  {sectionLabel("예정", T.status.active)}
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {planned.map(p => <PhaseBar key={p.id} phase={p} isCurrent={false} />)}
                  </div>
                </section>
              )}

              {completed.length > 0 && (
                <section>
                  {sectionLabel("완료", T.status.done, completed.length)}
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {completed.slice(-8).map(p => <PhaseBar key={p.id} phase={p} isCurrent={false} />)}
                  </div>
                  {completed.length > 8 && (
                    <div style={{ fontSize: 11, color: T.text.muted, marginTop: 8, paddingLeft: 40 }}>
                      … 이전 {completed.length - 8}개 Phase 완료
                    </div>
                  )}
                </section>
              )}
            </>
          );
        })()}

        {/* Footer */}
        <div style={{ marginTop: 48, paddingTop: 24, borderTop: `1px solid ${T.border.subtle}`, fontSize: 11, color: T.text.muted, fontFamily: T.mono, display: "flex", justifyContent: "space-between" }}>
          <span>Foundry-X · Work Lifecycle Platform</span>
          <a href="/changelog" style={{ color: T.text.accent, textDecoration: "none" }}>→ Changelog</a>
        </div>
      </div>
    </div>
  );
}
