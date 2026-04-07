/**
 * F275: SkillRegistryService — 스킬 레지스트리 CRUD + 통합 조회
 */

import type {
  SkillRegistryEntry,
  SkillEnrichedView,
  SkillCategory,
  SkillSafetyGrade,
  SkillSourceType,
  SkillStatus,
} from "@foundry-x/shared";
import type { RegisterSkillInput, UpdateSkillInput, BulkRegisterSkillInput } from "../schemas/skill-registry.js";
import { SkillSearchService } from "./skill-search.js";
import { SkillMetricsService } from "./skill-metrics.js";
import { SafetyChecker } from "../../harness/services/safety-checker.js";

export class SkillRegistryService {
  private searchService: SkillSearchService;
  private metricsService: SkillMetricsService;

  constructor(private db: D1Database) {
    this.searchService = new SkillSearchService(db);
    this.metricsService = new SkillMetricsService(db);
  }

  async register(
    tenantId: string,
    input: RegisterSkillInput,
    actorId: string,
  ): Promise<{ id: string; skillId: string }> {
    const id = generateId("sr");
    const tags = input.tags ? JSON.stringify(input.tags) : null;

    await this.db
      .prepare(
        `INSERT INTO skill_registry
          (id, tenant_id, skill_id, name, description, category, tags, source_type, source_ref,
           prompt_template, model_preference, max_tokens, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        tenantId,
        input.skillId,
        input.name,
        input.description ?? null,
        input.category,
        tags,
        input.sourceType,
        input.sourceRef ?? null,
        input.promptTemplate ?? null,
        input.modelPreference ?? null,
        input.maxTokens ?? 4096,
        actorId,
      )
      .run();

    // Build search index
    await this.searchService.buildIndex(tenantId, input.skillId, {
      name: input.name,
      description: input.description,
      tags: input.tags,
      category: input.category,
    });

    // Auto safety check if prompt template provided
    if (input.promptTemplate) {
      const result = SafetyChecker.check(input.promptTemplate);
      await this.db
        .prepare(
          `UPDATE skill_registry SET safety_grade = ?, safety_score = ?, safety_checked_at = ?
           WHERE id = ?`,
        )
        .bind(result.grade, result.score, result.checkedAt, id)
        .run();
    }

    // Audit log
    await this.metricsService.logAudit({
      tenantId,
      entityType: "skill",
      entityId: id,
      action: "created",
      actorId,
      details: JSON.stringify({ skillId: input.skillId, name: input.name }),
    });

    return { id, skillId: input.skillId };
  }

  async list(
    tenantId: string,
    params: { category?: string; status?: string; safetyGrade?: string; limit: number; offset: number },
  ): Promise<{ skills: SkillRegistryEntry[]; total: number }> {
    let countSql = "SELECT COUNT(*) as cnt FROM skill_registry WHERE tenant_id = ? AND deleted_at IS NULL";
    let sql =
      "SELECT * FROM skill_registry WHERE tenant_id = ? AND deleted_at IS NULL";
    const bindings: unknown[] = [tenantId];

    if (params.category) {
      countSql += " AND category = ?";
      sql += " AND category = ?";
      bindings.push(params.category);
    }
    if (params.status) {
      countSql += " AND status = ?";
      sql += " AND status = ?";
      bindings.push(params.status);
    }
    if (params.safetyGrade) {
      countSql += " AND safety_grade = ?";
      sql += " AND safety_grade = ?";
      bindings.push(params.safetyGrade);
    }

    const countBindings = [...bindings];

    sql += " ORDER BY updated_at DESC LIMIT ? OFFSET ?";
    bindings.push(params.limit, params.offset);

    const [countRow, rows] = await Promise.all([
      this.db
        .prepare(countSql)
        .bind(...countBindings)
        .first<{ cnt: number }>(),
      this.db
        .prepare(sql)
        .bind(...bindings)
        .all<SkillRegistryRow>(),
    ]);

    return {
      skills: (rows.results ?? []).map(mapRow),
      total: countRow?.cnt ?? 0,
    };
  }

  async getById(tenantId: string, skillId: string): Promise<SkillRegistryEntry | null> {
    const row = await this.db
      .prepare(
        "SELECT * FROM skill_registry WHERE tenant_id = ? AND skill_id = ? AND deleted_at IS NULL",
      )
      .bind(tenantId, skillId)
      .first<SkillRegistryRow>();

    return row ? mapRow(row) : null;
  }

  async update(
    tenantId: string,
    skillId: string,
    input: UpdateSkillInput,
    actorId: string,
  ): Promise<SkillRegistryEntry> {
    const sets: string[] = ["updated_at = datetime('now')", "updated_by = ?"];
    const bindings: unknown[] = [actorId];

    if (input.name !== undefined) {
      sets.push("name = ?");
      bindings.push(input.name);
    }
    if (input.description !== undefined) {
      sets.push("description = ?");
      bindings.push(input.description);
    }
    if (input.category !== undefined) {
      sets.push("category = ?");
      bindings.push(input.category);
    }
    if (input.tags !== undefined) {
      sets.push("tags = ?");
      bindings.push(JSON.stringify(input.tags));
    }
    if (input.status !== undefined) {
      sets.push("status = ?");
      bindings.push(input.status);
    }
    if (input.promptTemplate !== undefined) {
      sets.push("prompt_template = ?");
      bindings.push(input.promptTemplate);
    }
    if (input.modelPreference !== undefined) {
      sets.push("model_preference = ?");
      bindings.push(input.modelPreference);
    }
    if (input.maxTokens !== undefined) {
      sets.push("max_tokens = ?");
      bindings.push(input.maxTokens);
    }

    bindings.push(tenantId, skillId);

    await this.db
      .prepare(
        `UPDATE skill_registry SET ${sets.join(", ")}
         WHERE tenant_id = ? AND skill_id = ? AND deleted_at IS NULL`,
      )
      .bind(...bindings)
      .run();

    // Rebuild search index if searchable fields changed
    if (input.name || input.description !== undefined || input.tags || input.category) {
      const entry = await this.getById(tenantId, skillId);
      if (entry) {
        await this.searchService.buildIndex(tenantId, skillId, {
          name: entry.name,
          description: entry.description,
          tags: entry.tags,
          category: entry.category,
        });
      }
    }

    // Re-run safety check if prompt changed
    if (input.promptTemplate) {
      const result = SafetyChecker.check(input.promptTemplate);
      await this.db
        .prepare(
          `UPDATE skill_registry SET safety_grade = ?, safety_score = ?, safety_checked_at = ?
           WHERE tenant_id = ? AND skill_id = ?`,
        )
        .bind(result.grade, result.score, result.checkedAt, tenantId, skillId)
        .run();
    }

    // Audit
    await this.metricsService.logAudit({
      tenantId,
      entityType: "skill",
      entityId: skillId,
      action: "updated",
      actorId,
      details: JSON.stringify(input),
    });

    const updated = await this.getById(tenantId, skillId);
    if (!updated) throw new Error("Skill not found after update");
    return updated;
  }

  async softDelete(tenantId: string, skillId: string, actorId: string): Promise<void> {
    await this.db
      .prepare(
        `UPDATE skill_registry SET deleted_at = datetime('now'), updated_by = ?
         WHERE tenant_id = ? AND skill_id = ? AND deleted_at IS NULL`,
      )
      .bind(actorId, tenantId, skillId)
      .run();

    await this.searchService.removeIndex(tenantId, skillId);

    await this.metricsService.logAudit({
      tenantId,
      entityType: "skill",
      entityId: skillId,
      action: "deleted",
      actorId,
    });
  }

  async runSafetyCheck(
    tenantId: string,
    skillId: string,
  ): Promise<{ score: number; grade: string; violations: unknown[] }> {
    const entry = await this.getById(tenantId, skillId);
    if (!entry) throw new Error("Skill not found");

    if (!entry.promptTemplate) {
      return { score: 100, grade: "A", violations: [] };
    }

    const result = SafetyChecker.check(entry.promptTemplate);

    await this.db
      .prepare(
        `UPDATE skill_registry SET safety_grade = ?, safety_score = ?, safety_checked_at = ?
         WHERE tenant_id = ? AND skill_id = ?`,
      )
      .bind(result.grade, result.score, result.checkedAt, tenantId, skillId)
      .run();

    return result;
  }

  async getEnriched(tenantId: string, skillId: string): Promise<SkillEnrichedView | null> {
    const entry = await this.getById(tenantId, skillId);
    if (!entry) return null;

    // F274 메트릭 + 버전 + 리니지 연동
    const [metricsSummary, versions, lineage] = await Promise.all([
      this.metricsService.getSkillMetricsSummary(tenantId, { days: 30 }).then(
        (all) => all.find((m) => m.skillId === skillId) ?? null,
      ),
      this.metricsService.getSkillVersions(tenantId, skillId),
      this.metricsService.getSkillLineage(tenantId, skillId),
    ]);

    return {
      registry: entry,
      metrics: metricsSummary,
      versions,
      lineage,
    };
  }

  async bulkUpsert(
    tenantId: string,
    items: BulkRegisterSkillInput["skills"],
    actorId: string,
  ): Promise<{ created: number; updated: number; errors: Array<{ skillId: string; error: string }>; total: number }> {
    const result = { created: 0, updated: 0, errors: [] as Array<{ skillId: string; error: string }>, total: items.length };
    const BATCH_SIZE = 50;

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE);
      const stmts: D1PreparedStatement[] = [];
      const batchCreated: string[] = [];
      const batchUpdated: string[] = [];

      for (const item of batch) {
        try {
          const existing = await this.db
            .prepare("SELECT id FROM skill_registry WHERE tenant_id = ? AND skill_id = ?")
            .bind(tenantId, item.skillId)
            .first<{ id: string }>();

          if (existing) {
            stmts.push(
              this.db.prepare(
                `UPDATE skill_registry
                 SET name = ?, description = ?, category = ?, tags = ?,
                     source_type = ?, source_ref = ?, updated_by = ?, updated_at = datetime('now')
                 WHERE tenant_id = ? AND skill_id = ?`,
              ).bind(
                item.name,
                item.description ?? null,
                item.category,
                item.tags ? JSON.stringify(item.tags) : null,
                item.sourceType,
                item.sourceRef ?? null,
                actorId,
                tenantId,
                item.skillId,
              ),
            );
            batchUpdated.push(item.skillId);
          } else {
            const id = generateId("sr");
            stmts.push(
              this.db.prepare(
                `INSERT INTO skill_registry
                  (id, tenant_id, skill_id, name, description, category, tags,
                   source_type, source_ref, created_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              ).bind(
                id,
                tenantId,
                item.skillId,
                item.name,
                item.description ?? null,
                item.category,
                item.tags ? JSON.stringify(item.tags) : null,
                item.sourceType,
                item.sourceRef ?? null,
                actorId,
              ),
            );
            batchCreated.push(item.skillId);
          }
        } catch (e) {
          result.errors.push({
            skillId: item.skillId,
            error: e instanceof Error ? e.message : "Unknown error",
          });
        }
      }

      // Execute statements individually (D1 batch uses .all() which fails on INSERT/UPDATE in mock)
      for (const stmt of stmts) {
        await stmt.run();
      }

      result.created += batchCreated.length;
      result.updated += batchUpdated.length;

      // Build search indexes
      for (const item of batch) {
        if (result.errors.some((e) => e.skillId === item.skillId)) continue;
        try {
          await this.searchService.buildIndex(tenantId, item.skillId, {
            name: item.name,
            description: item.description,
            tags: item.tags,
            category: item.category,
          });
        } catch {
          // Search index failure is non-fatal
        }
      }
    }

    return result;
  }

  async syncMetrics(tenantId: string, skillId: string): Promise<void> {
    const metrics = await this.metricsService
      .getSkillMetricsSummary(tenantId, { days: 365 })
      .then((all) => all.find((m) => m.skillId === skillId));

    if (metrics) {
      await this.db
        .prepare(
          `UPDATE skill_registry
           SET token_cost_avg = ?, success_rate = ?, total_executions = ?, updated_at = datetime('now')
           WHERE tenant_id = ? AND skill_id = ?`,
        )
        .bind(
          metrics.totalCostUsd / Math.max(metrics.totalExecutions, 1),
          metrics.successRate,
          metrics.totalExecutions,
          tenantId,
          skillId,
        )
        .run();
    }
  }
}

