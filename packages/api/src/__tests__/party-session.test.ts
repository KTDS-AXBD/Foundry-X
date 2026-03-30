import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { PartySessionService } from "../services/party-session.js";

const DDL = `
  CREATE TABLE IF NOT EXISTS party_sessions (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    mode TEXT NOT NULL DEFAULT 'free-form' CHECK(mode IN ('free-form', 'round-robin', 'moderated')),
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'concluded', 'cancelled')),
    max_participants INTEGER NOT NULL DEFAULT 10,
    created_by TEXT NOT NULL,
    summary TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    concluded_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_party_sessions_org ON party_sessions(org_id, status);

  CREATE TABLE IF NOT EXISTS party_participants (
    session_id TEXT NOT NULL,
    agent_role TEXT NOT NULL,
    joined_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (session_id, agent_role),
    FOREIGN KEY (session_id) REFERENCES party_sessions(id)
  );

  CREATE TABLE IF NOT EXISTS party_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    agent_role TEXT NOT NULL,
    content TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'opinion' CHECK(message_type IN ('opinion', 'question', 'answer', 'summary')),
    reply_to TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES party_sessions(id)
  );
  CREATE INDEX IF NOT EXISTS idx_party_messages_session ON party_messages(session_id, created_at);
`;

describe("PartySessionService", () => {
  let db: D1Database;
  let svc: PartySessionService;

  beforeEach(async () => {
    const mockDb = createMockD1();
    await mockDb.exec(DDL);
    db = mockDb as unknown as D1Database;
    svc = new PartySessionService(db);
  });

  it("createSession: returns session with defaults", async () => {
    const session = await svc.createSession("org_test", "user1", { topic: "Architecture review" });
    expect(session.id).toMatch(/^party-/);
    expect(session.orgId).toBe("org_test");
    expect(session.topic).toBe("Architecture review");
    expect(session.mode).toBe("free-form");
    expect(session.status).toBe("active");
    expect(session.maxParticipants).toBe(10);
    expect(session.createdBy).toBe("user1");
  });

  it("createSession: respects custom mode and maxParticipants", async () => {
    const session = await svc.createSession("org_test", "user1", {
      topic: "Design debate",
      mode: "moderated",
      maxParticipants: 5,
    });
    expect(session.mode).toBe("moderated");
    expect(session.maxParticipants).toBe(5);
  });

  it("joinSession: adds participant", async () => {
    const session = await svc.createSession("org_test", "user1", { topic: "Test" });
    const result = await svc.joinSession(session.id, "code-reviewer");
    expect(result.sessionId).toBe(session.id);
    expect(result.agentRole).toBe("code-reviewer");
  });

  it("listParticipants: returns joined agents", async () => {
    const session = await svc.createSession("org_test", "user1", { topic: "Test" });
    await svc.joinSession(session.id, "reviewer");
    await svc.joinSession(session.id, "tester");

    const participants = await svc.listParticipants(session.id);
    expect(participants).toHaveLength(2);
    expect(participants.map((p) => p.agentRole).sort()).toEqual(["reviewer", "tester"]);
  });

  it("addMessage: creates message with defaults", async () => {
    const session = await svc.createSession("org_test", "user1", { topic: "Test" });
    const msg = await svc.addMessage(session.id, { agentRole: "reviewer", content: "Looks good" });

    expect(msg.id).toMatch(/^msg-/);
    expect(msg.sessionId).toBe(session.id);
    expect(msg.agentRole).toBe("reviewer");
    expect(msg.content).toBe("Looks good");
    expect(msg.messageType).toBe("opinion");
    expect(msg.replyTo).toBeNull();
  });

  it("addMessage: supports reply_to and message_type", async () => {
    const session = await svc.createSession("org_test", "user1", { topic: "Test" });
    const msg1 = await svc.addMessage(session.id, { agentRole: "reviewer", content: "Why?" });
    const msg2 = await svc.addMessage(session.id, {
      agentRole: "dev",
      content: "Because of X",
      messageType: "answer",
      replyTo: msg1.id,
    });

    expect(msg2.messageType).toBe("answer");
    expect(msg2.replyTo).toBe(msg1.id);
  });

  it("listMessages: returns messages in order", async () => {
    const session = await svc.createSession("org_test", "user1", { topic: "Test" });
    await svc.addMessage(session.id, { agentRole: "a", content: "First" });
    await svc.addMessage(session.id, { agentRole: "b", content: "Second" });

    const messages = await svc.listMessages(session.id);
    expect(messages).toHaveLength(2);
    expect(messages[0]!.content).toBe("First");
    expect(messages[1]!.content).toBe("Second");
  });

  it("concludeSession: updates status and summary", async () => {
    const session = await svc.createSession("org_test", "user1", { topic: "Test" });
    const concluded = await svc.concludeSession(session.id, "We decided on approach A");

    expect(concluded.status).toBe("concluded");
    expect(concluded.summary).toBe("We decided on approach A");
    expect(concluded.concludedAt).not.toBeNull();
  });

  it("getSession: returns null for unknown ID", async () => {
    const session = await svc.getSession("nonexistent");
    expect(session).toBeNull();
  });

  it("listSessions: filters by status", async () => {
    await svc.createSession("org_test", "user1", { topic: "Active session" });
    const s2 = await svc.createSession("org_test", "user1", { topic: "To conclude" });
    await svc.concludeSession(s2.id, "Done");

    const active = await svc.listSessions("org_test", "active");
    expect(active).toHaveLength(1);
    expect(active[0]!.topic).toBe("Active session");

    const concluded = await svc.listSessions("org_test", "concluded");
    expect(concluded).toHaveLength(1);
    expect(concluded[0]!.topic).toBe("To conclude");

    const all = await svc.listSessions("org_test");
    expect(all).toHaveLength(2);
  });
});
