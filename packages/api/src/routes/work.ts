import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import {
  WorkSnapshotSchema,
  WorkContextSchema,
  ClassifyInputSchema,
  ClassifyOutputSchema,
  SessionListSchema,
  SessionSyncInputSchema,
  SessionSyncOutputSchema,
  VelocitySchema,
  PhaseProgressSchema,
  BacklogHealthSchema,
  ChangelogSchema,
  WorkSubmitInputSchema,
  WorkSubmitOutputSchema,
  TraceChainSchema,
  TraceSyncOutputSchema,
} from "../schemas/work.js";
import type { Env } from "../env.js";
import { WorkService } from "../services/work.service.js";
import { TraceabilityService } from "../services/traceability.service.js";

export const workRoute = new OpenAPIHono<{ Bindings: Env }>();

// ─── GET /api/work/snapshot ───

const getSnapshot = createRoute({
  method: "get",
  path: "/work/snapshot",
  tags: ["Work Observability"],
  summary: "Aggregated work snapshot (SPEC items + PRs + commits)",
  responses: {
    200: {
      content: { "application/json": { schema: WorkSnapshotSchema } },
      description: "Work snapshot",
    },
  },
});

workRoute.openapi(getSnapshot, async (c) => {
  const svc = new WorkService(c.env);
  const snapshot = await svc.getSnapshot();
  return c.json(snapshot);
});

// ─── GET /api/work/context ───

const getContext = createRoute({
  method: "get",
  path: "/work/context",
  tags: ["Work Observability"],
  summary: "Context resume — recent commits + WT state + next actions",
  responses: {
    200: {
      content: { "application/json": { schema: WorkContextSchema } },
      description: "Work context",
    },
  },
});

workRoute.openapi(getContext, async (c) => {
  const svc = new WorkService(c.env);
  const ctx = await svc.getContext();
  return c.json(ctx);
});

// ─── POST /api/work/classify ───

const classifyWork = createRoute({
  method: "post",
  path: "/work/classify",
  tags: ["Work Observability"],
  summary: "Classify natural language input into work track + priority",
  request: {
    body: { content: { "application/json": { schema: ClassifyInputSchema } } },
  },
  responses: {
    200: {
      content: { "application/json": { schema: ClassifyOutputSchema } },
      description: "Classification result",
    },
    400: {
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
      description: "Invalid input",
    },
  },
});

workRoute.openapi(classifyWork, async (c) => {
  const { text } = c.req.valid("json");
  const svc = new WorkService(c.env);
  const result = await svc.classify(text);
  return c.json(result);
});

// ─── GET /api/work/sessions (F510 M4) ───────────────────────────────────────

const getSessions = createRoute({
  method: "get",
  path: "/work/sessions",
  tags: ["Work Observability"],
  summary: "Agent session list collected from local tmux/git state",
  responses: {
    200: {
      content: { "application/json": { schema: SessionListSchema } },
      description: "Agent sessions",
    },
  },
});

workRoute.openapi(getSessions, async (c) => {
  const svc = new WorkService(c.env);
  const data = await svc.getSessions();
  return c.json(data);
});

// ─── POST /api/work/sessions/sync (F510 M4) ──────────────────────────────────

const syncSessions = createRoute({
  method: "post",
  path: "/work/sessions/sync",
  tags: ["Work Observability"],
  summary: "Upsert agent session state from local collector script",
  request: {
    body: { content: { "application/json": { schema: SessionSyncInputSchema } } },
  },
  responses: {
    200: {
      content: { "application/json": { schema: SessionSyncOutputSchema } },
      description: "Sync result",
    },
    400: {
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
      description: "Invalid input",
    },
  },
});

workRoute.openapi(syncSessions, async (c) => {
  const body = c.req.valid("json");
  const svc = new WorkService(c.env);
  const result = await svc.syncSessions(body);
  return c.json(result);
});

// ─── GET /api/work/velocity (F513 B-1) ────────────────────────────────────────

const getVelocity = createRoute({
  method: "get",
  path: "/work/velocity",
  tags: ["Work Observability"],
  summary: "Sprint velocity — done F-items per sprint with trend",
  responses: {
    200: {
      content: { "application/json": { schema: VelocitySchema } },
      description: "Velocity data",
    },
  },
});

workRoute.openapi(getVelocity, async (c) => {
  const svc = new WorkService(c.env);
  const data = await svc.getVelocity();
  return c.json(data);
});

// ─── GET /api/work/phase-progress (F513 B-2) ─────────────────────────────────

const getPhaseProgress = createRoute({
  method: "get",
  path: "/work/phase-progress",
  tags: ["Work Observability"],
  summary: "Phase-level progress — done/in-progress/total per phase",
  responses: {
    200: {
      content: { "application/json": { schema: PhaseProgressSchema } },
      description: "Phase progress",
    },
  },
});

workRoute.openapi(getPhaseProgress, async (c) => {
  const svc = new WorkService(c.env);
  const data = await svc.getPhaseProgress();
  return c.json(data);
});

