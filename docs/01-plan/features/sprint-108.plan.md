---
code: FX-PLAN-108
title: Sprint 108 — BD 데모 시딩 (F279+F280)
version: 1.0
status: Draft
category: PLAN
created: 2026-04-02
updated: 2026-04-02
author: Sinclair Seo
---

# Sprint 108 — BD 데모 시딩 Planning Document

> **Summary**: AX BD팀 데모용 시드 데이터(2개 아이디어 × 12+ 테이블) + 산출물 콘텐츠 16건 생성
>
> **Project**: Foundry-X
> **Version**: api 0.1.0
> **Author**: Sinclair Seo
> **Date**: 2026-04-02
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | BD 파이프라인 전체 6단계(수집→GTM)를 보여줄 실제감 있는 데모 데이터가 Production에 없어서, AX BD팀 시연 시 빈 화면만 노출됨 |
| **Solution** | D1 마이그레이션(0081)으로 헬스케어AI + GIVC 2개 아이디어를 12+ 테이블에 ~120 rows INSERT + bd_artifacts 16건 상세 한글 콘텐츠 |
| **Function/UX Effect** | 팀원이 fx.minu.best 접속 시 즉시 6단계 워크쓰루 가능. 각 단계에 분석 결과·산출물·의사결정 이력이 채워져 있어 실무 활용 이미지 전달 |
| **Core Value** | BD팀 온보딩 + 내부 채택의 결정적 요소 — "빈 도구"가 아닌 "살아있는 시스템" 인식 전환 |

---

## 1. Overview

### 1.1 Purpose

BD 파이프라인의 전체 라이프사이클(REGISTERED → DISCOVERY → FORMALIZATION → REVIEW → DECISION → OFFERING → MVP)을 2개의 실제 아이디어로 시연할 수 있는 데모 데이터를 생성한다.

### 1.2 Background

- **Phase 10 O-G-D Loop** 완성(Sprint 101~102, Combined 97%)으로 AI 분석 엔진은 준비됨
- 그러나 Production DB에 BD 데모 데이터가 없어 팀 시연 불가
- AX BD팀(7명) 온보딩 시 "살아있는 데이터"가 핵심 설득 요소
- O-G-D 데모 결과(헬스케어AI 0.875, GIVC 0.89)를 직접 재활용하여 실제감 극대화

### 1.3 Related Documents

- SPEC: F279 (FX-REQ-271, P0), F280 (FX-REQ-272, P0)
- O-G-D Report: [[FX-RPRT-P10-001]] (`docs/04-report/features/phase-10-ogd-combined.report.md`)
- BD Demo Scenario: `docs/specs/fx-discovery-ux/demo-scenario.md`
- 기존 Demo Seed: `packages/api/src/db/demo-seed.sql` (F169, SR 데모)
- AX Discovery Process v8.2: `docs/specs/axbd/`

---

## 2. Scope

### 2.1 In Scope

- [ ] **F279**: D1 마이그레이션 0081 — 2개 아이디어 × 12+ 테이블 ~120 rows INSERT
- [ ] **F280**: bd_artifacts 16건 상세 한글 output_text (시장조사/경쟁분석/BMC/PRD/MVP 등)
- [ ] 멱등 실행 보장 (INSERT OR IGNORE 패턴)
- [ ] 기존 demo-org-001 + demo-user-001 재활용

### 2.2 Out of Scope

