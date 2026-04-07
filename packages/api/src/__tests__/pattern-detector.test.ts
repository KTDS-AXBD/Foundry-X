// ─── F358: PatternDetectorService 테스트 (Sprint 161) ───

import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { PatternDetectorService } from "../core/harness/services/pattern-detector-service.js";

const DDL = `
  CREATE TABLE IF NOT EXISTS execution_events (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    source TEXT NOT NULL,
    severity TEXT NOT NULL,
    payload TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
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
`;

const exec = (db: D1Database, q: string) =>
  (db as unknown as { exec: (q: string) => Promise<void> }).exec(q);

const T = "org-test";

async function insertEvent(
  db: D1Database,
  id: string,
  source: string,
  severity: string,
  payload = "{}",
) {
  await db
    .prepare(
      `INSERT INTO execution_events (id, task_id, tenant_id, source, severity, payload, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
    )
    .bind(id, "task-1", T, source, severity, payload)
    .run();
}

describe("PatternDetectorService", () => {
  let db: D1Database;
  let svc: PatternDetectorService;

  beforeEach(async () => {
    db = createMockD1() as unknown as D1Database;
    await exec(db, DDL);
    svc = new PatternDetectorService(db);
  });

  it("반복 패턴 있음 — 동일 source:severity 3회 → 1개 패턴 감지", async () => {
    await insertEvent(db, "e1", "hook", "error", '{"stderr":"fail1"}');
    await insertEvent(db, "e2", "hook", "error", '{"stderr":"fail2"}');
    await insertEvent(db, "e3", "hook", "error", '{"stderr":"fail3"}');

    const result = await svc.detect(T, { minOccurrences: 3 });
    expect(result.patternsFound).toBe(1);
    expect(result.patternsNew).toBe(1);
    expect(result.patterns[0]!.patternKey).toBe("hook:error");
    expect(result.patterns[0]!.occurrenceCount).toBe(3);
    expect(result.patterns[0]!.sampleEventIds.length).toBeGreaterThan(0);
  });

  it("임계값 미달 — 2회만 → 패턴 0개", async () => {
    await insertEvent(db, "e1", "hook", "error");
    await insertEvent(db, "e2", "hook", "error");

    const result = await svc.detect(T, { minOccurrences: 3 });
    expect(result.patternsFound).toBe(0);
  });

  it("복수 패턴 — 서로 다른 source:severity 조합", async () => {
    // hook:error 3건
    await insertEvent(db, "e1", "hook", "error");
    await insertEvent(db, "e2", "hook", "error");
    await insertEvent(db, "e3", "hook", "error");
    // agent:critical 3건
    await insertEvent(db, "e4", "agent", "critical");
    await insertEvent(db, "e5", "agent", "critical");
    await insertEvent(db, "e6", "agent", "critical");

    const result = await svc.detect(T, { minOccurrences: 3 });
    expect(result.patternsFound).toBe(2);
    const keys = result.patterns.map((p) => p.patternKey).sort();
    expect(keys).toEqual(["agent:critical", "hook:error"]);
  });

  it("기존 패턴 업데이트 — occurrence_count 갱신", async () => {
    // 먼저 3건으로 감지
    await insertEvent(db, "e1", "hook", "error");
    await insertEvent(db, "e2", "hook", "error");
    await insertEvent(db, "e3", "hook", "error");
    const first = await svc.detect(T, { minOccurrences: 3 });
    expect(first.patternsNew).toBe(1);

    // 추가 2건 후 재감지
    await insertEvent(db, "e4", "hook", "error");
    await insertEvent(db, "e5", "hook", "error");
    const second = await svc.detect(T, { minOccurrences: 3 });
    expect(second.patternsUpdated).toBe(1);
    expect(second.patternsNew).toBe(0);
    expect(second.patterns[0]!.occurrenceCount).toBe(5);
  });

  it("info/warning 이벤트는 무시", async () => {
    await insertEvent(db, "e1", "hook", "info");
    await insertEvent(db, "e2", "hook", "info");
    await insertEvent(db, "e3", "hook", "info");
    await insertEvent(db, "e4", "hook", "warning");

    const result = await svc.detect(T, { minOccurrences: 3 });
    expect(result.patternsFound).toBe(0);
  });
});
