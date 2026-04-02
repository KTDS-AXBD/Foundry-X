---
code: FX-PLAN-S105
title: "Sprint 105 — F276 DERIVED 엔진"
version: 1.0
status: Draft
category: PLAN
created: 2026-04-02
updated: 2026-04-02
author: Sinclair Seo
references: "[[FX-SPEC-001]], [[FX-REQ-268]], [[FX-PLAN-S103]], [[FX-PLAN-S104]]"
---

# Sprint 105: F276 DERIVED 엔진

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F276: Track C DERIVED 엔진 — BD 7단계 반복 성공 패턴 자동 추출 + 새 스킬 생성 + HITL 승인 |
| Sprint | 105 |
| 우선순위 | P0 |
| 의존성 | F274 ✅ (skill_executions/versions/lineage 4테이블) + F275 ✅ (skill_registry + search) |
| Design | docs/02-design/features/sprint-105.design.md |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | BD 스킬 실행 중 반복 성공하는 패턴이 암묵지로만 존재 — 수동으로 스킬을 만들어야 하고, 어떤 스킬 조합이 효과적인지 데이터 기반 판단 불가 |
| Solution | DERIVED 엔진이 skill_executions 성공 패턴을 자동 분석 → 새 스킬 후보 생성 → HITL 승인 워크플로우로 skill_registry에 등록 |
| Function UX Effect | BD 단계별 고성공률 스킬 패턴이 자동 추출되고, 승인 한 번으로 새 스킬이 레지스트리에 등록됨 |
| Core Value | 스킬 자가 진화 시작 — 사용할수록 좋아지는 BD 도구 생태계의 핵심 엔진 |

## §1 범위

### 포함

1. **D1 마이그레이션 (0082_derived_engine.sql)** — 패턴 추출 + HITL 승인 테이블
   - `derived_patterns` — 추출된 성공 패턴 (BD 단계, 스킬 조합, 성공률, 샘플 수)
   - `derived_candidates` — DERIVED 스킬 후보 (패턴 기반 생성, 프롬프트 초안, 승인 상태)
   - `derived_reviews` — HITL 리뷰 이력 (승인/반려/수정 + 코멘트)

2. **PatternExtractorService** — 성공 패턴 자동 추출
   - skill_executions에서 BD 단계별 성공률 상위 패턴 마이닝
   - 최소 샘플 수 (N≥5) + 성공률 임계값 (≥70%) 조건
   - 단일 스킬 패턴 + 스킬 체이닝(연속 실행) 패턴 모두 추출

3. **DerivedSkillGeneratorService** — 스킬 후보 생성
   - 추출된 패턴에서 프롬프트 템플릿 초안 생성
   - 기존 skill_registry 대비 중복 검사 (시맨틱 유사도)
   - 안전성 사전 검사 (F275 SafetyChecker 연동)

4. **HITL 승인 워크플로우 API**
   - 후보 목록 조회 / 상세 조회 / 승인 / 반려 / 수정 요청
   - 승인 시 → skill_registry 자동 등록 + skill_lineage 파생 관계 기록

5. **API 엔드포인트 (derived-engine route)**

6. **Shared 타입 확장 + Zod 스키마**

7. **테스트** — 서비스 + 라우트 단위 테스트

### 제외

- Web UI (HITL 승인 대시보드) — 별도 Sprint
- CAPTURED 엔진 (F277) — F276 완료 후
- BD ROI 벤치마크 연동 (F278)
- O-G-D 루프 통합 (패턴 추출 시 O-G-D 품질 향상은 후속)

## §2 데이터 모델

### 2.1 derived_patterns

