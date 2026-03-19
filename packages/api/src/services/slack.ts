// ─── Slack Event Types ───

export type SlackEventType = "task.completed" | "pr.merged" | "plan.waiting";

export interface SlackEvent {
  type: SlackEventType;
  title: string;
  body: string;
  /** URL for "대시보드에서 보기" button (task.completed, plan detail) */
  url?: string;
  /** Plan ID for approve/reject actions */
  planId?: string;
}

// ─── Block Kit Types ───

interface TextObject {
  type: "plain_text" | "mrkdwn";
  text: string;
  emoji?: boolean;
}

interface HeaderBlock {
  type: "header";
  text: TextObject;
}

interface SectionBlock {
  type: "section";
  text: TextObject;
}

interface ButtonElement {
  type: "button";
  text: TextObject;
  action_id: string;
  value?: string;
  url?: string;
  style?: "primary" | "danger";
}

interface ActionsBlock {
  type: "actions";
  elements: ButtonElement[];
}

type Block = HeaderBlock | SectionBlock | ActionsBlock;

// ─── SlackService ───

export class SlackService {
  private webhookUrl: string;

  constructor(config: { webhookUrl: string }) {
    this.webhookUrl = config.webhookUrl;
  }

  async sendNotification(event: SlackEvent): Promise<{ ok: boolean }> {
    const blocks = this.buildBlocks(event);
    const res = await fetch(this.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocks }),
    });

    if (!res.ok) {
      return { ok: false };
    }
    return { ok: true };
  }

  buildBlocks(event: SlackEvent): Block[] {
    switch (event.type) {
      case "task.completed":
        return this.taskCompletedBlocks(event);
      case "pr.merged":
        return this.prMergedBlocks(event);
      case "plan.waiting":
        return this.planWaitingBlocks(event);
    }
  }

  private taskCompletedBlocks(event: SlackEvent): Block[] {
    const blocks: Block[] = [
      {
        type: "header",
        text: { type: "plain_text", text: `✅ ${event.title}`, emoji: true },
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: event.body },
      },
    ];
    if (event.url) {
      blocks.push({
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "대시보드에서 보기", emoji: true },
            action_id: "view_dashboard",
            url: event.url,
          },
        ],
      });
    }
    return blocks;
  }

  private prMergedBlocks(event: SlackEvent): Block[] {
    return [
      {
        type: "header",
        text: { type: "plain_text", text: `🔀 ${event.title}`, emoji: true },
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: event.body },
      },
    ];
  }

  private planWaitingBlocks(event: SlackEvent): Block[] {
    const blocks: Block[] = [
      {
        type: "header",
        text: { type: "plain_text", text: `⏳ ${event.title}`, emoji: true },
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: event.body },
      },
    ];
    if (event.planId) {
      blocks.push({
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "승인", emoji: true },
            action_id: "plan_approve",
            value: event.planId,
            style: "primary",
          },
          {
            type: "button",
            text: { type: "plain_text", text: "거절", emoji: true },
            action_id: "plan_reject",
            value: event.planId,
            style: "danger",
          },
        ],
      });
    }
    return blocks;
  }
}

// ─── Signature Verification ───

export async function verifySlackSignature(
  signingSecret: string,
  signature: string,
  timestamp: string,
  body: string,
): Promise<boolean> {
  // Replay attack protection: reject if timestamp > 5 minutes old
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(timestamp)) > 300) {
    return false;
  }

  const baseString = `v0:${timestamp}:${body}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(signingSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(baseString));
  const computed = `v0=${[...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("")}`;

  return signature === computed;
}
