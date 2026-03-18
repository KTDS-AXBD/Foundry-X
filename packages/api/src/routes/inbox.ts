import { Hono } from "hono";
import { AgentInbox } from "../services/agent-inbox.js";
import { sendMessageSchema, listMessagesSchema } from "../schemas/inbox.js";
import type { Env } from "../env.js";

export const inboxRoute = new Hono<{ Bindings: Env }>();

inboxRoute.post("/send", async (c) => {
  const body = sendMessageSchema.parse(await c.req.json());
  const inbox = new AgentInbox({ db: c.env.DB });
  const msg = await inbox.send(
    body.fromAgentId,
    body.toAgentId,
    body.type,
    body.subject,
    body.payload,
    body.parentMessageId,
  );
  return c.json(msg, 201);
});

inboxRoute.get("/:agentId", async (c) => {
  const agentId = c.req.param("agentId");
  const query = listMessagesSchema.parse(c.req.query());
  const inbox = new AgentInbox({ db: c.env.DB });
  const messages = await inbox.list(agentId, {
    unreadOnly: query.unreadOnly,
    limit: query.limit,
  });
  return c.json({ messages, total: messages.length });
});

inboxRoute.post("/:id/ack", async (c) => {
  const id = c.req.param("id");
  const inbox = new AgentInbox({ db: c.env.DB });
  const success = await inbox.ack(id);
  if (!success) {
    return c.json({ error: "Message not found or already acknowledged" }, 404);
  }
  return c.json({ acknowledged: true });
});
