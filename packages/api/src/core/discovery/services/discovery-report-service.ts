/**
 * Sprint 154+156+157: F342+F346+F349 — 발굴 완료 리포트 CRUD + 집계 + Executive Summary
 */
import type { DiscoveryReportResponse, ExecutiveSummaryData } from "@foundry-x/shared";
import type { UpsertDiscoveryReportInput } from "../schemas/discovery-report-schema.js";

interface StageRow {
  stage: string;
  status: string;
}

interface ArtifactRow {
  stage_id: string;
  output_text: string | null;
}

interface BizItemRow {
  id: string;
  title: string;
  discovery_type: string | null;
}

interface ReportRow {
  id: string;
  item_id: string;
  org_id: string;
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

function safeParseJson(raw: string | null): unknown {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return raw; // JSON이 아니면 원본 텍스트 반환
  }
}

const TOTAL_STAGES = 9; // 2-1 ~ 2-9

export class DiscoveryReportService {
  constructor(private db: D1Database) {}

  /** CRUD: 아이템 ID로 리포트 조회 */
  async getByItem(itemId: string): Promise<ReportRow | null> {
    return this.db
      .prepare("SELECT * FROM ax_discovery_reports WHERE item_id = ?")
      .bind(itemId)
      .first<ReportRow>();
  }

