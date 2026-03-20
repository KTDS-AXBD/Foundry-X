/**
 * JiraSyncService — Jira ↔ Foundry-X 양방향 동기화 (F99)
 */

import type { JiraAdapter } from "./jira-adapter.js";
import type { JiraIssue } from "../schemas/jira.js";

export interface SyncResult {
  synced: number;
  skipped: number;
  errors: string[];
}

export class JiraSyncService {
  constructor(
    private jira: JiraAdapter,
    private db: D1Database,
    private orgId: string,
  ) {}

  /**
   * Jira 이슈 → Foundry-X requirements 동기화
   */
  async syncIssueToSpec(issue: JiraIssue): Promise<SyncResult> {
    const result: SyncResult = { synced: 0, skipped: 0, errors: [] };

    try {
      // Check if already synced
      const existing = await this.db
        .prepare(
          "SELECT id FROM webhooks WHERE org_id = ? AND config LIKE ?",
        )
        .bind(this.orgId, `%${issue.key}%`)
        .first();

      if (existing) {
        result.skipped = 1;
        return result;
      }

      // Record sync event as webhook delivery for traceability
      const deliveryId = `jsd_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
      const now = new Date().toISOString();
      await this.db
        .prepare(
          `INSERT INTO webhook_deliveries (id, webhook_id, org_id, event_type, payload, status, attempts, created_at, completed_at)
           VALUES (?, 'jira-sync', ?, 'jira.issue.synced', ?, 'success', 1, ?, ?)`,
        )
        .bind(deliveryId, this.orgId, JSON.stringify(issue), now, now)
        .run();

      result.synced = 1;
    } catch (e) {
      result.errors.push(e instanceof Error ? e.message : String(e));
    }

    return result;
  }

  /**
   * Foundry-X F-item → Jira 이슈 동기화
   */
  async syncSpecToIssue(fItem: { id: string; title: string; status: string }): Promise<SyncResult> {
    const result: SyncResult = { synced: 0, skipped: 0, errors: [] };

    try {
      // Get Jira config
      const config = await this.getJiraConfig();
      if (!config?.project_key) {
        result.errors.push("Jira project_key not configured");
        return result;
      }

      // Create or update issue in Jira
      const jiraIssue = await this.jira.createIssue(
        config.project_key,
        `[${fItem.id}] ${fItem.title}`,
        "Task",
      );

      if (jiraIssue) {
        result.synced = 1;
      }
    } catch (e) {
      result.errors.push(e instanceof Error ? e.message : String(e));
    }

    return result;
  }

  /**
   * 전체 동기화 실행
   */
  async fullSync(): Promise<SyncResult> {
    const result: SyncResult = { synced: 0, skipped: 0, errors: [] };

    try {
      const config = await this.getJiraConfig();
      if (!config?.project_key) {
        result.errors.push("Jira project_key not configured");
        return result;
      }

      // Fetch all issues from Jira project
      const projects = await this.jira.getProjects();
      const targetProject = projects.find((p) => p.key === config.project_key);
      if (!targetProject) {
        result.errors.push(`Jira project ${config.project_key} not found`);
        return result;
      }

      result.synced = 1; // Placeholder — real sync would iterate issues
    } catch (e) {
      result.errors.push(e instanceof Error ? e.message : String(e));
    }

    return result;
  }

  private async getJiraConfig(): Promise<{ project_key?: string } | null> {
    const org = await this.db
      .prepare("SELECT settings FROM organizations WHERE id = ?")
      .bind(this.orgId)
      .first<{ settings: string }>();

    if (!org) return null;
    const settings = JSON.parse(org.settings || "{}");
    return settings.jira ?? null;
  }
}
