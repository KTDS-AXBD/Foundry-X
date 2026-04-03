---
code: FX-PLAN-S112
title: "Sprint 112 — F286+F287 BD 형상화 Phase F + D1/E2E"
version: 1.0
status: Draft
category: PLAN
created: 2026-04-03
updated: 2026-04-03
author: Sinclair Seo
references: "[[FX-SPEC-001]], [[FX-REQ-278]], [[FX-REQ-279]], [[FX-BD-SHAPING-001]]"
---

# Sprint 112: F286+F287 BD 형상화 Phase F + D1/E2E

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F286: BD 형상화 Phase F — HITL Web 에디터 + 자동 모드 / F287: D1 스키마 4테이블 + Git 병행 저장 + E2E |
| Sprint | 112 |
| 우선순위 | F287 P0, F286 P1 |
| 의존성 | F284+F285 선행 (Sprint 111 ✅ 완료) |
| Design | docs/02-design/features/sprint-112.design.md |
| PRD | docs/specs/prd-shaping-v1.md §3.6 (Phase F), §4 (자동 모드), §6 (D1 스키마) |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | Phase A~E 에이전트가 생성한 형상화 PRD가 Git 파일로만 존재 — 검색/필터/승인 워크플로 불가, 사람 검토 없이 4단계 진입 불가 |
| Solution | D1 4테이블로 형상화 이력 영속화 + Web PRD 에디터로 섹션별 승인/수정/반려 + AI 자가 리뷰 3 페르소나 자동 모드 |
| Function UX Effect | `/ax-bd/shaping/:runId` 페이지에서 Phase E 산출물 마크다운 렌더링 + 인라인 액션 + 전문가 리뷰 사이드 패널 + diff 뷰 |
| Core Value | BD 형상화 파이프라인 6 Phase 완성 — 2단계→4단계 자동화 루프 닫힘, HITL/자동 양 모드 지원 |

---

## 구현 범위

### F287: D1 스키마 + Git 병행 저장 (P0 — 먼저 구현)

#### 1. D1 마이그레이션 0084 — shaping 4테이블

파일: `packages/api/src/db/migrations/0084_shaping_tables.sql`

PRD §6 DDL 그대로 적용:

| 테이블 | 용도 | 주요 컬럼 |
|--------|------|-----------|
| `shaping_runs` | 형상화 실행 이력 | id, discovery_prd_id, status, mode(hitl/auto), current_phase, quality_score, token_cost, org_id |
| `shaping_phase_logs` | Phase별 실행 로그 | run_id(FK), phase(A~F), round, verdict, quality_score, findings(JSON) |
| `shaping_expert_reviews` | 전문가 리뷰 결과 | run_id(FK), expert_role(TA/AA/CA/DA/QA), review_body, findings(JSON) |
| `shaping_six_hats` | Six Hats 토론 기록 | run_id(FK), hat_color(6색), round, opinion, verdict |

인덱스:
- `idx_shaping_runs_org_status` ON shaping_runs(org_id, status)
- `idx_shaping_phase_logs_run` ON shaping_phase_logs(run_id, phase)
- `idx_shaping_expert_reviews_run` ON shaping_expert_reviews(run_id)
- `idx_shaping_six_hats_run` ON shaping_six_hats(run_id, round)

#### 2. API 라우트 + 서비스 + 스키마

**라우트 파일**: `packages/api/src/routes/shaping.ts` (shapingRoute)

| # | Method | Endpoint | 용도 |
|---|--------|----------|------|
| 1 | POST | `/shaping/runs` | 형상화 실행 시작 (mode: hitl/auto) |
| 2 | GET | `/shaping/runs` | 실행 이력 목록 (org_id 필터, 페이지네이션) |
| 3 | GET | `/shaping/runs/:runId` | 실행 상세 (run + phase_logs + reviews + six_hats 조인) |
| 4 | PATCH | `/shaping/runs/:runId` | 실행 상태 갱신 (Phase 전환, quality_score 업데이트) |
| 5 | POST | `/shaping/runs/:runId/phase-logs` | Phase 로그 추가 |
| 6 | GET | `/shaping/runs/:runId/phase-logs` | Phase 로그 목록 |
| 7 | POST | `/shaping/runs/:runId/expert-reviews` | 전문가 리뷰 추가 |
| 8 | GET | `/shaping/runs/:runId/expert-reviews` | 전문가 리뷰 목록 |
| 9 | POST | `/shaping/runs/:runId/six-hats` | Six Hats 의견 추가 |
| 10 | GET | `/shaping/runs/:runId/six-hats` | Six Hats 의견 목록 |

**서비스 파일**: `packages/api/src/services/shaping-service.ts` (ShapingService)
- CRUD + 조인 쿼리 + 통계 집계 메서드

