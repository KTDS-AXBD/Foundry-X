---
code: FX-PLAN-S122
title: "Sprint 122 — E2E 테스트 종합 정비 + 주기적 점검 체계"
version: 1.0
status: Draft
category: PLAN
created: 2026-04-03
updated: 2026-04-03
author: Sinclair Seo
references: "[[FX-SPEC-001]], [[FX-REQ-292]]"
---

# Sprint 122: E2E 테스트 종합 정비 + 주기적 점검 체계

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F300 — E2E 테스트 종합 정비 |
| Sprint | 122 |
| 우선순위 | P1 |
| 의존성 | 없음 (Phase 11과 병렬 가능) |
| 기반 데이터 | 세션 #185 E2E 감사 결과 (2026-04-03) |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | E2E 158 tests 중 16건 실패 (85.4% 통과), API-only 가짜 E2E 4 spec, redirect 검증 0건, 미커버 라우트 15개 |
| Solution | 실패 수정 + API-only 정리 + redirect 검증 + 커버 확대 + 주기적 점검 체계 |
| Function UX Effect | 모든 E2E 100% 통과 → Sprint merge 시 품질 게이트 신뢰도 확보 |
| Core Value | 라우트 변경/기능 추가 시 E2E가 조기 경고 역할 → 프로덕션 장애 예방 |

## 현황 (세션 #185 감사 결과)

### 실행 결과
- **158 tests**: 135 pass / 16 fail / 7 skip (1.5분, 4 workers)
- **35 spec 파일** + 2 prod spec
- **직접 커버 라우트**: ~36/52 (69%)

### 실패 분류 (16건)

| 분류 | 건수 | Spec |
|------|------|------|
| Phase 11 UI 변경 미반영 | 4 | dashboard(1), bd-demo-walkthrough(3) |
| 기존 UI 싱크 이탈 | 8 | setup-guide(4), shaping(4) |
| Mock/Fixture 불일치 | 4 | help-agent(2), org-members(1), workspace-navigation(1) |

### 품질 이슈

| 이슈 | 파일 | 건수 |
|------|------|------|
| API-only E2E (UI 미테스트) | sprint81-apis, bdp-editor, gate-package, decisions-workflow | 4 spec / 16 tests |
| waitForTimeout (flaky) | auth-flow, discovery-tour, integration-path | 5건 |
| 약한 assertion | prod/critical-path | 4건 toBeTruthy/toBeGreaterThan(0) |
| 허용범위 assertion | slack-config | 2건 expect([200,404]).toContain() |
| Fixture 중복 | auth.ts + org.ts | TEST_ORG 이중 정의 |

## 작업 목록

### Phase A: 실패 수정 (P0) — 16건 → 0건

| # | Spec | 작업 | 예상 |
|---|------|------|------|
| A1 | `dashboard.spec.ts` | F289 sidebar 구조에 맞게 프로세스 6단계 그룹 셀렉터 업데이트 | 10분 |
| A2 | `bd-demo-walkthrough.spec.ts` | 3건 — demo-scenario mock 보강, artifacts/:id 경로 확인, progress empty state 셀렉터 수정 | 20분 |
| A3 | `setup-guide.spec.ts` | 4건 — Claude Code 가이드 UI 셀렉터 현행화 (5단계→현재 구조) | 15분 |
| A4 | `shaping.spec.ts` | 4건 — 형상화 상세 페이지 렌더링 mock 데이터 구조 + 셀렉터 수정 | 15분 |
| A5 | `help-agent.spec.ts` | 2건 — FAB 토글/새대화 리셋 셀렉터 수정 | 10분 |
| A6 | `org-members.spec.ts` + `workspace-navigation.spec.ts` | 2건 — 앱 셸 mock 보강 + heading 셀렉터 수정 | 10분 |

### Phase B: 통합/삭제 (P1) — 가짜 E2E 정리

| # | 작업 | 상세 |
|---|------|------|
| B1 | `sprint81-apis.spec.ts` 삭제 검토 | F236/F238/F240 API mock만 검증 → API 단위 테스트(`packages/api`)에 동등 테스트 있는지 확인. 있으면 삭제, 없으면 이관 |
| B2 | `bdp-editor.spec.ts` 삭제 검토 | F234/F237 동일 패턴 |
| B3 | `gate-package.spec.ts` 삭제 검토 | F235 동일 패턴 |
| B4 | `decisions-workflow.spec.ts` 삭제 검토 | F239 동일 패턴 |
| B5 | `slack-config.spec.ts` 삭제 검토 | API 서버 미실행 시 전체 skip → E2E 가치 없음 |

### Phase C: 신규 추가 (P2) — 커버리지 확대

