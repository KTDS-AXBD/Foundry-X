"use client";

import { useState, useEffect, useCallback } from "react";

const API_URL = import.meta.env.VITE_API_URL ?? "";

interface AgentSchedule {
  id: string;
  sources: string[];
  keywords: string[];
  intervalHours: number;
  enabled: boolean;
  createdAt: string;
}

interface AgentRun {
  id: string;
  source: string;
  status: string;
  itemsFound: number;
  error: string | null;
  startedAt: string;
  completedAt: string | null;
}

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    running: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    pending: "bg-gray-100 text-gray-800",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] ?? colors.pending}`}>
      {status}
    </span>
  );
}

export function Component() {
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [schedule, setSchedule] = useState<AgentSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [runsRes, scheduleRes] = await Promise.all([
        fetch(`${API_URL}/collection/agent-runs?limit=20`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/collection/agent-schedule`, { headers: getAuthHeaders() }).catch(() => null),
      ]);

      if (runsRes.ok) {
        const data = await runsRes.json();
        setRuns(data.runs ?? []);
      }

      // schedule은 GET이 없으므로 일단 null 유지 (POST로만 생성)
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTrigger = async (source: string) => {
    setTriggering(true);
    try {
      const res = await fetch(`${API_URL}/collection/agent-trigger`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ source }),
      });
      if (res.ok) {
        // 1초 후 새로고침하여 새 run 반영
        setTimeout(() => fetchData(), 1000);
      }
    } catch {
      // ignore
    } finally {
      setTriggering(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agent 수집</h1>
          <p className="mt-1 text-sm text-gray-500">
            Discovery-X Agent가 시장/뉴스/기술 트렌드를 자동 수집해요
          </p>
        </div>
      </div>

      {/* 즉시 수집 트리거 */}
      <div className="rounded-lg border bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">즉시 수집 실행</h2>
        <div className="flex gap-2">
          {(["market", "news", "tech"] as const).map((source) => (
            <button
              key={source}
              onClick={() => handleTrigger(source)}
              disabled={triggering}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {source === "market" ? "시장" : source === "news" ? "뉴스" : "기술"} 수집
            </button>
          ))}
        </div>
      </div>

      {/* 스케줄 정보 */}
      {schedule && (
        <div className="rounded-lg border bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">자동 수집 스케줄</h2>
          <div className="text-sm text-gray-600">
            <span>소스: {schedule.sources.join(", ")}</span>
            <span className="ml-4">주기: {schedule.intervalHours}시간</span>
            <span className="ml-4">상태: {schedule.enabled ? "활성" : "비활성"}</span>
          </div>
        </div>
      )}

      {/* 수집 이력 */}
      <div className="rounded-lg border bg-white">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-700">수집 실행 이력</h2>
        </div>
        {runs.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-400">
            아직 수집 이력이 없어요
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">소스</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">상태</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">수집 건수</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">시작 시간</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">완료 시간</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {runs.map((run) => (
                <tr key={run.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm text-gray-700">{run.source}</td>
                  <td className="px-4 py-2">{statusBadge(run.status)}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{run.itemsFound}</td>
                  <td className="px-4 py-2 text-sm text-gray-500">
                    {new Date(run.startedAt).toLocaleString("ko-KR")}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500">
                    {run.completedAt ? new Date(run.completedAt).toLocaleString("ko-KR") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
