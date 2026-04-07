// F360: O-G-D Generic Runner 테스트 (Sprint 163)

import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { OgdDomainRegistry } from "../core/harness/services/ogd-domain-registry.js";
import { OgdGenericRunner, OgdDomainNotFoundError } from "../core/harness/services/ogd-generic-runner.js";
import type { DomainAdapterInterface } from "@foundry-x/shared";

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS ogd_domains (
    id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, domain TEXT NOT NULL,
    display_name TEXT NOT NULL, description TEXT,
    adapter_type TEXT NOT NULL DEFAULT 'builtin',
    default_rubric TEXT, default_max_rounds INTEGER NOT NULL DEFAULT 3,
    default_min_score REAL NOT NULL DEFAULT 0.85,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(tenant_id, domain)
  );
  CREATE TABLE IF NOT EXISTS ogd_runs (
    id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, domain TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', input_summary TEXT,
    total_rounds INTEGER NOT NULL DEFAULT 0, best_score REAL,
    converged INTEGER NOT NULL DEFAULT 0, error_message TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS ogd_run_rounds (
    id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES ogd_runs(id),
    round_number INTEGER NOT NULL, generator_output TEXT,
    quality_score REAL, feedback TEXT, passed INTEGER NOT NULL DEFAULT 0,
    duration_ms INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

/** 점수를 라운드마다 올리는 mock adapter */
function createMockAdapter(
  domain: string,
  scores: number[],
): DomainAdapterInterface {
  let round = 0;
  return {
    domain,
    displayName: `Mock ${domain}`,
    description: `Mock adapter for ${domain}`,
    generate: async (_input: unknown, _feedback?: string) => {
      return { output: `Generated output round ${round + 1}` };
    },
    discriminate: async (_output: unknown, _rubric: string) => {
      const score = scores[round] ?? scores[scores.length - 1] ?? 0;
      round++;
      return {
        score,
        feedback: `Feedback round ${round}: score=${score}`,
        pass: score >= 0.85,
      };
    },
    getDefaultRubric: () => "Default rubric for testing",
  };
}

/** generate()에서 에러를 던지는 mock adapter */
function createErrorAdapter(domain: string): DomainAdapterInterface {
  return {
    domain,
    displayName: "Error adapter",
    description: "Throws on generate",
    generate: async () => {
      throw new Error("Generation failed");
    },
    discriminate: async () => ({ score: 0, feedback: "", pass: false }),
    getDefaultRubric: () => "rubric",
  };
}

describe("OgdGenericRunner", () => {
  let db: ReturnType<typeof createMockD1>;
  let registry: OgdDomainRegistry;

  beforeEach(() => {
    db = createMockD1();
    void db.exec(SCHEMA);
    registry = new OgdDomainRegistry();
  });

  it("TC-01: 1라운드 수렴 (score >= minScore)", async () => {
    registry.register(createMockAdapter("test", [0.9]));
    const runner = new OgdGenericRunner(registry, db as unknown as D1Database);

    const result = await runner.run({
      domain: "test",
      input: { data: "hello" },
      tenantId: "org_1",
    });

    expect(result.converged).toBe(true);
    expect(result.iterations).toBe(1);
    expect(result.score).toBeGreaterThanOrEqual(0.85);
    expect(result.domain).toBe("test");
    expect(result.rounds).toHaveLength(1);
    expect(result.rounds[0]!.passed).toBe(true);
  });

  it("TC-02: 3라운드 수렴 (점수 상승)", async () => {
    registry.register(createMockAdapter("test", [0.5, 0.7, 0.9]));
    const runner = new OgdGenericRunner(registry, db as unknown as D1Database);

    const result = await runner.run({
      domain: "test",
      input: { data: "hello" },
      tenantId: "org_1",
    });

    expect(result.converged).toBe(true);
    expect(result.iterations).toBe(3);
    expect(result.score).toBe(0.9);
    expect(result.rounds).toHaveLength(3);
    expect(result.rounds[0]!.passed).toBe(false);
    expect(result.rounds[2]!.passed).toBe(true);
  });

  it("TC-03: maxRounds 소진 미수렴", async () => {
    registry.register(createMockAdapter("test", [0.3, 0.4, 0.5]));
    const runner = new OgdGenericRunner(registry, db as unknown as D1Database);

    const result = await runner.run({
      domain: "test",
      input: { data: "hello" },
      tenantId: "org_1",
      maxRounds: 3,
    });

    expect(result.converged).toBe(false);
    expect(result.iterations).toBe(3);
    expect(result.score).toBe(0.5);
  });

  it("TC-04: 존재하지 않는 도메인 → OgdDomainNotFoundError", async () => {
    const runner = new OgdGenericRunner(registry, db as unknown as D1Database);

    await expect(
      runner.run({
        domain: "nonexistent",
        input: {},
        tenantId: "org_1",
      }),
    ).rejects.toThrow(OgdDomainNotFoundError);
  });

  it("TC-05: adapter.generate() 에러 → failed 상태", async () => {
    registry.register(createErrorAdapter("broken"));
    const runner = new OgdGenericRunner(registry, db as unknown as D1Database);

    const result = await runner.run({
      domain: "broken",
      input: {},
      tenantId: "org_1",
    });

    expect(result.converged).toBe(false);
    expect(result.rounds[0]!.feedback).toContain("Error: Generation failed");

    // DB에 failed 상태 확인
    const row = await db
      .prepare("SELECT status, error_message FROM ogd_runs WHERE tenant_id = ?")
      .bind("org_1")
      .first();
    expect(row!.status).toBe("failed");
    expect(row!.error_message).toBe("Generation failed");
  });

  it("TC-06: 커스텀 rubric 전달", async () => {
    let capturedRubric = "";
    const adapter: DomainAdapterInterface = {
      domain: "custom-rubric",
      displayName: "Custom",
      description: "Test",
      generate: async () => ({ output: "gen" }),
      discriminate: async (_output, rubric) => {
        capturedRubric = rubric;
        return { score: 0.9, feedback: "ok", pass: true };
      },
      getDefaultRubric: () => "default",
    };
    registry.register(adapter);
    const runner = new OgdGenericRunner(registry, db as unknown as D1Database);

    await runner.run({
      domain: "custom-rubric",
      input: {},
      rubric: "My custom rubric",
      tenantId: "org_1",
    });

    expect(capturedRubric).toBe("My custom rubric");
  });

  it("getRunHistory: 실행 이력 조회", async () => {
    registry.register(createMockAdapter("test", [0.9]));
    const runner = new OgdGenericRunner(registry, db as unknown as D1Database);

    await runner.run({ domain: "test", input: {}, tenantId: "org_1" });
    await runner.run({ domain: "test", input: {}, tenantId: "org_1" });

    const history = await runner.getRunHistory("org_1");
    expect(history).toHaveLength(2);
    expect(history[0]!.domain).toBe("test");
  });

  it("getRunById: 특정 실행 조회", async () => {
    registry.register(createMockAdapter("test", [0.9]));
    const runner = new OgdGenericRunner(registry, db as unknown as D1Database);

    const result = await runner.run({ domain: "test", input: {}, tenantId: "org_1" });

    const found = await runner.getRunById(result.runId, "org_1");
    expect(found).not.toBeNull();
    expect(found?.domain).toBe("test");
    expect(found?.rounds).toHaveLength(1);
  });

  it("getRunById: 존재하지 않는 runId → null", async () => {
    const runner = new OgdGenericRunner(registry, db as unknown as D1Database);
    const found = await runner.getRunById("non-existent", "org_1");
    expect(found).toBeNull();
  });
});
