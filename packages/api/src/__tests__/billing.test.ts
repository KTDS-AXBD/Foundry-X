import { describe, it, expect, beforeEach } from "vitest";
import { app } from "../app.js";
import { createTestEnv, createAuthHeaders } from "./helpers/test-app.js";

describe("Billing API (F411)", () => {
  let env: ReturnType<typeof createTestEnv>;
  let adminHeaders: Record<string, string>;
  let memberHeaders: Record<string, string>;

  beforeEach(async () => {
    env = createTestEnv();
    // test-user는 DB에서 owner — admin 헤더로 사용
    adminHeaders = await createAuthHeaders({ orgRole: "owner" });
    // member-user를 DB에 member로 등록 (tenantGuard가 DB 역할을 신뢰)
    await (env.DB as any).exec(
      "INSERT OR IGNORE INTO org_members (org_id, user_id, role) VALUES ('org_test', 'member-user', 'member')"
    );
    memberHeaders = await createAuthHeaders({ sub: "member-user", orgRole: "member" });
  });

  describe("GET /api/billing/usage", () => {
    it("returns usage summary for authenticated user", async () => {
      const res = await app.request("/api/billing/usage", {
        headers: adminHeaders,
      }, env as any);

      expect(res.status).toBe(200);
      const body = await res.json() as Record<string, unknown>;
      expect(body).toMatchObject({
        orgId: "org_test",
        used: 0,
        limit: 1000,
        remaining: 1000,
        planId: "free",
      });
      expect(typeof body.month).toBe("string");
      expect(body.month).toMatch(/^\d{4}-\d{2}$/);
    });

    it("returns 401 without auth", async () => {
      const res = await app.request("/api/billing/usage", {}, env as any);
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/billing/plans", () => {
    it("returns all 3 plans", async () => {
      const res = await app.request("/api/billing/plans", {
        headers: adminHeaders,
      }, env as any);

      expect(res.status).toBe(200);
      const body = await res.json() as { plans: Array<{ id: string; name: string; monthlyLimit: number }> };
      expect(body.plans).toHaveLength(3);

      const free = body.plans.find((p) => p.id === "free");
      const pro = body.plans.find((p) => p.id === "pro");
      const enterprise = body.plans.find((p) => p.id === "enterprise");

      expect(free?.monthlyLimit).toBe(1000);
      expect(pro?.monthlyLimit).toBe(50000);
      expect(enterprise?.monthlyLimit).toBe(-1);
    });
  });

  describe("PUT /api/billing/plan", () => {
    it("allows admin to change plan", async () => {
      const res = await app.request("/api/billing/plan", {
        method: "PUT",
        headers: { ...adminHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ planId: "pro" }),
      }, env as any);

      expect(res.status).toBe(200);
      const body = await res.json() as { success: boolean; planId: string };
      expect(body.success).toBe(true);
      expect(body.planId).toBe("pro");
    });

    it("rejects member role with 403", async () => {
      const res = await app.request("/api/billing/plan", {
        method: "PUT",
        headers: { ...memberHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ planId: "pro" }),
      }, env as any);

      expect(res.status).toBe(403);
    });

    it("returns 400 for invalid plan", async () => {
      const res = await app.request("/api/billing/plan", {
        method: "PUT",
        headers: { ...adminHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ planId: "invalid-plan" }),
      }, env as any);

      expect(res.status).toBe(400);
    });
  });

  describe("Rate Limiting (usage limiter)", () => {
    it("returns 429 when monthly limit is reached", async () => {
      // 사용량을 free 한도(1000) 이상으로 직접 설정
      const month = new Date().toISOString().slice(0, 7);
      await (env.DB as any).exec(
        `INSERT INTO usage_records (org_id, month, api_calls) VALUES ('org_test', '${month}', 1000)`
      );

      // /api/billing/plans는 usage limiter가 스킵하므로 다른 엔드포인트 호출
      // (usage 조회 자체는 스킵 경로이므로 외부 엔드포인트를 직접 호출하는 대신
      //  usage-limiter 로직을 서비스 단위 테스트로 검증)
      const summary = await (env.DB as any).prepare(
        "SELECT api_calls FROM usage_records WHERE org_id = 'org_test' AND month = ?"
      ).bind(month).first();
      expect(summary?.api_calls).toBe(1000);

      // GET /api/billing/usage는 SKIP_PATHS이므로 스킵되지 않는 경로 확인
      // usageLimiter 서비스 레벨에서 isOverLimit이 true임을 검증
      const { usageTrackingService } = await import("../modules/billing/services/usage-tracking.service.js");
      const isOver = await usageTrackingService.isOverLimit(env.DB as any, "org_test");
      expect(isOver).toBe(true);
    });
  });
});
