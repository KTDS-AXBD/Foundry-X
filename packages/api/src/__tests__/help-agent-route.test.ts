import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { HelpAgentService } from "../agent/services/help-agent-service.js";
import { OpenRouterService } from "../agent/services/openrouter-service.js";

/**
 * Help Agent Route 검증 — 라우트 핸들러의 핵심 로직인
 * 인증/요청 검증/응답 포맷을 서비스 레벨에서 테스트
 */
describe("Help Agent Route Logic", () => {
  let db: ReturnType<typeof createMockD1>;
  let service: HelpAgentService;

  beforeEach(() => {
    db = createMockD1();
    (db as any).exec(`
      CREATE TABLE IF NOT EXISTS help_agent_conversations (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        tenant_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        biz_item_id TEXT,
        discovery_stage TEXT,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
        content TEXT NOT NULL,
        model TEXT,
        tokens_used INTEGER DEFAULT 0,
        is_local_response INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);
    const openRouter = new OpenRouterService("fake-key");
    service = new HelpAgentService(db as unknown as D1Database, openRouter);
  });

  // ─── POST /help-agent/chat 응답 포맷 ───

  it("로컬 응답의 Content-Type은 application/json", async () => {
    const res = await service.chat({
      tenantId: "org1",
      userId: "user1",
      message: "다음 단계 알려줘",
      conversationId: "conv1",
      stage: "2-1",
    });
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });

  it("로컬 응답에 isLocal: true 포함", async () => {
    const res = await service.chat({
      tenantId: "org1",
      userId: "user1",
      message: "체크포인트",
      conversationId: "conv1",
    });
    const body = await res.json() as any;
    expect(body.isLocal).toBe(true);
    expect(body.role).toBe("assistant");
    expect(body.content).toBeTruthy();
  });

  // ─── GET /help-agent/history 응답 포맷 ───

  it("빈 대화 이력은 빈 배열 반환", async () => {
    const history = await service.getHistory("nonexistent", "org1");
    expect(history.conversationId).toBe("nonexistent");
    expect(history.messages).toEqual([]);
  });

  it("대화 이력은 시간순 정렬", async () => {
    // 로컬 응답 2번으로 4개 메시지 생성
    await service.chat({
      tenantId: "org1",
      userId: "user1",
      message: "다음 단계?",
      conversationId: "conv-order",
      stage: "2-0",
    });
    await service.chat({
      tenantId: "org1",
      userId: "user1",
      message: "스킬 추천",
      conversationId: "conv-order",
      stage: "2-0",
    });

    const history = await service.getHistory("conv-order", "org1");
    expect(history.messages.length).toBe(4); // 2 user + 2 assistant
    expect(history.messages[0]!.role).toBe("user");
    expect(history.messages[1]!.role).toBe("assistant");
  });

  it("tenant 격리: 다른 tenant의 이력은 조회 불가", async () => {
    await service.chat({
      tenantId: "org1",
      userId: "user1",
      message: "다음 단계?",
      conversationId: "conv-tenant",
    });

    const history = await service.getHistory("conv-tenant", "org2");
    expect(history.messages).toEqual([]);
  });
});
