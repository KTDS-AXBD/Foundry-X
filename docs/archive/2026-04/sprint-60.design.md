---
code: FX-DSGN-060
title: "Sprint 60 — F193 pm-skills 방법론 모듈 + F194 검증 기준 + F195 관리 UI 상세 설계"
version: 1.0
status: Active
category: DSGN
created: 2026-03-25
updated: 2026-03-25
author: Sinclair Seo (AI-assisted)
sprint: 60
features: [F193, F194, F195]
ref: "[[FX-PLAN-060]]"
---

# Sprint 60 상세 설계 — F193 + F194 + F195

> Plan: [[FX-PLAN-060]] `docs/01-plan/features/sprint-60.plan.md`

---

## 1. 구현 순서 (Implementation Order)

```
Phase A: F193+F194 — pm-skills 방법론 모듈 + 검증 기준 (Worker 1)
  A1. MethodologyModule 인터페이스 정의 (methodology-types.ts)
  A2. D1 migration 0044_pm_skills_criteria.sql
  A3. pm-skills-criteria.ts (PmSkillsCriteriaService)
  A4. pm-skills-pipeline.ts (스킬 의존 관계 + 실행 순서)
  A5. pm-skills-module.ts (PmSkillsModule implements MethodologyModule)
  A6. schemas/pm-skills.ts (Zod)
  A7. routes/methodology.ts (신규, 7 endpoints)
  A8. shared/types.ts (PmSkillsClassification, PmSkillsCriterion, etc.)
  A9. Tests: pm-skills-criteria.test.ts + pm-skills-module.test.ts + methodology route tests
  A10. index.ts route 등록

Phase B: F195 — 방법론 관리 UI (Worker 2)
  B1. lib/api-client.ts 확장 (methodology endpoints)
  B2. MethodologyListPanel.tsx
  B3. MethodologyDetailPanel.tsx
  B4. MethodologyProgressDash.tsx
  B5. MethodologySelector.tsx
  B6. app/(app)/methodologies/page.tsx
  B7. sidebar.tsx 네비게이션 추가
  B8. Tests: methodology-ui.test.tsx
```

---

## 2. MethodologyModule 인터페이스 (A1)

> ⚠️ Sprint 59 F191에서 정의 예정이지만, Sprint 60에서 선행 구현하여 Sprint 59가 이를 채택하도록 해요.

```typescript
// packages/api/src/services/methodology-types.ts (NEW)

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
  skills: string[];          // 실행할 스킬 목록
  criteriaMapping: number[]; // 이 스텝이 충족시킬 수 있는 기준 ID들
  isRequired: boolean;
}

export interface CriterionDefinition {
  id: number;
  name: string;
  condition: string;
  skills: string[];          // 관련 스킬
  outputType: string;        // 기대 산출물 유형
  isRequired: boolean;       // 게이트 통과에 필수 여부
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
  /** 고유 식별자 */
  readonly id: string;
  /** 표시명 */
  readonly name: string;
  /** 설명 */
  readonly description: string;
  /** 버전 */
  readonly version: string;

  /** 아이템을 이 방법론 기준으로 분류 */
  classifyItem(item: { title: string; description: string | null; source: string }): Promise<ClassificationResult>;

  /** 분류 결과 기반 분석 단계 반환 */
  getAnalysisSteps(classification: ClassificationResult): AnalysisStepDefinition[];

  /** 이 방법론의 검증 기준 목록 */
  getCriteria(): CriterionDefinition[];

  /** 게이트 판정 (DB에서 기준 진행률 조회) */
  checkGate(bizItemId: string, db: D1Database): Promise<GateResult>;

  /** 검토 방법 목록 */
  getReviewMethods(): ReviewMethod[];

  /** 아이템에 대한 이 방법론의 적합도 (0~100) */
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
```

---

## 3. F193+F194 상세 설계 — pm-skills 모듈 + 검증 기준

### 3.1 D1 Migration (A2)

```sql
-- packages/api/src/db/migrations/0044_pm_skills_criteria.sql

CREATE TABLE IF NOT EXISTS pm_skills_criteria (
  id TEXT PRIMARY KEY,
  biz_item_id TEXT NOT NULL REFERENCES biz_items(id),
  criterion_id INTEGER NOT NULL,
  skill TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  evidence TEXT,
  output_type TEXT,
  score INTEGER,
  completed_at TEXT,
  updated_at TEXT NOT NULL,
  UNIQUE(biz_item_id, criterion_id)
);

CREATE INDEX idx_pm_skills_criteria_biz_item ON pm_skills_criteria(biz_item_id);
CREATE INDEX idx_pm_skills_criteria_status ON pm_skills_criteria(status);
```

### 3.2 pm-skills-criteria.ts (A3)

패턴: `DiscoveryCriteriaService` 동일 — constructor(db), initialize(), getAll(), update(), checkGate()