interface SkillRegistryRow {
  id: string;
  tenant_id: string;
  skill_id: string;
  name: string;
  description: string | null;
  category: string;
  tags: string | null;
  status: string;
  safety_grade: string;
  safety_score: number;
  safety_checked_at: string | null;
  source_type: string;
  source_ref: string | null;
  prompt_template: string | null;
  model_preference: string | null;
  max_tokens: number;
  token_cost_avg: number;
  success_rate: number;
  total_executions: number;
  current_version: number;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

function mapRow(r: SkillRegistryRow): SkillRegistryEntry {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    skillId: r.skill_id,
    name: r.name,
    description: r.description,
    category: r.category as SkillCategory,
    tags: parseTags(r.tags),
    status: r.status as SkillStatus,
    safetyGrade: r.safety_grade as SkillSafetyGrade,
    safetyScore: r.safety_score,
    safetyCheckedAt: r.safety_checked_at,
    sourceType: r.source_type as SkillSourceType,
    sourceRef: r.source_ref,
    promptTemplate: r.prompt_template,
    modelPreference: r.model_preference,
    maxTokens: r.max_tokens,
    tokenCostAvg: r.token_cost_avg,
    successRate: r.success_rate,
    totalExecutions: r.total_executions,
    currentVersion: r.current_version,
    createdBy: r.created_by,
    updatedBy: r.updated_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function generateId(prefix: string): string {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).substring(2, 10);
  return `${prefix}_${t}${r}`;
}
