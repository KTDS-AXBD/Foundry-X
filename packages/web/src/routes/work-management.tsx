import { useState, useEffect, useCallback, useRef } from "react";
import { fetchApi, postApi, ApiError } from "@/lib/api-client";
import ReactMarkdown from "react-markdown";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PhaseProgressData {
  phases: Array<{
    id: number; name: string;
    total: number; done: number; in_progress: number; pct: number;
  }>;
  current_phase: number;
  generated_at: string;
}

interface BacklogHealthData {
  total_backlog: number;
  stale_items: Array<{ id: string; title: string; age_sprints: number }>;
  health_score: number;
  warnings: string[];
  generated_at: string;
}

type WorkStatus = "backlog" | "planned" | "in_progress" | "done" | "rejected" | "closed";
type WorkTrack = "F" | "B" | "C" | "X";
type WorkPriority = "P0" | "P1" | "P2" | "P3";

interface WorkItem {
  id: string;
  title: string;
  status: WorkStatus;
  sprint?: string;
  priority?: string;
  req_code?: string;
}

interface WorkSnapshot {
  summary: { backlog: number; planned: number; in_progress: number; done_today: number };
  items: WorkItem[];
  prs: Array<{ number: number; title: string; state: string; url: string; created_at: string }>;
  commits: Array<{ sha: string; message: string; date: string; author: string }>;
  generated_at: string;
}

interface ClassifyResult {
  track: WorkTrack;
  priority: WorkPriority;
  title: string;
  req_code?: string;
  method: "llm" | "regex";
}

// ─── Design Tokens ──────────────────────────────────────────────────────────

const T = {
  font: "var(--font-sans, 'Plus Jakarta Sans Variable', system-ui, sans-serif)",
  mono: "var(--font-mono, 'JetBrains Mono Variable', monospace)",
  bg: {
    page:    "#080c14",
    surface: "#0f1726",
    card:    "#162032",
    hover:   "#1c2a42",
    inset:   "#0a0f1a",
  },
  border: {
    subtle:  "#1e2d45",
    default: "#253552",
    accent:  "#3b82f6",
  },
  text: {
    primary:   "#e8edf5",
    secondary: "#8b9cc0",
    muted:     "#4e6085",
    accent:    "#6ea8fe",
  },
  status: {
    done:       "#34d399",
    active:     "#60a5fa",
    planned:    "#f59e0b",
    backlog:    "#64748b",
    warning:    "#fbbf24",
    error:      "#f87171",
  },
} as const;

const COLUMNS: { key: WorkStatus; label: string; color: string }[] = [
  { key: "planned",     label: "PLANNED",      color: T.status.planned },
  { key: "in_progress", label: "IN PROGRESS",  color: T.status.active },
  { key: "done",        label: "DONE",          color: T.status.done },
  { key: "backlog",     label: "BACKLOG",       color: T.status.backlog },
];

const PRIORITY_COLORS: Record<WorkPriority, string> = {
  P0: "#ef4444", P1: "#f97316", P2: "#3b82f6", P3: "#6b7280",
};

const TRACK_COLORS: Record<WorkTrack, string> = {
  F: "#8b5cf6", B: "#ef4444", C: "#6b7280", X: "#06b6d4",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("ko-KR", {
      month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso.slice(0, 16);
  }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 7px",
        borderRadius: 5,
        fontSize: 10,
        fontWeight: 700,
        fontFamily: T.mono,
        letterSpacing: "0.02em",
        color: "#fff",
        background: color,
        marginRight: 4,
        textTransform: "uppercase",
      }}
    >
      {label}
    </span>
  );
}

