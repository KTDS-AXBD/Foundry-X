// F629: 5-Asset Model — SystemKnowledgeService TDD Red Phase
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SystemKnowledgeService } from "./system-knowledge.service.js";

function makeD1Mock() {
  const rows: Record<string, unknown>[] = [];
  const mock = {
    rows,
    prepare: vi.fn().mockImplementation(() => ({
      bind: vi.fn().mockImplementation(() => ({
        run: vi.fn().mockResolvedValue({ success: true }),
        first: vi.fn().mockImplementation(() => Promise.resolve(rows[0] ?? null)),
      })),
    })),
  };
  return mock;
}

describe("F629: SystemKnowledgeService", () => {
  let db: ReturnType<typeof makeD1Mock>;
  let svc: SystemKnowledgeService;

  beforeEach(() => {
    db = makeD1Mock();
    svc = new SystemKnowledgeService(db as unknown as D1Database);
  });

  it("T1: registerKnowledge — D1 INSERT를 1회 호출한다", async () => {
    const input = {
      orgId: "org-1",
      title: "SOP 문서",
      contentRef: "knowledge/sop/foo.md",
      contentType: "sop" as const,
    };
    db.rows.push({
      id: "uuid-1",
      org_id: "org-1",
      asset_type: "system_knowledge",
      title: "SOP 문서",
      content_ref: "knowledge/sop/foo.md",
      content_type: "sop",
      metadata: null,
      created_by: null,
      created_at: 1000,
      updated_at: 1000,
    });
    await svc.registerKnowledge(input);
    expect(db.prepare).toHaveBeenCalled();
  });

  it("T2: registerKnowledge — 반환값이 올바른 구조를 가진다", async () => {
    const input = {
      orgId: "org-1",
      title: "도메인 룰",
      contentRef: "knowledge/rules/domain.md",
      contentType: "domain_rule" as const,
      createdBy: "user-1",
    };
    db.rows.push({
      id: "uuid-2",
      org_id: "org-1",
      asset_type: "system_knowledge",
      title: "도메인 룰",
      content_ref: "knowledge/rules/domain.md",
      content_type: "domain_rule",
      metadata: null,
      created_by: "user-1",
      created_at: 2000,
      updated_at: 2000,
    });
    const result = await svc.registerKnowledge(input);
    expect(result.orgId).toBe("org-1");
    expect(result.assetType).toBe("system_knowledge");
    expect(result.title).toBe("도메인 룰");
    expect(result.contentRef).toBe("knowledge/rules/domain.md");
    expect(result.contentType).toBe("domain_rule");
    expect(typeof result.id).toBe("string");
  });

  it("T3: getKnowledge — D1 SELECT를 1회 호출한다", async () => {
    db.rows.push({
      id: "uuid-3",
      org_id: "org-2",
      asset_type: "system_knowledge",
      title: "트랜스크립트",
      content_ref: "knowledge/transcript/t1.md",
      content_type: "transcript",
      metadata: null,
      created_by: null,
      created_at: 3000,
      updated_at: 3000,
    });
    await svc.getKnowledge("uuid-3");
    expect(db.prepare).toHaveBeenCalled();
  });

  it("T4: getKnowledge — 없는 id이면 null을 반환한다", async () => {
    // rows 비어있으므로 first()가 null 반환
    const result = await svc.getKnowledge("non-existent-id");
    expect(result).toBeNull();
  });
});