- Production 배포 (Sprint 109 F281에서 진행)
- UI 수정/보정 (Sprint 109)
- 새 API 엔드포인트 추가 (기존 API로 데이터 조회 가능)
- 인증/권한 변경

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | 헬스케어AI 아이디어 biz_items 1건 생성 (source='demo', status='offering') | High | Pending |
| FR-02 | GIVC chatGIVC 아이디어 biz_items 1건 생성 (source='demo', status='decision') | High | Pending |
| FR-03 | biz_item_classifications 2건 — 각각 item_type + confidence + 3-turn 분석 | High | Pending |
| FR-04 | biz_item_starting_points 2건 — 5유형(I/M/P/T/S) 중 분류 + 근거 | High | Pending |
| FR-05 | biz_evaluations + biz_evaluation_scores 2+6건 — 3 페르소나 × 8차원 점수 | High | Pending |
| FR-06 | biz_discovery_criteria 18건 — 2 아이디어 × 9 기준 (completed 상태) | Medium | Pending |
| FR-07 | pipeline_stages 이력 — 헬스케어AI 7단계(REGISTERED→MVP), GIVC 5단계(→DECISION) | High | Pending |
| FR-08 | biz_item_discovery_stages — 헬스케어AI 11단계(2-0~2-10), GIVC 7단계(2-0~2-6) | High | Pending |
| FR-09 | ax_viability_checkpoints — 헬스케어AI 7건(2-1~2-7 전부 go), GIVC 5건(2-1~2-5) | High | Pending |
| FR-10 | ax_commit_gates — 헬스케어AI 1건(commit), GIVC 1건(commit) | High | Pending |
| FR-11 | bd_artifacts 16건 — 8 skill × 2 아이디어, 상세 한글 output_text | High | Pending |
| FR-12 | bdp_versions — 헬스케어AI 2버전(v1 초안, v2 최종), GIVC 1버전(v1 초안) | Medium | Pending |
| FR-13 | offering_packs + offering_pack_items — 헬스케어AI 1팩 4아이템 | Medium | Pending |
| FR-14 | mvp_tracking — 헬스케어AI 1건 (released 상태) | Low | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| 멱등성 | 여러 번 실행해도 에러 없음 | INSERT OR IGNORE 패턴 검증 |
| FK 정합성 | 모든 외래키 참조 유효 | D1 local 실행 후 SELECT JOIN 확인 |
| 콘텐츠 품질 | 한글 산출물 1~3페이지 분량, 실무 수준 | 수동 검토 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] D1 마이그레이션 0081 로컬 적용 성공
- [ ] 마이그레이션 멱등 실행 확인 (2회 실행 시 에러 없음)
- [ ] FK 참조 정합성 검증 (SELECT JOIN 쿼리)
- [ ] bd_artifacts 16건 output_text 한글 콘텐츠 확인
- [ ] API 테스트 기존 전체 통과 (regression 없음)

### 4.2 Quality Criteria

- [ ] 기존 2271 API 테스트 전체 통과
- [ ] typecheck 통과
- [ ] lint 통과

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| D1 마이그레이션 0081 번호 충돌 | High | Low | 기존 0080까지 적용 확인 → 0081 안전 |
| 기존 demo-org-001 미존재 시 FK 에러 | High | Medium | demo-seed.sql 선행 실행 또는 0081에 org/user INSERT 포함 |
| bd_artifacts output_text 길이 초과 | Medium | Low | D1 TEXT 컬럼 제한 없음, 단 1MB 이하 권장 |
| INSERT OR IGNORE 시 기존 데이터와 ID 충돌 | Medium | Low | 데모 전용 ID 접두사(bd-demo-) 사용 |

---

## 6. Architecture Considerations

### 6.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | Simple structure | Static sites | ☐ |
| **Dynamic** | Feature-based modules, BaaS | Web apps with backend | ☑ |
| **Enterprise** | Strict layer separation, DI | High-traffic systems | ☐ |

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| 시딩 방식 | SQL 마이그레이션 / API 호출 / 스크립트 | D1 마이그레이션 | 멱등성 + wrangler 표준 + 버전 관리 |
| ID 체계 | UUID / prefix+순번 | `bd-demo-{type}-{N}` | 데모 데이터 식별 + 정리 용이 |
| 콘텐츠 형식 | JSON / 인라인 SQL TEXT | 인라인 SQL TEXT | 마이그레이션 단일 파일 자급자족 |
| org/user 참조 | 기존 demo-seed 의존 / 자체 포함 | 자체 포함 (INSERT OR IGNORE) | 독립 실행 가능 |

### 6.3 데이터 INSERT 순서 (FK 의존성)

```
1. organizations + users + org_members  (기존 demo-seed 호환)
2. biz_items (2건 — 헬스케어AI, GIVC)
3. biz_item_classifications (2건)
4. biz_item_starting_points (2건)
5. biz_evaluations (2건) → biz_evaluation_scores (6건)
6. biz_discovery_criteria (18건)
7. pipeline_stages (12건 — 헬스 7 + GIVC 5)
8. biz_item_discovery_stages (18건 — 헬스 11 + GIVC 7)
9. ax_viability_checkpoints (12건 — 헬스 7 + GIVC 5)
10. ax_commit_gates (2건)
11. bd_artifacts (16건 — 8 skill × 2 아이디어)
12. bdp_versions (3건 — 헬스 2 + GIVC 1)
13. offering_packs (1건) → offering_pack_items (4건)
14. mvp_tracking (1건)
```

