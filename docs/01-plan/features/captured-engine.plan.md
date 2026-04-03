---
code: FX-PLAN-CAPTURED
title: "captured-engine — F277 CAPTURED 엔진: 크로스 도메인 워크플로우 캡처 + 메타 스킬 생성"
version: 1.0
status: Draft
category: PLAN
created: 2026-04-03
updated: 2026-04-03
author: Sinclair Seo
references: "[[FX-SPEC-001]], [[FX-PLAN-SKILLEVOL]]"
---

# captured-engine: F277 CAPTURED 엔진

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F277 CAPTURED 엔진 — 크로스 도메인 워크플로우 캡처 + 메타 스킬 생성 + F191 방법론 레지스트리 연동 |
| 기간 | Sprint 106 (1 Sprint) |
| 우선순위 | P1 |
| PRD | docs/specs/openspec/prd-final.md (Skill Evolution Track C) |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | DERIVED 엔진(F276)은 개별 스킬 실행 패턴만 추출 — **워크플로우 단계를 넘나드는 복합 패턴**(예: 시장조사→경쟁분석→BMC 작성 시퀀스)은 캡처 불가. 크로스 도메인 성공 패턴이 암묵지로 소실 |
| Solution | workflow_executions + skill_executions 조인 분석으로 **워크플로우 시퀀스 패턴** 추출 → 메타 스킬 후보 생성 → HITL 승인 → skill_registry 등록 (source_type='captured') |
| Function UX Effect | BD 파이프라인 전체에서 반복 성공하는 워크플로우 시퀀스를 자동 감지·재활용. 방법론별(BDP 등) 검증된 워크플로우 템플릿 제공 |
| Core Value | "개별 스킬 최적화" → "**워크플로우 수준 최적화**" 전환. BD 7단계 전체의 엔드-투-엔드 자동화 품질 향상 |

---

## 목표

1. **워크플로우 패턴 추출**: workflow_executions + skill_executions를 분석하여 크로스 도메인 성공 시퀀스를 자동 감지
2. **메타 스킬 생성**: 검증된 워크플로우 시퀀스를 재사용 가능한 메타 스킬로 변환
3. **방법론 연동**: F191 methodology_registry와 연동하여 방법론별 워크플로우 패턴 분류
4. **HITL 승인**: DERIVED 엔진과 동일한 승인 플로우 (pending → approved/rejected)

---

## F-Items

| F-Item | 제목 | 우선순위 | Sprint | 의존성 |
|--------|------|---------|--------|--------|
| F277 | Track C: CAPTURED 엔진 — 크로스 도메인 워크플로우 캡처 + 메타 스킬 생성 + F191 방법론 레지스트리 연동 | P1 | 106 | F276(DERIVED 엔진), F274(메트릭), F275(레지스트리) |

---

## 기술 결정

### 1. DERIVED vs CAPTURED 병렬 구조 (확정)

F276 DERIVED 엔진과 **대칭적인 3-서비스 구조**를 채택해요:

| 구성 | DERIVED (F276) | CAPTURED (F277) |
|------|---------------|-----------------|
| 패턴 추출 | PatternExtractorService | WorkflowPatternExtractorService |
| 후보 생성 | DerivedSkillGeneratorService | CapturedSkillGeneratorService |
| HITL 리뷰 | DerivedReviewService | CapturedReviewService |
| 입력 데이터 | skill_executions | workflow_executions + skill_executions 조인 |
| 패턴 단위 | 단일/체인 스킬 | 워크플로우 스텝 시퀀스 |
| lineage_type | derived | captured |
| D1 테이블 | 3개 (derived_*) | 3개 (captured_*) |

**이유**: 코드 구조의 일관성 + 각 엔진의 독립적 확장이 가능해요.

### 2. 워크플로우 패턴 추출 알고리즘 (확정)

```
1. workflow_executions에서 status='completed' 실행 수집
2. 각 실행의 definition(WorkflowNode[])을 파싱하여 스텝 시퀀스 추출
3. skill_executions와 조인하여 각 스텝에서 사용된 스킬 식별
4. 동일 시퀀스 패턴을 그룹화 → 빈도(sample_count) + 성공률(success_rate) 계산
5. Wilson Score Lower Bound로 confidence 산출 (DERIVED와 동일)
6. 선택적: methodology_id로 필터링하여 방법론별 패턴 분류
```

**대안 고려**: 그래프 기반 시퀀스 마이닝(GSP 등)은 복잡도 대비 현 단계에서 과설계 — 단순 시퀀스 일치 + 빈도 기반으로 시작.

### 3. F191 방법론 연동 방식 (확정)

- `captured_workflow_patterns` 테이블에 `methodology_id` 컬럼 추가 (nullable)
- 패턴 추출 시 워크플로우에 연결된 방법론 ID를 자동 해석
- 방법론이 없는 워크플로우도 캡처 가능 (methodology_id = NULL)
- 목록 조회 시 `methodologyId` 필터 지원

### 4. D1 마이그레이션: 0083 (확정)

