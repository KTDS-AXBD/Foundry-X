/**
 * F516 TDD Red Phase — POST /api/work/submit + GET /api/work/stream
 *
 * Backlog 인입 파이프라인 + 실시간 동기화
 * Sprint 273, FX-REQ-544
 */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { OpenAPIHono } from "@hono/zod-openapi";
import { workRoute } from "../routes/work.js";
import type { Env } from "../env.js";
import { createMockD1 } from "./helpers/mock-d1.js";

// ── 최소 테스트 앱 ─────────────────────────────────────────────────────────
function makeTestApp(envOverrides: Partial<Env> = {}) {
  const app = new OpenAPIHono<{ Bindings: Env }>();
  app.route("/api", workRoute);

  const mockEnv: Partial<Env> = {
    DB: createMockD1() as unknown as Env["DB"],
    GITHUB_TOKEN: "mock-github-token",
    GITHUB_REPO: "KTDS-AXBD/Foundry-X",
    JWT_SECRET: "mock-jwt-secret",
    CACHE: {
      get: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      getWithMetadata: vi.fn().mockResolvedValue({ value: null, metadata: null }),
      list: vi.fn().mockResolvedValue({ keys: [], list_complete: true, cursor: "" }),
    } as unknown as Env["CACHE"],
    FILES_BUCKET: {} as Env["FILES_BUCKET"],
    AI: {} as Env["AI"],
    ...envOverrides,
  };

  return { app, mockEnv };
}

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Zod 검증 스키마 ─────────────────────────────────────────────────────────
import { z } from "@hono/zod-openapi";

const WorkSubmitOutputSchema = z.object({
  id: z.string().startsWith("bli-"),
  track: z.enum(["F", "B", "C", "X"]),
  priority: z.enum(["P0", "P1", "P2", "P3"]),
  title: z.string(),
  classify_method: z.enum(["llm", "regex"]),
  github_issue_number: z.number().optional(),
  spec_row_added: z.boolean(),
  status: z.string(),
});

// ── POST /api/work/submit ──────────────────────────────────────────────────

