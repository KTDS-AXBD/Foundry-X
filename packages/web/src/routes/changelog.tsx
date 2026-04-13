// F518: 공개 Changelog 뷰 — 인증 불필요, 트레이서빌리티 링크 포함
import { useEffect, useState } from "react";

const BASE_URL = import.meta.env.VITE_API_URL || "/api";

const T = {
  font: "'Plus Jakarta Sans Variable', system-ui, sans-serif",
  mono: "'JetBrains Mono Variable', monospace",
  bg: { page: "#080c14", card: "#162032", inset: "#0a0f1a" },
  border: { subtle: "#1e2d45" },
  text: { primary: "#e8edf5", secondary: "#8b9cc0", muted: "#4e6085", accent: "#6ea8fe" },
  status: { done: "#34d399", active: "#60a5fa", planned: "#f59e0b", warning: "#fbbf24" },
} as const;

interface ChangelogSection {
  heading: string;
  lines: string[];
}

async function fetchPublic<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

function parseChangelog(raw: string): ChangelogSection[] {
  const sections: ChangelogSection[] = [];
  let current: ChangelogSection | null = null;
  for (const line of raw.split("\n")) {
    if (line.startsWith("## ")) {
      if (current) sections.push(current);
      current = { heading: line.replace("## ", "").trim(), lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) sections.push(current);
  return sections;
}

// F번호 감지 → KG trace 링크 생성
function renderLineWithTraceLinks(line: string): React.ReactNode {
  const parts = line.split(/(F\d{3,}|FX-REQ-\d+)/g);
  return parts.map((part, i) => {
    if (/^F\d{3,}$/.test(part)) {
      return (
        <a
          key={i}
          href={`/work-management?tab=trace&q=${part}`}
          style={{ color: T.text.accent, textDecoration: "none", fontWeight: 600 }}
          title={`${part} 트레이서빌리티 보기`}
        >
          {part}
        </a>
      );
    }
    if (/^FX-REQ-\d+$/.test(part)) {
      return (
        <a
          key={i}
          href={`/work-management?tab=trace&q=${part}`}
          style={{ color: T.status.planned, textDecoration: "none", fontFamily: T.mono, fontSize: "0.9em" }}
          title={`${part} 요구사항 추적`}
        >
          {part}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function Component() {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPublic<{ content: string }>("/work/public/changelog")
      .then(data => setContent(data.content))
      .catch(() => setError("CHANGELOG를 불러올 수 없어요"));
  }, []);

  const sections = content ? parseChangelog(content) : [];

  return (
    <div style={{ minHeight: "100vh", background: T.bg.page, color: T.text.primary, fontFamily: T.font }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 24px" }}>
        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: 24, fontWeight: 700 }}>Foundry-X</span>
            <span style={{ fontSize: 12, color: T.text.muted, fontFamily: T.mono, padding: "2px 8px", background: T.bg.card, borderRadius: 4 }}>PUBLIC</span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Changelog</h1>
          <p style={{ color: T.text.secondary, fontSize: 13, marginTop: 8, marginBottom: 0 }}>
            Phase별 변경 이력 — F번호 클릭 시 트레이서빌리티 추적
          </p>
        </div>

        {error && (
          <div style={{ color: "#f87171", padding: 20, background: T.bg.card, borderRadius: 10 }}>{error}</div>
        )}

        {content === null && !error && (
          <div style={{ color: T.text.secondary, padding: 20 }}>불러오는 중…</div>
        )}

        {sections.map((section, i) => {
          const isUnreleased = section.heading.toLowerCase().includes("unreleased");
          return (
            <div
              key={i}
              style={{
                marginBottom: 20,
                background: T.bg.card,
                border: `1px solid ${isUnreleased ? T.status.planned + "44" : T.border.subtle}`,
                borderRadius: 10,
                overflow: "hidden",
              }}
            >
              <div style={{
                padding: "12px 18px",
                background: isUnreleased ? T.status.planned + "0a" : T.bg.inset,
                borderBottom: `1px solid ${T.border.subtle}`,
                fontSize: 14, fontWeight: 700,
                color: isUnreleased ? T.status.warning : T.text.primary,
                display: "flex", alignItems: "center", gap: 10,
              }}>
                {isUnreleased && (
                  <span style={{ fontSize: 9, background: T.status.planned + "33", padding: "2px 8px", borderRadius: 4, fontFamily: T.mono, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>NEXT</span>
                )}
                {section.heading}
              </div>
              <div style={{
                padding: "14px 18px", fontSize: 12, lineHeight: 1.8,
                color: T.text.secondary, fontFamily: T.mono,
                maxHeight: 400, overflow: "auto",
              }}>
                {section.lines
                  .filter(l => l.trim())
                  .map((line, j) => {
                    if (line.startsWith("### ")) {
                      return (
                        <div key={j} style={{ fontWeight: 700, color: T.text.primary, margin: "14px 0 6px", fontSize: 13, fontFamily: T.font }}>
                          {line.replace("### ", "")}
                        </div>
                      );
                    }
                    if (line.trimStart().startsWith("- ")) {
                      return <div key={j} style={{ paddingLeft: 12 }}>{renderLineWithTraceLinks(line)}</div>;
                    }
                    return <div key={j}>{renderLineWithTraceLinks(line)}</div>;
                  })}
              </div>
            </div>
          );
        })}

        {/* Footer */}
        <div style={{ marginTop: 48, paddingTop: 24, borderTop: `1px solid ${T.border.subtle}`, fontSize: 11, color: T.text.muted, fontFamily: T.mono, display: "flex", justifyContent: "space-between" }}>
          <span>Foundry-X · Work Lifecycle Platform</span>
          <a href="/roadmap" style={{ color: T.text.accent, textDecoration: "none" }}>→ Roadmap</a>
        </div>
      </div>
    </div>
  );
}