```typescript
// packages/api/src/services/pm-skills-criteria.ts (NEW)

import type { CriterionDefinition, GateResult } from "./methodology-types.js";

/**
 * Sprint 60: pm-skills 검증 기준 서비스 (F194)
 * BDP 9기준(DiscoveryCriteriaService)과 독립적인 pm-skills 전용 12기준
 */

// ─── 12 기준 정의 ───

export const PM_SKILLS_CRITERIA: CriterionDefinition[] = [
  { id: 1, name: "고객 인사이트", skills: ["/interview", "/research-users"],
    condition: "인터뷰 결과 1건+ + 고객 세그먼트 2개+ + JTBD 문장 1개+",
    outputType: "interview_result", isRequired: true },
  { id: 2, name: "시장 기회 정량화", skills: ["/market-scan"],
    condition: "TAM/SAM/SOM 수치 + 연간 성장률 + why now 트리거 1개+",
    outputType: "market_report", isRequired: true },
  { id: 3, name: "경쟁 포지셔닝", skills: ["/competitive-analysis"],
    condition: "경쟁사 3개+ 프로필 + 포지셔닝 맵 + 차별화 전략 1개+",
    outputType: "competitive_report", isRequired: true },
  { id: 4, name: "가치 제안 명확성", skills: ["/value-proposition"],
    condition: "JTBD 문장 + 가치 제안 캔버스 완성 + 차별화 포인트 2개+",
    outputType: "value_proposition", isRequired: true },
  { id: 5, name: "수익 모델 실현성", skills: ["/business-model"],
    condition: "BMC 9블록 완성 + 과금 모델 + 유닛 이코노믹스 초안",
    outputType: "business_model_canvas", isRequired: true },
  { id: 6, name: "리스크 식별 완전성", skills: ["/pre-mortem"],
    condition: "핵심 리스크 5개+ + 우선순위 + 대응 방향",
    outputType: "risk_assessment", isRequired: false },
  { id: 7, name: "검증 실험 설계", skills: ["/pre-mortem"],
    condition: "검증 실험 3개+ + 성공/실패 기준 + 실행 방법",
    outputType: "experiment_design", isRequired: false },
  { id: 8, name: "전략 방향 정합성", skills: ["/strategy"],
    condition: "전략 방향 1개+ + 우선순위 매트릭스 + 로드맵 초안",
    outputType: "strategy_document", isRequired: false },
  { id: 9, name: "비치헤드 시장 선정", skills: ["/beachhead-segment"],
    condition: "비치헤드 시장 프로필 + 선정 근거 3가지+ + 진입 전략",
    outputType: "beachhead_analysis", isRequired: false },
  { id: 10, name: "아이디어 발산 충분성", skills: ["/brainstorm"],
    condition: "Use Case 10개+ + 평가 기준 + 상위 3개 선정 근거",
    outputType: "brainstorm_result", isRequired: false },
  { id: 11, name: "분석 일관성", skills: [],
    condition: "가치 제안 ↔ 경쟁 차별화 ↔ 수익 모델 간 논리적 일관성",
    outputType: "consistency_check", isRequired: true },
  { id: 12, name: "실행 가능성", skills: [],
    condition: "전략 → 비치헤드 → 검증 실험 간 연결고리 + KT DS 역량 매칭",
    outputType: "feasibility_check", isRequired: true },
];

export type PmSkillsCriterionStatus = "pending" | "in_progress" | "completed" | "needs_revision";

export interface PmSkillsCriterion {
  id: string;
  bizItemId: string;
  criterionId: number;
  name: string;
  skill: string;
  condition: string;
  status: PmSkillsCriterionStatus;
  evidence: string | null;
  outputType: string;
  score: number | null;
  completedAt: string | null;
  updatedAt: string;
}

export interface PmSkillsCriteriaProgress {
  total: number;
  completed: number;
  inProgress: number;
  needsRevision: number;
  pending: number;
  criteria: PmSkillsCriterion[];
  gateStatus: "blocked" | "warning" | "ready";
}

interface PmCriteriaRow {
  id: string;
  biz_item_id: string;
  criterion_id: number;
  skill: string;
  status: string;
  evidence: string | null;
  output_type: string | null;
  score: number | null;
  completed_at: string | null;
  updated_at: string;
}

function generateId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

function toPmCriterion(row: PmCriteriaRow): PmSkillsCriterion {
  const meta = PM_SKILLS_CRITERIA.find(c => c.id === row.criterion_id);
  return {
    id: row.id,
    bizItemId: row.biz_item_id,
    criterionId: row.criterion_id,
    name: meta?.name ?? "",
    skill: row.skill,
    condition: meta?.condition ?? "",
    status: row.status as PmSkillsCriterionStatus,
    evidence: row.evidence,
    outputType: row.output_type ?? meta?.outputType ?? "",
    score: row.score,
    completedAt: row.completed_at,
    updatedAt: row.updated_at,
  };
}

function computePmGateStatus(completed: number, requiredMissing: number): "blocked" | "warning" | "ready" {
  if (requiredMissing > 0) return "blocked";
  if (completed >= 10) return "ready";
  if (completed >= 8) return "warning";
  return "blocked";
}

export class PmSkillsCriteriaService {
  constructor(private db: D1Database) {}

  async initialize(bizItemId: string): Promise<void> {
    for (const c of PM_SKILLS_CRITERIA) {
      const id = generateId();
      const primarySkill = c.skills[0] ?? "cross-validation";
      await this.db
        .prepare(
          `INSERT OR IGNORE INTO pm_skills_criteria (id, biz_item_id, criterion_id, skill, status, output_type, updated_at)
           VALUES (?, ?, ?, ?, 'pending', ?, datetime('now'))`,
        )
        .bind(id, bizItemId, c.id, primarySkill, c.outputType)
        .run();
    }
  }

  async getAll(bizItemId: string): Promise<PmSkillsCriteriaProgress> {
    const { results } = await this.db
      .prepare("SELECT * FROM pm_skills_criteria WHERE biz_item_id = ? ORDER BY criterion_id")
      .bind(bizItemId)
      .all<PmCriteriaRow>();

    const criteria = results.map(toPmCriterion);

    if (criteria.length === 0) {
      const emptyCriteria: PmSkillsCriterion[] = PM_SKILLS_CRITERIA.map(c => ({
        id: "",
        bizItemId,
        criterionId: c.id,
        name: c.name,
        skill: c.skills[0] ?? "cross-validation",
        condition: c.condition,
        status: "pending" as PmSkillsCriterionStatus,
        evidence: null,
        outputType: c.outputType,
        score: null,
        completedAt: null,
        updatedAt: "",
      }));
      return { total: 12, completed: 0, inProgress: 0, needsRevision: 0, pending: 12, criteria: emptyCriteria, gateStatus: "blocked" };
    }

    const completed = criteria.filter(c => c.status === "completed").length;
    const inProgress = criteria.filter(c => c.status === "in_progress").length;
    const needsRevision = criteria.filter(c => c.status === "needs_revision").length;
    const pending = criteria.filter(c => c.status === "pending").length;

    // 필수 기준 중 미완료 개수
    const requiredIds = PM_SKILLS_CRITERIA.filter(c => c.isRequired).map(c => c.id);
    const requiredMissing = requiredIds.filter(id => {
      const c = criteria.find(cr => cr.criterionId === id);
      return !c || c.status !== "completed";
    }).length;

    return {
      total: 12,
      completed,
      inProgress,
      needsRevision,
      pending,
      criteria,
      gateStatus: computePmGateStatus(completed, requiredMissing),
    };
  }

  async update(
    bizItemId: string,
    criterionId: number,
    data: { status: PmSkillsCriterionStatus; evidence?: string; score?: number },
  ): Promise<PmSkillsCriterion> {
    const now = new Date().toISOString();
    const completedAt = data.status === "completed" ? now : null;

    await this.db
      .prepare(
        `UPDATE pm_skills_criteria
         SET status = ?, evidence = COALESCE(?, evidence), score = COALESCE(?, score), completed_at = ?, updated_at = ?
         WHERE biz_item_id = ? AND criterion_id = ?`,
      )
      .bind(data.status, data.evidence ?? null, data.score ?? null, completedAt, now, bizItemId, criterionId)
      .run();

    const row = await this.db
      .prepare("SELECT * FROM pm_skills_criteria WHERE biz_item_id = ? AND criterion_id = ?")
      .bind(bizItemId, criterionId)
      .first<PmCriteriaRow>();

    return toPmCriterion(row!);
  }

  async checkGate(bizItemId: string): Promise<GateResult> {
    const progress = await this.getAll(bizItemId);
    const details = progress.criteria.map(c => {
      const meta = PM_SKILLS_CRITERIA.find(m => m.id === c.criterionId);
      return {
        criterionId: c.criterionId,
        name: c.name,
        status: c.status,
        isRequired: meta?.isRequired ?? false,
      };
    });

    const requiredMissing = details.filter(d => d.isRequired && d.status !== "completed").length;

    return {
      gateStatus: progress.gateStatus,
      completedCount: progress.completed,
      totalCount: 12,
      requiredMissing,
      details,
    };
  }
}
```

