import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { app } from "../app.js";
import { createTestEnv, createAuthHeaders } from "./helpers/test-app.js";

describe("Spec Route — Conflict Detection (F54)", () => {
  let env: ReturnType<typeof createTestEnv>;
  let authHeaders: Record<string, string>;

  beforeEach(async () => {
    env = createTestEnv();
    authHeaders = await createAuthHeaders();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("POST /api/spec/generate", () => {
    it("응답에 conflicts 필드가 포함돼요", async () => {
      const mockLlmOutput = JSON.stringify({
        title: "이메일 알림 서비스 구현",
        description: "사용자에게 이메일 알림을 보내는 서비스를 구현합니다",
        acceptanceCriteria: ["AC-1: 이메일 발송 가능"],
        priority: "P1",
        estimatedEffort: "M",
        category: "feature",
        dependencies: [],
        risks: [],
      });

      // Mock Workers AI
      const mockAi = {
        run: vi.fn().mockResolvedValue({ response: mockLlmOutput }),
      };
      const testEnv = { ...env, AI: mockAi };

      const res = await app.request(
        "/api/spec/generate",
        {
          method: "POST",
          headers: {
            ...authHeaders,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: "이메일 알림 서비스를 만들어주세요",
            language: "ko",
          }),
        },
        testEnv,
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body).toHaveProperty("spec");
      expect(body).toHaveProperty("conflicts");
      expect(Array.isArray(body.conflicts)).toBe(true);
    });
  });

  describe("POST /api/spec/conflicts/resolve", () => {
    it("충돌 해결을 기록해요", async () => {
      // spec_conflicts 테이블에 레코드 삽입
      await env.DB.prepare(
        `INSERT INTO spec_conflicts (id, new_spec_title, existing_spec_id, conflict_type, severity, description)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
        .bind("conflict-1", "테스트 Spec", "F1", "direct", "warning", "유사한 제목")
        .run();

      const res = await app.request(
        "/api/spec/conflicts/resolve",
        {
          method: "POST",
          headers: {
            ...authHeaders,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            conflictId: "conflict-1",
            resolution: "accept",
          }),
        },
        env,
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.ok).toBe(true);
    });

    it("없는 충돌 ID → 404를 반환해요", async () => {
      const res = await app.request(
        "/api/spec/conflicts/resolve",
        {
          method: "POST",
          headers: {
            ...authHeaders,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            conflictId: "nonexistent",
            resolution: "reject",
          }),
        },
        env,
      );

      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/spec/existing", () => {
    it("기존 spec 목록을 반환해요 (GitHub 실패 시 빈 배열)", async () => {
      const res = await app.request(
        "/api/spec/existing",
        {
          method: "GET",
          headers: authHeaders,
        },
        env,
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as unknown[];
      expect(Array.isArray(body)).toBe(true);
    });
  });
});
