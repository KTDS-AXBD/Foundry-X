"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getMergeQueue,
  processQueueNext,
  updateQueuePriority,
  type MergeQueueEntry,
  type ConflictReport,
  BASE_URL,
} from "@/lib/api-client";
import { SSEClient } from "@/lib/sse-client";

export function MergeQueuePanel() {
  const [entries, setEntries] = useState<MergeQueueEntry[]>([]);
  const [conflicts, setConflicts] = useState<ConflictReport | null>(null);
  const [loading, setLoading] = useState(false);
  const sseRef = useRef<SSEClient | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getMergeQueue();
      setEntries(result.entries);
      setConflicts(result.conflicts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load queue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();

    // SSE 실시간 업데이트 (F68 Gap G6 fix)
    const client = new SSEClient({
      url: `${BASE_URL}/agents/stream`,
      onStatus: (data) => {
        const raw = data as Record<string, unknown>;

        // agent.queue.updated — queue 배열 필드로 식별
        if (raw.queue && Array.isArray(raw.queue)) {
          loadQueue(); // 전체 새로고침으로 일관성 보장
        }

        // agent.queue.conflict — conflicts 객체 필드로 식별
        if (raw.conflicts && typeof raw.conflicts === "object") {
          setConflicts(raw.conflicts as ConflictReport);
        }

        // agent.queue.merged — entryId + commitSha 필드로 식별
        if (raw.entryId && raw.commitSha) {
          loadQueue();
        }

        // agent.queue.rebase — success 필드로 식별
        if (raw.prNumber && typeof raw.success === "boolean") {
          loadQueue();
        }
      },
    });
    client.connect();
    sseRef.current = client;

    return () => {
      client.disconnect();
      sseRef.current = null;
    };
  }, [loadQueue]);

  const handleProcessNext = async () => {
    try {
      setProcessing(true);
      setError(null);
      await processQueueNext();
      await loadQueue();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Process failed");
    } finally {
      setProcessing(false);
    }
  };

  const handlePriorityChange = async (entryId: string, priority: number) => {
    try {
      await updateQueuePriority(entryId, priority);
      await loadQueue();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Priority update failed");
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      queued: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
      merging: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
      merged: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
      conflict: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
      failed: "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300",
    };
    return (
      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${styles[status] ?? styles.failed}`}>
        {status}
      </span>
    );
  };

  const getConflictFiles = (entryId: string): string[] => {
    if (!conflicts) return [];
    return conflicts.conflicting
      .filter((c) => c.entryA === entryId || c.entryB === entryId)
      .flatMap((c) => c.files);
  };

  const activeEntries = entries.filter((e) => e.status === "queued" || e.status === "merging");
  const completedEntries = entries.filter((e) => e.status === "merged");

  if (loading) {
    return <div className="p-4 text-muted-foreground">Loading merge queue...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Merge Queue</h3>
        <div className="flex gap-2">
          <button
            onClick={loadQueue}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Refresh
          </button>
          <button
            onClick={handleProcessNext}
            disabled={processing || activeEntries.length === 0}
            className="text-xs px-2 py-1 rounded border bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {processing ? "Processing..." : "Process Next"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">{error}</div>
      )}

      {activeEntries.length === 0 ? (
        <div className="text-sm text-muted-foreground">No PRs in queue</div>
      ) : (
        <div className="space-y-2">
          {activeEntries.map((entry) => {
            const conflictFiles = getConflictFiles(entry.id);
            return (
              <div key={entry.id} className="rounded-md border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">#{entry.position}</span>
                    <span className="font-medium">PR #{entry.prNumber}</span>
                    <span className="text-muted-foreground text-xs">{entry.agentId}</span>
                    {getStatusBadge(entry.status)}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">P</span>
                    <select
                      value={entry.priority}
                      onChange={(e) => handlePriorityChange(entry.id, Number(e.target.value))}
                      className="text-xs border rounded px-1 py-0.5 bg-background"
                    >
                      {[0, 1, 2, 3, 4, 5].map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Files: {entry.modifiedFiles.join(", ")}
                </div>
                {conflictFiles.length > 0 && (
                  <div className="mt-1 text-xs text-destructive">
                    Conflict: {conflictFiles.join(", ")}
                  </div>
                )}
                {entry.rebaseAttempted && (
                  <div className="mt-1 text-xs">
                    Rebase: {entry.rebaseSucceeded ? "✅" : "❌"}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {completedEntries.length > 0 && (
        <div className="border-t pt-3">
          <span className="text-xs text-muted-foreground font-medium">Completed</span>
          <div className="space-y-1 mt-1">
            {completedEntries.slice(0, 5).map((entry) => (
              <div key={entry.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>✅</span>
                <span>PR #{entry.prNumber}</span>
                <span>{entry.agentId}</span>
                {entry.mergedAt && <span>merged {new Date(entry.mergedAt).toLocaleTimeString()}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
