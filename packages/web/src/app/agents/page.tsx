"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "../../lib/api-client";
import type { AgentProfile, AgentActivity } from "@foundry-x/shared";
import AgentCard from "../../components/feature/AgentCard";

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentProfile[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

    const es = new EventSource("/api/agents/stream");
    es.addEventListener("activity", (e: MessageEvent) => {
      if (cancelled) return;
      try {
        const payload = JSON.parse(e.data as string) as {
          agentId: string;
          activity: AgentActivity;
        };
        setAgents((prev) => {
          if (!prev) return prev;
          return prev.map((a) =>
            a.id === payload.agentId ? { ...a, activity: payload.activity } : a,
          );
        });
      } catch {
        // ignore malformed events
      }
    });

    return () => {
      cancelled = true;
      es.close();
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
            <AgentCard key={a.id} agent={a} />
          ))}
        </div>
      )}
    </div>
  );
}
