import { describe, it, expect, beforeEach, vi } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { HelpAgentService } from "../src/services/help-agent-service.js";
import { OpenRouterService } from "../src/services/openrouter-service.js";

describe("HelpAgentService", () => {
  let db: ReturnType<typeof createMockD1>;
  let openRouter: OpenRouterService;
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
    openRouter = new OpenRouterService("fake-key");
    service = new HelpAgentService(db as unknown as D1Database, openRouter);
  });

  const baseParams = {
    tenantId: "org1",
    userId: "user1",
    message: "",
    conversationId: "conv1",
    stage: "2-1",
  };

  // ─── Hybrid 분기: 로컬 패턴 매칭 ───

  it("다음 단계 질문에 로컬 응답 반환", async () => {
    const res = await service.chat({ ...baseParams, message: "다음 단계 뭐야?" });
    expect(res.headers.get("Content-Type")).toBe("application/json");

    const body = await res.json() as { role: string; content: string; isLocal: boolean };
    expect(body.isLocal).toBe(true);
    expect(body.content).toContain("2-2");
    expect(body.content).toContain("시장 분석");
  });

  it("현재 단계 질문에 로컬 응답 반환", async () => {
    const res = await service.chat({ ...baseParams, message: "이 단계 뭐야?" });
    const body = await res.json() as { content: string; isLocal: boolean };
    expect(body.isLocal).toBe(true);
    expect(body.content).toContain("2-1");
    expect(body.content).toContain("문제 정의");
  });

  it("스킬 추천 질문에 로컬 응답 반환", async () => {
    const res = await service.chat({ ...baseParams, message: "스킬 추천해줘" });
    const body = await res.json() as { content: string; isLocal: boolean };
    expect(body.isLocal).toBe(true);
    expect(body.content).toContain("JTBD");
  });

  it("체크포인트 질문에 Commit Gate 정보 반환", async () => {
    const res = await service.chat({ ...baseParams, message: "체크포인트 알려줘" });
    const body = await res.json() as { content: string; isLocal: boolean };
    expect(body.isLocal).toBe(true);
    expect(body.content).toContain("Commit Gate");
  });

  it("마지막 단계(2-7)에서 다음 단계 질문 시 완료 메시지", async () => {
    const res = await service.chat({ ...baseParams, stage: "2-7", message: "next step" });
    const body = await res.json() as { content: string };
    expect(body.content).toContain("마지막 단계");
  });

  it("영어 next step 질문도 로컬 매칭", async () => {
    const res = await service.chat({ ...baseParams, message: "what is the next step?" });
    const body = await res.json() as { content: string; isLocal: boolean };
    expect(body.isLocal).toBe(true);
  });

  // ─── 로컬 응답 시 대화 저장 ───

  it("로컬 응답도 D1에 저장", async () => {
    await service.chat({ ...baseParams, message: "다음 단계?" });

    const result = await (db as unknown as D1Database)
      .prepare("SELECT * FROM help_agent_conversations WHERE conversation_id = ?")
      .bind("conv1")
      .all();

    expect(result.results.length).toBe(2); // user + assistant
    const roles = result.results.map((r: any) => r.role);
    expect(roles).toContain("user");
    expect(roles).toContain("assistant");
  });

  // ─── LLM 경로 ───

  it("비매칭 메시지는 OpenRouter SSE 호출", async () => {
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"안녕"}}]}\n\n'));
        controller.close();
      },
    });

    vi.spyOn(openRouter, "streamChat").mockResolvedValue(
      new Response(mockStream, {
        headers: { "Content-Type": "text/event-stream" },
      }),
    );

    const res = await service.chat({
      ...baseParams,
      message: "이 사업 아이템의 핵심 가치는 뭘까?",
    });

    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    expect(openRouter.streamChat).toHaveBeenCalledOnce();
  });

  // ─── 이력 조회 ───

  it("getHistory로 대화 이력 조회", async () => {
    await service.chat({ ...baseParams, message: "체크포인트" });
    const history = await service.getHistory("conv1", "org1");
    expect(history.conversationId).toBe("conv1");
    expect(history.messages.length).toBeGreaterThanOrEqual(2);
  });
});
