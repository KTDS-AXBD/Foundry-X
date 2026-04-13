// ─── F529: Agent Streaming 라우트 — SSE + WebSocket (Sprint 282) ───

import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";
import { randomUUID } from "node:crypto";
import type { Env } from "../../../env.js";
import { AgentStreamHandler } from "../streaming/agent-stream-handler.js";
import { AgentMetricsService } from "../streaming/agent-metrics-service.js";
import { ToolRegistry } from "../runtime/tool-registry.js";
import { TokenTracker } from "../runtime/token-tracker.js";
import { AgentRuntime } from "../runtime/agent-runtime.js";

export const streamingRoute = new OpenAPIHono<{ Bindings: Env }>();

// ─── Zod 스키마 ───

const AgentStreamRequestSchema = z.object({
  agentId: z.string().min(1).describe("AgentSpec 이름"),
  input: z.string().min(1).describe("에이전트 입력"),
  sessionId: z.string().optional().describe("클라이언트 세션 ID (없으면 자동 생성)"),
});

const AgentRunStreamRoute = createRoute({
  method: "post",
  path: "/agents/run/stream",
  request: {
    body: {
      content: { "application/json": { schema: AgentStreamRequestSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      description: "SSE 스트리밍 응답 — 에이전트 실행 이벤트",
      content: { "text/event-stream": { schema: z.string() } },
    },
    400: {
      description: "잘못된 요청",
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
    },
  },
  tags: ["Agent Streaming"],
  summary: "에이전트 실행 + SSE 스트리밍",
  description: "에이전트를 실행하면서 이벤트를 SSE로 스트리밍합니다.",
});

// ─── POST /api/agents/run/stream — SSE ───

streamingRoute.openapi(AgentRunStreamRoute, async (c) => {
  const body = c.req.valid("json");
  const sessionId = body.sessionId ?? randomUUID();

  const db = c.env.DB;
  const apiKey = c.env.ANTHROPIC_API_KEY ?? "";

  const metricsService = new AgentMetricsService(db);
  const registry = new ToolRegistry();
  const tracker = new TokenTracker();
  const runtime = new AgentRuntime(registry, tracker);
  const handler = new AgentStreamHandler(sessionId, metricsService);
  // AgentSpec 기본 스펙 (YAML 파일 로딩은 Workers 환경에서 정적 import 필요 — 후속 확장)
  const spec = {
    name: body.agentId,
    model: "claude-sonnet-4-5-20251022",
    systemPrompt: `You are a helpful agent named ${body.agentId}. Answer clearly and concisely.`,
    tools: [] as string[],
    constraints: { maxRounds: 5, maxTokens: 2048 },
  };

  // ReadableStream 생성 — 에이전트 실행과 SSE 이벤트를 동일 컨텍스트에서 처리
  const stream = new ReadableStream({
    async start(ctrl) {
      const hooks = handler.createHooks(ctrl);

      try {
        await runtime.run(spec, body.input, {
          agentId: body.agentId,
          sessionId,
          apiKey,
          hooks,
        });
      } catch (err) {
        const enc = new TextEncoder();
        const errEvent = {
          type: "run_failed",
          sessionId,
          timestamp: new Date().toISOString(),
          payload: { error: err instanceof Error ? err.message : String(err) },
        };
        ctrl.enqueue(enc.encode(`data: ${JSON.stringify(errEvent)}\n\n`));

        // D1에 실패 상태 기록 (metricId 접근 불가 → 별도 생성)
        try {
          const failId = await metricsService.createRunning(sessionId, body.agentId);
          await metricsService.failRun(failId, errEvent.payload.error);
        } catch {
          // 메트릭 저장 실패는 무시
        }
      } finally {
        ctrl.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Session-Id": sessionId,
    },
  }) as never;
});

// ─── GET /api/agents/stream/ws — WebSocket 업그레이드 ───

streamingRoute.get("/agents/stream/ws", async (c) => {
  const upgradeHeader = c.req.header("upgrade");
  if (!upgradeHeader || upgradeHeader.toLowerCase() !== "websocket") {
    return c.json({ error: "Expected WebSocket upgrade" }, 400);
  }

  const sessionId = c.req.query("sessionId") ?? randomUUID();

  // Cloudflare Workers WebSocketPair
  const pair = new WebSocketPair();
  const [client, server] = Object.values(pair) as [WebSocket, WebSocket];

  server.accept();

  server.addEventListener("message", async (event) => {
    let body: { agentId?: string; input?: string };
    try {
      body = JSON.parse(event.data as string) as typeof body;
    } catch {
      server.send(JSON.stringify({ error: "Invalid JSON" }));
      return;
    }

    if (!body.agentId || !body.input) {
      server.send(JSON.stringify({ error: "agentId and input required" }));
      return;
    }

    const db = c.env.DB;
    const apiKey = c.env.ANTHROPIC_API_KEY ?? "";

    const metricsService = new AgentMetricsService(db);
    const registry = new ToolRegistry();
    const tracker = new TokenTracker();
    const runtime = new AgentRuntime(registry, tracker);

    // WebSocket용 컨트롤러 어댑터 (메시지 전송)
    const wsCtrl = {
      enqueue: (chunk: Uint8Array) => {
        try {
          server.send(new TextDecoder().decode(chunk));
        } catch {
          // 연결 끊김 무시
        }
      },
      close: () => server.close(),
      error: (err: unknown) => server.close(),
    } as unknown as ReadableStreamDefaultController;

    const wsHandler = new AgentStreamHandler(sessionId, metricsService);
    const hooks = wsHandler.createHooks(wsCtrl);

    const spec = {
      name: body.agentId,
      model: "claude-sonnet-4-5-20251022",
      systemPrompt: `You are a helpful agent named ${body.agentId}.`,
      tools: [] as string[],
      constraints: { maxRounds: 5, maxTokens: 2048 },
    };

    try {
      await runtime.run(spec, body.input, { agentId: body.agentId, sessionId, apiKey, hooks });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      server.send(JSON.stringify({ type: "run_failed", sessionId, timestamp: new Date().toISOString(), payload: { error: errMsg } }));
      server.close();
    }
  });

  return new Response(null, { status: 101, webSocket: client }) as never;
});

// ─── GET /api/agents/metrics/:sessionId ───

streamingRoute.get("/agents/metrics/:sessionId", async (c) => {
  const sessionId = c.req.param("sessionId");
  const metricsService = new AgentMetricsService(c.env.DB);
  const results = await metricsService.getBySessionId(sessionId);
  return c.json(results);
});
