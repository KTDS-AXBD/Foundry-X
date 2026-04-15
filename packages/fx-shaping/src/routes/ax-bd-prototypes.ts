/**
 * Sprint 67: F209 — Prototype + PoC 환경 + 기술 검증 라우트
 * 8 endpoints: list, getById, delete, pocEnv (provision/get/teardown), techReview (analyze/get)
 */
import { Hono } from "hono";
import type { ShapingEnv } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";
import { PrototypeService } from "../harness/services/prototype-service.js";
import { PocEnvService } from "../launch/services/poc-env-service.js";
import { TechReviewService } from "../harness/services/tech-review-service.js";
import { PocEnvProvisionSchema } from "../harness/schemas/prototype-ext.js";
import { PrototypeReviewService } from "../harness/services/prototype-review-service.js";
import { sectionReviewSchema } from "../schemas/hitl-section.schema.js";
import { PrototypeJobService } from "../harness/services/prototype-job-service.js";
import { PrototypeBuildSchema } from "../harness/schemas/prototype-build.js";

export const axBdPrototypesRoute = new Hono<{
  Bindings: ShapingEnv;
  Variables: TenantVariables;
}>();

// GET /ax-bd/prototypes — 목록
axBdPrototypesRoute.get("/ax-bd/prototypes", async (c) => {
  const svc = new PrototypeService(c.env.DB);
  const { bizItemId, limit, offset } = c.req.query();
  const result = await svc.list(c.get("orgId"), {
    bizItemId: bizItemId || undefined,
    limit: Number(limit) || 20,
    offset: Number(offset) || 0,
  });
  return c.json(result);
});

// GET /ax-bd/prototypes/:id — 상세 (PoC + TechReview 포함)
axBdPrototypesRoute.get("/ax-bd/prototypes/:id", async (c) => {
  const svc = new PrototypeService(c.env.DB);
  const proto = await svc.getById(c.req.param("id"), c.get("orgId"));
  if (!proto) return c.json({ error: "Prototype not found" }, 404);
  return c.json(proto);
});

// DELETE /ax-bd/prototypes/:id — 삭제 (CASCADE)
axBdPrototypesRoute.delete("/ax-bd/prototypes/:id", async (c) => {
  const svc = new PrototypeService(c.env.DB);
  const ok = await svc.delete(c.req.param("id"), c.get("orgId"));
  if (!ok) return c.json({ error: "Prototype not found" }, 404);
  return c.json({ success: true });
});

// POST /ax-bd/prototypes/:id/poc-env — PoC 환경 프로비저닝
axBdPrototypesRoute.post("/ax-bd/prototypes/:id/poc-env", async (c) => {
  const body = await c.req.json();
  const parsed = PocEnvProvisionSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const svc = new PocEnvService(c.env.DB);
  try {
    const env = await svc.provision(c.req.param("id"), c.get("orgId"), parsed.data.config);
    return c.json(env, 201);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg === "Prototype not found") return c.json({ error: msg }, 404);
    if (msg === "Active PoC environment already exists") return c.json({ error: msg }, 409);
    throw e;
  }
});

// GET /ax-bd/prototypes/:id/poc-env — PoC 환경 조회
axBdPrototypesRoute.get("/ax-bd/prototypes/:id/poc-env", async (c) => {
  const svc = new PocEnvService(c.env.DB);
  const env = await svc.getByPrototype(c.req.param("id"), c.get("orgId"));
  if (!env) return c.json({ error: "PoC environment not found" }, 404);
  return c.json(env);
});

// DELETE /ax-bd/prototypes/:id/poc-env — PoC 환경 teardown
axBdPrototypesRoute.delete("/ax-bd/prototypes/:id/poc-env", async (c) => {
  const svc = new PocEnvService(c.env.DB);
  try {
    await svc.teardown(c.req.param("id"), c.get("orgId"));
    return c.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg === "PoC environment not found") return c.json({ error: msg }, 404);
    if (msg === "Environment already terminated") return c.json({ error: msg }, 409);
    throw e;
  }
});

// POST /ax-bd/prototypes/:id/tech-review — 기술 검증 분석 요청
axBdPrototypesRoute.post("/ax-bd/prototypes/:id/tech-review", async (c) => {
  const svc = new TechReviewService(c.env.DB);
  try {
    const review = await svc.analyze(c.req.param("id"), c.get("orgId"));
    return c.json(review, 201);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg === "Prototype not found") return c.json({ error: msg }, 404);
    throw e;
  }
});

// GET /ax-bd/prototypes/:id/tech-review — 기술 검증 결과 조회
axBdPrototypesRoute.get("/ax-bd/prototypes/:id/tech-review", async (c) => {
  const svc = new TechReviewService(c.env.DB);
  const review = await svc.getByPrototype(c.req.param("id"), c.get("orgId"));
  if (!review) return c.json({ error: "Tech review not found" }, 404);
  return c.json(review);
});