BD 단계별 반복 성공 패턴 저장소.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | TEXT PK | 패턴 ID |
| tenant_id | TEXT NOT NULL | 테넌트 |
| pipeline_stage | TEXT NOT NULL | BD 파이프라인 단계 (수집/발굴/형상화/검증/제품화/GTM) |
| discovery_stage | TEXT | 발굴 세부 단계 (2-0~2-10, nullable) |
| pattern_type | TEXT NOT NULL | 'single' / 'chain' (단일 스킬 vs 스킬 체이닝) |
| skill_ids | TEXT NOT NULL | JSON array — 관련 스킬 ID 목록 |
| success_rate | REAL NOT NULL | 패턴 성공률 (0.0~1.0) |
| sample_count | INTEGER NOT NULL | 패턴 추출 기반 샘플 수 |
| avg_cost_usd | REAL | 평균 실행 비용 |
| avg_duration_ms | INTEGER | 평균 실행 시간 |
| confidence | REAL NOT NULL | 통계적 신뢰도 (Wilson score interval) |
| status | TEXT NOT NULL | 'active' / 'consumed' / 'expired' |
| extracted_at | TEXT NOT NULL | 추출 시점 |
| expires_at | TEXT | 만료 시점 (추출 후 30일 기본) |

### 2.2 derived_candidates

패턴에서 생성된 새 스킬 후보.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | TEXT PK | 후보 ID |
| tenant_id | TEXT NOT NULL | 테넌트 |
| pattern_id | TEXT NOT NULL | 원본 패턴 FK |
| name | TEXT NOT NULL | 스킬 이름 초안 |
| description | TEXT | 스킬 설명 |
| category | TEXT NOT NULL | 스킬 카테고리 |
| prompt_template | TEXT NOT NULL | 생성된 프롬프트 템플릿 |
| source_skills | TEXT NOT NULL | JSON — 원본 스킬 ID + 기여도 |
| similarity_score | REAL | 기존 스킬 대비 유사도 (0=완전 새로움, 1=중복) |
| safety_grade | TEXT | 사전 안전성 등급 |
| safety_score | INTEGER | 사전 안전성 점수 |
| review_status | TEXT NOT NULL | 'pending' / 'approved' / 'rejected' / 'revision_requested' |
| registered_skill_id | TEXT | 승인 후 등록된 skill_registry.skill_id |
| created_at | TEXT NOT NULL | 생성 시점 |
| reviewed_at | TEXT | 리뷰 시점 |
| reviewed_by | TEXT | 리뷰어 |

### 2.3 derived_reviews

HITL 리뷰 이력 (감사 추적).

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | TEXT PK | 리뷰 ID |
| tenant_id | TEXT NOT NULL | 테넌트 |
| candidate_id | TEXT NOT NULL | 후보 FK |
| action | TEXT NOT NULL | 'approved' / 'rejected' / 'revision_requested' |
| comment | TEXT | 리뷰 코멘트 |
| modified_prompt | TEXT | 수정된 프롬프트 (revision 시) |
| reviewer_id | TEXT NOT NULL | 리뷰어 |
| created_at | TEXT NOT NULL | 리뷰 시점 |

## §3 API 엔드포인트

| # | Method | Path | 설명 |
|---|--------|------|------|
| 1 | POST | `/api/skills/derived/extract` | 패턴 추출 실행 (비동기, tenant별) |
| 2 | GET | `/api/skills/derived/patterns` | 추출된 패턴 목록 (필터: stage, status, min_confidence) |
| 3 | GET | `/api/skills/derived/patterns/:patternId` | 패턴 상세 (포함 스킬 + 실행 이력 샘플) |
| 4 | POST | `/api/skills/derived/generate` | 패턴 → 스킬 후보 생성 |
| 5 | GET | `/api/skills/derived/candidates` | 후보 목록 (필터: review_status, category) |
| 6 | GET | `/api/skills/derived/candidates/:candidateId` | 후보 상세 (패턴 + 프롬프트 + 유사도 + 안전성) |
| 7 | POST | `/api/skills/derived/candidates/:candidateId/review` | HITL 리뷰 (approve/reject/revision) |
| 8 | GET | `/api/skills/derived/stats` | DERIVED 엔진 통계 (추출 수, 승인율, 등록 수) |

## §4 서비스 구조

| 서비스 | 역할 | 주요 의존성 |
|--------|------|------------|
| `PatternExtractorService` | skill_executions 분석 → derived_patterns 생성 | SkillMetricsService (F274) |
| `DerivedSkillGeneratorService` | derived_patterns → derived_candidates 생성 | SkillSearchService (F275), SafetyChecker (F275) |
| `DerivedReviewService` | HITL 승인 워크플로우 + skill_registry 등록 | SkillRegistryService (F275), SkillMetricsService (F274) |

