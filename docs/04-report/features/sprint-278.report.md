---
id: FX-REPORT-278
title: Sprint 278 Completion Report — F524 E2E 자동 추출 + F525 Gap-E2E 통합 점수
sprint: 278
f_items: [F524, F525]
req: [FX-REQ-552, FX-REQ-553]
status: complete
date: 2026-04-13
gap_rate: 95
composite_rate: 97
---

# Sprint 278 Completion Report

> **Status**: Complete ✅
>
> **Project**: Foundry-X (Phase 40 Agent Autonomy M1+M2)
> **Sprint**: 278
> **Start Date**: 2026-04-13
> **Completion Date**: 2026-04-13
> **Duration**: 1 day
> **Gap Match Rate**: 95% / **Composite Score**: 97.0%

---

## 1. Executive Summary

### 1.1 Overview

| Item | Content |
|------|---------|
| Sprint | 278 (F524 + F525) |
| Phase | Phase 40 Agent Autonomy — M1+M2 |
| Features | F524 E2E 자동 추출, F525 Gap-E2E 통합 점수 |
| TDD | Red→Green 완전 사이클 (18/18 PASS) |
| Gap Analysis | 95% PASS (Composite 97.0%) |

### 1.2 Results Summary

```
┌──────────────────────────────────────────────────┐
│  Completion Rate: 97.0% (Composite)               │
├──────────────────────────────────────────────────┤
│  ✅ F524 E2E 자동 추출: TDD 9/9 PASS              │
│  ✅ F525 Gap-E2E 통합: TDD 9/9 PASS               │
│  ✅ E2E Spec 생성:     3건 (sprint-278.spec.ts)   │
│  ⏳ F526 autopilot 통합: Sprint 279 예정           │
└──────────────────────────────────────────────────┘
```

---

## 2. Related Documents

| Phase | Document | Status |
|-------|----------|--------|
| Plan | [sprint-278.plan.md](../01-plan/features/sprint-278.plan.md) | ✅ Finalized |
| Design | [sprint-278.design.md](../02-design/features/sprint-278.design.md) | ✅ Finalized |
| Check | [sprint-278.analysis.md](../03-analysis/features/sprint-278.analysis.md) | ✅ Complete |
| Act | Current document | ✅ Complete |

---

## 3. Implementation Details

### 3.1 F524: E2E 시나리오 자동 추출

**신규 서비스**: `packages/cli/src/services/e2e-extractor.ts`

| Function | 역할 |
|----------|------|
| `parseDesignDocument(content)` | Design 문서 §4+§5 마크다운 파싱 → ScenarioList |
| `generateE2ESpec(scenarios, sprintNum)` | ScenarioList → Playwright spec 파일 생성 |

**파싱 전략**:
- §5 파일 매핑: `src/routes/*.tsx` 패턴 정규식 → route 경로 추출
- §4 기능 명세: 마크다운 테이블 행 파싱 → 시나리오명 추출
- service/test/spec 파일은 자동 제외

**생성 결과**: `packages/web/e2e/generated/sprint-278.spec.ts` (smoke 1 + functional 2)

### 3.2 F525: Gap-E2E 통합 점수

**신규 서비스**: `packages/cli/src/services/gap-scorer.ts`

| Function | 역할 |
|----------|------|
| `computeCompositeScore(input)` | Gap×0.6 + E2E×0.4 가중 평균 산출 |

**설계 원칙**:
- E2E 없으면 Composite = Gap (하위 호환, 기존 Gap Analysis 보고서 깨지지 않음)
- SKIP 테스트는 총계에서 제외 (보수적 처리)
- 90% 이상 = PASS, 미만 = FAIL

### 3.3 Composite Score (이번 Sprint 적용)

```
Gap: 95% × 0.6 = 57.0
E2E: 100% × 0.4 = 40.0
Composite: 97.0% — PASS
```

---

## 4. TDD Summary

| Phase | File | Tests | Result |
|-------|------|-------|--------|
| Red | e2e-extractor.test.ts | 9 | 9 FAIL (confirmed) |
| Green | e2e-extractor.ts | 9 | 9 PASS |
| Red | gap-scorer.test.ts | 9 | 9 FAIL (confirmed) |
| Green | gap-scorer.ts | 9 | 9 PASS |
| **Total** | | **18** | **18 PASS** |

---

## 5. Known Gaps & Deferred Items

| # | Item | Impact | Resolution |
|---|------|--------|------------|
| G1 | Design doc 자체가 route 파일 없음 → section5=0건 | LOW | 의도적 (CLI 서비스 Sprint) |
| G2 | §4 코드 블록 내 예시 테이블 파싱 이슈 | LOW | F526에서 fenced code block 무시 로직 추가 |

---

## 6. Next Sprint (Sprint 279 — F526)

F526: autopilot Verify E2E 통합
- `/ax:sprint-autopilot` Step 5~6에 E2E 생성+실행 자동 삽입
- `pnpm e2e:generate {N}` CLI 커맨드 추가
- G2 fenced code block 파싱 개선

---

## 7. Lessons Learned

1. **Design doc 구조와 parser 설계 간 피드백 루프**: Design doc을 직접 파싱 대상으로 사용하니 Design 작성 방식이 parser 품질에 영향을 미쳐요. 표준 §4/§5 테이블 포맷을 Design 가이드에 명시하면 좋을 것 같아요.

2. **Composite Score 하위 호환 설계**: E2E 없을 때 Gap=Composite로 처리하니 기존 Gap Analysis 워크플로우가 깨지지 않아요. 새 기능을 "점진적 opt-in"으로 설계하는 패턴이 유효했어요.
