import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "../helpers/mock-d1.js";
import { AuditLogService } from "../../services/audit-logger.js";

const AUDIT_DDL = `CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  agent_id TEXT,
  model_id TEXT,
  prompt_hash TEXT,
  input_classification TEXT DEFAULT 'internal',
  output_type TEXT,
  approved_by TEXT,
  approved_at TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES organizations(id)
)`;

let db: any;
let service: AuditLogService;

beforeEach(async () => {
  db = createMockD1();
  await db.exec(AUDIT_DDL);
  await db.exec("CREATE INDEX IF NOT EXISTS idx_audit_tenant_date ON audit_logs(tenant_id, created_at)");
  await db.exec("CREATE INDEX IF NOT EXISTS idx_audit_event_type ON audit_logs(event_type)");
  await db.exec("CREATE INDEX IF NOT EXISTS idx_audit_agent ON audit_logs(agent_id)");
  service = new AuditLogService(db);
});

describe("Audit Routes (서비스 통합)", () => {
  // ─── POST /api/audit/log 시뮬레이션 ───

  it("POST /api/audit/log — 정상 기록 (201)", async () => {
    const result = await service.logEvent({
      tenantId: "org_test",
      eventType: "ai_generation",
      agentId: "agent-1",
      modelId: "claude-sonnet",
      metadata: { file: "test.ts" },
    });

    expect(result.id).toMatch(/^audit-/);
    expect(result.recorded).toBe(true);
  });

  it("POST /api/audit/log — 필수 필드만", async () => {
    const result = await service.logEvent({
      tenantId: "org_test",
      eventType: "code_commit",
    });

    expect(result.recorded).toBe(true);
    const row = await db.prepare("SELECT * FROM audit_logs WHERE id = ?").bind(result.id).first();
    expect(row.input_classification).toBe("internal");
  });

  it("POST /api/audit/log — Zod 스키마 검증", async () => {
    const { AuditEventSchema } = await import("../../schemas/audit.js");

    // 필수 필드 누락
    expect(AuditEventSchema.safeParse({}).success).toBe(false);
    expect(AuditEventSchema.safeParse({ tenantId: "org_test" }).success).toBe(false);

    // 잘못된 eventType
    expect(
      AuditEventSchema.safeParse({ tenantId: "org_test", eventType: "invalid_type" }).success,
    ).toBe(false);

    // 정상
    expect(
      AuditEventSchema.safeParse({ tenantId: "org_test", eventType: "ai_generation" }).success,
    ).toBe(true);
  });

  // ─── GET /api/audit/logs 시뮬레이션 ───

  it("GET /api/audit/logs — 필터링 조회", async () => {
    await service.logEvent({ tenantId: "org_test", eventType: "ai_generation", agentId: "agent-1" });
    await service.logEvent({ tenantId: "org_test", eventType: "code_commit" });
    await service.logEvent({ tenantId: "org_test", eventType: "ai_generation", agentId: "agent-2" });

    const result = await service.getEvents("org_test", { eventType: "ai_generation" });
    expect(result.total).toBe(2);
    for (const log of result.logs) {
      expect(log.eventType).toBe("ai_generation");
    }
  });

  it("GET /api/audit/logs — 페이지네이션", async () => {
    for (let i = 0; i < 10; i++) {
      await service.logEvent({ tenantId: "org_test", eventType: "ai_generation" });
    }

    const page1 = await service.getEvents("org_test", { page: 1, pageSize: 5 });
    expect(page1.logs.length).toBe(5);
    expect(page1.total).toBe(10);

    const page2 = await service.getEvents("org_test", { page: 2, pageSize: 5 });
    expect(page2.logs.length).toBe(5);
  });

  it("GET /api/audit/logs — 빈 결과", async () => {
    const result = await service.getEvents("org_nonexistent");
    expect(result.logs.length).toBe(0);
    expect(result.total).toBe(0);
  });

  // ─── 테넌트 격리 ───

  it("테넌트 격리 — 다른 테넌트 데이터 접근 불가", async () => {
    await service.logEvent({ tenantId: "org_A", eventType: "ai_generation" });
    await service.logEvent({ tenantId: "org_A", eventType: "code_commit" });
    await service.logEvent({ tenantId: "org_B", eventType: "ai_generation" });

    const resultA = await service.getEvents("org_A");
    expect(resultA.total).toBe(2);

    const resultB = await service.getEvents("org_B");
    expect(resultB.total).toBe(1);

    const statsA = await service.getStats("org_A", 7);
    expect(statsA.total).toBe(2);

    const statsB = await service.getStats("org_B", 7);
    expect(statsB.total).toBe(1);
  });

  // ─── GET /api/audit/stats 시뮬레이션 ───

  it("GET /api/audit/stats — 통계 조회", async () => {
    await service.logEvent({ tenantId: "org_test", eventType: "ai_generation" });
    await service.logEvent({ tenantId: "org_test", eventType: "ai_generation" });
    await service.logEvent({ tenantId: "org_test", eventType: "policy_violation" });

    const stats = await service.getStats("org_test", 7);
    expect(stats.total).toBe(3);
    expect(stats.stats.length).toBe(2);
  });
});
