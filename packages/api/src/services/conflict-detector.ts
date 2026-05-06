import type { LLMService } from "../core/infra/llm.js";

// Local types — mirrors @foundry-x/shared F54 types (will import from shared once exported)
type SpecConflictType = "direct" | "dependency" | "priority" | "scope";

interface SpecConflict {
  type: SpecConflictType;
  severity: "critical" | "warning" | "info";
  existingSpec: { id: string; title: string; field: string; value: string };
  newSpec: { field: string; value: string };
  description: string;
  suggestion?: string;
}

interface ExistingSpec {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  dependencies: string[];
  status: "planned" | "in_progress" | "done";
}

export type { SpecConflict, ExistingSpec };

/**
 * F54: Spec 충돌 감지기
 * Phase 1: 규칙 기반 (키워드 유사도, 의존성 교차, P0 중복)
 * Phase 2: LLM 기반 (Phase 1 후보가 있을 때만)
 */
export class ConflictDetector {
  constructor(private llm?: LLMService) {}

  /**
   * 새 Spec과 기존 Spec들 사이의 충돌을 감지한다.
   * 규칙 기반 감지 → LLM 보강 순서.
   */
  async detect(
    newSpec: { title: string; description: string; priority: string; dependencies: string[] },
    existingSpecs: ExistingSpec[],
  ): Promise<SpecConflict[]> {
    const conflicts: SpecConflict[] = [];

    for (const existing of existingSpecs) {
      // 1) 키워드 유사도 → direct conflict
      const titleOverlap = this.calculateKeywordOverlap(newSpec.title, existing.title);
      const descOverlap = this.calculateKeywordOverlap(newSpec.description, existing.description);

      if (titleOverlap >= 0.5 || descOverlap >= 0.6) {
        conflicts.push({
          type: "direct",
          severity: titleOverlap >= 0.7 ? "critical" : "warning",
          existingSpec: {
            id: existing.id,
            title: existing.title,
            field: "title",
            value: existing.title,
          },
          newSpec: {
            field: "title",
            value: newSpec.title,
          },
          description: `새 Spec "${newSpec.title}"이(가) 기존 "${existing.title}"과(와) 유사해요 (유사도: ${Math.round(Math.max(titleOverlap, descOverlap) * 100)}%)`,
          suggestion: `기존 ${existing.id}을(를) 확장하거나 범위를 좁혀보세요`,
        });
      }

      // 2) 의존성 교차 → dependency conflict
      if (newSpec.dependencies.length > 0 && existing.dependencies.length > 0) {
        const sharedDeps = newSpec.dependencies.filter((dep) =>
          existing.dependencies.some(
            (eDep) => this.calculateKeywordOverlap(dep, eDep) >= 0.5,
          ),
        );
        if (sharedDeps.length > 0) {
          conflicts.push({
            type: "dependency",
            severity: "warning",
            existingSpec: {
              id: existing.id,
              title: existing.title,
              field: "dependencies",
              value: existing.dependencies.join(", "),
            },
            newSpec: {
              field: "dependencies",
              value: newSpec.dependencies.join(", "),
            },
            description: `공통 의존성이 있어요: ${sharedDeps.join(", ")}`,
            suggestion: "의존성 순서와 병렬 작업 가능 여부를 확인하세요",
          });
        }
      }

      // 3) P0 중복 → priority conflict
      if (newSpec.priority === "P0" && existing.priority === "P0" && existing.status !== "done") {
        conflicts.push({
          type: "priority",
          severity: "critical",
          existingSpec: {
            id: existing.id,
            title: existing.title,
            field: "priority",
            value: existing.priority,
          },
          newSpec: {
            field: "priority",
            value: newSpec.priority,
          },
          description: `P0 항목이 이미 존재해요: "${existing.title}". 동시에 두 개의 P0은 리소스 충돌을 일으킬 수 있어요`,
          suggestion: "기존 P0 항목을 먼저 완료하거나, 새 항목의 우선순위를 P1로 조정하세요",
        });
      }
    }

    // Phase 2: LLM 보강 (후보가 있을 때만)
    if (conflicts.length > 0 && this.llm) {
      try {
        return await this.enrichWithLLM(newSpec, conflicts);
      } catch {
        // LLM 실패 시 규칙 기반 결과 유지
        return conflicts;
      }
    }

    return conflicts;
  }