## §5 패턴 추출 알고리즘

### 5.1 단일 스킬 패턴

```
입력: skill_executions WHERE status='completed' GROUP BY (skill_id, pipeline_stage)
조건: sample_count >= 5 AND success_rate >= 0.70
출력: (skill_id, stage, success_rate, sample_count, avg_cost, avg_duration)
신뢰도: Wilson score lower bound (95% CI)
```

### 5.2 스킬 체이닝 패턴

```
입력: 같은 biz_item_id + pipeline_stage에서 연속 실행된 스킬 쌍/트리오
조건: chain_success_rate >= 0.65 AND chain_sample >= 3
출력: (skill_chain, stage, chain_success_rate, chain_sample)
```

### 5.3 중복 감지

- 기존 skill_registry에 등록된 스킬과 프롬프트 유사도 비교
- SkillSearchService.search() + 코사인 유사도 (TF-IDF 벡터)
- similarity_score > 0.85면 "중복 가능" 플래그

### 5.4 안전성 사전 검사

- 생성된 프롬프트를 SafetyChecker에 전달
- Grade D/F면 후보 생성 시 경고 + review_status에 safety_concern 플래그

## §6 HITL 승인 워크플로우

```
[패턴 추출] → derived_patterns (active)
     ↓
[스킬 후보 생성] → derived_candidates (pending)
     ↓
[리뷰 대기열] ← 사용자 확인
     ↓
┌─ approve → skill_registry 등록 + skill_lineage 기록 (derivation_type='derived')
├─ reject → derived_candidates.review_status='rejected'
└─ revision_requested → 수정된 프롬프트로 재검토
```

승인 시 자동 수행:
1. `SkillRegistryService.register()` — source_type='derived', source_ref=pattern_id
2. `skill_lineage` INSERT — parent=원본 스킬들, child=새 스킬, derivation_type='derived'
3. `skill_audit_log` — action='created', details='DERIVED from pattern {id}'
4. `derived_candidates.registered_skill_id` 갱신
5. `derived_patterns.status` → 'consumed'

## §7 Shared 타입 확장

```typescript
// 새 타입
export interface DerivedPattern { ... }
export interface DerivedCandidate { ... }
export interface DerivedReview { ... }
export interface DerivedStats { ... }
export type DerivedPatternType = 'single' | 'chain';
export type DerivedReviewStatus = 'pending' | 'approved' | 'rejected' | 'revision_requested';
export type DerivedPatternStatus = 'active' | 'consumed' | 'expired';
```

## §8 테스트 계획

| 영역 | 테스트 | 예상 수 |
|------|--------|---------|
| PatternExtractorService | 단일 패턴 추출, 체이닝 패턴, 임계값 필터링, 빈 데이터 | ~8 |
| DerivedSkillGeneratorService | 후보 생성, 중복 감지, 안전성 사전 검사 | ~6 |
| DerivedReviewService | 승인→등록, 반려, 수정 요청, 워크플로우 전체 | ~8 |
| derived-engine route | 8 endpoints × CRUD + 에러 케이스 | ~18 |
| **합계** | | **~40** |

## §9 구현 순서

1. D1 마이그레이션 0082 (3테이블)
2. Shared 타입 확장
3. Zod 스키마 (derived-engine.ts)
4. PatternExtractorService + 테스트
5. DerivedSkillGeneratorService + 테스트
6. DerivedReviewService + 테스트
7. API 라우트 (derived-engine) + 테스트
8. index.ts 라우트 등록

## §10 리스크

| # | 리스크 | 영향 | 완화 |
|---|--------|------|------|
| 1 | 실행 데이터 부족 (데모 데이터만 존재) | 패턴 추출 결과 의미 없음 | 최소 샘플 수를 설정 가능하게 (기본 5, 데모 시 2로 하향) |
| 2 | 프롬프트 자동 생성 품질 | 쓸모없는 스킬 후보 생성 | HITL 게이트 필수 + 안전성 사전 검사 |
| 3 | TF-IDF 중복 감지 한계 | 유사한데 다른 목적의 스킬 오판 | similarity_score 임계값 조절 가능 (기본 0.85) |