### 3.3 pm-skills-pipeline.ts (A4)

```typescript
// packages/api/src/services/pm-skills-pipeline.ts (NEW)

import { PM_SKILLS_GUIDES, type PmSkillGuide } from "./pm-skills-guide.js";

/**
 * Sprint 60: pm-skills 실행 파이프라인 (F193)
 * 스킬 의존 관계 기반 실행 순서 추천
 */

// ─── 스킬 의존 관계 그래프 ───

export const SKILL_DEPENDENCIES: Record<string, string[]> = {
  "/interview": [],
  "/research-users": [],
  "/market-scan": [],
  "/brainstorm": [],
  "/competitive-analysis": ["/market-scan"],
  "/value-proposition": ["/interview", "/competitive-analysis"],
  "/business-model": ["/value-proposition"],
  "/beachhead-segment": ["/research-users", "/market-scan"],
  "/pre-mortem": ["/strategy"],
  "/strategy": ["/value-proposition", "/competitive-analysis"],
};

// ─── 진입 유형별 추천 순서 ───

export type EntryPoint = "discovery" | "validation" | "expansion";

export const ENTRY_POINT_ORDERS: Record<EntryPoint, string[]> = {
  discovery: [
    "/interview", "/research-users", "/market-scan",
    "/competitive-analysis", "/value-proposition",
    "/business-model", "/pre-mortem", "/strategy", "/beachhead-segment",
  ],
  validation: [
    "/pre-mortem", "/interview", "/competitive-analysis",
    "/value-proposition", "/strategy",
  ],
  expansion: [
    "/market-scan", "/competitive-analysis", "/beachhead-segment",
    "/business-model", "/strategy",
  ],
};

// ─── 진입 유형 판별 ───

export function detectEntryPoint(item: { title: string; description: string | null }): EntryPoint {
  const text = `${item.title} ${item.description ?? ""}`.toLowerCase();

  // 검증 키워드
  const validationKeywords = ["검증", "가설", "테스트", "확인", "피봇", "pivot", "validate"];
  if (validationKeywords.some(k => text.includes(k))) return "validation";

  // 확장 키워드
  const expansionKeywords = ["확장", "기존", "서비스", "운영", "업그레이드", "마이그레이션", "expand"];
  if (expansionKeywords.some(k => text.includes(k))) return "expansion";

  return "discovery";
}

// ─── 분석 단계 생성 ───

export interface PmSkillAnalysisStep {
  order: number;
  skill: string;
  name: string;
  purpose: string;
  dependencies: string[];
  criteriaMapping: number[];
  isCompleted: boolean;
}

export function buildAnalysisSteps(
  entryPoint: EntryPoint,
  completedSkills: string[] = [],
): PmSkillAnalysisStep[] {
  const skillOrder = ENTRY_POINT_ORDERS[entryPoint];
  return skillOrder.map((skill, idx) => {
    const guide = PM_SKILLS_GUIDES.find(g => g.skill === skill);
    return {
      order: idx + 1,
      skill,
      name: guide?.name ?? skill,
      purpose: guide?.purpose ?? "",
      dependencies: SKILL_DEPENDENCIES[skill] ?? [],
      criteriaMapping: guide?.relatedCriteria ?? [],
      isCompleted: completedSkills.includes(skill),
    };
  });
}

// ─── 다음 실행 가능 스킬 추천 ───

export function getNextExecutableSkills(
  entryPoint: EntryPoint,
  completedSkills: string[],
): string[] {
  const order = ENTRY_POINT_ORDERS[entryPoint];
  return order.filter(skill => {
    if (completedSkills.includes(skill)) return false;
    const deps = SKILL_DEPENDENCIES[skill] ?? [];
    return deps.every(dep => completedSkills.includes(dep));
  });
}

// ─── 스킬 적합도 계산 ───

export function computeSkillScores(
  item: { title: string; description: string | null },
): Record<string, number> {
  const text = `${item.title} ${item.description ?? ""}`.toLowerCase();
  const scores: Record<string, number> = {};

  for (const guide of PM_SKILLS_GUIDES) {
    let score = 50; // 기본 적합도

    // 키워드 매칭으로 적합도 조정
    const keywords: Record<string, string[]> = {
      "/interview": ["고객", "인터뷰", "pain", "문제", "니즈", "jtbd"],
      "/research-users": ["세그먼트", "사용자", "타겟", "페르소나"],
      "/market-scan": ["시장", "규모", "트렌드", "tam", "sam"],
      "/competitive-analysis": ["경쟁", "차별화", "포지셔닝"],
      "/value-proposition": ["가치", "제안", "솔루션"],
      "/business-model": ["수익", "비즈니스", "모델", "과금", "bmc"],
      "/pre-mortem": ["리스크", "실패", "검증"],
      "/strategy": ["전략", "우선순위", "로드맵"],
      "/brainstorm": ["아이디어", "발산", "use case"],
      "/beachhead-segment": ["비치헤드", "진입", "초기 시장"],
    };

    const skillKeywords = keywords[guide.skill] ?? [];
    const matchCount = skillKeywords.filter(k => text.includes(k)).length;
    score += matchCount * 15;

    scores[guide.skill] = Math.min(score, 100);
  }

  return scores;
}
```

### 3.4 pm-skills-module.ts (A5)

