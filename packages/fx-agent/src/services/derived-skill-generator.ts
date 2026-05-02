/**
 * F276: DerivedSkillGeneratorService — 패턴 → 스킬 후보 생성 + 중복 감지 + 안전성 사전 검사
 */

import type {
  DerivedCandidate,
  DerivedCandidateDetail,
  DerivedPattern,
  DerivedReview,
  SkillCategory,
  SkillSafetyGrade,
  SkillRegistryEntry,
} from "@foundry-x/shared";
import type { ListCandidatesQuery } from "../schemas/derived-engine.js";
import { SafetyChecker } from "./safety-checker.js";

export class DerivedSkillGeneratorService {
  constructor(private db: D1Database) {}

  async generate(
    tenantId: string,
    patternId: string,
    overrides?: { nameOverride?: string; categoryOverride?: string },
    _actorId?: string,
  ): Promise<DerivedCandidate> {
    // 1. Fetch pattern
    const pattern = await this.db
      .prepare("SELECT * FROM derived_patterns WHERE tenant_id = ? AND id = ?")
      .bind(tenantId, patternId)
      .first<PatternRow>();

    if (!pattern) throw new Error("Pattern not found");
    if (pattern.status !== "active") throw new Error("Pattern is not active");

    const skillIds: string[] = parseJson(pattern.skill_ids, []);

    // 2. Fetch source skills from registry
    const sourceSkills: SkillRegistryRow[] = [];
    for (const sid of skillIds) {
      const row = await this.db
        .prepare("SELECT * FROM skill_registry WHERE tenant_id = ? AND skill_id = ? AND deleted_at IS NULL")
        .bind(tenantId, sid)
        .first<SkillRegistryRow>();
      if (row) sourceSkills.push(row);
    }

    // 3. Build prompt template
    const skillNames = sourceSkills.map((s) => s.name).join(" + ");
    const stage = pattern.pipeline_stage;
    const name = overrides?.nameOverride ?? `${stage} 최적화 — ${skillNames || skillIds.join("+")} 기반`;
    const description = `${stage}에서 성공률 ${Math.round(pattern.success_rate * 100)}%로 검증된 패턴 기반 파생 스킬`;

    const promptParts = sourceSkills
      .filter((s) => s.prompt_template)
      .map((s) => s.prompt_template!);
    const promptTemplate = promptParts.length > 0
      ? `# ${name}\n\n## 기반 패턴\n성공률: ${Math.round(pattern.success_rate * 100)}%, 샘플: ${pattern.sample_count}\n\n## 통합 프롬프트\n${promptParts.join("\n\n---\n\n")}`
      : `# ${name}\n\n${description}\n\n성공률: ${Math.round(pattern.success_rate * 100)}%, 샘플: ${pattern.sample_count}`;

    // 4. Determine category
    const category: SkillCategory = (overrides?.categoryOverride as SkillCategory) ??
      determineMajorCategory(sourceSkills) ??
      "general";

    // 5. Source skill contributions
    const contribution = sourceSkills.length > 0 ? 1 / sourceSkills.length : 1;
    const sourceSkillsJson = skillIds.map((sid) => ({
      skillId: sid,
      contribution: Math.round(contribution * 100) / 100,
    }));

    // 6. Duplicate detection via search index
    const similarityScore = await this.checkSimilarity(tenantId, name, description);

    // 7. Safety pre-check
    const safetyResult = SafetyChecker.check(promptTemplate);

    // 8. Insert candidate
    const id = generateId("dc");
    await this.db
      .prepare(
        `INSERT INTO derived_candidates
          (id, tenant_id, pattern_id, name, description, category, prompt_template,
           source_skills, similarity_score, safety_grade, safety_score, review_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      )
      .bind(
        id, tenantId, patternId, name, description, category, promptTemplate,
        JSON.stringify(sourceSkillsJson), similarityScore,
        safetyResult.grade, safetyResult.score,
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
    params: ListCandidatesQuery,
  ): Promise<{ candidates: DerivedCandidate[]; total: number }> {
    let countSql = "SELECT COUNT(*) as cnt FROM derived_candidates WHERE tenant_id = ?";
    let sql = "SELECT * FROM derived_candidates WHERE tenant_id = ?";
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

  async getCandidateById(tenantId: string, candidateId: string): Promise<DerivedCandidate | null> {
    const row = await this.db
      .prepare("SELECT * FROM derived_candidates WHERE tenant_id = ? AND id = ?")
      .bind(tenantId, candidateId)
      .first<CandidateRow>();

    return row ? mapCandidateRow(row) : null;
  }

  async getCandidateDetail(tenantId: string, candidateId: string): Promise<DerivedCandidateDetail | null> {
    const candidate = await this.getCandidateById(tenantId, candidateId);
    if (!candidate) return null;

    // Pattern
    const patternRow = await this.db
      .prepare("SELECT * FROM derived_patterns WHERE tenant_id = ? AND id = ?")
      .bind(tenantId, candidate.patternId)
      .first<Record<string, unknown>>();

    // Reviews
    const reviewRows = await this.db
      .prepare("SELECT * FROM derived_reviews WHERE tenant_id = ? AND candidate_id = ? ORDER BY created_at DESC")
      .bind(tenantId, candidateId)
      .all<ReviewRow>();

    // Source skill entries
    const sourceSkillEntries: SkillRegistryEntry[] = [];
    for (const ss of candidate.sourceSkills) {
      const row = await this.db
        .prepare("SELECT * FROM skill_registry WHERE tenant_id = ? AND skill_id = ? AND deleted_at IS NULL")
        .bind(tenantId, ss.skillId)
        .first<Record<string, unknown>>();
      if (row) sourceSkillEntries.push(row as unknown as SkillRegistryEntry);
    }

    return {
      ...candidate,
      pattern: patternRow as unknown as DerivedPattern,
      reviews: (reviewRows.results ?? []).map(mapReviewRow),
      sourceSkillEntries,
    };
  }

  private async checkSimilarity(tenantId: string, name: string, description: string): Promise<number> {
    // Simple check: search the search index for similar tokens
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
    // Rough similarity: proportion of matching skills to total tokens
    return Math.min(matchCount / Math.max(tokens.length, 1), 1);
  }
}

// ─── Helpers ───

interface PatternRow {
  id: string;
  tenant_id: string;
  pipeline_stage: string;
  discovery_stage: string | null;
  pattern_type: string;
  skill_ids: string;
  success_rate: number;
  sample_count: number;
  status: string;
  prompt_template?: string;
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

function mapCandidateRow(r: CandidateRow): DerivedCandidate {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    patternId: r.pattern_id,
    name: r.name,
    description: r.description,
    category: r.category as SkillCategory,
    promptTemplate: r.prompt_template,
    sourceSkills: parseJson(r.source_skills, []),
    similarityScore: r.similarity_score,
    safetyGrade: r.safety_grade as SkillSafetyGrade,
    safetyScore: r.safety_score,
    reviewStatus: r.review_status as DerivedCandidate["reviewStatus"],
    registeredSkillId: r.registered_skill_id,
    createdAt: r.created_at,
    reviewedAt: r.reviewed_at,
    reviewedBy: r.reviewed_by,
  };
}

function mapReviewRow(r: ReviewRow): DerivedReview {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    candidateId: r.candidate_id,
    action: r.action as DerivedReview["action"],
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
