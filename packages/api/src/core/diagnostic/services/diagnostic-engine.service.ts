// F602: DiagnosticEngine — 4대 진단 (Missing/Duplicate/Overspec/Inconsistency)
import { generateTraceId, generateSpanId } from "../../infra/types.js";
import type { AuditBus } from "../../infra/types.js";
import type { DiagnosticFinding, DiagnosticReport, DiagnosticType } from "../types.js";

export class DiagnosticEngine {
  constructor(
    private readonly db: D1Database,
    private readonly auditBus: Pick<AuditBus, "emit">,
  ) {}

  async runMissing(runId: string, orgId: string): Promise<number> {
    const rows = await this.db
      .prepare(
        `SELECT id FROM service_entities
          WHERE org_id = ? AND (besir_type IS NULL OR title IS NULL OR title = '')`,
      )
      .bind(orgId)
      .all<{ id: string }>();

    for (const row of rows.results ?? []) {
      await this.insertFinding(runId, orgId, "missing", "warning", row.id, {
        reason: "missing besir_type or title",
      });
    }
    return rows.results?.length ?? 0;
  }

  async runDuplicate(runId: string, orgId: string): Promise<number> {
    const rows = await this.db
      .prepare(
        `SELECT entity_type, external_id, COUNT(*) as cnt
           FROM service_entities
          WHERE org_id = ?
          GROUP BY entity_type, external_id
          HAVING COUNT(*) > 1`,
      )
      .bind(orgId)
      .all<{ entity_type: string; external_id: string; cnt: number }>();

    for (const row of rows.results ?? []) {
      await this.insertFinding(runId, orgId, "duplicate", "warning", null, {
        entityType: row.entity_type,
        externalId: row.external_id,
        count: row.cnt,
      });
    }
    return rows.results?.length ?? 0;
  }

  async runOverspec(runId: string, orgId: string): Promise<number> {
    const rows = await this.db
      .prepare(
        `SELECT id FROM service_entities WHERE org_id = ?
           AND id NOT IN (SELECT source_id FROM entity_links)
           AND id NOT IN (SELECT target_id FROM entity_links)`,
      )
      .bind(orgId)
      .all<{ id: string }>();

    for (const row of rows.results ?? []) {
      await this.insertFinding(runId, orgId, "overspec", "info", row.id, {
        reason: "no entity_links",
      });
    }
    return rows.results?.length ?? 0;
  }

  async runInconsistency(runId: string, orgId: string): Promise<number> {
    const rows = await this.db
      .prepare(
        `SELECT external_id, COUNT(DISTINCT title) as title_count
           FROM service_entities
          WHERE org_id = ?
          GROUP BY external_id
          HAVING COUNT(DISTINCT title) > 1`,
      )
      .bind(orgId)
      .all<{ external_id: string; title_count: number }>();

    for (const row of rows.results ?? []) {
      await this.insertFinding(runId, orgId, "inconsistency", "critical", null, {
        externalId: row.external_id,
        distinctTitles: row.title_count,
      });
    }
    return rows.results?.length ?? 0;
  }

  async runAll(orgId: string, types: DiagnosticType[]): Promise<DiagnosticReport> {
    const runId = crypto.randomUUID();
    const startedAt = Date.now();

    await this.db
      .prepare(
        `INSERT INTO diagnostic_runs (id, org_id, diagnostic_types, status)
         VALUES (?, ?, ?, 'running')`,
      )
      .bind(runId, orgId, JSON.stringify(types))
      .run();

    const summary: Record<DiagnosticType, number> = {
      missing: 0,
      duplicate: 0,
      overspec: 0,
      inconsistency: 0,
    };

    if (types.includes("missing")) summary.missing = await this.runMissing(runId, orgId);
    if (types.includes("duplicate")) summary.duplicate = await this.runDuplicate(runId, orgId);
    if (types.includes("overspec")) summary.overspec = await this.runOverspec(runId, orgId);
    if (types.includes("inconsistency"))
      summary.inconsistency = await this.runInconsistency(runId, orgId);

    const completedAt = Date.now();

    await this.db
      .prepare(
        `UPDATE diagnostic_runs SET status='completed', summary=?, completed_at=? WHERE id=?`,
      )
      .bind(JSON.stringify(summary), completedAt, runId)
      .run();

    const ctx = { traceId: generateTraceId(), spanId: generateSpanId(), sampled: true };
    await this.auditBus.emit("diagnostic.completed", { runId, orgId, summary }, ctx);

    const findings = await this.getFindings(runId);
    return { runId, orgId, status: "completed", summary, findings, startedAt, completedAt };
  }

  async getFindings(runId: string): Promise<DiagnosticFinding[]> {
    const rows = await this.db
      .prepare(
        `SELECT id, run_id, org_id, diagnostic_type, severity, entity_id, detail, created_at
           FROM diagnostic_findings WHERE run_id = ? ORDER BY created_at ASC`,
      )
      .bind(runId)
      .all<{
        id: string;
        run_id: string;
        org_id: string;
        diagnostic_type: DiagnosticType;
        severity: string;
        entity_id: string | null;
        detail: string;
        created_at: number;
      }>();

    return (rows.results ?? []).map((r) => ({
      id: r.id,
      runId: r.run_id,
      orgId: r.org_id,
      diagnosticType: r.diagnostic_type,
      severity: r.severity as DiagnosticFinding["severity"],
      entityId: r.entity_id,
      detail: JSON.parse(r.detail) as Record<string, unknown>,
      createdAt: r.created_at,
    }));
  }

  private async insertFinding(
    runId: string,
    orgId: string,
    diagnosticType: DiagnosticType,
    severity: DiagnosticFinding["severity"],
    entityId: string | null,
    detail: Record<string, unknown>,
  ): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO diagnostic_findings (id, run_id, org_id, diagnostic_type, severity, entity_id, detail)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        crypto.randomUUID(),
        runId,
        orgId,
        diagnosticType,
        severity,
        entityId,
        JSON.stringify(detail),
      )
      .run();
  }
}
