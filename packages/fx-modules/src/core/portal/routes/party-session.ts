import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import {
  PartySessionCreateSchema,
  PartySessionResponseSchema,
  PartyJoinSchema,
  PartyMessageCreateSchema,
  PartyMessageResponseSchema,
  PartyConcludeSchema,
} from "../schemas/party-session.js";
import type { Env } from "../../../env.js";
import type { TenantVariables } from "../../../middleware/tenant.js";
import { PartySessionService } from "../services/party-session.js";

export const partySessionRoute = new OpenAPIHono<{ Bindings: Env; Variables: TenantVariables }>();

// ─── POST /api/party-sessions ───

const createSession = createRoute({
  method: "post",
  path: "/party-sessions",
  tags: ["Party Sessions"],
  summary: "Create a party session",
  request: {
    body: { content: { "application/json": { schema: PartySessionCreateSchema } } },
  },
  responses: {
    201: {
      content: { "application/json": { schema: PartySessionResponseSchema } },
      description: "Created party session",
    },
  },
});

partySessionRoute.openapi(createSession, async (c) => {
  const body = c.req.valid("json");
  const orgId = c.get("orgId") as string;
  const userId = c.get("userId") as string;
  const svc = new PartySessionService(c.env.DB);

  const session = await svc.createSession(orgId, userId, body);
  return c.json(session, 201);
});

// ─── GET /api/party-sessions ───

const listSessions = createRoute({
  method: "get",
  path: "/party-sessions",
  tags: ["Party Sessions"],
  summary: "List party sessions",
  request: {
    query: z.object({ status: z.enum(["active", "concluded", "cancelled"]).optional() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(PartySessionResponseSchema) } },
      description: "Party sessions list",
    },
  },
});

partySessionRoute.openapi(listSessions, async (c) => {
  const orgId = c.get("orgId") as string;
  const { status } = c.req.valid("query");
  const svc = new PartySessionService(c.env.DB);

  const sessions = await svc.listSessions(orgId, status);
  return c.json(sessions);
});

// ─── GET /api/party-sessions/:id ───

const getSession = createRoute({
  method: "get",
  path: "/party-sessions/{id}",
  tags: ["Party Sessions"],
  summary: "Get party session by ID",
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: PartySessionResponseSchema } },
      description: "Party session detail",
    },
    404: {
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
      description: "Not found",
    },
  },
});

partySessionRoute.openapi(getSession, async (c) => {
  const { id } = c.req.valid("param");
  const svc = new PartySessionService(c.env.DB);

  const session = await svc.getSession(id);
  if (!session) return c.json({ error: "Session not found" }, 404);
  return c.json(session);
});

// ─── POST /api/party-sessions/:id/join ───

const joinSession = createRoute({
  method: "post",
  path: "/party-sessions/{id}/join",
  tags: ["Party Sessions"],
  summary: "Join a party session",
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { "application/json": { schema: PartyJoinSchema } } },
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.object({ sessionId: z.string(), agentRole: z.string() }) } },
      description: "Joined session",
    },
  },
});

partySessionRoute.openapi(joinSession, async (c) => {
  const { id } = c.req.valid("param");
  const { agentRole } = c.req.valid("json");
  const svc = new PartySessionService(c.env.DB);

  const result = await svc.joinSession(id, agentRole);
  return c.json(result);
});

// ─── POST /api/party-sessions/:id/messages ───

const addMessage = createRoute({
  method: "post",
  path: "/party-sessions/{id}/messages",
  tags: ["Party Sessions"],
  summary: "Add a message to party session",
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { "application/json": { schema: PartyMessageCreateSchema } } },
  },
  responses: {
    201: {
      content: { "application/json": { schema: PartyMessageResponseSchema } },
      description: "Created message",
    },
  },
});

partySessionRoute.openapi(addMessage, async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const svc = new PartySessionService(c.env.DB);

  const msg = await svc.addMessage(id, body);
  return c.json(msg, 201);
});

// ─── GET /api/party-sessions/:id/messages ───

const listMessages = createRoute({
  method: "get",
  path: "/party-sessions/{id}/messages",
  tags: ["Party Sessions"],
  summary: "List messages in party session",
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(PartyMessageResponseSchema) } },
      description: "Messages list",
    },
  },
});

partySessionRoute.openapi(listMessages, async (c) => {
  const { id } = c.req.valid("param");
  const svc = new PartySessionService(c.env.DB);

  const messages = await svc.listMessages(id);
  return c.json(messages);
});

// ─── PATCH /api/party-sessions/:id/conclude ───

const concludeSession = createRoute({
  method: "patch",
  path: "/party-sessions/{id}/conclude",
  tags: ["Party Sessions"],
  summary: "Conclude a party session",
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { "application/json": { schema: PartyConcludeSchema } } },
  },
  responses: {
    200: {
      content: { "application/json": { schema: PartySessionResponseSchema } },
      description: "Concluded session",
    },
  },
});

partySessionRoute.openapi(concludeSession, async (c) => {
  const { id } = c.req.valid("param");
  const { summary } = c.req.valid("json");
  const svc = new PartySessionService(c.env.DB);

  const session = await svc.concludeSession(id, summary);
  return c.json(session);
});

// ─── GET /api/party-sessions/:id/participants ───

const listParticipants = createRoute({
  method: "get",
  path: "/party-sessions/{id}/participants",
  tags: ["Party Sessions"],
  summary: "List participants in party session",
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.array(z.object({ sessionId: z.string(), agentRole: z.string(), joinedAt: z.string() })),
        },
      },
      description: "Participants list",
    },
  },
});

partySessionRoute.openapi(listParticipants, async (c) => {
  const { id } = c.req.valid("param");
  const svc = new PartySessionService(c.env.DB);

  const participants = await svc.listParticipants(id);
  return c.json(participants);
});