// POST /ax-bd/prototypes/:id/sections/:sectionId/review — 섹션 리뷰 제출 (F297)
axBdPrototypesRoute.post("/ax-bd/prototypes/:id/sections/:sectionId/review", async (c) => {
  const orgId = c.get("orgId");
  const prototypeId = c.req.param("id");
  const sectionId = c.req.param("sectionId");
  const userId = (c.get("jwtPayload") as Record<string, string> | undefined)?.sub ?? (c.get("userId") as string) ?? "";

  const body = await c.req.json();
  const parsed = sectionReviewSchema.safeParse({ ...body, sectionId });
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const svc = new PrototypeReviewService(c.env.DB);
  const review = await svc.reviewSection(orgId, prototypeId, parsed.data, userId, body.framework);
  return c.json(review, 201);
});

// GET /ax-bd/prototypes/:id/reviews — 리뷰 목록 (F297)
axBdPrototypesRoute.get("/ax-bd/prototypes/:id/reviews", async (c) => {
  const orgId = c.get("orgId");
  const prototypeId = c.req.param("id");

  const svc = new PrototypeReviewService(c.env.DB);
  const reviews = await svc.listReviews(orgId, prototypeId);
  return c.json(reviews);
});

// GET /ax-bd/prototypes/:id/review-summary — 상태 요약 (F297)
axBdPrototypesRoute.get("/ax-bd/prototypes/:id/review-summary", async (c) => {
  const orgId = c.get("orgId");
  const prototypeId = c.req.param("id");

  const svc = new PrototypeReviewService(c.env.DB);
  const summary = await svc.getSummary(orgId, prototypeId);
  return c.json(summary);
});

// POST /ax-bd/prototypes/build — Prototype Builder 실행 (F457, Sprint 222)
axBdPrototypesRoute.post("/ax-bd/prototypes/build", async (c) => {
  const body = await c.req.json();
  const parsed = PrototypeBuildSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const svc = new PrototypeJobService(c.env.DB);
  const job = await svc.create(
    c.get("orgId"),
    parsed.data.prdContent,
    parsed.data.prdTitle,
  );
  return c.json(job, 201);
});

// POST /ax-bd/prototypes/:id/link-offering — Offering 연결 (F458, Sprint 222)
axBdPrototypesRoute.post("/ax-bd/prototypes/:id/link-offering", async (c) => {
  const body = await c.req.json() as { offeringId?: string };
  if (!body?.offeringId) {
    return c.json({ error: "offeringId required" }, 400);
  }

  const prototypeId = c.req.param("id");
  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO offering_prototypes (id, offering_id, prototype_id)
     VALUES (?, ?, ?)`
  ).bind(id, body.offeringId, prototypeId).run();

  return c.json({ id, offeringId: body.offeringId, prototypeId }, 201);
});

// GET /ax-bd/prototypes/:id/html — HTML 콘텐츠 직접 서빙 (프레젠테이션용)
// content가 [R2:key] 참조이면 R2에서 실제 HTML을 가져옴
// 모든 응답에 Marker.io 피드백 위젯 snippet을 </body> 직전에 주입 (MARKER_PROJECT_ID 설정 시)
axBdPrototypesRoute.get("/ax-bd/prototypes/:id/html", async (c) => {
  const svc = new PrototypeService(c.env.DB);
  const proto = await svc.getById(c.req.param("id"), c.get("orgId"));
  if (!proto) return c.json({ error: "Prototype not found" }, 404);

  // 1) HTML 본문을 먼저 문자열로 확보
  let html: string;
  const r2Match = proto.content.match(/^\[R2:([^\]]+)\]/);
  if (r2Match) {
    const r2Key = r2Match[1]!;
    const obj = await c.env.FILES_BUCKET.get(r2Key);
    if (!obj) {
      return c.json({ error: "R2에서 프로토타입 HTML을 찾을 수 없어요", r2Key }, 404);
    }
    html = await obj.text();
  } else {
    html = proto.content;
  }

  // 2) Marker.io 피드백 위젯 주입 (프로젝트 ID가 env에 설정되어 있을 때만)
  const markerProjectId = c.env.MARKER_PROJECT_ID;
  if (markerProjectId) {
    const markerSnippet = `
<script>
  window.markerConfig = { project: ${JSON.stringify(markerProjectId)}, source: "prototype" };
</script>
<script src="https://edge.marker.io/latest/shim.js" async></script>
`;
    if (html.includes("</body>")) {
      html = html.replace("</body>", `${markerSnippet}</body>`);
    } else {
      html = `${html}\n${markerSnippet}`;
    }
  }

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // 위젯 주입 캐시 오염 방지 — 항상 fresh 렌더
      "Cache-Control": "no-store",
    },
  });
});
