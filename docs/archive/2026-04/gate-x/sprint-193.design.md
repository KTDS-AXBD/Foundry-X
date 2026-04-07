---
code: FX-DSGN-S193
title: "Sprint 193 — Gate-X 커스텀 검증 룰 엔진 (F409)"
version: 1.0
status: Draft
category: DSGN
created: 2026-04-07
updated: 2026-04-07
author: Claude (Autopilot)
references: "[[FX-PLAN-193]], [[gate-x/prd-final.md]]"
---

# Sprint 193: Gate-X 커스텀 검증 룰 엔진

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F409 커스텀 검증 룰 엔진 — 사용자 정의 루브릭 + 검증 기준 관리 |
| Sprint | 193 |
| 핵심 전략 | JSON DSL 선언형 조건 + D1 저장 + 기존 평가 파이프라인 주입 |
| 신규 파일 | 5개 (migration, schema, service, route, test) + 수정 3개 |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | 검증 기준이 코드에 하드코딩 — 도메인별 맞춤 루브릭 정의 불가 |
| Solution | D1 기반 커스텀 룰 엔진: JSON DSL 조건 정의 → DB 저장 → 평가 파이프라인 런타임 주입 |
| Function UX Effect | BD팀이 사업 도메인별 검증 기준을 직접 설정/관리, API를 통해 평가 파이프라인에 즉시 반영 |
| Core Value | Gate-X 핵심 차별점 — 고객 도메인 최적화 검증, 범용 도구 대비 경쟁 우위 |

---

## 1. DB 설계

### 1.1 `0003_custom_rules.sql`

```sql
-- Gate-X 커스텀 검증 룰 엔진 (Sprint 193, F409)

CREATE TABLE IF NOT EXISTS custom_validation_rules (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  weight      REAL NOT NULL DEFAULT 0.2 CHECK(weight >= 0 AND weight <= 1),
  threshold   REAL NOT NULL DEFAULT 60 CHECK(threshold >= 0 AND threshold <= 100),
  conditions  TEXT NOT NULL DEFAULT '[]',   -- JSON 배열
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_by  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_custom_rules_org_active
  ON custom_validation_rules(org_id, is_active);
```

### 1.2 Condition DSL

```typescript
interface RuleCondition {
  field: string;       // dot-path (예: "output.accuracy", "result.score")
  operator: "gte" | "lte" | "eq" | "neq" | "contains" | "regex";
  value: unknown;      // 비교값
  score_weight: number; // 조건 내 기여 가중치 (합계 ≤ 1.0)
}
```

**예시**: 헬스케어 AI 검증 기준
```json
[
  { "field": "output.accuracy", "operator": "gte", "value": 0.85, "score_weight": 0.5 },
  { "field": "output.safety_flags", "operator": "eq", "value": 0, "score_weight": 0.3 },
  { "field": "result.recommendation", "operator": "contains", "value": "approved", "score_weight": 0.2 }
]
```

---

## 2. API 설계

### 2.1 엔드포인트 목록

| Method | Path | 설명 | 응답 |
|--------|------|------|------|
| GET | `/api/gate/custom-rules` | org의 룰 목록 | `{ items, total }` |
| POST | `/api/gate/custom-rules` | 룰 생성 | `CustomValidationRule` (201) |
| GET | `/api/gate/custom-rules/:id` | 룰 상세 | `CustomValidationRule` |
| PUT | `/api/gate/custom-rules/:id` | 룰 수정 | `CustomValidationRule` |
| DELETE | `/api/gate/custom-rules/:id` | 룰 삭제 | `{ success: true }` (204) |
| POST | `/api/gate/custom-rules/:id/activate` | 활성화 토글 | `{ id, is_active }` |

### 2.2 요청/응답 스키마

**CreateCustomRuleSchema**
```typescript
{
  name: z.string().min(1).max(100),
  description: z.string().max(500).default(""),
  weight: z.number().min(0).max(1).default(0.2),
  threshold: z.number().min(0).max(100).default(60),
  conditions: z.array(RuleConditionSchema).min(1).max(20),
}
```

**RuleConditionSchema**
```typescript
{
  field: z.string().min(1),
  operator: z.enum(["gte", "lte", "eq", "neq", "contains", "regex"]),
  value: z.unknown(),
  score_weight: z.number().min(0).max(1),
}
```

---

## 3. 컴포넌트 설계

### 3.1 파일 매핑 (Worker 없음 — 단일 구현)

| 파일 | 신규/수정 | 설명 |
|------|----------|------|
| `packages/gate-x/src/db/migrations/0003_custom_rules.sql` | 신규 | D1 테이블 |
| `packages/gate-x/src/schemas/custom-rule.schema.ts` | 신규 | Zod 스키마 4종 |
| `packages/gate-x/src/services/custom-rule-service.ts` | 신규 | CRUD + 활성화 |
| `packages/gate-x/src/routes/custom-rules.ts` | 신규 | REST 6 엔드포인트 |
| `packages/gate-x/src/test/custom-rule-service.test.ts` | 신규 | 유닛 테스트 15개+ |
| `packages/gate-x/src/services/evaluation-criteria.ts` | 수정 | `DynamicRuleCriteria` 클래스 추가 |
| `packages/gate-x/src/routes/index.ts` | 수정 | `customRulesRoute` export 추가 |
| `packages/gate-x/src/app.ts` | 수정 | route mount 추가 |