**스키마 파일**: `packages/api/src/schemas/shaping.ts`
- Zod 스키마: createShapingRunSchema, updateShapingRunSchema, createPhaseLogSchema, createExpertReviewSchema, createSixHatsSchema, listShapingRunsQuerySchema

#### 3. API 테스트

파일: `packages/api/src/__tests__/shaping.test.ts`
- 10 엔드포인트 × 정상 + 에러 케이스 = ~25 테스트
- D1 mock (in-memory SQLite) + 테스트 헬퍼에 0084 마이그레이션 SQL 추가

#### 4. Git 병행 저장 지원

- shaping_runs 테이블에 `git_path TEXT` 컬럼 추가 (산출물 Git 경로, e.g. `docs/shaping/{run-id}/`)
- API 응답에 git_path 포함 → Web에서 "Git에서 보기" 링크 제공
- 실제 Git 파일 생성은 CC 스킬(ax-bd-shaping)이 담당 — API는 경로만 기록

### F286: Phase F — HITL Web 에디터 + 자동 모드 (P1)

#### 5. 승인 워크플로 API

**라우트 파일**: `packages/api/src/routes/shaping.ts` (기존 라우트에 추가)

| # | Method | Endpoint | 용도 |
|---|--------|----------|------|
| 11 | POST | `/shaping/runs/:runId/review` | HITL 섹션별 승인/수정요청/반려 |
| 12 | POST | `/shaping/runs/:runId/auto-review` | 자동 모드: AI 3 페르소나 리뷰 실행 |
| 13 | GET | `/shaping/runs/:runId/diff` | 2단계 PRD 대비 변경 diff |

**승인 워크플로 서비스**: `packages/api/src/services/shaping-review-service.ts`
- `reviewSection(runId, section, action, comment)` — 섹션별 승인/수정/반려
- `autoReview(runId)` — 3 AI 페르소나(product-owner, tech-lead, end-user) 리뷰
- consensus rule: 3/3 Pass → 자동 승인 + status='completed', 1+ Fail → status='escalated'
- 상태 전환: running → completed | escalated | failed

**스키마 추가**: reviewSectionSchema, autoReviewResultSchema

**테스트**: ~10 테스트 (승인 워크플로 + 자동 모드 + 에스컬레이션)

#### 6. auto-reviewer 에이전트

파일: `.claude/agents/auto-reviewer.md`
- 3 페르소나 정의 (product-owner, tech-lead, end-user)
- PRD §4.2 스펙 그대로 구현
- consensus_rule: 3 Pass → 승인, 1 Fail → HITL 에스컬레이션
- 도구: Read, Grep, Glob (읽기 전용)

#### 7. Web 형상화 에디터 페이지

**라우트**: `/ax-bd/shaping` (목록) + `/ax-bd/shaping/:runId` (에디터)

파일:
- `packages/web/src/routes/ax-bd/shaping.tsx` — 형상화 실행 목록 (status 배지, quality score)
- `packages/web/src/routes/ax-bd/shaping-detail.tsx` — PRD 에디터 페이지

**에디터 페이지 구성**:
- **메인 영역**: 마크다운 렌더링 (react-markdown + remark-gfm, F281에서 이미 도입)
- **섹션별 인라인 액션**: 승인(녹색) / 수정요청(노란색) / 반려(빨간색) 버튼
- **사이드 패널**: Phase E 전문가 리뷰 보고서 (탭 전환: TA/AA/CA/DA/QA)
- **하단**: 변경 이력 diff (2단계 PRD 대비)
- **상태 배지**: running | completed | escalated | failed

**라우터 등록**: `packages/web/src/router.tsx`에 2개 라우트 추가

**컴포넌트**:
- `packages/web/src/components/feature/shaping/ShapingRunCard.tsx` — 목록 카드
- `packages/web/src/components/feature/shaping/SectionReviewAction.tsx` — 섹션별 액션 버튼
- `packages/web/src/components/feature/shaping/ExpertReviewPanel.tsx` — 전문가 리뷰 사이드 패널

**Web 테스트**: ~10 테스트 (컴포넌트 렌더링 + 인터랙션)

#### 8. E2E 테스트

파일: `packages/web/e2e/shaping.spec.ts`
- 형상화 목록 페이지 접근
- 형상화 상세 페이지 렌더링
- 섹션별 승인 워크플로 (모달 표시, 승인 클릭)
- API 연동 확인 (MSW mock)

~5 E2E specs

---

## 구현 순서

