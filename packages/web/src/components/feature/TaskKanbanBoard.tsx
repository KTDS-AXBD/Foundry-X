// ─── F337: TaskKanbanBoard — 10-state Kanban (Sprint 152) ───

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api-client";
import { TaskDetailModal } from "./TaskDetailModal";

interface TaskStateRecord {
  id: string;
  task_id: string;
  tenant_id: string;
  current_state: string;
  agent_id: string | null;
  metadata: string | null;
  created_at: string;
  updated_at: string;
}

interface StateSummary {
  counts: Record<string, number>;
  total: number;
}

const STATE_CONFIG: Record<string, { label: string; color: string; group: string }> = {
  INTAKE:          { label: "접수",      color: "#6b7280", group: "대기" },
  SPEC_DRAFTING:   { label: "명세 작성", color: "#3b82f6", group: "진행" },
  CODE_GENERATING: { label: "코드 생성", color: "#3b82f6", group: "진행" },
  TEST_RUNNING:    { label: "테스트",    color: "#3b82f6", group: "진행" },
  SYNC_VERIFYING:  { label: "동기화",    color: "#3b82f6", group: "진행" },
  PR_OPENED:       { label: "PR 열림",   color: "#8b5cf6", group: "리뷰" },
  REVIEW_PENDING:  { label: "리뷰 대기", color: "#8b5cf6", group: "리뷰" },
  FEEDBACK_LOOP:   { label: "피드백",    color: "#f59e0b", group: "루프" },
  COMPLETED:       { label: "완료",      color: "#10b981", group: "완료" },
  FAILED:          { label: "실패",      color: "#ef4444", group: "실패" },
};

const COLUMN_ORDER = [
  "INTAKE", "SPEC_DRAFTING", "CODE_GENERATING", "TEST_RUNNING",
  "SYNC_VERIFYING", "PR_OPENED", "REVIEW_PENDING", "FEEDBACK_LOOP",
  "COMPLETED", "FAILED",
];

export function TaskKanbanBoard() {
  const [tasks, setTasks] = useState<TaskStateRecord[]>([]);
  const [summary, setSummary] = useState<StateSummary>({ counts: {}, total: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchApi<{ items: TaskStateRecord[]; total: number }>("/task-states?limit=100"),
      fetchApi<StateSummary>("/task-states/summary"),
    ]).then(([list, sum]) => {
      if (!cancelled) {
        setTasks(list.items);
        setSummary(sum);
        setLoading(false);
      }
    }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return <div style={{ padding: 24, color: "#9ca3af" }}>태스크 로딩 중...</div>;
  }

  if (summary.total === 0) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>
        <p style={{ fontSize: 18, marginBottom: 8 }}>아직 오케스트레이션 태스크가 없어요</p>
        <p style={{ fontSize: 14 }}>API를 통해 태스크를 생성하면 여기에 표시돼요</p>
      </div>
    );
  }

  const grouped: Record<string, TaskStateRecord[]> = {};
  for (const state of COLUMN_ORDER) grouped[state] = [];
  for (const t of tasks) {
    if (grouped[t.current_state]) grouped[t.current_state].push(t);
  }

  return (
    <>
      <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "0 0 16px" }}>
        {COLUMN_ORDER.map((state) => {
          const cfg = STATE_CONFIG[state]!;
          const count = summary.counts[state] ?? 0;
          return (
            <div
              key={state}
              style={{
                minWidth: 160,
                flex: "0 0 160px",
                background: "#f9fafb",
                borderRadius: 8,
                padding: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, padding: "0 4px" }}>
                <span
                  style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: cfg.color, display: "inline-block",
                  }}
                />
                <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{cfg.label}</span>
                <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: "auto" }}>{count}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {grouped[state].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTaskId(t.task_id)}
                    style={{
                      background: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: 6,
                      padding: "8px 10px",
                      textAlign: "left",
                      cursor: "pointer",
                      borderLeft: `3px solid ${cfg.color}`,
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{t.task_id}</div>
                    {t.agent_id && (
                      <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{t.agent_id}</div>
                    )}
                    <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 4 }}>
                      {new Date(t.updated_at).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {selectedTaskId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
        />
      )}
    </>
  );
}
