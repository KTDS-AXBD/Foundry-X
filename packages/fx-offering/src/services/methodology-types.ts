/**
 * Sprint 60: 방법론 플러그인 인터페이스 (F193)
 * Sprint 59 F191에서 레지스트리로 통합 예정 — 선행 정의
 */

// ─── 공통 타입 ───

export interface ClassificationResult {
  methodologyId: string;
  entryPoint: string;
  confidence: number;
  reasoning: string;
  metadata: Record<string, unknown>;
}

export interface AnalysisStepDefinition {
  order: number;
  activity: string;
  skills: string[];
  criteriaMapping: number[];
  isRequired: boolean;
}

export interface CriterionDefinition {
  id: number;
  name: string;
  condition: string;
  skills: string[];
  outputType: string;
  isRequired: boolean;
}

export interface GateResult {
  gateStatus: "blocked" | "warning" | "ready";
  completedCount: number;
  totalCount: number;
  requiredMissing: number;
  details: Array<{
    criterionId: number;
    name: string;
    status: string;
    isRequired: boolean;
  }>;
}

export interface ReviewMethod {
  id: string;
  name: string;
  description: string;
  type: "ai_review" | "persona_evaluation" | "cross_validation" | "manual";
}

// ─── MethodologyModule 인터페이스 ───

export interface MethodologyModule {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;

  classifyItem(item: { title: string; description: string | null; source: string }): Promise<ClassificationResult>;
  getAnalysisSteps(classification: ClassificationResult): AnalysisStepDefinition[];
  getCriteria(): CriterionDefinition[];
  checkGate(bizItemId: string, db: D1Database): Promise<GateResult>;
  getReviewMethods(): ReviewMethod[];
  matchScore(item: { title: string; description: string | null; source: string; classification?: { itemType: string } }): number;
}

// ─── 방법론 레지스트리 (Sprint 59 F191 간이 버전) ───

export interface MethodologyRegistryEntry {
  id: string;
  name: string;
  description: string;
  version: string;
  isDefault: boolean;
  matchScore: (item: Parameters<MethodologyModule["matchScore"]>[0]) => number;
  module: MethodologyModule;
}

const registry: Map<string, MethodologyRegistryEntry> = new Map();

export function registerMethodology(entry: MethodologyRegistryEntry): void {
  registry.set(entry.id, entry);
}

export function getMethodology(id: string): MethodologyModule | undefined {
  return registry.get(id)?.module;
}

export function getAllMethodologies(): MethodologyRegistryEntry[] {
  return Array.from(registry.values());
}

export function recommendMethodology(
  item: Parameters<MethodologyModule["matchScore"]>[0],
): { id: string; name: string; score: number }[] {
  return Array.from(registry.values())
    .map(entry => ({ id: entry.id, name: entry.name, score: entry.matchScore(item) }))
    .sort((a, b) => b.score - a.score);
}

export function clearRegistry(): void {
  registry.clear();
}
