import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";
import { verifySlackSignature } from "../services/slack.js";
import { SlackCommandSchema, SlackInteractionSchema } from "../schemas/slack.js";
import { ErrorSchema } from "../../../schemas/common.js";
import type { Env } from "../../../env.js";

export const slackRoute = new OpenAPIHono<{ Bindings: Env }>();

// ─── Slack signature verification middleware ───

async function verifySlack(
  c: { req: { header: (name: string) => string | undefined; text: () => Promise<string> }; json: (data: unknown, status: number) => Response; env: Env },
): Promise<{ body: string } | Response> {
  const signingSecret = (c.env as any)?.SLACK_SIGNING_SECRET as string | undefined;
  if (!signingSecret) {
    return { body: await c.req.text() };
  }

  const signature = c.req.header("x-slack-signature") ?? "";
  const timestamp = c.req.header("x-slack-request-timestamp") ?? "";
  const body = await c.req.text();

  const valid = await verifySlackSignature(signingSecret, signature, timestamp, body);
  if (!valid) {
    return c.json({ error: "Invalid Slack signature" }, 401);
  }
  return { body };
}

// ─── POST /slack/commands ───

const commandRoute = createRoute({
  method: "post",
  path: "/slack/commands",
  tags: ["Slack"],
  summary: "Slack 슬래시 커맨드 수신",
  request: {
    body: {
      content: {
        "application/x-www-form-urlencoded": { schema: SlackCommandSchema },
      },
    },
  },
  responses: {
    200: { description: "Slash command response" },
    401: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "서명 검증 실패",
    },
  },
});

slackRoute.openapi(commandRoute, async (c) => {
  const result = await verifySlack(c as any);
  if (result instanceof Response) return result;

  const params = new URLSearchParams(result.body);
  const text = (params.get("text") ?? "").trim();

  if (text === "status") {
    return c.json({
      response_type: "ephemeral",
      text: "🟢 Foundry-X 프로젝트 상태: 정상 운영 중",
    });
  }

  if (text.startsWith("plan")) {
    return c.json({
      response_type: "ephemeral",
      text: "📋 PlannerAgent에 요청했어요. 잠시 후 결과를 알려드릴게요.",
    });
  }

  return c.json({
    response_type: "ephemeral",
    text: `알 수 없는 명령이에요: \`${text}\`\n사용 가능: \`status\`, \`plan <설명>\``,
  });
});

// ─── POST /slack/interactions ───

const interactionRoute = createRoute({
  method: "post",
  path: "/slack/interactions",
  tags: ["Slack"],
  summary: "Slack 버튼 인터랙션 수신",
  request: {
    body: {
      content: {
        "application/x-www-form-urlencoded": { schema: SlackInteractionSchema },
      },
    },
  },
  responses: {
    200: { description: "Interaction response" },
    401: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "서명 검증 실패",
    },
  },
});

slackRoute.openapi(interactionRoute, async (c) => {
  const result = await verifySlack(c as any);
  if (result instanceof Response) return result;

  const params = new URLSearchParams(result.body);
  const rawPayload = params.get("payload") ?? "{}";

  let payload: {
    actions?: Array<{ action_id: string; value?: string }>;
    user?: { id: string; name: string };
  };
  try {
    payload = JSON.parse(rawPayload);
  } catch {
    return c.json({ text: "잘못된 페이로드에요." });
  }

  const action = payload.actions?.[0];
  if (!action) {
    return c.json({ text: "액션을 찾을 수 없어요." });
  }

  const planId = action.value ?? "";
  const slackUserId = payload.user?.id ?? "unknown";
  const db = (c.env as any)?.DB;

  // ─── plan_approve ───
  if (action.action_id === "plan_approve" && planId) {
    if (!db) {
      return c.json({ text: `✅ 계획 \`${planId}\`을(를) 승인했어요.` });
    }

    const now = new Date().toISOString();
    const updated = await db.prepare(
      `UPDATE agent_plans SET status = 'approved', approved_at = ?, human_feedback = ? WHERE id = ? AND status = 'pending_approval'`,
    ).bind(now, `Slack 승인 by ${slackUserId}`, planId).run();

    if (!updated.meta.changes) {
      return c.json({
        replace_original: true,
        text: `⚠️ 계획 \`${planId}\`은(는) 이미 처리되었어요.`,
      });
    }

    return c.json({
      replace_original: true,
      blocks: [
        { type: "section", text: { type: "mrkdwn", text: `✅ *계획 승인 완료*\n계획 \`${planId}\`을(를) <@${slackUserId}>님이 승인했어요. 실행을 시작해요.` } },
      ],
    });
  }

  // ─── plan_reject ───
  if (action.action_id === "plan_reject" && planId) {
    if (!db) {
      return c.json({ text: `❌ 계획 \`${planId}\`을(를) 거절했어요.` });
    }

    const now = new Date().toISOString();
    const updated = await db.prepare(
      `UPDATE agent_plans SET status = 'rejected', rejected_at = ?, human_feedback = ? WHERE id = ? AND status = 'pending_approval'`,
    ).bind(now, `Slack 거절 by ${slackUserId}`, planId).run();

    if (!updated.meta.changes) {
      return c.json({
        replace_original: true,
        text: `⚠️ 계획 \`${planId}\`은(는) 이미 처리되었어요.`,
      });
    }

    return c.json({
      replace_original: true,
      blocks: [
        { type: "section", text: { type: "mrkdwn", text: `❌ *계획 거절됨*\n계획 \`${planId}\`을(를) <@${slackUserId}>님이 거절했어요.` } },
      ],
    });
  }

  // ─── view_dashboard (기존) ───
  if (action.action_id === "view_dashboard") {
    return c.json({ text: "대시보드로 이동해요." });
  }

  return c.json({ text: "알 수 없는 액션이에요." });
});
