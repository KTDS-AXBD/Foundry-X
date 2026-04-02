---
code: FX-DSGN-108
title: Sprint 108 — BD 데모 시딩 Design
version: 1.0
status: Draft
category: DSGN
created: 2026-04-02
updated: 2026-04-02
author: Sinclair Seo
---

# Sprint 108 — BD 데모 시딩 Design Document

> **Summary**: D1 마이그레이션 0081로 BD 데모 데이터 ~100 rows + bd_artifacts 16건 한글 콘텐츠 시딩
>
> **Project**: Foundry-X
> **Version**: api 0.1.0
> **Author**: Sinclair Seo
> **Date**: 2026-04-02
> **Status**: Draft
> **Planning Doc**: [sprint-108.plan.md](../../01-plan/features/sprint-108.plan.md)

---

## 1. Overview

### 1.1 Design Goals

- D1 마이그레이션 0081 단일 파일로 BD 데모 데이터 전체를 시딩
- FK 의존성 순서를 준수하여 에러 없는 실행 보장
- INSERT OR IGNORE 멱등 패턴으로 안전한 반복 실행
- bd_artifacts 16건에 실무 수준 한글 콘텐츠 포함

### 1.2 Design Principles

- **자급자족**: demo-seed.sql 의존 없이 org/user를 자체 포함
- **멱등성**: INSERT OR IGNORE + 고유 ID 체계로 중복 안전
- **추적 가능성**: `bd-demo-` 접두사로 데모 데이터 식별/정리 용이

---

## 2. Architecture

### 2.1 산출물 구조

```
packages/api/src/db/migrations/
└── 0081_bd_demo_seed.sql        ← 단일 마이그레이션 파일 (유일한 산출물)
```

### 2.2 데이터 흐름

```
0081_bd_demo_seed.sql
  → wrangler d1 migrations apply (local)
  → wrangler d1 migrations apply --remote (Sprint 109)
  → API 기존 엔드포인트로 데이터 조회 가능
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| 0081 마이그레이션 | 0001~0080 (스키마 정의) | 테이블 구조 존재 전제 |
| biz_items INSERT | organizations 존재 | org_id FK |
| bd_artifacts INSERT | biz_items + users 존재 | biz_item_id, created_by FK |

---

## 3. Data Model

### 3.1 ID 체계

```
bd-demo-{테이블약어}-{아이디어약어}-{순번}

테이블약어:
  bi   = biz_items
  cls  = biz_item_classifications
  sp   = biz_item_starting_points
  eval = biz_evaluations
  es   = biz_evaluation_scores
  dc   = biz_discovery_criteria
  ps   = pipeline_stages
  ds   = biz_item_discovery_stages
  vc   = ax_viability_checkpoints
  cg   = ax_commit_gates
  art  = bd_artifacts
  bdp  = bdp_versions
  op   = offering_packs
  opi  = offering_pack_items
  mvp  = mvp_tracking

아이디어약어:
  hc = 헬스케어AI
  gv = GIVC chatGIVC
