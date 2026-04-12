---
code: FX-ANLS-056
title: Sprint 56 — Gap Analysis (F188 Six Hats + F189 Discovery Progress)
version: 0.1
status: Active
category: ANLS
created: 2026-03-25
updated: 2026-03-25
author: Sinclair Seo
source: "[[FX-DSGN-056]]"
---

# Sprint 56 Gap Analysis

> **Ref**: [[FX-DSGN-056]] Sprint 56 Design
> **Scope**: F188 Six Hats 토론 시뮬레이션 + F189 Discovery 진행률 대시보드

---

## 1. Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| Design Match | 95% | ✅ |
| Architecture Compliance | 100% | ✅ |
| Convention Compliance | 98% | ✅ |
| **Overall** | **97%** | ✅ |

---

## 2. Checklist Match Analysis

### Phase A: F188 Six Hats 토론 (8/8 = 100%)

| ID | Item | Status |
|----|------|:------:|
| A-1 | `0040_sixhats_debates.sql` 마이그레이션 | ✅ |
| A-2 | `sixhats-prompts.ts` — HAT_CONFIGS, TURN_SEQUENCE, buildTurnPrompt | ✅ |
| A-3 | `sixhats-debate.ts` — SixHatsDebateService | ✅ |
| A-4 | `schemas/sixhats.ts` — Zod 스키마 | ✅ |
| A-5 | `routes/biz-items.ts` — POST/GET sixhats 3개 엔드포인트 | ✅ |
| A-6 | `__tests__/sixhats-prompts.test.ts` | ✅ (9 tests) |
| A-7 | `__tests__/sixhats-debate.test.ts` | ✅ (9 tests) |
| A-8 | `__tests__/biz-items-sixhats.test.ts` | ✅ (7 tests) |

### Phase B: F189 Discovery 진행률 (5/5 = 100%)

| ID | Item | Status |
|----|------|:------:|
| B-1 | `discovery-progress.ts` — DiscoveryProgressService | ✅ |
| B-2 | `schemas/discovery-progress.ts` — Zod 스키마 | ✅ |
| B-3 | `routes/discovery.ts` + app.ts 등록 | ✅ |
| B-4 | `__tests__/discovery-progress.test.ts` | ✅ (9 tests) |
| B-5 | `__tests__/discovery-route.test.ts` | ✅ (6 tests) |

### Phase C: 대시보드 UI (4.5/5 = 90%)

| ID | Item | Status | Notes |
|----|------|:------:|-------|
| C-1 | `SixHatsDebateView.tsx` | ✅ | |
| C-2 | `SixHatsIssueSummary.tsx` | ✅ | |
| C-3 | `DiscoveryProgressDashboard.tsx` | ✅ | |
| C-4 | `app/(app)/discovery/page.tsx` + sidebar | ⚠️ | 경로 `discovery-progress`로 변경 (기존 `/discovery`와 충돌 방지) |
| C-5 | Web 테스트 | ✅ | 5+5=10 tests |

---

## 3. Differences Found

### 3.1 Changed Features (Design != Implementation)

| # | Item | Design | Implementation | Impact |
|---|------|--------|----------------|--------|
| 1 | PRD 조회 테이블 | `prd_documents` | `biz_generated_prds` | Low — 실제 DB 스키마에 맞게 조정 |
| 2 | PRD 조회 필터 | 3 조건 (id + biz_item_id + org_id) | 2 조건 (id + biz_item_id) | Low — orgId 필터는 BizItem 조회에서 이미 수행 |
| 3 | POST sixhats 에러 형식 | `{ error, code }` | `{ error: code, message }` | Low — 프로젝트 에러 컨벤션에 부합 |
| 4 | content 추출 fallback | `output?.analysis ?? output?.code ?? ""` | `output?.analysis ?? ""` | Low — `.code` 프로퍼티 미존재 (typecheck 수정) |
| 5 | Discovery 페이지 경로 | `app/(app)/discovery/page.tsx` | `app/(app)/discovery-progress/page.tsx` | Low — 기존 `/discovery` (Discovery-X 서비스)와 충돌 방지 |
| 6 | SixHatsDebateView Props | `{ bizItemId, prdId, debate, ... }` | `{ debate, onStartDebate, isLoading }` | Low — 불필요한 props 제거 |

### 3.2 Added Features (Design에 없지만 구현에 있음)

| # | Item | Location | Description |
|---|------|----------|-------------|
| 1 | BizItem 존재 확인 | `routes/biz-items.ts` | POST sixhats 전 BizItem 사전 검증 추가 |
| 2 | 빈 데이터 bottleneck guard | `discovery-progress.ts` | `items.length > 0` 조건으로 엣지 케이스 방어 |

### 3.3 Missing Features (Design에 있지만 구현에 없음)

없음.

---

## 4. Test Coverage

| Test File | Count | Design 예상 |
|-----------|:-----:|:----------:|
| `sixhats-prompts.test.ts` | 9 | ~8 |
| `sixhats-debate.test.ts` | 9 | ~10 |
| `biz-items-sixhats.test.ts` | 7 | ~8 |
| `discovery-progress.test.ts` | 9 | ~8 |
| `discovery-route.test.ts` | 6 | ~6 |
| `sixhats-debate-view.test.tsx` | 5 | ~4 |
| `discovery-progress-dashboard.test.tsx` | 5 | ~4 |
| **Total** | **50** | **~48** |

테스트 수가 Design 예상치(48)를 초과(50)하여 충분.

---

## 5. Match Rate Summary

| Phase | Items | Matched | Rate |
|-------|:-----:|:-------:|:----:|
| A (F188 Six Hats) | 8 | 8 | 100% |
| B (F189 Discovery) | 5 | 5 | 100% |
| C (Web UI) | 5 | 4.5 | 90% |
| **Total** | **18** | **17.5** | **97%** |

---

## 6. Verdict

**Match Rate 97% >= 90% threshold → ✅ PASS**

모든 차이점은 Low Impact이며, 구현이 프로젝트 컨벤션에 더 잘 부합하는 방향의 개선이에요. Missing features 없음.
