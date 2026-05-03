import { Hono } from "hono";
import { AgentInbox } from "../../../agent/services/agent-inbox.js";
import { sendMessageSchema, listMessagesSchema, threadParamsSchema, threadQuerySchema, ackThreadParamsSchema } from "../schemas/inbox.js";
import type { Env } from "../../../env.js";

export const inboxRoute = new Hono<{ Bindings: Env }>();

inboxRoute.get("/:parentMessageId/thread", async (c) => {
  const { parentMessageId } = threadParamsSchema.parse(c.req.param());
  const query = threadQuerySchema.parse(c.req.query());
  const inbox = new AgentInbox({ db: c.env.DB });
  const thread = await inbox.getThread(parentMessageId);
  if (thread.length === 0) return c.json({ error: "Thread not found" }, 404);
  const limited = thread.slice(0, query.limit);
  return c.json({ thread: limited, total: thread.length, parentMessageId });
});

inboxRoute.post("/:parentMessageId/ack-thread", async (c) => {
  const { parentMessageId } = ackThreadParamsSchema.parse(c.req.param());
  const inbox = new AgentInbox({ db: c.env.DB });
  const count = await inbox.ackThread(parentMessageId);
  return c.json({ acknowledged: true, count });
});

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
