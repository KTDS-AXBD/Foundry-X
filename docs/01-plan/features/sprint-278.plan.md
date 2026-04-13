---
id: FX-PLAN-278
title: Sprint 278 Plan — F524 E2E 자동 추출 + F525 Gap-E2E 통합 점수
sprint: 278
f_items: [F524, F525]
req: FX-REQ-552, FX-REQ-553
priority: P0
status: draft
created: 2026-04-13
---

# Sprint 278 Plan — F524 E2E 자동 추출 + F525 Gap-E2E 통합 점수

## 1. 목표

Phase 40 Agent Autonomy M1+M2 — Design 문서에서 Playwright E2E 스펙을 자동 추출하고,
Gap Analysis 보고서에 E2E 결과를 통합하여 종합 품질 점수를 산출한다.

## 2. 배경

- Sprint 277(F522/F523): MSA Walking Skeleton Phase 2 ✅ — shared 슬리밍 + D1 규약
- **현재 상태**: Gap Analysis는 Design↔Code 구조 일치만 검증. E2E 58건은 수동 작성/유지
- **이번 Sprint**: Design 문서 파싱 → E2E 자동 생성 + Gap 보고서에 E2E 결과 통합

### 현황 수치

| 항목 | 현재값 |
|------|--------|
| E2E spec 파일 수 | 58개 (packages/web/e2e/) |
| Gap Analysis 구성 | Design Match + Architecture + Convention + TDD |
| 자동 E2E 생성 | 0% (수동 100%) |
| Gap-E2E 통합 점수 | 없음 (Gap만) |

## 3. 핵심 요구사항

### F524: E2E 시나리오 자동 추출 (FX-REQ-552)

| # | 요구사항 | 우선순위 |
|---|----------|----------|
| E1 | Design 문서 §5 파일 매핑에서 신규 라우트/컴포넌트 추출 | P0 |
| E2 | Design 문서 §4 기능 명세에서 사용자 시나리오 파싱 | P0 |
| E3 | Playwright spec 파일 자동 생성 (`packages/web/e2e/generated/sprint-{N}.spec.ts`) | P0 |
| E4 | 생성된 spec은 smoke 수준 (페이지 로드, 주요 요소 존재) + functional (버튼/API 동작) | P0 |
| E5 | 파싱 신뢰도 70%+ 목표 (추출된 시나리오 수 / 기대 시나리오 수) | P0 |

### F525: Gap-E2E 통합 점수 (FX-REQ-553)

| # | 요구사항 | 우선순위 |
|---|----------|----------|
| G1 | Gap Analysis 보고서에 E2E 섹션 추가 (PASS/FAIL/SKIP 건수) | P0 |
| G2 | 종합 Match Rate 산출: Gap×0.6 + E2E×0.4 가중 평균 | P0 |
| G3 | E2E 실패 시 자동 원인 리포트 포함 (어느 spec, 어느 assertion 실패) | P0 |
| G4 | 기존 Gap Analysis 형식과 하위 호환 (E2E 섹션 없으면 Gap 100%) | P1 |

## 4. 스코프 경계

### In Scope
- Design 문서 파서 (TypeScript 유틸리티, packages/cli/src/ 또는 scripts/)
- E2E spec 생성기 (Playwright spec 템플릿 + 시나리오 주입)
- Gap Analysis 보고서 포맷 확장 (docs/03-analysis/ 마크다운)
- 종합 Match Rate 계산 로직

### Out of Scope
- Sprint autopilot Step 삽입 (F526, Sprint 279)
- GitHub Actions CI E2E 실행
- 크로스 서비스 MSA E2E

## 5. 성공 기준

| # | 기준 | 측정 |
|---|------|------|
| 1 | Sprint 278 Design 문서에서 E2E 3개 이상 자동 추출 | 생성된 spec 확인 |
| 2 | 생성된 spec이 `pnpm e2e` 실행 가능 (smoke PASS) | CI 통과 |
| 3 | Sprint 278 Gap Analysis에 E2E 결과 행 포함 | 보고서 확인 |
| 4 | 종합 Match Rate = Gap×0.6 + E2E×0.4 수식 표시 | 보고서 수식 |
| 5 | 기존 sprint-277.analysis.md 포맷 하위 호환 | 형식 검증 |

## 6. 기술 설계 방향

### 파싱 전략
- **§5 파일 매핑**: 정규식 기반 (route 경로, 컴포넌트명 추출)
- **§4 기능 명세**: 마크다운 테이블 파싱 → 행 제목을 시나리오명으로 사용
- 출력: `ScenarioList[]` (name, route, actions, assertions)

### E2E 템플릿
```typescript
// 생성 패턴
test.describe('F{N}: {feature명}', () => {
  test('{시나리오명}', async ({ page }) => {
    await page.goto('{route}');
    // smoke: 페이지 로드 확인
    await expect(page).toHaveTitle(/.+/);
    // functional: 주요 요소 확인
    await expect(page.locator('{selector}')).toBeVisible();
  });
});
```

### Gap 보고서 확장
```markdown
## E2E Coverage: N/M (X%)
| spec | tests | pass | fail | skip |
|------|-------|------|------|------|
| generated/sprint-278.spec.ts | 5 | 5 | 0 | 0 |

## Composite Score
Gap Score: 94% × 0.6 = 56.4%
E2E Score: 100% × 0.4 = 40.0%
**Composite: 96.4%**
```

## 7. TDD 계획

### Red Phase (F524)
- `packages/cli/src/services/e2e-extractor.test.ts`
- parseDesignDocument() 테스트 (§5 파일 매핑 → ScenarioList)
- generateE2ESpec() 테스트 (ScenarioList → Playwright spec 문자열)

### Red Phase (F525)
- `packages/cli/src/services/gap-scorer.test.ts`
- computeCompositeScore() 테스트 (gapRate, e2ePassRate → compositeRate)
- formatGapReport() 테스트 (E2E 섹션 포함 여부)

## 8. 파일 변경 예상

| 파일 | 작업 | 분류 |
|------|------|------|
| `packages/cli/src/services/e2e-extractor.ts` | 신규 | F524 |
| `packages/cli/src/services/e2e-extractor.test.ts` | 신규 (Red) | F524 |
| `packages/web/e2e/generated/sprint-278.spec.ts` | 신규 (생성 결과) | F524 |
| `packages/cli/src/services/gap-scorer.ts` | 신규 | F525 |
| `packages/cli/src/services/gap-scorer.test.ts` | 신규 (Red) | F525 |
| `docs/02-design/features/sprint-278.design.md` | 신규 | Design |

---

## 관련 문서
- PRD: `docs/specs/fx-agent-autonomy/prd-final.md`
- SPEC: §5 Phase 40 (F524~F526)
