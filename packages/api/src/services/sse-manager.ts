import type { D1Database } from "@cloudflare/workers-types";

// ─── Sprint 11: SSE Task Event Data Types (F55) ───
export interface TaskStartedData {
  taskId: string;
  agentId: string;
  taskType: string;
  runnerType: string;
  startedAt: string;
}

export interface TaskCompletedData {
  taskId: string;
  agentId: string;
  status: "success" | "partial" | "failed";
  tokensUsed: number;
  durationMs: number;
  resultSummary?: string;
  completedAt: string;
}

export type SSEEvent =
  | { event: "activity"; data: { agentId: string; status: string; currentTask?: string; progress?: number; timestamp: string } }
  | { event: "status"; data: { agentId: string; previousStatus: string; newStatus: string; result?: string; timestamp: string } }
  | { event: "error"; data: { agentId: string; error: string; message: string; timestamp: string } }
  | { event: "agent.task.started"; data: TaskStartedData }
  | { event: "agent.task.completed"; data: TaskCompletedData };

const DEDUP_TTL_MS = 60_000;

export class SSEManager {
  private encoder = new TextEncoder();
  private pollInterval = 10_000;

  subscribers = new Set<(payload: string) => boolean>();
  private recentTaskIds = new Map<string, number>();
  private dedupTimer?: ReturnType<typeof setInterval>;

  constructor(private db: D1Database) {
    this.dedupTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, ts] of this.recentTaskIds) {
        if (now - ts > DEDUP_TTL_MS) this.recentTaskIds.delete(key);
      }
    }, DEDUP_TTL_MS);
  }

  pushEvent(event: SSEEvent): void {
    // Dedup by taskId + event type for task events
    const data = event.data as Record<string, unknown>;
    if ("taskId" in data) {
      const dedupKey = `${data.taskId}:${event.event}`;
      if (this.recentTaskIds.has(dedupKey)) return;
      this.recentTaskIds.set(dedupKey, Date.now());
    }

    // agent.task.* events → wrap as "status" so SSEClient's onStatus handler receives them
    // SSEClient uses EventSource.addEventListener("status", ...) which requires exact name match
    const eventName = event.event.startsWith("agent.task.") ? "status" : event.event;
    const payload = `event: ${eventName}\ndata: ${JSON.stringify(event.data)}\n\n`;

    for (const send of this.subscribers) {
      if (!send(payload)) {
        this.subscribers.delete(send);
      }
    }
  }

  dispose(): void {
    if (this.dedupTimer) clearInterval(this.dedupTimer);
    this.subscribers.clear();
    this.recentTaskIds.clear();
  }

  createStream(): ReadableStream {
    let timerId: ReturnType<typeof setInterval> | undefined;
    let lastCheckedAt = new Date(0).toISOString();

    return new ReadableStream({
      start: (controller) => {
        let closed = false;

        const safeEnqueue = (data: Uint8Array): boolean => {
          try {
            controller.enqueue(data);
            return true;
          } catch {
            closed = true;
            if (timerId) clearInterval(timerId);
            return false;
          }
        };

        // Register subscriber for push-based events
        const send = (payload: string): boolean => {
          if (closed) return false;
          return safeEnqueue(this.encoder.encode(payload));
        };
        this.subscribers.add(send);

        const poll = async () => {
          if (closed) return;

          try {
            const sessions = await this.db
              .prepare(
                `SELECT id, agent_name, status, branch, started_at, ended_at
                 FROM agent_sessions
                 WHERE started_at > ? OR ended_at > ?
                 ORDER BY started_at DESC
                 LIMIT 10`,
              )
              .bind(lastCheckedAt, lastCheckedAt)
              .all();

            lastCheckedAt = new Date().toISOString();

            for (const session of sessions.results ?? []) {
              const event = this.sessionToSSEEvent(session);
              const payload = `event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`;
              if (!safeEnqueue(this.encoder.encode(payload))) return;
            }

            if (!sessions.results?.length) {
              safeEnqueue(
                this.encoder.encode(`: heartbeat ${new Date().toISOString()}\n\n`),
              );
            }
          } catch (err) {
            const errorPayload = {
              agentId: "system",
              error: "poll_failed",
              message: err instanceof Error ? err.message : "Unknown error",
              timestamp: new Date().toISOString(),
            };
            safeEnqueue(
              this.encoder.encode(`event: error\ndata: ${JSON.stringify(errorPayload)}\n\n`),
            );
          }
        };

        poll();
        timerId = setInterval(poll, this.pollInterval);
      },
      cancel: () => {
        if (timerId) clearInterval(timerId);
      },
    });
  }

  private sessionToSSEEvent(session: Record<string, unknown>): SSEEvent {
    const status = session.status as string;
    const isActive = status === "active";

    if (isActive) {
      return {
        event: "activity",
        data: {
          agentId: session.agent_name as string,
          status: "active",
          currentTask: session.branch as string | undefined,
          progress: 50,
          timestamp: new Date().toISOString(),
        },
      };
    }

    return {
      event: "status",
      data: {
        agentId: session.agent_name as string,
        previousStatus: "active",
        newStatus: status,
        result: status === "completed" ? "Task finished" : undefined,
        timestamp: new Date().toISOString(),
      },
    };
  }
}
