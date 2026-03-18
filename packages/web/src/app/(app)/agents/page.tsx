"use client";

import { useEffect, useState } from "react";
import { fetchApi, type AgentExecutionResult } from "@/lib/api-client";
import type { AgentProfile, AgentActivity } from "@foundry-x/shared";
import AgentCard from "@/components/feature/AgentCard";
import { AgentExecuteModal } from "@/components/feature/AgentExecuteModal";
import { AgentTaskResult } from "@/components/feature/AgentTaskResult";
import { SSEClient } from "@/lib/sse-client";

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentProfile[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [executeAgent, setExecuteAgent] = useState<AgentProfile | null>(null);
  const [taskResult, setTaskResult] = useState<AgentExecutionResult | null>(null);

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
            a.id === payload.agentId ? { ...a, activity: payload.activity } : a,
          );
        });
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
      <h1 className="mb-6 text-2xl font-bold">Agent Transparency</h1>

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
              <AgentCard agent={a} />
              <button
                className="w-full rounded border border-primary/30 px-3 py-1.5 text-sm text-primary hover:bg-primary/10"
                onClick={() => setExecuteAgent(a)}
              >
                작업 실행
              </button>
            </div>
          ))}
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
