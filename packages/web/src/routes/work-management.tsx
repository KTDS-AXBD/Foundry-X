import { useState, useEffect, useCallback, useRef } from "react";
import { fetchApi, postApi, ApiError } from "@/lib/api-client";

// ─── Types ───────────────────────────────────────────────────────────────────

// F514 — Analytics types (B-4, B-5)
interface VelocityData {
  sprints: Array<{ sprint: number; f_items_done: number; week: string }>;
  avg_per_sprint: number;
  trend: "up" | "down" | "stable";
  generated_at: string;
}

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

interface WorkContext {
  recent_commits: Array<{ sha: string; message: string; date: string; author: string }>;
  worktrees: string[];
  daemon_events: Array<{ event: string; timestamp: string }>;
  next_actions: string[];
  note?: string;
}

interface ClassifyResult {
  track: WorkTrack;
  priority: WorkPriority;
  title: string;
  req_code?: string;
  method: "llm" | "regex";
}

type SessionStatus = "busy" | "idle" | "done";
type SessionProfile = "coder" | "reviewer" | "tester" | "unknown";

interface AgentSession {
  id: string;
  name: string;
  status: SessionStatus;
  profile: SessionProfile;
  worktree?: string;
  branch?: string;
  windows: number;
  last_activity?: string;
  collected_at: string;
}

interface SessionList {
  sessions: AgentSession[];
  worktrees: Array<{ path: string; branch: string }>;
  last_sync: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const COLUMNS: { key: WorkStatus; label: string; color: string }[] = [
  { key: "planned",     label: "PLANNED",     color: "#3b82f6" },
  { key: "in_progress", label: "IN PROGRESS",  color: "#f59e0b" },
  { key: "done",        label: "DONE",         color: "#22c55e" },
  { key: "backlog",     label: "BACKLOG",      color: "#6b7280" },
];

const PRIORITY_COLORS: Record<WorkPriority, string> = {
  P0: "#ef4444",
  P1: "#f97316",
  P2: "#3b82f6",
  P3: "#6b7280",
};

const TRACK_COLORS: Record<WorkTrack, string> = {
  F: "#8b5cf6",
  B: "#ef4444",
  C: "#6b7280",
  X: "#06b6d4",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("ko-KR", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
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
        padding: "1px 6px",
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 600,
        color: "#fff",
        background: color,
        marginRight: 4,
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
        background: "#1e293b",
        border: "1px solid #334155",
        borderRadius: 6,
        padding: "8px 10px",
        marginBottom: 6,
        fontSize: 12,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 4, color: "#f1f5f9" }}>
        {item.id} {item.sprint ? <span style={{ color: "#64748b" }}>#{item.sprint}</span> : null}
      </div>
      <div style={{ color: "#cbd5e1", marginBottom: 6, lineHeight: 1.4 }}>
        {item.title}
      </div>
      <div>
        {item.priority && <Badge label={priority} color={PRIORITY_COLORS[priority] ?? "#6b7280"} />}
        {item.req_code && <Badge label={item.req_code} color="#0ea5e9" />}
      </div>
    </div>
  );
}

const STATUS_META: Record<SessionStatus, { label: string; dot: string; color: string }> = {
  busy:  { label: "BUSY",  dot: "🟢", color: "#22c55e" },
  idle:  { label: "IDLE",  dot: "🟡", color: "#f59e0b" },
  done:  { label: "DONE",  dot: "⚫", color: "#6b7280" },
};

const PROFILE_META: Record<SessionProfile, { label: string; color: string }> = {
  coder:    { label: "coder",    color: "#3b82f6" },
  reviewer: { label: "reviewer", color: "#8b5cf6" },
  tester:   { label: "tester",   color: "#06b6d4" },
  unknown:  { label: "unknown",  color: "#6b7280" },
};

