---
code: FX-ANLS-S105
title: "Sprint 105 Gap Analysis — F276 DERIVED 엔진"
version: 1.0
status: Active
category: ANLS
created: 2026-04-03
updated: 2026-04-03
author: Sinclair Seo
references: "[[FX-PLAN-S105]], [[FX-DSGN-S105]], [[FX-RPRT-S105]]"
---

# Sprint 105 Gap Analysis — F276 DERIVED 엔진

## Overall Match Rate: 100%

| Category | Score | Status |
|----------|:-----:|:------:|
| Data Model | 100% | Match |
| API Endpoints | 100% | Match (8/8) |
| Services | 100% | Match (3/3) |
| Shared Types | 100% | Match (11종) |
| Zod Schemas | 100% | Match (5종) |
| File Mapping | 100% | Match (13/13) |
| Test Coverage | 100% | Match (40/~40) |
| **Overall** | **100%** | **Pass** |

## Gap Summary

| Type | Count | Impact |
|------|:-----:|--------|
| Missing | 0 | -- |
| Changed | 0 | -- |
| Added | 0 | -- |

## Verification Items

| V# | Design 항목 | 구현 상태 | 파일 | 비고 |
|----|-------------|----------|------|------|
| V-01 | D1 마이그레이션 0082 (3테이블 + 7인덱스) | ✅ | db/migrations/0082_derived_engine.sql | derived_patterns, derived_candidates, derived_reviews |
| V-02 | Shared 타입 11종 | ✅ | shared/src/types.ts + index.ts | DerivedPattern, DerivedCandidate, DerivedReview, DerivedStats + type aliases + PipelineStage |
| V-03 | Zod 스키마 5종 | ✅ | schemas/derived-engine.ts | extractPatterns, listPatterns, generateCandidate, listCandidates, reviewCandidate |
| V-04 | PatternExtractorService | ✅ | services/pattern-extractor.ts | extract, getPatterns, getPatternById, getPatternDetail, expireStale + Wilson Score |
| V-05 | DerivedSkillGeneratorService | ✅ | services/derived-skill-generator.ts | generate, listCandidates, getCandidateById, getCandidateDetail |
| V-06 | DerivedReviewService | ✅ | services/derived-review.ts | review (approve/reject/revision), getReviews, getStats |
| V-07 | API 라우트 8개 엔드포인트 | ✅ | routes/derived-engine.ts | POST extract/generate/review + GET patterns/candidates/stats |
| V-08 | app.ts 라우트 등록 | ✅ | app.ts | derivedEngineRoute 등록 |
| V-09 | Wilson Score Lower Bound 구현 | ✅ | services/pattern-extractor.ts 내부 | 95% CI, z=1.96 |
| V-10 | HITL 승인 워크플로우 | ✅ | services/derived-review.ts | approve → registry 등록 + lineage + audit / reject / revision |
| V-11 | 중복 감지 (similarity_score) | ✅ | services/derived-skill-generator.ts | SkillSearchService 연동, 임계값 0.85 |
| V-12 | 안전성 사전 검사 | ✅ | services/derived-skill-generator.ts | SafetyChecker 연동, Grade D/F 경고 |
| V-13 | PatternExtractor 테스트 | ✅ | __tests__/pattern-extractor-service.test.ts | 8 tests |
| V-14 | DerivedSkillGenerator 테스트 | ✅ | __tests__/derived-generator-service.test.ts | 6 tests |
| V-15 | DerivedReview 테스트 | ✅ | __tests__/derived-review-service.test.ts | 8 tests |
| V-16 | 라우트 통합 테스트 | ✅ | __tests__/derived-engine-routes.test.ts | 18 tests |

## Implementation Stats

| 항목 | 수치 |
|------|------|
| 새 파일 | 10개 (migration 1 + schema 1 + service 3 + route 1 + test 4) |
| 수정 파일 | 3개 (app.ts, shared/types.ts, shared/index.ts) |
| API 엔드포인트 | 8개 |
| D1 테이블 | 3개 (derived_patterns, derived_candidates, derived_reviews) |
| D1 인덱스 | 7개 |
| 테스트 | 40개 (서비스 22 + 라우트 18) |
| 전체 테스트 | 2351 pass (기존 2311 + 40) |
| Typecheck | Pass |

## Plan 성공 기준 달성

- [x] D1 마이그레이션 0082 적용 — 3테이블 (V-01)
- [x] 8개 API 엔드포인트 동작 확인 (V-07)
- [x] 패턴 추출 — 단일 스킬 + 체이닝 패턴 (V-04, V-09)
- [x] 스킬 후보 생성 — 중복 감지 + 안전성 검사 (V-05, V-11, V-12)
- [x] HITL 승인 워크플로우 — approve/reject/revision (V-10)
- [x] 40 테스트 전체 통과 (V-13~V-16)
- [x] Match Rate 100% >= 90%

## 핵심 알고리즘 검증

### Wilson Score Lower Bound (V-09)
- 95% CI (z=1.96) 기반 통계적 신뢰도 계산
- 샘플 수가 적을수록 보수적 추정 → 과적합 방지
- 구현: `(centre - adjust) / denominator` 공식 정확 일치

### 체이닝 패턴 감지 (V-04)
- 30분 이내 연속 실행 스킬 쌍 감지 (`julianday` 비교)
- 교훈: `biz_item_id` GROUP BY 포함 시 각 아이템이 독립 그룹(count=1) → 크로스-아이템 집계로 수정

## 교훈

1. **체이닝 패턴 GROUP BY**: biz_item_id를 그룹에 포함하면 각 아이템이 독립 그룹이 됨 → 크로스-아이템 집계 필요
2. **라우트 테스트 인증**: `createTestEnv` + `createAuthHeaders` 헬퍼 사용 필수 (직접 JWT 토큰은 401)

## 결론

모든 Design 항목 100% 구현 완료. 의존성 체인 F274(메트릭) + F275(레지스트리) 기반 위에 DERIVED 엔진이 정상 동작. 스킬 자가 진화 파이프라인의 핵심 엔진 구축 완료.
