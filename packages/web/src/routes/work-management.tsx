import { useState, useEffect, useCallback, useRef } from "react";
import { fetchApi, postApi, ApiError } from "@/lib/api-client";

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
      <p style={{ color: T.text.secondary, fontSize: 13, marginBottom: 16 }}>
        자연어로 작업을 입력하면 유형과 우선순위를 자동으로 분류해요.
      </p>

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

function RoadmapTab({ phaseProgress }: { phaseProgress: PhaseProgressData | null }) {
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
                fontSize: 12,
                lineHeight: 1.8,
                color: T.text.secondary,
                whiteSpace: "pre-wrap",
                fontFamily: T.mono,
                maxHeight: 400,
                overflow: "auto",
              }}
            >
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
                    return <div key={j} style={{ paddingLeft: 12 }}>{line}</div>;
                  }
                  return <div key={j}>{line}</div>;
                })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

type Tab = "kanban" | "context" | "classify" | "sessions" | "pipeline" | "velocity" | "backlog" | "roadmap" | "changelog" | "submit" | "trace" | "ai-review";

export function Component() {
  const [tab, setTab] = useState<Tab>("kanban");
  const [snapshot, setSnapshot] = useState<WorkSnapshot | null>(null);
  const [phaseProgress, setPhaseProgress] = useState<PhaseProgressData | null>(null);
  const [backlogHealth, setBacklogHealth] = useState<BacklogHealthData | null>(null);
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
  }, []);

  useEffect(() => {
    fetchSnapshot();
    fetchAnalytics();
    // F516: SSE 연결 성공 시 polling interval 30초로 증가, 실패 시 5초 유지
    let pollingInterval = 5000;
    let pollingTimer: ReturnType<typeof setInterval> | null = null;

    const startPolling = (interval: number) => {
      if (pollingTimer) clearInterval(pollingTimer);
      pollingTimer = setInterval(fetchSnapshot, interval);
    };

    startPolling(pollingInterval);

    let es: EventSource | null = null;
    try {
      es = new EventSource("/api/work/stream");
      es.addEventListener("connected", () => {
        pollingInterval = 30000;
        startPolling(pollingInterval);
      });
      es.addEventListener("work:backlog-updated", () => fetchSnapshot());
      es.addEventListener("work:snapshot-refresh", () => fetchSnapshot());
      es.onerror = () => {
        // SSE 연결 실패 시 5초 polling 복원
        pollingInterval = 5000;
        startPolling(pollingInterval);
      };
    } catch {
      // EventSource 미지원 환경 — polling 유지
    }

    return () => {
      if (pollingTimer) clearInterval(pollingTimer);
      if (es) es.close();
    };
  }, [fetchSnapshot, fetchAnalytics]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "kanban",    label: "작업 현황" },
    { key: "roadmap",   label: "Roadmap" },
    { key: "backlog",   label: "Backlog" },
    { key: "changelog", label: "Changelog" },
    { key: "classify",  label: "작업 분류" },
    { key: "submit",    label: "아이디어 제출" },
    { key: "trace",     label: "추적" },
    { key: "ai-review", label: "AI 검증" },
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
      {tab === "roadmap"   && <RoadmapTab phaseProgress={phaseProgress} />}
      {tab === "backlog"   && <BacklogHealthTab health={backlogHealth} />}
      {tab === "changelog" && <ChangelogTab />}
      {tab === "classify"  && <ClassifyTab />}
      {tab === "submit"    && <SubmitTab />}
      {tab === "trace"     && <TraceTab />}
      {tab === "ai-review" && <DualAiReviewTab />}
    </div>
  );
}

// ─── F552: DualAiReviewTab ───────────────────────────────────────────────────

interface DualReviewStatsData {
  total: number;
  concordance_rate: number;
  block_rate: number;
  degraded_rate: number;
  block_reasons: Array<{ reason: string; count: number }>;
  recent_reviews: Array<{
    sprint_id: number;
    claude_verdict: string | null;
    codex_verdict: string;
    decision: string;
    divergence_score: number;
    degraded: boolean;
    created_at: string;
  }>;
}

