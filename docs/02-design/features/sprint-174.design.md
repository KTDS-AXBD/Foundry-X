---
code: FX-DSGN-S174
title: "Sprint 174 — E2E 파이프라인 테스트 + BD ROI 메트릭"
version: "1.0"
status: Active
category: DSGN
created: 2026-04-07
updated: 2026-04-07
author: Claude
sprint: 174
f_items: [F383]
phase: "18-E"
plan_ref: "[[FX-PLAN-S174]]"
---

# Sprint 174 Design — E2E 파이프라인 테스트 + BD ROI 메트릭

## 1. 개요

Phase 18 Offering Pipeline의 마지막 Feature. 3가지 축으로 Phase 18 완성도를 높인다:
1. **E2E 파이프라인 테스트**: Playwright로 Offering 전체 흐름 자동 검증
2. **Offering 메트릭 API**: Offering 이벤트를 skill_executions에 기록 + 집계 API
3. **BD ROI 연동**: BdRoiCalculatorService에 Offering 절감액 반영

---

## 2. Offering 메트릭 API

### 2-1. 스키마 (`packages/api/src/schemas/offering-metrics.schema.ts`)

```typescript
import { z } from "zod";

export const OfferingMetricsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).optional().default(30),
  bizItemId: z.string().optional(),
});
export type OfferingMetricsQuery = z.infer<typeof OfferingMetricsQuerySchema>;

export const RecordOfferingEventSchema = z.object({
  offeringId: z.string().min(1),
  bizItemId: z.string().optional(),
  eventType: z.enum(["created", "edited", "exported", "validated", "prototype_generated"]),
  durationMs: z.coerce.number().int().min(0),
  metadata: z.record(z.unknown()).optional(),
});
export type RecordOfferingEventInput = z.infer<typeof RecordOfferingEventSchema>;

// 응답 타입
export interface OfferingMetricsSummary {
  totalCreated: number;
  totalExported: number;
  totalValidated: number;
  totalPrototypes: number;
  avgCreationTimeMs: number;
  avgExportTimeMs: number;
  validationPassRate: number;
  period: { days: number };
}
```

### 2-2. 서비스 (`packages/api/src/services/offering-metrics-service.ts`)

```typescript
export class OfferingMetricsService {
  constructor(private db: D1Database) {}

  // skill_executions에 offering 이벤트 기록
  // skillId = "offering-{eventType}" 형식으로 F274 테이블 재활용
  async recordEvent(tenantId: string, params: RecordOfferingEventInput, userId: string): Promise<{ id: string }>

  // 기간별 offering 메트릭 집계
  async getSummary(tenantId: string, query: OfferingMetricsQuery): Promise<OfferingMetricsSummary>

  // offering별 상세 이벤트 이력
  async getEventHistory(tenantId: string, offeringId: string, limit?: number): Promise<SkillExecutionRecord[]>
}
```

**핵심 결정**: 별도 D1 테이블을 만들지 않고, 기존 `skill_executions` 테이블을 재활용한다. `skill_id` 컬럼에 `"offering-created"`, `"offering-exported"` 등의 값을 저장하여 F274 인프라와 자연스럽게 통합.

### 2-3. 라우트 (`packages/api/src/routes/offering-metrics.ts`)

| Method | Path | 설명 |
|--------|------|------|
| POST | `/offerings/metrics/record` | Offering 이벤트 기록 |
| GET | `/offerings/metrics` | 집계 요약 |
| GET | `/offerings/:id/metrics/events` | 특정 Offering 이벤트 이력 |

---

## 3. BD ROI 연동

### 3-1. BdRoiCalculatorService 확장 (`packages/api/src/services/bd-roi-calculator.ts`)

기존 `calculate()` 메서드에 Offering 절감액을 `Total_Savings`에 추가:

```typescript
// 기존 savings (cold vs warm)
let totalSavings = coldWarmSavings;

// Offering savings: 수동 제안서 작성(평균 4시간) vs 자동(평균 creation time)
const offeringSavings = await this.calculateOfferingSavings(tenantId, fromStr);
totalSavings += offeringSavings;
```

**새 메서드**:
```typescript
private async calculateOfferingSavings(tenantId: string, fromDate: string): Promise<number> {
  // offering-created 이벤트에서 평균 생성 시간 조회
  // 수동 기준: 4시간 (14,400,000ms) → 자동 평균 duration
  // 절감 = (수동 - 자동) × 시간당 인건비($50) × 건수
}
```

### 3-2. ROI 대시보드 확장

기존 `GET /roi/summary` 응답에 `offeringSavingsUsd` 필드 추가 (BdRoiSummary 타입 확장).

---

## 4. E2E 파이프라인 테스트