describe("F516 — POST /api/work/submit", () => {
  it("제목+설명 입력 시 분류 결과 + D1 저장 + 200 반환", async () => {
    const { app, mockEnv } = makeTestApp({
      ANTHROPIC_API_KEY: undefined, // regex fallback 강제
    });

    // Mock fetch for GitHub issue creation
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ number: 42 }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      })
    );

    const req = new Request("http://localhost/api/work/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "사용자가 웹에서 아이디어를 제출할 수 없음",
        description: "웹 폼이 없어서 CLI만 써야 함",
        source: "web",
      }),
    });

    const res = await app.request(req.url, req, mockEnv as unknown as Env);
    expect(res.status).toBe(200);

    const body = await res.json();
    const parsed = WorkSubmitOutputSchema.safeParse(body);
    expect(parsed.success, `스키마 불일치: ${JSON.stringify(parsed.error?.issues)}`).toBe(true);
    expect(parsed.data?.track).toMatch(/^[FBCX]$/);
    expect(parsed.data?.priority).toMatch(/^P[0-3]$/);
    expect(parsed.data?.classify_method).toBe("regex");
  });

  it("ANTHROPIC_API_KEY 있으면 llm 분류 시도 후 classify_method=llm 반환", async () => {
    const { app, mockEnv } = makeTestApp({
      ANTHROPIC_API_KEY: "mock-anthropic-key",
    });

    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const urlStr = String(url);
      if (urlStr.includes("anthropic.com")) {
        return new Response(
          JSON.stringify({
            content: [{ text: '{"track":"B","priority":"P1","title":"웹 폼 미구현 버그"}' }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      // GitHub API mock
      return new Response(JSON.stringify({ number: 43 }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    });

    const req = new Request("http://localhost/api/work/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "웹 폼 버그",
        source: "web",
      }),
    });

    const res = await app.request(req.url, req, mockEnv as unknown as Env);
    expect(res.status).toBe(200);

    const body = await res.json() as z.infer<typeof WorkSubmitOutputSchema>;
    expect(body.classify_method).toBe("llm");
    expect(body.track).toBe("B");
  });

  it("동일 idempotency_key 재전송 시 409 Conflict 반환", async () => {
    const { app, mockEnv } = makeTestApp({ ANTHROPIC_API_KEY: undefined });

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ number: 44 }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      })
    );

    const payload = {
      title: "중복 제출 테스트",
      source: "marker" as const,
      idempotency_key: "marker-issue-123",
    };

    const makeReq = () => new Request("http://localhost/api/work/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // 첫 번째 제출
    const res1 = await app.request(makeReq().url, makeReq(), mockEnv as unknown as Env);
    expect(res1.status).toBe(200);

    // 동일 idempotency_key 재전송
    const res2 = await app.request(makeReq().url, makeReq(), mockEnv as unknown as Env);
    expect(res2.status).toBe(409);
  });

  it("GitHub Issue 생성 실패 시에도 200 반환 (soft fail)", async () => {
    const { app, mockEnv } = makeTestApp({ ANTHROPIC_API_KEY: undefined });

    // GitHub API 실패 mock
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "Bad credentials" }), { status: 401 })
    );

    const req = new Request("http://localhost/api/work/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "GitHub 실패 테스트", source: "web" }),
    });

    const res = await app.request(req.url, req, mockEnv as unknown as Env);
    expect(res.status).toBe(200);

    const body = await res.json() as z.infer<typeof WorkSubmitOutputSchema>;
    expect(body.github_issue_number).toBeUndefined();
  });

  it("SPEC.md 업데이트 실패 시 spec_row_added=false + 200 반환", async () => {
    const { app, mockEnv } = makeTestApp({ ANTHROPIC_API_KEY: undefined });

    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const urlStr = String(url);
      if (urlStr.includes("api.github.com/repos") && !urlStr.includes("issues")) {
        // SPEC.md GitHub API 실패
        return new Response(JSON.stringify({ message: "Not Found" }), { status: 404 });
      }
      // GitHub Issue 생성 성공
      return new Response(JSON.stringify({ number: 45 }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    });

    const req = new Request("http://localhost/api/work/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "SPEC 업데이트 실패 테스트", source: "web" }),
    });

    const res = await app.request(req.url, req, mockEnv as unknown as Env);
    expect(res.status).toBe(200);

    const body = await res.json() as z.infer<typeof WorkSubmitOutputSchema>;
    expect(body.spec_row_added).toBe(false);
  });

  it("제목이 없으면 400 반환", async () => {
    const { app, mockEnv } = makeTestApp();

    const req = new Request("http://localhost/api/work/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "", source: "web" }),
    });

    const res = await app.request(req.url, req, mockEnv as unknown as Env);
    expect(res.status).toBe(400);
  });
});

// ── GET /api/work/stream (SSE) ──────────────────────────────────────────────

describe("F516 — GET /api/work/stream (SSE)", () => {
  it("연결 시 Content-Type: text/event-stream 반환", async () => {
    const { app, mockEnv } = makeTestApp();

    const req = new Request("http://localhost/api/work/stream");
    const res = await app.request(req.url, req, mockEnv as unknown as Env);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/event-stream");
  });

  it("연결 시 초기 connected 이벤트 수신", async () => {
    const { app, mockEnv } = makeTestApp();

    const req = new Request("http://localhost/api/work/stream");
    const res = await app.request(req.url, req, mockEnv as unknown as Env);

    // SSE 스트림에서 첫 청크 읽기
    const reader = res.body?.getReader();
    if (!reader) throw new Error("No response body");

    const { value } = await reader.read();
    const text = new TextDecoder().decode(value);
    reader.cancel();

    expect(text).toContain("event:");
  });
});
