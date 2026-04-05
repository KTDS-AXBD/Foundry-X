/**
 * Sprint 154: F342 DiscoveryReportService — 발굴 완료 리포트 관리
 */
import type { UpsertDiscoveryReportInput } from "../schemas/discovery-report-schema.js";

interface DiscoveryReportRow {
  id: string;
  org_id: string;
  item_id: string;
  report_json: string;
  overall_verdict: string | null;
  team_decision: string | null;
  shared_token: string | null;
  created_at: string;
  updated_at: string;
}

function generateId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export class DiscoveryReportService {
  constructor(private db: D1Database) {}

  async getByItem(itemId: string): Promise<DiscoveryReportRow | null> {
    return this.db
      .prepare("SELECT * FROM ax_discovery_reports WHERE item_id = ?")
      .bind(itemId)
      .first<DiscoveryReportRow>();
  }

  async upsert(itemId: string, orgId: string, input: UpsertDiscoveryReportInput): Promise<DiscoveryReportRow> {
    const id = generateId();
    const reportJson = JSON.stringify(input.reportJson);

    await this.db
      .prepare(
        `INSERT INTO ax_discovery_reports (id, org_id, item_id, report_json, overall_verdict, team_decision)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(item_id) DO UPDATE SET
           report_json = excluded.report_json,
           overall_verdict = excluded.overall_verdict,
           team_decision = excluded.team_decision,
           updated_at = datetime('now')`,
      )
      .bind(id, orgId, itemId, reportJson, input.overallVerdict ?? null, input.teamDecision ?? null)
      .run();

    return (await this.getByItem(itemId))!;
  }

  async setTeamDecision(itemId: string, decision: string): Promise<void> {
    await this.db
      .prepare("UPDATE ax_discovery_reports SET team_decision = ?, updated_at = datetime('now') WHERE item_id = ?")
      .bind(decision, itemId)
      .run();
  }

  async generateShareToken(itemId: string): Promise<string> {
    const token = generateToken();
    await this.db
      .prepare("UPDATE ax_discovery_reports SET shared_token = ?, updated_at = datetime('now') WHERE item_id = ?")
      .bind(token, itemId)
      .run();
    return token;
  }

  async getByShareToken(token: string): Promise<DiscoveryReportRow | null> {
    return this.db
      .prepare("SELECT * FROM ax_discovery_reports WHERE shared_token = ?")
      .bind(token)
      .first<DiscoveryReportRow>();
  }
}
