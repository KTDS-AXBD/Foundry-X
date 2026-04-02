---
code: FX-RPRT-S105
title: "Sprint 105 완료 보고서 — F276 DERIVED 엔진"
version: 1.0
status: Active
category: RPRT
created: 2026-04-02
updated: 2026-04-02
author: Sinclair Seo
references: "[[FX-SPEC-001]], [[FX-PLAN-S105]], [[FX-DSGN-S105]]"
---

# Sprint 105: F276 DERIVED 엔진 — 완료 보고서

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F276: Track C DERIVED 엔진 |
| Sprint | 105 |
| 기간 | 2026-04-02 (단일 세션) |
| Match Rate | **100%** |

### Results Summary

| 지표 | 값 |
|------|-----|
| D1 마이그레이션 | 0082 (3테이블 + 7인덱스) |
| API 엔드포인트 | 8개 신규 |
| 서비스 | 3개 신규 (PatternExtractor, DerivedSkillGenerator, DerivedReview) |
| Shared 타입 | 11개 신규 |
| Zod 스키마 | 5개 신규 |
| 테스트 | **40개 신규** (전체 2311→2351) |
| typecheck | ✅ 통과 |
| Match Rate | **100%** (97/97 항목) |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | BD 스킬 반복 성공 패턴이 암묵지로만 존재 — 데이터 기반 스킬 최적화 불가 |
| Solution | DERIVED 엔진이 skill_executions 성공 패턴 자동 분석 → 스킬 후보 생성 → HITL 승인으로 등록 |
| Function UX Effect | BD 단계별 고성공률 패턴 자동 추출, 승인 한 번으로 새 스킬 레지스트리 등록 |
| Core Value | 스킬 자가 진화 — 사용할수록 좋아지는 BD 도구 생태계의 핵심 엔진 |

## 구현 상세

### D1 마이그레이션 0082

| 테이블 | 용도 | 컬럼 수 |
|--------|------|---------|
| `derived_patterns` | BD 단계별 반복 성공 패턴 저장소 | 14 |
| `derived_candidates` | 패턴에서 생성된 스킬 후보 | 14 |
| `derived_reviews` | HITL 리뷰 이력 (감사 추적) | 7 |

### API 엔드포인트

| # | Method | Path | 구현 |
|---|--------|------|------|
| 1 | POST | `/api/skills/derived/extract` | ✅ |
| 2 | GET | `/api/skills/derived/patterns` | ✅ |
| 3 | GET | `/api/skills/derived/patterns/:patternId` | ✅ |
| 4 | POST | `/api/skills/derived/generate` | ✅ |
| 5 | GET | `/api/skills/derived/candidates` | ✅ |
| 6 | GET | `/api/skills/derived/candidates/:candidateId` | ✅ |
| 7 | POST | `/api/skills/derived/candidates/:candidateId/review` | ✅ |
| 8 | GET | `/api/skills/derived/stats` | ✅ |

### 핵심 알고리즘

- **Wilson Score Lower Bound**: 95% CI 기반 통계적 신뢰도 계산
- **단일 패턴**: skill_executions GROUP BY (skill_id) + 임계값 필터링
- **체이닝 패턴**: 30분 이내 연속 실행 스킬 쌍 감지 (julianday 비교)
- **HITL 워크플로우**: approve → registry 등록 + lineage + audit / reject / revision

### 파일 목록 (13개)

| 구분 | 파일 |
|------|------|
| Migration | `0082_derived_engine.sql` |
| Types | `shared/src/types.ts` (수정) + `shared/src/index.ts` (수정) |
| Schema | `api/src/schemas/derived-engine.ts` |
| Services | `pattern-extractor.ts`, `derived-skill-generator.ts`, `derived-review.ts` |
| Route | `api/src/routes/derived-engine.ts` |
| Config | `api/src/app.ts` (수정) |
| Tests | 4개 테스트 파일 (40 tests) |

## 교훈

1. **체이닝 패턴 GROUP BY**: `biz_item_id`를 그룹에 포함하면 각 아이템이 독립 그룹(count=1)이 됨 → 크로스-아이템 집계로 수정
2. **라우트 테스트 인증**: `createTestEnv` + `createAuthHeaders` 헬퍼 사용 필수 (직접 JWT 토큰 방식은 401 발생)