  /**
   * 두 문자열의 키워드 유사도를 계산한다 (Jaccard similarity).
   * 불용어 제거 후 단어 집합 교집합/합집합 비율.
   */
  calculateKeywordOverlap(a: string, b: string): number {
    const stopWords = new Set([
      "the", "a", "an", "is", "are", "was", "were", "be", "been",
      "of", "in", "to", "for", "with", "on", "at", "by", "from",
      "and", "or", "not", "this", "that", "it", "as", "but",
      "의", "을", "를", "이", "가", "은", "는", "에", "에서", "으로", "로", "와", "과",
    ]);

    const tokenize = (text: string): Set<string> => {
      const words = text
        .toLowerCase()
        .replace(/[^\w\s가-힣]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 1 && !stopWords.has(w));
      return new Set(words);
    };

    const setA = tokenize(a);
    const setB = tokenize(b);

    if (setA.size === 0 || setB.size === 0) return 0;

    let intersection = 0;
    for (const word of setA) {
      if (setB.has(word)) intersection++;
    }

    const union = new Set([...setA, ...setB]).size;
    return union === 0 ? 0 : intersection / union;
  }

  /**
   * LLM으로 충돌 설명과 제안을 보강한다.
   */
  async enrichWithLLM(
    newSpec: { title: string; description: string },
    conflicts: SpecConflict[],
  ): Promise<SpecConflict[]> {
    if (!this.llm) return conflicts;

    const prompt = `You are reviewing spec conflicts. Given a new spec and detected conflicts, improve each conflict's description and suggestion.

New spec: "${newSpec.title}" — ${newSpec.description}

Conflicts found:
${conflicts.map((c, i) => `${i + 1}. [${c.type}] ${c.description}`).join("\n")}

Respond in JSON array format. Each item: { "description": "improved description", "suggestion": "improved suggestion" }
Output ONLY valid JSON array, no explanation.`;

    const response = await this.llm.generate(
      "You are a spec conflict analyzer. Respond only in JSON.",
      prompt,
    );

    let enrichments: Array<{ description: string; suggestion: string }>;
    try {
      enrichments = JSON.parse(response.content);
    } catch {
      return conflicts;
    }

    return conflicts.map((conflict, i) => {
      const enrichment = enrichments[i];
      if (!enrichment) return conflict;
      return {
        ...conflict,
        description: enrichment.description || conflict.description,
        suggestion: enrichment.suggestion || conflict.suggestion,
      };
    });
  }

  /**
   * D1 requirements 테이블 또는 SPEC.md 파싱 결과에서 ExistingSpec 목록을 조회한다.
   */
  async getExistingSpecs(db: D1Database): Promise<ExistingSpec[]> {
    // spec_conflicts 이력에서 기존에 등록된 spec 제목들을 조회
    // 실제 운영에서는 requirements 라우트처럼 GitHub SPEC.md 파싱도 병행
    const { results } = await db
      .prepare(
        `SELECT DISTINCT new_spec_title as title, existing_spec_id, conflict_type, severity, description
         FROM spec_conflicts
         ORDER BY created_at DESC`,
      )
      .all<{
        title: string;
        existing_spec_id: string | null;
        conflict_type: string;
        severity: string;
        description: string;
      }>();

    // spec_conflicts에서 고유한 spec 정보 추출
    const specMap = new Map<string, ExistingSpec>();
    for (const row of results) {
      if (row.existing_spec_id && !specMap.has(row.existing_spec_id)) {
        specMap.set(row.existing_spec_id, {
          id: row.existing_spec_id,
          title: row.title,
          description: row.description,
          category: "feature",
          priority: "P1",
          dependencies: [],
          status: "planned",
        });
      }
    }

    return [...specMap.values()];
  }
}
