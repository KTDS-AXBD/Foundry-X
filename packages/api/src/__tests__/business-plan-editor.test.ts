/**
 * Sprint 215: 사업기획서 편집기 테스트 (F444)
 */
import { describe, it, expect, beforeEach } from "vitest";
import { app } from "../app.js";
import { createTestEnv, createAuthHeaders } from "./helpers/test-app.js";
import { BusinessPlanEditorService } from "../core/offering/services/business-plan-editor-service.js";

let env: ReturnType<typeof createTestEnv>;

function req(method: string, path: string, opts?: { body?: unknown; headers?: Record<string, string> }) {
  return app.request(`http://localhost${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...opts?.headers },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  }, env);
}

const SAMPLE_CONTENT = `# 사업계획서 초안 — 테스트

> 2026-04-08 | Foundry-X Discovery Pipeline

---

## 1. 요약 (Executive Summary)

테스트 요약 내용

## 2. 사업 개요 (Business Overview)

사업 개요 내용

## 3. 문제 정의 및 기회

문제 정의 내용

## 4. 솔루션 및 가치 제안

솔루션 내용

## 5. 시장 분석

시장 분석 내용

## 6. 경쟁 환경 및 차별화

경쟁 환경 내용

## 7. 사업 모델 (Revenue Model)

수익 모델 내용

## 8. 실행 계획 (Go-to-Market)

실행 계획 내용

## 9. 리스크 및 대응 전략

리스크 내용

## 10. 부록 — 평가 결과

평가 결과 내용
`;

function seedBizItem(id = "item-1") {
  (env.DB as any).exec(
    `INSERT OR IGNORE INTO biz_items (id, org_id, title, source, status, created_at, updated_at) VALUES ('${id}', 'org_test', '테스트 사업 아이템', 'manual', 'active', '2026-04-08T00:00:00Z', '2026-04-08T00:00:00Z')`,
  );
}

function seedDraft(bizItemId = "item-1", version = 1) {
  const draftId = `draft-${bizItemId}-${version}`;
  const escapedContent = SAMPLE_CONTENT.replace(/'/g, "''");
  (env.DB as any).exec(
    `INSERT OR IGNORE INTO business_plan_drafts (id, biz_item_id, version, content, sections_snapshot, model_used, tokens_used, generated_at) VALUES ('${draftId}', '${bizItemId}', ${version}, '${escapedContent}', NULL, NULL, 0, '2026-04-08T00:00:00Z')`,
  );
  return draftId;
}

beforeEach(() => {
  env = createTestEnv();
  seedBizItem();
});

describe("BusinessPlanEditorService", () => {
  it("getSections — draft에서 10섹션 파싱", async () => {
    seedDraft();
    const svc = new BusinessPlanEditorService(env.DB as unknown as D1Database);
    const sections = await svc.getSections("item-1");
    expect(sections).toHaveLength(10);
    expect(sections.at(0)?.sectionNum).toBe(1);
    expect(sections.at(9)?.sectionNum).toBe(10);
    expect(sections.at(0)?.content).toContain("테스트 요약 내용");
  });

  it("getSections — draft 없으면 빈 배열 반환", async () => {
    const svc = new BusinessPlanEditorService(env.DB as unknown as D1Database);
    const sections = await svc.getSections("no-draft-item");
    expect(sections).toHaveLength(0);
  });

  it("updateSection — DB에 섹션 내용 저장", async () => {
    seedDraft();
    const svc = new BusinessPlanEditorService(env.DB as unknown as D1Database);
    const updated = await svc.updateSection("item-1", 1, "새로운 요약 내용");
    expect(updated.sectionNum).toBe(1);
    expect(updated.content).toBe("새로운 요약 내용");
    expect(updated.updatedAt).toBeTruthy();
  });

  it("saveDraft — 섹션 조합 후 새 버전 생성", async () => {
    seedDraft("item-1", 1);
    const svc = new BusinessPlanEditorService(env.DB as unknown as D1Database);
    await svc.getSections("item-1");
    await svc.updateSection("item-1", 1, "수정된 요약");
    const newDraft = await svc.saveDraft("item-1", "편집본");
    expect(newDraft.version).toBe(2);
    expect(newDraft.content).toContain("수정된 요약");
  });

  it("diffVersions — 변경 섹션 감지", async () => {
    seedDraft("item-1", 1);
    const svc = new BusinessPlanEditorService(env.DB as unknown as D1Database);
    await svc.getSections("item-1");
    await svc.updateSection("item-1", 1, "변경된 요약");
    await svc.saveDraft("item-1");
    const diff = await svc.diffVersions("item-1", 1, 2);
    expect(diff.v1.version).toBe(1);
    expect(diff.v2.version).toBe(2);
    const section1Diff = diff.sections.find(s => s.num === 1);
    expect(section1Diff?.changed).toBe(true);
    expect(section1Diff?.v2Content).toContain("변경된 요약");
  });

  it("diffVersions — 없는 버전 에러", async () => {
    seedDraft("item-1", 1);
    const svc = new BusinessPlanEditorService(env.DB as unknown as D1Database);
    await expect(svc.diffVersions("item-1", 1, 99)).rejects.toThrow("Version 99 not found");
  });

  it("regenerateSection — runner 없으면 기존 content 반환", async () => {
    seedDraft();
    const svc = new BusinessPlanEditorService(env.DB as unknown as D1Database);
    const content = await svc.regenerateSection("item-1", 1);
    expect(typeof content).toBe("string");
  });
});

describe("GET /biz-items/:id/business-plan/sections", () => {
  it("200 + 섹션 배열 반환", async () => {
    seedDraft();
    const headers = await createAuthHeaders();
    const res = await req("GET", "/api/biz-items/item-1/business-plan/sections", { headers });
    expect(res.status).toBe(200);
    const data = await res.json() as { sections: unknown[] };
    expect(Array.isArray(data.sections)).toBe(true);
    expect(data.sections.length).toBeGreaterThan(0);
  });
});

describe("PATCH /biz-items/:id/business-plan/sections/:num", () => {
  it("200 + 업데이트된 섹션 반환", async () => {
    seedDraft();
    const headers = await createAuthHeaders();
    // 먼저 섹션 초기화
    await req("GET", "/api/biz-items/item-1/business-plan/sections", { headers });
    const res = await req("PATCH", "/api/biz-items/item-1/business-plan/sections/1", {
      headers,
      body: { content: "API로 수정된 요약" },
    });
    expect(res.status).toBe(200);
    const section = await res.json() as { sectionNum: number; content: string };
    expect(section.sectionNum).toBe(1);
    expect(section.content).toBe("API로 수정된 요약");
  });

  it("400 — 잘못된 섹션 번호", async () => {
    const headers = await createAuthHeaders();
    const res = await req("PATCH", "/api/biz-items/item-1/business-plan/sections/99", {
      headers,
      body: { content: "내용" },
    });
    expect(res.status).toBe(400);
  });
});

describe("POST /biz-items/:id/business-plan/sections/:num/regenerate", () => {
  it("200 + content 반환", async () => {
    seedDraft();
    const headers = await createAuthHeaders();
    await req("GET", "/api/biz-items/item-1/business-plan/sections", { headers });
    const res = await req("POST", "/api/biz-items/item-1/business-plan/sections/1/regenerate", {
      headers,
      body: {},
    });
    expect(res.status).toBe(200);
    const data = await res.json() as { sectionNum: number; content: string };
    expect(data.sectionNum).toBe(1);
    expect(typeof data.content).toBe("string");
  });
});

describe("POST /biz-items/:id/business-plan/save", () => {
  it("201 + 새 버전 반환", async () => {
    seedDraft("item-1", 1);
    const headers = await createAuthHeaders();
    await req("GET", "/api/biz-items/item-1/business-plan/sections", { headers });
    const res = await req("POST", "/api/biz-items/item-1/business-plan/save", {
      headers,
      body: { note: "편집 저장" },
    });
    expect(res.status).toBe(201);
    const draft = await res.json() as { version: number; content: string };
    expect(draft.version).toBe(2);
    expect(draft.content).toBeTruthy();
  });
});

describe("GET /biz-items/:id/business-plan/diff", () => {
  it("200 + diff 구조 반환", async () => {
    seedDraft("item-1", 1);
    const headers = await createAuthHeaders();
    // 새 버전 생성
    await req("GET", "/api/biz-items/item-1/business-plan/sections", { headers });
    await req("PATCH", "/api/biz-items/item-1/business-plan/sections/2", {
      headers,
      body: { content: "변경된 개요" },
    });
    await req("POST", "/api/biz-items/item-1/business-plan/save", { headers, body: {} });

    const res = await req("GET", "/api/biz-items/item-1/business-plan/diff?v1=1&v2=2", { headers });
    expect(res.status).toBe(200);
    const data = await res.json() as { v1: { version: number }; v2: { version: number }; sections: unknown[] };
    expect(data.v1.version).toBe(1);
    expect(data.v2.version).toBe(2);
    expect(Array.isArray(data.sections)).toBe(true);
  });

  it("400 — v1/v2 파라미터 없음", async () => {
    const headers = await createAuthHeaders();
    const res = await req("GET", "/api/biz-items/item-1/business-plan/diff", { headers });
    expect(res.status).toBe(400);
  });
});
