import type { D1Database } from "@cloudflare/workers-types";
import { randomUUID } from "crypto";
import type {
  WebhookSubscription,
  WebhookEventType,
  WebhookDispatchPayload,
  WebhookDeliveryResult,
} from "../types/webhook.js";
import type { CreateWebhookInput, UpdateWebhookInput } from "../schemas/webhook-schema.js";

interface WebhookRow {
  id: string;
  org_id: string;
  url: string;
  events: string;
  secret: string;
  description: string;
  is_active: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

function toSubscription(row: WebhookRow, maskSecret = true): WebhookSubscription {
  return {
    id: row.id,
    orgId: row.org_id,
    url: row.url,
    events: JSON.parse(row.events) as WebhookEventType[],
    secret: maskSecret ? "***" : row.secret,
    description: row.description,
    isActive: row.is_active === 1,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** HMAC-SHA256 서명 계산 (Web Crypto API — Cloudflare Workers 호환) */
export async function signPayload(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createWebhook(
  orgId: string,
  data: CreateWebhookInput,
  createdBy: string,
  db: D1Database,
): Promise<WebhookSubscription> {
  const id = randomUUID();
  const secret = randomUUID().replace(/-/g, "");
  const now = new Date().toISOString();
  const events = JSON.stringify(data.events);

  await db
    .prepare(
      `INSERT INTO webhook_subscriptions (id, org_id, url, events, secret, description, is_active, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
    )
    .bind(id, orgId, data.url, events, secret, data.description ?? "", createdBy, now, now)
    .run();

  const row = await db
    .prepare("SELECT * FROM webhook_subscriptions WHERE id = ?")
    .bind(id)
    .first<WebhookRow>();

  if (!row) throw new Error("Webhook creation failed");
  // 생성 시에는 secret 노출
  return toSubscription(row, false);
}

export async function listWebhooks(
  orgId: string,
  db: D1Database,
): Promise<WebhookSubscription[]> {
  const { results } = await db
    .prepare("SELECT * FROM webhook_subscriptions WHERE org_id = ? ORDER BY created_at DESC")
    .bind(orgId)
    .all<WebhookRow>();

  return (results ?? []).map((row) => toSubscription(row));
}

export async function getWebhook(
  id: string,
  orgId: string,
  db: D1Database,
): Promise<WebhookSubscription | null> {
  const row = await db
    .prepare("SELECT * FROM webhook_subscriptions WHERE id = ? AND org_id = ?")
    .bind(id, orgId)
    .first<WebhookRow>();

  return row ? toSubscription(row) : null;
}

export async function updateWebhook(
  id: string,
  orgId: string,
  data: UpdateWebhookInput,
  db: D1Database,
): Promise<WebhookSubscription | null> {
  const existing = await db
    .prepare("SELECT * FROM webhook_subscriptions WHERE id = ? AND org_id = ?")
    .bind(id, orgId)
    .first<WebhookRow>();

  if (!existing) return null;

  const now = new Date().toISOString();
  const url = data.url ?? existing.url;
  const events = data.events ? JSON.stringify(data.events) : existing.events;
  const description = data.description ?? existing.description;
  const isActive = data.isActive !== undefined ? (data.isActive ? 1 : 0) : existing.is_active;

  await db
    .prepare(
      `UPDATE webhook_subscriptions
       SET url = ?, events = ?, description = ?, is_active = ?, updated_at = ?
       WHERE id = ? AND org_id = ?`,
    )
    .bind(url, events, description, isActive, now, id, orgId)
    .run();

  const updated = await db
    .prepare("SELECT * FROM webhook_subscriptions WHERE id = ?")
    .bind(id)
    .first<WebhookRow>();

  return updated ? toSubscription(updated) : null;
}

export async function deleteWebhook(
  id: string,
  orgId: string,
  db: D1Database,
): Promise<boolean> {
  const result = await db
    .prepare("DELETE FROM webhook_subscriptions WHERE id = ? AND org_id = ?")
    .bind(id, orgId)
    .run();

  return (result.meta?.changes ?? 0) > 0;
}

/** 이벤트 발송 — fire-and-forget 방식, 결과 배열 반환 */
export async function dispatch(
  event: WebhookEventType,
  orgId: string,
  data: Record<string, unknown>,
  db: D1Database,
): Promise<WebhookDeliveryResult[]> {
  const { results } = await db
    .prepare(
      `SELECT * FROM webhook_subscriptions
       WHERE org_id = ? AND is_active = 1 AND events LIKE ?`,
    )
    .bind(orgId, `%${event}%`)
    .all<WebhookRow>();

  if (!results || results.length === 0) return [];

  const payload: WebhookDispatchPayload = {
    event,
    timestamp: new Date().toISOString(),
    orgId,
    data,
  };
  const body = JSON.stringify(payload);

  const deliveries = await Promise.allSettled(
    results.map(async (sub): Promise<WebhookDeliveryResult> => {
      const signature = await signPayload(body, sub.secret);
      try {
        const res = await fetch(sub.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Signature-256": `sha256=${signature}`,
            "X-Webhook-Event": event,
          },
          body,
        });
        return {
          subscriptionId: sub.id,
          status: res.ok ? "delivered" : "failed",
          statusCode: res.status,
        };
      } catch (err) {
        return {
          subscriptionId: sub.id,
          status: "failed",
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }),
  );

  return deliveries.map((r) =>
    r.status === "fulfilled"
      ? r.value
      : { subscriptionId: "unknown", status: "failed" as const, error: String(r.reason) },
  );
}

export const webhookService = {
  create: createWebhook,
  list: listWebhooks,
  get: getWebhook,
  update: updateWebhook,
  delete: deleteWebhook,
  dispatch,
  signPayload,
};
