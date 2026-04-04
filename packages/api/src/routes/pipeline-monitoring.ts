/**
 * F315: Pipeline Monitoring Routes — 4 EP
 * 대시보드 + 권한 관리 + 승인 이력
 */
import { Hono } from "hono";
import type { Env } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";
import { roleGuard } from "../middleware/role-guard.js";
import { DiscoveryPipelineService } from "../services/discovery-pipeline-service.js";
import { PipelinePermissionService } from "../services/pipeline-permission-service.js";
import { dashboardQuerySchema, setPermissionSchema } from "../schemas/pipeline-monitoring.schema.js";

export const pipelineMonitoringRoute = new Hono<{
  Bindings: Env;
  Variables: TenantVariables;
}>();

// 1) GET /discovery-pipeline/dashboard — 상태별 집계 + 최근 실행 목록
pipelineMonitoringRoute.get("/discovery-pipeline/dashboard", async (c) => {
  const parsed = dashboardQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    return c.json({ error: "Invalid query", details: parsed.error.flatten() }, 400);
  }

  const orgId = c.get("orgId");
  const db = c.env.DB;
  const { status, limit, offset } = parsed.data;

  // 상태별 집계
  const { results: statusCounts } = await db
    .prepare(
      `SELECT status, COUNT(*) as count
       FROM discovery_pipeline_runs
       WHERE tenant_id = ?
       GROUP BY status`,
    )
    .bind(orgId)
    .all<{ status: string; count: number }>();

  const summary: Record<string, number> = {};
  for (const row of statusCounts ?? []) {
    summary[row.status] = row.count;
  }

  // 최근 실행 목록
  let query = `SELECT p.id, p.status, p.current_step, p.created_at, p.updated_at, p.created_by,
                      b.title as biz_item_title, p.biz_item_id,
                      p.discovery_start_at, p.discovery_end_at
               FROM discovery_pipeline_runs p
               LEFT JOIN biz_items b ON b.id = p.biz_item_id
               WHERE p.tenant_id = ?`;
  const binds: unknown[] = [orgId];

  if (status) {
    query += " AND p.status = ?";
    binds.push(status);
  }

  query += " ORDER BY p.updated_at DESC LIMIT ? OFFSET ?";
  binds.push(limit, offset);

  const { results: runs } = await db.prepare(query).bind(...binds).all<Record<string, unknown>>();

  // 대기 중 체크포인트 수
  const pendingCheckpoints = await db
    .prepare(
      `SELECT COUNT(*) as count FROM pipeline_checkpoints pc
       JOIN discovery_pipeline_runs p ON p.id = pc.pipeline_run_id
       WHERE p.tenant_id = ? AND pc.status = 'pending'`,
    )
    .bind(orgId)
    .first<{ count: number }>();

  return c.json({
    summary,
    pendingCheckpoints: pendingCheckpoints?.count ?? 0,
    runs: (runs ?? []).map((r) => ({
      id: r.id,
      status: r.status,
      currentStep: r.current_step,
      bizItemId: r.biz_item_id,
      bizItemTitle: r.biz_item_title,
      createdBy: r.created_by,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      discoveryStartAt: r.discovery_start_at,
      discoveryEndAt: r.discovery_end_at,
    })),
    total: Object.values(summary).reduce((a, b) => a + b, 0),
  });
});

// 2) GET /discovery-pipeline/runs/:id/permissions — 승인 권한 목록
pipelineMonitoringRoute.get("/discovery-pipeline/runs/:id/permissions", async (c) => {
  const svc = new PipelinePermissionService(c.env.DB);
  const permissions = await svc.listPermissions(c.req.param("id"));
  return c.json({ permissions });
});

// 3) PUT /discovery-pipeline/runs/:id/permissions — 승인 권한 설정 (admin+)
pipelineMonitoringRoute.put(
  "/discovery-pipeline/runs/:id/permissions",
  roleGuard("admin"),
  async (c) => {
    const body = await c.req.json();
    const parsed = setPermissionSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
    }

    const userId = (c.get("jwtPayload") as Record<string, string> | undefined)?.sub ?? "";
    const runId = c.req.param("id") ?? "";
    const svc = new PipelinePermissionService(c.env.DB);
    const permission = await svc.setPermission(runId, parsed.data, userId);
    return c.json(permission, 201);
  },
);

// 4) GET /discovery-pipeline/runs/:id/audit-log — 승인/거부 이력
pipelineMonitoringRoute.get("/discovery-pipeline/runs/:id/audit-log", async (c) => {
  const runId = c.req.param("id");
  const db = c.env.DB;

  // 체크포인트 ���정 이력
  const { results: checkpointLogs } = await db
    .prepare(
      `SELECT id, step_id, status, decided_by, decided_at, approver_role, response
       FROM pipeline_checkpoints
       WHERE pipeline_run_id = ? AND decided_at IS NOT NULL
       ORDER BY decided_at ASC`,
    )
    .bind(runId)
    .all<Record<string, unknown>>();

  // 이벤트 로그 (중요 이벤트만)
  const { results: eventLogs } = await db
    .prepare(
      `SELECT id, event_type, from_status, to_status, step_id, created_by, created_at
       FROM pipeline_events
       WHERE pipeline_run_id = ? AND event_type IN ('ABORT', 'PAUSE', 'RESUME', 'RETRY', 'SKIP')
       ORDER BY created_at ASC`,
    )
    .bind(runId)
    .all<Record<string, unknown>>();

  return c.json({
    checkpointDecisions: (checkpointLogs ?? []).map((r) => ({
      id: r.id,
      stepId: r.step_id,
      status: r.status,
      decidedBy: r.decided_by,
      decidedAt: r.decided_at,
      approverRole: r.approver_role,
      response: r.response ? JSON.parse(r.response as string) : null,
    })),
    actionHistory: (eventLogs ?? []).map((r) => ({
      id: r.id,
      eventType: r.event_type,
      fromStatus: r.from_status,
      toStatus: r.to_status,
      stepId: r.step_id,
      createdBy: r.created_by,
      createdAt: r.created_at,
    })),
  });
});