  /** CRUD: 리포트 생성 또는 갱신 */
  async upsert(itemId: string, orgId: string, data: UpsertDiscoveryReportInput): Promise<ReportRow> {
    const existing = await this.getByItem(itemId);

    if (existing) {
      await this.db
        .prepare(
          `UPDATE ax_discovery_reports
           SET report_json = ?, overall_verdict = ?, team_decision = ?, updated_at = datetime('now')
           WHERE item_id = ?`,
        )
        .bind(JSON.stringify(data.reportJson), data.overallVerdict, data.teamDecision, itemId)
        .run();
    } else {
      const id = generateId();
      await this.db
        .prepare(
          `INSERT INTO ax_discovery_reports (id, item_id, org_id, report_json, overall_verdict, team_decision)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .bind(id, itemId, orgId, JSON.stringify(data.reportJson), data.overallVerdict, data.teamDecision)
        .run();
    }

    return (await this.getByItem(itemId))!;
  }

  /** CRUD: 팀 결정 갱신 */
  async setTeamDecision(itemId: string, decision: string): Promise<void> {
    await this.db
      .prepare("UPDATE ax_discovery_reports SET team_decision = ?, updated_at = datetime('now') WHERE item_id = ?")
      .bind(decision, itemId)
      .run();
  }

  /** CRUD: 공유 토큰 생성 */
  async generateShareToken(itemId: string): Promise<string> {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const token = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");

    await this.db
      .prepare("UPDATE ax_discovery_reports SET shared_token = ?, updated_at = datetime('now') WHERE item_id = ?")
      .bind(token, itemId)
      .run();

    return token;
  }

  /** CRUD: 공유 토큰으로 리포트 조회 */
  async getByShareToken(token: string): Promise<ReportRow | null> {
    return this.db
      .prepare("SELECT * FROM ax_discovery_reports WHERE shared_token = ?")
      .bind(token)
      .first<ReportRow>();
  }

  /** F483: 평가결과서 HTML 저장 (upsert) */
  async saveHtml(itemId: string, orgId: string, html: string): Promise<{ updatedAt: string }> {
    const existing = await this.getByItem(itemId);

    if (existing) {
      await this.db
        .prepare(
          `UPDATE ax_discovery_reports
           SET report_html = ?, updated_at = datetime('now')
           WHERE item_id = ?`,
        )
        .bind(html, itemId)
        .run();
    } else {
      const id = generateId();
      await this.db
        .prepare(
          `INSERT INTO ax_discovery_reports (id, item_id, org_id, report_html)
           VALUES (?, ?, ?, ?)`,
        )
        .bind(id, itemId, orgId, html)
        .run();
    }

    const row = await this.getByItem(itemId);
    return { updatedAt: row!.updated_at };
  }

  /** F483: 평가결과서 HTML 조회 */
  async getHtml(itemId: string): Promise<{ html: string; updatedAt: string } | null> {
    const row = await this.db
      .prepare("SELECT report_html, updated_at FROM ax_discovery_reports WHERE item_id = ?")
      .bind(itemId)
      .first<{ report_html: string | null; updated_at: string }>();

    if (!row || !row.report_html) return null;
    return { html: row.report_html, updatedAt: row.updated_at };
  }

  /** F483: 공유 토큰으로 HTML 조회 */
  async getHtmlByToken(token: string): Promise<string | null> {
    const row = await this.db
      .prepare("SELECT report_html FROM ax_discovery_reports WHERE shared_token = ?")
      .bind(token)
      .first<{ report_html: string | null }>();

    return row?.report_html ?? null;
  }

  /** 집계: 스테이지/아티팩트 기반 리포트 생성 */
  async getReport(
    bizItemId: string,
    orgId: string,
  ): Promise<DiscoveryReportResponse | null> {
    // 1. biz_item 존재 확인
    const item = await this.db
      .prepare("SELECT id, title FROM biz_items WHERE id = ? AND org_id = ?")
      .bind(bizItemId, orgId)
      .first<BizItemRow>();

    // discovery_type은 별도 조회 (컬럼 존재 여부에 안전)
    let discoveryType: string | null = null;
    if (item) {
      try {
        const typeRow = await this.db
          .prepare("SELECT discovery_type FROM biz_items WHERE id = ?")
          .bind(bizItemId)
          .first<{ discovery_type: string | null }>();
        discoveryType = typeRow?.discovery_type ?? null;
      } catch {
        // mock DB 등에서 컬럼 미존재 시 무시
      }
    }

    if (!item) return null;

    // 2. stages 진행 상태 조회
    const { results: stages } = await this.db
      .prepare(
        `SELECT stage, status
         FROM biz_item_discovery_stages
         WHERE biz_item_id = ? AND org_id = ?
         ORDER BY stage`,
      )
      .bind(bizItemId, orgId)
      .all<StageRow>();

    const completedStages = stages
      .filter((s) => s.status === "completed")
      .map((s) => s.stage);

    // 3. bd_artifacts에서 최신 버전의 output_text 조회 (스테이지별)
    const { results: artifacts } = await this.db
      .prepare(
        `SELECT stage_id, output_text
         FROM bd_artifacts
         WHERE biz_item_id = ? AND org_id = ? AND status = 'completed'
         ORDER BY stage_id, version DESC`,
      )
      .bind(bizItemId, orgId)
      .all<ArtifactRow>();

    // stage_id별 최신 artifact만 사용
    const tabs: Record<string, unknown> = {};
    const seen = new Set<string>();
    for (const art of artifacts) {
      if (!seen.has(art.stage_id) && art.output_text) {
        seen.add(art.stage_id);
        tabs[art.stage_id] = safeParseJson(art.output_text);
      }
    }

    const overallProgress = stages.length > 0
      ? Math.round((completedStages.length / TOTAL_STAGES) * 100)
      : 0;

    // 4. 리포트 캐시 upsert
    const existing = await this.db
      .prepare("SELECT id FROM ax_discovery_reports WHERE item_id = ?")
      .bind(bizItemId)
      .first<ReportRow>();

    const reportId = existing?.id ?? generateId();

    if (existing) {
      await this.db
        .prepare(
          `UPDATE ax_discovery_reports
           SET report_json = ?, updated_at = datetime('now')
           WHERE item_id = ?`,
        )
        .bind(JSON.stringify(tabs), bizItemId)
        .run();
    } else {
      await this.db
        .prepare(
          `INSERT INTO ax_discovery_reports (id, item_id, org_id, report_json)
           VALUES (?, ?, ?, ?)`,
        )
        .bind(reportId, bizItemId, orgId, JSON.stringify(tabs))
        .run();
    }

    return {
      id: reportId,
      bizItemId: item.id,
      title: item.title,
      type: (discoveryType as DiscoveryReportResponse["type"]),
      completedStages,
      overallProgress,
      tabs,
    };
  }

  /**
   * Sprint 157: F349 — Executive Summary 생성
   * report_json 기반 rule-based 집계 (AI 호출 없음)
   */
  async getSummary(
    bizItemId: string,
    orgId: string,
  ): Promise<ExecutiveSummaryData | null> {
    const report = await this.getReport(bizItemId, orgId);
    if (!report) return null;

    const tabs = report.tabs;
    const ref = tabs["2-1"] as Record<string, unknown> | undefined;
    const market = tabs["2-2"] as Record<string, unknown> | undefined;
    const comp = tabs["2-3"] as Record<string, unknown> | undefined;
    const biz = tabs["2-7"] as Record<string, unknown> | undefined;
    const pkg = tabs["2-8"] as Record<string, unknown> | undefined;
    const eval9 = tabs["2-9"] as Record<string, unknown> | undefined;

    const pkgSummary = pkg && typeof pkg === "object"
      ? (pkg as { executiveSummary?: Record<string, string> }).executiveSummary
      : undefined;

    return {
      oneLiner: pkgSummary?.problem
        ? `${report.title}: ${pkgSummary.problem}`
        : `${report.title} 발굴 리포트`,
      problem: pkgSummary?.problem ?? extractFirst(ref, "jtbd", "job") ?? "미작성",
      solution: pkgSummary?.solution ?? extractFirst(biz, "bmc", "valuePropositions") ?? "미작성",
      market: extractMarketSize(market) ?? "미작성",
      competition: extractFirst(comp, "swot", "strengths") ?? "미작성",
      businessModel: pkgSummary?.businessModel ?? "미작성",
      recommendation: (eval9 as { overallVerdict?: string } | undefined)?.overallVerdict ?? "Conditional",
      openQuestions: [],
    };
  }
}

function extractFirst(obj: unknown, key1: string, key2: string): string | null {
  if (!obj || typeof obj !== "object") return null;
  const nested = (obj as Record<string, unknown>)[key1];
  if (!nested) return null;
  if (Array.isArray(nested) && nested.length > 0) {
    const first = nested[0];
    if (typeof first === "string") return first;
    if (typeof first === "object" && first && key2 in first) {
      return String((first as Record<string, unknown>)[key2]);
    }
  }
  if (typeof nested === "object" && !Array.isArray(nested)) {
    const val = (nested as Record<string, unknown>)[key2];
    if (Array.isArray(val) && val.length > 0) return String(val[0]);
    if (typeof val === "string") return val;
  }
  return null;
}

function extractMarketSize(market: unknown): string | null {
  if (!market || typeof market !== "object") return null;
  const m = market as Record<string, { value?: number; unit?: string }>;
  if (m.tam?.value) return `TAM ${m.tam.value}${m.tam.unit ?? ""}`;
  if (m.sam?.value) return `SAM ${m.sam.value}${m.sam.unit ?? ""}`;
  return null;
}
