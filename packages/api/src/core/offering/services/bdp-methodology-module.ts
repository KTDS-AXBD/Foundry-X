/**
 * Sprint 59 F192: BDP 방법론 모듈화 래핑
 * 기존 BDP 서비스(ItemClassifier, AnalysisPaths, DiscoveryCriteria)를
 * MethodologyModule 인터페이스로 래핑한다.
 */
import type { AgentRunner } from "../../agent/services/agent-runner.js";
import { ItemClassifier, type BizItem } from "../../discovery/services/item-classifier.js";
import {
  ANALYSIS_PATHS,
  type StartingPointType,
  STARTING_POINTS,
} from "../../discovery/services/analysis-paths.js";
import {
  DISCOVERY_CRITERIA,
  DiscoveryCriteriaService,
} from "../../discovery/services/discovery-criteria.js";
import type {
  MethodologyModule,
  BizItemContext,
  ModuleClassificationResult,
  AnalysisStepDefinition,
  CriterionDefinition,
  GateCheckResult,
  ReviewMethodDefinition,
} from "./methodology-module.js";

export class BdpMethodologyModule implements MethodologyModule {
  readonly id = "bdp";
  readonly name = "BDP (Business Development Process)";
  readonly description =
    "AX-Discovery-Process v0.8 기반 6단계 사업개발 방법론. Type A/B/C 분류 → 5시작점 → 9기준 검증 → PRD/사업계획서/Prototype 생성";
  readonly version = "1.0.0";

  async matchScore(item: BizItemContext): Promise<number> {
    let score = 75;

    if (item.classification?.itemType) {
      const typeBonus: Record<string, number> = {
        type_a: 10,
        type_b: 5,
        type_c: 0,
      };
      score += typeBonus[item.classification.itemType] ?? 0;
    }

    if (item.startingPoint) {
      score += 5;
    }

    return Math.min(score, 100);
  }

  async classifyItem(
    item: BizItemContext,
    runner: AgentRunner,
    db: D1Database,
  ): Promise<ModuleClassificationResult> {
    const classifier = new ItemClassifier(runner, db);
    const bizItem: BizItem = {
      id: item.id,
      title: item.title,
      description: item.description,
      source: item.source,
      status: "draft",
      orgId: "",
      createdBy: "",
    };
    const result = await classifier.classify(bizItem);

    return {
      classificationKey: result.itemType,
      confidence: result.confidence,
      details: {
        turnAnswers: result.turnAnswers,
        analysisWeights: result.analysisWeights,
        reasoning: result.reasoning,
      },
    };
  }

  getAnalysisSteps(
    classification: ModuleClassificationResult,
  ): AnalysisStepDefinition[] {
    const sp =
      (classification.details.startingPoint as StartingPointType) ?? "idea";
    const validSp = STARTING_POINTS.includes(sp as StartingPointType)
      ? (sp as StartingPointType)
      : "idea";
    const path = ANALYSIS_PATHS[validSp];

    return path.steps.map((step) => ({
      order: step.order,
      activity: step.activity,
      toolIds: step.pmSkills,
      discoveryMapping: step.discoveryMapping,
    }));
  }

  getCriteria(): CriterionDefinition[] {
    return DISCOVERY_CRITERIA.map((c) => ({
      id: c.id,
      name: c.name,
      condition: c.condition,
      relatedTools: [...c.pmSkills],
    }));
  }

  async checkGate(bizItemId: string, db: D1Database): Promise<GateCheckResult> {
    const service = new DiscoveryCriteriaService(db);
    const result = await service.checkGate(bizItemId);

    return {
      gateStatus: result.gateStatus,
      completedCount: result.completedCount,
      totalCount: DISCOVERY_CRITERIA.length,
      missingCriteria: result.missingCriteria.map((c) => ({
        id: c.id,
        name: c.name,
        status: c.status,
      })),
    };
  }

  getReviewMethods(): ReviewMethodDefinition[] {
    return [
      {
        id: "ai-3-provider",
        name: "다중 AI 검토 (3-Provider)",
        type: "ai-review",
        description:
          "ChatGPT, Gemini, Claude 3개 프로바이더에 동일 PRD를 제출하여 독립적 피드백 수집",
      },
      {
        id: "persona-8",
        name: "멀티 페르소나 평가 (8 Personas)",
        type: "persona-evaluation",
        description:
          "CTO, CMO, CFO, 엔지니어, 디자이너, PM, 고객, 투자자 8개 관점에서 PRD 평가",
      },
      {
        id: "six-hats",
        name: "Six Hats 토론",
        type: "debate",
        description:
          "de Bono의 6색 사고모자 기법으로 20턴 순환 토론 수행",
      },
    ];
  }
}
