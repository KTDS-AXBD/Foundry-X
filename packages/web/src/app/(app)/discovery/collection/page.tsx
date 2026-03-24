"use client";

import { useState, useEffect, useCallback } from "react";
import ChannelOverview from "@/components/feature/ChannelOverview";
import ScreeningQueue from "@/components/feature/ScreeningQueue";
import CollectionHistory from "@/components/feature/CollectionHistory";
import AgentCollectDialog from "@/components/feature/AgentCollectDialog";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

interface CollectionStats {
  total: number;
  byChannel: Record<string, number>;
  byStatus: Record<string, number>;
  recentJobs: Array<{
    id: string;
    channel: string;
    status: string;
    itemsFound: number;
    itemsNew: number;
    startedAt: string;
  }>;
  approvalRate: number;
}

interface ScreeningItem {
  id: string;
  title: string;
  description: string | null;
  source: string;
  createdAt: string;
}

interface CollectionJob {
  id: string;
  channel: string;
  status: string;
  keywords: string[];
  itemsFound: number;
  itemsNew: number;
  itemsDuplicate: number;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
}

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

export default function CollectionPage() {
  const [stats, setStats] = useState<CollectionStats | null>(null);
  const [queue, setQueue] = useState<ScreeningItem[]>([]);
  const [jobs, setJobs] = useState<CollectionJob[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const headers = getAuthHeaders();
      const [statsRes, queueRes, jobsRes] = await Promise.all([
        fetch(`${API_URL}/collection/stats`, { headers }),
        fetch(`${API_URL}/collection/screening-queue`, { headers }),
        fetch(`${API_URL}/collection/jobs`, { headers }),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (queueRes.ok) {
        const data = await queueRes.json();
        setQueue(data.items ?? []);
      }
      if (jobsRes.ok) {
        const data = await jobsRes.json();
        setJobs(data.jobs ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "데이터 로드 실패");
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleAgentCollect = async (data: {
    keywords: string[];
    maxItems: number;
    focusArea?: string;
  }) => {
    const res = await fetch(`${API_URL}/collection/agent-collect`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message ?? "수집 실패");
    }

    await fetchAll();
  };

  const handleApprove = async (id: string) => {
    await fetch(`${API_URL}/collection/screening-queue/${id}/approve`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    await fetchAll();
  };

  const handleReject = async (id: string) => {
    await fetch(`${API_URL}/collection/screening-queue/${id}/reject`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({}),
    });
    await fetchAll();
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">수집 채널 통합</h1>
          <p className="text-sm text-muted-foreground">
            Agent 자동 수집 · Field-driven · IDEA Portal 통합 관리
          </p>
        </div>
        <button
          onClick={() => setDialogOpen(true)}
          className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
        >
          Agent 수집
        </button>
      </div>

      {error && (
        <div className="rounded bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {stats && <ChannelOverview stats={stats} />}

      <ScreeningQueue
        items={queue}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      <CollectionHistory jobs={jobs} />

      <AgentCollectDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleAgentCollect}
      />
    </div>
  );
}