```typescript
// packages/api/src/services/pm-skills-module.ts (NEW)

import type {
  MethodologyModule, ClassificationResult, AnalysisStepDefinition,
  CriterionDefinition, GateResult, ReviewMethod,
} from "./methodology-types.js";
import { PM_SKILLS_CRITERIA, PmSkillsCriteriaService } from "./pm-skills-criteria.js";
import {
  detectEntryPoint, buildAnalysisSteps, computeSkillScores,
  ENTRY_POINT_ORDERS, type EntryPoint,
} from "./pm-skills-pipeline.js";

/**
 * Sprint 60: pm-skills MethodologyModule 구현체 (F193)
 * BDP 모듈과 동일한 인터페이스, 다른 분류/분석/기준 로직
 */

export class PmSkillsModule implements MethodologyModule {
  readonly id = "pm-skills";
  readonly name = "PM Skills 기반 분석";
  readonly description = "10개 PM 스킬을 순차 실행하여 사업 아이템을 분석하는 HITL 방식 방법론";
  readonly version = "1.0.0";

  async classifyItem(item: { title: string; description: string | null; source: string }): Promise<ClassificationResult> {
    const entryPoint = detectEntryPoint(item);
    const scores = computeSkillScores(item);

    // 상위 3개 스킬의 평균 점수를 confidence로 사용
    const sortedScores = Object.values(scores).sort((a, b) => b - a);
    const confidence = sortedScores.slice(0, 3).reduce((sum, s) => sum + s, 0) / 3 / 100;

    return {
      methodologyId: this.id,
      entryPoint,
      confidence: Math.min(confidence, 0.95),
      reasoning: `진입 유형: ${entryPoint} — 스킬 적합도 상위 3개 평균 ${(confidence * 100).toFixed(0)}%`,
      metadata: { skillScores: scores, recommendedSkills: ENTRY_POINT_ORDERS[entryPoint] },
    };
  }

  getAnalysisSteps(classification: ClassificationResult): AnalysisStepDefinition[] {
    const entryPoint = (classification.entryPoint as EntryPoint) ?? "discovery";
    const steps = buildAnalysisSteps(entryPoint);

    return steps.map(step => ({
      order: step.order,
      activity: `${step.name} — ${step.purpose}`,
      skills: [step.skill],
      criteriaMapping: step.criteriaMapping,
      isRequired: step.order <= 5, // 상위 5개 필수
    }));
  }

  getCriteria(): CriterionDefinition[] {
    return PM_SKILLS_CRITERIA;
  }

  async checkGate(bizItemId: string, db: D1Database): Promise<GateResult> {
    const service = new PmSkillsCriteriaService(db);
    return service.checkGate(bizItemId);
  }

  getReviewMethods(): ReviewMethod[] {
    return [
      { id: "cross-validation", name: "스킬 산출물 교차 검증",
        description: "가치 제안 ↔ 경쟁 차별화 ↔ 수익 모델 간 논리적 일관성 검토",
        type: "cross_validation" },
      { id: "feasibility-check", name: "실행 가능성 검증",
        description: "전략 → 비치헤드 → 검증 실험 간 연결고리 + KT DS 역량 매칭",
        type: "manual" },
    ];
  }

  matchScore(item: { title: string; description: string | null; source: string; classification?: { itemType: string } }): number {
    const text = `${item.title} ${item.description ?? ""}`.toLowerCase();

    let score = 40; // 기본

    // HITL 선호 키워드
    const hitlKeywords = ["분석", "스킬", "검토", "기획", "pm", "발굴"];
    score += hitlKeywords.filter(k => text.includes(k)).length * 8;

    // 시작점이 불명확한 아이템에 높은 점수
    const ambiguousKeywords = ["새로운", "탐색", "가능성", "아직", "초기"];
    score += ambiguousKeywords.filter(k => text.includes(k)).length * 6;

    // classification이 없는(미분류) 아이템에 보너스
    if (!item.classification) score += 10;

    return Math.min(score, 100);
  }
}

// ─── 모듈 등록 (app 초기화 시 호출) ───

import { registerMethodology } from "./methodology-types.js";

export function registerPmSkillsModule(): void {
  const module = new PmSkillsModule();
  registerMethodology({
    id: module.id,
    name: module.name,
    description: module.description,
    version: module.version,
    isDefault: false,
    matchScore: (item) => module.matchScore(item),
    module,
  });
}
```

### 3.5 Zod Schemas (A6)

```typescript
// packages/api/src/schemas/pm-skills.ts (NEW)

import { z } from "@hono/zod-openapi";

export const PmSkillsCriterionSchema = z.object({
  id: z.string(),
  bizItemId: z.string(),
  criterionId: z.number().int(),
  name: z.string(),
  skill: z.string(),
  condition: z.string(),
  status: z.enum(["pending", "in_progress", "completed", "needs_revision"]),
  evidence: z.string().nullable(),
  outputType: z.string(),
  score: z.number().nullable(),
  completedAt: z.string().nullable(),
  updatedAt: z.string(),
}).openapi("PmSkillsCriterion");

export const UpdatePmSkillsCriterionSchema = z.object({
  status: z.enum(["pending", "in_progress", "completed", "needs_revision"]),
  evidence: z.string().optional(),
  score: z.number().int().min(0).max(100).optional(),
}).openapi("UpdatePmSkillsCriterion");

export const PmSkillsClassificationSchema = z.object({
  methodologyId: z.string(),
  entryPoint: z.enum(["discovery", "validation", "expansion"]),
  confidence: z.number(),
  reasoning: z.string(),
  metadata: z.record(z.unknown()),
}).openapi("PmSkillsClassification");

export const PmSkillsAnalysisStepSchema = z.object({
  order: z.number().int(),
  skill: z.string(),
  name: z.string(),
  purpose: z.string(),
  dependencies: z.array(z.string()),
  criteriaMapping: z.array(z.number().int()),
  isCompleted: z.boolean(),
}).openapi("PmSkillsAnalysisStep");
```

### 3.6 Route: methodology.ts (A7)

