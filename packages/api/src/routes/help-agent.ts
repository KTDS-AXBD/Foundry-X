import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";
import {
  HelpAgentChatRequestSchema,
  HelpAgentLocalResponseSchema,
  HelpAgentHistoryResponseSchema,
} from "../schemas/help-agent-schema.js";
import { OpenRouterService } from "../services/openrouter-service.js";
import { HelpAgentService } from "../services/help-agent-service.js";
import type { Env } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";

export const helpAgentRoute = new OpenAPIHono<{
  Bindings: Env;
  Variables: TenantVariables;
}>();

// ─── POST /help-agent/chat ───
const chatRoute = createRoute({
  method: "post",
  path: "/help-agent/chat",
  tags: ["HelpAgent"],
  request: {
    body: { content: { "application/json": { schema: HelpAgentChatRequestSchema } } },
  },
  responses: {
    200: {
      description: "Local response (JSON) or SSE stream",
      content: { "application/json": { schema: HelpAgentLocalResponseSchema } },
    },
    400: { description: "Bad request" },
    500: { description: "Internal server error" },
  },
});

helpAgentRoute.openapi(chatRoute, async (c) => {
  const body = c.req.valid("json");
  const tenantId = c.get("tenantId");
  const userId = c.get("userId");

  const apiKey = c.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return c.json({ error: "OpenRouter API key not configured" }, 500);
  }

  const openRouter = new OpenRouterService(
    apiKey,
    c.env.OPENROUTER_DEFAULT_MODEL,
  );
  const service = new HelpAgentService(c.env.DB, openRouter);

  const response = await service.chat({
    tenantId,
    userId,
    message: body.message,
    conversationId: body.conversationId,
    bizItemId: body.bizItemId,
    stage: body.stage,
  });

  return response;
});

// ─── GET /help-agent/history ───
const historyRoute = createRoute({
  method: "get",
  path: "/help-agent/history",
  tags: ["HelpAgent"],
  request: {
    query: z.object({
      conversationId: z.string().min(1),
    }),
  },
  responses: {
    200: {
      description: "Conversation history",
      content: { "application/json": { schema: HelpAgentHistoryResponseSchema } },
    },
  },
});

helpAgentRoute.openapi(historyRoute, async (c) => {
  const { conversationId } = c.req.valid("query");
  const tenantId = c.get("tenantId");

  const openRouter = new OpenRouterService(c.env.OPENROUTER_API_KEY || "");
  const service = new HelpAgentService(c.env.DB, openRouter);
  const history = await service.getHistory(conversationId, tenantId);

  return c.json(history);
});