```

### 3.2 데모 아이디어 상세 설정

#### 아이디어 1: 헬스케어AI (Healthcare AI)

| 필드 | 값 |
|------|-----|
| id | `bd-demo-bi-hc-001` |
| title | AI 기반 의료기기 품질 예측 시스템 |
| description | 의료기기 제조 공정에서 AI/ML 기반 실시간 품질 예측 및 불량 사전 탐지. CT/MRI 부품 제조라인의 센서 데이터를 분석하여 공정 이탈을 사전에 감지하고, 출하 전 품질 검사 비용을 40% 절감 |
| source | demo |
| status | offering |
| item_type (classification) | AI/ML 품질관리 플랫폼 |
| starting_point | tech |
| confidence | 0.92 |
| pipeline 최종 단계 | MVP (7단계 완주) |
| discovery 최종 단계 | 2-10 (11단계 전체 완료) |
| commit_gate 결정 | commit |

#### 아이디어 2: GIVC chatGIVC

| 필드 | 값 |
|------|-----|
| id | `bd-demo-bi-gv-001` |
| title | 산업 공급망 인과관계 예측 플랫폼 (chatGIVC) |
| description | 온톨로지 + Knowledge Graph 기반 산업 공급망 인과관계 분석. 2,443개 품목 데이터에서 원자재→부품→완제품 인과 체인을 추적하고, 공급 리스크를 선제적으로 예측. 기계산업진흥회 GIVC 데이터 활용 |
| source | demo |
| status | decision |
| item_type (classification) | 공급망 분석 SaaS |
| starting_point | market |
| confidence | 0.87 |
| pipeline 최종 단계 | DECISION (5단계까지) |
| discovery 최종 단계 | 2-6 (7단계까지, 2-7~2-10 미진행) |
| commit_gate 결정 | commit |

### 3.3 테이블별 INSERT 상세

#### 섹션 1: 기반 데이터 (org/user — 기존 demo-seed 호환)

```sql
-- organizations, users, org_members — INSERT OR IGNORE
-- 기존 demo-seed.sql과 동일 ID 사용 (demo-org-001, demo-user-001)
-- demo-seed 미실행 환경에서도 독립 실행 가능
```

#### 섹션 2: biz_items (2건)

| id | title | source | status | org_id |
|----|-------|--------|--------|--------|
| bd-demo-bi-hc-001 | AI 기반 의료기기 품질 예측 시스템 | demo | offering | demo-org-001 |
| bd-demo-bi-gv-001 | 산업 공급망 인과관계 예측 플랫폼 (chatGIVC) | demo | decision | demo-org-001 |

#### 섹션 3: biz_item_classifications (2건)

| id | biz_item_id | item_type | confidence | turn_1~3 |
|----|-------------|-----------|------------|----------|
| bd-demo-cls-hc-001 | bd-demo-bi-hc-001 | AI/ML 품질관리 플랫폼 | 0.92 | 3-turn 분석 답변 |
| bd-demo-cls-gv-001 | bd-demo-bi-gv-001 | 공급망 분석 SaaS | 0.87 | 3-turn 분석 답변 |

#### 섹션 4: biz_item_starting_points (2건)

| id | biz_item_id | starting_point | confidence | reasoning |
|----|-------------|----------------|------------|-----------|
| bd-demo-sp-hc-001 | bd-demo-bi-hc-001 | tech | 0.91 | AI/ML 기술 기반 출발, 의료기기 제조 도메인 적용 |
| bd-demo-sp-gv-001 | bd-demo-bi-gv-001 | market | 0.88 | 공급망 리스크 관리 시장 수요에서 출발, KG 기술 결합 |

#### 섹션 5: biz_evaluations + biz_evaluation_scores (2 + 6건)

**biz_evaluations (2건):**

| id | biz_item_id | verdict | avg_score | total_concerns |
|----|-------------|---------|-----------|----------------|
| bd-demo-eval-hc-001 | bd-demo-bi-hc-001 | positive | 8.2 | 2 |
| bd-demo-eval-gv-001 | bd-demo-bi-gv-001 | positive | 7.8 | 3 |

**biz_evaluation_scores (6건 = 3 persona × 2 아이디어):**

페르소나 3인: `cto` (기술 적합성), `biz-lead` (사업성), `customer` (고객 가치)

헬스케어AI 점수 (평균 8.2):
| persona | biz_viability | strategic_fit | customer_value | tech_market | execution | financial | competitive_diff | scalability |
|---------|--------------|---------------|----------------|-------------|-----------|-----------|-----------------|-------------|
| cto | 8.5 | 9.0 | 8.0 | 8.5 | 7.5 | 7.0 | 8.5 | 8.5 |
| biz-lead | 8.0 | 8.5 | 8.5 | 7.5 | 8.0 | 7.5 | 8.0 | 8.0 |
| customer | 9.0 | 8.0 | 9.0 | 8.0 | 7.0 | 7.0 | 8.5 | 8.5 |

GIVC 점수 (평균 7.8):
| persona | biz_viability | strategic_fit | customer_value | tech_market | execution | financial | competitive_diff | scalability |
|---------|--------------|---------------|----------------|-------------|-----------|-----------|-----------------|-------------|
| cto | 8.0 | 8.5 | 7.5 | 8.5 | 7.0 | 6.5 | 8.5 | 7.5 |
| biz-lead | 7.5 | 8.0 | 8.0 | 7.0 | 7.5 | 7.0 | 7.5 | 7.5 |
| customer | 8.5 | 7.5 | 8.5 | 7.5 | 7.0 | 7.0 | 8.0 | 8.0 |

#### 섹션 6: biz_discovery_criteria (18건 = 9 criteria × 2)

헬스케어AI: criterion_id 1~9 전부 `completed`
GIVC: criterion_id 1~7 `completed`, 8~9 `pending`

#### 섹션 7: pipeline_stages 이력 (12건)

**헬스케어AI — 7단계 완주:**

| stage | entered_at | exited_at | notes |
|-------|-----------|-----------|-------|
| REGISTERED | 2026-01-15 | 2026-01-16 | 초기 등록 |
| DISCOVERY | 2026-01-16 | 2026-02-10 | 5유형 분류 + 발굴 분석 |
| FORMALIZATION | 2026-02-10 | 2026-02-20 | BMC + BDP 작성 |
| REVIEW | 2026-02-20 | 2026-02-25 | 팀 리뷰 + O-G-D 검증 |
| DECISION | 2026-02-25 | 2026-03-01 | Go 결정 |
| OFFERING | 2026-03-01 | 2026-03-15 | 오퍼링 패키지 구성 |
| MVP | 2026-03-15 | NULL | MVP 개발 진행 중 |

**GIVC — 5단계까지:**

| stage | entered_at | exited_at | notes |
|-------|-----------|-----------|-------|
| REGISTERED | 2026-02-01 | 2026-02-02 | 초기 등록 |
| DISCOVERY | 2026-02-02 | 2026-03-05 | KG 기반 분석 + PoC |
| FORMALIZATION | 2026-03-05 | 2026-03-15 | BMC + PRD 초안 |
| REVIEW | 2026-03-15 | 2026-03-25 | O-G-D 검증 (0.89 CONVERGED) |
| DECISION | 2026-03-25 | NULL | 의사결정 진행 중 |

#### 섹션 8: biz_item_discovery_stages (18건)

**헬스케어AI — 11단계(2-0~2-10) 전부 completed:**

| stage | status | started_at | completed_at |
|-------|--------|-----------|-------------|
| 2-0 | completed | 2026-01-16 | 2026-01-17 |
| 2-1 | completed | 2026-01-17 | 2026-01-20 |
| 2-2 | completed | 2026-01-20 | 2026-01-25 |
| 2-3 | completed | 2026-01-25 | 2026-01-30 |
| 2-4 | completed | 2026-01-30 | 2026-02-03 |
| 2-5 | completed | 2026-02-03 | 2026-02-07 |
| 2-6 | completed | 2026-02-07 | 2026-02-12 |
| 2-7 | completed | 2026-02-12 | 2026-02-17 |
| 2-8 | completed | 2026-02-17 | 2026-02-22 |
| 2-9 | completed | 2026-02-22 | 2026-02-27 |
| 2-10 | completed | 2026-02-27 | 2026-03-03 |

**GIVC — 7단계(2-0~2-6), 이후 pending:**

| stage | status | started_at | completed_at |
|-------|--------|-----------|-------------|
| 2-0 | completed | 2026-02-02 | 2026-02-03 |
| 2-1 | completed | 2026-02-03 | 2026-02-08 |
| 2-2 | completed | 2026-02-08 | 2026-02-15 |
| 2-3 | completed | 2026-02-15 | 2026-02-22 |
| 2-4 | completed | 2026-02-22 | 2026-02-28 |
| 2-5 | completed | 2026-02-28 | 2026-03-07 |
| 2-6 | completed | 2026-03-07 | 2026-03-15 |

#### 섹션 9: ax_viability_checkpoints (12건)

**헬스케어AI — 7건(2-1~2-7 전부 go):**

| stage | decision | question | reason |
|-------|----------|----------|--------|
| 2-1 | go | 시장 규모가 충분한가? | 의료기기 품질관리 시장 TAM 2.3조원, AI 적용 SAM 4,500억원 |
| 2-2 | go | 기술적으로 실현 가능한가? | CNN+LSTM 기반 예측 모델 PoC 정확도 94.2% 달성 |
| 2-3 | go | 경쟁 우위가 있는가? | 실시간 공정 데이터 연동 + 도메인 특화 AI — 기존 SPC 대비 예측 정확도 30%↑ |
| 2-4 | go | 사업 모델이 유효한가? | SaaS 구독 모델, 제조라인당 월 500만원, 손익분기 12개월 |
| 2-5 | go | Commit Gate 통과 | 4개 질문 전부 긍정 — commit 결정 |
| 2-6 | go | 제품화 준비가 되었는가? | MVP 기능 정의 완료, 파트너사(○○메디칼) PoC 계약 |
| 2-7 | go | GTM 전략이 수립되었는가? | 의료기기 전문 전시회 + 파트너 채널, 초기 3사 파일럿 확보 |

**GIVC — 5건(2-1~2-5):**

| stage | decision | question | reason |
|-------|----------|----------|--------|
| 2-1 | go | 시장 규모가 충분한가? | 공급망 리스크 관리 시장 TAM 1.8조원, KG 기반 SAM 2,800억원 |
| 2-2 | go | 기술적으로 실현 가능한가? | 2,443개 품목 온톨로지 구축 완료, chatGIVC PoC 동작 확인 |
| 2-3 | go | 경쟁 우위가 있는가? | 한국 기계산업 특화 KG — 범용 SCM 도구 대비 인과 추적 정확도 2배 |
| 2-4 | go | 사업 모델이 유효한가? | 구독+컨설팅 하이브리드, 기관당 연 1.2억원, 손익분기 18개월 |
| 2-5 | go | Commit Gate 통과 | 4개 질문 전부 긍정 — commit (탐색 계속) |

#### 섹션 10: ax_commit_gates (2건)

**헬스케어AI:**
| 필드 | 값 |
|------|-----|
| question_1_answer | 이 사업 아이템 없이도 고객이 문제를 해결할 수 있는가? → 아니오. 현재 수동 SPC로 실시간 예측 불가, 불량 발생 후 사후 대응만 가능 |
| question_2_answer | 이 시장에서 3년 내 의미 있는 점유율을 확보할 수 있는가? → 예. 국내 의료기기 제조사 120개 중 AI 품질관리 도입 10% 미만, 선점 기회 |
| question_3_answer | 현재 팀이 이 사업을 실행할 역량이 있는가? → 예. AX BD팀 AI/ML 엔지니어 3명 + 의료기기 도메인 전문가 협업 |
| question_4_answer | 이 사업의 실패 시 조직에 미치는 영향은 감당 가능한가? → 예. MVP 6개월/2억원 규모, 실패 시 기술 자산 다른 제조 도메인 전용 가능 |
| final_decision | commit |

**GIVC:**
| 필드 | 값 |
|------|-----|
| question_1_answer | 이 사업 아이템 없이도 고객이 문제를 해결할 수 있는가? → 부분적. Excel 기반 수동 추적 가능하나, 인과 체인 분석은 불가 |
| question_2_answer | 이 시장에서 3년 내 의미 있는 점유율을 확보할 수 있는가? → 예. 한국 기계산업 특화로 니치 시장 선점, 진흥회 파트너십 보유 |
| question_3_answer | 현재 팀이 이 사업을 실행할 역량이 있는가? → 예. KG 전문가 2명 + 진흥회 데이터 접근권 확보 |
| question_4_answer | 이 사업의 실패 시 조직에 미치는 영향은 감당 가능한가? → 예. PoC 3개월/5천만원, 실패해도 온톨로지 자산 활용 가능 |
| final_decision | commit |

#### 섹션 11: bd_artifacts (16건)

각 artifact의 output_text는 **한글 500~2000자** 분량으로 실무 수준 콘텐츠를 포함한다.

**헬스케어AI 8건:**

| # | id | skill_id | stage_id | version | 콘텐츠 핵심 |
|---|-----|----------|----------|---------|------------|
| 1 | bd-demo-art-hc-001 | market-research | 2-1 | 1 | 의료기기 품질관리 시장 TAM 2.3조원, SAM 4,500억원, SOM 450억원. 성장률 CAGR 15.2% |
| 2 | bd-demo-art-hc-002 | competitor-analysis | 2-3 | 1 | 5개 경쟁사(Siemens QMS, GE Digital, Körber, 국내 2사) 비교 매트릭스 |
| 3 | bd-demo-art-hc-003 | bmc-canvas | 2-4 | 1 | BMC 9블록: VP=AI 실시간 품질 예측, CS=의료기기 제조사, CH=전시회+파트너 |
| 4 | bd-demo-art-hc-004 | feasibility-study | 2-5 | 1 | 기술(PoC 94.2%)/사업(BEP 12M)/재무(IRR 32%) 타당성 |
| 5 | bd-demo-art-hc-005 | prd-draft | 2-6 | 1 | PRD v1: 핵심 기능 5개, 기술 스택, 마일스톤 6개월 |
| 6 | bd-demo-art-hc-006 | mvp-spec | 2-8 | 1 | MVP: 센서 데이터 수집→AI 예측→대시보드 3모듈, React+FastAPI+TensorFlow |
| 7 | bd-demo-art-hc-007 | bdp-executive | 2-9 | 1 | BDP 경영진 1페이지 요약: 시장기회→솔루션→재무→일정 |
| 8 | bd-demo-art-hc-008 | offering-pack | 2-10 | 1 | 오퍼링: 제안서+데모+기술검토+가격표 4종 |

**GIVC 8건:**

| # | id | skill_id | stage_id | version | 콘텐츠 핵심 |
|---|-----|----------|----------|---------|------------|
| 9 | bd-demo-art-gv-001 | market-research | 2-1 | 1 | 공급망 리스크 관리 시장 TAM 1.8조원, KG 기반 SAM 2,800억원 |
| 10 | bd-demo-art-gv-002 | competitor-analysis | 2-3 | 1 | 5개 비교(Resilinc, Everstream, Interos, 국내 2사) |
| 11 | bd-demo-art-gv-003 | bmc-canvas | 2-4 | 1 | BMC: VP=KG 기반 인과 추적, CS=기계산업 제조사/공공기관 |
| 12 | bd-demo-art-gv-004 | feasibility-study | 2-5 | 1 | 기술(KG 2,443 품목 완료)/사업(BEP 18M)/재무(IRR 25%) |
| 13 | bd-demo-art-gv-005 | prd-draft | 2-6 | 1 | chatGIVC PRD: 인과 쿼리 엔진 + 시각화 + 알림 3모듈 |
| 14 | bd-demo-art-gv-006 | cost-model | 2-2 | 1 | AI 인프라 비용: GPU 서버 월 200만원, KG 업데이트 인건비 포함 |
| 15 | bd-demo-art-gv-007 | regulation-scan | 2-2 | 1 | 산업안전보건법, 공급망 실사법, 데이터 3법 규제 검토 |
| 16 | bd-demo-art-gv-008 | partner-map | 2-7 | 1 | 파트너 에코시스템: 진흥회(데이터)+클라우드(인프라)+SI(구축) |

**output_text 콘텐츠 작성 원칙:**
- Markdown 형식 (# 제목, - 리스트, | 표 사용)
- 한글 기준 500~2000자
- 구체적 수치 포함 (시장 규모, 점수, 비용, 일정)
- O-G-D 데모 결과(헬스케어 0.875, GIVC 0.89) 참조

#### 섹션 12: bdp_versions (3건)

| id | biz_item_id | version_num | is_final | 콘텐츠 |
|----|-------------|-------------|----------|--------|
| bd-demo-bdp-hc-001 | bd-demo-bi-hc-001 | 1 | 0 | BDP 초안 — 시장분석+기술검토+재무모델 |
| bd-demo-bdp-hc-002 | bd-demo-bi-hc-001 | 2 | 1 | BDP 최종 — O-G-D 검증 반영 (0.875) |
| bd-demo-bdp-gv-001 | bd-demo-bi-gv-001 | 1 | 0 | BDP 초안 — KG 기반 인과분석 사업계획 |

#### 섹션 13: offering_packs + offering_pack_items (1 + 4건)

**offering_packs (1건 — 헬스케어AI만):**

| id | biz_item_id | title | status |
|----|-------------|-------|--------|
| bd-demo-op-hc-001 | bd-demo-bi-hc-001 | AI 의료기기 품질예측 — 오퍼링 패키지 | approved |

**offering_pack_items (4건):**

| id | pack_id | item_type | title | sort_order |
|----|---------|-----------|-------|------------|
| bd-demo-opi-hc-001 | bd-demo-op-hc-001 | proposal | 사업 제안서 (Executive Summary) | 1 |
| bd-demo-opi-hc-002 | bd-demo-op-hc-001 | demo_link | 데모 환경 링크 | 2 |
| bd-demo-opi-hc-003 | bd-demo-op-hc-001 | tech_review | 기술 검토서 (Architecture Review) | 3 |
| bd-demo-opi-hc-004 | bd-demo-op-hc-001 | pricing | 가격 제안서 (라인당 월 500만원) | 4 |

#### 섹션 14: mvp_tracking (1건 — 헬스케어AI만)

| id | biz_item_id | title | status | tech_stack |
|----|-------------|-------|--------|------------|
| bd-demo-mvp-hc-001 | bd-demo-bi-hc-001 | 의료기기 품질예측 MVP | released | React, FastAPI, TensorFlow, PostgreSQL |

---

## 4. Implementation Guide

### 4.1 파일 구조

```
packages/api/src/db/migrations/
└── 0081_bd_demo_seed.sql     ← 단일 파일 (유일한 산출물)
```

### 4.2 SQL 파일 구조

```sql
-- 0081_bd_demo_seed.sql — Sprint 108 F279+F280 BD 데모 시딩
-- 여러 번 실행해도 안전 (INSERT OR IGNORE)