function DualAiReviewTab() {
  const [stats, setStats] = useState<DualReviewStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await fetchApi<DualReviewStatsData>("/verification/dual-reviews/stats");
        if (mounted) setStats(data);
      } catch {
        // ignore
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return <div style={{ padding: 24, color: T.text.muted }}>로딩 중...</div>;
  }

  if (!stats || stats.total === 0) {
    return (
      <div style={{
        padding: 32, textAlign: "center", color: T.text.secondary,
        background: T.bg.card, borderRadius: 12, border: `1px solid ${T.border.subtle}`,
      }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🤖</div>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
          아직 Dual AI Review 데이터가 없어요
        </div>
        <div style={{ fontSize: 13, color: T.text.muted }}>
          Sprint autopilot Phase 5c에서 Codex 리뷰가 실행되면 여기에 표시돼요.
        </div>
      </div>
    );
  }

  const verdictColor = (v: string | null) => {
    if (!v) return T.text.muted;
    if (v === "PASS" || v === "PASS-degraded") return T.status.done;
    if (v === "BLOCK") return "#ef4444";
    if (v === "WARN") return T.status.warning;
    return T.text.secondary;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {[
          { label: "총 리뷰", value: stats.total, color: T.text.accent },
          { label: "일치율", value: `${stats.concordance_rate}%`, color: T.status.done },
          { label: "BLOCK율", value: `${stats.block_rate}%`, color: "#ef4444" },
          { label: "Degraded율", value: `${stats.degraded_rate}%`, color: T.status.warning },
        ].map((card) => (
          <div key={card.label} style={{
            background: T.bg.card, borderRadius: 10,
            border: `1px solid ${T.border.subtle}`, padding: "16px 18px",
          }}>
            <div style={{ fontSize: 11, color: T.text.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {card.label}
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: card.color, fontFamily: T.mono }}>
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* Review Table */}
      <div style={{
        background: T.bg.card, borderRadius: 12, border: `1px solid ${T.border.subtle}`,
        overflow: "hidden",
      }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.border.subtle}` }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>최근 Sprint 리뷰</span>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: T.bg.inset }}>
              {["Sprint", "Claude", "Codex", "Decision", "Divergence", "Date"].map((h) => (
                <th key={h} style={{
                  padding: "10px 14px", textAlign: "left", fontWeight: 600,
                  color: T.text.secondary, fontSize: 11, textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stats.recent_reviews.map((r) => (
              <tr key={`${r.sprint_id}-${r.created_at}`} style={{ borderBottom: `1px solid ${T.border.subtle}` }}>
                <td style={{ padding: "10px 14px", fontFamily: T.mono, fontWeight: 600 }}>
                  #{r.sprint_id}
                </td>
                <td style={{ padding: "10px 14px", color: verdictColor(r.claude_verdict), fontWeight: 600 }}>
                  {r.claude_verdict ?? "—"}
                </td>
                <td style={{ padding: "10px 14px", color: verdictColor(r.codex_verdict), fontWeight: 600 }}>
                  {r.codex_verdict}{r.degraded ? " ⚡" : ""}
                </td>
                <td style={{ padding: "10px 14px", color: verdictColor(r.decision), fontWeight: 700 }}>
                  {r.decision}
                </td>
                <td style={{ padding: "10px 14px", fontFamily: T.mono }}>
                  {r.divergence_score.toFixed(2)}
                </td>
                <td style={{ padding: "10px 14px", color: T.text.muted, fontSize: 12 }}>
                  {r.created_at.slice(0, 10)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Block Reasons */}
      {stats.block_reasons.length > 0 && (
        <div style={{
          background: T.bg.card, borderRadius: 12, border: `1px solid ${T.border.subtle}`,
          padding: 18,
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>BLOCK 사유 Top 5</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {stats.block_reasons.map((br) => (
              <div key={br.reason} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  flex: 1, background: T.bg.inset, borderRadius: 6, height: 24,
                  position: "relative", overflow: "hidden",
                }}>
                  <div style={{
                    position: "absolute", left: 0, top: 0, bottom: 0,
                    width: `${Math.min(100, (br.count / (stats.block_reasons[0]?.count || 1)) * 100)}%`,
                    background: "rgba(239, 68, 68, 0.3)", borderRadius: 6,
                  }} />
                  <span style={{
                    position: "relative", padding: "0 10px", fontSize: 12,
                    lineHeight: "24px", color: T.text.secondary,
                  }}>
                    {br.reason}
                  </span>
                </div>
                <span style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 600, color: "#ef4444", minWidth: 30 }}>
                  {br.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── F516: SubmitTab ──────────────────────────────────────────────────────────

interface SubmitResult {
  id: string;
  track: string;
  priority: string;
  title: string;
  classify_method: string;
  github_issue_number?: number;
  spec_row_added: boolean;
  status: string;
}

// ─── F517: TraceTab ───────────────────────────────────────────────────────────

interface TracePr {
  number: number;
  title: string;
  url: string;
  state: string;
  commits: string[];
}

interface TraceFItem {
  id: string;
  title: string;
  status: string;
  sprint?: string;
  req_code?: string;
  prs: TracePr[];
}

interface TraceChain {
  id: string;
  type: "req" | "f_item";
  f_items: TraceFItem[];
}

function TraceTab() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<TraceChain | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const search = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetchApi<TraceChain>(`/work/trace?id=${encodeURIComponent(query.trim())}`);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "조회 실패");
    } finally {
      setLoading(false);
    }
  }, [query]);

  const sync = useCallback(async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await postApi<{ synced: { spec: number; prs: number } }>("/work/trace/sync", {});
      setSyncMsg(`동기화 완료 — SPEC: ${res.synced.spec}건, PR: ${res.synced.prs}건`);
    } catch (e) {
      setSyncMsg(e instanceof Error ? e.message : "동기화 실패");
    } finally {
      setSyncing(false);
    }
  }, []);

  const statusColor = (s: string) => {
    if (s === "done") return T.status.done;
    if (s === "in_progress") return T.status.active;
    if (s === "rejected") return T.status.error;
    return T.text.muted;
  };

  return (
    <div>
      {/* Search bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, alignItems: "center" }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && void search()}
          placeholder="FX-REQ-545 또는 F517"
          style={{
            flex: 1,
            padding: "10px 14px",
            background: T.bg.card,
            border: `1px solid ${T.border.subtle}`,
            borderRadius: 8,
            color: T.text.primary,
            fontSize: 13,
            fontFamily: T.mono,
            outline: "none",
          }}
        />
        <button
          onClick={() => void search()}
          disabled={loading}
          style={{
            padding: "10px 18px",
            background: T.bg.card,
            border: `1px solid ${T.border.accent}`,
            borderRadius: 8,
            color: T.border.accent,
            fontSize: 13,
            cursor: loading ? "not-allowed" : "pointer",
            fontFamily: T.font,
          }}
        >
          {loading ? "조회 중…" : "조회"}
        </button>
        <button
          onClick={() => void sync()}
          disabled={syncing}
          style={{
            padding: "10px 14px",
            background: "transparent",
            border: `1px solid ${T.border.subtle}`,
            borderRadius: 8,
            color: T.text.muted,
            fontSize: 12,
            cursor: syncing ? "not-allowed" : "pointer",
            fontFamily: T.font,
          }}
        >
          {syncing ? "동기화 중…" : "동기화"}
        </button>
      </div>

      {syncMsg && (
        <div style={{ fontSize: 12, color: T.text.muted, marginBottom: 16, fontFamily: T.mono }}>
          {syncMsg}
        </div>
      )}

      {error && (
        <div style={{ color: T.status.error, fontSize: 13, marginBottom: 16 }}>{error}</div>
      )}

      {result && (
        <div>
          {/* Chain header */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 20,
            padding: "12px 16px",
            background: T.bg.surface,
            borderRadius: 8,
            border: `1px solid ${T.border.subtle}`,
          }}>
            <span style={{ fontSize: 13, fontFamily: T.mono, color: T.border.accent }}>{result.id}</span>
            <span style={{ fontSize: 11, color: T.text.muted }}>
              {result.type === "req" ? "REQ" : "F-item"} · {result.f_items.length}건
            </span>
          </div>

          {/* F-items */}
          {result.f_items.map(fi => (
            <div
              key={fi.id}
              style={{
                marginBottom: 16,
                padding: "14px 16px",
                background: T.bg.card,
                borderRadius: 8,
                border: `1px solid ${T.border.subtle}`,
              }}
            >
              {/* F-item header */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: fi.prs.length > 0 ? 12 : 0 }}>
                <span style={{ fontSize: 12, fontFamily: T.mono, color: T.border.accent }}>{fi.id}</span>
                {fi.sprint && (
                  <span style={{ fontSize: 11, color: T.text.muted }}>Sprint {fi.sprint}</span>
                )}
                {fi.req_code && (
                  <span style={{ fontSize: 11, color: T.text.secondary, fontFamily: T.mono }}>{fi.req_code}</span>
                )}
                <span style={{ fontSize: 11, color: statusColor(fi.status), marginLeft: "auto" }}>
                  {fi.status}
                </span>
              </div>
              <div style={{ fontSize: 13, color: T.text.secondary, marginBottom: fi.prs.length > 0 ? 10 : 0 }}>
                {fi.title}
              </div>

              {/* PRs */}
              {fi.prs.map(pr => (
                <div
                  key={pr.number}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 12px",
                    background: T.bg.surface,
                    borderRadius: 6,
                    marginTop: 6,
                  }}
                >
                  <span style={{ fontSize: 11, color: T.text.muted, fontFamily: T.mono }}>
                    #{pr.number}
                  </span>
                  <a
                    href={pr.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 12, color: T.border.accent, textDecoration: "none", flex: 1 }}
                  >
                    {pr.title}
                  </a>
                  <span style={{
                    fontSize: 10,
                    color: pr.state === "open" ? T.status.active : T.text.muted,
                    fontFamily: T.mono,
                  }}>
                    {pr.state}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {!result && !loading && !error && (
        <div style={{ textAlign: "center", padding: "48px 0", color: T.text.muted, fontSize: 13 }}>
          REQ 코드(FX-REQ-NNN) 또는 F-item 번호(FNNN)로 추적 체인을 조회하세요
        </div>
      )}
    </div>
  );
}

function SubmitTab() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const res = await postApi<SubmitResult>("/work/submit", {
        title: title.trim(),
        description: description.trim() || undefined,
        source: "web",
      });
      setResult(res);
      setTitle("");
      setDescription("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "제출 실패");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: "24px", maxWidth: "600px" }}>
      <h3 style={{ marginBottom: "16px", fontSize: "16px", fontWeight: 600 }}>아이디어 / 피드백 제출</h3>
      <p style={{ marginBottom: "16px", fontSize: "13px", color: "#666" }}>
        새로운 아이디어나 버그를 제출하면 AI가 자동으로 분류하고 Backlog에 등록해요.
      </p>

      <div style={{ marginBottom: "12px" }}>
        <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", fontWeight: 500 }}>제목 *</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="예: 웹에서 바로 아이디어를 제출할 수 없어요"
          style={{ width: "100%", padding: "8px 12px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px", boxSizing: "border-box" }}
          disabled={submitting}
        />
      </div>

      <div style={{ marginBottom: "16px" }}>
        <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", fontWeight: 500 }}>상세 설명 (선택)</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="어떤 문제인지, 어떤 기능을 원하는지 설명해 주세요"
          rows={4}
          style={{ width: "100%", padding: "8px 12px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px", resize: "vertical", boxSizing: "border-box" }}
          disabled={submitting}
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting || !title.trim()}
        style={{
          padding: "8px 20px",
          background: submitting || !title.trim() ? "#ccc" : "#2563eb",
          color: "#fff",
          border: "none",
          borderRadius: "6px",
          cursor: submitting || !title.trim() ? "default" : "pointer",
          fontSize: "14px",
          fontWeight: 500,
        }}
      >
        {submitting ? "처리 중..." : "제출하기"}
      </button>

      {result && (
        <div style={{ marginTop: "16px", padding: "16px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "8px" }}>
          <div style={{ fontWeight: 600, marginBottom: "8px", color: "#166534" }}>등록 완료</div>
          <div style={{ fontSize: "13px", display: "grid", gap: "4px" }}>
            <div>ID: <code>{result.id}</code></div>
            <div>Track: <strong>{result.track}</strong> / Priority: <strong>{result.priority}</strong></div>
            <div>분류 방식: {result.classify_method === "llm" ? "AI 분류" : "규칙 기반 분류"}</div>
            {result.github_issue_number && (
              <div>GitHub Issue: <strong>#{result.github_issue_number}</strong></div>
            )}
            <div>SPEC.md: {result.spec_row_added ? "자동 등록됨" : "수동 등록 필요"}</div>
          </div>
        </div>
      )}

      {error && (
        <div style={{ marginTop: "16px", padding: "12px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "8px", color: "#991b1b", fontSize: "13px" }}>
          {error}
        </div>
      )}
    </div>
  );
}