// ─── GET /api/work/backlog-health (F513 B-3) ─────────────────────────────────

const getBacklogHealth = createRoute({
  method: "get",
  path: "/work/backlog-health",
  tags: ["Work Observability"],
  summary: "Backlog health score — stale items + warnings",
  responses: {
    200: {
      content: { "application/json": { schema: BacklogHealthSchema } },
      description: "Backlog health",
    },
  },
});

workRoute.openapi(getBacklogHealth, async (c) => {
  const svc = new WorkService(c.env);
  const data = await svc.getBacklogHealth();
  return c.json(data);
});

// ─── GET /api/work/changelog ─────────────────────────────────────────────────

const getChangelog = createRoute({
  method: "get",
  path: "/work/changelog",
  tags: ["Work Observability"],
  summary: "CHANGELOG.md content from repository",
  responses: {
    200: {
      content: { "application/json": { schema: ChangelogSchema } },
      description: "Changelog content",
    },
  },
});

workRoute.openapi(getChangelog, async (c) => {
  const svc = new WorkService(c.env);
  const data = await svc.getChangelog();
  return c.json(data);
});

// ─── POST /api/work/submit (F516) ────────────────────────────────────────────

const submitWork = createRoute({
  method: "post",
  path: "/work/submit",
  tags: ["Work Lifecycle"],
  summary: "F516 — Backlog 인입 파이프라인: 분류 + D1 저장 + GitHub Issue + SPEC.md",
  request: {
    body: { content: { "application/json": { schema: WorkSubmitInputSchema } } },
  },
  responses: {
    200: {
      content: { "application/json": { schema: WorkSubmitOutputSchema } },
      description: "등록 결과",
    },
    400: {
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
      description: "입력 오류",
    },
    409: {
      content: { "application/json": { schema: z.object({ error: z.string(), id: z.string() }) } },
      description: "중복 제출 (idempotency_key 충돌)",
    },
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
workRoute.openapi(submitWork, async (c): Promise<any> => {
  const input = c.req.valid("json");

  if (!input.title || input.title.trim().length === 0) {
    return c.json({ error: "title is required" }, 400);
  }

  const svc = new WorkService(c.env);
  const result = await svc.submitBacklog({
    title: input.title.trim(),
    description: input.description,
    source: input.source,
    idempotency_key: input.idempotency_key,
  });

  if (result.conflict) {
    return c.json({ error: "Duplicate submission", id: result.id }, 409);
  }

  return c.json({
    id: result.id,
    track: result.track as "F" | "B" | "C" | "X",
    priority: result.priority as "P0" | "P1" | "P2" | "P3",
    title: result.title,
    classify_method: result.classify_method as "llm" | "regex",
    github_issue_number: result.github_issue_number,
    spec_row_added: result.spec_row_added,
    status: result.status,
  });
});

// ─── F517: 메타데이터 트레이서빌리티 ─────────────────────────────────────────

const getTrace = createRoute({
  method: "get",
  path: "/work/trace",
  tags: ["Work Traceability"],
  summary: "REQ/F-item → Sprint → PR → Commit 체인 조회",
  request: {
    query: z.object({
      id: z.string().describe("FX-REQ-NNN 또는 FNNN"),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: TraceChainSchema } },
      description: "TraceChain",
    },
    404: {
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
      description: "Not found",
    },
  },
});

workRoute.openapi(getTrace, async (c) => {
  const { id } = c.req.valid("query");
  const svc = new TraceabilityService(c.env);
  const chain = await svc.getTraceChain(id);
  if (!chain) return c.json({ error: `Not found: ${id}` }, 404);
  return c.json(chain);
});

const postTraceSync = createRoute({
  method: "post",
  path: "/work/trace/sync",
  tags: ["Work Traceability"],
  summary: "SPEC.md + GitHub API → D1 동기화",
  responses: {
    200: {
      content: { "application/json": { schema: TraceSyncOutputSchema } },
      description: "Sync result",
    },
  },
});

workRoute.openapi(postTraceSync, async (c) => {
  const svc = new TraceabilityService(c.env);
  const [specResult, githubResult] = await Promise.allSettled([
    svc.syncFromSpec(),
    svc.syncFromGitHub(),
  ]);
  return c.json({
    synced: {
      spec: specResult.status === "fulfilled" ? specResult.value.synced : 0,
      prs: githubResult.status === "fulfilled" ? githubResult.value.synced : 0,
    },
  });
});

// ─── GET /api/work/stream (F516 SSE) ─────────────────────────────────────────

workRoute.get("/work/stream", (c) => {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      // 초기 연결 이벤트
      controller.enqueue(encoder.encode("event: connected\ndata: {}\n\n"));
      // Cloudflare Workers에서는 long-lived SSE를 Durable Objects 없이 유지하기 어려움
      // 여기선 연결 확인용 단일 이벤트 후 스트림 유지
      // 실제 push는 클라이언트 재연결 + polling 조합으로 처리
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
});