```typescript
// packages/api/src/routes/methodology.ts (NEW)

/**
 * Sprint 60: 방법론 관리 라우트 (F193+F194+F195)
 */
import { Hono } from "hono";
import type { Env } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";
import { PmSkillsCriteriaService } from "../services/pm-skills-criteria.js";
import { PmSkillsModule } from "../services/pm-skills-module.js";
import { buildAnalysisSteps, getNextExecutableSkills, detectEntryPoint } from "../services/pm-skills-pipeline.js";
import { getSkillGuide } from "../services/pm-skills-guide.js";
import { getAllMethodologies, recommendMethodology } from "../services/methodology-types.js";
import { UpdatePmSkillsCriterionSchema } from "../schemas/pm-skills.js";
import { BizItemService } from "../services/biz-item-service.js";
import type { EntryPoint } from "../services/pm-skills-pipeline.js";

export const methodologyRoute = new Hono<{ Bindings: Env; Variables: TenantVariables }>();

// ─── GET /methodologies — 등록된 방법론 목록 (F195) ───

methodologyRoute.get("/methodologies", async (c) => {
  const methodologies = getAllMethodologies();
  return c.json({
    methodologies: methodologies.map(m => ({
      id: m.id, name: m.name, description: m.description,
      version: m.version, isDefault: m.isDefault,
    })),
  });
});

// ─── GET /methodologies/:id — 방법론 상세 (F195) ───

methodologyRoute.get("/methodologies/:id", async (c) => {
  const id = c.req.param("id");
  const all = getAllMethodologies();
  const entry = all.find(m => m.id === id);
  if (!entry) return c.json({ error: "METHODOLOGY_NOT_FOUND" }, 404);

  const mod = entry.module;
  return c.json({
    id: mod.id, name: mod.name, description: mod.description, version: mod.version,
    criteria: mod.getCriteria(),
    reviewMethods: mod.getReviewMethods(),
  });
});

// ─── GET /methodologies/recommend/:bizItemId — 방법론 추천 (F195) ───

methodologyRoute.get("/methodologies/recommend/:bizItemId", async (c) => {
  const orgId = c.get("orgId");
  const bizItemId = c.req.param("bizItemId");

  const bizService = new BizItemService(c.env.DB);
  const item = await bizService.getById(orgId, bizItemId);
  if (!item) return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);

  const recommendations = recommendMethodology({
    title: item.title,
    description: item.description,
    source: item.source,
    classification: item.classification ?? undefined,
  });

  return c.json({ recommendations });
});

// ─── POST /methodologies/pm-skills/classify/:bizItemId — 분류 (F193) ───

methodologyRoute.post("/methodologies/pm-skills/classify/:bizItemId", async (c) => {
  const orgId = c.get("orgId");
  const bizItemId = c.req.param("bizItemId");

  const bizService = new BizItemService(c.env.DB);
  const item = await bizService.getById(orgId, bizItemId);
  if (!item) return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);

  const module = new PmSkillsModule();
  const classification = await module.classifyItem({
    title: item.title,
    description: item.description,
    source: item.source,
  });

  // 기준 초기화
  const criteriaService = new PmSkillsCriteriaService(c.env.DB);
  await criteriaService.initialize(bizItemId);

  return c.json({ classification });
});

// ─── GET /methodologies/pm-skills/analysis-steps/:bizItemId — 분석 단계 (F193) ───

methodologyRoute.get("/methodologies/pm-skills/analysis-steps/:bizItemId", async (c) => {
  const orgId = c.get("orgId");
  const bizItemId = c.req.param("bizItemId");

  const bizService = new BizItemService(c.env.DB);
  const item = await bizService.getById(orgId, bizItemId);
  if (!item) return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);

  const entryPoint = detectEntryPoint(item);
  const criteriaService = new PmSkillsCriteriaService(c.env.DB);
  const progress = await criteriaService.getAll(bizItemId);

  // 완료된 스킬 = completed 기준의 스킬
  const completedSkills = progress.criteria
    .filter(c => c.status === "completed")
    .map(c => c.skill);

  const steps = buildAnalysisSteps(entryPoint, completedSkills);
  const nextSkills = getNextExecutableSkills(entryPoint, completedSkills);

  return c.json({ entryPoint, steps, nextExecutableSkills: nextSkills });
});

// ─── GET /methodologies/pm-skills/skill-guide/:skill — 스킬 가이드 (F193) ───

methodologyRoute.get("/methodologies/pm-skills/skill-guide/:skill", async (c) => {
  const skill = "/" + c.req.param("skill");
  const guide = getSkillGuide(skill);
  if (!guide) return c.json({ error: "SKILL_NOT_FOUND" }, 404);

  return c.json({ guide });
});

// ─── GET /methodologies/pm-skills/criteria/:bizItemId — 기준 목록 (F194) ───

methodologyRoute.get("/methodologies/pm-skills/criteria/:bizItemId", async (c) => {
  const orgId = c.get("orgId");
  const bizItemId = c.req.param("bizItemId");

  const bizService = new BizItemService(c.env.DB);
  const item = await bizService.getById(orgId, bizItemId);
  if (!item) return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);

  const criteriaService = new PmSkillsCriteriaService(c.env.DB);
  const progress = await criteriaService.getAll(bizItemId);

  return c.json(progress);
});

// ─── POST /methodologies/pm-skills/criteria/:bizItemId/:criterionId — 기준 갱신 (F194) ───

methodologyRoute.post("/methodologies/pm-skills/criteria/:bizItemId/:criterionId", async (c) => {
  const orgId = c.get("orgId");
  const bizItemId = c.req.param("bizItemId");
  const criterionId = parseInt(c.req.param("criterionId"), 10);

  const bizService = new BizItemService(c.env.DB);
  const item = await bizService.getById(orgId, bizItemId);
  if (!item) return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);

  if (isNaN(criterionId) || criterionId < 1 || criterionId > 12) {
    return c.json({ error: "INVALID_CRITERION_ID" }, 400);
  }

  const body = await c.req.json().catch(() => ({}));
  const parsed = UpdatePmSkillsCriterionSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "VALIDATION_ERROR", details: parsed.error.issues }, 400);

  const criteriaService = new PmSkillsCriteriaService(c.env.DB);
  const criterion = await criteriaService.update(bizItemId, criterionId, parsed.data);

  return c.json({ criterion });
});

// ─── GET /methodologies/pm-skills/gate/:bizItemId — 게이트 판정 (F194) ───

methodologyRoute.get("/methodologies/pm-skills/gate/:bizItemId", async (c) => {
  const orgId = c.get("orgId");
  const bizItemId = c.req.param("bizItemId");

  const bizService = new BizItemService(c.env.DB);
  const item = await bizService.getById(orgId, bizItemId);
  if (!item) return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);

  const criteriaService = new PmSkillsCriteriaService(c.env.DB);
  const gate = await criteriaService.checkGate(bizItemId);

  return c.json(gate);
});
```

### 3.7 Route 등록 (A10)

```typescript
// packages/api/src/index.ts에 추가

import { methodologyRoute } from "./routes/methodology.js";
app.route("/api", methodologyRoute);
```

### 3.8 Shared Types (A8)