| # | 신규 Spec | 커버 범위 |
|---|----------|----------|
| C1 | `redirect-routes.spec.ts` | F290 16건 redirect 검증 (/sr→/collection/sr, /pipeline→/validation/pipeline 등) |
| C2 | `uncovered-pages.spec.ts` 확장 | 미커버 라우트 8건 추가: /invite, /product/mvp, /collection/field, /collection/ideas, /discovery/ideas-bmc, /ax-bd/bdp/:id, /ax-bd/process-guide, /ax-bd/skill-catalog |

### Phase D: 품질 개선 (P2)

| # | 작업 | 상세 |
|---|------|------|
| D1 | `waitForTimeout` 제거 | auth-flow(2), discovery-tour(1), integration-path(2) → 이벤트 기반 대기로 전환 |
| D2 | `prod/critical-path.spec.ts` 강화 | toBeTruthy() → 구체적 콘텐츠/URL assertion |
| D3 | Fixture 중복 정리 | auth.ts + org.ts의 TEST_ORG 통합 → org.ts에서 auth.ts 참조 |

### Phase E: 주기적 점검 체계 (P1)

| # | 작업 | 상세 |
|---|------|------|
| E1 | E2E 점검 주기 정의 | **Phase 단위** (매 Phase 마지막 Sprint에서 E2E 감사 1회) + **대규모 라우트 변경 후** (F290 같은 IA 변경 즉시) |
| E2 | CI E2E 게이트 강화 | `.github/workflows/` — PR merge 전 E2E 100% pass 필수 조건 추가 검토 |
| E3 | E2E 커버리지 대시보드 | SPEC.md §4 성공 지표에 E2E 메트릭 추가 (통과율, 커버율, 실행시간) |
| E4 | Sprint Plan 체크리스트 | 신규 라우트 추가 시 E2E spec 동시 작성 의무화 (Plan 템플릿에 항목 추가) |
| E5 | E2E 점검 로그 표준화 | `docs/03-analysis/` 하위에 E2E 감사 보고서 템플릿 정의 |

## 주기적 점검 체계 상세

### 점검 주기

| 트리거 | 주기 | 점검 범위 | 산출물 |
|--------|------|----------|--------|
| **Phase 완료** | Phase당 1회 | 전체 E2E 실행 + 커버리지 갭 분석 | E2E 감사 보고서 (docs/03-analysis/) |
| **IA/라우트 변경** | 변경 즉시 | 변경 영향 받는 E2E spec 전수 점검 | 영향 분석 + 수정 |
| **Sprint merge** | 매 Sprint | CI에서 자동 실행 (E2E gate) | pass/fail 결과 |
| **분기 정기** | 분기 1회 | 전체 스펙 품질 감사 (assertion 깊이, flaky 패턴, 중복) | 품질 보고서 |

### 자동화 목표

```
CI Pipeline (PR → merge):
  ├─ typecheck ✓ (기존)
  ├─ lint ✓ (기존)
  ├─ unit tests ✓ (기존)
  └─ E2E tests ← 추가 (100% pass 게이트)
```

### 성공 지표

| 지표 | 현재 | Sprint 122 목표 | 장기 목표 |
|------|------|----------------|----------|
| E2E 통과율 | 85.4% | **100%** | 100% 유지 |
| 직접 커버 라우트 | 69% | **85%+** | 95%+ |
| API-only (가짜 E2E) | 4 spec | **0** | 0 유지 |
| waitForTimeout | 5건 | **0** | 0 유지 |
| 실행 시간 | 1.5분 | ≤2분 | ≤2분 |
| Redirect 검증 | 0/16 | **16/16** | 전수 |

## 예상 소요

| Phase | 예상 시간 | 비고 |
|-------|----------|------|
| A. 실패 수정 | ~80분 | 셀렉터 업데이트 위주, 로직 변경 없음 |
| B. 통합/삭제 | ~30분 | API 테스트 중복 확인 후 판단 |
| C. 신규 추가 | ~40분 | redirect spec + uncovered 확장 |
| D. 품질 개선 | ~30분 | waitForTimeout 교체 + assertion 강화 |
| E. 점검 체계 | ~20분 | 문서 + CI 설정 |
| **합계** | **~200분 (3.3h)** | Sprint 1개 분량 |

## 비고

- Phase 11-B Sprint (115~117)과 **병렬 실행 가능** — 라우트/서비스 변경 영역 겹치지 않음
- E2E는 mock 기반이므로 D1 마이그레이션 충돌 없음
- Sprint 122 완료 후, Phase 11-B 각 Sprint에서 신규 라우트 E2E를 함께 작성하는 패턴 정착
