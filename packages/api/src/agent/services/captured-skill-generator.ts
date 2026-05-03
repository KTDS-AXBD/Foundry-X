/**
 * F277: CapturedSkillGeneratorService — 워크플로우 패턴 → 메타 스킬 후보 생성 + 중복 감지 + 안전성 검사
 */

import type {
  CapturedCandidate,
  CapturedCandidateDetail,
  CapturedWorkflowPattern,
  CapturedReview,
  SkillCategory,
  SkillSafetyGrade,
} from "@foundry-x/shared";
import type { ListCapturedCandidatesQuery } from "../schemas/captured-engine.js";
import { SafetyChecker } from "../../core/harness/services/safety-checker.js";

export class CapturedSkillGeneratorService {
  constructor(private db: D1Database) {}

  async generate(
    tenantId: string,
    patternId: string,
    overrides?: { nameOverride?: string; categoryOverride?: string },
    _actorId?: string,
  ): Promise<CapturedCandidate> {
    // 1. Fetch pattern
    const pattern = await this.db
      .prepare("SELECT * FROM captured_workflow_patterns WHERE tenant_id = ? AND id = ?")
      .bind(tenantId, patternId)
      .first<PatternRow>();

    if (!pattern) throw new Error("Pattern not found");
    if (pattern.status !== "active") throw new Error("Pattern is not active");

    const skillIds: string[] = parseJson(pattern.skill_sequence, []);
    const steps: { stepId: string; stepName: string; action: string }[] = parseJson(pattern.workflow_step_sequence, []);

    // 2. Fetch source skills from registry
    const sourceSkills: SkillRegistryRow[] = [];
    for (const sid of skillIds) {
      const row = await this.db
        .prepare("SELECT * FROM skill_registry WHERE tenant_id = ? AND skill_id = ? AND deleted_at IS NULL")
        .bind(tenantId, sid)
        .first<SkillRegistryRow>();
      if (row) sourceSkills.push(row);
    }

    // 3. Build name + description
    const stepNames = steps.map((s) => s.stepName).join(" → ");
    const name = overrides?.nameOverride ?? `워크플로우 최적화 — ${stepNames || "시퀀스 패턴"}`;
    const description = `${pattern.pipeline_stage}에서 ${pattern.sample_count}회 반복, 성공률 ${Math.round(pattern.success_rate * 100)}%의 워크플로우 패턴 기반 메타 스킬`;

    // 4. Build prompt template from workflow steps + source skills
    const skillPrompts = sourceSkills
      .filter((s) => s.prompt_template)
      .map((s) => `### ${s.name}\n${s.prompt_template}`);

    const promptTemplate = [
      `# ${name}`,
      "",
      `## 워크플로우 시퀀스`,
      steps.map((s, i) => `${i + 1}. [${s.stepName}] ${s.action}`).join("\n"),
      "",
      `## 기반 패턴`,
      `성공률: ${Math.round(pattern.success_rate * 100)}%, 샘플: ${pattern.sample_count}, 신뢰도: ${Math.round(pattern.confidence * 100)}%`,
      "",
      skillPrompts.length > 0 ? `## 통합 스킬 프롬프트\n${skillPrompts.join("\n\n---\n\n")}` : "",
    ].filter(Boolean).join("\n");

    // 5. Determine category
    const category: SkillCategory = (overrides?.categoryOverride as SkillCategory) ??
      determineMajorCategory(sourceSkills) ??
      "general";

    // 6. Source workflow steps + skill contributions
    const sourceWorkflowSteps = steps.map((s) => ({ stepId: s.stepId, stepName: s.stepName }));
    const contribution = skillIds.length > 0 ? 1 / skillIds.length : 1;
    const sourceSkillsJson = skillIds.map((sid) => ({
      skillId: sid,
      contribution: Math.round(contribution * 100) / 100,
    }));

    // 7. Duplicate detection
    const similarityScore = await this.checkSimilarity(tenantId, name, description);

    // 8. Safety check
    const safetyResult = SafetyChecker.check(promptTemplate);

    // 9. Insert candidate
    const id = generateId("cc");
    await this.db
      .prepare(
        `INSERT INTO captured_candidates
          (id, tenant_id, pattern_id, name, description, category, prompt_template,
           source_workflow_steps, source_skills, similarity_score, safety_grade, safety_score, review_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      )
      .bind(
        id, tenantId, patternId, name, description, category, promptTemplate,
        JSON.stringify(sourceWorkflowSteps), JSON.stringify(sourceSkillsJson),
        similarityScore, safetyResult.grade, safetyResult.score,
      )
      .run();

    return {
      id,
      tenantId,
      patternId,
      name,
      description,
      category,
      promptTemplate,
      sourceWorkflowSteps,
      sourceSkills: sourceSkillsJson,
      similarityScore,
      safetyGrade: safetyResult.grade as SkillSafetyGrade,
      safetyScore: safetyResult.score,
      reviewStatus: "pending",
      registeredSkillId: null,
      createdAt: new Date().toISOString(),
      reviewedAt: null,
      reviewedBy: null,
    };
  }

  async listCandidates(
    tenantId: string,
    params: ListCapturedCandidatesQuery,
  ): Promise<{ candidates: CapturedCandidate[]; total: number }> {
    let countSql = "SELECT COUNT(*) as cnt FROM captured_candidates WHERE tenant_id = ?";
    let sql = "SELECT * FROM captured_candidates WHERE tenant_id = ?";
    const bindings: unknown[] = [tenantId];

    if (params.reviewStatus) {
      countSql += " AND review_status = ?";
      sql += " AND review_status = ?";
      bindings.push(params.reviewStatus);
    }
    if (params.category) {
      countSql += " AND category = ?";
      sql += " AND category = ?";
      bindings.push(params.category);
    }

    const countBindings = [...bindings];
    sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    bindings.push(params.limit, params.offset);

    const [countRow, rows] = await Promise.all([
      this.db.prepare(countSql).bind(...countBindings).first<{ cnt: number }>(),
      this.db.prepare(sql).bind(...bindings).all<CandidateRow>(),
    ]);

    return {
      candidates: (rows.results ?? []).map(mapCandidateRow),
      total: countRow?.cnt ?? 0,
    };
  }

  async getCandidateById(tenantId: string, candidateId: string): Promise<CapturedCandidate | null> {
    const row = await this.db
      .prepare("SELECT * FROM captured_candidates WHERE tenant_id = ? AND id = ?")
      .bind(tenantId, candidateId)
      .first<CandidateRow>();

    return row ? mapCandidateRow(row) : null;
  }

  async getCandidateDetail(tenantId: string, candidateId: string): Promise<CapturedCandidateDetail | null> {
    const candidate = await this.getCandidateById(tenantId, candidateId);
    if (!candidate) return null;

    const patternRow = await this.db
      .prepare("SELECT * FROM captured_workflow_patterns WHERE tenant_id = ? AND id = ?")
      .bind(tenantId, candidate.patternId)
      .first<Record<string, unknown>>();

    const reviewRows = await this.db
      .prepare("SELECT * FROM captured_reviews WHERE tenant_id = ? AND candidate_id = ? ORDER BY created_at DESC")
      .bind(tenantId, candidateId)
      .all<ReviewRow>();

    return {
      ...candidate,
      pattern: patternRow as unknown as CapturedWorkflowPattern,
      reviews: (reviewRows.results ?? []).map(mapReviewRow),
    };
  }

  private async checkSimilarity(tenantId: string, name: string, description: string): Promise<number> {
    const tokens = tokenize(`${name} ${description}`);
    if (tokens.length === 0) return 0;

    const placeholders = tokens.map(() => "?").join(",");
    const row = await this.db
      .prepare(
        `SELECT COUNT(DISTINCT skill_id) as match_count
         FROM skill_search_index
         WHERE tenant_id = ? AND token IN (${placeholders})`,
      )
      .bind(tenantId, ...tokens)
      .first<{ match_count: number }>();

    const matchCount = row?.match_count ?? 0;
    return Math.min(matchCount / Math.max(tokens.length, 1), 1);
  }
}

// ─── Helpers ───

interface PatternRow {
  id: string;
  tenant_id: string;
  methodology_id: string | null;
  pipeline_stage: string;
  workflow_step_sequence: string;
  skill_sequence: string;
  success_rate: number;
  sample_count: number;
  confidence: number;
  status: string;
}

interface SkillRegistryRow {
  id: string;
  skill_id: string;
  name: string;
  description: string | null;
  category: string;
  prompt_template: string | null;
}

interface CandidateRow {
  id: string;
  tenant_id: string;
  pattern_id: string;
  name: string;
  description: string | null;
  category: string;
  prompt_template: string;
  source_workflow_steps: string;
  source_skills: string;
  similarity_score: number;
  safety_grade: string;
  safety_score: number;
  review_status: string;
  registered_skill_id: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

interface ReviewRow {
  id: string;
  tenant_id: string;
  candidate_id: string;
  action: string;
  comment: string | null;
  modified_prompt: string | null;
  reviewer_id: string;
  created_at: string;
}

function mapCandidateRow(r: CandidateRow): CapturedCandidate {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    patternId: r.pattern_id,
    name: r.name,
    description: r.description,
    category: r.category as SkillCategory,
    promptTemplate: r.prompt_template,
    sourceWorkflowSteps: parseJson(r.source_workflow_steps, []),
    sourceSkills: parseJson(r.source_skills, []),
    similarityScore: r.similarity_score,
    safetyGrade: r.safety_grade as SkillSafetyGrade,
    safetyScore: r.safety_score,
    reviewStatus: r.review_status as CapturedCandidate["reviewStatus"],
    registeredSkillId: r.registered_skill_id,
    createdAt: r.created_at,
    reviewedAt: r.reviewed_at,
    reviewedBy: r.reviewed_by,
  };
}

function mapReviewRow(r: ReviewRow): CapturedReview {
  return {
    id: r.id,
    candidateId: r.candidate_id,
    action: r.action as CapturedReview["action"],
    comment: r.comment,
    modifiedPrompt: r.modified_prompt,
    reviewerId: r.reviewer_id,
    createdAt: r.created_at,
  };
}

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2);
}

function determineMajorCategory(skills: SkillRegistryRow[]): SkillCategory | null {
  if (skills.length === 0) return null;
  const counts: Record<string, number> = {};
  for (const s of skills) {
    counts[s.category] = (counts[s.category] ?? 0) + 1;
  }
  let max = 0;
  let maxCat = "general";
  for (const [cat, cnt] of Object.entries(counts)) {
    if (cnt > max) { max = cnt; maxCat = cat; }
  }
  return maxCat as SkillCategory;
}

function generateId(prefix: string): string {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).substring(2, 10);
  return `${prefix}_${t}${r}`;
}
