/**
 * F315: PipelineMonitorDashboard — 파이프라인 전체 현황 대시보드
 */
import { useState, useEffect, useCallback } from "react";
import { fetchApi } from "@/lib/api-client";
import { PipelineStatusBadge } from "./PipelineStatusBadge";

interface DashboardData {
  summary: Record<string, number>;
  pendingCheckpoints: number;
  runs: Array<{
    id: string;
    status: string;
    currentStep: string | null;
    bizItemId: string | null;
    bizItemTitle: string | null;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    discoveryStartAt: string | null;
    discoveryEndAt: string | null;
  }>;
  total: number;
}

interface Props {
  onRunClick?: (runId: string) => void;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  idle: { label: "대기", color: "bg-gray-100 text-gray-600" },
  discovery_running: { label: "발굴 중", color: "bg-blue-100 text-blue-600" },
  discovery_complete: { label: "발굴 완료", color: "bg-green-100 text-green-600" },
  shaping_queued: { label: "형상화 대기", color: "bg-yellow-100 text-yellow-600" },
  shaping_running: { label: "형상화 중", color: "bg-purple-100 text-purple-600" },
  shaping_complete: { label: "완료", color: "bg-green-100 text-green-700" },
  paused: { label: "일시정지", color: "bg-orange-100 text-orange-600" },
  failed: { label: "실패", color: "bg-red-100 text-red-600" },
  aborted: { label: "중단", color: "bg-gray-100 text-gray-500" },
};

function formatDuration(start: string | null, end: string | null): string {
  if (!start) return "-";
  const startTime = new Date(start).getTime();
  const endTime = end ? new Date(end).getTime() : Date.now();
  const diffMs = endTime - startTime;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  return `${hours}시간 ${minutes % 60}분`;
}

export function PipelineMonitorDashboard({ onRunClick }: Props) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    const result = await fetchApi<DashboardData>(
      `/discovery-pipeline/dashboard?${params.toString()}`,
    );
    setData(result);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !data) {
    return <div className="p-4 text-sm text-muted-foreground">로딩 중...</div>;
  }

  if (!data) return null;

  const statusKeys = Object.keys(STATUS_LABELS);

  return (
    <div className="space-y-4">
      {/* 상단: 상태별 카드 */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {statusKeys.map((key) => {
          const info = STATUS_LABELS[key];
          const count = data.summary[key] ?? 0;
          const isActive = statusFilter === key;

          return (
            <button
              key={key}
              onClick={() => setStatusFilter(isActive ? "" : key)}
              className={`p-3 rounded-lg text-center transition-all ${info.color} ${
                isActive ? "ring-2 ring-offset-1 ring-blue-500" : ""
              } hover:opacity-80`}
            >
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-xs">{info.label}</p>
            </button>
          );
        })}
      </div>

      {/* 대기 중 체크포인트 알림 배너 */}
      {data.pendingCheckpoints > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-2">
          <span className="text-yellow-600 text-lg">⚠️</span>
          <p className="text-sm text-yellow-800">
            <span className="font-semibold">{data.pendingCheckpoints}건</span>의 체크포인트가 승인을 기다리고 있어요.
          </p>
        </div>
      )}

      {/* 하단: 실행 ��록 */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-2 font-medium">아이템</th>
              <th className="text-left p-2 font-medium">상태</th>
              <th className="text-left p-2 font-medium">현재 단계</th>
              <th className="text-left p-2 font-medium">시작일</th>
              <th className="text-left p-2 font-medium">소요시간</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.runs.map((run) => (
              <tr
                key={run.id}
                className="hover:bg-muted/30 cursor-pointer"
                onClick={() => onRunClick?.(run.id)}
              >
                <td className="p-2">
                  <span className="font-medium">{run.bizItemTitle ?? "Unknown"}</span>
                </td>
                <td className="p-2">
                  <PipelineStatusBadge status={run.status} />
                </td>
                <td className="p-2 text-muted-foreground">{run.currentStep ?? "-"}</td>
                <td className="p-2 text-muted-foreground">
                  {run.createdAt ? new Date(run.createdAt).toLocaleDateString("ko-KR") : "-"}
                </td>
                <td className="p-2 text-muted-foreground">
                  {formatDuration(run.discoveryStartAt ?? run.createdAt, run.discoveryEndAt)}
                </td>
              </tr>
            ))}
            {data.runs.length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-center text-muted-foreground">
                  파이프라인 실행 이력이 없어요
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
