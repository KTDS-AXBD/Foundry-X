"use client";

// ─── F529: Agent Stream Dashboard — 실시간 에이전트 스트리밍 대시보드 (Sprint 282) ───

import { useState, useRef, useCallback } from "react";
import { runAgentStream } from "@/lib/agent-stream-client";
import type { AgentStreamEvent, TextDeltaPayload, ToolCallPayload, ToolResultPayload, RunCompletedPayload, RunFailedPayload } from "@foundry-x/shared";

interface StreamLogEntry {
  id: string;
  type: AgentStreamEvent["type"];
  timestamp: string;
  summary: string;
  detail?: string;
}

interface Metrics {
  rounds: number;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
  stopReason: string;
}

export function AgentStreamDashboard() {
  const [agentId, setAgentId] = useState("planner");
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<StreamLogEntry[]>([]);
  const [output, setOutput] = useState("");
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  const appendLog = useCallback((entry: Omit<StreamLogEntry, "id">) => {
    setLog((prev) => [...prev, { ...entry, id: `${Date.now()}-${Math.random()}` }]);
    setTimeout(() => logEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, []);

  const handleRun = useCallback(async () => {
    if (!input.trim() || running) return;

    setRunning(true);
    setLog([]);
    setOutput("");
    setMetrics(null);
    setError(null);

    abortRef.current = new AbortController();

    await runAgentStream(
      { agentId, input },
      {
        onEvent: (event) => {
          switch (event.type) {
            case "run_started":
              appendLog({ type: event.type, timestamp: event.timestamp, summary: `▶ 에이전트 시작: ${(event.payload as { agentId: string }).agentId}` });
              break;
            case "round_start":
              appendLog({ type: event.type, timestamp: event.timestamp, summary: `🔄 Round ${(event.payload as { round: number }).round} 시작` });
              break;
            case "text_delta":
              setOutput((event.payload as TextDeltaPayload).accumulated);
              break;
            case "tool_call": {
              const p = event.payload as ToolCallPayload;
              appendLog({ type: event.type, timestamp: event.timestamp, summary: `🔧 도구 호출: ${p.toolName}`, detail: JSON.stringify(p.input, null, 2) });
              break;
            }
            case "tool_result": {
              const p = event.payload as ToolResultPayload;
              appendLog({ type: event.type, timestamp: event.timestamp, summary: `✅ 도구 결과: ${p.toolName}`, detail: p.output });
              break;
            }
            case "round_end":
              appendLog({ type: event.type, timestamp: event.timestamp, summary: `⏹ Round ${(event.payload as { round: number }).round} 완료` });
              break;
            case "run_completed": {
              const p = event.payload as RunCompletedPayload;
              appendLog({ type: event.type, timestamp: event.timestamp, summary: `✅ 실행 완료 (metric: ${p.metricId})` });
              setMetrics({
                rounds: p.result.rounds,
                inputTokens: p.result.tokenUsage.inputTokens,
                outputTokens: p.result.tokenUsage.outputTokens,
                durationMs: 0,
                stopReason: p.result.stopReason,
              });
              break;
            }
            case "run_failed":
              setError((event.payload as RunFailedPayload).error);
              appendLog({ type: event.type, timestamp: event.timestamp, summary: `❌ 실행 실패: ${(event.payload as RunFailedPayload).error}` });
              break;
          }
        },
        onComplete: () => setRunning(false),
        onError: (err) => {
          setError(err.message);
          setRunning(false);
        },
      },
      abortRef.current.signal,
    );
  }, [agentId, input, running, appendLog]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    setRunning(false);
  }, []);

  const eventTypeColor: Record<AgentStreamEvent["type"], string> = {
    run_started: "#4ade80",
    round_start: "#60a5fa",
    text_delta: "#a78bfa",
    tool_call: "#fbbf24",
    tool_result: "#34d399",
    round_end: "#94a3b8",
    run_completed: "#4ade80",
    run_failed: "#f87171",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "900px", margin: "0 auto", padding: "1.5rem" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", margin: 0 }}>
        Agent Streaming Dashboard
        <span style={{ fontSize: "0.75rem", color: "#6b7280", marginLeft: "0.5rem" }}>F529 L1</span>
      </h1>

      {/* 입력 폼 */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <input
          value={agentId}
          onChange={(e) => setAgentId(e.target.value)}
          placeholder="Agent ID (예: planner)"
          style={{ padding: "0.5rem 0.75rem", border: "1px solid #d1d5db", borderRadius: "6px", flex: "0 0 160px" }}
        />
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="에이전트 입력..."
          rows={2}
          style={{ padding: "0.5rem 0.75rem", border: "1px solid #d1d5db", borderRadius: "6px", flex: 1, minWidth: "200px", resize: "vertical" }}
        />
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
          <button
            onClick={handleRun}
            disabled={running || !input.trim()}
            style={{
              padding: "0.5rem 1rem",
              background: running ? "#9ca3af" : "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: running ? "not-allowed" : "pointer",
              fontWeight: "500",
            }}
          >
            {running ? "실행 중..." : "실행"}
          </button>
          {running && (
            <button
              onClick={handleStop}
              style={{ padding: "0.5rem 1rem", background: "#ef4444", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}
            >
              중지
            </button>
          )}
        </div>
      </div>

      {/* 에러 표시 */}
      {error && (
        <div style={{ padding: "0.75rem", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "6px", color: "#dc2626" }}>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        {/* 이벤트 로그 */}
        <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", overflow: "hidden" }}>
          <div style={{ padding: "0.5rem 0.75rem", background: "#f9fafb", borderBottom: "1px solid #e5e7eb", fontSize: "0.875rem", fontWeight: "500" }}>
            이벤트 로그
          </div>
          <div style={{ height: "300px", overflowY: "auto", padding: "0.5rem", fontFamily: "monospace", fontSize: "0.8rem" }}>
            {log.length === 0 && <div style={{ color: "#9ca3af", textAlign: "center", paddingTop: "2rem" }}>실행 대기 중...</div>}
            {log.map((entry) => (
              <div key={entry.id} style={{ marginBottom: "4px", padding: "3px 6px", borderRadius: "4px", background: "#f8fafc" }}>
                <span style={{ color: eventTypeColor[entry.type] ?? "#6b7280", marginRight: "6px" }}>●</span>
                <span style={{ color: "#374151" }}>{entry.summary}</span>
                {entry.detail && (
                  <pre style={{ margin: "2px 0 0 16px", color: "#6b7280", fontSize: "0.72rem", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                    {entry.detail.slice(0, 200)}
                  </pre>
                )}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>

        {/* 에이전트 출력 */}
        <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", overflow: "hidden" }}>
          <div style={{ padding: "0.5rem 0.75rem", background: "#f9fafb", borderBottom: "1px solid #e5e7eb", fontSize: "0.875rem", fontWeight: "500" }}>
            에이전트 출력
          </div>
          <div style={{ height: "300px", overflowY: "auto", padding: "0.75rem", fontSize: "0.875rem", whiteSpace: "pre-wrap", lineHeight: 1.6, color: "#111827" }}>
            {output || <span style={{ color: "#9ca3af" }}>출력 대기 중...</span>}
          </div>
        </div>
      </div>

      {/* 메트릭 요약 */}
      {metrics && (
        <div style={{ display: "flex", gap: "1rem", padding: "0.75rem", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "8px", flexWrap: "wrap" }}>
          <MetricBadge label="라운드" value={metrics.rounds} />
          <MetricBadge label="입력 토큰" value={metrics.inputTokens.toLocaleString()} />
          <MetricBadge label="출력 토큰" value={metrics.outputTokens.toLocaleString()} />
          <MetricBadge label="종료 이유" value={metrics.stopReason} />
        </div>
      )}
    </div>
  );
}

function MetricBadge({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ fontSize: "0.8rem" }}>
      <span style={{ color: "#6b7280" }}>{label}: </span>
      <span style={{ fontWeight: "600", color: "#166534" }}>{value}</span>
    </div>
  );
}
