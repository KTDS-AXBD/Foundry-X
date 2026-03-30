"use client";

import { useState, useEffect, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchApi } from "@/lib/api-client";
import { GitCommitHorizontal } from "lucide-react";

export interface MvpStatusHistoryEntry {
  id: string;
  fromStatus?: string;
  toStatus: string;
  changedAt: string;
  changedBy: string;
  reason?: string;
}

const STATUS_LABELS: Record<string, string> = {
  in_dev: "개발중",
  testing: "테스트",
  released: "출시",
};

const STATUS_COLORS: Record<string, string> = {
  in_dev: "bg-blue-500",
  testing: "bg-yellow-500",
  released: "bg-green-500",
};

interface MvpStatusTimelineProps {
  mvpId?: string;
  history?: MvpStatusHistoryEntry[];
}

export function MvpStatusTimeline({ mvpId, history: propHistory }: MvpStatusTimelineProps) {
  const [history, setHistory] = useState<MvpStatusHistoryEntry[]>(propHistory ?? []);
  const [loading, setLoading] = useState(!propHistory && !!mvpId);

  const loadData = useCallback(async () => {
    if (!mvpId) return;
    setLoading(true);
    try {
      const data = await fetchApi<MvpStatusHistoryEntry[]>(
        `/mvp-tracking/${mvpId}/history`,
      );
      setHistory(data);
    } finally {
      setLoading(false);
    }
  }, [mvpId]);

  useEffect(() => {
    if (!propHistory && mvpId) {
      void loadData();
    }
  }, [loadData, mvpId, propHistory]);

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-6 w-6 rounded-full" />
            <div className="space-y-1 flex-1">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground py-8">
        상태 변경 이력이 없어요.
      </div>
    );
  }

  const latestStatus = history[history.length - 1]?.toStatus;

  return (
    <div className="p-4">
      <h3 className="text-sm font-medium mb-4">상태 변경 이력</h3>
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-3 top-0 bottom-0 w-px bg-border" />

        <div className="space-y-6">
          {history.map((entry, idx) => {
            const isCurrent = idx === history.length - 1;
            const dotColor = STATUS_COLORS[entry.toStatus] ?? "bg-gray-400";

            return (
              <div key={entry.id} className="relative flex gap-4 pl-8">
                {/* Dot */}
                <div
                  className={`absolute left-0 top-1 h-6 w-6 rounded-full flex items-center justify-center ${
                    isCurrent ? dotColor : "bg-muted"
                  }`}
                >
                  <GitCommitHorizontal
                    className={`h-3 w-3 ${isCurrent ? "text-white" : "text-muted-foreground"}`}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    {entry.fromStatus && (
                      <>
                        <span className="text-xs text-muted-foreground">
                          {STATUS_LABELS[entry.fromStatus] ?? entry.fromStatus}
                        </span>
                        <span className="text-xs text-muted-foreground">→</span>
                      </>
                    )}
                    <span
                      className={`text-xs font-medium ${
                        isCurrent ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {STATUS_LABELS[entry.toStatus] ?? entry.toStatus}
                    </span>
                    {isCurrent && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                        현재
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground space-x-2">
                    <span>{new Date(entry.changedAt).toLocaleString("ko-KR")}</span>
                    <span>·</span>
                    <span>{entry.changedBy}</span>
                  </div>
                  {entry.reason && (
                    <p className="text-xs text-muted-foreground italic">{entry.reason}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
