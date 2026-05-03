/**
 * F224: Context Passthrough Service — Memory-based (no D1)
 * 에이전트 간 컨텍스트 전달을 위한 인메모리 저장소
 */

import type { z } from "@hono/zod-openapi";
import type { ContextPassthroughCreateSchema, ContextPayloadSchema } from "../schemas/context-passthrough.js";

export interface ContextPassthrough {
  id: string;
  sourceRole: string;
  targetRole: string;
  payload: z.infer<typeof ContextPayloadSchema>;
  workflowExecutionId: string | null;
  status: "pending" | "delivered" | "acknowledged";
  orgId: string;
  createdAt: string;
  deliveredAt: string | null;
  acknowledgedAt: string | null;
}

export class ContextPassthroughService {
  private store = new Map<string, ContextPassthrough>();

  create(orgId: string, data: z.infer<typeof ContextPassthroughCreateSchema>): ContextPassthrough {
    const id = crypto.randomUUID();
    const entry: ContextPassthrough = {
      id,
      sourceRole: data.sourceRole,
      targetRole: data.targetRole,
      payload: data.payload,
      workflowExecutionId: data.workflowExecutionId ?? null,
      status: "pending",
      orgId,
      createdAt: new Date().toISOString(),
      deliveredAt: null,
      acknowledgedAt: null,
    };
    this.store.set(id, entry);
    return entry;
  }

  deliver(id: string): ContextPassthrough | null {
    const entry = this.store.get(id);
    if (!entry) return null;
    entry.status = "delivered";
    entry.deliveredAt = new Date().toISOString();
    return entry;
  }

  acknowledge(id: string): ContextPassthrough | null {
    const entry = this.store.get(id);
    if (!entry) return null;
    entry.status = "acknowledged";
    entry.acknowledgedAt = new Date().toISOString();
    return entry;
  }

  listByTarget(orgId: string, targetRole: string): ContextPassthrough[] {
    return Array.from(this.store.values()).filter(
      (e) => e.orgId === orgId && e.targetRole === targetRole,
    );
  }

  getById(id: string): ContextPassthrough | null {
    return this.store.get(id) ?? null;
  }

  listByWorkflow(executionId: string): ContextPassthrough[] {
    return Array.from(this.store.values()).filter(
      (e) => e.workflowExecutionId === executionId,
    );
  }
}
