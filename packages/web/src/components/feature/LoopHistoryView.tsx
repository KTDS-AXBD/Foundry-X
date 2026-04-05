// ─── F337: LoopHistoryView — 루프 이력 + 품질 점수 차트 (Sprint 152) ───

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api-client";

interface LoopRound {
  round: number;
  agentName: string;
  qualityScore: number | null;
  feedback: string[];
  status: "pass" | "fail" | "error";
  durationMs: number;
  timestamp: string;
}

interface LoopContext {
  id: string;
  taskId: string;
  loopMode: string;
  currentRound: number;
  maxRounds: number;
  status: string;
  convergence: { minQualityScore: number; maxRounds: number; requiredConsecutivePass: number };
  history: LoopRound[];
  createdAt: string;
}

interface TaskOption {
  task_id: string;
  current_state: string;
}

const STATUS_COLORS: Record<string, string> = {
  pass: "#10b981",
  fail: "#ef4444",
  error: "#6b7280",
};

export function LoopHistoryView() {
  const [tasks, setTasks] = useState<TaskOption[]>([]);
  const [selectedTask, setSelectedTask] = useState<string>("");
  const [contexts, setContexts] = useState<LoopContext[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchApi<{ items: TaskOption[] }>("/task-states?limit=100")
      .then((res) => setTasks(res.items))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedTask) { setContexts([]); return; }
    setLoading(true);
    fetchApi<{ items: LoopContext[] }>(`/task-states/${selectedTask}/loop-history?limit=10`)
      .then((res) => setContexts(res.items))
      .catch(() => setContexts([]))
      .finally(() => setLoading(false));
  }, [selectedTask]);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 13, fontWeight: 500, color: "#374151", marginRight: 8 }}>
          태스크 선택
        </label>
        <select
          value={selectedTask}
          onChange={(e) => setSelectedTask(e.target.value)}
          style={{
            padding: "6px 12px", borderRadius: 6, border: "1px solid #d1d5db",
            fontSize: 13, minWidth: 200,
          }}
        >
          <option value="">-- 선택 --</option>
          {tasks.map((t) => (
            <option key={t.task_id} value={t.task_id}>{t.task_id} ({t.current_state})</option>
          ))}
        </select>
      </div>

      {!selectedTask && (
        <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>
          태스크를 선택하면 루프 이력이 표시돼요
        </div>
      )}

      {loading && <div style={{ color: "#9ca3af", padding: 20 }}>로딩 중...</div>}

      {selectedTask && !loading && contexts.length === 0 && (
        <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>
          이 태스크에 루프 이력이 없어요
        </div>
      )}

      {contexts.map((ctx) => (
        <div key={ctx.id} style={{ marginBottom: 24, background: "#f9fafb", borderRadius: 8, padding: 16 }}>
          <div style={{ display: "flex", gap: 16, marginBottom: 12, fontSize: 13 }}>
            <span><strong>모드:</strong> {ctx.loopMode}</span>
            <span><strong>라운드:</strong> {ctx.currentRound}/{ctx.maxRounds}</span>
            <span><strong>상태:</strong> <StatusBadge status={ctx.status} /></span>
          </div>

          {ctx.history.length > 0 && (
            <QualityScoreChart
              rounds={ctx.history}
              threshold={ctx.convergence.minQualityScore}
            />
          )}

          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            {ctx.history.map((r) => (
              <div key={r.round} style={{
                background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, padding: "8px 12px",
                borderLeft: `3px solid ${STATUS_COLORS[r.status] ?? "#6b7280"}`,
              }}>
                <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#6b7280" }}>
                  <span><strong>Round {r.round}</strong></span>
                  <span>{r.agentName}</span>
                  <span style={{ color: STATUS_COLORS[r.status] }}>{r.status.toUpperCase()}</span>
                  <span>{r.qualityScore !== null ? `${(r.qualityScore * 100).toFixed(0)}%` : "-"}</span>
                  <span>{r.durationMs}ms</span>
                </div>
                {r.feedback.length > 0 && (
                  <div style={{ marginTop: 4, fontSize: 12, color: "#374151" }}>
                    {r.feedback.map((f, i) => <div key={i}>• {f}</div>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    active: { bg: "#dbeafe", text: "#1d4ed8" },
    resolved: { bg: "#dcfce7", text: "#15803d" },
    exhausted: { bg: "#fef3c7", text: "#92400e" },
    escalated: { bg: "#fee2e2", text: "#991b1b" },
  };
  const c = colors[status] ?? { bg: "#f3f4f6", text: "#374151" };
  return (
    <span style={{ background: c.bg, color: c.text, padding: "1px 8px", borderRadius: 4, fontSize: 12 }}>
      {status}
    </span>
  );
}

function QualityScoreChart({ rounds, threshold }: { rounds: LoopRound[]; threshold: number }) {
  const w = 400, h = 200;
  const ml = 40, mr = 20, mt = 20, mb = 30;
  const pw = w - ml - mr;
  const ph = h - mt - mb;

  const maxRound = rounds.length;
  const xScale = (r: number) => ml + ((r - 1) / Math.max(maxRound - 1, 1)) * pw;
  const yScale = (score: number) => mt + (1 - score) * ph;

  const scored = rounds.filter((r) => r.qualityScore !== null);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: 400, height: "auto" }}>
      {/* Y axis labels */}
      {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map((v) => (
        <g key={v}>
          <line x1={ml} y1={yScale(v)} x2={w - mr} y2={yScale(v)} stroke="#e5e7eb" strokeWidth={0.5} />
          <text x={ml - 6} y={yScale(v) + 4} textAnchor="end" fontSize={10} fill="#9ca3af">
            {v.toFixed(1)}
          </text>
        </g>
      ))}

      {/* X axis labels */}
      {rounds.map((r) => (
        <text key={r.round} x={xScale(r.round)} y={h - 8} textAnchor="middle" fontSize={10} fill="#9ca3af">
          R{r.round}
        </text>
      ))}

      {/* Threshold line */}
      <line
        x1={ml} y1={yScale(threshold)} x2={w - mr} y2={yScale(threshold)}
        stroke="#f59e0b" strokeWidth={1} strokeDasharray="4,4"
      />
      <text x={w - mr + 2} y={yScale(threshold) + 4} fontSize={9} fill="#f59e0b">
        {threshold}
      </text>

      {/* Line */}
      {scored.length > 1 && (
        <polyline
          fill="none"
          stroke="#6366f1"
          strokeWidth={2}
          points={scored.map((r) => `${xScale(r.round)},${yScale(r.qualityScore!)}`).join(" ")}
        />
      )}

      {/* Points */}
      {scored.map((r) => (
        <circle
          key={r.round}
          cx={xScale(r.round)}
          cy={yScale(r.qualityScore!)}
          r={4}
          fill={STATUS_COLORS[r.status] ?? "#6b7280"}
          stroke="#fff"
          strokeWidth={1.5}
        />
      ))}
    </svg>
  );
}
