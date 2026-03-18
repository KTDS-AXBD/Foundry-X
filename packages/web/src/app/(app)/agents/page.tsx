"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchApi, getAgentPr, type AgentExecutionResult } from "@/lib/api-client";
import type { AgentProfile, AgentActivity, AgentPr } from "@foundry-x/shared";
import AgentCard from "@/components/feature/AgentCard";
import { AgentExecuteModal } from "@/components/feature/AgentExecuteModal";
import { AgentTaskResult } from "@/components/feature/AgentTaskResult";
import { AgentPrCard } from "@/components/feature/AgentPrCard";
import { SSEClient } from "@/lib/sse-client";

// F55: 에이전트별 task 상태 추적
type AgentTaskStatus = "pending" | "running" | "completed" | "failed";

interface AgentTaskState {
  taskId: string;
  status: AgentTaskStatus;
  taskType?: string;
  startedAt?: string;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentProfile[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [executeAgent, setExecuteAgent] = useState<AgentProfile | null>(null);
  const [taskResult, setTaskResult] = useState<AgentExecutionResult | null>(null);
  const [taskStates, setTaskStates] = useState<Map<string, AgentTaskState>>(
    new Map(),
  );
  const [sseConnected, setSseConnected] = useState(false);
  const [agentPrs, setAgentPrs] = useState<AgentPr[]>([]);

  useEffect(() => {
    let cancelled = false;

    fetchApi<AgentProfile[]>("/agents")
      .then((data) => {
        if (!cancelled) {
          setAgents(data);
          setLoading(false);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    const client = new SSEClient({
      url: "/api/agents/stream",
      onActivity: (data) => {
        if (cancelled) return;
        const payload = data as { agentId: string; activity: AgentActivity };
        setAgents((prev) => {
          if (!prev) return prev;
          return prev.map((a) =>
            a.id === payload.agentId
              ? { ...a, activity: payload.activity }
              : a,
          );
        });
      },
      onStatus: (data) => {
        if (cancelled) return;
        const raw = data as Record<string, unknown>;

        // agent.task.started — runnerType 필드로 식별
        if (raw.taskId && raw.runnerType) {
          const agentId = raw.agentId as string;
          setTaskStates((prev) => {
            const next = new Map(prev);
            next.set(agentId, {
              taskId: raw.taskId as string,
              status: "running",
              taskType: raw.taskType as string,
              startedAt: raw.startedAt as string,
            });
            return next;
          });
        }

        // agent.pr.created — prNumber + branch 필드로 식별
        if (raw.prNumber && raw.branch && !raw.decision && !raw.mergedAt && !raw.reason) {
          const prData: Partial<AgentPr> = {
            prNumber: raw.prNumber as number,
            branch: raw.branch as string,
            agentId: raw.agentId as string,
            status: 'open',
          };
          setAgentPrs((prev) => [...prev, prData as AgentPr]);
        }

        // agent.pr.reviewed — decision 필드로 식별
        if (raw.prNumber && raw.decision) {
          setAgentPrs((prev) =>
            prev.map((pr) =>
              pr.prNumber === raw.prNumber
                ? { ...pr, status: raw.decision === 'approve' ? 'approved' as const : 'needs_human' as const, reviewDecision: raw.decision as string, sddScore: raw.sddScore as number }
                : pr
            )
          );
        }

        // agent.pr.merged — mergedAt 필드로 식별
        if (raw.prNumber && raw.mergedAt) {
          setAgentPrs((prev) =>
            prev.map((pr) =>
              pr.prNumber === raw.prNumber
                ? { ...pr, status: 'merged' as const, mergedAt: raw.mergedAt as string, commitSha: raw.commitSha as string }
                : pr
            )
          );
        }

        // agent.task.completed — completedAt 필드로 식별
        if (raw.taskId && raw.completedAt) {
          const agentId = raw.agentId as string;
          const taskId = raw.taskId as string;
          const status = raw.status as string;
          setTaskStates((prev) => {
            const next = new Map(prev);
            next.set(agentId, {
              taskId,
              status: status === "failed" ? "failed" : "completed",
            });
            return next;
          });
          // 완료 시 자동으로 결과 조회
          fetchApi<AgentExecutionResult>(`/agents/tasks/${taskId}/result`)
            .then((res) => {
              if (!cancelled) setTaskResult(res);
            })
            .catch(() => {
              /* 조회 실패 무시 */
            });
        }
      },
      onError: () => {
        if (!cancelled) setSseConnected(false);
      },
      onConnectionChange: (connected) => {
        if (!cancelled) setSseConnected(connected);
      },
    });
    client.connect();

    return () => {
      cancelled = true;
      client.disconnect();
    };
  }, []);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Agent Transparency</h1>
        <span
          className={`h-2 w-2 rounded-full ${sseConnected ? "bg-green-500" : "bg-red-500"}`}
          title={sseConnected ? "SSE Connected" : "SSE Disconnected"}
        />
      </div>

      {loading && (
        <p className="text-muted-foreground">Loading agents...</p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {agents && agents.length === 0 && (
        <p className="text-muted-foreground">No agents registered.</p>
      )}

      {agents && agents.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {agents.map((a) => (
            <div key={a.id} className="space-y-2">
              <AgentCard
                agent={a}
                taskStatus={taskStates.get(a.id)?.status}
              />
              <button
                className="w-full rounded border border-primary/30 px-3 py-1.5 text-sm text-primary hover:bg-primary/10 disabled:opacity-50"
                onClick={() => setExecuteAgent(a)}
                disabled={taskStates.get(a.id)?.status === "running"}
              >
                {taskStates.get(a.id)?.status === "running"
                  ? "실행 중..."
                  : "작업 실행"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Agent PRs section */}
      {agentPrs.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 text-lg font-semibold">Agent PRs</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {agentPrs.map((pr, i) => (
              <AgentPrCard
                key={pr.id ?? `pr-${i}`}
                pr={pr}
              />
            ))}
          </div>
        </div>
      )}

      {taskResult && (
        <div className="mt-6">
          <AgentTaskResult result={taskResult} />
        </div>
      )}

      {executeAgent && (
        <AgentExecuteModal
          agentId={executeAgent.id}
          agentName={executeAgent.name}
          onClose={() => setExecuteAgent(null)}
          onResult={(result) => {
            setTaskResult(result);
            setExecuteAgent(null);
          }}
        />
      )}
    </div>
  );
}
