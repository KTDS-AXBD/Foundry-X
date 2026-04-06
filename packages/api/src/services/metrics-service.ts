// ─── F362: 통합 운영 지표 서비스 (Sprint 164, Phase 17) ───

import type {
  SkillReuseData,
  SkillReuseResponse,
  AgentUsageData,
  AgentUsageResponse,
  MetricsOverview,
} from "@foundry-x/shared";
import { RuleEffectivenessService } from "./rule-effectiveness-service.js";

export class MetricsService {
  constructor(private db: D1Database) {}

  /**
   * FR-05: skill_executions × skill_lineage JOIN으로 재사용률 산출.
   * DERIVED/CAPTURED 파생 스킬이 실행된 횟수 / 전체 실행 횟수.
   */
  async getSkillReuse(tenantId: string): Promise<SkillReuseResponse> {
    // 전체 스킬 실행 횟수 (skill_id별)
    const { results: executions } = await this.db
      .prepare(
        `SELECT skill_id, COUNT(*) as total
         FROM skill_executions
         WHERE tenant_id = ?
         GROUP BY skill_id`,
      )
      .bind(tenantId)
      .all();

    // lineage 정보 (child_skill_id = 파생된 스킬)
    const { results: lineages } = await this.db
      .prepare(
        `SELECT child_skill_id, derivation_type, COUNT(*) as cnt
         FROM skill_lineage
         WHERE tenant_id = ?
         GROUP BY child_skill_id, derivation_type`,
      )
      .bind(tenantId)
      .all();

    const lineageMap = new Map<string, { type: string; count: number }>();
    let derivedCount = 0;
    let capturedCount = 0;

    for (const l of lineages ?? []) {
      const skillId = l.child_skill_id as string;
      const type = l.derivation_type as string;
      lineageMap.set(skillId, { type, count: l.cnt as number });
      if (type === "derived") derivedCount++;
      if (type === "captured") capturedCount++;
    }

    const items: SkillReuseData[] = [];
    let totalReused = 0;
    let totalExecs = 0;

    for (const e of executions ?? []) {
      const skillId = e.skill_id as string;
      const total = e.total as number;
      const lineage = lineageMap.get(skillId);
      const reuseCount = lineage ? lineage.count : 0;
      const derivationType = lineage
        ? (lineage.type as SkillReuseData["derivationType"])
        : "manual";
      const reuseRate = total > 0 ? Math.round((reuseCount / total) * 100) : 0;

      items.push({
        skillId,
        derivationType,
        totalExecutions: total,
        reuseCount,
        reuseRate,
      });

      totalReused += reuseCount;
      totalExecs += total;
    }

    return {
      items,
      overallReuseRate:
        totalExecs > 0 ? Math.round((totalReused / totalExecs) * 100) : 0,
      derivedCount,
      capturedCount,
    };
  }

  /**
   * FR-06: execution_events source별 월간 집계 → 에이전트/스킬 활용률.
   */
  async getAgentUsage(
    tenantId: string,
    month?: string,
  ): Promise<AgentUsageResponse> {
    const targetMonth =
      month ?? new Date().toISOString().slice(0, 7); // YYYY-MM

    const { results } = await this.db
      .prepare(
        `SELECT source, strftime('%Y-%m', created_at) as month, COUNT(*) as cnt
         FROM execution_events
         WHERE tenant_id = ? AND strftime('%Y-%m', created_at) = ?
         GROUP BY source, month
         ORDER BY cnt DESC`,
      )
      .bind(tenantId, targetMonth)
      .all();

    // 모든 source 목록 (해당 월 이벤트가 없는 것도 포함)
    const { results: allSources } = await this.db
      .prepare(
        `SELECT DISTINCT source FROM execution_events WHERE tenant_id = ?`,
      )
      .bind(tenantId)
      .all();

    const activeSourceSet = new Set<string>();
    const items: AgentUsageData[] = [];

    for (const r of results ?? []) {
      const source = r.source as string;
      activeSourceSet.add(source);
      items.push({
        source,
        month: r.month as string,
        eventCount: r.cnt as number,
        isUnused: false,
      });
    }

    const unusedSources: string[] = [];
    for (const s of allSources ?? []) {
      const source = s.source as string;
      if (!activeSourceSet.has(source)) {
        unusedSources.push(source);
        items.push({
          source,
          month: targetMonth,
          eventCount: 0,
          isUnused: true,
        });
      }
    }

    const totalSources = (allSources ?? []).length;

    return {
      items,
      totalSources,
      activeSources: activeSourceSet.size,
      unusedSources,
    };
  }

  /**
   * FR-08: 통합 운영 지표 — 재사용률 + 활용률 + Rule 효과 요약.
   */
  async getOverview(tenantId: string): Promise<MetricsOverview> {
    const currentMonth = new Date().toISOString().slice(0, 7);

    const [reuse, usage, effectivenessItems] = await Promise.all([
      this.getSkillReuse(tenantId),
      this.getAgentUsage(tenantId, currentMonth),
      new RuleEffectivenessService(this.db).measureAll(tenantId),
    ]);

    const measured = effectivenessItems.filter(
      (e) => e.status === "measured",
    );
    const avgScore =
      measured.length > 0
        ? Math.round(
            measured.reduce((sum, e) => sum + e.effectivenessScore, 0) /
              measured.length,
          )
        : 0;

    return {
      ruleEffectiveness: {
        averageScore: avgScore,
        totalRules: effectivenessItems.length,
        measuredRules: measured.length,
      },
      skillReuse: {
        overallReuseRate: reuse.overallReuseRate,
        derivedCount: reuse.derivedCount,
        capturedCount: reuse.capturedCount,
      },
      agentUsage: {
        totalSources: usage.totalSources,
        activeSources: usage.activeSources,
        unusedCount: usage.unusedSources.length,
      },
      period: currentMonth,
    };
  }
}
