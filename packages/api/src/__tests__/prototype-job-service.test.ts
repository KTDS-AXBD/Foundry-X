import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { PrototypeJobService } from "../services/prototype-job-service.js";

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS prototype_jobs (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    prd_content TEXT NOT NULL,
    prd_title TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'queued'
      CHECK(status IN ('queued','building','deploying','live','failed','deploy_failed','dead_letter')),
    builder_type TEXT NOT NULL DEFAULT 'cli'
      CHECK(builder_type IN ('cli','api','ensemble')),
    pages_project TEXT,
    pages_url TEXT,
    build_log TEXT DEFAULT '',
    error_message TEXT,
    cost_input_tokens INTEGER DEFAULT 0,
    cost_output_tokens INTEGER DEFAULT 0,
    cost_usd REAL DEFAULT 0.0,
    model_used TEXT DEFAULT 'haiku',
    fallback_used INTEGER DEFAULT 0,
    retry_count INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    started_at INTEGER,
    completed_at INTEGER
  );
`;

function setupDb() {
  const db = createMockD1();
  // D1 mock의 exec 메서드로 스키마 생성 (child_process.exec 아님)
  void db.exec(SCHEMA);
  return db;
}

describe("PrototypeJobService", () => {
  let db: ReturnType<typeof createMockD1>;
  let svc: PrototypeJobService;
  const ORG = "org-test";

  beforeEach(() => {
    db = setupDb();
    svc = new PrototypeJobService(db as unknown as D1Database);
  });

  it("queued 상태로 Job을 생성해요", async () => {
    const job = await svc.create(ORG, "# PRD\n테스트 항목", "테스트 PRD");
    expect(job.status).toBe("queued");
    expect(job.orgId).toBe(ORG);
    expect(job.prdTitle).toBe("테스트 PRD");
    expect(job.retryCount).toBe(0);
    expect(job.fallbackUsed).toBe(false);
  });

  it("org_id로 격리된 목록을 조회해요", async () => {
    await svc.create(ORG, "PRD A content here", "A");
    await svc.create(ORG, "PRD B content here", "B");
    await svc.create("other-org", "PRD C content here", "C");

    const result = await svc.list(ORG, { limit: 10, offset: 0 });
    expect(result.total).toBe(2);
    expect(result.items).toHaveLength(2);
  });

  it("status 필터로 목록을 조회해요", async () => {
    const job = await svc.create(ORG, "PRD filtering content", "T");
    await svc.transition(job.id, ORG, "building");
    await svc.create(ORG, "PRD2 filtering content", "T2");

    const result = await svc.list(ORG, { status: "queued", limit: 10, offset: 0 });
    expect(result.total).toBe(1);
    expect(result.items[0]!.status).toBe("queued");
  });

  it("상세 조회 시 빌드 로그가 포함돼요", async () => {
    const job = await svc.create(ORG, "# PRD\n상세 내용이에요", "상세 테스트");
    await svc.transition(job.id, ORG, "building", { buildLog: "Step 1: init" });

    const detail = await svc.getById(job.id, ORG);
    expect(detail).not.toBeNull();
    expect(detail!.prdContent).toBe("# PRD\n상세 내용이에요");
    expect(detail!.buildLog).toBe("Step 1: init");
  });

  it("없는 Job 상세 조회 시 null이에요", async () => {
    const detail = await svc.getById("non-existent", ORG);
    expect(detail).toBeNull();
  });

  it("queued→building→deploying→live 유효 전이를 해요", async () => {
    const job = await svc.create(ORG, "PRD flow content here", "Flow");
    const building = await svc.transition(job.id, ORG, "building");
    expect(building.status).toBe("building");
    expect(building.startedAt).not.toBeNull();

    const deploying = await svc.transition(job.id, ORG, "deploying", {
      pagesUrl: "https://test.pages.dev",
    });
    expect(deploying.status).toBe("deploying");

    const live = await svc.transition(job.id, ORG, "live");
    expect(live.status).toBe("live");
    expect(live.completedAt).not.toBeNull();
  });

  it("building→failed→queued (retry) 전이를 해요", async () => {
    const job = await svc.create(ORG, "PRD retry content here", "Retry");
    await svc.transition(job.id, ORG, "building");
    const failed = await svc.transition(job.id, ORG, "failed", {
      errorMessage: "Build error",
    });
    expect(failed.status).toBe("failed");

    const retried = await svc.transition(job.id, ORG, "queued");
    expect(retried.status).toBe("queued");
    expect(retried.retryCount).toBe(1);
  });

  it("queued→live 무효 전이 시 에러를 던져요", async () => {
    const job = await svc.create(ORG, "PRD invalid content here", "Invalid");
    await expect(svc.transition(job.id, ORG, "live")).rejects.toThrow(
      "Invalid transition: queued → live",
    );
  });

  it("live→building 무효 전이 시 에러를 던져요", async () => {
    const job = await svc.create(ORG, "PRD invalid2 content here", "Invalid2");
    await svc.transition(job.id, ORG, "building");
    await svc.transition(job.id, ORG, "deploying");
    await svc.transition(job.id, ORG, "live");

    await expect(svc.transition(job.id, ORG, "building")).rejects.toThrow(
      "Invalid transition",
    );
  });

  it("retry_count >= 3이면 queued 대신 에러를 던져요", async () => {
    const job = await svc.create(ORG, "PRD max retry content", "MaxRetry");

    // 3번 full retry cycle → retry_count가 3이 됨
    for (let i = 0; i < 3; i++) {
      await svc.transition(job.id, ORG, "building");
      await svc.transition(job.id, ORG, "failed");
      await svc.transition(job.id, ORG, "queued"); // retry_count: 1, 2, 3
    }

    // 4번째 시도에서 failed 후 queued 시 에러
    await svc.transition(job.id, ORG, "building");
    await svc.transition(job.id, ORG, "failed");
    await expect(svc.transition(job.id, ORG, "queued")).rejects.toThrow(
      "Max retry exceeded",
    );
  });

  it("retry 메서드가 retry_count < 3이면 queued로 복귀해요", async () => {
    const job = await svc.create(ORG, "PRD retry method content", "RetryMethod");
    await svc.transition(job.id, ORG, "building");
    await svc.transition(job.id, ORG, "failed");

    const retried = await svc.retry(job.id, ORG);
    expect(retried.status).toBe("queued");
  });

  it("retry 메서드가 retry_count >= 3이면 dead_letter로 보내요", async () => {
    const job = await svc.create(ORG, "PRD retry deadletter", "RetryDL");

    // 3번 full retry cycle
    for (let i = 0; i < 3; i++) {
      await svc.transition(job.id, ORG, "building");
      await svc.transition(job.id, ORG, "failed");
      await svc.transition(job.id, ORG, "queued"); // retry_count: 1, 2, 3
    }

    // 4번째에서 failed 후 retry → dead_letter
    await svc.transition(job.id, ORG, "building");
    await svc.transition(job.id, ORG, "failed");
    const result = await svc.retry(job.id, ORG);
    expect(result.status).toBe("dead_letter");
  });

  it("PATCH로 status + buildLog + costUsd를 동시에 변경해요", async () => {
    const job = await svc.create(ORG, "PRD patch content here", "Patch");
    const updated = await svc.transition(job.id, ORG, "building", {
      buildLog: "Building...",
      costInputTokens: 5000,
      costOutputTokens: 2000,
      costUsd: 0.012,
      modelUsed: "haiku",
    });
    expect(updated.status).toBe("building");
    expect(updated.costUsd).toBe(0.012);
    expect(updated.modelUsed).toBe("haiku");
  });
});