### 3.2 `CustomRuleService` 인터페이스

```typescript
class CustomRuleService {
  constructor(private db: D1Database) {}

  async list(orgId: string): Promise<{ items: CustomValidationRule[], total: number }>
  async create(orgId: string, userId: string, data: CreateCustomRuleInput): Promise<CustomValidationRule>
  async getById(id: string, orgId: string): Promise<CustomValidationRule | null>
  async update(id: string, orgId: string, data: UpdateCustomRuleInput): Promise<CustomValidationRule | null>
  async delete(id: string, orgId: string): Promise<boolean>
  async toggleActivate(id: string, orgId: string): Promise<{ id: string, is_active: boolean } | null>
  async getActiveRules(orgId: string): Promise<CustomValidationRule[]>  // 평가 파이프라인용
}
```

### 3.3 `DynamicRuleCriteria` (evaluation-criteria.ts 추가)

```typescript
export class DynamicRuleCriteria implements EvaluationCriteria {
  readonly name: string;
  readonly weight: number;

  constructor(private rule: CustomValidationRule) {
    this.name = `custom:${rule.id}`;
    this.weight = rule.weight;
  }

  evaluate(result: AgentExecutionResult, _request: AgentExecutionRequest): EvaluationScore {
    // 1. conditions 배열 순회
    // 2. 각 condition: getNestedValue(result.output, field) + operator 평가
    // 3. 조건 충족 시 score_weight 누적
    // 4. 누적합 * 100 → 점수, >= threshold → passed
    const conditions = JSON.parse(this.rule.conditions as unknown as string) as RuleCondition[];
    let scoreAccum = 0;
    const feedback: string[] = [];

    for (const cond of conditions) {
      const actual = getNestedValue(result.output, cond.field);
      if (evaluateCondition(actual, cond.operator, cond.value)) {
        scoreAccum += cond.score_weight;
      } else {
        feedback.push(`[${cond.field}] ${String(actual)} not ${cond.operator} ${String(cond.value)}`);
      }
    }

    const score = Math.round(scoreAccum * 100);
    return { criteriaName: this.name, score, passed: score >= this.rule.threshold, feedback, details: { ruleId: this.rule.id, ruleName: this.rule.name } };
  }
}
```

---

## 4. 테스트 설계

### 4.1 `custom-rule-service.test.ts` 시나리오 (목표 15개)

| # | 테스트명 | 검증 내용 |
|---|---------|----------|
| 1 | `list - empty org` | 빈 배열 반환 |
| 2 | `list - returns rules` | 룰 목록 반환 |
| 3 | `create - success` | 새 룰 생성, id 반환 |
| 4 | `create - validates conditions` | 빈 conditions 거부 |
| 5 | `getById - found` | 룰 상세 반환 |
| 6 | `getById - not found` | null 반환 |
| 7 | `getById - org isolation` | 다른 org 룰 접근 차단 |
| 8 | `update - success` | 수정 반영 |
| 9 | `update - not found` | null 반환 |
| 10 | `delete - success` | true 반환 |
| 11 | `delete - not found` | false 반환 |
| 12 | `toggleActivate - activate` | is_active: true |
| 13 | `toggleActivate - deactivate` | is_active: false |
| 14 | `getActiveRules - filters inactive` | active만 반환 |
| 15 | `getActiveRules - empty` | 빈 배열 반환 |

### 4.2 `DynamicRuleCriteria` 평가 시나리오

| # | 시나리오 | 기대값 |
|---|---------|--------|
| 1 | 모든 조건 충족 | score 100, passed true |
| 2 | 조건 0% 충족 | score 0, passed false |
| 3 | threshold 경계값 (정확히 충족) | passed true |
| 4 | `contains` operator | 문자열 포함 검사 |
| 5 | 중첩 필드 (dot-path) | `output.inner.value` 접근 |

---

## 5. 완료 기준 (DoD)

- [ ] `0003_custom_rules.sql` 작성 완료
- [ ] `custom-rule.schema.ts` — Zod 스키마 4종 (Create/Update/Response/Condition)
- [ ] `custom-rule-service.ts` — CRUD 6메서드 + `getActiveRules`
- [ ] `custom-rules.ts` — REST 6 엔드포인트
- [ ] `DynamicRuleCriteria` 클래스 추가 (evaluation-criteria.ts)
- [ ] `routes/index.ts`, `app.ts` 등록
- [ ] `custom-rule-service.test.ts` 15개+ 통과
- [ ] `pnpm typecheck` 통과
- [ ] `pnpm test` 통과 (gate-x 패키지)
