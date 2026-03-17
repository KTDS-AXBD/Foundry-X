import type { D1Database } from "@cloudflare/workers-types";

export type SSEEvent =
  | { event: "activity"; data: { agentId: string; status: string; currentTask?: string; progress?: number; timestamp: string } }
  | { event: "status"; data: { agentId: string; previousStatus: string; newStatus: string; result?: string; timestamp: string } }
  | { event: "error"; data: { agentId: string; error: string; message: string; timestamp: string } };

export class SSEManager {
  private encoder = new TextEncoder();
  private pollInterval = 10_000;

  constructor(private db: D1Database) {}

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
            // Stream closed/errored — stop polling
            closed = true;
            if (timerId) clearInterval(timerId);
            return false;
          }
        };

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
