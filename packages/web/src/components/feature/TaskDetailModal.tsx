// ─── F337: TaskDetailModal — 태스크 상세 + 이력 + 수동 전이 (Sprint 152) ───

import { useEffect, useState, useCallback } from "react";
import { fetchApi, postApi } from "@/lib/api-client";

interface TaskStateDetail {
  state: {
    id: string;
    task_id: string;
    current_state: string;
    agent_id: string | null;
    metadata: string | null;
    created_at: string;
    updated_at: string;
  };
  history: Array<{
    id: string;
    from_state: string;
    to_state: string;
    trigger_source: string | null;
    trigger_event: string | null;
    transitioned_by: string | null;
    created_at: string;
  }>;
  availableTransitions: string[];
}

const STATE_LABELS: Record<string, string> = {
  INTAKE: "접수", SPEC_DRAFTING: "명세 작성", CODE_GENERATING: "코드 생성",
  TEST_RUNNING: "테스트", SYNC_VERIFYING: "동기화", PR_OPENED: "PR 열림",
  REVIEW_PENDING: "리뷰 대기", FEEDBACK_LOOP: "피드백", COMPLETED: "완료", FAILED: "실패",
};

interface Props {
  taskId: string;
  onClose: () => void;
}

export function TaskDetailModal({ taskId, onClose }: Props) {
  const [detail, setDetail] = useState<TaskStateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [transitioning, setTransitioning] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetchApi<TaskStateDetail>(`/task-states/${taskId}`)
      .then(setDetail)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [taskId]);

  useEffect(() => { load(); }, [load]);

  const handleTransition = async (toState: string) => {
    setTransitioning(true);
    await postApi(`/task-states/${taskId}/transition`, { toState, triggerSource: "manual" });
    load();
    setTransitioning(false);
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff", borderRadius: 12, padding: 24,
          maxWidth: 560, width: "90%", maxHeight: "80vh", overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div style={{ color: "#9ca3af" }}>로딩 중...</div>
        ) : !detail ? (
          <div style={{ color: "#ef4444" }}>태스크를 찾을 수 없어요</div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{detail.state.task_id}</h3>
              <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#6b7280" }}>×</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              <InfoField label="현재 상태" value={STATE_LABELS[detail.state.current_state] ?? detail.state.current_state} />
              <InfoField label="에이전트" value={detail.state.agent_id ?? "-"} />
              <InfoField label="생성일" value={formatDate(detail.state.created_at)} />
              <InfoField label="수정일" value={formatDate(detail.state.updated_at)} />
            </div>

            {detail.availableTransitions.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>수동 전이</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {detail.availableTransitions.map((t) => (
                    <button
                      key={t}
                      disabled={transitioning}
                      onClick={() => handleTransition(t)}
                      style={{
                        padding: "4px 12px", borderRadius: 6, border: "1px solid #d1d5db",
                        background: "#f9fafb", fontSize: 12, cursor: "pointer",
                      }}
                    >
                      → {STATE_LABELS[t] ?? t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>전이 이력</div>
              {detail.history.length === 0 ? (
                <div style={{ fontSize: 13, color: "#9ca3af" }}>아직 전이 이력이 없어요</div>
              ) : (
                <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                      <th style={{ textAlign: "left", padding: "4px 6px", color: "#6b7280", fontWeight: 500 }}>From</th>
                      <th style={{ textAlign: "left", padding: "4px 6px", color: "#6b7280", fontWeight: 500 }}>To</th>
                      <th style={{ textAlign: "left", padding: "4px 6px", color: "#6b7280", fontWeight: 500 }}>Trigger</th>
                      <th style={{ textAlign: "left", padding: "4px 6px", color: "#6b7280", fontWeight: 500 }}>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.history.map((h) => (
                      <tr key={h.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "4px 6px" }}>{STATE_LABELS[h.from_state] ?? h.from_state}</td>
                        <td style={{ padding: "4px 6px" }}>{STATE_LABELS[h.to_state] ?? h.to_state}</td>
                        <td style={{ padding: "4px 6px", color: "#6b7280" }}>{h.trigger_source ?? "-"}</td>
                        <td style={{ padding: "4px 6px", color: "#9ca3af" }}>{formatDate(h.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, color: "#111827" }}>{value}</div>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}
