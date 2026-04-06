/**
 * WebhookRegistryService — 범용 웹훅 등록/발송/검증 (F99)
 */

import type { WebhookCreate } from "../schemas/webhook.js";

export interface Webhook {
  id: string;
  org_id: string;
  provider: string;
  event_types: string[];
  target_url: string;
  direction: string;
  secret: string | null;
  enabled: boolean;
  config: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  org_id: string;
  event_type: string;
  payload: string;
  status: string;
  response_code: number | null;
  response_body: string | null;
  attempts: number;
  max_attempts: number;
  next_retry_at: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface WebhookEvent {
  type: string;
  payload: Record<string, unknown>;
}

function toWebhook(row: Record<string, unknown>): Webhook {
  return {
    id: row.id as string,
    org_id: row.org_id as string,
    provider: row.provider as string,
    event_types: JSON.parse((row.event_types as string) || "[]"),
    target_url: row.target_url as string,
    direction: row.direction as string,
    secret: (row.secret as string) ?? null,
    enabled: !!(row.enabled as number),
    config: row.config ? JSON.parse(row.config as string) : null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export class WebhookRegistryService {
  constructor(private db: D1Database) {}

  async register(orgId: string, input: WebhookCreate): Promise<Webhook> {
    const id = `wh_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO webhooks (id, org_id, provider, event_types, target_url, direction, secret, enabled, config, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
      )
      .bind(
        id,
        orgId,
        input.provider,
        JSON.stringify(input.event_types),
        input.target_url,
        input.direction ?? "inbound",
        input.secret ?? null,
        input.config ? JSON.stringify(input.config) : null,
        now,
        now,
      )
      .run();

    const row = await this.db.prepare("SELECT * FROM webhooks WHERE id = ?").bind(id).first();
    return toWebhook(row as Record<string, unknown>);
  }

  async list(orgId: string): Promise<Webhook[]> {
    const { results } = await this.db
      .prepare("SELECT * FROM webhooks WHERE org_id = ? ORDER BY created_at DESC")
      .bind(orgId)
      .all();
    return (results ?? []).map((r) => toWebhook(r as Record<string, unknown>));
  }

  async get(orgId: string, id: string): Promise<Webhook | null> {
    const row = await this.db
      .prepare("SELECT * FROM webhooks WHERE id = ? AND org_id = ?")
      .bind(id, orgId)
      .first();
    return row ? toWebhook(row as Record<string, unknown>) : null;
  }

  async delete(orgId: string, id: string): Promise<boolean> {
    const result = await this.db
      .prepare("DELETE FROM webhooks WHERE id = ? AND org_id = ?")
      .bind(id, orgId)
      .run();
    return (result.meta.changes ?? 0) > 0;
  }

  async handleInbound(provider: string, headers: Headers, body: string): Promise<{ processed: boolean; webhookId?: string }> {
    // Find webhook by provider
    const row = await this.db
      .prepare("SELECT * FROM webhooks WHERE provider = ? AND direction = 'inbound' AND enabled = 1 LIMIT 1")
      .bind(provider)
      .first();

    if (!row) {
      return { processed: false };
    }

    const webhook = toWebhook(row as Record<string, unknown>);

    // Verify signature if secret is set
    if (webhook.secret) {
      await this.verifySignature(webhook, headers, body);
    }

    // Record delivery
    const deliveryId = `whd_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const now = new Date().toISOString();
    await this.db
      .prepare(
        `INSERT INTO webhook_deliveries (id, webhook_id, org_id, event_type, payload, status, attempts, created_at, completed_at)
         VALUES (?, ?, ?, ?, ?, 'success', 1, ?, ?)`,
      )
      .bind(deliveryId, webhook.id, webhook.org_id, provider, body, now, now)
      .run();

    return { processed: true, webhookId: webhook.id };
  }

  async deliver(webhookId: string, event: WebhookEvent): Promise<WebhookDelivery> {
    const webhook = await this.db.prepare("SELECT * FROM webhooks WHERE id = ?").bind(webhookId).first();
    if (!webhook) throw new Error(`Webhook not found: ${webhookId}`);
    const wh = toWebhook(webhook as Record<string, unknown>);

    const deliveryId = `whd_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO webhook_deliveries (id, webhook_id, org_id, event_type, payload, status, attempts, created_at)
         VALUES (?, ?, ?, ?, ?, 'pending', 0, ?)`,
      )
      .bind(deliveryId, webhookId, wh.org_id, event.type, JSON.stringify(event.payload), now)
      .run();

    try {
      const res = await fetch(wh.target_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event.payload),
      });

      await this.db
        .prepare(
          `UPDATE webhook_deliveries SET status = ?, response_code = ?, attempts = 1, completed_at = ? WHERE id = ?`,
        )
        .bind(res.ok ? "success" : "failed", res.status, now, deliveryId)
        .run();
    } catch {
      // Schedule retry
      const retryAt = new Date(Date.now() + 60_000).toISOString();
      await this.db
        .prepare(
          `UPDATE webhook_deliveries SET status = 'retrying', attempts = 1, next_retry_at = ? WHERE id = ?`,
        )
        .bind(retryAt, deliveryId)
        .run();
    }

    const delivery = await this.db.prepare("SELECT * FROM webhook_deliveries WHERE id = ?").bind(deliveryId).first();
    return delivery as unknown as WebhookDelivery;
  }

  async testWebhook(orgId: string, id: string): Promise<{ sent: boolean; status?: number }> {
    const webhook = await this.get(orgId, id);
    if (!webhook) throw new Error("Webhook not found");

    try {
      const res = await fetch(webhook.target_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: true, source: "foundry-x", timestamp: new Date().toISOString() }),
      });
      return { sent: true, status: res.status };
    } catch {
      return { sent: false };
    }
  }

  private async verifySignature(webhook: Webhook, headers: Headers, body: string): Promise<void> {
    const signature = headers.get("x-hub-signature-256") ?? headers.get("x-webhook-signature");
    if (!signature || !webhook.secret) {
      throw new WebhookError(401, "Missing webhook signature");
    }

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(webhook.secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
    const expected = `sha256=${Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("")}`;

    if (signature !== expected) {
      throw new WebhookError(401, "Invalid webhook signature");
    }
  }
}

export class WebhookError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "WebhookError";
  }
}