-- ============================================================
-- 섹션 1: 기반 데이터 (org/user — 자급자족)
-- ============================================================
-- INSERT OR IGNORE INTO organizations ...
-- INSERT OR IGNORE INTO users ...
-- INSERT OR IGNORE INTO org_members ...

-- ============================================================
-- 섹션 2: biz_items (2건)
-- ============================================================

-- ============================================================
-- 섹션 3: biz_item_classifications (2건)
-- ============================================================

-- ... (섹션 4~14 순서대로) ...

-- ============================================================
-- 섹션 14: mvp_tracking (1건)
-- ============================================================
```

### 4.3 Implementation Order

1. [ ] 마이그레이션 파일 `0081_bd_demo_seed.sql` 생성
2. [ ] 섹션 1~10: 구조 데이터 INSERT (FK 순서 준수)
3. [ ] 섹션 11: bd_artifacts 16건 한글 콘텐츠 작성
4. [ ] 섹션 12~14: bdp_versions, offering_packs, mvp_tracking
5. [ ] 로컬 D1 적용 테스트: `wrangler d1 migrations apply foundry-x-db --local`
6. [ ] 멱등성 검증: 2회 연속 실행 시 에러 없음 확인
7. [ ] 기존 API 테스트 regression 확인: `cd packages/api && pnpm test`

---

## 5. Test Plan

### 5.1 Test Scope

| Type | Target | Tool |
|------|--------|------|
| SQL 문법 검증 | 0081 마이그레이션 | D1 local apply |
| 멱등성 검증 | 2회 실행 에러 없음 | D1 local apply × 2 |
| FK 정합성 | JOIN 쿼리 | D1 execute SELECT |
| Regression | 기존 API 2271 테스트 | vitest |
| Typecheck | 전체 | tsc --noEmit |

### 5.2 검증 쿼리

```sql
-- FK 정합성 검증
SELECT b.id, b.title, c.item_type, s.starting_point
FROM biz_items b
LEFT JOIN biz_item_classifications c ON c.biz_item_id = b.id
LEFT JOIN biz_item_starting_points s ON s.biz_item_id = b.id
WHERE b.id LIKE 'bd-demo-%';