```
Phase 1: D1 스키마 (F287)
├─ 0084 마이그레이션 SQL 작성
├─ 테스트 헬퍼 SQL 추가
└─ D1 마이그레이션 검증

Phase 2: API CRUD (F287)
├─ shaping-service.ts 서비스
├─ shaping.ts Zod 스키마
├─ shaping.ts 라우트 (10 EP)
├─ app.ts 라우트 등록
└─ API 테스트 (~25)

Phase 3: 승인 워크플로 API (F286)
├─ shaping-review-service.ts
├─ 승인/자동모드 엔드포인트 3개 추가
└─ API 테스트 (~10)

Phase 4: auto-reviewer 에이전트 (F286)
└─ .claude/agents/auto-reviewer.md

Phase 5: Web 에디터 (F286)
├─ 라우트 2개 (shaping, shaping-detail)
├─ 컴포넌트 3개 (ShapingRunCard, SectionReviewAction, ExpertReviewPanel)
├─ router.tsx 등록
├─ sidebar.tsx 메뉴 추가
└─ Web 테스트 (~10)

Phase 6: E2E (F287)
└─ shaping.spec.ts (~5 specs)
```

---

## 변경 파일 목록

### 신규 생성 (예상 ~15 파일)

| # | 파일 | 용도 |
|---|------|------|
| 1 | `packages/api/src/db/migrations/0084_shaping_tables.sql` | D1 마이그레이션 |
| 2 | `packages/api/src/services/shaping-service.ts` | 형상화 CRUD 서비스 |
| 3 | `packages/api/src/services/shaping-review-service.ts` | 승인 워크플로 서비스 |
| 4 | `packages/api/src/schemas/shaping.ts` | Zod 스키마 |
| 5 | `packages/api/src/routes/shaping.ts` | API 라우트 (13 EP) |
| 6 | `packages/api/src/__tests__/shaping.test.ts` | API 테스트 (~35) |
| 7 | `.claude/agents/auto-reviewer.md` | 자동 모드 에이전트 |
| 8 | `packages/web/src/routes/ax-bd/shaping.tsx` | 목록 페이지 |
| 9 | `packages/web/src/routes/ax-bd/shaping-detail.tsx` | PRD 에디터 페이지 |
| 10 | `packages/web/src/components/feature/shaping/ShapingRunCard.tsx` | 목록 카드 |
| 11 | `packages/web/src/components/feature/shaping/SectionReviewAction.tsx` | 섹션별 액션 |
| 12 | `packages/web/src/components/feature/shaping/ExpertReviewPanel.tsx` | 리뷰 패널 |
| 13 | `packages/web/e2e/shaping.spec.ts` | E2E 테스트 |

### 수정 (예상 ~5 파일)

| # | 파일 | 변경 내용 |
|---|------|-----------|
| 1 | `packages/api/src/app.ts` | shapingRoute 등록 |
| 2 | `packages/api/src/__tests__/helpers/test-db.ts` | 0084 SQL 추가 |
| 3 | `packages/web/src/router.tsx` | shaping 라우트 2개 추가 |
| 4 | `packages/web/src/components/sidebar.tsx` | "형상화" 메뉴 항목 추가 |
| 5 | `packages/web/src/lib/api-client.ts` | shaping API 함수 추가 (선택) |

---

## 의존성 확인

| 항목 | 상태 |
|------|------|
| F284+F285 (Phase D+E 에이전트) | ✅ Sprint 111 완료 |
| react-markdown + remark-gfm | ✅ F281 Sprint 109에서 도입 |
| D1 마이그레이션 0083 | ✅ 로컬 적용 (remote 미적용 — 0084와 함께 배포) |
| HITL 승인 패턴 (captured-engine) | ✅ F277 Sprint 106에서 구현 — 동일 패턴 재활용 |

---

## 리스크 및 완화

| 리스크 | 영향 | 완화 |
|--------|------|------|
| D1 마이그레이션 0083+0084 동시 배포 | remote drift | CI/CD가 순차 적용, 배포 전 `migrations list --remote` 확인 |
| Web 마크다운 에디터 복잡도 | 구현 시간 초과 | react-markdown(이미 도입) 기반 읽기 전용 + 섹션별 버튼만 (WYSIWYG 미구현) |
| 자동 모드 AI 호출 비용 | 토큰 비용 | token_limit 500K 하드리밋 + Phase별 조기 종료 |

---

## 예상 산출물

| 카테고리 | 수량 |
|----------|------|
| D1 테이블 | 4개 |
| API 엔드포인트 | 13개 |
| API 테스트 | ~35개 |
| 에이전트 | 1개 (auto-reviewer) |
| Web 페이지 | 2개 |
| Web 컴포넌트 | 3개 |
| Web 테스트 | ~10개 |
| E2E specs | ~5개 |
| **총 파일** | **~20개** (신규 15 + 수정 5) |
