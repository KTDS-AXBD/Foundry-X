/**
 * HarnessRulesService — Harness Evolution Rules 자동 감지 (F126)
 *
 * 4가지 규칙을 검사하고 위반 시 kpi_events 기록 + SSE 알림.
 * kpi_events에 'harness_violation' event_type으로 직접 INSERT (KpiLogger 타입 제약 우회).
 */
import type { SSEManager } from "./sse-manager.js";

export interface HarnessViolation {
  rule: string;
  severity: "error" | "warning" | "info";
  file?: string;
  message: string;
}

export interface HarnessCheckResult {
  score: number;
  passed: boolean;
  violations: HarnessViolation[];
  checkedAt: string;
}

export class HarnessRulesService {
  constructor(
    private db: D1Database,
    private sseManager: SSEManager,
  ) {}

  async checkRules(
    tenantId: string,
    projectId: string,
  ): Promise<HarnessCheckResult> {
    const violations: HarnessViolation[] = [];
    let score = 100;

    // 규칙 1: placeholder-check — CLAUDE.md 존재 여부 (프로젝트 설정 확인)
    const project = await this.db
      .prepare("SELECT id, repo_url FROM projects WHERE id = ? AND org_id = ?")
      .bind(projectId, tenantId)
      .first<{ id: string; repo_url: string }>();

    if (!project) {
      violations.push({
        rule: "placeholder-check",
        severity: "error",
        message: "Project not found or not accessible",
      });
      score -= 30;
    }

    // 규칙 2: consistency-check — 에이전트 프로필과 세션 정합성
    if (project) {
      const agentCount = await this.db
        .prepare(
          "SELECT COUNT(*) as cnt FROM agents WHERE org_id = ?",
        )
        .bind(tenantId)
        .first<{ cnt: number }>();

      const activeSessionCount = await this.db
        .prepare(
          "SELECT COUNT(*) as cnt FROM agent_sessions WHERE project_id = ? AND status = 'active'",
        )
        .bind(projectId)
        .first<{ cnt: number }>();

      if ((agentCount?.cnt ?? 0) === 0) {
        violations.push({
          rule: "consistency-check",
          severity: "warning",
          message: "No agents registered for this organization",
        });
        score -= 10;
      }

      if ((activeSessionCount?.cnt ?? 0) > (agentCount?.cnt ?? 0) * 3) {
        violations.push({
          rule: "consistency-check",
          severity: "warning",
          message: "Too many active sessions relative to agent count",
        });
        score -= 10;
      }
    }

    // 규칙 3: freshness-check — 마지막 wiki 갱신 7일 이상
    if (project) {
      const latestWiki = await this.db
        .prepare(
          "SELECT updated_at FROM wiki_pages WHERE project_id = ? ORDER BY updated_at DESC LIMIT 1",
        )
        .bind(projectId)
        .first<{ updated_at: string }>();

      if (latestWiki) {
        const daysSinceUpdate = Math.floor(
          (Date.now() - new Date(latestWiki.updated_at).getTime()) / 86400_000,
        );
        if (daysSinceUpdate > 7) {
          violations.push({
            rule: "freshness-check",
            severity: "info",
            file: "wiki",
            message: `Wiki content is ${daysSinceUpdate} days old (threshold: 7 days)`,
          });
          score -= 5;
        }
      }
    }

    // 규칙 4: schema-drift — SPEC F-item 대비 agent_tasks 실행 이력 불일치
    if (project) {
      const specCount = await this.db
        .prepare(
          "SELECT COUNT(*) as cnt FROM wiki_pages WHERE project_id = ? AND slug LIKE 'spec-%'",
        )
        .bind(projectId)
        .first<{ cnt: number }>();

      const taskCount = await this.db
        .prepare(
          "SELECT COUNT(*) as cnt FROM agent_tasks WHERE agent_session_id IN (SELECT id FROM agent_sessions WHERE project_id = ?)",
        )
        .bind(projectId)
        .first<{ cnt: number }>();

      if ((specCount?.cnt ?? 0) > 0 && (taskCount?.cnt ?? 0) === 0) {
        violations.push({
          rule: "schema-drift",
          severity: "warning",
          message: "Spec items exist but no agent tasks have been executed",
        });
        score -= 15;
      }
    }

    score = Math.max(0, score);

    // 위반 이벤트를 kpi_events에 기록
    if (violations.length > 0) {
      const id = `kpi-${crypto.randomUUID()}`;
      const metadata = JSON.stringify({
        projectId,
        violationCount: violations.length,
        violations: violations.map((v) => ({ rule: v.rule, severity: v.severity })),
      });

      await this.db
        .prepare(
          "INSERT INTO kpi_events (id, tenant_id, event_type, metadata) VALUES (?, ?, ?, ?)",
        )
        .bind(id, tenantId, "harness_violation", metadata)
        .run();

      // SSE 알림
      this.sseManager.pushEvent({
        event: "activity",
        data: {
          agentId: "harness-rules",
          status: "completed",
          currentTask: `Harness check: ${violations.length} violation(s) found`,
          timestamp: new Date().toISOString(),
        },
      }, tenantId);
    }

    return {
      score,
      passed: score >= 60,
      violations,
      checkedAt: new Date().toISOString(),
    };
  }

  async getViolationHistory(
    tenantId: string,
    projectId: string,
    limit = 20,
  ): Promise<{ events: unknown[]; total: number }> {
    const result = await this.db
      .prepare(
        `SELECT * FROM kpi_events
         WHERE tenant_id = ? AND event_type = 'harness_violation'
         AND json_extract(metadata, '$.projectId') = ?
         ORDER BY created_at DESC LIMIT ?`,
      )
      .bind(tenantId, projectId, limit)
      .all();

    return {
      events: result.results ?? [],
      total: result.results?.length ?? 0,
    };
  }
}
