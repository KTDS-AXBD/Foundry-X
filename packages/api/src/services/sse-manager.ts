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

// ─── Sprint 13: PR Event Data Types (F65) ───
export interface PrCreatedData {
  prNumber: number;
  branch: string;
  agentId: string;
  taskId: string;
}

export interface PrReviewedData {
  prNumber: number;
  decision: "approve" | "request_changes" | "comment";
  sddScore: number;
  reviewerAgentId: string;
}

export interface PrMergedData {
  prNumber: number;
  mergedAt: string;
  commitSha: string;
}

export interface PrReviewNeededData {
  prNumber: number;
  reason: string;
  blockers: string[];
}

// ─── Sprint 14: MCP Resource Event (F67) ───
export interface McpResourceUpdatedData {
  serverId: string;
  uri: string;
  timestamp: string;
}

// ─── Sprint 14: Queue Event Data Types (F68) ───
export interface QueueUpdatedData {
  queue: Array<{
    id: string;
    prNumber: number;
    agentId: string;
    position: number;
    status: string;
  }>;
  totalPrs: number;
}

export interface QueueConflictData {
  conflicts: {
    conflicting: Array<{ entryA: string; entryB: string; files: string[] }>;
    suggestedOrder: string[];
    autoResolvable: boolean;
  };
}

export interface QueueMergedData {
  entryId: string;
  prNumber: number;
  position: number;
  commitSha: string;
}

export interface QueueRebaseData {
  prNumber: number;
  success: boolean;
  files: string[];
}

export type SSEEvent =
  | { event: "activity"; data: { agentId: string; status: string; currentTask?: string; progress?: number; timestamp: string } }
  | { event: "status"; data: { agentId: string; previousStatus: string; newStatus: string; result?: string; timestamp: string } }
  | { event: "error"; data: { agentId: string; error: string; message: string; timestamp: string } }
  | { event: "agent.task.started"; data: TaskStartedData }
  | { event: "agent.task.completed"; data: TaskCompletedData }
  | { event: "agent.pr.created"; data: PrCreatedData }
  | { event: "agent.pr.reviewed"; data: PrReviewedData }
  | { event: "agent.pr.merged"; data: PrMergedData }
  | { event: "agent.pr.review_needed"; data: PrReviewNeededData }
  | { event: "mcp.resource.updated"; data: McpResourceUpdatedData }
  | { event: "agent.queue.updated"; data: QueueUpdatedData }
  | { event: "agent.queue.conflict"; data: QueueConflictData }
  | { event: "agent.queue.merged"; data: QueueMergedData }
  | { event: "agent.queue.rebase"; data: QueueRebaseData }
  | { event: "agent.plan.created"; data: { planId: string; taskId: string; agentId: string; stepsCount: number; estimatedTokens: number; analysisMode?: "llm" | "mock" } }
  | { event: "agent.plan.approved"; data: { planId: string; approvedBy: string } }
  | { event: "agent.plan.rejected"; data: { planId: string; reason?: string } }
  | { event: "agent.message.received"; data: { messageId: string; fromAgentId: string; toAgentId: string; type: string; subject: string } }
  | { event: "agent.message.thread_reply"; data: { messageId: string; parentMessageId: string; fromAgentId: string; toAgentId: string; subject: string } }
  | { event: "agent.plan.waiting"; data: { planId: string; taskId: string; agentId: string; stepsCount: number; timeoutMs: number } }
  | { event: "agent.plan.executing"; data: { planId: string; startedAt: string } }
  | { event: "agent.plan.completed"; data: { planId: string; completedAt: string; tokensUsed: number; duration: number } }
  | { event: "agent.plan.failed"; data: { planId: string; failedAt: string; error: string } }
  | { event: "reconciliation.completed"; data: { runId: string; tenantId: string; driftCount: number; fixedCount: number; skippedCount: number; completedAt: string } }
  | { event: "agent.hook.escalated"; data: { taskId: string; hookType: string; error: string; attempts: number; escalatedAt: string } };

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

  pushEvent(event: SSEEvent, orgId?: string): void {
    // Dedup by taskId + event type for task events
    const data = event.data as Record<string, unknown>;
    if ("taskId" in data) {
      const dedupKey = `${data.taskId}:${event.event}`;
      if (this.recentTaskIds.has(dedupKey)) return;
      this.recentTaskIds.set(dedupKey, Date.now());
    }

    // agent.task.* and agent.pr.* events → wrap as "status" so SSEClient's onStatus handler receives them
    // SSEClient uses EventSource.addEventListener("status", ...) which requires exact name match
    const eventName = event.event.startsWith("agent.") ? "status" : event.event;
    const payload = `event: ${eventName}\ndata: ${JSON.stringify(event.data)}\n\n`;

    for (const send of this.subscribers) {
      if (!send(payload)) {
        this.subscribers.delete(send);
      }
    }

    // Slack bridge — forward eligible events to Slack webhook
    if (orgId && this.isSlackEligible(event.event)) {
      this.forwardToSlack(orgId, event).catch(() => {});
    }
  }

  private isSlackEligible(eventType: string): boolean {
    // F94: 카테고리 기반 — agent.task.*, agent.pr.*, agent.plan.*, agent.queue.*, agent.message.*
    if (eventType.startsWith("agent.task."))    return true;
    if (eventType.startsWith("agent.pr."))      return true;
    if (eventType.startsWith("agent.plan."))    return true;
    if (eventType.startsWith("agent.queue."))   return true;
    if (eventType.startsWith("agent.message.")) return true;
    return false;
  }

  private async forwardToSlack(orgId: string, event: SSEEvent): Promise<void> {
    const { eventToCategory, SlackService } = await import("../modules/portal/services/slack.js");
    const category = eventToCategory(event.event);
    if (!category) return;

    // 1) 카테고리별 설정 조회
    const config = await this.db.prepare(
      "SELECT webhook_url, enabled FROM slack_notification_configs WHERE org_id = ? AND category = ?"
    ).bind(orgId, category).first<{ webhook_url: string; enabled: number }>();

    let webhookUrl: string | null = null;

    if (config) {
      if (!config.enabled) return;           // 명시적 비활성화
      webhookUrl = config.webhook_url;
    } else {
      // 2) fallback: org.settings.slack_webhook_url
      const org = await this.db.prepare(
        "SELECT settings FROM organizations WHERE id = ?"
      ).bind(orgId).first<{ settings: string }>();
      if (!org) return;
      const settings = JSON.parse(org.settings || "{}");
      webhookUrl = settings.slack_webhook_url || null;
    }

    if (!webhookUrl) return;

    // 3) 전송
    const slack = new SlackService({ webhookUrl });
    const data = event.data as Record<string, unknown>;

    // SSE event type → SlackEventType 변환 (agent. prefix 제거)
    const slackType = event.event.replace("agent.", "");

    await slack.sendNotification({
      type: slackType as import("../modules/portal/services/slack.js").SlackEventType,
      title: String(data.agentId ?? event.event),
      body: String(data.resultSummary ?? data.reason ?? data.error ?? ""),
      url: String(data.url ?? ""),
      planId: String(data.planId ?? ""),
    });
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