```typescript
// packages/shared/src/types.ts에 추가

export interface PmSkillsClassification {
  entryPoint: "discovery" | "validation" | "expansion";
  recommendedSkills: string[];
  skillScores: Record<string, number>;
}

export interface PmSkillsCriterion {
  id: string;
  bizItemId: string;
  criterionId: number;
  name: string;
  skill: string;
  condition: string;
  status: "pending" | "in_progress" | "completed" | "needs_revision";
  evidence: string | null;
  outputType: string;
  score: number | null;
  completedAt: string | null;
  updatedAt: string;
}

export interface PmSkillsCriteriaProgress {
  total: number;
  completed: number;
  inProgress: number;
  needsRevision: number;
  pending: number;
  criteria: PmSkillsCriterion[];
  gateStatus: "blocked" | "warning" | "ready";
}

export interface MethodologyInfo {
  id: string;
  name: string;
  description: string;
  version: string;
  isDefault: boolean;
}

export interface MethodologyRecommendation {
  id: string;
  name: string;
  score: number;
}

export interface MethodologyProgressSummary {
  methodologyId: string;
  methodologyName: string;
  totalItems: number;
  gateReady: number;
  gateWarning: number;
  gateBlocked: number;
  avgProgress: number;
}
```

---

## 4. F195 상세 설계 — 방법론 관리 UI

### 4.1 api-client 확장 (B1)

```typescript
// packages/web/src/lib/api-client.ts에 추가

// ─── Methodology API ───

export async function getMethodologies(): Promise<{ methodologies: MethodologyInfo[] }> {
  return apiFetch("/methodologies");
}

export async function getMethodologyDetail(id: string): Promise<MethodologyDetail> {
  return apiFetch(`/methodologies/${id}`);
}

export async function getMethodologyRecommendation(
  bizItemId: string,
): Promise<{ recommendations: MethodologyRecommendation[] }> {
  return apiFetch(`/methodologies/recommend/${bizItemId}`);
}

export async function getPmSkillsCriteria(
  bizItemId: string,
): Promise<PmSkillsCriteriaProgress> {
  return apiFetch(`/methodologies/pm-skills/criteria/${bizItemId}`);
}

export async function getPmSkillsAnalysisSteps(
  bizItemId: string,
): Promise<{ entryPoint: string; steps: PmSkillAnalysisStep[]; nextExecutableSkills: string[] }> {
  return apiFetch(`/methodologies/pm-skills/analysis-steps/${bizItemId}`);
}

export async function classifyWithPmSkills(
  bizItemId: string,
): Promise<{ classification: PmSkillsClassification }> {
  return apiFetch(`/methodologies/pm-skills/classify/${bizItemId}`, { method: "POST" });
}

export async function getPmSkillsGate(
  bizItemId: string,
): Promise<GateResult> {
  return apiFetch(`/methodologies/pm-skills/gate/${bizItemId}`);
}
```

### 4.2 MethodologyListPanel.tsx (B2)

