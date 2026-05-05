// F611: discovery domain D1 API — cross-domain callers use these functions instead of direct SQL

export async function queryPipelineRunsByBizItem(
  db: D1Database,
  tenantId: string,
  bizItemId: string,
): Promise<Record<string, unknown>[]> {
  const { results } = await db
    .prepare(
      `SELECT * FROM discovery_pipeline_runs WHERE tenant_id = ? AND biz_item_id = ?`,
    )
    .bind(tenantId, bizItemId)
    .all();
  return (results ?? []) as Record<string, unknown>[];
}

export async function queryPipelineRunsByTenant(
  db: D1Database,
  tenantId: string,
): Promise<Record<string, unknown>[]> {
  const { results } = await db
    .prepare(`SELECT * FROM discovery_pipeline_runs WHERE tenant_id = ?`)
    .bind(tenantId)
    .all();
  return (results ?? []) as Record<string, unknown>[];
}

export async function queryPipelineCheckpointsByTenant(
  db: D1Database,
  tenantId: string,
): Promise<Record<string, unknown>[]> {
  const { results } = await db
    .prepare(
      `SELECT pc.* FROM pipeline_checkpoints pc
       JOIN discovery_pipeline_runs dpr ON pc.pipeline_run_id = dpr.id
       WHERE dpr.tenant_id = ?`,
    )
    .bind(tenantId)
    .all();
  return (results ?? []) as Record<string, unknown>[];
}

export async function queryPipelineEventsByTenant(
  db: D1Database,
  tenantId: string,
): Promise<Record<string, unknown>[]> {
  const { results } = await db
    .prepare(
      `SELECT pe.* FROM pipeline_events pe
       JOIN discovery_pipeline_runs dpr ON pe.pipeline_run_id = dpr.id
       WHERE dpr.tenant_id = ?`,
    )
    .bind(tenantId)
    .all();
  return (results ?? []) as Record<string, unknown>[];
}

export async function updatePipelineRunCurrentStep(
  db: D1Database,
  pipelineRunId: string,
  nextStep: string,
): Promise<void> {
  await db
    .prepare(
      `UPDATE discovery_pipeline_runs SET current_step = ?, updated_at = datetime('now') WHERE id = ?`,
    )
    .bind(nextStep, pipelineRunId)
    .run();
}

export async function linkShapingRunToPipeline(
  db: D1Database,
  pipelineRunId: string,
  shapingRunId: string,
): Promise<void> {
  await db
    .prepare(
      `UPDATE discovery_pipeline_runs
       SET shaping_run_id = ?, updated_at = datetime('now')
       WHERE id = ?`,
    )
    .bind(shapingRunId, pipelineRunId)
    .run();
}
