/**
 * F513 B-0 — WorkService 핵심 메서드 단위 테스트 (TDD Red Phase)
 *
 * 대상: parseFItems, inferStatus, classifyWithRegex, classify, getSnapshot
 * 총 15건 — 구현 전 FAIL 확인 목적
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { WorkService } from "../core/work/services/work.service.js";
import type { Env } from "../env.js";

// ── Minimal env (DB 불필요한 테스트용) ──────────────────────────────────────

function makeEnv(overrides: Partial<Env> = {}): Env {
  return {
    DB: {} as D1Database,
    GITHUB_TOKEN: "",
    JWT_SECRET: "test",
    GITHUB_REPO: "KTDS-AXBD/Foundry-X",
    CACHE: {} as KVNamespace,
    AI: {} as Ai,
    FILES_BUCKET: {} as R2Bucket,
    ...overrides,
  };
}

// ── SPEC.md 테스트용 픽스처 ──────────────────────────────────────────────────

const SPEC_TABLE_ROWS = `
| F501 | SomeFeature (FX-REQ-500, P1) | Sprint 260 | ✅ | done |
| F502 | BugFix (FX-REQ-501, P0) | Sprint 261 | 🔧(impl) | in progress |
| F503 | Backlog Item (FX-REQ-502, P2) | — | 📋(plan) | waiting |
| F504 | Planned Item | Sprint 262 | | sprint assigned |
`.trim();

afterEach(() => {
  vi.restoreAllMocks();
});

// ── parseFItems ───────────────────────────────────────────────────────────────

describe("WorkService.parseFItems — F513 B-0", () => {
  it("F-item 표준 행 파싱: id/title/sprint/status 추출", () => {
    const svc = new WorkService(makeEnv());
    const rows = `| F501 | SomeFeature (FX-REQ-500, P1) | Sprint 260 | ✅ | done |`;
    const items = (svc as unknown as { parseFItems(t: string): unknown[] }).parseFItems(rows);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ id: "F501", sprint: "260", status: "done" });
  });

  it("✅ 이모지 → done 상태", () => {
    const svc = new WorkService(makeEnv());
    const rows = `| F510 | Done item | Sprint 263 | ✅ | |`;
    const items = (svc as unknown as { parseFItems(t: string): Array<{ status: string }> }).parseFItems(rows);

    expect(items[0]?.status).toBe("done");
  });

  it("🔧 이모지 → in_progress 상태", () => {
    const svc = new WorkService(makeEnv());
    const rows = `| F511 | In-progress item | Sprint 264 | 🔧(impl) | |`;
    const items = (svc as unknown as { parseFItems(t: string): Array<{ status: string }> }).parseFItems(rows);

    expect(items[0]?.status).toBe("in_progress");
  });

  it("📋 이모지 → backlog 상태", () => {
    const svc = new WorkService(makeEnv());
    const rows = `| F512 | Backlog item | — | 📋(plan) | |`;
    const items = (svc as unknown as { parseFItems(t: string): Array<{ status: string }> }).parseFItems(rows);

    expect(items[0]?.status).toBe("backlog");
  });

  it("Sprint 배정 행 (상태 이모지 없음) → planned 상태", () => {
    const svc = new WorkService(makeEnv());
    const rows = `| F513 | Planned with no emoji | Sprint 264 | | |`;
    const items = (svc as unknown as { parseFItems(t: string): Array<{ status: string }> }).parseFItems(rows);

    expect(items[0]?.status).toBe("planned");
  });

  it("빈 SPEC 텍스트 → 빈 배열 반환", () => {
    const svc = new WorkService(makeEnv());
    const items = (svc as unknown as { parseFItems(t: string): unknown[] }).parseFItems("");

    expect(items).toEqual([]);
  });

  it("priority 추출 — P0/P1/P2 패턴", () => {
    const svc = new WorkService(makeEnv());
    const rows = [
      `| F601 | Critical fix (FX-REQ-600, P0) | Sprint 264 | ✅ | |`,
      `| F602 | High priority (FX-REQ-601, P1) | Sprint 264 | 🔧 | |`,
      `| F603 | Medium work (FX-REQ-602, P2) | — | 📋 | |`,
    ].join("\n");
    const items = (svc as unknown as { parseFItems(t: string): Array<{ priority?: string }> }).parseFItems(rows);

    expect(items[0]?.priority).toBe("P0");
    expect(items[1]?.priority).toBe("P1");
    expect(items[2]?.priority).toBe("P2");
  });

  it("req_code 추출 — FX-REQ-NNN 패턴", () => {
    const svc = new WorkService(makeEnv());
    const rows = `| F700 | Some feature (FX-REQ-999, P1) | Sprint 264 | ✅ | |`;
    const items = (svc as unknown as { parseFItems(t: string): Array<{ req_code?: string }> }).parseFItems(rows);

    expect(items[0]?.req_code).toBe("FX-REQ-999");
  });
});

// ── classifyWithRegex ─────────────────────────────────────────────────────────

describe("WorkService.classifyWithRegex — F513 B-0", () => {
  type ClassifyResult = { track: string; priority: string; method: string };

  it('"bug" 포함 → track=B', () => {
    const svc = new WorkService(makeEnv());
    const result = (svc as unknown as { classifyWithRegex(t: string): ClassifyResult }).classifyWithRegex("fix the login bug");

    expect(result.track).toBe("B");
    expect(result.method).toBe("regex");
  });

  it('"feature" 단독 → track=F (기본값)', () => {
    const svc = new WorkService(makeEnv());
    const result = (svc as unknown as { classifyWithRegex(t: string): ClassifyResult }).classifyWithRegex("add new feature for users");

    expect(result.track).toBe("F");
  });

  it('"refactor" 포함 → track=C', () => {
    const svc = new WorkService(makeEnv());
    const result = (svc as unknown as { classifyWithRegex(t: string): ClassifyResult }).classifyWithRegex("refactor auth module");

    expect(result.track).toBe("C");
  });

  it('"긴급" 포함 → priority=P0', () => {
    const svc = new WorkService(makeEnv());
    const result = (svc as unknown as { classifyWithRegex(t: string): ClassifyResult }).classifyWithRegex("긴급 배포 필요");

    expect(result.priority).toBe("P0");
  });
});

// ── classify (public — fallback 경로) ────────────────────────────────────────

describe("WorkService.classify — F513 B-0", () => {
  it("ANTHROPIC_API_KEY 없으면 regex fallback 반환", async () => {
    const svc = new WorkService(makeEnv({ ANTHROPIC_API_KEY: undefined }));
    const result = await svc.classify("add new feature for dashboard");

    expect(result.method).toBe("regex");
    expect(result.track).toBeDefined();
  });

  it("Anthropic API 오류 시 regex fallback 반환", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    const svc = new WorkService(makeEnv({ ANTHROPIC_API_KEY: "sk-test-key" }));
    const result = await svc.classify("fix the login bug");

    expect(result.method).toBe("regex");
  });
});

// ── getSnapshot (fetch mock) ──────────────────────────────────────────────────

describe("WorkService.getSnapshot — F513 B-0", () => {
  it("fetch 전체 실패 시 빈 items + graceful 응답 반환", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));

    const svc = new WorkService(makeEnv());
    const snap = await svc.getSnapshot();

    expect(snap.items).toEqual([]);
    expect(snap.summary).toMatchObject({ backlog: 0, in_progress: 0, done_today: 0 });
    expect(snap.generated_at).toBeDefined();
  });
});
