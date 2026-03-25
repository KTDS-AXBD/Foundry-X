/**
 * Sprint 59 F191: MethodologyModule 인터페이스 + 공통 타입
 * 방법론 플러그인 아키텍처의 핵심 계약.
 */

// ─── 공통 타입 ───

export interface BizItemContext {
  id: string;
  title: string;
  description: string | null;
  source: string;
  classification?: {
    itemType: string;
    confidence: number;
    analysisWeights: Record<string, number>;
  } | null;
  startingPoint?: string | null;
}

export interface ModuleClassificationResult {
  /** 방법론 고유 분류 체계 (BDP: type_a/b/c, pm-skills: TBD) */
  classificationKey: string;
  confidence: number;
  details: Record<string, unknown>;
}

export interface AnalysisStepDefinition {
  order: number;
  activity: string;
  toolIds: string[];
  discoveryMapping: number[];
}

export interface CriterionDefinition {
  id: number;
  name: string;
  condition: string;
  relatedTools: string[];
}

export interface GateCheckResult {
  gateStatus: "blocked" | "warning" | "ready";
  completedCount: number;
  totalCount: number;
  missingCriteria: Array<{ id: number; name: string; status: string }>;
}

export interface ReviewMethodDefinition {
  id: string;
  name: string;
  type: "ai-review" | "persona-evaluation" | "debate" | "custom";
  description: string;
}

// ─── 핵심 인터페이스 ───

export interface MethodologyModule {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;

  matchScore(item: BizItemContext): Promise<number>;

  classifyItem(
    item: BizItemContext,
    runner: import("./agent-runner.js").AgentRunner,
    db: D1Database,
  ): Promise<ModuleClassificationResult>;

  getAnalysisSteps(classification: ModuleClassificationResult): AnalysisStepDefinition[];

  getCriteria(): CriterionDefinition[];

  checkGate(bizItemId: string, db: D1Database): Promise<GateCheckResult>;

  getReviewMethods(): ReviewMethodDefinition[];
}

// ─── DB / API 용 메타 타입 ───

export interface MethodologyModuleMeta {
  id: string;
  name: string;
  description: string;
  version: string;
  isActive: boolean;
  configJson: Record<string, unknown> | null;
  criteriaCount: number;
  reviewMethodCount: number;
}

export interface MethodologySelection {
  id: string;
  bizItemId: string;
  methodologyId: string;
  matchScore: number | null;
  selectedBy: "auto" | "manual";
  isCurrent: boolean;
  createdAt: string;
}

export interface MethodologyRecommendation {
  methodologyId: string;
  name: string;
  matchScore: number;
  description: string;
}