총 약 **~100 rows**

### 6.4 데모 아이디어 설정

| 항목 | 헬스케어AI | GIVC chatGIVC |
|------|-----------|---------------|
| **제목** | AI 기반 의료기기 품질 예측 시스템 | 산업 공급망 인과관계 예측 플랫폼 (chatGIVC) |
| **5유형** | Tech (기술 출발) | Market (시장 출발) |
| **파이프라인** | REGISTERED→…→MVP (7단계 완주) | REGISTERED→…→DECISION (5단계) |
| **발굴 단계** | 2-0~2-10 (11단계 완료) | 2-0~2-6 (7단계, 2-7~2-10 미진행) |
| **Commit Gate** | commit (4질문 모두 통과) | commit (탐색 계속) |
| **O-G-D 점수** | 0.875 (CONVERGED) | 0.89 (CONVERGED) |
| **산출물 수** | 8건 | 8건 |

### 6.5 bd_artifacts 16건 스킬 매핑

| # | skill_id | stage_id | 내용 | 비고 |
|---|----------|----------|------|------|
| 1 | market-research | 2-1 | 시장 규모 + TAM/SAM/SOM | 헬스케어AI |
| 2 | competitor-analysis | 2-3 | 경쟁사 5개 비교 매트릭스 | 헬스케어AI |
| 3 | bmc-canvas | 2-4 | BMC 9블록 | 헬스케어AI |
| 4 | feasibility-study | 2-5 | 기술/사업/재무 타당성 | 헬스케어AI |
| 5 | prd-draft | 2-6 | PRD 초안 (v1) | 헬스케어AI |
| 6 | mvp-spec | 2-8 | MVP 스펙 + 기술 스택 | 헬스케어AI |
| 7 | bdp-executive | 2-9 | BDP 경영진 요약 | 헬스케어AI |
| 8 | offering-pack | 2-10 | 오퍼링 패키지 구성 | 헬스케어AI |
| 9 | market-research | 2-1 | 산업 공급망 시장 분석 | GIVC |
| 10 | competitor-analysis | 2-3 | 공급망 분석 도구 비교 | GIVC |
| 11 | bmc-canvas | 2-4 | BMC 9블록 | GIVC |
| 12 | feasibility-study | 2-5 | KG 기반 인과분석 타당성 | GIVC |
| 13 | prd-draft | 2-6 | chatGIVC PRD 초안 | GIVC |
| 14 | cost-model | 2-2 | AI 인프라 비용 모델 | GIVC |
| 15 | regulation-scan | 2-2 | 산업 안전 규제 스캔 | GIVC |
| 16 | partner-map | 2-7 | 파트너 에코시스템 맵 | 헬스케어AI |

---

## 7. Convention Prerequisites

### 7.1 Existing Project Conventions

- [x] `CLAUDE.md` has coding conventions section
- [x] ESLint configuration (flat config)
- [x] TypeScript configuration (`tsconfig.json`)
- [x] D1 마이그레이션 넘버링: 0001~0080 적용 완료, 다음 0081

### 7.2 마이그레이션 컨벤션

| Category | Convention |
|----------|-----------|
| **파일명** | `0081_bd_demo_seed.sql` |
| **INSERT** | `INSERT OR IGNORE INTO` (멱등성) |
| **ID** | `bd-demo-{테이블약어}-{순번}` (예: `bd-demo-bi-001`) |
| **timestamp** | `datetime('now')` |
| **org_id** | `demo-org-001` (기존 demo-seed 호환) |
| **created_by** | `demo-user-001` |

---

## 8. Next Steps

1. [ ] Plan 리뷰 → Design 문서 작성 (`/pdca design sprint-108`)
2. [ ] D1 마이그레이션 0081 구현
3. [ ] 로컬 D1 적용 + FK 정합성 검증
4. [ ] API 테스트 regression 확인
5. [ ] Sprint 109에서 Production 배포 + E2E 검증

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-04-02 | Initial draft | Sinclair Seo |
