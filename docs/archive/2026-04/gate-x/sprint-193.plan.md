---
code: FX-PLAN-193
title: "Sprint 193 — Gate-X 커스텀 검증 룰 엔진 (F409)"
version: "1.0"
status: Active
category: PLAN
created: 2026-04-07
updated: 2026-04-07
author: Claude (Autopilot)
system-version: "2.0.0"
sprint: 193
f-items: [F409]
---

# Sprint 193 Plan — Gate-X 커스텀 검증 룰 엔진

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F409 커스텀 검증 룰 엔진 — 사용자 정의 루브릭 + 검증 기준 관리 |
| Sprint | 193 |
| 시작일 | 2026-04-07 |
| 예상 소요 | 1 Sprint (Autopilot) |
| PRD | docs/specs/gate-x/prd-final.md (M3 확장 기능) |
| REQ | FX-REQ-401 (P1) |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | Gate-X의 검증 기준이 `CodeReviewCriteria`, `TestCoverageCriteria`, `SpecComplianceCriteria` 3종으로 하드코딩 — 도메인별 맞춤 루브릭 정의 불가 |
| Solution | D1 기반 커스텀 룰 엔진: 사용자가 루브릭(이름/조건/가중치/임계값)을 JSON으로 정의 → DB 저장 → O-G-D 평가 파이프라인에 런타임 주입 |
| Function UX Effect | BD팀이 사업 도메인별 검증 기준(헬스케어 AI, GIVC 등)을 직접 설정, 평가 결과에 커스텀 루브릭 점수 반영 |
| Core Value | Gate-X 핵심 차별점 — 고객 도메인에 최적화된 검증 파이프라인, 범용 AI 검증 도구 대비 경쟁 우위 |

---

## 1. 배경 및 목표

### 1.1 현재 상태 (As-Is)
- `packages/gate-x/src/services/evaluation-criteria.ts`: 3종 하드코딩 기준
  - `CodeReviewCriteria` (weight 0.4): 코드 리뷰 오류/경고 수 기반
  - `TestCoverageCriteria` (weight 0.3): 테스트 파일 비율 기반
  - `SpecComplianceCriteria` (weight 0.3): 수락 기준 달성 여부
- D1 스키마에 커스텀 룰 테이블 없음
- 검증 파이프라인(`evaluation-service.ts`)이 고정 기준만 사용

### 1.2 목표 상태 (To-Be)
- **커스텀 룰 CRUD API**: org별 루브릭 생성/조회/수정/삭제/활성화
- **D1 저장**: `custom_validation_rules` 테이블 + `rule_conditions` JSON 구조
- **평가 파이프라인 통합**: `DynamicRuleCriteria` 클래스 — DB 룰을 런타임에 `EvaluationCriteria`로 변환
- **Web UI 지원**: 기존 Gate-X Web UI에 룰 관리 페이지 추가

---

## 2. 구현 범위

### F409: 커스텀 검증 룰 엔진

| # | 항목 | 설명 | 파일 |
|---|------|------|------|
| 1 | **D1 마이그레이션** | `custom_validation_rules` 테이블 신규 | `0003_custom_rules.sql` |
| 2 | **Zod 스키마** | 룰 생성/수정/조회 스키마 | `custom-rule.schema.ts` |
| 3 | **서비스 레이어** | CRUD + 활성화 + 파이프라인 조회 | `custom-rule-service.ts` |
| 4 | **API 라우트** | REST CRUD 엔드포인트 6종 | `custom-rules.ts` |
| 5 | **평가 통합** | `DynamicRuleCriteria` 클래스 추가 | `evaluation-criteria.ts` |
| 6 | **라우트 등록** | routes/index.ts에 등록 | `routes/index.ts`, `app.ts` |
| 7 | **테스트** | 서비스 유닛 테스트 (15개+) | `custom-rule-service.test.ts` |

### 커스텀 룰 데이터 구조

```typescript
interface CustomValidationRule {
  id: string;
  org_id: string;
  name: string;           // 룰 이름 (예: "헬스케어 AI 검증 기준")
  description: string;
  weight: number;         // 0.0~1.0 (전체 평가 가중치)
  threshold: number;      // 통과 임계값 (0~100)
  conditions: RuleCondition[];  // JSON 배열
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface RuleCondition {
  field: string;          // 평가 대상 필드 경로 (예: "output.accuracy")
  operator: "gte" | "lte" | "eq" | "contains" | "regex";
  value: unknown;         // 비교값
  score_weight: number;   // 조건 내 가중치 (합계 1.0)
}
```

### API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | `/custom-rules` | org의 커스텀 룰 목록 |
| POST | `/custom-rules` | 룰 생성 |
| GET | `/custom-rules/:id` | 룰 상세 |
| PUT | `/custom-rules/:id` | 룰 수정 |
| DELETE | `/custom-rules/:id` | 룰 삭제 |
| POST | `/custom-rules/:id/activate` | 룰 활성화/비활성화 토글 |

---

## 3. 기술 결정

### 3.1 조건 평가 방식
- **JSON 기반 DSL**: 복잡한 스크립팅 없이 `field + operator + value` 선언형 조건
- 이유: Workers 환경에서 `eval()` 사용 불가 + 보안 (코드 인젝션 방지)
- `DynamicRuleCriteria.evaluate()`: 조건 배열을 순회하여 가중치 합산 → 100점 기준 점수 산출

### 3.2 평가 파이프라인 통합 방식
- **Lazy loading**: 평가 실행 시점에 DB에서 활성 룰 로드 (캐싱 없음, Sprint 193 scope)
- 이유: 단순성 우선 — 캐시는 F410+ 범위에서 최적화

### 3.3 기존 하드코딩 기준과의 관계
- 기존 3종 기준 유지 (backward compatibility)
- 커스텀 룰은 **추가** 기준으로 병렬 평가 → 전체 점수에 반영

---

## 4. 제외 범위 (Sprint 193)

- 룰 버전 관리 (Versioning) → F410
- 룰 공유/템플릿 마켓플레이스 → 향후
- LLM 기반 조건 자동 생성 → 향후
- Web UI 룰 관리 페이지 (API 우선, UI는 기본 목록만) → F410

---

## 5. 완료 기준 (DoD)

- [ ] `custom_validation_rules` D1 테이블 마이그레이션 작성
- [ ] CRUD 6개 API 엔드포인트 동작 확인
- [ ] `DynamicRuleCriteria` 클래스 조건 평가 로직 구현
- [ ] 유닛 테스트 15개 이상 (`custom-rule-service.test.ts`)
- [ ] `pnpm typecheck` 통과
- [ ] `pnpm test` 통과

---

## 6. 리스크

| 리스크 | 대응 |
|--------|------|
| D1 JSON 필드 쿼리 성능 | `conditions`는 CRUD 시 전체 JSON 교체 방식 (쿼리 불필요) |
| 조건 DSL 표현력 한계 | 6종 operator (gte/lte/eq/neq/contains/regex) 로 MVP scope 커버 |
