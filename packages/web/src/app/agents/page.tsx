"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "../../lib/api-client";
import type { AgentProfile, AgentActivity } from "@foundry-x/shared";
import AgentCard from "../../components/feature/AgentCard";

const colors = {
  text: "#ededed",
  muted: "#888",
  red: "#ef4444",
};

/* ─── Agents Page ─── */
export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentProfile[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Initial load via REST
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

    // Gap 5: SSE EventSource — real-time activity updates
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
    <div style={{ color: colors.text }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>
        Agent Transparency
      </h1>

      {loading && <p style={{ color: colors.muted }}>Loading agents...</p>}
      {error && <p style={{ color: colors.red, fontSize: 13 }}>{error}</p>}

      {agents && agents.length === 0 && (
        <p style={{ color: colors.muted }}>No agents registered.</p>
      )}

      {agents && agents.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
            gap: 16,
          }}
        >
          {agents.map((a) => (
            <AgentCard key={a.id} agent={a} />
          ))}
        </div>
      )}
    </div>
  );
}