### 4-1. 파일: `packages/web/e2e/offering-pipeline.spec.ts`

**테스트 시나리오 7건**:

| # | 시나리오 | 검증 포인트 |
|---|----------|------------|
| 1 | Offering 목록 페이지 렌더링 | 테이블 + 필터 + 상태 badge |
| 2 | Offering 생성 위자드 | 4-step wizard 진행 + draft 상태 저장 |
| 3 | Offering 에디터 섹션 편집 | 섹션 목록 + 편집 + 저장 |
| 4 | 디자인 토큰 에디터 | 카테고리별 토큰 표시 + 수정 + 프리뷰 |
| 5 | Export (HTML/PPTX) | Export 버튼 + 다운로드 트리거 |
| 6 | Offering→Prototype 생성 | 프로토타입 생성 트리거 + 상태 표시 |
| 7 | Offering 검증 실행 | 검증 실행 + 결과 badge 표시 |

### 4-2. Mock 데이터 추가 (`packages/web/e2e/fixtures/mock-factory.ts`)

```typescript
// Offering (F370 offerings 테이블)
export function makeOffering(overrides?: Record<string, unknown>)

// Offering Section (F371 offering_sections 테이블)
export function makeOfferingSection(overrides?: Record<string, unknown>)

// Offering Version
export function makeOfferingVersion(overrides?: Record<string, unknown>)

// Offering Validation (F373 offering_validations 테이블)
export function makeOfferingValidation(overrides?: Record<string, unknown>)

// Offering Metrics Summary
export function makeOfferingMetrics(overrides?: Record<string, unknown>)
```

### 4-3. 기존 E2E coverage 보강

`uncovered-pages.spec.ts` 또는 `detail-pages.spec.ts`에 offering 관련 미커버 라우트가 있으면 해당 spec에도 테스트 추가.

---

## 5. 파일 매핑

| # | 파일 | 동작 | 비고 |
|---|------|------|------|
| 1 | `packages/api/src/schemas/offering-metrics.schema.ts` | 신규 | Zod 스키마 + 응답 타입 |
| 2 | `packages/api/src/services/offering-metrics-service.ts` | 신규 | 이벤트 기록 + 집계 |
| 3 | `packages/api/src/routes/offering-metrics.ts` | 신규 | 3 endpoints |
| 4 | `packages/api/src/services/bd-roi-calculator.ts` | 수정 | offering savings 추가 |
| 5 | `packages/api/src/app.ts` | 수정 | offering-metrics 라우트 등록 |
| 6 | `packages/web/e2e/offering-pipeline.spec.ts` | 신규 | 7 E2E 시나리오 |
| 7 | `packages/web/e2e/fixtures/mock-factory.ts` | 수정 | 5 make 함수 추가 |
| 8 | `packages/api/src/__tests__/offering-metrics-service.test.ts` | 신규 | 서비스 단위 테스트 |
| 9 | `packages/api/src/__tests__/offering-metrics-routes.test.ts` | 신규 | 라우트 테스트 |
| 10 | `packages/api/src/__tests__/bd-roi-offering.test.ts` | 신규 | ROI 연동 테스트 |

---

## 6. shared 타입 확장

`packages/shared/src/types/web.ts` (또는 적절한 위치)에 `OfferingMetricsSummary` 타입을 export하여 Web에서도 사용 가능하게 한다. `BdRoiSummary` 타입에 `offeringSavingsUsd` 필드 추가.

---

## 7. 검증 기준

| # | 검증 항목 | 기대 결과 |
|---|----------|----------|
| 1 | `POST /offerings/metrics/record` | 201 + skill_executions에 행 추가 |
| 2 | `GET /offerings/metrics` | OfferingMetricsSummary JSON 반환 |
| 3 | `GET /offerings/:id/metrics/events` | 이벤트 이력 배열 반환 |
| 4 | `GET /roi/summary` | offeringSavingsUsd 필드 포함 |
| 5 | BdRoiCalculatorService offering savings | 수동(4h) vs 자동 절감 반영 |
| 6 | E2E: Offering 목록 렌더링 | 테이블 + 상태 badge 표시 |
| 7 | E2E: 생성 위자드 | wizard step 진행 |
| 8 | E2E: 에디터 | 섹션 편집 UI 표시 |
| 9 | E2E: 디자인 토큰 | 토큰 편집 + 프리뷰 |
| 10 | E2E: Export | Export 버튼 동작 |
| 11 | E2E: Prototype | 프로토타입 생성 트리거 |
| 12 | E2E: 검증 | 검증 실행 + 결과 |
| 13 | typecheck 통과 | `turbo typecheck` 0 error |
| 14 | 단위 테스트 통과 | 신규 3 테스트 파일 모두 pass |