```tsx
// packages/web/src/components/feature/MethodologyListPanel.tsx (NEW)

"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { getMethodologies } from "@/lib/api-client";

interface MethodologyInfo {
  id: string;
  name: string;
  description: string;
  version: string;
  isDefault: boolean;
}

interface MethodologyListPanelProps {
  onSelect: (id: string) => void;
  selectedId: string | null;
}

const METHODOLOGY_ICONS: Record<string, string> = {
  bdp: "📊",
  "pm-skills": "🧠",
};

export default function MethodologyListPanel({ onSelect, selectedId }: MethodologyListPanelProps) {
  const [methodologies, setMethodologies] = useState<MethodologyInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMethodologies()
      .then(data => setMethodologies(data.methodologies))
      .catch(() => setMethodologies([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="animate-pulse space-y-3">{[1, 2].map(i =>
      <div key={i} className="h-24 rounded-lg bg-muted" />
    )}</div>;
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">등록된 방법론</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {methodologies.map(m => (
          <button
            key={m.id}
            onClick={() => onSelect(m.id)}
            className={`rounded-lg border p-4 text-left transition-colors hover:border-primary ${
              selectedId === m.id ? "border-primary bg-primary/5" : "border-border"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">{METHODOLOGY_ICONS[m.id] ?? "📋"}</span>
              <span className="font-medium">{m.name}</span>
              {m.isDefault && <Badge variant="secondary">기본</Badge>}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{m.description}</p>
            <p className="mt-2 text-xs text-muted-foreground">v{m.version}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
```

### 4.3 MethodologyDetailPanel.tsx (B3)

```tsx
// packages/web/src/components/feature/MethodologyDetailPanel.tsx (NEW)

"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { getMethodologyDetail } from "@/lib/api-client";

interface CriterionDef {
  id: number;
  name: string;
  condition: string;
  skills: string[];
  outputType: string;
  isRequired: boolean;
}

interface ReviewMethod {
  id: string;
  name: string;
  description: string;
  type: string;
}

interface MethodologyDetail {
  id: string;
  name: string;
  description: string;
  version: string;
  criteria: CriterionDef[];
  reviewMethods: ReviewMethod[];
}

interface MethodologyDetailPanelProps {
  methodologyId: string;
}

export default function MethodologyDetailPanel({ methodologyId }: MethodologyDetailPanelProps) {
  const [detail, setDetail] = useState<MethodologyDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getMethodologyDetail(methodologyId)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [methodologyId]);

  if (loading) return <div className="animate-pulse h-48 rounded-lg bg-muted" />;
  if (!detail) return <p className="text-muted-foreground">방법론을 찾을 수 없어요.</p>;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold">{detail.name} v{detail.version}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{detail.description}</p>
      </div>

      <div>
        <h4 className="mb-2 text-sm font-semibold">검증 기준 ({detail.criteria.length}개)</h4>
        <div className="space-y-2">
          {detail.criteria.map(c => (
            <div key={c.id} className="rounded border border-border p-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground">#{c.id}</span>
                <span className="text-sm font-medium">{c.name}</span>
                {c.isRequired && <Badge variant="destructive" className="text-[10px]">필수</Badge>}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{c.condition}</p>
              {c.skills.length > 0 && (
                <div className="mt-1 flex gap-1">
                  {c.skills.map(s => <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {detail.reviewMethods.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold">검토 방법</h4>
          {detail.reviewMethods.map(rm => (
            <div key={rm.id} className="rounded border border-border p-3">
              <span className="text-sm font-medium">{rm.name}</span>
              <p className="text-xs text-muted-foreground">{rm.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 4.4 MethodologyProgressDash.tsx (B4)

```tsx
// packages/web/src/components/feature/MethodologyProgressDash.tsx (NEW)

"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";

interface ProgressItem {
  bizItemId: string;
  title: string;
  methodologyId: string;
  gateStatus: "blocked" | "warning" | "ready";
  completedCount: number;
  totalCount: number;
}

interface MethodologyProgressDashProps {
  items: ProgressItem[];
}

const GATE_STYLES: Record<string, { label: string; color: string }> = {
  ready: { label: "Ready", color: "bg-green-100 text-green-800" },
  warning: { label: "Warning", color: "bg-yellow-100 text-yellow-800" },
  blocked: { label: "Blocked", color: "bg-red-100 text-red-800" },
};

export default function MethodologyProgressDash({ items }: MethodologyProgressDashProps) {
  // 방법론별 그룹
  const grouped = items.reduce<Record<string, ProgressItem[]>>((acc, item) => {
    const key = item.methodologyId;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">방법론별 진행 현황</h2>

      {Object.entries(grouped).map(([methodId, methodItems]) => {
        const readyCount = methodItems.filter(i => i.gateStatus === "ready").length;
        const progressPct = methodItems.length > 0
          ? Math.round((readyCount / methodItems.length) * 100)
          : 0;

        return (
          <div key={methodId} className="rounded-lg border border-border p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium">{methodId} ({methodItems.length} 아이템)</span>
              <span className="text-sm text-muted-foreground">{progressPct}%</span>
            </div>

            {/* Progress bar */}
            <div className="mb-4 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            {/* Item table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2">아이템</th>
                    <th className="pb-2">게이트</th>
                    <th className="pb-2">진행률</th>
                  </tr>
                </thead>
                <tbody>
                  {methodItems.map(item => {
                    const gate = GATE_STYLES[item.gateStatus] ?? GATE_STYLES.blocked;
                    const pct = item.totalCount > 0
                      ? Math.round((item.completedCount / item.totalCount) * 100)
                      : 0;
                    return (
                      <tr key={item.bizItemId} className="border-b last:border-0">
                        <td className="py-2">{item.title}</td>
                        <td className="py-2">
                          <Badge className={gate.color}>{gate.label}</Badge>
                        </td>
                        <td className="py-2">{pct}% ({item.completedCount}/{item.totalCount})</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {items.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">아직 방법론이 적용된 아이템이 없어요.</p>
      )}
    </div>
  );
}
```

### 4.5 MethodologySelector.tsx (B5)

```tsx
// packages/web/src/components/feature/MethodologySelector.tsx (NEW)

"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { getMethodologyRecommendation, getMethodologies } from "@/lib/api-client";

interface MethodologySelectorProps {
  bizItemId: string;
  currentMethodologyId: string | null;
  onSelect: (methodologyId: string) => void;
}

interface MethodologyInfo {
  id: string;
  name: string;
  description: string;
  version: string;
  isDefault: boolean;
}

interface Recommendation {
  id: string;
  name: string;
  score: number;
}

export default function MethodologySelector({
  bizItemId, currentMethodologyId, onSelect,
}: MethodologySelectorProps) {
  const [methodologies, setMethodologies] = useState<MethodologyInfo[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<string | null>(null);

  useEffect(() => {
    getMethodologies().then(d => setMethodologies(d.methodologies)).catch(() => {});
    getMethodologyRecommendation(bizItemId)
      .then(d => setRecommendations(d.recommendations))
      .catch(() => {});
  }, [bizItemId]);

  const topRecommendation = recommendations[0];

  function handleSelect(id: string) {
    if (id === currentMethodologyId) return;
    setPendingSelection(id);
    setShowConfirm(true);
  }

  function confirmChange() {
    if (pendingSelection) {
      onSelect(pendingSelection);
    }
    setShowConfirm(false);
    setPendingSelection(null);
  }

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium">방법론:</label>
        <select
          value={currentMethodologyId ?? ""}
          onChange={(e) => handleSelect(e.target.value)}
          className="rounded border border-input bg-background px-3 py-1.5 text-sm"
        >
          <option value="">선택하세요</option>
          {methodologies.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>

        {topRecommendation && topRecommendation.id !== currentMethodologyId && (
          <span className="text-xs text-muted-foreground">
            💡 추천: {topRecommendation.name} ({topRecommendation.score}점)
          </span>
        )}
      </div>

      {showConfirm && (
        <div className="mt-3 rounded bg-yellow-50 p-3 text-sm dark:bg-yellow-950">
          <p>⚠️ 변경 시 기존 분석 결과는 유지되며, 새 방법론 기준으로 재평가돼요.</p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={confirmChange}
              className="rounded bg-primary px-3 py-1 text-xs text-primary-foreground"
            >
              변경
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="rounded border px-3 py-1 text-xs"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

### 4.6 methodologies/page.tsx (B6)

```tsx
// packages/web/src/app/(app)/methodologies/page.tsx (NEW)

"use client";

import { useState } from "react";
import MethodologyListPanel from "@/components/feature/MethodologyListPanel";
import MethodologyDetailPanel from "@/components/feature/MethodologyDetailPanel";
import MethodologyProgressDash from "@/components/feature/MethodologyProgressDash";

export default function MethodologiesPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold">방법론 관리</h1>
        <p className="mt-1 text-muted-foreground">
          등록된 분석 방법론을 관리하고, 아이템별 적용 현황을 확인해요.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <MethodologyListPanel onSelect={setSelectedId} selectedId={selectedId} />
        {selectedId && <MethodologyDetailPanel methodologyId={selectedId} />}
      </div>

      <MethodologyProgressDash items={[]} />
    </div>
  );
}
```

### 4.7 Sidebar 네비게이션 추가 (B7)

```typescript
// packages/web/src/components/sidebar.tsx의 NAVIGATION_GROUPS에 추가

// Discovery 그룹 내에 추가:
{ href: "/methodologies", label: "방법론 관리", icon: Settings },
```

---

## 5. 테스트 전략

### 5.1 Service Tests

```
packages/api/src/__tests__/
├── pm-skills-criteria.test.ts         (~18 tests)
│   ├── initialize: 12기준 생성 확인
│   ├── getAll: 전체 목록 + pending 초기 상태
│   ├── getAll (empty): 미초기화 시 빈 기준 반환
│   ├── update: status 변경 + evidence 저장
│   ├── update: completed → completedAt 자동 설정
│   ├── checkGate: blocked (< 8개)
│   ├── checkGate: warning (8~9개)
│   ├── checkGate: ready (10개+, 필수 전부 완료)
│   ├── checkGate: blocked (필수 미완료)
│   └── requiredMissing 계산 정확성
│
├── pm-skills-pipeline.test.ts         (~12 tests)
│   ├── detectEntryPoint: discovery/validation/expansion
│   ├── buildAnalysisSteps: discovery 순서
│   ├── buildAnalysisSteps: 완료된 스킬 반영
│   ├── getNextExecutableSkills: 의존 관계 기반 필터
│   ├── computeSkillScores: 키워드 매칭
│   └── SKILL_DEPENDENCIES: 그래프 무결성
│
├── pm-skills-module.test.ts           (~8 tests)
│   ├── classifyItem: entryPoint 판별
│   ├── getAnalysisSteps: 단계 수 + 순서
│   ├── getCriteria: 12개 기준 반환
│   ├── checkGate: DB 위임 확인
│   ├── matchScore: HITL 키워드 점수
│   └── registerPmSkillsModule: 레지스트리 등록
│
└── methodology-types.test.ts          (~6 tests)
    ├── registerMethodology: 등록
    ├── getMethodology: 조회
    ├── getAllMethodologies: 목록
    └── recommendMethodology: 점수 정렬
```

### 5.2 Route Tests

```
packages/api/src/__tests__/routes/
└── methodology.test.ts                (~18 tests)
    ├── GET /methodologies: 목록 반환
    ├── GET /methodologies/pm-skills: 상세 반환
    ├── GET /methodologies/unknown: 404
    ├── GET /methodologies/recommend/:id: 추천 목록
    ├── POST /pm-skills/classify/:id: 분류 + 기준 초기화
    ├── POST /pm-skills/classify/:id: 404 (존재하지 않는 아이템)
    ├── GET /pm-skills/analysis-steps/:id: 단계 반환
    ├── GET /pm-skills/skill-guide/interview: 가이드 반환
    ├── GET /pm-skills/skill-guide/unknown: 404
    ├── GET /pm-skills/criteria/:id: 기준 목록
    ├── POST /pm-skills/criteria/:id/1: 기준 갱신
    ├── POST /pm-skills/criteria/:id/99: 400 (유효하지 않은 ID)
    ├── POST /pm-skills/criteria/:id/1: 400 (body 누락)
    ├── GET /pm-skills/gate/:id: 게이트 판정
    └── 인증 미포함 요청: 401
```

### 5.3 Web Tests

```
packages/web/src/__tests__/
└── methodology-ui.test.tsx            (~10 tests)
    ├── MethodologyListPanel: 로딩 → 목록 렌더
    ├── MethodologyListPanel: 선택 콜백
    ├── MethodologyDetailPanel: 기준 목록 표시
    ├── MethodologyDetailPanel: 필수 뱃지 표시
    ├── MethodologyProgressDash: 빈 상태
    ├── MethodologyProgressDash: 그룹별 표시
    ├── MethodologySelector: 드롭다운 렌더
    ├── MethodologySelector: 추천 표시
    ├── MethodologySelector: 변경 확인 모달
    └── MethodologiesPage: 페이지 구성
```

### 5.4 테스트 패턴

```typescript
// test-helpers.ts에 추가 (in-memory SQLite)

export function createPmSkillsCriteriaTable(db: D1Database) {
  return db.prepare(`
    CREATE TABLE IF NOT EXISTS pm_skills_criteria (
      id TEXT PRIMARY KEY,
      biz_item_id TEXT NOT NULL,
      criterion_id INTEGER NOT NULL,
      skill TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      evidence TEXT,
      output_type TEXT,
      score INTEGER,
      completed_at TEXT,
      updated_at TEXT NOT NULL,
      UNIQUE(biz_item_id, criterion_id)
    )
  `).run();
}
```

---

## 6. 엔드포인트 총괄

| Method | Path | Feature | 설명 |
|--------|------|---------|------|
| GET | `/methodologies` | F195 | 방법론 목록 |
| GET | `/methodologies/:id` | F195 | 방법론 상세 |
| GET | `/methodologies/recommend/:bizItemId` | F195 | 방법론 추천 |
| POST | `/methodologies/pm-skills/classify/:bizItemId` | F193 | pm-skills 분류 |
| GET | `/methodologies/pm-skills/analysis-steps/:bizItemId` | F193 | 분석 단계 |
| GET | `/methodologies/pm-skills/skill-guide/:skill` | F193 | 스킬 가이드 |
| GET | `/methodologies/pm-skills/criteria/:bizItemId` | F194 | 기준 목록 |
| POST | `/methodologies/pm-skills/criteria/:bizItemId/:criterionId` | F194 | 기준 갱신 |
| GET | `/methodologies/pm-skills/gate/:bizItemId` | F194 | 게이트 판정 |

**합계: 9 endpoints (신규 route 파일)**

---

## 7. 파일 목록 (구현 대상)

| # | 파일 | 유형 | Feature |
|---|------|------|---------|
| 1 | `packages/api/src/services/methodology-types.ts` | Service (인터페이스) | F193 |
| 2 | `packages/api/src/db/migrations/0044_pm_skills_criteria.sql` | Migration | F194 |
| 3 | `packages/api/src/services/pm-skills-criteria.ts` | Service | F194 |
| 4 | `packages/api/src/services/pm-skills-pipeline.ts` | Service | F193 |
| 5 | `packages/api/src/services/pm-skills-module.ts` | Service | F193 |
| 6 | `packages/api/src/schemas/pm-skills.ts` | Schema | F193+F194 |
| 7 | `packages/api/src/routes/methodology.ts` | Route (신규) | F193+F194+F195 |
| 8 | `packages/api/src/index.ts` | Route 등록 (수정) | F193 |
| 9 | `packages/shared/src/types.ts` | Types (수정) | F193+F194+F195 |
| 10 | `packages/web/src/lib/api-client.ts` | API Client (수정) | F195 |
| 11 | `packages/web/src/components/feature/MethodologyListPanel.tsx` | Web 컴포넌트 | F195 |
| 12 | `packages/web/src/components/feature/MethodologyDetailPanel.tsx` | Web 컴포넌트 | F195 |
| 13 | `packages/web/src/components/feature/MethodologyProgressDash.tsx` | Web 컴포넌트 | F195 |
| 14 | `packages/web/src/components/feature/MethodologySelector.tsx` | Web 컴포넌트 | F195 |
| 15 | `packages/web/src/app/(app)/methodologies/page.tsx` | Web 페이지 | F195 |
| 16 | `packages/web/src/components/sidebar.tsx` | Navigation (수정) | F195 |
| 17 | `packages/api/src/__tests__/pm-skills-criteria.test.ts` | Test | F194 |
| 18 | `packages/api/src/__tests__/pm-skills-pipeline.test.ts` | Test | F193 |
| 19 | `packages/api/src/__tests__/pm-skills-module.test.ts` | Test | F193 |
| 20 | `packages/api/src/__tests__/methodology-types.test.ts` | Test | F193 |
| 21 | `packages/api/src/__tests__/routes/methodology.test.ts` | Test | F193+F194+F195 |
| 22 | `packages/web/src/__tests__/methodology-ui.test.tsx` | Test | F195 |

**합계: 22 파일 (신규 16 + 수정 6)**
