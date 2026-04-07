// ─── F358: RuleGeneratorService 테스트 (Sprint 161) ───

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { RuleGeneratorService } from "../core/harness/services/rule-generator-service.js";

const DDL = `
  CREATE TABLE IF NOT EXISTS failure_patterns (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    pattern_key TEXT NOT NULL,
    occurrence_count INTEGER NOT NULL,
    first_seen TEXT NOT NULL,
    last_seen TEXT NOT NULL,
    sample_event_ids TEXT,
    sample_payloads TEXT,
    status TEXT NOT NULL DEFAULT 'detected',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_fp_pattern ON failure_patterns(tenant_id, pattern_key);
  CREATE TABLE IF NOT EXISTS guard_rail_proposals (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    pattern_id TEXT NOT NULL,
    rule_content TEXT NOT NULL,
    rule_filename TEXT NOT NULL,
    rationale TEXT NOT NULL,
    llm_model TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    reviewed_at TEXT,
    reviewed_by TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

const exec = (db: D1Database, q: string) =>
  (db as unknown as { exec: (q: string) => Promise<void> }).exec(q);

const T = "org-test";

const MOCK_RULE_CONTENT = `# Guard Rail: Hook Error Prevention

## Rule
When PostToolUse hook reports exit code 1, retry with --fix flag before failing.

## Context
Generated from recurring hook:error pattern (3+ occurrences).`;

function mockFetch() {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        content: [{ type: "text", text: MOCK_RULE_CONTENT }],
        usage: { input_tokens: 100, output_tokens: 200 },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ),
  );
}

async function insertPattern(db: D1Database, id: string, patternKey: string) {
  await db
    .prepare(
      `INSERT INTO failure_patterns (id, tenant_id, pattern_key, occurrence_count, first_seen, last_seen, sample_event_ids, sample_payloads, status, created_at, updated_at)
       VALUES (?, ?, ?, 5, '2026-03-01', '2026-04-06', '["e1","e2"]', '[{"stderr":"err"}]', 'detected', datetime('now'), datetime('now'))`,
    )
    .bind(id, T, patternKey)
    .run();
}

describe("RuleGeneratorService", () => {
  let db: D1Database;
  let svc: RuleGeneratorService;

  beforeEach(async () => {
    db = createMockD1() as unknown as D1Database;
    await exec(db, DDL);
    svc = new RuleGeneratorService(db, "test-api-key");
    vi.restoreAllMocks();
  });

  it("Rule 생성 성공 — LLM mock → .claude/rules/ 포맷 검증", async () => {
    const fetchSpy = mockFetch();
    await insertPattern(db, "p1", "hook:error");

    const result = await svc.generate(T);
    expect(result.proposalsCreated).toBe(1);
    expect(result.proposals[0]!.ruleContent).toContain("# Guard Rail");
    expect(result.proposals[0]!.ruleFilename).toBe("auto-guard-001.md");
    expect(result.proposals[0]!.llmModel).toContain("haiku");
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it("패턴 없으면 빈 결과", async () => {
    const result = await svc.generate(T);
    expect(result.proposalsCreated).toBe(0);
    expect(result.proposals).toEqual([]);
  });

  it("근거 주석 포함 — rationale에 패턴 출처, 실패 사례 수, 기간", async () => {
    mockFetch();
    await insertPattern(db, "p1", "agent:critical");

    const result = await svc.generate(T);
    const rationale = result.proposals[0]!.rationale;
    expect(rationale).toContain("agent:critical");
    expect(rationale).toContain("5 times");
    expect(rationale).toContain("2026-03-01");
    expect(rationale).toContain("2026-04-06");
  });

  it("생성 후 패턴 status → proposed", async () => {
    mockFetch();
    await insertPattern(db, "p1", "hook:error");

    await svc.generate(T);

    const row = await db
      .prepare("SELECT status FROM failure_patterns WHERE id = ?")
      .bind("p1")
      .first<{ status: string }>();
    expect(row!.status).toBe("proposed");
  });

  it("LLM 호출 실패 시 graceful — 빈 결과", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("error", { status: 500 }),
    );
    await insertPattern(db, "p1", "hook:error");

    const result = await svc.generate(T);
    expect(result.proposalsCreated).toBe(0);
  });
});