function SessionCard({ session }: { session: AgentSession }) {
  const statusMeta = STATUS_META[session.status];
  const profileMeta = PROFILE_META[session.profile];
  return (
    <div
      style={{
        background: "#1e293b",
        border: `1px solid ${statusMeta.color}44`,
        borderRadius: 8,
        padding: "10px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 14 }}>{statusMeta.dot}</span>
        <span style={{ fontWeight: 600, fontSize: 13, color: "#f1f5f9", flex: 1 }}>{session.name}</span>
        <Badge label={statusMeta.label} color={statusMeta.color} />
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <Badge label={profileMeta.label} color={profileMeta.color} />
        {session.windows > 1 && (
          <Badge label={`${session.windows}w`} color="#475569" />
        )}
      </div>
      {session.branch && (
        <div style={{ fontSize: 11, color: "#64748b", fontFamily: "monospace" }}>
          {session.branch}
        </div>
      )}
      {session.last_activity && (
        <div style={{ fontSize: 11, color: "#334155" }}>
          활동: {formatDate(session.last_activity)}
        </div>
      )}
    </div>
  );
}

function SessionsTab({ data }: { data: SessionList | null }) {
  if (!data) {
    return <div style={{ color: "#94a3b8", padding: 20 }}>불러오는 중…</div>;
  }

  const busy = data.sessions.filter(s => s.status === "busy");
  const idle = data.sessions.filter(s => s.status === "idle");
  const done = data.sessions.filter(s => s.status === "done");

  const syncAge = data.last_sync
    ? Math.round((Date.now() - new Date(data.last_sync).getTime()) / 1000)
    : null;

  const syncStale = syncAge !== null && syncAge > 120;

  return (
    <div>
      {/* Status bar */}
      <div
        style={{
          display: "flex",
          gap: 20,
          marginBottom: 20,
          background: "#0f172a",
          padding: "10px 14px",
          borderRadius: 8,
          alignItems: "center",
        }}
      >
        {[
          { label: "Busy",  value: busy.length,  color: "#22c55e" },
          { label: "Idle",  value: idle.length,  color: "#f59e0b" },
          { label: "Done",  value: done.length,  color: "#6b7280" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
            <div style={{ fontSize: 11, color: "#64748b" }}>{label}</div>
          </div>
        ))}
        <div style={{ marginLeft: "auto", fontSize: 11, color: syncStale ? "#ef4444" : "#334155" }}>
          {syncAge !== null
            ? syncStale
              ? `⚠️ sync 끊김 (${syncAge}s ago)`
              : `Last sync: ${syncAge}s ago`
            : "동기화 대기 중"}
        </div>
      </div>

      {data.sessions.length === 0 ? (
        <div
          style={{
            border: "1px dashed #1e293b",
            borderRadius: 8,
            padding: 24,
            color: "#475569",
            textAlign: "center",
            fontSize: 13,
          }}
        >
          활성 세션 없음 — session-collector.sh가 실행 중인지 확인하세요
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { label: "BUSY",  items: busy,  color: "#22c55e" },
            { label: "IDLE",  items: idle,  color: "#f59e0b" },
            { label: "DONE",  items: done,  color: "#6b7280" },
          ].map(col => (
            <div key={col.label}>
              <div
                style={{
                  padding: "6px 10px",
                  background: col.color + "22",
                  border: `1px solid ${col.color}44`,
                  borderRadius: 6,
                  marginBottom: 8,
                  fontWeight: 600,
                  fontSize: 12,
                  color: col.color,
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>{col.label}</span>
                <span style={{ opacity: 0.7 }}>{col.items.length}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {col.items.length === 0 ? (
                  <div
                    style={{
                      border: "1px dashed #1e293b",
                      borderRadius: 6,
                      padding: 12,
                      color: "#334155",
                      fontSize: 12,
                      textAlign: "center",
                    }}
                  >
                    비어있음
                  </div>
                ) : (
                  col.items.map(s => <SessionCard key={s.id} session={s} />)
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Worktrees */}
      {data.worktrees.length > 0 && (
        <section>
          <h3 style={{ color: "#94a3b8", fontSize: 13, marginBottom: 10 }}>
            Worktrees ({data.worktrees.length})
          </h3>
          <div style={{ fontFamily: "monospace" }}>
            {data.worktrees.map((wt, i) => (
              <div
                key={i}
                style={{
                  padding: "6px 10px",
                  borderBottom: "1px solid #1e293b",
                  fontSize: 12,
                  display: "flex",
                  gap: 10,
                }}
              >
                <span style={{ color: "#64748b" }}>└</span>
                <span style={{ color: "#cbd5e1", flex: 1 }}>{wt.path}</span>
                <span style={{ color: "#f59e0b" }}>{wt.branch}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── F514 Tab Components ──────────────────────────────────────────────────────

function PipelineFlowTab({
  snapshot,
  backlogHealth,
}: {
  snapshot: WorkSnapshot | null;
  backlogHealth: BacklogHealthData | null;
}) {
  const summary = snapshot?.summary;

  const stages: Array<{ label: string; count: number; color: string }> = [
    { label: "Backlog",      count: summary?.backlog      ?? 0, color: "#6b7280" },
    { label: "Planned",      count: summary?.planned      ?? 0, color: "#3b82f6" },
    { label: "In Progress",  count: summary?.in_progress  ?? 0, color: "#f59e0b" },
    { label: "Done (Today)", count: summary?.done_today   ?? 0, color: "#22c55e" },
  ];
  const maxCount = Math.max(...stages.map(s => s.count), 1);

  const scoreColor = backlogHealth
    ? backlogHealth.health_score >= 80 ? "#22c55e"
      : backlogHealth.health_score >= 60 ? "#f59e0b"
      : "#ef4444"
    : "#94a3b8";

  return (
    <div>
      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, color: "#e2e8f0" }}>
        Pipeline Flow
      </h2>

      {/* Stage bars */}
      <div style={{ marginBottom: 28 }}>
        {stages.map((stage) => (
          <div key={stage.label} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 13 }}>
              <span style={{ color: "#cbd5e1" }}>{stage.label}</span>
              <span style={{ color: stage.color, fontWeight: 600 }}>{stage.count}</span>
            </div>
            <div style={{ background: "#1e293b", borderRadius: 4, height: 10 }}>
              <div
                style={{
                  width: `${Math.round((stage.count / maxCount) * 100)}%`,
                  height: "100%",
                  background: stage.color,
                  borderRadius: 4,
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Backlog Health */}
      {backlogHealth && (
        <div
          style={{
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: 8,
            padding: "16px 20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <span style={{ fontSize: 14, color: "#94a3b8" }}>Health Score</span>
            <span
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: scoreColor,
              }}
            >
              {backlogHealth.health_score}
              <span style={{ fontSize: 13, fontWeight: 400, color: "#64748b" }}>/100</span>
            </span>
            <span style={{ fontSize: 12, color: "#64748b" }}>
              Total: {backlogHealth.total_backlog} items
            </span>
          </div>

          {backlogHealth.warnings.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              {backlogHealth.warnings.map((w, i) => (
                <div key={i} style={{ fontSize: 12, color: "#f59e0b", marginBottom: 4 }}>
                  ⚠ {w}
                </div>
              ))}
            </div>
          )}

          {backlogHealth.stale_items.length > 0 && (
            <div>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>
                Stale Items ({backlogHealth.stale_items.length})
              </div>
              {backlogHealth.stale_items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    gap: 10,
                    fontSize: 12,
                    padding: "6px 0",
                    borderBottom: "1px solid #1e293b",
                    color: "#94a3b8",
                  }}
                >
                  <span style={{ color: "#f59e0b", minWidth: 40 }}>{item.id}</span>
                  <span style={{ flex: 1 }}>{item.title}</span>
                  <span style={{ color: "#64748b" }}>{item.age_sprints}+ sprints</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!snapshot && !backlogHealth && (
        <div style={{ color: "#94a3b8", padding: 20 }}>불러오는 중…</div>
      )}
    </div>
  );
}

function VelocityTab({
  velocity,
  phaseProgress,
}: {
  velocity: VelocityData | null;
  phaseProgress: PhaseProgressData | null;
}) {
  const maxDone = velocity
    ? Math.max(...velocity.sprints.map(s => s.f_items_done), 1)
    : 1;

  const trendLabel = velocity?.trend === "up"   ? "↑ UP"
                   : velocity?.trend === "down" ? "↓ DOWN"
                   : "→ stable";
  const trendColor = velocity?.trend === "up"   ? "#22c55e"
                   : velocity?.trend === "down" ? "#ef4444"
                   : "#94a3b8";

  return (
    <div>
      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, color: "#e2e8f0" }}>
        Sprint Velocity
      </h2>

      {velocity ? (
        <>
          {/* Summary row */}
          <div style={{ display: "flex", gap: 16, marginBottom: 20, alignItems: "center" }}>
            <div style={{ fontSize: 13, color: "#94a3b8" }}>
              Avg:{" "}
              <span style={{ color: "#f1f5f9", fontWeight: 600 }}>
                {velocity.avg_per_sprint}
              </span>{" "}
              F-items/sprint
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: trendColor }}>
              {trendLabel}
            </span>
          </div>

          {/* Sprint bars */}
          <div style={{ marginBottom: 28 }}>
            {velocity.sprints.slice(-10).map((s) => (
              <div key={s.sprint} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
                  <span style={{ color: "#94a3b8" }}>Sprint {s.sprint}</span>
                  <span style={{ color: "#f1f5f9", fontWeight: 600 }}>{s.f_items_done}</span>
                </div>
                <div style={{ background: "#1e293b", borderRadius: 4, height: 8 }}>
                  <div
                    style={{
                      width: `${Math.round((s.f_items_done / maxDone) * 100)}%`,
                      height: "100%",
                      background: "#3b82f6",
                      borderRadius: 4,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ color: "#94a3b8", marginBottom: 28 }}>Velocity 불러오는 중…</div>
      )}

      {/* Phase Progress */}
      {phaseProgress && (
        <>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0", marginBottom: 14 }}>
            Phase Progress (current: Phase {phaseProgress.current_phase})
          </h3>
          {phaseProgress.phases.slice(-8).map((phase) => (
            <div key={phase.id} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
                <span style={{ color: "#94a3b8" }}>{phase.name}</span>
                <span style={{ color: "#64748b" }}>
                  {phase.done}/{phase.total} ({phase.pct}%)
                </span>
              </div>
              <div style={{ background: "#1e293b", borderRadius: 4, height: 6 }}>
                <div
                  style={{
                    width: `${phase.pct}%`,
                    height: "100%",
                    background: phase.pct === 100 ? "#22c55e" : "#3b82f6",
                    borderRadius: 4,
                  }}
                />
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function BacklogHealthTab({ health }: { health: BacklogHealthData | null }) {
  if (!health) {
    return <div style={{ color: "#94a3b8", padding: 20 }}>불러오는 중…</div>;
  }

  const scoreColor = health.health_score >= 80 ? "#22c55e"
                   : health.health_score >= 60 ? "#f59e0b"
                   : "#ef4444";

  return (
    <div>
      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, color: "#e2e8f0" }}>
        Backlog Health
      </h2>

      {/* Score card */}
      <div
        style={{
          background: "#0f172a",
          border: `1px solid ${scoreColor}33`,
          borderRadius: 8,
          padding: "20px 24px",
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          gap: 24,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 36, fontWeight: 700, color: scoreColor }}>
            {health.health_score}
          </div>
          <div style={{ fontSize: 11, color: "#64748b" }}>/ 100</div>
        </div>
        <div>
          <div style={{ fontSize: 14, color: "#94a3b8", marginBottom: 4 }}>Health Score</div>
          <div style={{ fontSize: 13, color: "#cbd5e1" }}>
            Total: <strong>{health.total_backlog}</strong> backlog items
          </div>
          {health.stale_items.length > 0 && (
            <div style={{ fontSize: 12, color: "#f59e0b", marginTop: 4 }}>
              {health.stale_items.length} stale item(s)
            </div>
          )}
        </div>
      </div>

      {/* Warnings */}
      {health.warnings.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>Warnings</h3>
          {health.warnings.map((w, i) => (
            <div
              key={i}
              style={{
                background: "#1e293b",
                borderLeft: "3px solid #f59e0b",
                padding: "8px 12px",
                borderRadius: "0 4px 4px 0",
                fontSize: 13,
                color: "#fbbf24",
                marginBottom: 6,
              }}
            >
              ⚠ {w}
            </div>
          ))}
        </div>
      )}

      {/* Stale items */}
      {health.stale_items.length > 0 && (
        <div>
          <h3 style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>
            Stale Items ({health.stale_items.length})
          </h3>
          {health.stale_items.map((item) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                gap: 12,
                padding: "10px 14px",
                background: "#0f172a",
                borderBottom: "1px solid #1e293b",
                fontSize: 13,
              }}
            >
              <span style={{ color: "#f59e0b", minWidth: 48, fontWeight: 600 }}>{item.id}</span>
              <span style={{ flex: 1, color: "#94a3b8" }}>{item.title}</span>
              <span style={{ color: "#64748b", fontSize: 12 }}>{item.age_sprints}+ sprints</span>
            </div>
          ))}
        </div>
      )}

      {health.stale_items.length === 0 && health.warnings.length === 0 && (
        <div style={{ color: "#22c55e", fontSize: 13 }}>✓ 백로그가 건강해요</div>
      )}
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

function KanbanTab({ snapshot }: { snapshot: WorkSnapshot | null }) {
  if (!snapshot) {
    return <div style={{ color: "#94a3b8", padding: 20 }}>불러오는 중…</div>;
  }

  return (
    <div>
      {/* Summary bar */}
      <div
        style={{
          display: "flex",
          gap: 16,
          marginBottom: 20,
          background: "#0f172a",
          padding: "10px 14px",
          borderRadius: 8,
        }}
      >
        {[
          { label: "Backlog", value: snapshot.summary.backlog, color: "#6b7280" },
          { label: "Planned", value: snapshot.summary.planned, color: "#3b82f6" },
          { label: "In Progress", value: snapshot.summary.in_progress, color: "#f59e0b" },
          { label: "Done", value: snapshot.summary.done_today, color: "#22c55e" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
            <div style={{ fontSize: 11, color: "#64748b" }}>{label}</div>
          </div>
        ))}
        <div style={{ marginLeft: "auto", fontSize: 11, color: "#475569", alignSelf: "center" }}>
          {formatDate(snapshot.generated_at)}
        </div>
      </div>

      {/* Kanban columns */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {COLUMNS.map(col => {
          const colItems = snapshot.items.filter(i => i.status === col.key);
          return (
            <div key={col.key}>
              <div
                style={{
                  padding: "6px 10px",
                  background: col.color + "22",
                  border: `1px solid ${col.color}44`,
                  borderRadius: 6,
                  marginBottom: 8,
                  fontWeight: 600,
                  fontSize: 12,
                  color: col.color,
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>{col.label}</span>
                <span style={{ opacity: 0.7 }}>{colItems.length}</span>
              </div>
              {colItems.length === 0 ? (
                <div
                  style={{
                    border: "1px dashed #1e293b",
                    borderRadius: 6,
                    padding: 12,
                    color: "#334155",
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
        <div style={{ marginTop: 24 }}>
          <h3 style={{ color: "#94a3b8", fontSize: 13, marginBottom: 10 }}>Recent PRs</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {snapshot.prs.slice(0, 8).map(pr => (
              <div
                key={pr.number}
                style={{
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: 6,
                  padding: "6px 10px",
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Badge
                  label={pr.state}
                  color={pr.state === "open" ? "#22c55e" : pr.state === "closed" ? "#6b7280" : "#8b5cf6"}
                />
                <a href={pr.url} target="_blank" rel="noreferrer" style={{ color: "#93c5fd" }}>
                  #{pr.number}
                </a>
                <span style={{ color: "#cbd5e1" }}>{pr.title}</span>
                <span style={{ marginLeft: "auto", color: "#475569" }}>
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

function ContextTab({ ctx }: { ctx: WorkContext | null }) {
  if (!ctx) {
    return <div style={{ color: "#94a3b8", padding: 20 }}>불러오는 중…</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Next Actions */}
      <section>
        <h3 style={{ color: "#94a3b8", fontSize: 13, marginBottom: 10 }}>다음 가능 Action</h3>
        {ctx.next_actions.map((action, i) => (
          <div
            key={i}
            style={{
              background: "#1e293b",
              border: "1px solid #1e3a5f",
              borderRadius: 6,
              padding: "8px 12px",
              marginBottom: 6,
              fontSize: 13,
              color: "#bfdbfe",
            }}
          >
            → {action}
          </div>
        ))}
      </section>

      {/* Recent Commits */}
      <section>
        <h3 style={{ color: "#94a3b8", fontSize: 13, marginBottom: 10 }}>
          최근 커밋 ({ctx.recent_commits.length})
        </h3>
        <div style={{ fontFamily: "monospace" }}>
          {ctx.recent_commits.map((c, i) => (
            <div
              key={i}
              style={{
                padding: "6px 10px",
                borderBottom: "1px solid #1e293b",
                fontSize: 12,
                display: "flex",
                gap: 10,
                alignItems: "center",
              }}
            >
              <span style={{ color: "#f59e0b", flexShrink: 0 }}>{c.sha}</span>
              <span style={{ color: "#cbd5e1", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {c.message}
              </span>
              <span style={{ color: "#475569", flexShrink: 0, fontSize: 11 }}>
                {formatDate(c.date)}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Worktrees / Daemon */}
      {ctx.note && (
        <div
          style={{
            background: "#1c1917",
            border: "1px solid #292524",
            borderRadius: 6,
            padding: "10px 12px",
            fontSize: 12,
            color: "#78716c",
          }}
        >
          ℹ️ {ctx.note}
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
    <div style={{ maxWidth: 600 }}>
      <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 16 }}>
        자연어 한 줄 입력 → track / priority / title 자동 분류 (S1 step 2)
      </p>

      <textarea
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="예: 작업 관찰성 view에 burndown chart 추가 필요"
        style={{
          width: "100%",
          minHeight: 80,
          background: "#1e293b",
          border: "1px solid #334155",
          borderRadius: 6,
          padding: "10px 12px",
          color: "#f1f5f9",
          fontSize: 13,
          resize: "vertical",
          marginBottom: 10,
          boxSizing: "border-box",
        }}
        onKeyDown={e => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleClassify();
        }}
      />

      <button
        onClick={handleClassify}
        disabled={loading || !input.trim()}
        style={{
          background: loading ? "#334155" : "#3b82f6",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          padding: "8px 20px",
          cursor: loading ? "not-allowed" : "pointer",
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        {loading ? "분류 중…" : "분류 (Ctrl+Enter)"}
      </button>

      {error && (
        <div style={{ marginTop: 12, color: "#f87171", fontSize: 13 }}>{error}</div>
      )}

      {result && (
        <div
          style={{
            marginTop: 16,
            background: "#0f172a",
            border: "1px solid #1e3a5f",
            borderRadius: 8,
            padding: "14px 16px",
          }}
        >
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <Badge label={result.track} color={TRACK_COLORS[result.track]} />
            <Badge
              label={result.priority}
              color={PRIORITY_COLORS[result.priority] ?? "#6b7280"}
            />
            <Badge
              label={result.method === "llm" ? "AI" : "regex"}
              color={result.method === "llm" ? "#8b5cf6" : "#6b7280"}
            />
          </div>
          <div style={{ color: "#f1f5f9", fontSize: 14, fontWeight: 600 }}>
            {result.title}
          </div>
          {result.req_code && (
            <div style={{ color: "#0ea5e9", fontSize: 12, marginTop: 6 }}>{result.req_code}</div>
          )}
          <div style={{ marginTop: 12, color: "#475569", fontSize: 11 }}>
            S1 step 3: 승인 후 bash scripts/task/task-start.sh {result.track} "{result.title}" "..." 실행
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Route Component ─────────────────────────────────────────────────────

type Tab = "kanban" | "context" | "classify" | "sessions" | "pipeline" | "velocity" | "backlog";

export function Component() {
  const [tab, setTab] = useState<Tab>("kanban");
  const [snapshot, setSnapshot] = useState<WorkSnapshot | null>(null);
  const [ctx, setCtx] = useState<WorkContext | null>(null);
  const [sessions, setSessions] = useState<SessionList | null>(null);
  // F514 — analytics state
  const [velocity, setVelocity] = useState<VelocityData | null>(null);
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

  const fetchContext = useCallback(async () => {
    try {
      setCtx(await fetchApi<WorkContext>("/work/context"));
    } catch {
      // ignore
    }
  }, []);

  const fetchSessions = useCallback(async () => {
    try {
      setSessions(await fetchApi<SessionList>("/work/sessions"));
    } catch {
      // ignore
    }
  }, []);

  // F514 — fetch analytics endpoints once on mount
  const fetchAnalytics = useCallback(async () => {
    try { setVelocity(await fetchApi<VelocityData>("/work/velocity")); } catch { /* ignore */ }
    try { setPhaseProgress(await fetchApi<PhaseProgressData>("/work/phase-progress")); } catch { /* ignore */ }
    try { setBacklogHealth(await fetchApi<BacklogHealthData>("/work/backlog-health")); } catch { /* ignore */ }
  }, []);

  // Initial fetch + 5s polling
  useEffect(() => {
    fetchSnapshot();
    fetchContext();
    fetchSessions();
    fetchAnalytics();
    const id = setInterval(() => {
      fetchSnapshot();
      fetchSessions();
    }, 5000);
    return () => clearInterval(id);
  }, [fetchSnapshot, fetchContext, fetchSessions, fetchAnalytics]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "kanban",   label: "Kanban" },
    { key: "context",  label: "Context Resume" },
    { key: "classify", label: "Classify" },
    { key: "sessions", label: "Sessions" },
    { key: "pipeline", label: "Pipeline" },
    { key: "velocity", label: "Velocity" },
    { key: "backlog",  label: "Backlog" },
  ];

  return (
    <div
      style={{
        padding: "24px 28px",
        background: "#0f172a",
        minHeight: "100vh",
        color: "#f1f5f9",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Work Management</h1>
        <span style={{ fontSize: 12, color: "#475569" }}>F509 · Phase 33</span>
        {lastUpdate && (
          <span style={{ fontSize: 11, color: "#334155", marginLeft: "auto" }}>
            갱신: {formatDate(lastUpdate.toISOString())} · 5s polling
          </span>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid #1e293b", paddingBottom: 0 }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: tab === t.key ? 600 : 400,
              color: tab === t.key ? "#f1f5f9" : "#64748b",
              background: "none",
              border: "none",
              borderBottom: tab === t.key ? "2px solid #3b82f6" : "2px solid transparent",
              cursor: "pointer",
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {fetchError && !snapshot && (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>
          <div style={{ fontSize: 16, marginBottom: 12 }}>{fetchError}</div>
          <button
            onClick={() => { setFetchError(null); void fetchSnapshot(); }}
            style={{
              background: "#3b82f6", color: "#fff", border: "none",
              borderRadius: 6, padding: "8px 20px", cursor: "pointer", fontSize: 13,
            }}
          >
            다시 시도
          </button>
        </div>
      )}
      {(!fetchError || snapshot) && tab === "kanban"   && <KanbanTab   snapshot={snapshot} />}
      {(!fetchError || snapshot) && tab === "context"  && <ContextTab  ctx={ctx} />}
      {tab === "classify" && <ClassifyTab />}
      {(!fetchError || snapshot) && tab === "sessions" && <SessionsTab data={sessions} />}
      {tab === "pipeline" && <PipelineFlowTab snapshot={snapshot} backlogHealth={backlogHealth} />}
      {tab === "velocity" && <VelocityTab velocity={velocity} phaseProgress={phaseProgress} />}
      {tab === "backlog"  && <BacklogHealthTab health={backlogHealth} />}
    </div>
  );
}
