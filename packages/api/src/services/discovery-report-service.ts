/**
 * Sprint 156: F346 — 발굴 완료 리포트 집계 서비스
 * biz_item_discovery_stages (진행 상태) + bd_artifacts (스킬 결과)를 합쳐 리포트 구성
 */
import type { DiscoveryReportResponse } from "@foundry-x/shared";

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
      .prepare("SELECT id FROM ax_discovery_reports WHERE biz_item_id = ?")
      .bind(bizItemId)
      .first<ReportRow>();

    const reportId = existing?.id ?? generateId();

    if (existing) {
      await this.db
        .prepare(
          `UPDATE ax_discovery_reports
           SET report_json = ?, updated_at = datetime('now')
           WHERE biz_item_id = ?`,
        )
        .bind(JSON.stringify(tabs), bizItemId)
        .run();
    } else {
      await this.db
        .prepare(
          `INSERT INTO ax_discovery_reports (id, biz_item_id, org_id, report_json)
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
}
