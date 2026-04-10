"use client";

import { useEffect, useState, useCallback } from "react";
import { getFeedbackQueue, updateFeedbackQueueItem } from "@/lib/api-client";
import type { FeedbackQueueItem, FeedbackQueueList } from "@/lib/api-client";

const STATUS_TABS = [
  { key: "all", label: "전체", icon: "📋" },
  { key: "pending", label: "대기", icon: "⏳" },
  { key: "processing", label: "처리중", icon: "🔄" },
  { key: "done", label: "완료", icon: "✅" },
  { key: "failed", label: "실패", icon: "❌" },
] as const;

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  done: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  skipped: "bg-gray-100 text-gray-600",
};

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

function parseLabels(raw: string): string[] {
  try { return JSON.parse(raw); } catch { return []; }
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

function FeedbackCard({
  item,
  isOpen,
  onToggle,
  onAction,
}: {
  item: FeedbackQueueItem;
  isOpen: boolean;
  onToggle: () => void;
  onAction: (id: string, status: "pending" | "skipped") => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        type="button"
        className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50"
        onClick={onToggle}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground">#{item.github_issue_number}</span>
            <span className="truncate text-sm font-medium">{item.title}</span>
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span>{relativeTime(item.created_at)}</span>
            {item.agent_pr_url && (
              <a
                href={item.agent_pr_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                PR 보기
              </a>
            )}
          </div>
        </div>
        <StatusBadge status={item.status} />
      </button>

      {isOpen && (
        <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
          {item.body && (
            <div className="text-sm text-muted-foreground whitespace-pre-wrap">{item.body}</div>
          )}

          {item.labels && (
            <div className="flex flex-wrap gap-1">
              {parseLabels(item.labels).map((label) => (
                <span key={label} className="rounded bg-muted px-1.5 py-0.5 text-xs">
                  {label}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <a
              href={item.github_issue_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              GitHub Issue #{item.github_issue_number}
            </a>
            {item.retry_count > 0 && <span>· 재시도 {item.retry_count}회</span>}
          </div>

          {item.error_message && (
            <div className="rounded-md bg-red-50 p-2 text-xs text-red-700">
              {item.error_message}
            </div>
          )}

          {item.agent_log && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Agent 로그 보기
              </summary>
              <pre className="mt-1 max-h-40 overflow-auto rounded bg-muted p-2 text-[10px]">
                {item.agent_log}
              </pre>
            </details>
          )}

          <div className="flex gap-2 pt-1">
            {(item.status === "failed" || item.status === "skipped") && (
              <button
                type="button"
                className="rounded bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                onClick={() => onAction(item.id, "pending")}
              >
                재처리
              </button>
            )}
            {(item.status === "pending" || item.status === "failed") && (
              <button
                type="button"
                className="rounded border border-border px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted"
                onClick={() => onAction(item.id, "skipped")}
              >
                스킵
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function Component() {
  const [data, setData] = useState<FeedbackQueueList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const fetchData = useCallback(async (status?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = status && status !== "all" ? { status, limit: 50 } : { limit: 50 };
      const result = await getFeedbackQueue(params);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "피드백 목록을 불러올 수 없어요");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(activeFilter);
  }, [activeFilter, fetchData]);

  const handleAction = async (id: string, status: "pending" | "skipped") => {
    try {
      await updateFeedbackQueueItem(id, { status });
      await fetchData(activeFilter);
    } catch {
      // best-effort — 목록 리프레시로 최신 상태 반영
      await fetchData(activeFilter);
    }
  };

  if (loading && !data) {
    return (
      <div className="mx-auto max-w-3xl py-12 text-center text-sm text-muted-foreground">
        불러오는 중...
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="mx-auto max-w-3xl py-12 text-center text-sm text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">피드백 관리</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Marker.io 피드백 큐 현황을 확인하고 관리하세요
        </p>
      </div>

      {/* 상태 필터 탭 */}
      <div className="flex gap-1 rounded-lg border border-border p-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              activeFilter === tab.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
            onClick={() => { setActiveFilter(tab.key); setOpenId(null); }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 총 건수 */}
      {data && (
        <p className="text-xs text-muted-foreground">
          {data.total}건
          {loading && " · 갱신 중..."}
        </p>
      )}

      {/* 카드 목록 */}
      {data && data.items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          피드백이 없어요
        </div>
      ) : (
        <div className="space-y-2">
          {data?.items.map((item) => (
            <FeedbackCard
              key={item.id}
              item={item}
              isOpen={openId === item.id}
              onToggle={() => setOpenId(openId === item.id ? null : item.id)}
              onAction={handleAction}
            />
          ))}
        </div>
      )}
    </div>
  );
}