기존 0082까지 적용 완료. 새 테이블 3개를 0083에 추가:
- `captured_workflow_patterns`: 워크플로우 시퀀스 패턴
- `captured_candidates`: 메타 스킬 후보
- `captured_reviews`: HITL 리뷰 이력

---

## 구현 범위

### API 엔드포인트 (8개)

| # | Method | Path | 설명 |
|---|--------|------|------|
| 1 | POST | /skills/captured/extract | 워크플로우 패턴 추출 |
| 2 | GET | /skills/captured/patterns | 패턴 목록 (필터: pipeline_stage, methodology_id, status) |
| 3 | GET | /skills/captured/patterns/:patternId | 패턴 상세 (워크플로우 스텝 시퀀스 + 통계) |
| 4 | POST | /skills/captured/generate | 메타 스킬 후보 생성 |
| 5 | GET | /skills/captured/candidates | 후보 목록 (필터: review_status, category) |
| 6 | GET | /skills/captured/candidates/:candidateId | 후보 상세 |
| 7 | POST | /skills/captured/candidates/:candidateId/review | HITL 승인/반려 |
| 8 | GET | /skills/captured/stats | 엔진 통계 |

### 서비스 (3개 + 1개 공유)

| 서비스 | 파일 | 역할 |
|--------|------|------|
| WorkflowPatternExtractorService | workflow-pattern-extractor.ts | 워크플로우 실행 분석 → 시퀀스 패턴 추출 |
| CapturedSkillGeneratorService | captured-skill-generator.ts | 패턴 → 메타 스킬 후보 변환 |
| CapturedReviewService | captured-review.ts | HITL 승인 + skill_registry 등록 |
| SafetyCheckerService | safety-checker.ts (기존) | 안전성 검사 (F275에서 구현 완료) |

### D1 스키마 (3 테이블)

```sql
-- captured_workflow_patterns
id, tenant_id, methodology_id(nullable), pipeline_stage, 
workflow_step_sequence(JSON), skill_sequence(JSON),
success_rate, sample_count, avg_cost_usd, avg_duration_ms,
confidence, status(active|consumed|expired),
extracted_at, expires_at

-- captured_candidates
id, tenant_id, pattern_id, name, description, category,
prompt_template, source_workflow_steps(JSON), source_skills(JSON),
similarity_score, safety_grade, safety_score,
review_status(pending|approved|rejected|revision_requested),
registered_skill_id, created_at, reviewed_at, reviewed_by

-- captured_reviews
id, tenant_id, candidate_id, action, comment, modified_prompt,
reviewer_id, created_at
```

### Shared Types (추가)

```typescript
// packages/shared/src/types.ts에 추가
CapturedWorkflowPattern, CapturedWorkflowPatternDetail
CapturedCandidate, CapturedCandidateDetail
CapturedReview, CapturedStats
CapturedPatternStatus = 'active' | 'consumed' | 'expired'
```

### 테스트 (목표 ~40개)

F276 DERIVED 엔진 테스트 패턴을 참조하여:
- WorkflowPatternExtractorService 단위 테스트 (~15개)
- CapturedSkillGeneratorService 단위 테스트 (~10개)
- CapturedReviewService 단위 테스트 (~8개)
- API 라우트 통합 테스트 (~7개)

---

## 변경 파일 목록

### 신규 (NEW)

| 파일 | 설명 |
|------|------|
| packages/api/src/routes/captured-engine.ts | CAPTURED 엔진 API 라우트 (8 endpoints) |
| packages/api/src/services/workflow-pattern-extractor.ts | 워크플로우 패턴 추출 서비스 |
| packages/api/src/services/captured-skill-generator.ts | 메타 스킬 후보 생성 서비스 |
| packages/api/src/services/captured-review.ts | HITL 리뷰 서비스 |
| packages/api/src/schemas/captured-engine.ts | Zod 스키마 (6개) |
| packages/api/src/db/migrations/0083_captured_engine.sql | D1 마이그레이션 (3 테이블) |
| packages/api/src/__tests__/captured-engine.test.ts | 통합 테스트 (~40개) |

### 수정 (MODIFY)

| 파일 | 설명 |
|------|------|
| packages/api/src/index.ts | capturedEngineRoute 등록 |
| packages/shared/src/types.ts | Captured* 타입 추가 |
| packages/shared/src/index.ts | Captured* 타입 export |

---

## 의존성 + 리스크

| 리스크 | 대응 |
|--------|------|
| workflow_executions 데이터 부족 — 패턴 추출에 충분한 실행 이력이 없을 수 있음 | minSampleCount 기본값을 3으로 낮추고, 데모 시드 데이터 활용 |
| 워크플로우 definition JSON 파싱 복잡도 | WorkflowNode[] 타입이 이미 정의되어 있어 안전하게 파싱 가능 |
| D1 조인 성능 — workflow_executions × skill_executions | 추출은 배치 작업(온디맨드), 실시간 아님 → 성능 OK |
| 0082 중복(bd_demo_seed + derived_engine) 이후 0083 번호 확정 | CLAUDE.md에 "새 마이그레이션은 0083부터" 명시됨 |