function ItemCard({ item }: { item: WorkItem }) {
  const priority = (item.priority ?? "P2") as WorkPriority;
  return (
    <div
      style={{
        background: T.bg.card,
        border: `1px solid ${T.border.subtle}`,
        borderRadius: 8,
        padding: "10px 12px",
        marginBottom: 6,
        fontSize: 12,
        fontFamily: T.font,
        transition: "border-color 0.15s",
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = T.border.default)}
      onMouseLeave={e => (e.currentTarget.style.borderColor = T.border.subtle)}
    >
      <div style={{ fontWeight: 600, marginBottom: 4, color: T.text.primary, fontFamily: T.mono, fontSize: 11 }}>
        {item.id} {item.sprint ? <span style={{ color: T.text.muted }}>#{item.sprint}</span> : null}
      </div>
      <div style={{ color: T.text.secondary, marginBottom: 6, lineHeight: 1.5 }}>
        {item.title}
      </div>
      <div>
        {item.priority && <Badge label={priority} color={PRIORITY_COLORS[priority] ?? "#6b7280"} />}
        {item.req_code && <Badge label={item.req_code} color="#0ea5e9" />}
      </div>
    </div>
  );
}

// ─── Backlog Health Tab ───────────────────────────────────────────────────────

function BacklogHealthTab({ health }: { health: BacklogHealthData | null }) {
  if (!health) {
    return <div style={{ color: T.text.secondary, padding: 20, fontFamily: T.font }}>불러오는 중…</div>;
  }

  const scoreColor = health.health_score >= 80 ? T.status.done
                   : health.health_score >= 60 ? T.status.planned
                   : T.status.error;

  return (
    <div style={{ fontFamily: T.font }}>
      {/* Score card */}
      <div
        style={{
          background: T.bg.inset,
          border: `1px solid ${scoreColor}33`,
          borderRadius: 10,
          padding: "24px 28px",
          marginBottom: 24,
          display: "flex",
          alignItems: "center",
          gap: 28,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, fontWeight: 800, color: scoreColor, fontFamily: T.mono, lineHeight: 1 }}>
            {health.health_score}
          </div>
          <div style={{ fontSize: 11, color: T.text.muted, marginTop: 4 }}>/ 100</div>
        </div>
        <div>
          <div style={{ fontSize: 14, color: T.text.secondary, marginBottom: 4, fontWeight: 500 }}>Health Score</div>
          <div style={{ fontSize: 13, color: T.text.primary }}>
            Total: <strong>{health.total_backlog}</strong> backlog items
          </div>
          {health.stale_items.length > 0 && (
            <div style={{ fontSize: 12, color: T.status.planned, marginTop: 4 }}>
              {health.stale_items.length} stale item(s)
            </div>
          )}
        </div>
      </div>

      {/* Warnings */}
      {health.warnings.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          {health.warnings.map((w, i) => (
            <div
              key={i}
              style={{
                background: T.bg.card,
                borderLeft: `3px solid ${T.status.planned}`,
                padding: "10px 14px",
                borderRadius: "0 6px 6px 0",
                fontSize: 13,
                color: T.status.warning,
                marginBottom: 6,
              }}
            >
              {w}
            </div>
          ))}
        </div>
      )}

      {/* Stale items */}
      {health.stale_items.length > 0 && (
        <div style={{ background: T.bg.card, borderRadius: 8, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", fontSize: 12, color: T.text.muted, fontWeight: 600, borderBottom: `1px solid ${T.border.subtle}` }}>
            Stale Items ({health.stale_items.length})
          </div>
          {health.stale_items.map((item) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                gap: 12,
                padding: "10px 14px",
                borderBottom: `1px solid ${T.border.subtle}`,
                fontSize: 13,
              }}
            >
              <span style={{ color: T.status.planned, minWidth: 48, fontWeight: 600, fontFamily: T.mono, fontSize: 12 }}>{item.id}</span>
              <span style={{ flex: 1, color: T.text.secondary }}>{item.title}</span>
              <span style={{ color: T.text.muted, fontSize: 12 }}>{item.age_sprints}+ sprints</span>
            </div>
          ))}
        </div>
      )}

      {health.stale_items.length === 0 && health.warnings.length === 0 && (
        <div style={{ color: T.status.done, fontSize: 13, padding: 20 }}>백로그가 건강해요</div>
      )}
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

function KanbanTab({ snapshot }: { snapshot: WorkSnapshot | null }) {
  if (!snapshot) {
    return <div style={{ color: T.text.secondary, padding: 20, fontFamily: T.font }}>불러오는 중…</div>;
  }

  return (
    <div style={{ fontFamily: T.font }}>
      {/* Summary bar */}
      <div
        style={{
          display: "flex",
          gap: 20,
          marginBottom: 24,
          background: T.bg.inset,
          padding: "14px 18px",
          borderRadius: 10,
          border: `1px solid ${T.border.subtle}`,
        }}
      >
        {[
          { label: "Backlog",     value: snapshot.summary.backlog,      color: T.status.backlog },
          { label: "Planned",     value: snapshot.summary.planned,      color: T.status.active },
          { label: "In Progress", value: snapshot.summary.in_progress,  color: T.status.planned },
          { label: "Done",        value: snapshot.summary.done_today,   color: T.status.done },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color, fontFamily: T.mono }}>{value}</div>
            <div style={{ fontSize: 10, color: T.text.muted, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>{label}</div>
          </div>
        ))}
        <div style={{ marginLeft: "auto", fontSize: 11, color: T.text.muted, alignSelf: "center", fontFamily: T.mono }}>
          {formatDate(snapshot.generated_at)}
        </div>
      </div>

      {/* Kanban columns */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {COLUMNS.map(col => {
          const colItems = snapshot.items.filter(i => i.status === col.key);
          return (
            <div key={col.key}>
              <div
                style={{
                  padding: "7px 12px",
                  background: col.color + "15",
                  border: `1px solid ${col.color}30`,
                  borderRadius: 8,
                  marginBottom: 10,
                  fontWeight: 700,
                  fontSize: 11,
                  color: col.color,
                  display: "flex",
                  justifyContent: "space-between",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  fontFamily: T.mono,
                }}
              >
                <span>{col.label}</span>
                <span style={{ opacity: 0.6 }}>{colItems.length}</span>
              </div>
              {colItems.length === 0 ? (
                <div
                  style={{
                    border: `1px dashed ${T.border.subtle}`,
                    borderRadius: 8,
                    padding: 16,
                    color: T.text.muted,
                    fontSize: 12,
                    textAlign: "center",
                  }}
                >
                  비어있음
                </div>
              ) : (
                colItems.map(item => <ItemCard key={item.id} item={item} />)
              )}
            </div>
          );
        })}
      </div>

      {/* Recent PRs */}
      {snapshot.prs.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <div style={{ fontSize: 12, color: T.text.muted, fontWeight: 600, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Recent PRs
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {snapshot.prs.slice(0, 8).map(pr => (
              <div
                key={pr.number}
                style={{
                  background: T.bg.card,
                  border: `1px solid ${T.border.subtle}`,
                  borderRadius: 8,
                  padding: "8px 12px",
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontFamily: T.font,
                }}
              >
                <Badge
                  label={pr.state}
                  color={pr.state === "open" ? T.status.done : pr.state === "closed" ? T.status.backlog : "#8b5cf6"}
                />
                <a href={pr.url} target="_blank" rel="noreferrer" style={{ color: T.text.accent, fontFamily: T.mono, fontSize: 11 }}>
                  #{pr.number}
                </a>
                <span style={{ color: T.text.primary, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pr.title}</span>
                <span style={{ color: T.text.muted, fontFamily: T.mono, fontSize: 10 }}>
                  {formatDate(pr.created_at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ClassifyTab() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<ClassifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClassify = useCallback(async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await postApi<ClassifyResult>("/work/classify", { text: input });
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "분류 실패");
    } finally {
      setLoading(false);
    }
  }, [input]);

  return (
    <div style={{ maxWidth: 600, fontFamily: T.font }}>
      <div style={{ marginBottom: 20 }}>
        <p style={{ color: T.text.secondary, fontSize: 13, marginBottom: 8 }}>
          자연어로 작업 아이디어를 입력하면 AI가 자동으로 분류해요.
        </p>
        <div style={{ background: T.bg.card, border: `1px solid ${T.border.subtle}`, borderRadius: 8, padding: "10px 14px", fontSize: 12, color: T.text.muted, lineHeight: 1.6 }}>
          <div style={{ fontWeight: 600, color: T.text.secondary, marginBottom: 4 }}>사용 방법</div>
          <div>1. 아래 텍스트 영역에 하고 싶은 작업을 자연어로 입력해요</div>
          <div>2. <strong style={{ color: T.text.primary }}>분류하기</strong> 버튼을 누르면 AI가 유형(F/B/C/X)과 우선순위(P0~P3)를 분류해요</div>
          <div>3. 결과를 확인하고 CLI에서 <code style={{ background: T.bg.inset, padding: "1px 4px", borderRadius: 3, fontFamily: T.mono, fontSize: 11 }}>task-start.sh</code> 명령으로 등록해요</div>
          <div style={{ marginTop: 6, color: T.text.muted, fontSize: 11 }}>
            유형: <strong style={{ color: "#8b5cf6" }}>F</strong>=Feature &nbsp;
            <strong style={{ color: "#ef4444" }}>B</strong>=Bug &nbsp;
            <strong style={{ color: "#6b7280" }}>C</strong>=Chore &nbsp;
            <strong style={{ color: "#06b6d4" }}>X</strong>=Experiment
          </div>
        </div>
      </div>

      <textarea
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="예: 작업 관찰성 view에 burndown chart 추가 필요"
        style={{
          width: "100%",
          minHeight: 80,
          background: T.bg.card,
          border: `1px solid ${T.border.subtle}`,
          borderRadius: 8,
          padding: "12px 14px",
          color: T.text.primary,
          fontSize: 13,
          fontFamily: T.font,
          resize: "vertical",
          marginBottom: 12,
          boxSizing: "border-box",
          outline: "none",
        }}
        onFocus={e => (e.currentTarget.style.borderColor = T.border.accent)}
        onBlur={e => (e.currentTarget.style.borderColor = T.border.subtle)}
        onKeyDown={e => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleClassify();
        }}
      />

      <button
        onClick={handleClassify}
        disabled={loading || !input.trim()}
        style={{
          background: loading ? T.bg.hover : T.border.accent,
          color: "#fff",
          border: "none",
          borderRadius: 8,
          padding: "10px 24px",
          cursor: loading ? "not-allowed" : "pointer",
          fontSize: 13,
          fontWeight: 600,
          fontFamily: T.font,
        }}
      >
        {loading ? "분류 중…" : "분류하기"}
      </button>

      {error && (
        <div style={{ marginTop: 12, color: T.status.error, fontSize: 13 }}>{error}</div>
      )}

      {result && (
        <div
          style={{
            marginTop: 20,
            background: T.bg.inset,
            border: `1px solid ${T.border.default}`,
            borderRadius: 10,
            padding: "16px 18px",
          }}
        >
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <Badge label={result.track} color={TRACK_COLORS[result.track]} />
            <Badge label={result.priority} color={PRIORITY_COLORS[result.priority] ?? "#6b7280"} />
            <Badge label={result.method === "llm" ? "AI" : "regex"} color={result.method === "llm" ? "#8b5cf6" : "#6b7280"} />
          </div>
          <div style={{ color: T.text.primary, fontSize: 14, fontWeight: 700 }}>
            {result.title}
          </div>
          {result.req_code && (
            <div style={{ color: T.text.accent, fontSize: 12, marginTop: 6, fontFamily: T.mono }}>{result.req_code}</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Route Component ─────────────────────────────────────────────────────

// ─── Phase name mapping (frontend-only, avoids API change) ───────────────────

const PHASE_NAMES: Record<number, string> = {
  1: "Foundation",
  20: "BD Pipeline 2.0",
  21: "BD Pipeline 2.0",
  22: "Discovery Engine",
  23: "Discovery Engine",
  24: "Shaping Pipeline",
  25: "Shaping Pipeline",
  26: "Offering/Prototype",
  27: "BD Quality System",
  28: "BD Quality System",
  29: "Observability v1",
  30: "발굴 평가결과서 v2",
  31: "Task Orchestrator",
  32: "Work Management",
  33: "Work Observability",
  34: "Multi-Agent Sessions",
  35: "Quality Hardening",
  36: "Work Mgmt Enhancement",
};

function getPhaseLabel(id: number, name: string): string {
  return PHASE_NAMES[id] ?? name;
}

// ─── Roadmap Tab ─────────────────────────────────────────────────────────────

function RoadmapTab({ phaseProgress, roadmapContent }: { phaseProgress: PhaseProgressData | null; roadmapContent: string | null }) {
  if (!phaseProgress) {
    return <div style={{ color: T.text.secondary, padding: 20, fontFamily: T.font }}>불러오는 중…</div>;
  }

  const phases = phaseProgress.phases;
  const currentId = phaseProgress.current_phase;

  const completed = phases.filter(p => p.pct === 100);
  const active = phases.filter(p => p.pct < 100 && p.pct > 0);
  const planned = phases.filter(p => p.pct === 0 && p.total > 0);

  const renderPhaseRow = (phase: PhaseProgressData["phases"][0], isCurrent: boolean) => {
    const label = getPhaseLabel(phase.id, phase.name);
    const barColor = phase.pct === 100 ? T.status.done : isCurrent ? T.status.active : T.text.muted;

    return (
      <div
        key={phase.id}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "10px 14px",
          background: isCurrent ? T.bg.card : "transparent",
          borderRadius: 8,
          borderLeft: isCurrent ? `3px solid ${T.status.active}` : "3px solid transparent",
          transition: "background 0.15s",
        }}
      >
        <span style={{ color: T.text.muted, fontSize: 11, minWidth: 56, fontFamily: T.mono, fontWeight: 600 }}>
          Phase {phase.id}
        </span>
        <span style={{ color: isCurrent ? T.text.primary : T.text.secondary, fontSize: 13, minWidth: 180, fontWeight: isCurrent ? 600 : 400 }}>
          {label}
        </span>
        <div style={{ flex: 1, background: T.bg.inset, borderRadius: 4, height: 6, overflow: "hidden" }}>
          <div
            style={{
              width: `${phase.pct}%`,
              height: "100%",
              background: barColor,
              borderRadius: 4,
              transition: "width 0.3s ease",
            }}
          />
        </div>
        <span style={{ color: barColor, fontSize: 11, fontWeight: 700, minWidth: 44, textAlign: "right", fontFamily: T.mono }}>
          {phase.done}/{phase.total}
        </span>
      </div>
    );
  };

  const sectionLabel = (label: string, color: string, count?: number) => (
    <div style={{
      fontSize: 10,
      color,
      fontWeight: 700,
      marginBottom: 8,
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      fontFamily: T.mono,
    }}>
      {label}{count !== undefined ? ` (${count})` : ""}
    </div>
  );

  return (
    <div style={{ fontFamily: T.font }}>
      <div style={{ fontSize: 12, color: T.text.muted, marginBottom: 24, fontFamily: T.mono }}>
        Phase {currentId} active · {phases.length} phases tracked
      </div>

      {active.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          {sectionLabel("진행 중", T.status.planned)}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {active.map(p => renderPhaseRow(p, p.id === currentId))}
          </div>
        </section>
      )}

      {planned.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          {sectionLabel("예정", T.status.active)}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {planned.map(p => renderPhaseRow(p, false))}
          </div>
        </section>
      )}

      {completed.length > 0 && (
        <section>
          {sectionLabel("완료", T.status.done, completed.length)}
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {completed.slice(-8).map(p => renderPhaseRow(p, false))}
          </div>
          {completed.length > 8 && (
            <div style={{ fontSize: 11, color: T.text.muted, marginTop: 8, paddingLeft: 40 }}>
              … 이전 {completed.length - 8}개 Phase 완료
            </div>
          )}
        </section>
      )}

      {/* Future plans from ROADMAP.md */}
      {roadmapContent && (
        <section style={{ marginTop: 32, borderTop: `1px solid ${T.border.subtle}`, paddingTop: 24 }}>
          {sectionLabel("향후 계획", T.text.accent)}
          <div
            style={{
              background: T.bg.card,
              borderRadius: 10,
              padding: "16px 20px",
              border: `1px solid ${T.border.subtle}`,
              fontSize: 13,
              lineHeight: 1.7,
              color: T.text.secondary,
            }}
          >
            <ReactMarkdown
              components={{
                h2: ({ children }) => (
                  <div style={{ fontWeight: 700, color: T.text.primary, margin: "18px 0 8px", fontSize: 15, fontFamily: T.font }}>{children}</div>
                ),
                h3: ({ children }) => (
                  <div style={{ fontWeight: 600, color: T.text.primary, margin: "14px 0 6px", fontSize: 13 }}>{children}</div>
                ),
                li: ({ children }) => (
                  <li style={{ marginBottom: 4, color: T.text.secondary, fontSize: 12 }}>{children}</li>
                ),
                strong: ({ children }) => (
                  <strong style={{ color: T.text.primary }}>{children}</strong>
                ),
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noreferrer" style={{ color: T.text.accent }}>{children}</a>
                ),
                code: ({ children }) => (
                  <code style={{ background: T.bg.inset, padding: "1px 5px", borderRadius: 3, fontSize: 11, fontFamily: T.mono }}>{children}</code>
                ),
                table: ({ children }) => (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, margin: "8px 0" }}>{children}</table>
                ),
                th: ({ children }) => (
                  <th style={{ textAlign: "left", padding: "6px 10px", borderBottom: `1px solid ${T.border.subtle}`, color: T.text.muted, fontWeight: 600 }}>{children}</th>
                ),
                td: ({ children }) => (
                  <td style={{ padding: "6px 10px", borderBottom: `1px solid ${T.border.subtle}` }}>{children}</td>
                ),
                p: ({ children }) => (
                  <p style={{ margin: "6px 0" }}>{children}</p>
                ),
              }}
            >
              {roadmapContent}
            </ReactMarkdown>
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Changelog Tab ───────────────────────────────────────────────────────────

interface ChangelogSection {
  heading: string;
  lines: string[];
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

function ChangelogTab() {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchApi<{ content: string }>("/work/changelog")
      .then(data => setContent(data.content))
      .catch(() => setError("CHANGELOG을 불러올 수 없어요"));
  }, []);

  if (error) return <div style={{ color: T.status.error, padding: 20, fontFamily: T.font }}>{error}</div>;
  if (content === null) return <div style={{ color: T.text.secondary, padding: 20, fontFamily: T.font }}>불러오는 중…</div>;
  if (!content) return <div style={{ color: T.text.muted, padding: 20, fontFamily: T.font }}>CHANGELOG.md가 비어있어요</div>;

  const sections = parseChangelog(content);

  return (
    <div style={{ fontFamily: T.font }}>
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
            <div
              style={{
                padding: "12px 18px",
                background: isUnreleased ? T.status.planned + "0a" : T.bg.inset,
                borderBottom: `1px solid ${T.border.subtle}`,
                fontSize: 14,
                fontWeight: 700,
                color: isUnreleased ? T.status.warning : T.text.primary,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              {isUnreleased && (
                <span style={{
                  fontSize: 9,
                  background: T.status.planned + "33",
                  padding: "2px 8px",
                  borderRadius: 4,
                  fontFamily: T.mono,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}>NEXT</span>
              )}
              {section.heading}
            </div>
            <div
              style={{
                padding: "14px 18px",
                fontSize: 13,
                lineHeight: 1.7,
                color: T.text.secondary,
                maxHeight: 500,
                overflow: "auto",
              }}
              className="changelog-md"
            >
              <ReactMarkdown
                components={{
                  h3: ({ children }) => (
                    <div style={{ fontWeight: 700, color: T.text.primary, margin: "16px 0 8px", fontSize: 14, fontFamily: T.font }}>
                      {children}
                    </div>
                  ),
                  li: ({ children }) => (
                    <li style={{ marginBottom: 4, paddingLeft: 4, color: T.text.secondary, fontSize: 12 }}>
                      {children}
                    </li>
                  ),
                  strong: ({ children }) => (
                    <strong style={{ color: T.text.primary, fontWeight: 600 }}>{children}</strong>
                  ),
                  a: ({ href, children }) => (
                    <a href={href} target="_blank" rel="noreferrer" style={{ color: T.text.accent, textDecoration: "none" }}>
                      {children}
                    </a>
                  ),
                  code: ({ children }) => (
                    <code style={{ background: T.bg.inset, padding: "1px 5px", borderRadius: 3, fontSize: 11, fontFamily: T.mono, color: T.status.planned }}>
                      {children}
                    </code>
                  ),
                  p: ({ children }) => (
                    <p style={{ margin: "6px 0", fontSize: 12, lineHeight: 1.6 }}>{children}</p>
                  ),
                }}
              >
                {section.lines.join("\n")}
              </ReactMarkdown>
            </div>
          </div>
        );
      })}
    </div>
  );
}

type Tab = "kanban" | "context" | "classify" | "sessions" | "pipeline" | "velocity" | "backlog" | "roadmap" | "changelog";

export function Component() {
  const [tab, setTab] = useState<Tab>("kanban");
  const [snapshot, setSnapshot] = useState<WorkSnapshot | null>(null);
  const [phaseProgress, setPhaseProgress] = useState<PhaseProgressData | null>(null);
  const [backlogHealth, setBacklogHealth] = useState<BacklogHealthData | null>(null);
  const [roadmapContent, setRoadmapContent] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const hasSnapshotData = useRef(false);

  const fetchSnapshot = useCallback(async () => {
    try {
      const data = await fetchApi<WorkSnapshot>("/work/snapshot");
      setSnapshot(data);
      setLastUpdate(new Date());
      setFetchError(null);
      hasSnapshotData.current = true;
    } catch (e) {
      if (!hasSnapshotData.current) {
        setFetchError(
          e instanceof ApiError && e.status === 401
            ? "로그인이 필요해요"
            : "데이터를 불러올 수 없어요",
        );
      }
    }
  }, []);

  const fetchAnalytics = useCallback(async () => {
    try { setPhaseProgress(await fetchApi<PhaseProgressData>("/work/phase-progress")); } catch { /* ignore */ }
    try { setBacklogHealth(await fetchApi<BacklogHealthData>("/work/backlog-health")); } catch { /* ignore */ }
    try {
      const rm = await fetchApi<{ content: string }>("/work/roadmap");
      setRoadmapContent(rm.content);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchSnapshot();
    fetchAnalytics();
    const id = setInterval(fetchSnapshot, 5000);
    return () => clearInterval(id);
  }, [fetchSnapshot, fetchAnalytics]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "kanban",    label: "작업 현황" },
    { key: "roadmap",   label: "Roadmap" },
    { key: "backlog",   label: "Backlog" },
    { key: "changelog", label: "Changelog" },
    { key: "classify",  label: "작업 분류" },
  ];

  return (
    <div
      style={{
        padding: "28px 32px",
        background: T.bg.page,
        minHeight: "100vh",
        color: T.text.primary,
        fontFamily: T.font,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
          작업 현황
        </h1>
        <div style={{
          height: 20,
          width: 1,
          background: T.border.subtle,
        }} />
        <span style={{ fontSize: 11, color: T.text.muted, fontFamily: T.mono }}>
          Foundry-X
        </span>
        {lastUpdate && (
          <span style={{ fontSize: 10, color: T.text.muted, marginLeft: "auto", fontFamily: T.mono }}>
            {formatDate(lastUpdate.toISOString())}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex",
        gap: 2,
        marginBottom: 28,
        borderBottom: `1px solid ${T.border.subtle}`,
      }}>
        {tabs.map(t => {
          const isActive = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: "10px 18px",
                fontSize: 13,
                fontWeight: isActive ? 700 : 400,
                color: isActive ? T.text.primary : T.text.muted,
                background: isActive ? T.bg.card : "transparent",
                border: "none",
                borderBottom: isActive ? `2px solid ${T.border.accent}` : "2px solid transparent",
                borderRadius: "6px 6px 0 0",
                cursor: "pointer",
                marginBottom: -1,
                transition: "all 0.15s",
                fontFamily: T.font,
                letterSpacing: "-0.01em",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {fetchError && !snapshot && (
        <div style={{ textAlign: "center", padding: "60px 0", color: T.text.secondary }}>
          <div style={{ fontSize: 15, marginBottom: 16 }}>{fetchError}</div>
          <button
            onClick={() => { setFetchError(null); void fetchSnapshot(); }}
            style={{
              background: T.border.accent, color: "#fff", border: "none",
              borderRadius: 8, padding: "10px 24px", cursor: "pointer", fontSize: 13,
              fontWeight: 600, fontFamily: T.font,
            }}
          >
            다시 시도
          </button>
        </div>
      )}
      {(!fetchError || snapshot) && tab === "kanban"   && <KanbanTab snapshot={snapshot} />}
      {tab === "roadmap"   && <RoadmapTab phaseProgress={phaseProgress} roadmapContent={roadmapContent} />}
      {tab === "backlog"   && <BacklogHealthTab health={backlogHealth} />}
      {tab === "changelog" && <ChangelogTab />}
      {tab === "classify"  && <ClassifyTab />}
    </div>
  );
}