-- bd_artifacts 16건 확인
SELECT id, skill_id, stage_id, LENGTH(output_text) as content_len
FROM bd_artifacts
WHERE id LIKE 'bd-demo-%';

-- pipeline_stages 이력 확인
SELECT b.title, p.stage, p.entered_at, p.exited_at
FROM pipeline_stages p
JOIN biz_items b ON b.id = p.biz_item_id
WHERE p.id LIKE 'bd-demo-%'
ORDER BY b.title, p.entered_at;
```

### 5.3 Gap Analysis 검증 항목

| # | 검증 항목 | 기대 결과 |
|---|----------|-----------|
| V-01 | 0081 마이그레이션 파일 존재 | `packages/api/src/db/migrations/0081_bd_demo_seed.sql` |
| V-02 | biz_items 2건 INSERT OR IGNORE | id = bd-demo-bi-hc-001, bd-demo-bi-gv-001 |
| V-03 | biz_item_classifications 2건 | hc: tech, gv: market |
| V-04 | biz_item_starting_points 2건 | 5유형 중 정확한 분류 |
| V-05 | biz_evaluations 2건 + scores 6건 | 3 persona × 8차원 점수 |
| V-06 | biz_discovery_criteria 18건 | hc: 9 completed, gv: 7 completed + 2 pending |
| V-07 | pipeline_stages 12건 | hc: 7단계 완주, gv: 5단계 |
| V-08 | biz_item_discovery_stages 18건 | hc: 11 completed, gv: 7 completed |
| V-09 | ax_viability_checkpoints 12건 | 전부 go 결정 |
| V-10 | ax_commit_gates 2건 | 4질문 답변 + commit 결정 |
| V-11 | bd_artifacts 16건 | 한글 output_text 각 500자 이상 |
| V-12 | bdp_versions 3건 | hc: v1+v2(final), gv: v1 |
| V-13 | offering_packs 1건 + items 4건 | hc만, 4종 아이템 |
| V-14 | mvp_tracking 1건 | hc만, released 상태 |
| V-15 | INSERT OR IGNORE 패턴 | 전체 INSERT문에 적용 |
| V-16 | 로컬 D1 apply 성공 | 에러 0건 |
| V-17 | API 기존 테스트 통과 | 2271/2271 pass |

---

## 6. Security Considerations

- [x] SQL Injection 해당 없음 (정적 SQL 마이그레이션, 사용자 입력 없음)
- [x] 데모 데이터에 실제 민감 정보 미포함
- [x] demo-user-001 패스워드는 기존 demo-seed 사용 (PBKDF2 해시)

---

## 7. Row Count Summary

| 테이블 | 헬스케어AI | GIVC | 소계 |
|--------|-----------|------|------|
| organizations | 1 (공유) | - | 1 |
| users | 1 (공유) | - | 1 |
| org_members | 1 (공유) | - | 1 |
| biz_items | 1 | 1 | 2 |
| biz_item_classifications | 1 | 1 | 2 |
| biz_item_starting_points | 1 | 1 | 2 |
| biz_evaluations | 1 | 1 | 2 |
| biz_evaluation_scores | 3 | 3 | 6 |
| biz_discovery_criteria | 9 | 9 | 18 |
| pipeline_stages | 7 | 5 | 12 |
| biz_item_discovery_stages | 11 | 7 | 18 |
| ax_viability_checkpoints | 7 | 5 | 12 |
| ax_commit_gates | 1 | 1 | 2 |
| bd_artifacts | 8 | 8 | 16 |
| bdp_versions | 2 | 1 | 3 |
| offering_packs | 1 | 0 | 1 |
| offering_pack_items | 4 | 0 | 4 |
| mvp_tracking | 1 | 0 | 1 |
| **합계** | **61** | **43** | **104** |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-04-02 | Initial draft | Sinclair Seo |
