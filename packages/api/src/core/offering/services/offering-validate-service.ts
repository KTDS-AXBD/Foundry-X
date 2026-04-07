/**
 * F373: Offering Validate Service (Sprint 168)
 * O-G-D Generic Runner를 활용한 교차검증 + 결과 저장
 */
import type {
  OfferingValidation,
  ValidationMode,
  ValidationStatus,
} from "../schemas/offering-validate.schema.js";
import type { OGDResult } from "@foundry-x/shared";
import { OgdGenericRunner } from "../../harness/services/ogd-generic-runner.js";
import { OgdDomainRegistry } from "../../harness/services/ogd-domain-registry.js";

interface ValidationRow {
  id: string;
  offering_id: string;
  org_id: string;
  mode: string;
  status: string;
  ogd_run_id: string | null;
  gan_score: number | null;
  gan_feedback: string | null;
  sixhats_summary: string | null;
  expert_summary: string | null;
  overall_score: number | null;
  created_by: string;
  created_at: string;
  completed_at: string | null;
}

interface SectionRow {
  section_key: string;
  title: string;
  content: string | null;
  is_included: number;
}

function rowToValidation(row: ValidationRow): OfferingValidation {
  return {
    id: row.id,
    offeringId: row.offering_id,
    orgId: row.org_id,
    mode: row.mode as ValidationMode,
    status: row.status as ValidationStatus,
    ogdRunId: row.ogd_run_id,
    ganScore: row.gan_score,
    ganFeedback: row.gan_feedback,
    sixhatsSummary: row.sixhats_summary,
    expertSummary: row.expert_summary,
    overallScore: row.overall_score,
    createdBy: row.created_by,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

export class OfferingValidateService {
  constructor(private db: D1Database) {}

  async startValidation(
    orgId: string,
    offeringId: string,
    userId: string,
    mode: ValidationMode,
    registry: OgdDomainRegistry,
  ): Promise<OfferingValidation> {
    // 1. Offering 존재 확인
    const offering = await this.db
      .prepare("SELECT id FROM offerings WHERE id = ? AND org_id = ?")
      .bind(offeringId, orgId)
      .first<{ id: string }>();
    if (!offering) {
      throw new OfferingNotFoundError(offeringId);
    }

    // 2. Validation 레코드 생성
    const id = crypto.randomUUID();
    await this.db
      .prepare(
        `INSERT INTO offering_validations (id, offering_id, org_id, mode, status, created_by)
         VALUES (?, ?, ?, ?, 'running', ?)`,
      )
      .bind(id, offeringId, orgId, mode, userId)
      .run();

    // 3. Sections 조회 → 검증 입력 구성
    const sectionsResult = await this.db
      .prepare(
        "SELECT section_key, title, content, is_included FROM offering_sections WHERE offering_id = ? AND is_included = 1 ORDER BY sort_order ASC",
      )
      .bind(offeringId)
      .all<SectionRow>();

    const sections = sectionsResult.results.map((s) => ({
      sectionKey: s.section_key,
      title: s.title,
      content: s.content ?? "",
    }));

    // 4. O-G-D Generic Runner 호출
    let ogdResult: OGDResult | null = null;
    let status: ValidationStatus = "passed";

    if (registry.has("offering-validate")) {
      try {
        const runner = new OgdGenericRunner(registry, this.db);
        ogdResult = await runner.run({
          domain: "offering-validate",
          input: { sections },
          tenantId: orgId,
          maxRounds: mode === "quick" ? 1 : 3,
          minScore: 0.85,
        });
        status = ogdResult.converged ? "passed" : "failed";
      } catch {
        status = "error";
      }
    } else {
      // O-G-D 어댑터 미등록 시 — 동기식 간이 검증
      status = sections.every((s) => s.content.length > 0) ? "passed" : "failed";
    }

    // 5. 결과 업데이트
    const ganScore = ogdResult?.score ?? (status === "passed" ? 1.0 : 0.0);
    const ganFeedback = ogdResult
      ? ogdResult.rounds.map((r) => r.feedback).join("\n---\n")
      : (status === "passed" ? "All sections have content" : "Some sections are empty");

    await this.db
      .prepare(
        `UPDATE offering_validations
         SET status = ?, ogd_run_id = ?, gan_score = ?, gan_feedback = ?,
             overall_score = ?, completed_at = datetime('now')
         WHERE id = ?`,
      )
      .bind(
        status,
        ogdResult?.runId ?? null,
        ganScore,
        ganFeedback,
        ganScore,
        id,
      )
      .run();

    // 6. 반환
    const row = await this.db
      .prepare("SELECT * FROM offering_validations WHERE id = ?")
      .bind(id)
      .first<ValidationRow>();

    return rowToValidation(row!);
  }

  async listValidations(orgId: string, offeringId: string): Promise<OfferingValidation[]> {
    // Offering 존재 확인
    const offering = await this.db
      .prepare("SELECT id FROM offerings WHERE id = ? AND org_id = ?")
      .bind(offeringId, orgId)
      .first<{ id: string }>();
    if (!offering) return [];

    const result = await this.db
      .prepare(
        "SELECT * FROM offering_validations WHERE offering_id = ? AND org_id = ? ORDER BY created_at DESC",
      )
      .bind(offeringId, orgId)
      .all<ValidationRow>();

    return result.results.map(rowToValidation);
  }
}

export class OfferingNotFoundError extends Error {
  constructor(id: string) {
    super(`Offering not found: ${id}`);
    this.name = "OfferingNotFoundError";
  }
}
