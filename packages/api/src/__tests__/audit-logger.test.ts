import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { AuditLogService } from "../core/harness/services/audit-logger.js";

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

describe("AuditLogService", () => {
  // ─── logEvent ───

  it("logEvent — 전체 필드 기록 성공", async () => {
    const result = await service.logEvent({
      tenantId: "org_test",
      eventType: "ai_generation",
      agentId: "agent-1",
      modelId: "claude-sonnet",
      promptHash: "abc123",
      inputClassification: "internal",
      outputType: "code",
      approvedBy: "user-1",
      metadata: { file: "index.ts" },
    });

    expect(result.id).toMatch(/^audit-/);
    expect(result.recorded).toBe(true);

    const row = await db.prepare("SELECT * FROM audit_logs WHERE id = ?").bind(result.id).first();
    expect(row.tenant_id).toBe("org_test");
    expect(row.event_type).toBe("ai_generation");
    expect(row.agent_id).toBe("agent-1");
    expect(row.model_id).toBe("claude-sonnet");
    expect(row.approved_by).toBe("user-1");
    expect(row.approved_at).not.toBeNull();
    expect(JSON.parse(row.metadata)).toEqual({ file: "index.ts" });
  });

  it("logEvent — 필수 필드만으로 기록", async () => {
    const result = await service.logEvent({
      tenantId: "org_test",
      eventType: "code_commit",
    });

    expect(result.recorded).toBe(true);

    const row = await db.prepare("SELECT * FROM audit_logs WHERE id = ?").bind(result.id).first();
    expect(row.event_type).toBe("code_commit");
    expect(row.agent_id).toBeNull();
    expect(row.model_id).toBeNull();
    expect(row.input_classification).toBe("internal");
    expect(row.approved_by).toBeNull();
    expect(row.approved_at).toBeNull();
  });

  it("logEvent — metadata JSON 저장", async () => {
    const result = await service.logEvent({
      tenantId: "org_test",
      eventType: "ai_review",
      metadata: { score: 95, issues: ["typo", "style"] },
    });

    const row = await db.prepare("SELECT metadata FROM audit_logs WHERE id = ?").bind(result.id).first();
    const parsed = JSON.parse(row.metadata);
    expect(parsed.score).toBe(95);
    expect(parsed.issues).toEqual(["typo", "style"]);
  });

  // ─── getEvents ───

  it("getEvents — 전체 조회 + 페이지네이션", async () => {
    for (let i = 0; i < 5; i++) {
      await service.logEvent({ tenantId: "org_test", eventType: "ai_generation" });
    }

    const result = await service.getEvents("org_test", { page: 1, pageSize: 3 });
    expect(result.logs.length).toBe(3);
    expect(result.total).toBe(5);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(3);

    const page2 = await service.getEvents("org_test", { page: 2, pageSize: 3 });
    expect(page2.logs.length).toBe(2);
  });

  it("getEvents — eventType 필터", async () => {
    await service.logEvent({ tenantId: "org_test", eventType: "ai_generation" });
    await service.logEvent({ tenantId: "org_test", eventType: "code_commit" });
    await service.logEvent({ tenantId: "org_test", eventType: "ai_generation" });

    const result = await service.getEvents("org_test", { eventType: "ai_generation" });
    expect(result.total).toBe(2);
    for (const log of result.logs) {
      expect(log.eventType).toBe("ai_generation");
    }
  });

  it("getEvents — agentId 필터", async () => {
    await service.logEvent({ tenantId: "org_test", eventType: "agent_execution", agentId: "agent-A" });
    await service.logEvent({ tenantId: "org_test", eventType: "agent_execution", agentId: "agent-B" });

    const result = await service.getEvents("org_test", { agentId: "agent-A" });
    expect(result.total).toBe(1);
    expect(result.logs[0]!.agentId).toBe("agent-A");
  });

  it("getEvents — 날짜 범위 필터", async () => {
    await service.logEvent({ tenantId: "org_test", eventType: "ai_generation" });

    const future = new Date(Date.now() + 86400_000).toISOString();
    const result = await service.getEvents("org_test", { startDate: future });
    expect(result.total).toBe(0);
    expect(result.logs.length).toBe(0);
  });

  it("getEvents — 빈 결과", async () => {
    const result = await service.getEvents("org_empty");
    expect(result.total).toBe(0);
    expect(result.logs.length).toBe(0);
    expect(result.page).toBe(1);
  });

  it("getEvents — 테넌트 격리", async () => {
    await service.logEvent({ tenantId: "org_A", eventType: "ai_generation" });
    await service.logEvent({ tenantId: "org_B", eventType: "ai_generation" });

    const resultA = await service.getEvents("org_A");
    expect(resultA.total).toBe(1);
    expect(resultA.logs[0]!.tenantId).toBe("org_A");

    const resultB = await service.getEvents("org_B");
    expect(resultB.total).toBe(1);
    expect(resultB.logs[0]!.tenantId).toBe("org_B");
  });

  // ─── getStats ───

  it("getStats — 기간별 통계", async () => {
    await service.logEvent({ tenantId: "org_test", eventType: "ai_generation" });
    await service.logEvent({ tenantId: "org_test", eventType: "ai_generation" });
    await service.logEvent({ tenantId: "org_test", eventType: "code_commit" });

    const stats = await service.getStats("org_test", 7);
    expect(stats.total).toBe(3);
    expect(stats.stats.length).toBe(2);
    expect(stats.period.from).toBeDefined();
    expect(stats.period.to).toBeDefined();

    const genStat = stats.stats.find((s) => s.eventType === "ai_generation");
    expect(genStat?.count).toBe(2);

    const commitStat = stats.stats.find((s) => s.eventType === "code_commit");
    expect(commitStat?.count).toBe(1);
  });

  it("getStats — 빈 결과", async () => {
    const stats = await service.getStats("org_empty", 7);
    expect(stats.total).toBe(0);
    expect(stats.stats.length).toBe(0);
  });
});
